// Horas hábiles Colombia: Lun-Jue 7:30-17:00 · Vie 7:30-16:00 · Sáb-Dom cerrado.
// Incluye festivos colombianos (Ley de Puentes + fijos + Semana Santa).

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

function easterDate(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mo = Math.floor((h + l - 7 * m + 114) / 31) - 1, dy = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(y, mo, dy)
}
function nextMon(d: Date): Date {
  const r = new Date(d), dow = r.getDay()
  if (dow === 1) return r
  r.setDate(r.getDate() + ((8 - dow) % 7 || 7)); return r
}
function addD(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function colHolidays(y: number): Set<string> {
  const E = easterDate(y), nm = (m: number, d: number) => nextMon(new Date(y, m - 1, d))
  return new Set([
    `${y}-1-1`,
    `${y}-${nm(1, 6).getMonth() + 1}-${nm(1, 6).getDate()}`,
    `${y}-${nm(3, 19).getMonth() + 1}-${nm(3, 19).getDate()}`,
    `${y}-${addD(E, -3).getMonth() + 1}-${addD(E, -3).getDate()}`,
    `${y}-${addD(E, -2).getMonth() + 1}-${addD(E, -2).getDate()}`,
    `${y}-5-1`,
    `${y}-${nextMon(addD(E, 39)).getMonth() + 1}-${nextMon(addD(E, 39)).getDate()}`,
    `${y}-${nextMon(addD(E, 59)).getMonth() + 1}-${nextMon(addD(E, 59)).getDate()}`,
    `${y}-${nextMon(addD(E, 70)).getMonth() + 1}-${nextMon(addD(E, 70)).getDate()}`,
    `${y}-${nm(6, 29).getMonth() + 1}-${nm(6, 29).getDate()}`,
    `${y}-7-20`,
    `${y}-8-7`,
    `${y}-${nm(8, 15).getMonth() + 1}-${nm(8, 15).getDate()}`,
    `${y}-${nm(10, 12).getMonth() + 1}-${nm(10, 12).getDate()}`,
    `${y}-${nm(11, 1).getMonth() + 1}-${nm(11, 1).getDate()}`,
    `${y}-${nm(11, 11).getMonth() + 1}-${nm(11, 11).getDate()}`,
    `${y}-12-8`,
    `${y}-12-25`,
  ])
}

const holCache: Record<number, Set<string>> = {}
function isHoliday(d: Date): boolean {
  const y = d.getFullYear()
  if (!holCache[y]) holCache[y] = colHolidays(y)
  return holCache[y].has(`${y}-${d.getMonth() + 1}-${d.getDate()}`)
}

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
