import * as XLSX from 'xlsx'
import { fmtD, type ReportRow } from './reportEngine'

// Solo generamos workbooks (nunca leemos/parseamos archivos .xlsx de terceros con
// esta librería) — el CVE conocido de xlsx aplica a su ruta de lectura, no a esta.
export function exportExcel(allRows: ReportRow[], month: string): void {
  if (!allRows.length) return

  const wb = XLSX.utils.book_new()
  const fmtH = (h: number | null) => (h !== null ? +h.toFixed(1) : '')

  const withD = allRows.filter(r => r.horas !== null)
  const ok = withD.filter(r => r.slaCumple)
  const slaPct = withD.length ? (100 * ok.length / withD.length).toFixed(1) : ''
  const avgH = withD.length ? (withD.reduce((a, b) => a + (b.horas as number), 0) / withD.length).toFixed(1) : ''
  const sinDiag = allRows.filter(r => r.horas === null && !r.anulada).length
  const morosas = allRows.filter(r => r.esMoroso).length

  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Reporte Servicio Técnico — ' + month],
    [],
    ['Indicador', 'Valor'],
    ['Período', month],
    ['Total OTs', allRows.length],
    ['OTs con diagnóstico', withD.length],
    ['OTs sin diagnóstico', sinDiag],
    ['OTs con regularización morosidad', morosas],
    ['Cumplimiento SLA (%)', slaPct],
    ['Promedio horas diagnóstico', avgH],
    ['SLA objetivo (horas)', 30],
  ])
  ws1['!cols'] = [{ wch: 38 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Mensual')

  const headers2 = ['OTST', 'Cliente', 'Técnico', 'Vendedor', 'Familia(s)', 'Moroso',
    'Fecha Creación', 'Fecha Reg. Morosidad', 'Fecha Diagnóstico',
    'Inicio conteo', 'Horas hábiles', 'SLA ≤30h', 'Estado']
  const rows2 = allRows.map(r => [
    r.otst, r.cliente, r.tecnico, r.vendedor, r.cats.join('; '),
    r.esMoroso ? 'Sí' : 'No',
    fmtD(r.creacion), fmtD(r.regularizacion), fmtD(r.diagnostico),
    r.inicioLabel,
    fmtH(r.horas),
    r.slaCumple === true ? 'Cumple' : r.slaCumple === false ? 'No cumple' : 'Sin diagnóstico',
    r.anulada ? 'Anulada' : r.slaCumple === true ? '✓ OK' : r.slaCumple === false ? '✗ Incumple' : '— Pendiente',
  ])
  const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2])
  ws2['!cols'] = [8, 22, 20, 20, 35, 9, 14, 20, 16, 18, 14, 12, 12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle OTs')

  const tm: Record<string, { n: number, diag: number, ok: number, sum: number }> = {}
  allRows.filter(r => r.tecnico).forEach(r => {
    if (!tm[r.tecnico]) tm[r.tecnico] = { n: 0, diag: 0, ok: 0, sum: 0 }
    tm[r.tecnico].n++
    if (r.horas !== null) { tm[r.tecnico].diag++; tm[r.tecnico].sum += r.horas }
    if (r.slaCumple) tm[r.tecnico].ok++
  })
  const headers3 = ['Técnico', 'Total OTs', 'Con diagnóstico', 'Sin diagnóstico',
    'Cumple SLA', 'No cumple SLA', '% Cumplimiento', 'Prom. horas']
  const rows3 = Object.entries(tm)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([t, d]) => [
      t, d.n, d.diag, d.n - d.diag, d.ok, d.diag - d.ok,
      d.diag ? (100 * d.ok / d.diag).toFixed(1) : '',
      d.diag ? (d.sum / d.diag).toFixed(1) : '',
    ])
  const ws3 = XLSX.utils.aoa_to_sheet([headers3, ...rows3])
  ws3['!cols'] = [22, 12, 16, 16, 12, 14, 16, 13].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws3, 'Por Técnico')

  const fm: Record<string, { n: number, ok: number, sum: number }> = {}
  allRows.filter(r => r.horas !== null).forEach(r => {
    r.cats.forEach(cat => {
      if (!fm[cat]) fm[cat] = { n: 0, ok: 0, sum: 0 }
      fm[cat].n++; fm[cat].sum += r.horas as number
      if (r.slaCumple) fm[cat].ok++
    })
  })
  const headers4 = ['Familia', 'OTs diagnosticadas', 'Cumple SLA', 'No cumple SLA',
    '% Cumplimiento', 'Prom. horas', '% Incumplimiento']
  const rows4 = Object.entries(fm)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([cat, d]) => [
      cat, d.n, d.ok, d.n - d.ok,
      (100 * d.ok / d.n).toFixed(1),
      (d.sum / d.n).toFixed(1),
      (100 * (d.n - d.ok) / d.n).toFixed(1),
    ])
  const ws4 = XLSX.utils.aoa_to_sheet([headers4, ...rows4])
  ws4['!cols'] = [40, 18, 12, 14, 16, 13, 16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws4, 'Por Familia')

  XLSX.writeFile(wb, 'ST_Reporte_' + month.replace(/[^a-zA-Z0-9]/g, '_') + '.xlsx')
}
