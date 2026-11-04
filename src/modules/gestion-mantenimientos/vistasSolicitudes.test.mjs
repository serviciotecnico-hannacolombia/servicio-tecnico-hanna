import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const js=ts.transpileModule(fs.readFileSync(new URL('./vistasSolicitudes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {leerVistasSolicitudes,guardarVistaSolicitud,quitarVistaSolicitud,validarConfigVista}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const config={ano:'2026',departamento:'ARAUCA',alcance:'aceptadas',bloques:['tiquetes','destinos'],metrica:'tiquetePromedio',vista:'barras'}
function almacenamiento(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}}
test('restaura filtros y gráfica sin mezclar perfiles ni almacenar registros',()=>{
 const s=almacenamiento(),vista=guardarVistaSolicitud('andres',' Costos por departamento ',config,s)
 assert.equal(vista.nombre,'Costos por departamento');assert.deepEqual(leerVistasSolicitudes('andres',s)[0].config,config)
 assert.deepEqual(leerVistasSolicitudes('otro',s),[])
 assert.deepEqual(Object.keys(vista).sort(),['config','creada','id','nombre'])
 quitarVistaSolicitud('otro',vista.id,s);assert.equal(leerVistasSolicitudes('andres',s).length,1)
 quitarVistaSolicitud('andres',vista.id,s);assert.equal(leerVistasSolicitudes('andres',s).length,0)
})
test('rechaza configuraciones inválidas y controla el límite de vistas',()=>{
 assert.equal(validarConfigVista({...config,metrica:'desconocida'}),false)
 assert.equal(validarConfigVista({...config,bloques:['tiquetes','tiquetes']}),false)
 assert.equal(validarConfigVista({...config,ano:'2026<script>'}),false)
 const s=almacenamiento();assert.throws(()=>guardarVistaSolicitud('','Vista',config,s));assert.throws(()=>guardarVistaSolicitud('a',' ',config,s))
 for(let i=0;i<15;i++)guardarVistaSolicitud('a','Vista '+i,config,s)
 assert.throws(()=>guardarVistaSolicitud('a','Otra',config,s),/15 vistas/)
})
