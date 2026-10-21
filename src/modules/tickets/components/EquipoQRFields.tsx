import { useState, type KeyboardEvent } from 'react'
import { Edit3 } from 'lucide-react'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { parseEquipoQR } from '../../void/utils/qrParser'

export interface EquipoValor {
  codigo: string
  serial: string
  nombre: string
}

interface EquipoQRFieldsProps {
  label: string
  value: EquipoValor
  onChange: (value: EquipoValor) => void
  autoFocus?: boolean
}

// Equipo identificado por QR (Enter/Tab lo procesa) o, si no tiene etiqueta,
// digitado a mano. Lo comparten el equipo reportado y el equipo madre.
export function EquipoQRFields({ label, value, onChange, autoFocus }: EquipoQRFieldsProps) {
  const [modoManual, setModoManual] = useState(false)
  const [qr, setQr] = useState('')

  const handleQrKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (!qr.trim()) return
      const parsed = parseEquipoQR(qr)
      onChange({ codigo: parsed.referencia, serial: parsed.serie, nombre: parsed.nombre })
      setQr('')
    }
  }

  const hayEquipo = !!(value.codigo || value.serial || value.nombre)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>{label}</label>
        <Button type="button" variant={modoManual ? 'primary' : 'ghost'} size="sm" onClick={() => setModoManual(m => !m)}>
          <Edit3 size={13} /> {modoManual ? 'Usar lector QR' : 'Ingreso sin QR (manual)'}
        </Button>
      </div>

      {!modoManual ? (
        <>
          <Input
            autoFocus={autoFocus}
            value={qr}
            onChange={e => setQr(e.target.value)}
            onKeyDown={handleQrKeyDown}
            placeholder={hayEquipo ? 'Escanea otro QR para reemplazar' : 'QR AQUÍ'}
            style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)' }}
          />
          {hayEquipo && (
            <div style={{ marginTop: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: '0.8rem' }}>
              <div><strong style={{ color: 'var(--accent)' }}>Código:</strong> {value.codigo || '—'}</div>
              <div><strong style={{ color: 'var(--accent)' }}>Serial:</strong> {value.serial || '—'}</div>
              <div><strong style={{ color: 'var(--accent)' }}>Nombre:</strong> {value.nombre || '—'}</div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Input label="Código" value={value.codigo} onChange={e => onChange({ ...value, codigo: e.target.value })} placeholder="Ej: HI764113" style={{ fontFamily: 'var(--mono)' }} />
          <Input label="Serial" value={value.serial} onChange={e => onChange({ ...value, serial: e.target.value })} placeholder="Ej: 08260042" style={{ fontFamily: 'var(--mono)' }} />
          <Input label="Nombre" value={value.nombre} onChange={e => onChange({ ...value, nombre: e.target.value })} placeholder="Ej: Multiparámetro Portátil" />
        </div>
      )}
    </div>
  )
}
