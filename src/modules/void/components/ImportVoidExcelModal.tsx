import { useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import type { VoidRecord } from '../types'
import {
  readWorkbook, sheetsFromWorkbook, autoMapHeaders, buildRecordFromRow, guessLibro, resolveBatchDuplicates,
  IMPORT_FIELDS, type ColumnMapping, type ExcelSheet, type ImportFieldKey,
} from '../utils/parseVoidExcel'

interface Props {
  open: boolean
  onClose: () => void
  libros: string[]
  libroActivo: string
  existingVoidBlancos: Set<string>
  onImport: (records: VoidRecord[]) => Promise<{ inserted: number; omitidos: number }>
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: '0.78rem',
}

export function ImportVoidExcelModal({ open, onClose, libros, libroActivo, existingVoidBlancos, onImport }: Props) {
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<ExcelSheet[]>([])
  const [sheetIdx, setSheetIdx] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [defaultLibro, setDefaultLibro] = useState(libroActivo)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; omitidos: number } | null>(null)
  const [excludedLibros, setExcludedLibros] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const sheet = sheets[sheetIdx]

  const allRecords = useMemo(() => {
    if (!sheet || !mapping) return []
    return sheet.rows
      .map(row => buildRecordFromRow(row, mapping, defaultLibro, libros))
      .filter((r): r is VoidRecord => r !== null)
  }, [sheet, mapping, defaultLibro, libros])

  const librosDetectados = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of allRecords) counts.set(r.libro || '', (counts.get(r.libro || '') || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [allRecords])

  const records = useMemo(
    () => allRecords.filter(r => !excludedLibros.has(r.libro || '')),
    [allRecords, excludedLibros]
  )

  const { resolved, renamed, omitidos } = useMemo(
    () => resolveBatchDuplicates(records, existingVoidBlancos),
    [records, existingVoidBlancos]
  )

  const toggleLibro = (libro: string) => {
    setExcludedLibros(prev => {
      const next = new Set(prev)
      if (next.has(libro)) next.delete(libro)
      else next.add(libro)
      return next
    })
  }

  const reset = () => {
    setFileName(''); setSheets([]); setSheetIdx(0); setMapping(null)
    setDefaultLibro(libroActivo); setResult(null); setExcludedLibros(new Set())
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    try {
      const wb = await readWorkbook(file)
      const parsed = sheetsFromWorkbook(wb)
      if (!parsed.length) { setSheets([]); return }
      // Preferir una hoja "BaseDatos" si existe (trae la columna Libro).
      const preferred = parsed.findIndex(s => /base ?de ?datos/i.test(s.name))
      const idx = preferred >= 0 ? preferred : 0
      setSheets(parsed)
      setSheetIdx(idx)
      setMapping(autoMapHeaders(parsed[idx].headers))
      setDefaultLibro(guessLibro(parsed[idx].name, libros) || guessLibro(parsed[idx].title, libros) || libroActivo)
      setExcludedLibros(new Set())
    } catch {
      setSheets([])
    }
  }

  const handleSheetChange = (idx: number) => {
    setSheetIdx(idx)
    setMapping(autoMapHeaders(sheets[idx].headers))
    setDefaultLibro(guessLibro(sheets[idx].name, libros) || guessLibro(sheets[idx].title, libros) || libroActivo)
    setExcludedLibros(new Set())
  }

  const handleMapField = (field: ImportFieldKey, value: string) => {
    setMapping(prev => prev ? { ...prev, [field]: value === '' ? null : Number(value) } : prev)
  }

  const handleImport = async () => {
    if (!resolved.length) return
    setLoading(true)
    try {
      const res = await onImport(resolved)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar Excel del sistema VOID" width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${fileName ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
            background: fileName ? 'var(--accent-bg)' : 'var(--surface2)', transition: 'all .15s',
          }}
        >
          <Upload size={22} style={{ color: fileName ? 'var(--accent)' : 'var(--muted)', marginBottom: 6 }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: fileName ? 'var(--accent)' : 'var(--text)' }}>
            {fileName || 'Seleccionar archivo Excel (.xlsx, .xls)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            Funciona con el libro exportado por la macro (hoja "BaseDatos") o cualquier Excel con columnas similares
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {fileName && sheets.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--red)' }}>
            No se encontraron hojas con datos en este archivo.
          </p>
        )}

        {sheets.length > 0 && mapping && (
          <>
            {sheets.length > 1 && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Hoja a importar</label>
                <select style={selectStyle} value={sheetIdx} onChange={e => handleSheetChange(Number(e.target.value))}>
                  {sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length} filas)</option>)}
                </select>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileSpreadsheet size={14} style={{ color: 'var(--accent)' }} />
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Mapeo de columnas</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, background: 'var(--surface2)' }}>
                {IMPORT_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                      {f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}
                    </label>
                    <select style={selectStyle} value={mapping[f.key] ?? ''} onChange={e => handleMapField(f.key, e.target.value)}>
                      <option value="">No usar</option>
                      {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {!mapping.libro && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Libro / Sede para todas las filas (el archivo no trae esa columna{sheet.title ? ` — detectado por el título "${sheet.title}"` : ''})
                </label>
                <select style={selectStyle} value={defaultLibro} onChange={e => setDefaultLibro(e.target.value)}>
                  {libros.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}

            {librosDetectados.length > 1 && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Libros detectados en el archivo (desmarca los que no quieras importar)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, background: 'var(--surface2)' }}>
                  {librosDetectados.map(([libro, count]) => (
                    <label key={libro} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: excludedLibros.has(libro) ? 'var(--muted)' : 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!excludedLibros.has(libro)} onChange={() => toggleLibro(libro)} />
                      {libro || '(sin libro)'} <span style={{ color: 'var(--muted)' }}>({count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, fontSize: '0.78rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text)' }}><strong>{sheet.rows.length}</strong> filas leídas</span>
              <span style={{ color: 'var(--green)' }}><strong>{resolved.length}</strong> se importarán</span>
              {renamed > 0 && (
                <span style={{ color: 'var(--yellow)' }}><strong>{renamed}</strong> con sufijo "(2)"/"(3)" por VOID Blanco repetido en el archivo</span>
              )}
              <span style={{ color: 'var(--muted)' }}><strong>{omitidos}</strong> se omitirán (ya existen en el sistema o sin VOID Blanco)</span>
            </div>

            {resolved.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--surface2)' }}>
                    <tr>
                      {['Equipo', 'Serie', 'VOID Blanco', 'VOID Gris', 'Libro'].map(h => (
                        <th key={h} style={{ padding: '6px 9px', textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.62rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.slice(0, 15).map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 9px' }}>{r.nombre_equipo || r.referencia || '—'}</td>
                        <td style={{ padding: '5px 9px', color: 'var(--muted)' }}>{r.numero_serie || '—'}</td>
                        <td style={{ padding: '5px 9px', fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.void_blanco}</td>
                        <td style={{ padding: '5px 9px', fontFamily: 'var(--mono)' }}>{r.void_gris}</td>
                        <td style={{ padding: '5px 9px', color: 'var(--muted)' }}>{r.libro}</td>
                      </tr>
                    ))}
                    {resolved.length > 15 && (
                      <tr><td colSpan={5} style={{ padding: '6px 9px', textAlign: 'center', color: 'var(--muted)' }}>…y {resolved.length - 15} más</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {result && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text)' }}>
            Importación completada: <strong>{result.inserted}</strong> registrados, <strong>{result.omitidos}</strong> omitidos por VOID Blanco duplicado.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="button" variant="ghost" onClick={handleClose} style={{ flex: 1 }}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!resolved.length || loading} style={{ flex: 2 }}>
              {loading ? 'Importando…' : `Importar ${resolved.length} registro${resolved.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
