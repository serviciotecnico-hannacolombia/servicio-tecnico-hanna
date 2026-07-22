import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Wrench, AlertTriangle, History, Ban, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import {
  useEquiposMantenimiento, useEventosMantenimiento, useInvalidateMantenimiento,
  calcularProximaFecha, estaVencido, proximoAVencer,
} from './hooks/useMantenimiento'
import type { EquipoMantenimiento, Periodicidad } from '../../types'

const FAMILIAS = [
  'Multiparameter', 'Spectrophotometers', 'Titrators KF', 'ISM Bench',
  'Bench pH/EC', 'Portables EC', 'Portables DO', 'Otra',
]

const PERIODICIDAD_LABEL: Record<Periodicidad, string> = {
  trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}

type EstadoFiltro = 'activo' | 'vencido' | 'proximo' | 'cancelado' | 'todos'

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function MantenimientoProgramadoPage() {
  const { user } = useUser()
  const { data: equipos = [], isLoading } = useEquiposMantenimiento()
  const invalidate = useInvalidateMantenimiento()

  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('activo')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ equipo?: EquipoMantenimiento } | null>(null)
  const [historial, setHistorial] = useState<EquipoMantenimiento | null>(null)
  const [eliminando, setEliminando] = useState<EquipoMantenimiento | null>(null)

  const rows = equipos
    .filter(e => {
      if (estadoFiltro === 'todos') return true
      if (estadoFiltro === 'cancelado') return e.estado === 'cancelado'
      if (estadoFiltro === 'vencido') return estaVencido(e)
      if (estadoFiltro === 'proximo') return proximoAVencer(e)
      return e.estado === 'activo'
    })
    .filter(e => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return e.serial.toLowerCase().includes(q) || e.cliente.toLowerCase().includes(q) || e.familia.toLowerCase().includes(q)
    })

  async function cambiarEstado(e: EquipoMantenimiento, estado: 'activo' | 'cancelado') {
    const { error } = await supabase.from('equipos_mantenimiento')
      .update({ estado, updated_at: new Date().toISOString() }).eq('id', e.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(estado === 'cancelado' ? 'Plan cancelado' : 'Plan reactivado')
    invalidate.equipos()
  }

  async function eliminar(e: EquipoMantenimiento) {
    const { error } = await supabase.from('equipos_mantenimiento').delete().eq('id', e.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Equipo eliminado')
    setEliminando(null)
    invalidate.equipos()
  }

  const activosCount = equipos.filter(e => e.estado === 'activo').length
  const proximosCount = equipos.filter(e => proximoAVencer(e)).length
  const vencidosCount = equipos.filter(e => estaVencido(e)).length
  const canceladosCount = equipos.filter(e => e.estado === 'cancelado').length

  return (
    <div>
      <Header
        title="Mantenimiento Programado"
        subtitle="Seguimiento de equipos con plan de mantenimiento preventivo contratado"
        actions={<button onClick={() => setModal({})} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Registrar equipo</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Planes activos" value={activosCount} color="var(--accent)" />
        <Stat label="Próximos a vencer (≤30 días)" value={proximosCount} color="var(--yellow)" />
        <Stat label="Vencidos" value={vencidosCount} color="var(--red)" />
        <Stat label="Cancelados" value={canceladosCount} color="var(--muted)" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
            {([['activo', 'Activos'], ['proximo', 'Próximos'], ['vencido', 'Vencidos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']] as [EstadoFiltro, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setEstadoFiltro(v)} style={{
                padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                fontWeight: estadoFiltro === v ? 600 : 500, fontFamily: 'var(--sans)',
                background: estadoFiltro === v ? 'var(--accent)' : 'transparent',
                color: estadoFiltro === v ? '#fff' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por serial, cliente o familia..." style={{ ...INP, flex: 1, minWidth: 200 }} />
        </div>

        {isLoading ? (
          <div style={EMPTY}><p>Cargando…</p></div>
        ) : rows.length === 0 ? (
          <div style={EMPTY}><Wrench size={32} strokeWidth={1.5} /><p>No hay equipos para este filtro</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(e => {
              const vencido = estaVencido(e)
              const proximo = proximoAVencer(e)
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  border: `1px solid ${vencido ? 'var(--red-border)' : proximo ? 'var(--yellow-border)' : 'var(--border)'}`,
                  background: e.estado === 'cancelado' ? 'var(--surface)' : vencido ? 'var(--red-bg)' : proximo ? 'var(--yellow-bg)' : 'var(--surface2)',
                  borderRadius: 10, opacity: e.estado === 'cancelado' ? 0.65 : 1,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.serial}</span>
                      <span style={B_INFO}>{e.familia}</span>
                      <span style={B_INFO}>{PERIODICIDAD_LABEL[e.periodicidad]}</span>
                      {e.estado === 'cancelado' && <span style={B_INFO}>Cancelado</span>}
                      {e.estado === 'activo' && vencido && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vencido</span>}
                      {e.estado === 'activo' && !vencido && proximo && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Próximo a vencer</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>Cliente: <strong>{e.cliente}</strong></span>
                      {e.codigo_mantprog && <span>Código: <strong>{e.codigo_mantprog}</strong></span>}
                      <span>Próximo mantenimiento: <strong style={{ color: vencido ? 'var(--red)' : undefined }}>{fmtFecha(e.proxima_fecha)}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <IconBtn title="Ver historial / registrar mantenimiento" onClick={() => setHistorial(e)}><History size={14} /></IconBtn>
                    <IconBtn title="Editar" onClick={() => setModal({ equipo: e })}><Pencil size={14} /></IconBtn>
                    {e.estado === 'activo' ? (
                      <IconBtn title="Cancelar plan" onClick={() => cambiarEstado(e, 'cancelado')}><Ban size={14} color="var(--yellow)" /></IconBtn>
                    ) : (
                      <IconBtn title="Reactivar plan" onClick={() => cambiarEstado(e, 'activo')}><RotateCcw size={14} color="var(--accent)" /></IconBtn>
                    )}
                    <IconBtn title="Eliminar" onClick={() => setEliminando(e)}><Trash2 size={14} color="var(--red)" /></IconBtn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {modal && (
        <ModalEquipo
          equipo={modal.equipo} miId={user?.id || ''}
          onClose={() => setModal(null)} onSaved={invalidate.equipos}
        />
      )}

      {historial && (
        <ModalHistorial equipo={historial} miId={user?.id || ''} onClose={() => setHistorial(null)} />
      )}

      {eliminando && (
        <Modal open onClose={() => setEliminando(null)} title="Eliminar equipo">
          <p style={{ fontSize: 13 }}>¿Eliminar el equipo <strong>{eliminando.serial}</strong> y todo su historial de mantenimientos? Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEliminando(null)} style={GHOST}>Cancelar</button>
            <button onClick={() => eliminar(eliminando)} style={{ ...PRI, background: 'var(--red)' }}>🗑 Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ModalEquipo({ equipo, miId, onClose, onSaved }: {
  equipo?: EquipoMantenimiento, miId: string, onClose: () => void, onSaved: () => void,
}) {
  const [serial, setSerial] = useState(equipo?.serial || '')
  const [familia, setFamilia] = useState(equipo?.familia || FAMILIAS[0])
  const [cliente, setCliente] = useState(equipo?.cliente || '')
  const [codigoMantprog, setCodigoMantprog] = useState(equipo?.codigo_mantprog || '')
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>(equipo?.periodicidad || 'anual')
  const [fechaCompra, setFechaCompra] = useState(equipo?.fecha_compra || new Date().toISOString().slice(0, 10))
  const [proximaFecha, setProximaFecha] = useState(equipo?.proxima_fecha || calcularProximaFecha('anual', new Date().toISOString().slice(0, 10)))
  const [observaciones, setObservaciones] = useState(equipo?.observaciones || '')
  const [saving, setSaving] = useState(false)
  const [proximaFechaTocada, setProximaFechaTocada] = useState(!!equipo)

  function onFechaCompraChange(v: string) {
    setFechaCompra(v)
    if (!proximaFechaTocada) setProximaFecha(calcularProximaFecha(periodicidad, v))
  }

  function onPeriodicidadChange(v: Periodicidad) {
    setPeriodicidad(v)
    if (!proximaFechaTocada) setProximaFecha(calcularProximaFecha(v, fechaCompra))
  }

  async function submit() {
    if (!serial.trim()) { toast.error('Ingresa el serial'); return }
    if (!cliente.trim()) { toast.error('Ingresa el cliente'); return }
    setSaving(true)
    const payload = {
      serial: serial.trim(), familia, cliente: cliente.trim(),
      codigo_mantprog: codigoMantprog.trim() || null,
      periodicidad, fecha_compra: fechaCompra, proxima_fecha: proximaFecha,
      observaciones: observaciones.trim() || null,
    }
    if (equipo) {
      const { error } = await supabase.from('equipos_mantenimiento')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', equipo.id)
      setSaving(false)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Equipo actualizado')
    } else {
      const { error } = await supabase.from('equipos_mantenimiento')
        .insert({ ...payload, estado: 'activo', creado_por: miId })
      setSaving(false)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Equipo registrado')
    }
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={equipo ? 'Editar equipo' : 'Registrar equipo'} width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FG label="Serial">
          <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="Ej. HI98107-01234" style={INP} autoFocus />
        </FG>
        <FG label="Familia">
          <select value={familia} onChange={e => setFamilia(e.target.value)} style={INP}>
            {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <FG label="Cliente">
          <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente" style={INP} />
        </FG>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <FG label="Código MANTPROG (opcional)">
          <input value={codigoMantprog} onChange={e => setCodigoMantprog(e.target.value)} placeholder="Ej. MANTPROG.01" style={INP} />
        </FG>
        <FG label="Periodicidad">
          <select value={periodicidad} onChange={e => onPeriodicidadChange(e.target.value as Periodicidad)} style={INP}>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </FG>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <FG label="Fecha de compra">
          <input type="date" value={fechaCompra} onChange={e => onFechaCompraChange(e.target.value)} style={INP} />
        </FG>
        <FG label="Próximo mantenimiento">
          <input type="date" value={proximaFecha} onChange={e => { setProximaFecha(e.target.value); setProximaFechaTocada(true) }} style={INP} />
        </FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <FG label="Observaciones">
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Opcional..." style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : equipo ? '✓ Guardar cambios' : '+ Registrar equipo'}</button>
      </div>
    </Modal>
  )
}

function ModalHistorial({ equipo, miId, onClose }: { equipo: EquipoMantenimiento, miId: string, onClose: () => void }) {
  const { data: eventos = [], isLoading } = useEventosMantenimiento(equipo.id)
  const invalidate = useInvalidateMantenimiento()
  const [showForm, setShowForm] = useState(false)
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().slice(0, 10))
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)

  async function registrarEvento() {
    if (!fechaRecepcion) { toast.error('Ingresa la fecha de recepción'); return }
    setSaving(true)
    const { error } = await supabase.from('eventos_mantenimiento').insert({
      equipo_id: equipo.id, fecha_recepcion: fechaRecepcion,
      fecha_entrega: fechaEntrega || null, observaciones: observaciones.trim() || null,
      responsable: miId,
    })
    if (error) { setSaving(false); toast.error('Error: ' + error.message); return }

    if (fechaEntrega) {
      const nuevaProxima = calcularProximaFecha(equipo.periodicidad, fechaEntrega)
      const { error: errUpdate } = await supabase.from('equipos_mantenimiento')
        .update({ proxima_fecha: nuevaProxima, updated_at: new Date().toISOString() }).eq('id', equipo.id)
      if (errUpdate) { setSaving(false); toast.error('Evento guardado, pero no se pudo actualizar la próxima fecha: ' + errUpdate.message); invalidate.eventos(equipo.id); return }
      invalidate.equipos()
    }

    setSaving(false)
    toast.success('Mantenimiento registrado')
    setShowForm(false)
    setFechaRecepcion(new Date().toISOString().slice(0, 10))
    setFechaEntrega('')
    setObservaciones('')
    invalidate.eventos(equipo.id)
  }

  return (
    <Modal open onClose={onClose} title={`Historial — ${equipo.serial}`} width={560}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>Cliente: <strong>{equipo.cliente}</strong></span>
        <span>Periodicidad: <strong>{PERIODICIDAD_LABEL[equipo.periodicidad]}</strong></span>
        <span>Próximo: <strong>{fmtFecha(equipo.proxima_fecha)}</strong></span>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando…</p>
      ) : eventos.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Sin mantenimientos registrados todavía.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {eventos.map(ev => (
            <div key={ev.id} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12.5, fontFamily: 'var(--mono)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>Recepción: <strong>{fmtFecha(ev.fecha_recepcion)}</strong></span>
                <span>Entrega: <strong>{fmtFecha(ev.fecha_entrega)}</strong></span>
              </div>
              {ev.observaciones && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{ev.observaciones}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FG label="Fecha de recepción">
              <input type="date" value={fechaRecepcion} onChange={e => setFechaRecepcion(e.target.value)} style={INP} />
            </FG>
            <FG label="Fecha de entrega (opcional)">
              <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} style={INP} />
            </FG>
          </div>
          <div style={{ marginTop: 14 }}>
            <FG label="Observaciones">
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Opcional..." style={{ ...INP, resize: 'vertical' }} />
            </FG>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={GHOST}>Cancelar</button>
            <button onClick={registrarEvento} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '+ Registrar mantenimiento'}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowForm(true)} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Registrar mantenimiento</button>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</div>
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string, onClick: () => void, children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)',
      color: 'var(--muted)', cursor: 'pointer',
    }}>{children}</button>
  )
}

function FG({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>{label}</label>
      {children}
    </div>
  )
}

const INP: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 8, padding: '10px 13px', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', width: '100%',
}
const PRI: React.CSSProperties = { padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const GHOST: React.CSSProperties = { padding: '10px 18px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }
const B_VENCIDA: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }
const B_PROXIMA: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)' }
const B_INFO: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }
const EMPTY: React.CSSProperties = { textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
