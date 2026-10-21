import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Link2, ExternalLink, Pencil } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import { useProfiles } from '../../../hooks/useProfiles'
import { FG, Seccion, INP, PRI, GHOST } from '../../calibraciones/ui'
import { linkOtst, parseOtstCodes } from '../../calibraciones/vistas/CamposCompartidos'
import { EquipoQRFields, type EquipoValor } from '../components/EquipoQRFields'
import { BitacoraTicket } from '../components/BitacoraTicket'
import { useTickets, agregarAvance } from '../hooks/useTickets'
import { TICKET_ID_PREFIJO, numeroTid, fmtFechaLarga } from '../utils/formato'
import {
  ORIGEN_LABEL, ORIGEN_COLOR, ESTADO_LABEL, ESTADO_COLOR, ESTADO_NOTA_PLACEHOLDER,
  type TicketFabrica, type TicketOrigen, type TicketEstado,
} from '../types'

interface FormTicket {
  numero: string
  origen: TicketOrigen | ''
  estado: TicketEstado | ''
  otst: string
  equipo: EquipoValor
  esEquipoHijo: boolean
  madre: EquipoValor
  notaInicial: string
}

const EQUIPO_VACIO: EquipoValor = { codigo: '', serial: '', nombre: '' }
const FORM_VACIO: FormTicket = {
  numero: '', origen: '', estado: '', otst: '', equipo: EQUIPO_VACIO,
  esEquipoHijo: false, madre: EQUIPO_VACIO, notaInicial: '',
}

function formDesdeTicket(t: TicketFabrica): FormTicket {
  return {
    numero: numeroTid(t.nombre),
    origen: t.origen ?? '',
    estado: t.estado ?? '',
    otst: t.otst ?? '',
    equipo: { codigo: t.codigo ?? '', serial: t.serial ?? '', nombre: t.equipo_nombre ?? '' },
    esEquipoHijo: !!t.es_equipo_hijo,
    madre: { codigo: t.equipo_madre_codigo ?? '', serial: t.equipo_madre_serial ?? '', nombre: t.equipo_madre_nombre ?? '' },
    notaInicial: '',
  }
}

const badge = (c: { bg: string; text: string; border: string }): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  background: c.bg, color: c.text, border: `1px solid ${c.border}`,
})

function Dato({ label, children, mono }: { label: string, children: React.ReactNode, mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : undefined, wordBreak: 'break-word' }}>{children || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
    </div>
  )
}

