import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const transpile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const modeloJs=transpile(fs.readFileSync(new URL('./modelo.ts',import.meta.url),'utf8'))
const modelo=await import(url(modeloJs))
const source=fs.readFileSync(new URL('./almacenamiento.ts',import.meta.url),'utf8')
 .replace(/^import .*supabase.*$/m, 'const supabase = {}; const fetchAllRows = () => { throw Error("No debe consultar la base remota en vista previa") }')
 .replace('import.meta.env.DEV','true')
const almacen=await import(url(transpile(source).replace("'./modelo'",JSON.stringify(url(modeloJs)))))
const memoria=new Map()
globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)}
const calculo={version:1,items:[{referencia:'HI',nombre:'Equipo',codigo:'MAN',precio:'1000000',cantidad:'1'}],transporte:{viaje:'aereo'},estadia:{dias:'5'},dias:5,tarifas:{},desglose:{base:1000000,tiquetes:0,depreciacion:0,gasolina:0,peajes:0,desplazamiento:0,hospedaje:0,alimentacion:300000,otros:1500000},subtotal:2800000,margen_pct:5,margen:140000,total:2940000}
const nueva=()=>({cliente:'Cliente prueba',origen:'Bogotá',destino:'Cartagena',cotizacion:'',nota:'Primera revisión',calculo:structuredClone(calculo)})
test('guardar en vista previa conserva origen, destino, margen y cálculo al recargar',async()=>{
 const datos=nueva();const r=await almacen.crearSolicitud(datos,'usuario1','Técnico')
 datos.calculo.total=1
 const filas=await almacen.listarSolicitudes('usuario1')
 assert.equal(filas[0].id,r.id);assert.equal(filas[0].calculo.total,2940000)
 assert.equal(filas[0].origen,'Bogotá');assert.equal(filas[0].destino,'Cartagena')
 assert.equal(filas[0].estado,'pendiente');assert.equal(filas[0].historial.length,1)
 assert.equal((await almacen.listarSolicitudes('otro-usuario')).length,0)
})
test('se asocia cotización después y se conserva el historial de aprobación y rechazo',async()=>{
 const original=await almacen.crearSolicitud(nueva(),'usuario2','Técnico')
 const cotizada=await almacen.actualizarSolicitud(original,'cotizada','COT-123','Enviada','usuario2','Técnico')
 const aprobada=await almacen.actualizarSolicitud(cotizada,'aprobada','COT-123','Cliente aprobó','usuario2','Técnico')
 assert.equal(aprobada.historial.length,3);assert.equal(aprobada.calculo.total,original.calculo.total)
 await assert.rejects(almacen.actualizarSolicitud(original,'cancelada','','Cambio','usuario2','Técnico'),/otra ventana/)
 await assert.rejects(almacen.actualizarSolicitud(aprobada,'rechazada','COT-123','','usuario2','Técnico'),/motivo/)
 const rechazada=await almacen.actualizarSolicitud(aprobada,'rechazada','COT-123','Cambio solicitado por cliente','usuario2','Técnico')
 assert.equal(rechazada.historial.length,4)
})
test('no guarda cálculos incoherentes ni metadatos de trazabilidad vacíos',()=>{
 assert.throws(()=>modelo.validarNuevaSolicitud({...nueva(),origen:' '}),/origen/)
 assert.throws(()=>modelo.validarNuevaSolicitud({...nueva(),calculo:{...calculo,total:1}}),/importes/)
 assert.throws(()=>modelo.validarSeguimiento('aprobada','',''),/cotización/)
})
