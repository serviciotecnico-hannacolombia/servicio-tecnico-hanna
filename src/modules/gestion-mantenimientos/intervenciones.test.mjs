import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
import * as XLSX from 'xlsx'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const modelUrl=url(compile(fs.readFileSync(new URL('./intervenciones.ts',import.meta.url),'utf8')))
const model=await import(modelUrl)
const importer=await import(url(compile(fs.readFileSync(new URL('./importarIntervenciones.ts',import.meta.url),'utf8')).replace("'./intervenciones'",JSON.stringify(modelUrl)).replace("'xlsx'",JSON.stringify(import.meta.resolve('xlsx/xlsx.mjs')))))
const storage=await import(url(compile(fs.readFileSync(new URL('./almacenIntervenciones.ts',import.meta.url),'utf8').replace(/^import .*supabase.*$/m,'const supabase={}; const fetchAllRows=()=>{throw Error("Unexpected remote access")}').replace('import.meta.env.DEV','true')).replace("'./intervenciones'",JSON.stringify(modelUrl))))
const memory=new Map()
globalThis.fetch=async()=>({status:404})
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}
const base={id:crypto.randomUUID(),referencia:'HI2020',serial:'SN1',cliente:'Cliente',nit:'',asesor:'',contacto:'',telefono:'',fecha:'2025-01-13',departamento:'',ciudad:'Bogotá',ubicacion:'',documento:'',periodicidad:365,informe:'123',observaciones:'',zona:'2025',tipo:'preventivo',historial:[],revision:1}
test('mantiene años e intervenciones distintas y no duplica al reclasificar',async()=>{
 assert.equal(await storage.guardarIntervenciones([base,{...base,id:crypto.randomUUID(),fecha:'2022-01-13'}],'u1','Técnico'),2)
 await storage.reclasificarIntervencion(base,'correctivo','u1','Otro técnico')
 assert.equal(await storage.guardarIntervenciones([base],'u1','Técnico'),0)
 const rows=await storage.listarIntervenciones('u1')
 assert.equal(rows.length,2);assert.equal(rows[0].tipo,'correctivo');assert.equal(rows[0].historial.length,2)
 assert.equal((await storage.listarIntervenciones('u2')).length,0)
 await assert.rejects(storage.reclasificarIntervencion(base,'atencion','u1','Técnico'),/cambió/)
})
test('próximo servicio sólo para preventivos y fechas válidas',()=>{
 assert.equal(model.proximoServicio(base,'2026-01-13').dias,0)
 assert.equal(model.proximoServicio({...base,tipo:'correctivo'}),null)
 assert.throws(()=>model.validarIntervencion({...base,fecha:'2025-02-30'}),/fecha/)
})
test('editar conserva valores anteriores, revisiones y evita duplicar otra intervención',async()=>{
 await storage.guardarIntervenciones([{...base,id:'editar1'},{...base,id:'editar2',serial:'OTRO'}],'edicion','Técnico')
 const [original]=await storage.listarIntervenciones('edicion')
 await storage.editarIntervencion({...original,ciudad:'Cali'},'edicion','Editor')
 const [editado]=await storage.listarIntervenciones('edicion')
 assert.equal(editado.revision,2);assert.equal(editado.historial.at(-1).usuario,'Editor')
 assert.deepEqual(editado.historial.at(-1).cambios,[{campo:'ciudad',antes:'Bogotá',despues:'Cali'}])
 await assert.rejects(storage.editarIntervencion(original,'edicion','Técnico'),/registro cambió/)
 await assert.rejects(storage.editarIntervencion({...editado,ciudad:'Bogotá',serial:'OTRO'},'edicion','Técnico'),/Ya existe/)
})
test('precarga el histórico una sola vez sin reemplazar reclasificaciones',async()=>{
 let llamadas=0
 globalThis.fetch=async()=>{llamadas++;return {status:200,ok:true,json:async()=>[structuredClone(base)]}}
 try {
  assert.equal((await storage.listarIntervenciones('precarga')).length,1)
  await storage.reclasificarIntervencion(base,'atencion','precarga','Técnico')
  const rows=await storage.listarIntervenciones('precarga')
  assert.equal(rows[0].tipo,'atencion');assert.equal(rows.length,1);assert.equal(llamadas,1)
 } finally {globalThis.fetch=async()=>({status:404})}
})
test('importación omite fórmulas sin referencia, conserva excepciones y reporta errores',async()=>{
 const wb=XLSX.utils.book_new()
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
 ['REFERENCIA ','SN','RAZÓN SOCIAL','FECHA','CIUDAD','DÍAS','OBSERVACIONES'],
 ['HI','001','Cliente',45670,'Bogotá',365,''],
 ['HI','002','Cliente','13/01/2022','Cali','NO OPERATIVO','Revisar'],
 ['','','','','',0,''],
 ['HI','003','Cliente','fecha inválida','Cali',180,'']
 ]),'Histórico')
 const data=XLSX.write(wb,{type:'buffer',bookType:'xlsx'})
 const result=await importer.leerIntervenciones(new File([data],'base.xlsx'))
 assert.equal(result.registros.length,2);assert.equal(result.errores.length,1)
 assert.equal(result.registros[0].fecha,'2025-01-13');assert.equal(result.registros[1].fecha,'2022-01-13')
 assert.equal(result.registros[1].serial,'002');assert.equal(result.registros[1].periodicidad,null)
 assert.match(result.registros[1].observaciones,/NO OPERATIVO/)
 assert.ok(result.registros.every(r=>r.tipo==='preventivo'))
})
if(process.env.REPORTE_EXCEL_PRUEBA)test('archivo histórico del usuario',async()=>{
 const b=fs.readFileSync(process.env.REPORTE_EXCEL_PRUEBA)
 const r=await importer.leerIntervenciones(new File([b],'histórico.xlsx'))
 console.log(JSON.stringify({registros:r.registros.length,errores:r.errores,anos:[...new Set(r.registros.map(x=>x.fecha.slice(0,4)))]}))
 assert.equal(r.registros.length,314);assert.equal(r.errores.length,0)
})

test('DB MANT IN SITU lee 2025 y 2026 juntos y reimporta sin duplicar servicios',async()=>{
 const wb=XLSX.utils.book_new(),cabecera=['REFERENCIA','SN','RAZÓN SOCIAL','FECHA','CIUDAD','DÍAS','INFORME']
 const fila=fecha=>['HI 701','SERIE-701','Cliente',fecha,'Bogotá',365,'Informe-'+fecha]
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cabecera,fila('15/01/2025')]),'2025')
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cabecera,fila('15/01/2026')]),'2026')
 const archivo=new File([XLSX.write(wb,{type:'buffer',bookType:'xlsx'})],'DB MANT IN SITU.xlsx')
 const primera=await importer.leerIntervenciones(archivo)
 assert.deepEqual(primera.hojas,[{nombre:'2025',registros:1,errores:0},{nombre:'2026',registros:1,errores:0}])
 assert.deepEqual(primera.registros.map(r=>r.fecha),['2025-01-15','2026-01-15'])
 assert.equal(await storage.guardarIntervenciones(primera.registros,'varias-hojas','Técnico'),2)
 const segunda=await importer.leerIntervenciones(archivo)
 assert.equal(await storage.guardarIntervenciones(segunda.registros,'varias-hojas','Técnico'),0)
 const guardadas=await storage.listarIntervenciones('varias-hojas')
 assert.equal(guardadas.length,2);assert.deepEqual(guardadas.map(r=>r.zona),['2025','2026'])
})
