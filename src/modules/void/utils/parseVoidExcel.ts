import * as XLSX from 'xlsx'
import type { VoidRecord } from '../types'
import { parseEquipoQR } from './qrParser'

export interface ExcelSheet {
  name: string
  title: string
  headers: string[]
  rows: string[][]
}

export function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        resolve(XLSX.read(data, { type: 'array', cellDates: true }))
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export type ImportFieldKey =
  | 'void_blanco' | 'void_gris' | 'qr_equipo' | 'referencia' | 'numero_serie'
  | 'nombre_equipo' | 'libro' | 'documento_referencia' | 'observaciones' | 'created_at'

const FIELD_ALIASES: Record<ImportFieldKey, string[]> = {
  void_blanco: ['void blanco', 'vb', 'void blanco (b)'],
  void_gris: ['void gris', 'vg'],
  qr_equipo: ['qr equipo', 'qr', 'codigo qr', 'código qr', 'equipo qr'],
  referencia: ['referencia', 'ref'],
  numero_serie: ['numero de serie', 'número de serie', 'numero serie', 'serie', 'no. serie', 'n° serie'],
  nombre_equipo: ['nombre del equipo', 'nombre equipo', 'equipo'],
  libro: ['libro', 'sede', 'ciudad'],
  documento_referencia: [
    'factura / remision / otst', 'factura/remision/otst', 'factura / remisión / otst',
    'factura', 'remision', 'remisión', 'otst', 'documento', 'documento de referencia', 'factura / otst',
  ],
  observaciones: ['observaciones', 'obs', 'notas'],
  created_at: ['fecha', 'fecha de registro', 'created_at'],
}

const ALL_HEADER_ALIASES = Object.values(FIELD_ALIASES).flat()

// Las hojas por libro (ej. "Calibraciones") traen un título arriba (ej. fila 1
// con el nombre del libro en una sola celda) y los encabezados reales unas
// filas más abajo. Se detecta la fila de encabezados por coincidencia de
// nombres conocidos, y todo lo anterior se guarda como "título" de la hoja.
function looksLikeHeaderRow(row: string[]): number {
  let matches = 0
  for (const cell of row) {
    const v = cell.trim().toLowerCase()
    if (v && ALL_HEADER_ALIASES.includes(v)) matches++
  }
  return matches
}

// Filas y encabezados de cada hoja no vacía del libro. La macro original
// guardaba una hoja "BaseDatos" con todos los registros (con columna Libro)
// y una hoja por cada libro/sede sin esa columna — por eso se listan todas
// las hojas y se deja elegir cuál importar.
export function sheetsFromWorkbook(wb: XLSX.WorkBook): ExcelSheet[] {
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name]
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as string[][]
    const cleaned = aoa.map(r => r.map(c => String(c ?? '')))
    const nonEmpty = cleaned.filter(r => r.some(c => c.trim() !== ''))

    if (!nonEmpty.length) return { name, title: '', headers: [], rows: [] }

    let headerPos = 0
    let bestMatches = looksLikeHeaderRow(nonEmpty[0])
    for (let i = 1; i < nonEmpty.length; i++) {
      const matches = looksLikeHeaderRow(nonEmpty[i])
      if (matches > bestMatches) { bestMatches = matches; headerPos = i }
    }
    // Si ninguna fila parece de encabezados, se asume la primera (comportamiento anterior).
    if (bestMatches < 2) headerPos = 0

    const title = nonEmpty
      .slice(0, headerPos)
      .map(r => r.find(c => c.trim() !== ''))
      .filter(Boolean)
      .join(' ')

    const headers = nonEmpty[headerPos].map(h => h.trim())
    const rows = nonEmpty.slice(headerPos + 1)

    return { name, title, headers, rows }
  }).filter(s => s.rows.length > 0)
}

