import { useMemo, useRef, useState } from 'react'
import { Upload, Users } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import type { Profile } from '../../../types'
import { ESTADO_LABEL, ORIGEN_LABEL } from '../types'
import {
  readWorkbook, sheetFromWorkbook, mapColumns, buildTicketFromRow, type ParsedTicketRow,
} from '../utils/parseTicketsExcel'

interface Props {
  open: boolean
  onClose: () => void
  profiles: Profile[]
  onImport: (rows: ParsedTicketRow[], userMap: Record<string, string | null>) => Promise<{ inserted: number }>
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: '0.78rem',
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

export function ImportTicketsModal({ open, onClose, profiles, onImport }: Props) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedTicketRow[]>([])
  const [userMap, setUserMap] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cada nombre distinto de "Creado por" que trae el archivo, con cuántos
  // tickets le corresponden, para poder vincularlo (o no) a un usuario real.
  const nombresDetectados = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (!r.creadoPorRaw) continue
      counts.set(r.creadoPorRaw, (counts.get(r.creadoPorRaw) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const reset = () => {
    setFileName(''); setRows([]); setUserMap({}); setResult(null)
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
      const sheet = sheetFromWorkbook(wb)
      const cols = mapColumns(sheet.headers)
      const parsed = sheet.rows
        .map(r => buildTicketFromRow(r, cols))
        .filter((r): r is ParsedTicketRow => r !== null)
      setRows(parsed)

      // Vinculación automática: si el nombre del Excel coincide con el nombre
      // completo de un usuario ya registrado en la intranet, se preselecciona.
      const autoMap: Record<string, string | null> = {}
      const uniqueNames = new Set(parsed.map(r => r.creadoPorRaw).filter(Boolean))
      uniqueNames.forEach(name => {
        const match = profiles.find(p => p.full_name && normalize(p.full_name) === normalize(name))
        autoMap[name] = match ? match.id : null
      })
      setUserMap(autoMap)
    } catch {
      setRows([])
    }
  }

  const handleUserMapChange = (nombre: string, profileId: string) => {
    setUserMap(prev => ({ ...prev, [nombre]: profileId || null }))
  }

  const handleImport = async () => {
    if (!rows.length) return
    setLoading(true)
    try {
      const res = await onImport(rows, userMap)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar tickets desde Excel/CSV (Notion)" width={720}>
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
            {fileName || 'Seleccionar archivo exportado de Notion (.xlsx, .xls, .csv)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            Columnas esperadas: ID, Nombre, Creado por, Código, Serial, Origen, Respuesta, Fecha de creación
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {fileName && rows.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--red)' }}>
            No se encontraron filas con datos en este archivo.
          </p>
        )}

        {rows.length > 0 && (
          <>
            {nombresDetectados.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Users size={14} style={{ color: 'var(--accent)' }} />
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                    Vincular "Creado por" con usuarios de la intranet
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, background: 'var(--surface2)', maxHeight: 240, overflowY: 'auto' }}>
                  {nombresDetectados.map(([nombre, count]) => (
                    <div key={nombre} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                        {nombre} <span style={{ color: 'var(--muted)' }}>({count})</span>
                      </span>
                      <select
                        style={selectStyle}
                        value={userMap[nombre] || ''}
                        onChange={e => handleUserMapChange(nombre, e.target.value)}
                      >
                        <option value="">Sin vincular (dejar sin usuario)</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, fontSize: '0.78rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text)' }}><strong>{rows.length}</strong> tickets se importarán</span>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface2)' }}>
                  <tr>
                    {['Nombre', 'Creado por', 'Código', 'Origen', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '6px 9px', textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.62rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 15).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 9px' }}>{r.nombre}</td>
                      <td style={{ padding: '5px 9px', color: 'var(--muted)' }}>{r.creadoPorRaw || '—'}</td>
                      <td style={{ padding: '5px 9px', fontFamily: 'var(--mono)' }}>{r.codigo || '—'}</td>
                      <td style={{ padding: '5px 9px', color: 'var(--muted)' }}>{r.origen ? ORIGEN_LABEL[r.origen] : '—'}</td>
                      <td style={{ padding: '5px 9px', color: 'var(--muted)' }}>{r.estado ? ESTADO_LABEL[r.estado] : '—'}</td>
                    </tr>
                  ))}
                  {rows.length > 15 && (
                    <tr><td colSpan={5} style={{ padding: '6px 9px', textAlign: 'center', color: 'var(--muted)' }}>…y {rows.length - 15} más</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text)' }}>
            Importación completada: <strong>{result.inserted}</strong> tickets registrados.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="button" variant="ghost" onClick={handleClose} style={{ flex: 1 }}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!rows.length || loading} style={{ flex: 2 }}>
              {loading ? 'Importando…' : `Importar ${rows.length} ticket${rows.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
