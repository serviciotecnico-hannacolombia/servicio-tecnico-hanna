import { tiempoTarea } from './horasLaborales'
import Papa from 'papaparse'
import type { Tarea } from '../../types'
import { fechaColombia } from './plazos'

export type FechaReporte = 'vencimiento' | 'creacion'

export function mesActual(ahora = new Date()): { desde: string; hasta: string } {
  const hoy = fechaColombia(ahora)
  const [anio, mes] = hoy.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: `${hoy.slice(0, 7)}-${ultimoDia}` }
}

export function tareasEnRango(tareas: Tarea[], desde: string, hasta: string, criterio: FechaReporte): Tarea[] {
  return tareas.filter(t => {
    const fecha = criterio === 'vencimiento' ? t.fecha_vencimiento : fechaColombia(new Date(t.created_at))
    return !!fecha && fecha >= desde && fecha <= hasta
  })
}

export function generarReporteCSV(tareas: Tarea[], nombre: (id: string) => string, ahora = new Date()): string {
  return '\uFEFF' + Papa.unparse({
    fields: ['Título', 'Observaciones', 'Estado', 'Creado por', 'Asignado a',
      'Fecha de creación (Colombia)', 'Fecha de vencimiento', 'Fecha de finalización (Colombia)', 'Tiempo (horas hábiles)'],
    data: tareas.map(t => [t.titulo, t.descripcion ?? '',
      t.estado === 'pendiente' ? 'Pendiente' : 'Completada', nombre(t.creado_por), nombre(t.asignado_a),
      fechaColombia(new Date(t.created_at)), t.fecha_vencimiento ?? '',
      t.completado_at ? fechaColombia(new Date(t.completado_at)) : '',
      tiempoTarea(t,ahora)==null?'':Number(tiempoTarea(t,ahora)!.toFixed(2))]),
  }, { delimiter: ';', escapeFormulae: true })
}

export function descargarReporteCSV(csv: string, desde: string, hasta: string, criterio: FechaReporte) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `tareas_${criterio}_${desde}_${hasta}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
