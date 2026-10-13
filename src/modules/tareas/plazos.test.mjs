// Ejecutar: node --test src/modules/tareas/plazos.test.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('./plazos.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { estaVencida, venceHoy, venceManana, esPrioritaria, esUrgente } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const tarea = (fecha, estado = 'pendiente') => ({ fecha_vencimiento: fecha, estado })

test('clasifica ayer, hoy, mañana y fechas posteriores sin solapar etiquetas', () => {
  const ahora = new Date('2026-10-13T15:00:00Z')
  for (const [fecha, esperado] of [
    ['2026-10-12', [true, false, false, true, true]],
    ['2026-10-13', [false, true, false, true, true]],
    ['2026-10-14', [false, false, true, false, true]],
    ['2026-10-15', [false, false, false, false, false]],
  ]) {
    assert.deepEqual([estaVencida, venceHoy, venceManana, esPrioritaria, esUrgente].map(fn => fn(tarea(fecha), ahora)), esperado)
  }
})

test('las completadas y sin fecha no generan alertas', () => {
  const ahora = new Date('2026-10-13T15:00:00Z')
  for (const t of [tarea(null), tarea('2026-10-12', 'completada'), tarea('2026-10-13', 'completada'), tarea('2026-10-14', 'completada')]) {
    for (const fn of [estaVencida, venceHoy, venceManana, esPrioritaria, esUrgente]) assert.equal(fn(t, ahora), false)
  }
})

test('usa medianoche de Bogotá incluso cuando UTC ya cambió de día', () => {
  assert.equal(venceHoy(tarea('2026-10-13'), new Date('2026-10-14T04:59:59Z')), true)
  assert.equal(venceHoy(tarea('2026-10-14'), new Date('2026-10-14T05:00:00Z')), true)
  assert.equal(estaVencida(tarea('2026-10-13'), new Date('2026-10-14T05:00:00Z')), true)
})

test('mañana cruza mes, año y febrero bisiesto', () => {
  for (const [ahora, fecha] of [
    ['2026-10-31T15:00:00Z', '2026-11-01'],
    ['2026-12-31T15:00:00Z', '2027-01-01'],
    ['2028-02-28T15:00:00Z', '2028-02-29'],
  ]) assert.equal(venceManana(tarea(fecha), new Date(ahora)), true)
})
