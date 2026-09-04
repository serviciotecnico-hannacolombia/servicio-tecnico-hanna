import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'

interface Props {
  otst: string | null
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
}

export function DespacharModal({ otst, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setMotivo('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) return
    setLoading(true)
    try {
      await onConfirm(motivo.trim())
      toast.success(`OTST ${otst} agregada a pendientes de despacho`)
      handleClose()
    } catch {
      toast.error('Error al agregar a pendientes de despacho')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={!!otst} onClose={handleClose} title={`Despachar OTST ${otst ?? ''}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
          Esto agrega la OTST a la lista de <strong>Pendientes de despacho</strong> del módulo Bodega.
        </p>

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Motivo *
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Cliente pidió despacho inmediato por correo…"
            rows={3}
            autoFocus
            required
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 12px',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface2)', color: 'var(--text)',
              fontSize: '0.875rem', fontFamily: 'var(--sans)', resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={handleClose} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !motivo.trim()} style={{ flex: 2 }}>
            {loading ? 'Guardando…' : 'Confirmar despacho'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
