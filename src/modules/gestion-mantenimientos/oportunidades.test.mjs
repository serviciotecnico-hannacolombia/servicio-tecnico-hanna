import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const source=fs.readFileSync(new URL('./oportunidades.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {validarCierre,validarOportunidad,resumirOportunidades,etiquetaOportunidad}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('la oportunidad requiere una necesidad concreta y asesor responsable',()=>{
 assert.doesNotThrow(()=>validarOportunidad({os:'0042',numero_oportunidad:'OP-1',intervencion_id:'1',titulo:'Reemplazo de electrodo',necesidad:'El electrodo no estabiliza la lectura.',asesor:'Asesor 1'}))
 assert.throws(()=>validarOportunidad({os:'0042',numero_oportunidad:'OP-1',intervencion_id:'1',titulo:'Repuesto',necesidad:'Equipo requiere repuesto',asesor:''}))
})
test('el seguimiento exige cotización HANNA y motivo de cierre sin inventar números',()=>{
 assert.throws(()=>validarCierre('cotizada','','Cotizada',1000),/cotización/)
 assert.throws(()=>validarCierre('ganada','HANNA-123','',1000),/cierre/)
 assert.doesNotThrow(()=>validarCierre('ganada','HANNA-123','Cliente aprobó',1000))
 assert.doesNotThrow(()=>validarCierre('perdida','','No requiere compra',null))
})

test('OS de cuatro cifras y número externo obligatorios; el origen manual requiere tipo y cliente',()=>{
 const o={os:'0012',numero_oportunidad:'NEG-1',intervencion_id:null,titulo:'Repuesto de equipo',necesidad:'Cliente requiere repuestos adicionales.',asesor:'Asesor',cliente:'Cliente',referencia:'',serial:'',tipo_origen:'preventivo'}
 assert.doesNotThrow(()=>validarOportunidad(o))
 for(const os of ['123','12345','12A4',' 012'])assert.throws(()=>validarOportunidad({...o,os}),/cuatro/)
 assert.throws(()=>validarOportunidad({...o,numero_oportunidad:''}),/número/)
 assert.throws(()=>validarOportunidad({...o,tipo_origen:'otro'}),/tipo/)
})
test('reporte suma una vez cada oportunidad y distingue rechazo antes y después de cotizar',()=>{
 const filas=[{estado:'ganada',cotizacion:'C-1',valor:500000},{estado:'ganada',cotizacion:'C-2',valor:null},{estado:'perdida',cotizacion:null,valor:100000},{estado:'perdida',cotizacion:'C-3',valor:200000},{estado:'pendiente',cotizacion:null,valor:null}]
 const r=resumirOportunidades(filas)
 assert.equal(r.creadas,5);assert.equal(r.aprobadas,2);assert.equal(r.cotizadas,3);assert.equal(r.rechazadas,2);assert.equal(r.rechazoOportunidad,1);assert.equal(r.rechazoCotizacion,1);assert.equal(r.valorAprobado,500000);assert.equal(r.valorCotizado,700000);assert.equal(r.aprobadasSinMonto,1)
 assert.equal(etiquetaOportunidad(filas[2]),'Oportunidad rechazada');assert.equal(etiquetaOportunidad(filas[3]),'Cotización rechazada')
})
