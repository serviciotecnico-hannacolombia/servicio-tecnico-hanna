// Recordatorios por correo dentro de la card de la garantía: los
// responsables (y Admin) programan fecha/hora futura + nota; a esa hora
// (revisión cada 5 min con pg_cron) se envía un correo a los responsables
// con el detalle. Los pendientes se pueden cancelar; nada se borra.
import { useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellPlus, X } from 'lucide-react'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import {
  useRecordatoriosGarantia, useInvalidateGarantias, crearRecordatorioGarantia, cancelarRecordatorioGarantia,
  ahoraColombiaLocal, fechaHoraColombiaISO, fmtFechaHora,
} from './hooks/useGarantias'
import { FG, INP, PRI, GHOST } from './ui'
import type { Garantia, GarantiaRecordatorio } from '../../types'

const BADGE: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }

function estadoRecordatorio(r: GarantiaRecordatorio): { label: string, style: React.CSSProperties } {
  if (r.cancelado_at) return { label: 'Cancelado', style: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' } }
  if (r.enviado_at) return { label: 'Enviado', style: { background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)' } }
  if (r.error) return { label: 'Con error', style: { background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)' } }
  return { label: 'Pendiente', style: { background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)' } }
}

export function RecordatoriosGarantia({ garantia }: { garantia: Garantia }) {
  const { user, isAdmin } = useUser()
  const { data: recordatorios = [] } = useRecordatoriosGarantia(garantia.id)
  const { data: profiles = [] } = useProfiles()
  const { invalidateDetalle } = useInvalidateGarantias()
  const nombrePorId = new Map(profiles.map(p => [p.id, p.full_name || p.email]))

  const esResponsable = !!user && garantia.responsables.includes(user.id)
  const puedeProgramar = (isAdmin || esResponsable) && !garantia.anulada

  const [abierto, setAbierto] = useState(false)
  const [fechaHora, setFechaHora] = useState('')
  const [nota, setNota] = useState('')
  const [minimo, setMinimo] = useState(ahoraColombiaLocal)
  const [guardando, setGuardando] = useState(false)

  if (!puedeProgramar && recordatorios.length === 0) return null

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!fechaHora) { toast.error('Selecciona la fecha y hora del recordatorio'); return }
    if (new Date(fechaHoraColombiaISO(fechaHora)).getTime() <= Date.now()) {
      toast.error('La fecha y hora deben ser posteriores a la hora actual')
      setMinimo(ahoraColombiaLocal())
      return
    }
    setGuardando(true)
    const { error } = await crearRecordatorioGarantia(garantia.id, fechaHora, nota, user.id)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Recordatorio programado')
    setFechaHora('')
    setNota('')
    setAbierto(false)
    invalidateDetalle(garantia.id)
  }

  async function cancelar(r: GarantiaRecordatorio) {
    if (!confirm(`¿Cancelar el recordatorio del ${fmtFechaHora(r.fecha_hora)}?`)) return
    const { error } = await cancelarRecordatorioGarantia(r.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Recordatorio cancelado')
    invalidateDetalle(garantia.id)
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={13} /> Recordatorios ({recordatorios.filter(r => !r.enviado_at && !r.cancelado_at).length} pendientes)
        </div>
        {puedeProgramar && !abierto && (
          <button onClick={() => { setMinimo(ahoraColombiaLocal()); setAbierto(true) }} style={{ ...GHOST, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}>
            <BellPlus size={13} /> Programar recordatorio
          </button>
        )}
      </div>

      {abierto && (
        <form onSubmit={guardar} style={{ marginTop: 12, padding: 14, borderRadius: 'var(--radius)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 240px' }}>
              <FG label="Fecha y hora" required>
                <input
                  type="datetime-local" value={fechaHora} min={minimo} autoFocus
                  onFocus={() => setMinimo(ahoraColombiaLocal())}
                  onChange={e => setFechaHora(e.target.value)} style={INP}
                />
              </FG>
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <FG label="Nota del recordatorio">
                <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Ej. Confirmar con bodega la llegada del equipo…" style={{ ...INP, resize: 'vertical' }} />
              </FG>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
            Hora de Colombia. Se enviará un correo a los responsables con el detalle de la garantía (puede tardar hasta 5 minutos después de la hora indicada).
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={() => setAbierto(false)} style={GHOST}>Cancelar</button>
            <button type="submit" disabled={guardando || !fechaHora} style={{ ...PRI, opacity: fechaHora ? 1 : .5 }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {recordatorios.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {recordatorios.map(r => {
            const estado = estadoRecordatorio(r)
            const pendiente = !r.enviado_at && !r.cancelado_at
            return (
              <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 12.5, fontFamily: 'var(--mono)' }}>{fmtFechaHora(r.fecha_hora)}</strong>
                    <span style={{ ...BADGE, ...estado.style }}>{estado.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>por {nombrePorId.get(r.creado_por || '') || 'Usuario'}</span>
                  </div>
                  {r.nota && <div style={{ fontSize: 12.5, marginTop: 3, whiteSpace: 'pre-wrap' }}>{r.nota}</div>}
                  {r.error && !r.enviado_at && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{r.error}</div>}
                </div>
                {pendiente && puedeProgramar && (
                  <button onClick={() => cancelar(r)} title="Cancelar recordatorio" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
