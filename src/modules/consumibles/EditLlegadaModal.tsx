import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import type { ConsumibleLlegada } from '../../types'

interface EditLlegadaModalProps {
  llegada: ConsumibleLlegada | null
  ubicaciones: string[]
  onClose: () => void
  onSave: (llegada: ConsumibleLlegada) => void
}

export function EditLlegadaModal({ llegada, ubicaciones, onClose, onSave }: EditLlegadaModalProps) {
  const [prevId, setPrevId] = useState<string | undefined>(undefined)
  const [form, setForm] = useState<ConsumibleLlegada | null>(llegada)

  if (llegada && llegada.id !== prevId) {
    setPrevId(llegada.id)
    setForm(llegada)
  }

  if (!form) return null

  const set = <K extends keyof ConsumibleLlegada>(key: K, value: ConsumibleLlegada[K]) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.ubicacion) { toast.error('Selecciona una ubicación'); return }
    onSave(form)
  }

  return (
    <Modal open={!!llegada} onClose={onClose} title={`Editar llegada · ${form.nombre || form.ref || form.qr}`} width={560}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input type="date" label="Fecha de llegada" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          <Input label="QR / Código" value={form.qr ?? ''} onChange={e => set('qr', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Nombre" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          <Input label="Referencia" value={form.ref ?? ''} onChange={e => set('ref', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Input label="Lote" value={form.lote ?? ''} onChange={e => set('lote', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
          <Input label="F. Vencimiento" value={form.venc ?? ''} onChange={e => set('venc', e.target.value)} />
          <Input label="Volumen" value={form.vol ?? ''} onChange={e => set('vol', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Responsable" value={form.responsable ?? ''} onChange={e => set('responsable', e.target.value)} />
          <Select
            label="Ubicación"
            placeholder="Seleccionar..."
            value={form.ubicacion ?? ''}
            onChange={e => set('ubicacion', e.target.value)}
            options={ubicaciones.map(u => ({ value: u, label: u }))}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Observaciones</label>
          <textarea
            rows={2}
            value={form.obs ?? ''}
            onChange={e => set('obs', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.875rem', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit"><Save size={15} /> Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
