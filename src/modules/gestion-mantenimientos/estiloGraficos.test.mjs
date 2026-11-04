import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const js=ts.transpileModule(fs.readFileSync(new URL('./estiloGraficos.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {colorCategoria,datosGrafico,coloresCategorias,matizColor}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('los porcentajes usan el total completo aunque se limiten las barras visibles',()=>{
 const r=datosGrafico([{nombre:'A',cantidad:50},{nombre:'B',cantidad:30},{nombre:'C',cantidad:20}],2)
 assert.equal(r.total,100);assert.equal(r.visibles.length,2)
 assert.deepEqual(r.visibles.map(d=>d.porcentaje),[50,30])
 assert.equal(datosGrafico([{nombre:'Sin datos',cantidad:0}],12).visibles[0].porcentaje,0)
})
test('los colores son consistentes por categoría y respetan el significado comercial',()=>{
 assert.equal(colorCategoria('MEDELLÍN','preventivo'),colorCategoria('medellin','preventivo'))
 assert.equal(colorCategoria('Ganada','comercial'),'#9bc7a7')
 assert.equal(colorCategoria('Perdida','comercial'),'#e6a1a1')
 assert.notEqual(colorCategoria('HI2020','preventivo'),colorCategoria('HI2020','correctivo'))
})

test('no se repiten colores dentro del gráfico, incluso con cuarenta categorías',()=>{
 const nombres=Array.from({length:40},(_,i)=>'Categoría '+i)
 const colores=coloresCategorias(nombres,'preventivo')
 assert.equal(new Set(colores.values()).size,40)
 const inverso=coloresCategorias([...nombres].reverse(),'preventivo')
 for(const n of nombres)assert.equal(colores.get(n),inverso.get(n))
})
test('el relieve mantiene colores válidos para borde y brillo',()=>{
 assert.equal(matizColor('#000000',1),'#ffffff')
 assert.equal(matizColor('#ffffff',-1),'#000000')
 assert.match(matizColor('#9cbadd',0.18),/^#[a-f0-9]{6}$/)
})

test('pastel conserva el total y los estados originales al agrupar muchas categorías',async()=>{
 const fuente=fs.readFileSync(new URL('./estiloGraficos.ts',import.meta.url),'utf8')
 const codigo=ts.transpileModule(fuente,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
 const {datosCirculares}=await import('data:text/javascript;base64,'+Buffer.from(codigo).toString('base64'))
 const estados=[{nombre:'Pendiente',cantidad:2},{nombre:'Aprobada',cantidad:3},{nombre:'Rechazada',cantidad:0}]
 assert.deepEqual(datosCirculares(estados).map(d=>d.nombre),['Pendiente','Aprobada'])
 const datos=Array.from({length:20},(_,i)=>({nombre:'Categoría '+i,cantidad:i+1}))
 const sectores=datosCirculares(datos)
 assert.equal(sectores.length,7);assert.equal(sectores.reduce((n,d)=>n+d.cantidad,0),210)
 assert.deepEqual(sectores.flatMap(d=>d.integrantes).sort(),datos.map(d=>d.nombre).sort())
 assert.deepEqual(datosCirculares([]),[])
})