// Vista de solo lectura del ticket (lo que se edita con el botón "Editar").
function FichaTicket({ ticket }: { ticket: TicketFabrica }) {
  const codigosOtst = parseOtstCodes(ticket.otst)
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }
  return (
    <Card>
      <Seccion titulo="OTST relacionada">
        {codigosOtst.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Sin OTST relacionada. Usa “Editar” para asociar una.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {codigosOtst.map(codigo => (
              <a
                key={codigo}
                href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer"
                style={{ ...GHOST, padding: '7px 13px', fontSize: 12.5, textDecoration: 'none', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Ir a la OTST {codigo} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        )}
      </Seccion>
      <Seccion titulo="Equipo reportado">
        <div style={grid}>
          <Dato label="Código" mono>{ticket.codigo}</Dato>
          <Dato label="Serial" mono>{ticket.serial}</Dato>
          <Dato label="Nombre">{ticket.equipo_nombre}</Dato>
        </div>
      </Seccion>
      <div>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link2 size={13} /> Equipo madre
        </h4>
        {ticket.es_equipo_hijo ? (
          <div style={grid}>
            <Dato label="Código" mono>{ticket.equipo_madre_codigo}</Dato>
            <Dato label="Serial" mono>{ticket.equipo_madre_serial}</Dato>
            <Dato label="Nombre">{ticket.equipo_madre_nombre}</Dato>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No es un equipo hijo (sonda/electrodo).</p>
        )}
      </div>
    </Card>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useUser()
  const { data: profiles = [] } = useProfiles()
  const esNuevo = id === 'nuevo'

  const { data: tickets = [], isLoading } = useTickets()
  const ticket = esNuevo ? undefined : tickets.find(t => t.id === id)

  const [form, setForm] = useState<FormTicket>(FORM_VACIO)
  const [saving, setSaving] = useState(false)
  // El ticket se ve en modo lectura; para cambiar TID, origen, estado, OTST
  // o equipo hay que entrar a editar y guardar a propósito — así un clic
  // accidental no altera el ticket, y lo guardado queda en la bitácora.
  const [editando, setEditando] = useState(false)
  const [comentarioCambio, setComentarioCambio] = useState('')

  // Se reinicia el formulario cuando llega (o cambia en la BD) el ticket.
  // react-query conserva la misma referencia si los datos no cambiaron, así
  // un refetch sin cambios no borra lo que se está editando.
  const [sincronizadoCon, setSincronizadoCon] = useState<TicketFabrica | undefined>(undefined)
  if (ticket && ticket !== sincronizadoCon) {
    if (ticket.id !== sincronizadoCon?.id) setEditando(false)
    setSincronizadoCon(ticket)
    setForm(formDesdeTicket(ticket))
  }

  const set = <K extends keyof FormTicket>(key: K, value: FormTicket[K]) => setForm(f => ({ ...f, [key]: value }))

  const original = ticket ? formDesdeTicket(ticket) : FORM_VACIO
  const hayCambios = esNuevo || JSON.stringify(form) !== JSON.stringify(original) || !!comentarioCambio.trim()

  const nombreCreador = (() => {
    const p = profiles.find(p => p.id === ticket?.creado_por)
    return p?.full_name || p?.email || '—'
  })()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tickets_fabrica'] })
    if (ticket?.id) qc.invalidateQueries({ queryKey: ['tickets_fabrica_avances', ticket.id] })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.numero.trim()) { toast.error('Ingresa el número del ticket'); return }
    if (form.esEquipoHijo && !form.madre.codigo.trim() && !form.madre.serial.trim()) {
      toast.error('Ingresa al menos el código o el serial del equipo madre'); return
    }

    const payload = {
      nombre: `${TICKET_ID_PREFIJO}${form.numero.trim()}`,
      codigo: form.equipo.codigo.trim() || null,
      serial: form.equipo.serial.trim() || null,
      equipo_nombre: form.equipo.nombre.trim() || null,
      origen: form.origen || null,
      estado: form.estado || null,
      // Varios códigos se normalizan a "41784, 41785".
      otst: parseOtstCodes(form.otst).join(', ') || null,
      es_equipo_hijo: form.esEquipoHijo,
      equipo_madre_codigo: form.esEquipoHijo ? (form.madre.codigo.trim() || null) : null,
      equipo_madre_serial: form.esEquipoHijo ? (form.madre.serial.trim() || null) : null,
      equipo_madre_nombre: form.esEquipoHijo ? (form.madre.nombre.trim() || null) : null,
    }

    setSaving(true)
    if (esNuevo) {
      // nota_estado → primer avance de la bitácora (trigger en BD).
      const { data, error } = await supabase.from('tickets_fabrica')
        .insert({ ...payload, nota_estado: form.notaInicial.trim() || null, creado_por: user?.id ?? null })
        .select('id').single()
      setSaving(false)
      if (error) { toast.error('Error al guardar: ' + error.message); return }
      invalidate()
      toast.success('Ticket creado')
      navigate(`/tickets/${data.id}`, { replace: true })
    } else if (ticket?.id) {
      const { error } = await supabase.from('tickets_fabrica')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', ticket.id)
      if (error) { toast.error('Error al actualizar: ' + error.message); setSaving(false); return }
      // Los cambios de TID/origen/estado/OTST los registra el trigger; el
      // comentario opcional explica el porqué y queda como avance aparte.
      if (comentarioCambio.trim() && user) {
        try { await agregarAvance(ticket.id, comentarioCambio, user.id) }
        catch (e) { toast.error('Se guardó el ticket, pero no el comentario: ' + (e as { message?: string }).message) }
      }
      setSaving(false)
      invalidate()
      toast.success('Ticket actualizado')
      setComentarioCambio('')
      setEditando(false)
    }
  }

  function cancelarEdicion() {
    if (ticket) setForm(formDesdeTicket(ticket))
    setComentarioCambio('')
    setEditando(false)
  }

  async function handleDelete() {
    if (!ticket?.id) return
    if (!window.confirm(`¿Eliminar el ticket "${ticket.nombre}"? Se borra también su bitácora de avances.`)) return
    const { error } = await supabase.from('tickets_fabrica').delete().eq('id', ticket.id)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    qc.invalidateQueries({ queryKey: ['tickets_fabrica'] })
    toast.success('Ticket eliminado')
    navigate('/tickets')
  }

  if (!esNuevo && isLoading) return <Spinner />
  if (!esNuevo && !ticket) {
    return (
      <div>
        <button onClick={() => navigate('/tickets')} style={{ ...GHOST, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <Card><p style={{ color: 'var(--muted)' }}>No se encontró el ticket.</p></Card>
      </div>
    )
  }

  const codigosOtst = parseOtstCodes(form.otst)

  const formulario = (
    <Card>
      <form onSubmit={handleSubmit}>
        <Seccion titulo="Identificación">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FG label="No. de ticket (plataforma de fábrica)" required>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{TICKET_ID_PREFIJO}</span>
                <input required autoFocus={esNuevo} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="22790" style={{ ...INP, fontFamily: 'var(--mono)' }} />
              </div>
            </FG>
            <FG label="Origen">
              <select value={form.origen} onChange={e => set('origen', e.target.value as TicketOrigen | '')} style={INP}>
                <option value="">Selecciona un origen</option>
                {(Object.keys(ORIGEN_LABEL) as TicketOrigen[]).map(o => <option key={o} value={o}>{ORIGEN_LABEL[o]}</option>)}
              </select>
            </FG>
            <FG label="Estado">
              <select value={form.estado} onChange={e => set('estado', e.target.value as TicketEstado | '')} style={INP}>
                <option value="">Selecciona un estado</option>
                {(Object.keys(ESTADO_LABEL) as TicketEstado[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </FG>
          </div>
        </Seccion>

        <Seccion titulo="OTST relacionada">
          <FG label="OTST" hint="Opcional — si son varias, sepáralas por comas">
            <input value={form.otst} onChange={e => set('otst', e.target.value)} placeholder="Ej. 41784, 41785" style={{ ...INP, fontFamily: 'var(--mono)' }} />
          </FG>
          {codigosOtst.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {codigosOtst.map(codigo => (
                <a
                  key={codigo}
                  href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer"
                  style={{ ...GHOST, padding: '7px 13px', fontSize: 12.5, textDecoration: 'none', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Ir a la OTST {codigo} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion titulo="Equipo">
          <EquipoQRFields label="Equipo reportado" value={form.equipo} onChange={v => set('equipo', v)} />

          <label style={{
            display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none', marginTop: 14,
            background: form.esEquipoHijo ? 'var(--accent-bg)' : 'var(--surface2)',
            border: `1px solid ${form.esEquipoHijo ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600,
            color: form.esEquipoHijo ? 'var(--accent)' : 'var(--text)', transition: 'all .15s',
          }}>
            <input type="checkbox" checked={form.esEquipoHijo} onChange={e => set('esEquipoHijo', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <Link2 size={15} />
            Es una sonda/electrodo (equipo hijo) de otro equipo — reportar equipo madre para trazabilidad
          </label>

          {form.esEquipoHijo && (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, marginTop: 12 }}>
              <EquipoQRFields label="Equipo madre" value={form.madre} onChange={v => set('madre', v)} />
            </div>
          )}
        </Seccion>

        {esNuevo && (
          <Seccion titulo="Primer avance">
            <FG label="Detalle inicial" hint="Opcional — queda como primera entrada de la bitácora del ticket">
              <textarea
                rows={3}
                value={form.notaInicial}
                onChange={e => set('notaInicial', e.target.value)}
                placeholder={form.estado ? ESTADO_NOTA_PLACEHOLDER[form.estado] : 'Ej: Se reporta a fábrica falla de lectura en pH 4'}
                style={{ ...INP, resize: 'vertical' }}
              />
            </FG>
          </Seccion>
        )}

        {!esNuevo && (
          <Seccion titulo="Comentario del cambio">
            <FG label="¿Por qué se modifica?" hint="Opcional — los cambios de TID, origen, estado y OTST quedan solos en la bitácora; este comentario se agrega junto a ellos">
              <textarea
                rows={2}
                value={comentarioCambio}
                onChange={e => setComentarioCambio(e.target.value)}
                placeholder="Ej: Fábrica aprobó el cambio por garantía según correo del 21/10"
                style={{ ...INP, resize: 'vertical' }}
              />
            </FG>
          </Seccion>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!esNuevo ? (
            <button type="button" onClick={handleDelete} style={{ ...GHOST, color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Eliminar ticket
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            {!esNuevo && (
              <button type="button" onClick={cancelarEdicion} style={GHOST}>Cancelar</button>
            )}
            <button type="submit" disabled={saving || !hayCambios} style={{ ...PRI, opacity: saving || !hayCambios ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : esNuevo ? '+ Crear ticket' : '✓ Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </Card>
  )

  return (
    <div>
      <button onClick={() => navigate('/tickets')} style={{ ...GHOST, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Volver
      </button>

      {esNuevo || !ticket ? (
        <div style={{ maxWidth: 860 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Nuevo ticket a fábrica</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Usa el número de ticket generado en la plataforma de fábrica.</p>
          {formulario}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>Ticket a fábrica</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 2, fontFamily: 'var(--mono)' }}>{TICKET_ID_PREFIJO}{numeroTid(ticket.nombre)}</h3>
                  {(ticket.codigo || ticket.equipo_nombre) && (
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {[ticket.codigo, ticket.equipo_nombre, ticket.serial && `S/N ${ticket.serial}`].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {ticket.origen && <span style={badge(ORIGEN_COLOR[ticket.origen])}>{ORIGEN_LABEL[ticket.origen]}</span>}
                  {ticket.estado
                    ? <span style={badge(ESTADO_COLOR[ticket.estado])}>{ESTADO_LABEL[ticket.estado]}</span>
                    : <span style={{ ...badge({ bg: 'var(--surface2)', text: 'var(--muted)', border: 'var(--border)' }) }}>Sin estado</span>}
                  {!editando && (
                    <button type="button" onClick={() => setEditando(true)} style={{ ...GHOST, padding: '6px 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                      <Pencil size={13} /> Editar
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Creado por <strong style={{ color: 'var(--text)' }}>{nombreCreador}</strong> · {fmtFechaLarga(ticket.created_at)}</span>
                {ticket.ultimo_avance_at && <span>Último avance: <strong style={{ color: 'var(--text)' }}>{fmtFechaLarga(ticket.ultimo_avance_at)}</strong></span>}
                <span>OTST:{' '}
                  {parseOtstCodes(ticket.otst).length === 0 ? <strong>—</strong> : parseOtstCodes(ticket.otst).map((c, i) => (
                    <span key={c}>{i > 0 && ', '}<a href={linkOtst(c)!} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'var(--accent)' }}>{c}</a></span>
                  ))}
                </span>
              </div>
            </Card>
            {editando ? formulario : <FichaTicket ticket={ticket} />}
          </div>

          <BitacoraTicket ticketId={ticket.id!} />
        </div>
      )}
    </div>
  )
}

export default TicketDetailPage
