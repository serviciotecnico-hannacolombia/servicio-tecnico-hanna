import { SLA_H, businessHours } from './businessHours'

export type CsvRow = Record<string, string>

export interface Exception {
  startDt: Date
  endDt: Date
  reason: string
  technicians: string[]
  bh: number
}

export interface ReportRow {
  otst: string
  cliente: string
  horas: number | null
  horasRaw: number | null
  excAdj: number
  slaCumple: boolean | null
  esMoroso: boolean
  tecnico: string
  vendedor: string
  cats: string[]
  anulada: boolean
  cotizacion: string
  items: number
  creacion: Date | null
  regularizacion: Date | null
  diagnostico: Date | null
  start: Date | null
  inicioLabel: string
}

// Rango Unicode de marcas diacríticas combinantes (construido por código de punto
// para evitar guardar el carácter combinante literal en el archivo fuente).
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

// Quita tildes, ñ→n y convierte a minúsculas para comparar sin importar acentuación.
export function normalize(s: string | null | undefined): string {
  return (s || '').normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim()
}

export function parseD(s: string | null | undefined): Date | null {
  if (!s || !s.trim()) return null
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0))
}

export function fmtD(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// Formato: YYYY-MM-DD, HH:MM-HH:MM, Motivo [| Técnico1; Técnico2]
export function parseExceptions(text: string): Exception[] {
  const result: Exception[] = []
  text.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const m = line.match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2}),\s*(.+)$/)
    if (!m) return
    const [, yr, mo, dy, sh, sm, eh, em, rest] = m
    const startDt = new Date(+yr, +mo - 1, +dy, +sh, +sm, 0)
    const endDt = new Date(+yr, +mo - 1, +dy, +eh, +em, 0)
    if (endDt <= startDt) return
    const pipeIdx = rest.indexOf('|')
    const reason = (pipeIdx === -1 ? rest : rest.slice(0, pipeIdx)).trim()
    const techStr = pipeIdx === -1 ? '' : rest.slice(pipeIdx + 1).trim()
    const technicians = techStr ? techStr.split(';').map(t => normalize(t)).filter(Boolean) : []
    result.push({ startDt, endDt, reason, technicians, bh: businessHours(startDt, endDt) })
  })
  return result
}

function excAppliesTo(exc: Exception, tecnico: string): boolean {
  if (!exc.technicians.length) return true
  return exc.technicians.includes(normalize(tecnico))
}

interface RgAgg {
  cliente: string
  tecnico: string
  vendedor: string
  cats: Set<string>
  moroso: string
  anulada: string
  cotizacion: string
  creador: string
  items: number
}

function getCol(row: CsvRow, ...keys: string[]): string {
  for (const k of keys) { const v = row[k]; if (v !== undefined) return v }
  return ''
}

export interface ProcessResult {
  rows: ReportRow[]
  rowsDiag: ReportRow[]
  detectedMonth: string | null
}

export function processReport(rawRG: CsvRow[], rawTC: CsvRow[], excepts: Exception[]): ProcessResult {
  const rgMap: Record<string, RgAgg> = {}
  rawRG.forEach(row => {
    const key = (row['OTST'] || '').trim()
    if (!key) return
    if (!rgMap[key]) rgMap[key] = { cliente: '', tecnico: '', vendedor: '', cats: new Set(), moroso: '0', anulada: '0', cotizacion: '', creador: '', items: 0 }
    const r = rgMap[key]
    r.items++
    if (row['Cliente']) r.cliente = row['Cliente'].trim()
    if (row['Tecnico']) r.tecnico = row['Tecnico'].trim()
    if (row['Vendedor']) r.vendedor = row['Vendedor'].trim()
    if (row['Moroso?']) r.moroso = row['Moroso?'].trim()
    if (row['Anulada']) r.anulada = row['Anulada'].trim()
    if (row['Cotizacion']) r.cotizacion = row['Cotizacion'].trim()
    if (row['Creador']) r.creador = row['Creador'].trim()
    const cat = (row['Categoria'] || '').trim()
    if (cat) r.cats.add(cat)
  })

  const rows: ReportRow[] = []
  let detectedMonth: string | null = null

  rawTC.forEach(row => {
    const otst = (row['OTST'] || '').trim()
    if (!otst) return

    const creacion = parseD(getCol(row, 'Fecha Creación', 'Fecha Creacion'))
    const regularizacion = parseD(getCol(row, 'Fecha Regularización de la Morosidad', 'Fecha Regularizacion de la Morosidad'))
    const diagnostico = parseD(getCol(row, 'Fecha Diagnóstico', 'Fecha Diagnostico'))
    const cliente = (getCol(row, 'Cliente') || '').trim()

    const start = regularizacion || creacion
    const esMoroso = !!regularizacion
    let horas: number | null = null
    if (start && diagnostico) horas = businessHours(start, diagnostico)
    const rg = rgMap[otst]
    const cats = rg?.cats ? [...rg.cats] : []

    if (!detectedMonth && diagnostico) detectedMonth = monthKey(diagnostico)

    const tecnico = rg?.tecnico || ''
    let excAdj = 0
    if (horas !== null && start && diagnostico && excepts.length) {
      excepts.forEach(exc => {
        if (excAppliesTo(exc, tecnico) && start < exc.startDt && diagnostico > exc.startDt) {
          const overlapEnd = diagnostico < exc.endDt ? diagnostico : exc.endDt
          excAdj += businessHours(exc.startDt, overlapEnd)
        }
      })
    }
    const horasAdj = horas !== null ? Math.max(0, horas - excAdj) : null
    const slaCumpleAdj = horasAdj !== null ? horasAdj <= SLA_H : null

    rows.push({
      otst, cliente,
      horas: horasAdj, horasRaw: horas, excAdj,
      slaCumple: slaCumpleAdj, esMoroso,
      tecnico, vendedor: rg?.vendedor || '', cats,
      anulada: rg?.anulada === '1', cotizacion: rg?.cotizacion || '',
      items: rg?.items || 1,
      creacion, regularizacion, diagnostico, start,
      inicioLabel: esMoroso ? 'Reg. morosidad' : 'Creación',
    })
  })

  const rowsDiag = rows.filter(r => r.horas !== null)
  return { rows, rowsDiag, detectedMonth }
}
