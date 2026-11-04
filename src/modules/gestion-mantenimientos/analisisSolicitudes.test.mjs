import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const js=ts.transpileModule(fs.readFileSync(new URL('./analisisSolicitudes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {resumirCostosSolicitudes}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
function solicitud(id,{noches=0,hotel=0,dias=1,tiquetes=0,margen=100,estado='aprobada',prueba=false,departamento='ARAUCA'}={}) {return {id,es_prueba:prueba,estado,calculo:{dias,margen,total:2000,transporte:{viaje:tiquetes?'aereo':'terrestre'},estadia:{hospedaje:noches?'si':'no',noches:String(noches)},desglose:{hospedaje:hotel,tiquetes,alimentacion:dias*60000},ubicaciones:departamento?{destino:{departamento}}:undefined}}}
test('promedios usan noches y viajes correctos y excluyen siempre las pruebas',()=>{
 const a=solicitud('a',{noches:1,hotel:100000,dias:2,tiquetes:500000,margen:60000})
 const b=solicitud('b',{noches:3,hotel:900000,dias:4,margen:90000})
 const c=solicitud('c',{dias:3,margen:30000,estado:'pendiente'})
 const r=resumirCostosSolicitudes([a,b,c,solicitud('prueba',{noches:100,hotel:999999999,prueba:true})])
 assert.equal(r.cantidad,3);assert.equal(r.noches,4);assert.equal(r.promedioNoche,250000);assert.equal(r.promedioHotelViaje,500000)
 assert.equal(r.diasPromedio,3);assert.equal(r.tiquetes,500000);assert.equal(r.aereos,1)
 assert.equal(r.margen,180000);assert.equal(r.margenAprobado,150000)
 assert.equal(r.menorHotel.id,'a');assert.equal(r.mayorHotel.id,'b');assert.equal(r.departamentos[0].solicitudes,3)
})
test('sin hospedaje o sin registros no inventa promedios y conserva destinos desconocidos',()=>{
 const vacio=resumirCostosSolicitudes([]);assert.equal(vacio.promedioNoche,null);assert.equal(vacio.diasPromedio,null);assert.equal(vacio.margen,0)
 const r=resumirCostosSolicitudes([solicitud('a',{departamento:null})]);assert.equal(r.promedioHotelViaje,null);assert.equal(r.menorHotel,null);assert.equal(r.departamentos[0].nombre,'Sin departamento registrado')
})

test('promedio aéreo por departamento no incluye viajes terrestres y sin vuelos devuelve null',()=>{
 const r=resumirCostosSolicitudes([solicitud('a',{tiquetes:400000,departamento:'ARAUCA'}),solicitud('b',{tiquetes:800000,departamento:'ARAUCA'}),solicitud('c',{departamento:'ARAUCA'}),solicitud('d',{departamento:'META'})])
 assert.equal(r.tiquetePromedio,600000)
 assert.equal(r.departamentos.find(d=>d.nombre==='ARAUCA').tiquetePromedio,600000)
 assert.equal(r.departamentos.find(d=>d.nombre==='ARAUCA').solicitudes,3)
 assert.equal(r.departamentos.find(d=>d.nombre==='META').tiquetePromedio,null)
 assert.equal(r.departamentos.find(d=>d.nombre==='META').promedioNoche,null)
})
