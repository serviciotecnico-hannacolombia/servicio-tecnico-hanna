import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const transpile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const consultasJs=transpile(fs.readFileSync(new URL('./consultas.ts',import.meta.url),'utf8'))
const {validarConsulta,firmaConsulta}=await import(url(consultasJs))
const source=fs.readFileSync(new URL('./registroConsultas.ts',import.meta.url),'utf8').replace(/^import .*supabase.*$/m,'const supabase={}; const fetchAllRows=()=>{throw Error("No usar base remota en prueba")}').replace(/^import .*VISTA_PREVIA_LOCAL.*$/m,'const VISTA_PREVIA_LOCAL=true')
const almacen=await import(url(transpile(source).replace("'./consultas'",JSON.stringify(url(consultasJs)))))
const memoria=new Map();globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)}
const c={modulo:'normal',origen:'Bogotá',destino_codigo:'11001',departamento:'BOGOTÁ, D.C.',municipio:'BOGOTÁ, D.C.',equipos:[{referencia:'HI 5522',nombre:'Equipo',cantidad:2}],total:1200000,dias:1}
test('no admite consulta sin razón social, zona o equipos',()=>{
 assert.throws(()=>validarConsulta(c,'','Zona norte'),/razón social/)
 assert.throws(()=>validarConsulta(c,'Cliente',' '),/zona/)
 assert.throws(()=>validarConsulta({...c,equipos:[]},'Cliente','Zona norte'),/equipos/)
})
test('cualquier cambio de cliente, equipos, zona, destino o total invalida el precio revelado',()=>{
 const firma=firmaConsulta(c,'Cliente','Zona norte')
 assert.notEqual(firmaConsulta(c,'Otro','Zona norte'),firma)
 assert.notEqual(firmaConsulta(c,'Cliente','Otra zona'),firma)
 for(const cambio of [{total:1300000},{destino_codigo:'13001'},{equipos:[{...c.equipos[0],cantidad:3}]}])assert.notEqual(firmaConsulta({...c,...cambio},'Cliente','Zona norte'),firma)
})
test('registra usuario, razón social y zona una vez al reintentar',async()=>{
 const usuario={id:'usuario1',nombre:'Asesor',email:'asesor@example.test'}
 const a=await almacen.guardarConsulta(c,'Cliente','Zona norte','consulta1',usuario)
 const b=await almacen.guardarConsulta(c,'Cliente','Zona norte','consulta1',usuario)
 assert.equal(a.id,b.id);assert.equal((await almacen.leerConsultas()).length,1)
 assert.equal(a.usuario_id,'usuario1');assert.equal(a.zona,'Zona norte');assert.equal(a.equipos[0].cantidad,2)
 await assert.rejects(almacen.guardarConsulta(c,'Otro','Zona norte','consulta1',usuario),/otra consulta/)
 await assert.rejects(almacen.guardarConsulta(c,'Cliente','Zona norte','consulta1',{...usuario,id:'usuario2'}),/otra consulta/)
})
