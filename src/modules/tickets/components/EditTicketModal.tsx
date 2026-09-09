import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Save, Link2 } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import {
  ORIGEN_LABEL, ESTADO_LABEL, ESTADO_NOTA_PLACEHOLDER,
  type TicketFabrica, type TicketOrigen, type TicketEstado,
} from '../types'

interface EditTicketModalProps {
  ticket: TicketFabrica | null
  onClose: () => void
  onSave: (ticket: TicketFabrica) => void
}

const TICKET_ID_PREFIJO = 'Ticket ID: '

export function EditTicketModal({ ticket, onClose, onSave }: EditTicketModalProps) {
  const [prevId, setPrevId] = useState<string | undefined>(undefined)
  const [form, setForm] = useState<TicketFabrica | null>(ticket)

  if (ticket && ticket.id !== prevId) {
    setPrevId(ticket.id)
    setForm(ticket)
  }

  if (!form) return null

  const set = <K extends keyof TicketFabrica>(key: K, value: TicketFabrica[K]) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const numeroTicket = form.nombre.startsWith(TICKET_ID_PREFIJO) ? form.nombre.slice(TICKET_ID_PREFIJO.length) : form.nombre

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre/número de ticket es obligatorio'); return }
    if (form.es_equipo_hijo && !form.equipo_madre_codigo?.trim() && !form.equipo_madre_serial?.trim()) {
      toast.error('Ingresa al menos el código o el serial del equipo madre'); return
    }
    onSave(form)
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title={`Editar Ticket · ${form.nombre}`} width={620}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
            No. de Ticket (plataforma de fábrica)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{TICKET_ID_PREFIJO}</span>
            <Input
              required
              value={numeroTicket}
              onChange={e => set('nombre', `${TICKET_ID_PREFIJO}${e.target.value}`)}
              style={{ fontFamily: 'var(--mono)', flex: 1 }}
              wrapStyle={{ flex: 1 }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Equipo reportado</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <Input label="Código" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="Serial" value={form.serial ?? ''} onChange={e => set('serial', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="Nombre del Equipo" value={form.equipo_nombre ?? ''} onChange={e => set('equipo_nombre', e.target.value)} />
          </div>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none',
          background: form.es_equipo_hijo ? 'var(--accent-bg)' : 'var(--surface2)',
          border: `1px solid ${form.es_equipo_hijo ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600,
          color: form.es_equipo_hijo ? 'var(--accent)' : 'var(--text)', transition: 'all .15s',
        }}>
          <input type="checkbox" checked={!!form.es_equipo_hijo} onChange={e => set('es_equipo_hijo', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <Link2 size={15} />
          Es una sonda/electrodo (equipo hijo) de otro equipo — reportar equipo madre para trazabilidad
        </label>

        {form.es_equipo_hijo && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <Input label="Código Equipo Madre" value={form.equipo_madre_codigo ?? ''} onChange={e => set('equipo_madre_codigo', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="Serial Equipo Madre" value={form.equipo_madre_serial ?? ''} onChange={e => set('equipo_madre_serial', e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
            <Input label="Nombre Equipo Madre" value={form.equipo_madre_nombre ?? ''} onChange={e => set('equipo_madre_nombre', e.target.value)} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select
            label="Origen"
            placeholder="Selecciona un origen"
            value={form.origen ?? ''}
            onChange={e => set('origen', (e.target.value || null) as TicketOrigen | null)}
            options={(Object.keys(ORIGEN_LABEL) as TicketOrigen[]).map(o => ({ value: o, label: ORIGEN_LABEL[o] }))}
          />
          <Select
            label="Estado"
            placeholder="Selecciona un estado"
            value={form.estado ?? ''}
            onChange={e => set('estado', (e.target.value || null) as TicketEstado | null)}
            options={(Object.keys(ESTADO_LABEL) as TicketEstado[]).map(r => ({ value: r, label: ESTADO_LABEL[r] }))}
          />
        </div>

        {form.estado && (
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Detalle del estado
            </label>
            <textarea
              rows={3}
              value={form.nota_estado ?? ''}
              onChange={e => set('nota_estado', e.target.value)}
              placeholder={ESTADO_NOTA_PLACEHOLDER[form.estado]}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.875rem', resize: 'vertical' }}
            />
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
