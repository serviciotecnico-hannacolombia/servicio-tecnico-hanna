import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, AlertTriangle, ListTodo } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { useTareas, useInvalidateTareas, estaVencida, venceManana, esUrgente } from './hooks/useTareas'
import type { Tarea, EstadoTarea } from '../../types'

type Vista = 'asignadas' | 'creadas' | 'todas'
type EstadoFiltro = 'pendiente' | 'completada' | 'todas'

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function TareasPage() {
  const { user, displayName } = useUser()
  const { data: profiles = [] } = useProfiles()
  const { data: tareas = [], isLoading } = useTareas()
  const invalidate = useInvalidateTareas()

  const [vista, setVista] = useState<Vista>('asignadas')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('pendiente')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ tarea?: Tarea } | null>(null)
  const [eliminando, setEliminando] = useState<Tarea | null>(null)

  const activos = profiles.filter(p => p.activo)
  const profileName = (id: string) => profiles.find(p => p.id === id)?.full_name || profiles.find(p => p.id === id)?.email || '—'

  const rows = tareas
    .filter(t => vista === 'todas' || (vista === 'asignadas' ? t.asignado_a === user?.id : t.creado_por === user?.id))
    .filter(t => estadoFiltro === 'todas' || t.estado === estadoFiltro)
    .filter(t => !search.trim() || t.titulo.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const rank = (t: Tarea) => estaVencida(t) ? 0 : venceManana(t) ? 1 : t.estado === 'pendiente' ? 2 : 3
      const av = rank(a), bv = rank(b)
      if (av !== bv) return av - bv
      return (a.fecha_vencimiento || '9999').localeCompare(b.fecha_vencimiento || '9999')
    })

  async function toggleCompletada(t: Tarea) {
    const nuevoEstado: EstadoTarea = t.estado === 'pendiente' ? 'completada' : 'pendiente'
    const { error } = await supabase.from('tareas').update({
      estado: nuevoEstado,
      completado_at: nuevoEstado === 'completada' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', t.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(nuevoEstado === 'completada' ? 'Tarea completada' : 'Tarea reabierta')
    invalidate()
  }

  async function eliminar(t: Tarea) {
    const { error } = await supabase.from('tareas').delete().eq('id', t.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Tarea eliminada')
    setEliminando(null)
    invalidate()
  }

  const pendientesCount = tareas.filter(t => (t.asignado_a === user?.id || t.creado_por === user?.id) && esUrgente(t)).length

  return (
    <div>
      <Header
        title="Tareas"
        subtitle="Tareas personales — creadas por ti o asignadas a ti"
        actions={<button onClick={() => setModal({})} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Nueva tarea</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Urgentes (vencen mañana o vencidas)" value={pendientesCount} color="var(--red)" />
        <Stat label="Asignadas a mí" value={tareas.filter(t => t.asignado_a === user?.id && t.estado === 'pendiente').length} color="var(--accent)" />
        <Stat label="Creadas por mí" value={tareas.filter(t => t.creado_por === user?.id).length} color="var(--purple)" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
            {([['asignadas', 'Asignadas a mí'], ['creadas', 'Creadas por mí'], ['todas', 'Todas']] as [Vista, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                fontWeight: vista === v ? 600 : 500, fontFamily: 'var(--sans)',
                background: vista === v ? 'var(--accent)' : 'transparent',
                color: vista === v ? '#fff' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoFiltro)} style={INP}>
            <option value="pendiente">Pendientes</option>
            <option value="completada">Completadas</option>
            <option value="todas">Todas</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." style={{ ...INP, flex: 1, minWidth: 180 }} />
        </div>

        {isLoading ? (
          <div style={EMPTY}><p>Cargando…</p></div>
        ) : rows.length === 0 ? (
          <div style={EMPTY}><ListTodo size={32} strokeWidth={1.5} /><p>No hay tareas para este filtro</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(t => {
              const vencida = estaVencida(t)
              const proxima = venceManana(t)
              const soyCreador = t.creado_por === user?.id
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  border: `1px solid ${vencida ? 'var(--red-border)' : proxima ? 'var(--yellow-border)' : 'var(--border)'}`,
                  background: vencida ? 'var(--red-bg)' : proxima ? 'var(--yellow-bg)' : 'var(--surface2)', borderRadius: 10,
                }}>
                  <button onClick={() => toggleCompletada(t)} title={t.estado === 'pendiente' ? 'Marcar completada' : 'Reabrir'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: t.estado === 'completada' ? 'var(--green)' : 'var(--muted)' }}>
                    {t.estado === 'completada' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, textDecoration: t.estado === 'completada' ? 'line-through' : 'none', color: t.estado === 'completada' ? 'var(--muted)' : 'var(--text)' }}>
                        {t.titulo}
                      </span>
                      {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vencida</span>}
                      {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vence mañana</span>}
                    </div>
                    {t.descripcion && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{t.descripcion}</p>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>De: <strong>{soyCreador ? 'Mí' : profileName(t.creado_por)}</strong></span>
                      <span>Para: <strong>{t.asignado_a === user?.id ? 'Mí' : profileName(t.asignado_a)}</strong></span>
                      <span>Vence: <strong style={{ color: vencida ? 'var(--red)' : undefined }}>{fmtFecha(t.fecha_vencimiento)}</strong></span>
                    </div>
                  </div>
                  {soyCreador && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <IconBtn title="Editar" onClick={() => setModal({ tarea: t })}><Pencil size={14} /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => setEliminando(t)}><Trash2 size={14} color="var(--red)" /></IconBtn>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {modal && (
        <ModalTarea
          tarea={modal.tarea} activos={activos} miId={user?.id || ''} displayName={displayName}
          onClose={() => setModal(null)} onSaved={invalidate}
        />
      )}

      {eliminando && (
        <Modal open onClose={() => setEliminando(null)} title="Eliminar tarea">
          <p style={{ fontSize: 13 }}>¿Eliminar la tarea <strong>{eliminando.titulo}</strong>? Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEliminando(null)} style={GHOST}>Cancelar</button>
            <button onClick={() => eliminar(eliminando)} style={{ ...PRI, background: 'var(--red)' }}>🗑 Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ModalTarea({ tarea, activos, miId, onClose, onSaved }: {
  tarea?: Tarea, activos: { id: string, full_name: string | null, email: string }[], miId: string, displayName: string,
  onClose: () => void, onSaved: () => void,
}) {
  const [titulo, setTitulo] = useState(tarea?.titulo || '')
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || '')
  const [asignadoA, setAsignadoA] = useState(tarea?.asignado_a || miId)
  const [vencimiento, setVencimiento] = useState(tarea?.fecha_vencimiento || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!titulo.trim()) { toast.error('Ingresa un título'); return }
    setSaving(true)
    if (tarea) {
      const { error } = await supabase.from('tareas').update({
        titulo: titulo.trim(), descripcion: descripcion.trim() || null,
        asignado_a: asignadoA, fecha_vencimiento: vencimiento || null,
        updated_at: new Date().toISOString(),
      }).eq('id', tarea.id)
      setSaving(false)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Tarea actualizada')
    } else {
      const { error } = await supabase.from('tareas').insert({
        titulo: titulo.trim(), descripcion: descripcion.trim() || null,
        creado_por: miId, asignado_a: asignadoA, fecha_vencimiento: vencimiento || null, estado: 'pendiente',
      })
      setSaving(false)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Tarea creada')
    }
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={tarea ? `Editar tarea` : 'Nueva tarea'}>
      <FG label="Título">
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Llamar al proveedor X" style={INP} autoFocus />
      </FG>
      <div style={{ marginTop: 14 }}>
        <FG label="Observaciones">
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="Opcional..." style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <FG label="Asignar a">
          <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)} style={INP}>
            <option value={miId}>Yo mismo</option>
            {activos.filter(p => p.id !== miId).map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
        </FG>
        <FG label="Fecha de vencimiento">
          <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)} style={INP} />
        </FG>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : tarea ? '✓ Guardar cambios' : '+ Crear tarea'}</button>
      </div>
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
const EMPTY: React.CSSProperties = { textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
