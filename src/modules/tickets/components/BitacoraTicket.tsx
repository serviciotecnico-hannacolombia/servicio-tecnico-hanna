// Bitácora del ticket: avances escritos a mano + cambios de estado/OTST que
// registra el trigger de la BD. Agrupada por día, cada entrada con autor y
// hora (mismo patrón visual que HistorialSidebarGAR).
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquarePlus, ArrowRightLeft, Link2, Hash, Tag } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { Avatar } from '../../../components/ui/Avatar'
import { useProfiles } from '../../../hooks/useProfiles'
import { useUser } from '../../../hooks/useUser'
import { INP, PRI, fmtFecha, fechaLocalISO } from '../../calibraciones/ui'
import { useTicketAvances, agregarAvance } from '../hooks/useTickets'
import { ESTADO_LABEL, ORIGEN_LABEL, type TicketAvance, type TicketAvanceTipo, type TicketEstado, type TicketOrigen } from '../types'
import { numeroTid } from '../utils/formato'

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

type TipoCambio = Exclude<TicketAvanceTipo, 'avance'>

// Cómo se describe cada cambio que registra el trigger.
const CAMBIO: Record<TipoCambio, { titulo: string, Icono: typeof Link2, formato: (v: string) => string }> = {
  estado: { titulo: 'Cambió el estado', Icono: ArrowRightLeft, formato: v => ESTADO_LABEL[v as TicketEstado] ?? v },
  otst:   { titulo: 'Cambió la OTST', Icono: Link2, formato: v => v },
  nombre: { titulo: 'Cambió el No. de ticket', Icono: Hash, formato: numeroTid },
  origen: { titulo: 'Cambió el origen', Icono: Tag, formato: v => ORIGEN_LABEL[v as TicketOrigen] ?? v },
}
const CAMBIO_VACIO: Record<TipoCambio, string> = {
  estado: 'Sin estado', otst: 'sin OTST', nombre: '—', origen: 'Sin origen',
}

function ContenidoAvance({ a }: { a: TicketAvance }) {
  if (a.tipo === 'avance') {
    return <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>{a.texto}</div>
  }
  const { titulo, Icono, formato } = CAMBIO[a.tipo]
  const antes = a.valor_anterior ? formato(a.valor_anterior) : null
  const despues = a.valor_nuevo ? formato(a.valor_nuevo) : CAMBIO_VACIO[a.tipo]
  return (
    <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <Icono size={12} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        {titulo}
        {': '}
        {antes && <span style={{ textDecoration: 'line-through' }}>{antes}</span>}
        {antes && ' → '}
        <strong style={{ color: 'var(--text)' }}>{despues}</strong>
      </span>
    </div>
  )
}

export function BitacoraTicket({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient()
  const { user } = useUser()
  const { data: avances = [], isLoading } = useTicketAvances(ticketId)
  const { data: profiles = [] } = useProfiles()
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const profilePorId = new Map(profiles.map(p => [p.id, p]))

  const porDia = useMemo(() => {
    const m = new Map<string, TicketAvance[]>()
    for (const a of avances) {
      const dia = fechaLocalISO(a.created_at)
      if (!m.has(dia)) m.set(dia, [])
      m.get(dia)!.push(a)
    }
    return [...m.entries()]
  }, [avances])

  async function guardar() {
    if (!texto.trim() || !user) return
    setGuardando(true)
    try {
      await agregarAvance(ticketId, texto, user.id)
      setTexto('')
      qc.invalidateQueries({ queryKey: ['tickets_fabrica_avances', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets_fabrica'] })
    } catch (e) {
      toast.error('No se pudo guardar el avance: ' + (e as { message?: string }).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card bodyStyle={{ padding: '16px 18px' }} style={{ position: 'sticky', top: 20 }}>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageSquarePlus size={13} /> Bitácora de avances
      </h4>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) guardar() }}
        rows={3}
        placeholder="Ej: Fábrica solicitó fotos del electrodo y lectura en pH 7…"
        style={{ ...INP, resize: 'vertical' }}
      />
      <button
        onClick={guardar}
        disabled={guardando || !texto.trim()}
        style={{ ...PRI, marginTop: 8, width: '100%', justifyContent: 'center', opacity: guardando || !texto.trim() ? 0.6 : 1 }}
      >
        {guardando ? 'Guardando…' : '+ Agregar avance'}
      </button>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>Ctrl + Enter para guardar</div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0' }} />

      {isLoading ? (
        <Spinner size={20} />
      ) : avances.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Aún no hay avances registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          {porDia.map(([dia, items]) => (
            <div key={dia}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                {fmtFecha(dia)}
              </div>
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(a => {
                  const p = a.usuario_id ? profilePorId.get(a.usuario_id) : undefined
                  const nombre = p?.full_name || p?.email || 'Sistema'
                  return (
                    <div key={a.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Avatar name={nombre} emoji={p?.avatar_emoji} color={p?.avatar_color} size={18} />
                        <strong style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</strong>
                        <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{horaLocal(a.created_at)}</span>
                      </div>
                      <ContenidoAvance a={a} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
