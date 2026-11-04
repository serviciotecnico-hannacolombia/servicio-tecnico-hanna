import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const model=url(compile(fs.readFileSync(new URL('./intervenciones.ts',import.meta.url),'utf8')))
const config=url(compile(fs.readFileSync(new URL('./configuracionAlertas.ts',import.meta.url),'utf8')))
const {programar,tiempoServicio,historialEquipo,ultimoPreventivo,nuevaVisitaEquipo,sugerirEquipos,usarDatosEquipo}=await import(url(compile(fs.readFileSync(new URL('./programacion.ts',import.meta.url),'utf8')).replace("'./intervenciones'",JSON.stringify(model)).replace("'./configuracionAlertas'",JSON.stringify(config))))
const equipo={id:'1',referencia:'HI2020',serial:'SN1',fecha:'2024-01-01',tipo:'preventivo',periodicidad:365}
test('sólo el último preventivo determina alertas; conserva historial por equipo',()=>{
 const r=programar([equipo,{...equipo,id:'2',fecha:'2025-01-01'},{...equipo,id:'3',fecha:'2025-06-01',tipo:'correctivo'}],'2025-12-30')
 assert.equal(r[0].estado,'historico');assert.equal(r[1].estado,'urgente');assert.equal(r[2].estado,'sin_fecha')
})
test('seriales desconocidos y referencias distintas no se agrupan',()=>{
 const r=programar([{...equipo,serial:'N/A'},{...equipo,id:'2',serial:'N/A',fecha:'2025-01-01'},{...equipo,id:'3',referencia:'HI5522',fecha:'2025-01-01'}],'2025-12-30')
 assert.ok(r.every(x=>x.estado!=='historico'))
})
test('umbrales incluyen vencidos y límites exactos de 30, 60 y 90 días',()=>{
 const registros=[-1,0,29,30,60,61,90,91].map((dias,i)=>{
  const d=new Date('2025-01-01T12:00:00Z');d.setUTCDate(d.getUTCDate()+dias)
  return {...equipo,id:String(i),serial:String(i),fecha:d.toISOString().slice(0,10),periodicidad:365}
 })
 assert.deepEqual(programar(registros,'2026-01-01').map(x=>x.estado),['vencido','urgente','urgente','proximo','proximo','anticipado','anticipado','vigente'])
 assert.equal(programar([{...equipo,periodicidad:null}])[0].estado,'sin_fecha')
})

test('umbrales configurados cambian el semáforo y validan sus límites',async()=>{
 const {validarConfiguracion,mismoDestinatario,CONFIGURACION_ALERTAS}=await import(config)
 const c={...CONFIGURACION_ALERTAS,anticipado:120,proximo:60,urgente:15}
 assert.doesNotThrow(()=>validarConfiguracion(c))
 assert.equal(programar([{...equipo,fecha:'2025-01-11'}],'2026-01-01',c)[0].estado,'urgente')
 assert.throws(()=>validarConfiguracion({...c,urgente:70}),/plazos/)
 assert.equal(mismoDestinatario('Andrés Felipe Latorre','Andrés Latorre'),true)
 assert.equal(mismoDestinatario('Otro Andrés','Andrés Latorre'),false)
})

test('semáforo muestra días restantes, vencimiento de hoy y retraso con singular correcto',()=>{
 assert.equal(tiempoServicio(12),'Faltan 12 días')
 assert.equal(tiempoServicio(1),'Falta 1 día')
 assert.equal(tiempoServicio(0),'Vence hoy')
 assert.equal(tiempoServicio(-1),'Vencido hace 1 día')
 assert.equal(tiempoServicio(-336),'Vencido hace 336 días')
 assert.equal(tiempoServicio(null),'Sin programación')
 assert.equal(tiempoServicio(-336,'historico'),'Historial anterior')
})

