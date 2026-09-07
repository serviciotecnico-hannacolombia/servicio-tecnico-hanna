import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import type { VoidRecord } from '../types'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'

interface Props {
  record: VoidRecord | null
  libros: string[]
  onClose: () => void
  onMove: (record: VoidRecord, nuevoLibro: string) => Promise<void>
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: '0.85rem',
}

export function MoveLibroModal({ record, libros, onClose, onMove }: Props) {
  const [destino, setDestino] = useState('')
  const [loading, setLoading] = useState(false)

  if (record && destino === '') {
    const primeraOpcion = libros.find(l => l !== record.libro) || libros[0]
    setDestino(primeraOpcion)
  }

  const handleClose = () => { setDestino(''); onClose() }

  const handleConfirm = async () => {
    if (!record || !destino || destino === record.libro) return
    setLoading(true)
    try {
      await onMove(record, destino)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={!!record} onClose={handleClose} title="Mover registro de libro" width={420}>
      {record && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
            <strong>{record.nombre_equipo || record.referencia || 'Equipo'}</strong>
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginTop: 2 }}>
              VOID Blanco: <span style={{ fontFamily: 'var(--mono)' }}>{record.void_blanco}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Libro actual</label>
              <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                {record.libro || '—'}
              </div>
            </div>
            <ArrowRightLeft size={16} style={{ color: 'var(--muted)', marginTop: 16 }} />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nuevo libro</label>
              <select style={selectStyle} value={destino} onChange={e => setDestino(e.target.value)}>
                {libros.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
            <Button type="button" onClick={handleConfirm} disabled={loading || !destino || destino === record.libro}>
              {loading ? 'Moviendo…' : 'Mover registro'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
