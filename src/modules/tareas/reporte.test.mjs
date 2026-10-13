// Ejecutar: node --test src/modules/tareas/*.test.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import Papa from 'papaparse'

const require = createRequire(import.meta.url)
function cargar(archivo) {
  const source = readFileSync(new URL(archivo, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(
    id => id === './plazos' ? cargar('./plazos.ts') : require(id), module, module.exports)
  return module.exports
}
const { mesActual, tareasEnRango, generarReporteCSV } = cargar('./reporte.ts')
const tarea = (fecha, cambios = {}) => ({
  id: 'id-1', titulo: 'Revisión; equipo', descripcion: 'Primera línea\nSegunda "línea"', privada: true,
  estado: 'pendiente', creado_por: 'creador', asignado_a: 'asignado', fecha_vencimiento: fecha,
  created_at: '2026-10-14T01:00:00Z', completado_at: null, ...cambios,
})

test('mes actual completo en Colombia, incluido febrero bisiesto', () => {
  assert.deepEqual(mesActual(new Date('2026-11-01T03:00:00Z')), { desde: '2026-10-01', hasta: '2026-10-31' })
  assert.deepEqual(mesActual(new Date('2028-02-15T15:00:00Z')), { desde: '2028-02-01', hasta: '2028-02-29' })
})

test('rango inclusivo por vencimiento sin excluir completadas', () => {
  const tareas = [tarea('2026-10-01'), tarea('2026-10-31', { estado: 'completada' }), tarea(null), tarea('2026-11-01')]
  assert.deepEqual(tareasEnRango(tareas, '2026-10-01', '2026-10-31', 'vencimiento'), tareas.slice(0, 2))
  assert.equal(tareasEnRango(tareas, '2027-01-01', '2027-01-31', 'vencimiento').length, 0)
})

test('rango por creación permite tareas sin vencimiento y usa fecha Colombia', () => {
  const tareas = [tarea(null)]
  assert.equal(tareasEnRango(tareas, '2026-10-13', '2026-10-13', 'creacion').length, 1)
  assert.equal(tareasEnRango(tareas, '2026-10-14', '2026-10-14', 'creacion').length, 0)
})

test('CSV conserva tildes, saltos y separadores, e impide fórmulas de Excel', () => {
  const csv = generarReporteCSV([tarea(null), tarea('2026-10-31', {
    privada: false, estado: 'completada', titulo: '=HYPERLINK("url")', completado_at: '2026-11-01T01:00:00Z',
  })], id => id === 'creador' ? 'José' : 'Ana')
  assert.equal(csv.charCodeAt(0), 0xFEFF)
  const { data, errors, meta } = Papa.parse(csv, { header: true, delimiter: ';' })
  assert.equal(errors.length, 0)
  assert.equal(Object.hasOwn(data[0], 'ID'), false)
  assert.equal(Object.hasOwn(data[0], 'Visibilidad'), false)
  assert.deepEqual(meta.fields, ['Título', 'Observaciones', 'Estado', 'Creado por', 'Asignado a',
    'Fecha de creación (Colombia)', 'Fecha de vencimiento', 'Fecha de finalización (Colombia)'])
  assert.equal(csv.includes('id-1'), false)
  assert.equal(data[0]['Título'], 'Revisión; equipo')
  assert.equal(data[0]['Observaciones'], 'Primera línea\nSegunda "línea"')
  assert.equal(data[0]['Creado por'], 'José')
  assert.equal(data[0]['Fecha de creación (Colombia)'], '2026-10-13')
  assert.equal(data[0]['Fecha de vencimiento'], '')
  assert.equal(data[1]['Fecha de vencimiento'], '2026-10-31')
  assert.equal(data[1]['Estado'], 'Completada')
  assert.equal(data[1]['Fecha de finalización (Colombia)'], '2026-10-31')
  assert.equal(data[1]['Título'], '\'=HYPERLINK("url")')
})
