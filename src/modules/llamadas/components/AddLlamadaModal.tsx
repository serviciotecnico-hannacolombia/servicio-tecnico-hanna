import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { RESPONSABLES } from '../../../lib/constants'
import type { LlamadaDiario } from '../../../types'

type Payload = Pick<LlamadaDiario, 'otst' | 'cliente' | 'ingeniero' | 'garantia' | 'estado' | 'usuario'>

interface Props {
  open: boolean
  onClose: () => void
  carrera: string | null
  onAdd: (data: Payload) => Promise<void>
}

const INGENIERO_OPTS = RESPONSABLES.map(r => ({ value: r, label: r }))

export function AddLlamadaModal({ open, onClose, carrera, onAdd }: Props) {
  const [otst, setOtst] = useState('')
  const [cliente, setCliente] = useState('')
  const [ingeniero, setIngeniero] = useState('')
  const [garantia, setGarantia] = useState<'SI' | 'NO'>('NO')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setOtst(''); setCliente(''); setIngeniero(''); setGarantia('NO')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otst.trim()) return
    setLoading(true)
    try {
      await onAdd({ otst: otst.trim(), cliente: cliente.trim(), ingeniero, garantia, estado: '', usuario: carrera ?? '' })
      toast.success('Llamada registrada')
      handleClose()
    } catch {
      toast.error('Error al registrar la llamada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nueva Llamada">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="OTST *"
          value={otst}
          onChange={e => setOtst(e.target.value)}
          placeholder="Ej: 12345"
          required
          autoFocus
          style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}
        />
        <Input
          label="Cliente"
          value={cliente}
          onChange={e => setCliente(e.target.value)}
          placeholder="Nombre del cliente"
        />
        <Select
          label="Ingeniero"
          value={ingeniero}
          onChange={e => setIngeniero(e.target.value)}
          options={INGENIERO_OPTS}
          placeholder="— Seleccionar —"
        />

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Garantía
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['NO', 'SI'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setGarantia(v)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${garantia === v && v === 'SI' ? 'var(--green)' : 'var(--border)'}`,
                  background: garantia === v ? (v === 'SI' ? 'var(--green-bg)' : 'var(--surface2)') : 'var(--surface)',
                  color: garantia === v ? (v === 'SI' ? 'var(--green)' : 'var(--text)') : 'var(--muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all .1s',
                  fontFamily: 'var(--sans)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {carrera && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--muted)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
          }}>
            Registrando como: <strong style={{ color: 'var(--accent)' }}>{carrera}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={handleClose} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !otst.trim()} style={{ flex: 2 }}>
            {loading ? 'Guardando…' : 'Registrar llamada'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
