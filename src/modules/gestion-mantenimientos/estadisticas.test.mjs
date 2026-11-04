import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const model=url(compile(fs.readFileSync(new URL('./intervenciones.ts',import.meta.url),'utf8')))
const {agruparIntervenciones,catalogoEstadisticas,codigoServicio}=await import(url(compile(fs.readFileSync(new URL('./estadisticas.ts',import.meta.url),'utf8')).replace("'./intervenciones'",JSON.stringify(model))))
test('las barras cuentan intervenciones, agrupando referencias con distinta capitalización',()=>{
 const filas=[{referencia:'HI2020'},{referencia:' hi2020 '},{referencia:'HI5522'}]
 const grupos=agruparIntervenciones(filas,r=>r.referencia)
 assert.equal(grupos.length,2);assert.equal(grupos[0].cantidad,2)
 assert.equal(grupos.reduce((total,g)=>total+g.cantidad,0),filas.length)
})
test('el código de servicio proviene del catálogo, sin sustituirlo por la referencia del equipo',()=>{
 const catalogo=catalogoEstadisticas([{codigo:'HI2020',familia:'pH',codigo_mantenimiento_insitu:'MAN-01'},{codigo:'HI5522',familia:null,codigo_mantenimiento_insitu:null}])
 assert.equal(codigoServicio({referencia:'hi2020'},catalogo),'MAN-01')
 assert.equal(codigoServicio({referencia:'HI5522'},catalogo),'Sin código asociado')
 assert.equal(codigoServicio({referencia:'Desconocido'},catalogo),'Sin código asociado')
})

test('referencias diferentes con el mismo código in situ se suman en una única barra',()=>{
 const catalogo=catalogoEstadisticas([{codigo:'HI2020',codigo_mantenimiento_insitu:'MAN-01'},{codigo:'HI5522',codigo_mantenimiento_insitu:'MAN-01'},{codigo:'HI83300',codigo_mantenimiento_insitu:'MAN-02'}])
 const filas=[{referencia:'HI2020'},{referencia:'HI5522'},{referencia:'HI2020'},{referencia:'HI83300'}]
 const grupos=agruparIntervenciones(filas,r=>codigoServicio(r,catalogo))
 assert.deepEqual(grupos,[{nombre:'MAN-01',cantidad:3},{nombre:'MAN-02',cantidad:1}])
})

test('los códigos preventivos no se atribuyen a correctivos ni informes de atención',()=>{
 const catalogo=catalogoEstadisticas([{codigo:'HI2020',codigo_mantenimiento_insitu:'MAN-01'}])
 assert.equal(codigoServicio({referencia:'HI2020',tipo:'correctivo'},catalogo),'No aplica')
 assert.equal(codigoServicio({referencia:'HI2020',tipo:'atencion'},catalogo),'No aplica')
 assert.equal(codigoServicio({referencia:'HI2020',tipo:'preventivo'},catalogo),'MAN-01')
})