export const IMPORT_FIELDS: { key: ImportFieldKey; label: string; required?: boolean }[] = [
  { key: 'void_blanco', label: 'VOID Blanco', required: true },
  { key: 'void_gris', label: 'VOID Gris', required: true },
  { key: 'qr_equipo', label: 'QR Equipo (texto crudo)' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'numero_serie', label: 'Número de Serie' },
  { key: 'nombre_equipo', label: 'Nombre del Equipo' },
  { key: 'libro', label: 'Libro / Sede' },
  { key: 'documento_referencia', label: 'Factura / Remisión / OTST' },
  { key: 'observaciones', label: 'Observaciones' },
  { key: 'created_at', label: 'Fecha de Registro' },
]

export type ColumnMapping = Record<ImportFieldKey, number | null>

export function autoMapHeaders(headers: string[]): ColumnMapping {
  const map = {} as ColumnMapping
  for (const field of IMPORT_FIELDS) {
    const aliases = FIELD_ALIASES[field.key]
    const idx = headers.findIndex(h => aliases.includes(h.trim().toLowerCase()))
    map[field.key] = idx >= 0 ? idx : null
  }
  return map
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

// Sugiere un libro de la lista conocida a partir del nombre/título de la
// hoja (ej. pestaña "Calibraciones" -> libro "Calibración"), ignorando tildes.
export function guessLibro(candidate: string, libros: string[]): string | null {
  const norm = normalizeText(candidate)
  if (!norm) return null
  const exact = libros.find(l => normalizeText(l) === norm)
  if (exact) return exact
  const partial = libros.find(l => {
    const nl = normalizeText(l)
    return norm.includes(nl) || nl.includes(norm)
  })
  return partial || null
}

// La hoja "BaseDatos" de la macro guardaba el QR ya recortado como
// "REFERENCIA - SERIE", mientras que las hojas por libro lo guardaban como
// "REFERENCIA SERIE" separado solo por espacio (ver Sub RegistrarEquipo).
// Si además el valor trae el formato original separado por "Ñ", se reutiliza
// el parser existente.
function deriveEquipoFields(raw: string) {
  const value = raw.trim()
  if (!value) return { referencia: '', numero_serie: '', nombre_equipo: '' }

  if (value.includes('Ñ')) {
    const parsed = parseEquipoQR(value)
    return { referencia: parsed.referencia, numero_serie: parsed.serie, nombre_equipo: parsed.nombre }
  }
  if (value.includes(' - ')) {
    const [ref, serie] = value.split(' - ').map(s => s.trim())
    return { referencia: ref || '', numero_serie: serie || '', nombre_equipo: '' }
  }
  // "REF SERIE" separado solo por un espacio.
  const spaceMatch = value.match(/^(\S+)\s+(.+)$/)
  if (spaceMatch) {
    return { referencia: spaceMatch[1], numero_serie: spaceMatch[2].trim(), nombre_equipo: '' }
  }
  return { referencia: value, numero_serie: '', nombre_equipo: '' }
}

// En el Excel, "Observaciones" a veces guardaba en realidad el número de
// Factura/Remisión (ej. "FV 203263", "RM 78589" o incluso solo "78114" sin
// prefijo). Si la columna de documento no está mapeada, se intenta rescatar
// ese dato de las observaciones en vez de perderlo.
const DOC_PREFIX_REGEX = /^(FV|RM|OTST|REM(?:ISI[OÓ]N)?|FACTURA)\.?\s*[:#-]?\s*(\d[\w-]*)/i

function extractDocumentoFromObservaciones(observaciones: string): { documento: string; resto: string } {
  const trimmed = observaciones.trim()
  if (!trimmed) return { documento: '', resto: '' }

  const m = trimmed.match(DOC_PREFIX_REGEX)
  if (m) {
    const documento = `${m[1].toUpperCase()} ${m[2]}`.trim()
    const resto = trimmed.slice(m[0].length).replace(/^[\s,;.-]+/, '').trim()
    return { documento, resto }
  }

  // Observación compuesta solo por un número: probablemente el número de
  // factura/remisión sin prefijo, tal como se cargaba en algunas filas.
  if (/^\d{4,}$/.test(trimmed)) {
    return { documento: trimmed, resto: '' }
  }

  return { documento: '', resto: trimmed }
}

// El Excel original guarda las fechas en formato colombiano dd/mm/yyyy.
// `new Date("02/03/2026")` en JS lo interpreta como mm/dd/yyyy (3 de febrero
// en vez de 2 de marzo), así que hay que parsearlo explícitamente antes de
// intentar con el constructor genérico.
function parseFecha(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day))
      if (!isNaN(date.getTime())) return date.toISOString()
    }
  }

  const fallback = new Date(trimmed)
  return isNaN(fallback.getTime()) ? undefined : fallback.toISOString()
}

