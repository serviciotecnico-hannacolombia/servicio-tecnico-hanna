import { tiempoTarea } from './horasLaborales'
import { faltaColumnaPrivada } from './compatibilidad'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, AlertTriangle, ListTodo, Download, Pin } from 'lucide-react'
import { ExportTareasModal } from './ExportTareasModal'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { useTareas, useInvalidateTareas, estaVencida, venceHoy, venceManana, esPrioritaria, esUrgente } from './hooks/useTareas'
import type { Tarea, EstadoTarea } from '../../types'

type Vista = 'asignadas' | 'creadas' | 'todas' | 'prioritarias'
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

  const [orden,setOrden]=useState('prioridad')
  const [fijadas,setFijadas]=useState<string[]>(()=>{try{const v=JSON.parse(localStorage.getItem('tareas-fijadas-'+user?.id)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[]}catch{return []}})
  function fijar(id:string){setFijadas(prev=>{const n=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];try{localStorage.setItem('tareas-fijadas-'+user?.id,JSON.stringify(n))}catch{/* preferencia solo en sesión */}return n})}
  const [vista, setVista] = useState<Vista>('asignadas')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('pendiente')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ tarea?: Tarea } | null>(null)
  const [eliminando, setEliminando] = useState<Tarea | null>(null)
  const [exportando, setExportando] = useState(false)

  const activos = profiles.filter(p => p.activo)
  const profileName = (id: string) => profiles.find(p => p.id === id)?.full_name || profiles.find(p => p.id === id)?.email || '—'

  const rows = tareas
    .filter(t => vista === 'todas' || (vista === 'prioritarias'
      ? (t.asignado_a === user?.id || t.creado_por === user?.id) && esPrioritaria(t)
      : vista === 'asignadas' ? t.asignado_a === user?.id : t.creado_por === user?.id))
    .filter(t => estadoFiltro === 'todas' || t.estado === estadoFiltro)
    .filter(t => !search.trim() || t.titulo.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const pin=Number(fijadas.includes(b.id))-Number(fijadas.includes(a.id));if(pin)return pin
      if(orden==='recientes')return b.created_at.localeCompare(a.created_at)
      if(orden==='titulo')return a.titulo.localeCompare(b.titulo,'es')
      if(orden==='vencimiento')return (a.fecha_vencimiento||'9999').localeCompare(b.fecha_vencimiento||'9999')
      const prioridad=Number(!!b.urgente)*2+Number(!!b.importante)-Number(!!a.urgente)*2-Number(!!a.importante);if(prioridad)return prioridad
      const rank = (t: Tarea) => estaVencida(t) ? 0 : venceHoy(t) ? 1 : venceManana(t) ? 2 : t.estado === 'pendiente' ? 3 : 4
      const av = rank(a), bv = rank(b)
      if (av !== bv) return av - bv
      return (a.fecha_vencimiento || '9999').localeCompare(b.fecha_vencimiento || '9999')
    })

  async function toggleCompletada(t: Tarea) {
    if (t.creado_por !== user?.id && t.asignado_a !== user?.id) return
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
        subtitle="Tareas públicas y privadas — consulta las compartidas en Todas"
        actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={isLoading} onClick={() => setExportando(true)} style={GHOST}><Download size={14} style={{ verticalAlign: -2 }} /> Reporte CSV</button>
          <button onClick={() => setModal({})} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Nueva tarea</button>
        </div>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Alertas (prioritarias, vencidas, hoy o mañana)" value={pendientesCount} color="var(--red)" />
        <Stat label="Asignadas a mí" value={tareas.filter(t => t.asignado_a === user?.id && t.estado === 'pendiente').length} color="var(--accent)" />
        <Stat label="Creadas por mí" value={tareas.filter(t => t.creado_por === user?.id).length} color="var(--purple)" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
            {([['asignadas', 'Asignadas a mí'], ['creadas', 'Creadas por mí'], ['prioritarias', 'Prioritarias'], ['todas', 'Todas']] as [Vista, string][]).map(([v, label]) => (
              <button key={v} onClick={() => { setVista(v); if (v === 'prioritarias') setEstadoFiltro('pendiente') }} style={{
                padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                fontWeight: vista === v ? 600 : 500, fontFamily: 'var(--sans)',
                background: vista === v ? 'var(--accent)' : 'transparent',
                color: vista === v ? '#fff' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
          <select disabled={vista === 'prioritarias'} value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoFiltro)} style={INP}>
            <option value="pendiente">Pendientes</option>
            <option value="completada">Completadas</option>
            <option value="todas">Todas</option>
          </select>
<select aria-label="Ordenar tareas" style={INP} value={orden} onChange={e=>setOrden(e.target.value)}><option value="prioridad">Orden: prioridad</option><option value="vencimiento">Orden: vencimiento</option><option value="recientes">Orden: más recientes</option><option value="titulo">Orden: título</option></select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." style={{ ...INP, flex: 1, minWidth: 180 }} />
        </div>

        {isLoading ? (
          <div style={EMPTY}><p>Cargando…</p></div>
        ) : rows.length === 0 ? (
          <div style={EMPTY}><ListTodo size={32} strokeWidth={1.5} /><p>No hay tareas para este filtro</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(t => {
              const horas=tiempoTarea(t)
              const vencida = estaVencida(t)
              const hoy = venceHoy(t)
              const proxima = venceManana(t)
              const soyCreador = t.creado_por === user?.id
              const soyParticipante = soyCreador || t.asignado_a === user?.id
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  border: `1px solid ${vencida ? 'var(--red-border)' : hoy || proxima ? 'var(--yellow-border)' : 'var(--border)'}`,
                  background: vencida ? 'var(--red-bg)' : hoy || proxima ? 'var(--yellow-bg)' : 'var(--surface2)', borderRadius: 10,
                }}>
                  <button disabled={!soyParticipante} onClick={() => toggleCompletada(t)}
                    title={!soyParticipante ? 'Solo el creador y el asignado pueden cambiar el estado' : t.estado === 'pendiente' ? 'Marcar completada' : 'Reabrir'}
                    aria-label={t.estado === 'completada' ? 'Reabrir tarea' : 'Marcar tarea completada'}
                    style={{ background: 'none', border: 'none', cursor: soyParticipante ? 'pointer' : 'default', padding: 2, color: t.estado === 'completada' ? 'var(--green)' : 'var(--muted)' }}>
                    {t.estado === 'completada' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, textDecoration: t.estado === 'completada' ? 'line-through' : 'none', color: t.estado === 'completada' ? 'var(--muted)' : 'var(--text)' }}>
                        {t.titulo}
                      </span>
                      <span style={{ ...B_PROXIMA, background: 'var(--surface)', color: 'var(--muted)', borderColor: 'var(--border)' }}>
                        {(t.privada ?? true) ? 'Privada' : 'Pública'}
                      </span>
{t.importante&&<span style={B_PROXIMA}>Importante</span>}{t.urgente&&<span style={B_VENCIDA}>Urgente</span>}{fijadas.includes(t.id)&&<span style={B_PROXIMA}>Fijada</span>}
                      {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vencida</span>}
                      {hoy && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vence hoy</span>}
                      {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vence mañana</span>}
                    </div>
                    {t.descripcion && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{t.descripcion}</p>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>De: <strong>{soyCreador ? 'Mí' : profileName(t.creado_por)}</strong></span>
                      <span>Para: <strong>{t.asignado_a === user?.id ? 'Mí' : profileName(t.asignado_a)}</strong></span>
                      <span title="Desde la creación hasta el cierre o el momento actual. Lun–jue 7:30–17:00; vie 7:30–16:00, sin fines de semana ni festivos de Colombia.">{t.estado==='completada'?'Tiempo de atención':'Tiempo transcurrido'}: <strong>{horas==null?'Sin fecha válida':horas.toLocaleString('es-CO',{maximumFractionDigits:2})+' h hábiles'}</strong></span>
                      <span>Vence: <strong style={{ color: vencida ? 'var(--red)' : undefined }}>{fmtFecha(t.fecha_vencimiento)}</strong></span>
                    </div>
                  </div>
                  <IconBtn title={fijadas.includes(t.id)?'Desfijar tarea':'Fijar arriba (solo para mí)'} onClick={()=>fijar(t.id)}><Pin size={14} fill={fijadas.includes(t.id)?'currentColor':'none'}/></IconBtn>
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

      {exportando && <ExportTareasModal tareas={tareas} nombre={id => {
        const perfil = profiles.find(p => p.id === id)
        return perfil?.full_name || perfil?.email || id
      }} onClose={() => setExportando(false)} />}

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
  const [privada, setPrivada] = useState(tarea?.privada ?? true)
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || '')
  const [asignadoA, setAsignadoA] = useState(tarea?.asignado_a || miId)
  const [vencimiento, setVencimiento] = useState(tarea?.fecha_vencimiento || '')
  const [importante,setImportante]=useState(tarea?.importante??false),[urgente,setUrgente]=useState(tarea?.urgente??false)
  const [sinPrivacidad, setSinPrivacidad] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!titulo.trim()) { toast.error('Ingresa un título'); return }
    setSaving(true)
    try {
      const datos={...(importante||tarea?.importante!==undefined?{importante}:{}),...(urgente||tarea?.urgente!==undefined?{urgente}:{}),titulo:titulo.trim(),descripcion:descripcion.trim()||null,asignado_a:asignadoA,fecha_vencimiento:vencimiento||null}
      const guardar=(conPrivacidad:boolean)=>tarea
        ? supabase.from('tareas').update({...datos,...(conPrivacidad?{privada}:{}),updated_at:new Date().toISOString()}).eq('id',tarea.id)
        : supabase.from('tareas').insert({...datos,...(conPrivacidad?{privada}:{}),creado_por:miId,estado:'pendiente'})
      let {error}=await guardar(true)
      if(faltaColumnaPrivada(error)) {
        setSinPrivacidad(true)
        if(!privada){toast.error('Las tareas públicas requieren la actualización de Supabase. Puedes guardar esta tarea como privada.');return}
        // La petición rechazada por columna inexistente no escribió datos.
        // El esquema anterior protege la lectura por creador/asignado.
        const resultado=await guardar(false)
        error=resultado.error
      }
      if(error){toast.error(/importante|urgente/.test(error.message)?'Las marcas Importante y Urgente requieren aplicar la actualización SQL. Puedes guardar sin esas marcas mientras tanto.':'Error: '+error.message);return}
      toast.success(tarea?'Tarea actualizada':'Tarea creada')
    } catch {toast.error('No se pudo guardar la tarea. Revisa la conexión y vuelve a intentar.');return}
    finally {setSaving(false)}

    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={tarea ? `Editar tarea` : 'Nueva tarea'}>
      {sinPrivacidad&&<p role="status" style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Por ahora solo puedes guardar tareas privadas. Las tareas públicas estarán disponibles al actualizar Supabase.</p>}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" role="switch" aria-checked={privada} aria-labelledby="tarea-privacidad-label"
            aria-describedby="tarea-privacidad-ayuda" onClick={() => setPrivada(v => !v)}
            style={{ width: 44, height: 26, padding: 3, borderRadius: 999, border: '1px solid var(--border2)',
              background: privada ? 'var(--accent)' : 'var(--surface2)', cursor: 'pointer', flexShrink: 0,
              transition: 'background 160ms ease' }}>
            <span aria-hidden="true" style={{ display: 'block', width: 18, height: 18, borderRadius: '50%',
              background: privada ? '#fff' : 'var(--muted)', transform: `translateX(${privada ? 18 : 0}px)`,
              transition: 'transform 160ms ease' }} />
          </button>
          <span id="tarea-privacidad-label" style={{ fontSize: 13, fontWeight: 600 }}>Tarea privada</span>
        </div>
        <p id="tarea-privacidad-ayuda" style={{ marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
          {privada ? 'Solo la ven el creador y la persona asignada.' : 'La ven todos los usuarios activos con acceso a Tareas.'}
        </p>
      </div>
      <div style={{display:'flex',gap:18,marginBottom:14}}><label><input type="checkbox" checked={importante} onChange={e=>setImportante(e.target.checked)}/> Importante</label><label><input type="checkbox" checked={urgente} onChange={e=>setUrgente(e.target.checked)}/> Urgente</label></div>
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
