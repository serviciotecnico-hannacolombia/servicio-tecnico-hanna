import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import type { ConsumibleDestape } from '../../types'

interface EditDestapeModalProps {
  destape: ConsumibleDestape | null
  ubicaciones: string[]
  onClose: () => void
  onSave: (destape: ConsumibleDestape) => void
}

export function EditDestapeModal({ destape, ubicaciones, onClose, onSave }: EditDestapeModalProps) {
  const [prevId, setPrevId] = useState<string | undefined>(undefined)
  const [form, setForm] = useState<ConsumibleDestape | null>(destape)

  if (destape && destape.id !== prevId) {
    setPrevId(destape.id)
    setForm(destape)
  }

  if (!form) return null

  const set = <K extends keyof ConsumibleDestape>(key: K, value: ConsumibleDestape[K]) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.fecha)     { toast.error('Selecciona la fecha de destape'); return }
    if (!form.ubicacion) { toast.error('Selecciona una ubicación'); return }
    onSave(form)
  }

  return (
    <Modal open={!!destape} onClose={onClose} title={`Editar destape · ${form.nombre || form.ref || form.qr}`} width={520}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input type="date" label="Fecha de destape" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          <Input label="Responsable" value={form.responsable ?? ''} onChange={e => set('responsable', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Nombre" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          <Input label="Referencia" value={form.ref ?? ''} onChange={e => set('ref', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Lote" value={form.lote ?? ''} onChange={e => set('lote', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
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