export function buildRecordFromRow(
  row: string[],
  mapping: ColumnMapping,
  defaultLibro: string,
  libros: string[]
): VoidRecord | null {
  const get = (field: ImportFieldKey): string => {
    const idx = mapping[field]
    return idx != null && idx >= 0 ? String(row[idx] ?? '').trim() : ''
  }

  const voidBlanco = get('void_blanco')
  const voidGris = get('void_gris')
  if (!voidBlanco || !voidGris) return null

  let referencia = get('referencia')
  let numeroSerie = get('numero_serie')
  let nombreEquipo = get('nombre_equipo')
  const qrRaw = get('qr_equipo')

  if ((!referencia || !numeroSerie) && qrRaw) {
    const derived = deriveEquipoFields(qrRaw)
    referencia = referencia || derived.referencia
    numeroSerie = numeroSerie || derived.numero_serie
    nombreEquipo = nombreEquipo || derived.nombre_equipo
  }

  const libroRaw = get('libro')
  const libro = (libroRaw && (guessLibro(libroRaw, libros) || libroRaw)) || defaultLibro
  const createdAt = parseFecha(get('created_at'))

  let documentoReferencia = get('documento_referencia')
  let observaciones = get('observaciones')
  if (!documentoReferencia && observaciones) {
    const { documento, resto } = extractDocumentoFromObservaciones(observaciones)
    if (documento) { documentoReferencia = documento; observaciones = resto }
  }

  return {
    qr_equipo: qrRaw || `${referencia}Ñ${numeroSerie}Ñ${nombreEquipo}`,
    referencia: referencia || undefined,
    numero_serie: numeroSerie || undefined,
    nombre_equipo: nombreEquipo || undefined,
    void_blanco: voidBlanco,
    void_gris: voidGris,
    libro,
    documento_referencia: documentoReferencia || undefined,
    observaciones: observaciones || undefined,
    created_at: createdAt,
  }
}

export interface ResolvedImport {
  resolved: VoidRecord[]
  renamed: number
  omitidos: number
}

// Un VOID Blanco repetido DENTRO del mismo archivo (ej. el mismo sello
// reutilizado por error en un reingreso histórico) no se descarta: se
// conserva la fila agregando un sufijo "(2)", "(3)"... al código, para no
// perder el historial. Un VOID Blanco que ya existe en la base de datos sí
// se omite (evita duplicar todo si el mismo Excel se importa dos veces).
export function resolveBatchDuplicates(records: VoidRecord[], existingVoidBlancos: Set<string>): ResolvedImport {
  const seenInBatch = new Map<string, number>()
  const resolved: VoidRecord[] = []
  let renamed = 0
  let omitidos = 0

  for (const rec of records) {
    const key = rec.void_blanco.trim().toUpperCase()
    if (!key || existingVoidBlancos.has(key)) { omitidos++; continue }

    const timesSeen = seenInBatch.get(key) || 0
    if (timesSeen === 0) {
      seenInBatch.set(key, 1)
      resolved.push(rec)
    } else {
      const suffix = timesSeen + 1
      seenInBatch.set(key, suffix)
      renamed++
      resolved.push({ ...rec, void_blanco: `${rec.void_blanco.trim()} (${suffix})` })
    }
  }

  return { resolved, renamed, omitidos }
}
