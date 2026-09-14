import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import {
  useTablasMantenimiento, useInvalidateTablasMantenimiento,
  crearTablaMantenimiento, actualizarTablaMantenimiento, eliminarTablaMantenimiento,
  renderTablaHTML,
} from './hooks/useTablasMantenimiento'
import type { FilaTablaMantenimiento, TablaMantenimiento } from '../../types'

const INP: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}
const PRI: React.CSSProperties = { padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }
const GHOST: React.CSSProperties = { padding: '7px 16px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }

export function TablasMantenimientoModal({ onClose, onInsert }: { onClose: () => void, onInsert: (html: string) => void }) {
  const { user, hasCapability } = useUser()
  const puedeEditar = hasCapability('tablas_mantenimiento_editar')
  const { data: tablas = [], isLoading } = useTablasMantenimiento()
  const invalidate = useInvalidateTablasMantenimiento()

  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<{ tabla?: TablaMantenimiento } | null>(null)
  const [eliminando, setEliminando] = useState<TablaMantenimiento | null>(null)

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return tablas
    return tablas.filter(t => t.equipo.toLowerCase().includes(q) || (t.parametro || '').toLowerCase().includes(q))
  }, [tablas, busqueda])

  function insertar(t: TablaMantenimiento) {
    onInsert(renderTablaHTML(t.equipo, t.filas))
    onClose()
  }

  async function eliminar(t: TablaMantenimiento) {
    const { error } = await eliminarTablaMantenimiento(t.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Tabla eliminada')
    setEliminando(null)
    invalidate()
  }

  return (
    <>
      <Modal open onClose={onClose} title="🧪 Tablas de mantenimiento" width={880}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por equipo o parámetro..." style={{ ...INP, paddingLeft: 34 }} />
          </div>
          {puedeEditar && (
            <button onClick={() => setForm({})} style={PRI}><Plus size={13} style={{ verticalAlign: -2 }} /> Nueva tabla</button>
          )}
        </div>

        {isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando…</p>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 12, fontSize: 13 }}>
            {tablas.length === 0 ? 'Aún no hay tablas de mantenimiento registradas.' : 'Sin resultados para esa búsqueda.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            {filtradas.map(t => (
              <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.equipo}</div>
                  {t.parametro && (
                    <span style={{ fontSize: 9.5, fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--accent)', background: 'rgba(0,94,184,.08)', border: '1px solid rgba(0,94,184,.2)', padding: '2px 8px', borderRadius: 8, display: 'inline-block', marginTop: 4 }}>
                      {t.parametro}
                    </span>
                  )}
                </div>
                <div
                  style={{ fontSize: 9, lineHeight: 1.3, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 6, overflow: 'hidden', maxHeight: 90 }}
                  dangerouslySetInnerHTML={{ __html: renderTablaHTML(t.equipo, t.filas) }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                  <button onClick={() => insertar(t)} style={{ ...PRI, flex: 1 }}>Insertar</button>
                  {puedeEditar && (
                    <>
                      <button onClick={() => setForm({ tabla: t })} title="Editar" style={{ padding: '7px 9px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--muted)' }}><Pencil size={13} /></button>
                      <button onClick={() => setEliminando(t)} title="Eliminar" style={{ padding: '7px 9px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--red, #dc2626)' }}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {form && (
        <FormTablaMantenimiento
          tabla={form.tabla}
          miId={user?.id || null}
          onClose={() => setForm(null)}
          onSaved={invalidate}
        />
      )}

      {eliminando && (
        <Modal open onClose={() => setEliminando(null)} title="Eliminar tabla">
          <p style={{ fontSize: 13 }}>¿Eliminar la tabla de <strong>{eliminando.equipo}</strong>? Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEliminando(null)} style={GHOST}>Cancelar</button>
            <button onClick={() => eliminar(eliminando)} style={{ ...PRI, background: 'var(--red, #dc2626)' }}>🗑 Eliminar</button>
          </div>
        </Modal>
      )}
    </>
  )
}

function FormTablaMantenimiento({ tabla, miId, onClose, onSaved }: {
  tabla?: TablaMantenimiento, miId: string | null, onClose: () => void, onSaved: () => void,
}) {
  const [equipo, setEquipo] = useState(tabla?.equipo || '')
  const [parametro, setParametro] = useState(tabla?.parametro || '')
  const [filas, setFilas] = useState<FilaTablaMantenimiento[]>(tabla?.filas?.length ? tabla.filas : [{ lectura: '', estandar: '', tolerancia: '' }])
  const [saving, setSaving] = useState(false)

  function actualizarFila(i: number, campo: keyof FilaTablaMantenimiento, valor: string) {
    setFilas(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f))
  }
  function agregarFila() {
    setFilas(prev => [...prev, { lectura: '', estandar: '', tolerancia: '' }])
  }
  function quitarFila(i: number) {
    setFilas(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!equipo.trim()) { toast.error('Ingresa el equipo'); return }
    const filasValidas = filas.filter(f => f.lectura.trim() || f.estandar.trim() || f.tolerancia.trim())
    if (!filasValidas.length) { toast.error('Agrega al menos una fila'); return }
    setSaving(true)
    const payload = { equipo: equipo.trim(), parametro: parametro.trim() || null, filas: filasValidas }
    const { error } = tabla
      ? await actualizarTablaMantenimiento(tabla.id, payload)
      : await crearTablaMantenimiento({ ...payload, creadoPor: miId })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(tabla ? 'Tabla actualizada' : 'Tabla creada')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={tabla ? 'Editar tabla' : 'Nueva tabla de mantenimiento'} width={620}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FG label="Equipo">
          <input value={equipo} onChange={e => setEquipo(e.target.value)} placeholder="Ej. HI 98194" style={INP} autoFocus />
        </FG>
        <FG label="Parámetro (opcional)">
          <input value={parametro} onChange={e => setParametro(e.target.value)} placeholder="Ej. EC, OD, pH" style={INP} />
        </FG>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 8 }}>
          Filas (Lectura / Sol. Estándar / Tolerancia)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filas.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <input value={f.lectura} onChange={e => actualizarFila(i, 'lectura', e.target.value)} placeholder="Lectura" style={INP} />
              <input value={f.estandar} onChange={e => actualizarFila(i, 'estandar', e.target.value)} placeholder="Sol. Estándar" style={INP} />
              <input value={f.tolerancia} onChange={e => actualizarFila(i, 'tolerancia', e.target.value)} placeholder="Tolerancia" style={INP} />
              <button onClick={() => quitarFila(i)} disabled={filas.length === 1} title="Quitar fila" style={{ padding: '7px 9px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: filas.length === 1 ? 'not-allowed' : 'pointer', color: 'var(--muted)', opacity: filas.length === 1 ? .4 : 1 }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={agregarFila} style={{ ...GHOST, marginTop: 10 }}>+ Agregar fila</button>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : tabla ? '✓ Guardar cambios' : '+ Crear tabla'}</button>
      </div>
    </Modal>
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
