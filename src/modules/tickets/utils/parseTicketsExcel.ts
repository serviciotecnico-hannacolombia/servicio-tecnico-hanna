import * as XLSX from 'xlsx'
import type { TicketEstado, TicketOrigen } from '../types'
import { ESTADO_LABEL, ORIGEN_LABEL } from '../types'

export function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        resolve(XLSX.read(data, { type: 'array' }))
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

// Al exportar el CSV de Notion y abrirlo/guardarlo como .xlsx sin separar por
// comas, cada fila llega completa como una sola celda de texto (con comillas
// para los campos que traen comas). Este parser respeta RFC4180 para poder
// separar esos campos igual que un CSV real.
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else cur += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { out.push(cur); cur = '' }
      else cur += c
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

const HEADER_ALIASES: Record<string, string> = {
  id: 'id',
  nombre: 'nombre',
  'creado por': 'creado_por',
  codigo: 'codigo',
  'código': 'codigo',
  serial: 'serial',
  origen: 'origen',
  respuesta: 'respuesta',
  estado: 'respuesta',
  'fecha de creacion': 'fecha',
  'fecha de creación': 'fecha',
}

export interface TicketsSheet {
  headers: string[]
  rows: string[][]
}

export function sheetFromWorkbook(wb: XLSX.WorkBook): TicketsSheet {
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][]
  const cleaned = aoa.map(r => r.map(c => String(c ?? '')))
  const nonEmpty = cleaned.filter(r => r.some(c => c.trim() !== ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }

  const headerRow = nonEmpty[0]
  const nonEmptyHeaderCells = headerRow.filter(c => c.trim() !== '')

  if (nonEmptyHeaderCells.length === 1 && nonEmptyHeaderCells[0].includes(',')) {
    const rows = nonEmpty.map(r => splitCsvLine(r[0]))
    return { headers: rows[0], rows: rows.slice(1) }
  }
  return { headers: headerRow.map(h => h.trim()), rows: nonEmpty.slice(1) }
}

export function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    const key = HEADER_ALIASES[normalize(h)]
    if (key && map[key] === undefined) map[key] = i
  })
  return map
}

const ORIGEN_REVERSE: Record<string, TicketOrigen> = Object.fromEntries(
  (Object.entries(ORIGEN_LABEL) as [TicketOrigen, string][]).map(([k, v]) => [normalize(v), k])
)

const ESTADO_REVERSE: Record<string, TicketEstado> = Object.fromEntries(
  (Object.entries(ESTADO_LABEL) as [TicketEstado, string][]).map(([k, v]) => [normalize(v), k])
)

function resolveOrigen(raw: string): TicketOrigen | null {
  return ORIGEN_REVERSE[normalize(raw)] ?? null
}

// Notion guardaba a veces dos estados combinados en un mismo campo (ej.
// "Boletín Técnico / Consulta resuelta"). Como acá es un único selector, se
// prioriza "Boletín Técnico" por ser el motivo explícito que se quiere poder
// filtrar, y se deja el texto completo original en la nota para no perder info.
function resolveEstado(raw: string): { estado: TicketEstado | null; nota: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { estado: null, nota: '' }

  const exact = ESTADO_REVERSE[normalize(trimmed)]
  if (exact) return { estado: exact, nota: '' }

  if (normalize(trimmed).includes('boletin tecnico')) {
    return { estado: 'boletin_tecnico', nota: trimmed }
  }

  const parts = trimmed.split('/').map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    const match = ESTADO_REVERSE[normalize(part)]
    if (match) return { estado: match, nota: trimmed }
  }

  return { estado: null, nota: trimmed }
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

// Formato de Notion: "16 de septiembre de 2026 8:28".
function parseFechaEs(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const m = trimmed.match(/(\d{1,2})\s+de\s+(\S+)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i)
  if (!m) return undefined
  const month = MESES[normalize(m[2])]
  if (month === undefined) return undefined
  const day = Number(m[1])
  const year = Number(m[3])
  const hour = m[4] ? Number(m[4]) : 0
  const minute = m[5] ? Number(m[5]) : 0
  const date = new Date(year, month, day, hour, minute)
  return isNaN(date.getTime()) ? undefined : date.toISOString()
}

export interface ParsedTicketRow {
  notionId: string
  nombre: string
  creadoPorRaw: string
  codigo: string
  serial: string
  origen: TicketOrigen | null
  estado: TicketEstado | null
  notaEstado: string
  createdAt: string | undefined
}

export function buildTicketFromRow(row: string[], cols: Record<string, number>): ParsedTicketRow | null {
  const get = (key: string) => (cols[key] != null ? String(row[cols[key]] ?? '').trim() : '')

  const notionId = get('id')
  const nombreRaw = get('nombre')
  const codigo = get('codigo')
  const serial = get('serial')

  if (!notionId && !nombreRaw && !codigo && !serial) return null

  const { estado, nota } = resolveEstado(get('respuesta'))

  return {
    notionId,
    nombre: nombreRaw || (notionId ? `TID: ${notionId}` : 'Ticket importado'),
    creadoPorRaw: get('creado_por'),
    codigo,
    serial,
    origen: resolveOrigen(get('origen')),
    estado,
    notaEstado: nota,
    createdAt: parseFechaEs(get('fecha')),
  }
}
