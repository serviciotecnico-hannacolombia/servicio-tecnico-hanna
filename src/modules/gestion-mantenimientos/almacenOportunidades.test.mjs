import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const model=url(compile(fs.readFileSync(new URL('./oportunidades.ts',import.meta.url),'utf8')))
const source=fs.readFileSync(new URL('./almacenOportunidades.ts',import.meta.url),'utf8').replace(/^import .*supabase.*$/m,'const supabase={};const fetchAllRows=()=>{throw Error("No acceso remoto en prueba local")}').replace(/^import .*listarIntervenciones.*$/m,'const listarIntervenciones=async()=>globalThis.origenesPrueba').replace('import.meta.env.DEV','true')
const a=await import(url(compile(source).replace("'./oportunidades'",JSON.stringify(model))))
const memoria=new Map()
globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)}
globalThis.origenesPrueba=['preventivo','correctivo','atencion'].map((tipo,i)=>({id:String(i),tipo,cliente:'Cliente real',referencia:'HI2020',serial:'SN1'}))
test('cualquier tipo de servicio origina una oportunidad y el reintento no duplica',async()=>{
 for(let i=0;i<3;i++){
  const datos={os:'0042',numero_oportunidad:'NEG-'+i,id:'op'+i,intervencion_id:String(i),titulo:'Repuesto de equipo',necesidad:'El cliente requiere reemplazar el electrodo.',asesor:'Asesor 1'}
  const r=await a.crearOportunidad(datos,'u1','Técnico');assert.equal(r.tipo_origen,globalThis.origenesPrueba[i].tipo);assert.equal(r.cotizacion,null)
  await a.crearOportunidad(datos,'u1','Técnico')
 }
 assert.equal((await a.listarOportunidades('u1')).length,3);assert.equal((await a.listarOportunidades('u2')).length,0)
})
test('cotización externa, cierre e historial quedan guardados con control de revisión',async()=>{
 const [original]=await a.listarOportunidades('u1')
 const cotizada=await a.actualizarOportunidad(original,'cotizada','HANNA-789','El asesor registró la cotización',500000,'u1','Asesor')
 const ganada=await a.actualizarOportunidad(cotizada,'ganada','HANNA-789','Cliente aprobó',500000,'u1','Asesor')
 assert.equal(ganada.historial.length,3);assert.equal(ganada.estado,'ganada');assert.equal(ganada.cotizacion,'HANNA-789')
 await assert.rejects(a.actualizarOportunidad(original,'seguimiento','HANNA-789','Llamar',500000,'u1','Asesor'),/cambió/)
 assert.equal((await a.listarOportunidades('u1')).find(o=>o.id===ganada.id).estado,'ganada')
})

test('registro manual, rechazo antes de cotizar y relación posterior con atención',async()=>{
 const datos={id:'manual',intervencion_id:null,os:'0043',numero_oportunidad:'NEG-MANUAL',cliente:'Cliente manual',referencia:'HI1',serial:'SN2',tipo_origen:'correctivo',titulo:'Compra de accesorios',necesidad:'Cliente necesita accesorios para su equipo.',asesor:'Asesor 2'}
 const creada=await a.crearOportunidad(datos,'u1','Técnico');assert.equal(creada.intervencion_id,null);assert.equal(creada.os,'0043')
 const rechazada=await a.actualizarOportunidad(creada,'perdida','','No tiene presupuesto',100000,'u1','Técnico')
 assert.equal(rechazada.estado,'perdida');assert.equal(rechazada.cotizacion,null)
 const vinculada=await a.actualizarOportunidad(rechazada,'pendiente','','Cliente retoma la solicitud',100000,'u1','Técnico',{...datos,intervencion_id:'2'})
 assert.equal(vinculada.tipo_origen,'atencion');assert.equal(vinculada.cliente,'Cliente real');assert.equal(vinculada.intervencion_id,'2')
 await assert.rejects(a.crearOportunidad({...datos,id:'otro'},'u1','Técnico'),/ese número/)
 await assert.rejects(a.crearOportunidad({...datos,os:'123',id:'invalido',numero_oportunidad:'NEG-MAL'},'u1','Técnico'),/cuatro/)
 const cotizada=await a.actualizarOportunidad(vinculada,'cotizada','COT-42','Registrada',100000,'u1','Técnico')
 await assert.rejects(a.actualizarOportunidad(cotizada,'perdida','','Motivo',100000,'u1','Técnico'),/Conserva/)
})
