import type { Tarea } from '../../types'

type PlazoTarea = Pick<Tarea, 'fecha_vencimiento' | 'estado'>

export function fechaColombia(ahora: Date): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora)
  const parte = (tipo: string) => partes.find(p => p.type === tipo)!.value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

export function estaVencida(t: PlazoTarea, ahora = new Date()): boolean {
  return t.estado === 'pendiente' && !!t.fecha_vencimiento && t.fecha_vencimiento < fechaColombia(ahora)
}

export function venceHoy(t: PlazoTarea, ahora = new Date()): boolean {
  return t.estado === 'pendiente' && t.fecha_vencimiento === fechaColombia(ahora)
}

export function venceManana(t: PlazoTarea, ahora = new Date()): boolean {
  const manana = new Date(`${fechaColombia(ahora)}T00:00:00Z`)
  manana.setUTCDate(manana.getUTCDate() + 1)
  return t.estado === 'pendiente' && t.fecha_vencimiento === manana.toISOString().slice(0, 10)
}

export function esPrioritaria(t: PlazoTarea, ahora = new Date()): boolean {
  return estaVencida(t, ahora) || venceHoy(t, ahora)
}

export function esUrgente(t: PlazoTarea, ahora = new Date()): boolean {
  return esPrioritaria(t, ahora) || venceManana(t, ahora)
}
