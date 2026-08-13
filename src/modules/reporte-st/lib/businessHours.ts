// Horas hábiles Colombia: Lun-Jue 7:30-17:00 · Vie 7:30-16:00 · Sáb-Dom cerrado.
// Festivos colombianos (Ley de Puentes + fijos + Semana Santa) vienen del
// calendario compartido en src/lib/colombiaCalendar.ts.

import { isHoliday } from '../../../lib/colombiaCalendar'

export const SLA_H = 30

type Schedule = [number, number] | null

const SCHED: Schedule[] = [
  null,          // 0 Domingo
  [7.5, 17.0],   // 1 Lunes
  [7.5, 17.0],   // 2 Martes
  [7.5, 17.0],   // 3 Miércoles
  [7.5, 17.0],   // 4 Jueves
  [7.5, 16.0],   // 5 Viernes
  null,          // 6 Sábado
]

export function businessHours(start: Date | null, end: Date | null): number {
  if (!start || !end || end <= start) return 0
  let total = 0
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cur <= end) {
    const sch = SCHED[cur.getDay()]
    if (sch && !isHoliday(cur)) {
      const ws = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), Math.floor(sch[0]), (sch[0] % 1) * 60)
      const we = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), Math.floor(sch[1]), (sch[1] % 1) * 60)
      const os = Math.max(start.getTime(), ws.getTime())
      const oe = Math.min(end.getTime(), we.getTime())
      if (oe > os) total += (oe - os) / 3_600_000
    }
    cur.setDate(cur.getDate() + 1)
  }
  return total
}