test('un preventivo de 2026 reemplaza el de 2024 sin alertar por el año 2025 ausente',()=>{
 const anterior={...equipo,id:'2024',fecha:'2024-06-01',periodicidad:365}
 const actual={...equipo,id:'2026',fecha:'2026-06-01',periodicidad:180}
 const registros=[anterior,actual]
 const p=programar(registros,'2026-10-26')
 assert.equal(p[0].estado,'historico');assert.equal(p[0].proximo,null)
 assert.equal(p[1].proximo.fecha,'2026-11-28');assert.equal(p[1].proximo.dias,33)
 assert.equal(p.filter(x=>x.estado==='vencido').length,0)
 assert.equal(ultimoPreventivo(registros,anterior).id,'2026')
 assert.deepEqual(historialEquipo(registros,actual).map(x=>x.id),['2026','2024'])
})
test('un nuevo servicio conserva la periodicidad acordada y no copia el informe anterior',()=>{
 const anterior={...equipo,documento:'FV123',informe:'INF123',observaciones:'Atención anterior',historial:[{nota:'Servicio anterior'}],revision:5}
 const nuevo=nuevaVisitaEquipo(anterior,180)
 assert.equal(nuevo.periodicidad,180);assert.equal(nuevo.serial,anterior.serial)
 assert.notEqual(nuevo.id,anterior.id);assert.equal(nuevo.documento,'');assert.equal(nuevo.informe,'')
 assert.equal(nuevo.historial.length,0);assert.equal(nuevo.revision,1)
 assert.equal(nuevaVisitaEquipo(anterior).periodicidad,365)
 assert.equal(nuevaVisitaEquipo(anterior,null).periodicidad,null)
})
test('dos servicios del mismo equipo en el mismo día sólo generan una programación',()=>{
 const p=programar([equipo,{...equipo,id:'2',periodicidad:180}],'2024-02-01')
 assert.equal(p.filter(x=>x.proximo!==null).length,1)
})

test('las sugerencias agrupan la hoja de vida y distinguen seriales repetidos entre referencias',()=>{
 const historico={...equipo,serial:'SN123',fecha:'2024-01-01'}
 const reciente={...historico,id:'2',fecha:'2026-01-01'}
 const otraReferencia={...historico,id:'3',referencia:'HI5522'}
 const registros=[historico,reciente,otraReferencia,{...equipo,id:'4',serial:'N/A'}]
 assert.deepEqual(sugerirEquipos(registros,'sn1','HI2020').map(x=>x.id),['2','3'])
 assert.equal(sugerirEquipos(registros,'SN123','HI5522')[0].referencia,'HI5522')
 assert.equal(sugerirEquipos(registros,'').length,0)
 assert.equal(sugerirEquipos(registros,'N/A').length,0)
})
test('usar una sugerencia mantiene fecha e informe nuevos y toma la última periodicidad acordada',()=>{
 const antiguo={...equipo,id:'antiguo',fecha:'2024-06-01',serial:'SN123',periodicidad:365,cliente:'Cliente',ciudad:'Bogotá',contacto:'Anterior',informe:'INF2024',documento:'FV2024'}
 const ultimo={...antiguo,id:'ultimo',fecha:'2026-06-01',periodicidad:180,contacto:'Actual'}
 const borrador={...ultimo,id:'nuevo',fecha:'2026-10-26',informe:'INF2026',documento:'FV2026',historial:[],periodicidad:365}
 const lleno=usarDatosEquipo(borrador,ultimo,[antiguo,ultimo])
 assert.equal(lleno.id,'nuevo');assert.equal(lleno.fecha,'2026-10-26')
 assert.equal(lleno.informe,'INF2026');assert.equal(lleno.documento,'FV2026')
 assert.equal(lleno.periodicidad,180);assert.equal(lleno.contacto,'Actual')
 assert.equal(lleno.historial.length,0)
 assert.equal(usarDatosEquipo({...borrador,tipo:'correctivo',periodicidad:null},ultimo,[ultimo]).periodicidad,null)
})
