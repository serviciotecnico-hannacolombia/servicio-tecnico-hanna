import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { VoidRecord } from '../types'
import { Save } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'

export function EditVoidModal({ record, onClose, onSave }: { record: VoidRecord | null; onClose: () => void; onSave: (record: VoidRecord) => void }) {
  const [prevRecordId, setPrevRecordId] = useState<string | undefined>(undefined)
  const [form, setForm] = useState<VoidRecord | null>(record)
  const [activeTab, setActiveTab] = useState<'info' | 'advanced'>('info')

  if (record && record.id !== prevRecordId) {
    setPrevRecordId(record.id)
    setForm(record)
    setActiveTab('info')
  }

  if (!form) return null

  const set = (key: keyof VoidRecord, value: string) => setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.documento_referencia?.trim() || !form.void_blanco?.trim() || !form.void_gris?.trim()) {
      toast.error('Factura/Remisión/OTST y los dos VOID son obligatorios')
      return
    }
    onSave(form)
  }

  return (
    <Modal open={!!record} onClose={onClose} title={`Editar Registro VOID · ${form.registro_id || form.id}`} width={560}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)' }}>
          {(['info', 'advanced'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '8px 2px', fontFamily: 'var(--sans)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              {tab === 'info' ? 'Datos base y sellos' : 'Observaciones y referencia'}
            </button>
          ))}
        </div>

        {activeTab === 'info' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Referencia" value={String(form.referencia ?? '')} onChange={e => set('referencia', e.target.value)} />
            </div>
            <Input label="Número de Serie" value={String(form.numero_serie ?? '')} onChange={e => set('numero_serie', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="Nombre del Equipo" value={String(form.nombre_equipo ?? '')} onChange={e => set('nombre_equipo', e.target.value)} />
            <Input label="VOID Blanco" value={String(form.void_blanco ?? '')} onChange={e => set('void_blanco', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="VOID Gris" value={String(form.void_gris ?? '')} onChange={e => set('void_gris', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Factura / Remisión / OTST" value={String(form.documento_referencia ?? '')} onChange={e => set('documento_referencia', e.target.value)} />
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Observaciones</label>
              <textarea
                rows={3}
                value={String(form.observaciones ?? '')}
                onChange={e => set('observaciones', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.875rem', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit"><Save size={15} /> Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
