import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const js=ts.transpileModule(fs.readFileSync(new URL('./modeloPozo.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {notaImprevisto,resumirPozo}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const r={id:'1',created_at:'2026-01-01',cliente:'Cliente',estado:'aprobada',calculo:{margen:100000},historial:[]}
const gasto={fecha:'2026-10-30',usuario:'Técnico',nota:notaImprevisto(150000,'2026-10-30','Transporte adicional')}
test('descuenta gastos, conserva saldo negativo y cuenta una sola vez cada solicitud',()=>{
 const s={...r,historial:[gasto]};const p=resumirPozo([s,s]);assert.equal(p.aportes,100000);assert.equal(p.gastos,150000);assert.equal(p.saldo,-50000);assert.equal(p.movimientos.length,1)
})
test('excluye pruebas y pendientes; un gasto no desaparece al cancelar la solicitud',()=>{
 const p=resumirPozo([{...r,es_prueba:true,historial:[gasto]},{...r,id:'2',estado:'pendiente'},{...r,id:'3',estado:'cancelada',historial:[gasto]}]);assert.equal(p.aportes,0);assert.equal(p.gastos,150000)
})
test('no confunde notas de seguimiento con gastos y valida importes y fechas',()=>{
 assert.equal(resumirPozo([{...r,historial:[{nota:'Seguimiento comercial'}]}]).gastos,0)
 for(const valor of [0,-1,NaN,Infinity,1.5])assert.throws(()=>notaImprevisto(valor,'2026-10-30','Motivo'))
 assert.throws(()=>notaImprevisto(100,'2026-02-30','Motivo'))
 assert.throws(()=>notaImprevisto(100,'2026-10-30',' '))
 assert.throws(()=>resumirPozo([{...r,historial:[{nota:'[POZO-5-V1] incorrecto'}]}]))
})

test('libro anual separa aportes por creación y gastos por fecha del imprevisto',()=>{
 const s={...r,created_at:'2025-01-01',historial:[gasto]}
 assert.equal(resumirPozo([s],'2025').saldo,100000)
 assert.equal(resumirPozo([s],'2026').saldo,-150000)
})
