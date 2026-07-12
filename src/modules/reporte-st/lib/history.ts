import type { ReportRow } from './reportEngine'

const HIST_KEY = 'hanna_reporte_st_history_v1'

export interface TechHistEntry {
  avg: number
  n: number
  slaPct: number
}

export interface MonthHistEntry {
  slaPct: number
  avgH: number
  total: number
  byTech: Record<string, TechHistEntry>
}

export type History = Record<string, MonthHistEntry>

export function getHistory(): History {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}') } catch { return {} }
}

export function saveHistory(month: string, rows: ReportRow[]): void {
  const hist = getHistory()
  const wd = rows.filter(r => r.horas !== null)
  const ok = wd.filter(r => r.slaCumple)
  const tm: Record<string, { sum: number, n: number, ok: number }> = {}
  wd.forEach(r => {
    if (!r.tecnico) return
    if (!tm[r.tecnico]) tm[r.tecnico] = { sum: 0, n: 0, ok: 0 }
    tm[r.tecnico].sum += r.horas as number
    tm[r.tecnico].n++
    if (r.slaCumple) tm[r.tecnico].ok++
  })
  hist[month] = {
    slaPct: wd.length ? Math.round(100 * ok.length / wd.length) : 0,
    avgH: wd.length ? +(wd.reduce((a, b) => a + (b.horas as number), 0) / wd.length).toFixed(1) : 0,
    total: rows.length,
    byTech: Object.fromEntries(Object.entries(tm).map(([t, d]) => [t, { avg: +(d.sum / d.n).toFixed(1), n: d.n, slaPct: Math.round(100 * d.ok / d.n) }])),
  }
  localStorage.setItem(HIST_KEY, JSON.stringify(hist))
}

export function deleteMonth(month: string): void {
  const h = getHistory()
  delete h[month]
  localStorage.setItem(HIST_KEY, JSON.stringify(h))
}
