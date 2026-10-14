import fs from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
function cargar(path){
  const js=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  const m={exports:{}}
  new Function('require','module','exports',js)(()=>cargar('../../lib/colombiaCalendar.ts'),m,m.exports)
  return m.exports
}
const {horasLaborales,tiempoTarea}=cargar('./horasLaborales.ts')
test('jornadas Colombia y límites exactos',()=>{
  assert.equal(horasLaborales('2026-10-13T05:00:00Z','2026-10-14T04:59:00Z'),9.5)
  assert.equal(horasLaborales('2026-10-16T05:00:00Z','2026-10-17T04:59:00Z'),8.5)
  assert.equal(horasLaborales('2026-10-13T12:00:00Z','2026-10-13T12:30:00Z'),0)
  assert.equal(horasLaborales('2026-10-13T21:30:00Z','2026-10-13T23:00:00Z'),0.5)
})
test('fin de semana y lunes festivo no cuentan',()=>{
  assert.equal(horasLaborales('2026-10-09T20:00:00Z','2026-10-13T13:30:00Z'),2)
  assert.equal(horasLaborales('2026-10-10T05:00:00Z','2026-10-13T05:00:00Z'),0)
})
test('Semana Santa, cambio de año y festivo trasladado de julio',()=>{
  assert.equal(horasLaborales('2026-04-02T05:00:00Z','2026-04-04T05:00:00Z'),0)
  assert.equal(horasLaborales('2026-12-31T21:00:00Z','2027-01-04T13:30:00Z'),2)
  assert.equal(horasLaborales('2026-07-09T12:30:00Z','2026-07-09T22:00:00Z'),9.5)
  assert.equal(horasLaborales('2026-07-13T12:30:00Z','2026-07-13T22:00:00Z'),0)
})
test('completadas se detienen al cierre; pendientes usan la fecha de corte',()=>{
  const t={created_at:'2026-10-13T12:30:00Z',estado:'completada',completado_at:'2026-10-13T14:00:00Z'}
  assert.equal(tiempoTarea(t,new Date('2026-10-14T22:00:00Z')),1.5)
  assert.equal(tiempoTarea({...t,estado:'pendiente',completado_at:null},new Date('2026-10-13T15:00:00Z')),2.5)
  assert.equal(tiempoTarea({...t,completado_at:null}),null)
  assert.equal(horasLaborales('incorrecto',t.completado_at),null)
  assert.equal(horasLaborales(t.completado_at,t.created_at),null)
})
