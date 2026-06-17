import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'

interface CsvRow {
  otst: string
  cliente: string
  ingeniero: string
  garantia: 'SI' | 'NO'
}

interface Props {
  open: boolean
  onClose: () => void
  existing: number
  onImport: (rows: CsvRow[], replace: boolean) => Promise<void>
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  // Skip header row
  return lines.slice(1).map(line => {
    // Handle quoted fields (e.g. "EMPRESA, SAS")
    const cols: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    const g = (cols[3] ?? '').toLowerCase().trim()
    return {
      otst:      (cols[0] ?? '').trim(),
      cliente:   (cols[1] ?? '').trim(),
      ingeniero: (cols[2] ?? '').trim(),
      garantia:  (g === 'si' || g === 'sí' || g === 'yes') ? 'SI' : 'NO',
    }
  }).filter(r => r.otst)
}

export function ImportCSVModal({ open, onClose, existing, onImport }: Props) {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [replace, setReplace] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setRows(parseCSV(ev.target?.result as string))
    reader.readAsText(file, 'UTF-8')
  }

  const handleClose = () => {
    setRows([]); setFileName(''); setReplace(true)
    if (inputRef.current) inputRef.current.value = ''
    onClose()
  }

  const handleImport = async () => {
    if (!rows.length) return
    setLoading(true)
    try { await onImport(rows, replace); handleClose() }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cargar CSV del día" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${fileName ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: fileName ? 'var(--accent-bg)' : 'var(--surface2)',
            transition: 'all .15s',
          }}
        >
          <Upload size={24} style={{ color: fileName ? 'var(--accent)' : 'var(--muted)', marginBottom: 8 }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: fileName ? 'var(--accent)' : 'var(--text)' }}>
            {fileName || 'Seleccionar archivo CSV'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            {rows.length > 0 ? `${rows.length} registros detectados` : 'OTST, Cliente, Técnico Asignado, ¿En garantía?'}
          </div>
          <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface2)' }}>
                <tr>
                  {['OTST', 'Cliente', 'Ingeniero', 'Garantía'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{r.otst}</td>
                    <td style={{ padding: '6px 10px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.ingeniero}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ color: r.garantia === 'SI' ? 'var(--green)' : 'var(--muted)', fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{r.garantia}</span>
                    </td>
                  </tr>
                ))}
                {rows.length > 20 && (
                  <tr><td colSpan={4} style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem' }}>…y {rows.length - 20} más</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Replace option */}
        {existing > 0 && rows.length > 0 && (
          <div style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--yellow)', marginBottom: 8, fontWeight: 600 }}>
              Ya hay {existing} llamada{existing !== 1 ? 's' : ''} cargadas hoy
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ val: true, label: 'Reemplazar todo' }, { val: false, label: 'Solo agregar nuevas' }].map(opt => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => setReplace(opt.val)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--sans)',
                    border: `1px solid ${replace === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                    background: replace === opt.val ? 'var(--accent-bg)' : 'var(--surface)',
                    color: replace === opt.val ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="button" variant="ghost" onClick={handleClose} style={{ flex: 1 }}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!rows.length || loading} style={{ flex: 2 }}>
            {loading ? 'Importando…' : `Cargar ${rows.length} registros`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
