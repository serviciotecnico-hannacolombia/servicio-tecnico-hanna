import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Pencil, Ban, RotateCcw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useUser } from '../../hooks/useUser'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import {
  useEquiposSinFormato, useEquiposSinFormatoItems, useInvalidateEquiposSinFormato,
  crearEquipoSinFormato, editarEquipoSinFormato, avanzarEquipoSinFormato,
  anularEquipoSinFormato, reactivarEquipoSinFormato, eliminarEquipoSinFormato,
  ESTADO_LABEL_SF,
} from './hooks/useEquiposSinFormato'
import { generarMailtoSinFormato } from './correo'
import { VistaPendiente } from './vistas/VistaPendiente'
import { VistaPreingresado } from './vistas/VistaPreingresado'
import { VistaIngresado } from './vistas/VistaIngresado'
import { StepperSF, FLUJO_SF } from './StepperSF'
import { HistorialSidebarSF } from './HistorialSidebarSF'
import { FG, INP, PRI, GHOST } from './ui'
import type { EquipoSinFormatoItem } from '../../types'

interface ItemForm { referencia: string, serial: string, observaciones: string }
const ITEM_VACIO: ItemForm = { referencia: '', serial: '', observaciones: '' }

export function EquipoSinFormatoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasCapability, isAdmin } = useUser()
  const puedeEditar = hasCapability('equipos_sin_formato_editar')
  const esNueva = id === 'nueva'

  const { data: registros = [], isLoading } = useEquiposSinFormato()
  const { data: allItems = [] } = useEquiposSinFormatoItems()
  const { data: asesores = [] } = useAsesores()
  const { invalidate, invalidateHistorial } = useInvalidateEquiposSinFormato()

  const registro = esNueva ? undefined : registros.find(r => r.id === id)
  const items = registro ? allItems.filter(i => i.equipo_sf_id === registro.id) : []
  const asesorNombre = registro ? (asesores.find(a => a.correo === registro.asesor_correo)?.nombre || registro.asesor_correo) : ''
  // Anulado sigue viéndose y se puede reactivar/editar, pero no avanzar de estado.
  const puedeAvanzar = puedeEditar && !registro?.anulada

  // Índice del paso que se está viendo en el stepper — null = el actual
  // (en vivo). Se resetea al cambiar de registro para no arrastrar la
  // selección de un registro anterior.
  const [vistaIdx, setVistaIdx] = useState<number | null>(null)
  useEffect(() => { setVistaIdx(null) }, [id])
  const idxActual = registro ? FLUJO_SF.findIndex(s => s.key === registro.estado) : -1
  const idxMostrado = vistaIdx ?? idxActual
  const etapaMostrada = idxMostrado >= 0 ? FLUJO_SF[idxMostrado] : undefined
  const soloLectura = idxMostrado !== idxActual

  // ── Formulario de creación / edición ─────────────────────────────────────
  const [editando, setEditando] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [fechaLlegada, setFechaLlegada] = useState(new Date().toISOString().slice(0, 10))
  const [modoLlegada, setModoLlegada] = useState('')
  const [asesorCorreo, setAsesorCorreo] = useState('')
  const [itemsForm, setItemsForm] = useState<ItemForm[]>([ITEM_VACIO])
  const [saving, setSaving] = useState(false)

  function iniciarEdicion() {
    if (!registro) return
    setRazonSocial(registro.razon_social)
    setFechaLlegada(registro.fecha_llegada)
    setModoLlegada(registro.modo_llegada || '')
    setAsesorCorreo(registro.asesor_correo)
    setItemsForm(items.length
      ? items.map(it => ({ referencia: it.referencia, serial: it.serial || '', observaciones: it.observaciones || '' }))
      : [ITEM_VACIO])
    setEditando(true)
  }

  function actualizarItem(i: number, campo: keyof ItemForm, valor: string) {
    setItemsForm(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }
  function agregarItem() {
    setItemsForm(prev => [...prev, ITEM_VACIO])
  }
  function quitarItem(i: number) {
    setItemsForm(prev => prev.filter((_, idx) => idx !== i))
  }

  function validarFormulario(): boolean {
    if (!razonSocial.trim()) { toast.error('Ingresa la razón social'); return false }
    if (!fechaLlegada) { toast.error('Ingresa la fecha de llegada'); return false }
    if (!modoLlegada.trim()) { toast.error('Ingresa el modo de llegada'); return false }
    if (!asesorCorreo) { toast.error('Selecciona el asesor'); return false }
    if (itemsForm.some(it => !it.referencia.trim() || !it.serial.trim())) {
      toast.error('Completa la referencia y el serial de todos los equipos')
      return false
    }
    return true
  }

  async function crear() {
    if (!validarFormulario()) return
    setSaving(true)
    const { data, error } = await crearEquipoSinFormato(
      { razon_social: razonSocial.trim(), fecha_llegada: fechaLlegada, modo_llegada: modoLlegada.trim(), asesor_correo: asesorCorreo, creado_por: user?.id || null },
      itemsForm,
    )
    setSaving(false)
    if (error || !data) { toast.error('Error: ' + error?.message); return }

    toast.success('Registro creado')
    invalidate()
    window.location.href = generarMailtoSinFormato(data, itemsForm, asesorCorreo)
    navigate(`/equipos-sin-formato/${data.id}`, { replace: true })
  }

  async function guardarEdicion() {
    if (!registro || !validarFormulario()) return
    setSaving(true)
    const { error } = await editarEquipoSinFormato(
      registro.id,
      { razon_social: razonSocial.trim(), fecha_llegada: fechaLlegada, modo_llegada: modoLlegada.trim(), asesor_correo: asesorCorreo },
      items.map(it => ({ referencia: it.referencia, serial: it.serial || '', observaciones: it.observaciones || '' })),
      itemsForm,
    )
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Registro actualizado')
    invalidate()
    invalidateHistorial(registro.id)
    setEditando(false)
  }

  async function onAvanzar(overrides: Record<string, unknown>) {
    if (!registro) return
    const { error } = await avanzarEquipoSinFormato(registro.id, overrides)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Estado actualizado')
    invalidate()
  }

  function reenviarCorreo() {
    if (!registro) return
    window.location.href = generarMailtoSinFormato(registro, items.map(it => ({ referencia: it.referencia, serial: it.serial || '', observaciones: it.observaciones || '' })), registro.asesor_correo)
  }

  // ── Anular / Reactivar / Eliminar ────────────────────────────────────────
  const [anulando, setAnulando] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [guardandoAnulacion, setGuardandoAnulacion] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function confirmarAnular() {
    if (!registro) return
    if (!motivoAnulacion.trim()) { toast.error('Ingresa el motivo de la anulación'); return }
    setGuardandoAnulacion(true)
    const { error } = await anularEquipoSinFormato(registro.id, motivoAnulacion)
    setGuardandoAnulacion(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Registro anulado')
    invalidate()
    invalidateHistorial(registro.id)
    setAnulando(false)
    setMotivoAnulacion('')
  }

  async function confirmarReactivar() {
    if (!registro) return
    if (!confirm('¿Reactivar este registro?')) return
    const { error } = await reactivarEquipoSinFormato(registro.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Registro reactivado')
    invalidate()
    invalidateHistorial(registro.id)
  }

  async function confirmarEliminar() {
    if (!registro) return
    const { error } = await eliminarEquipoSinFormato(registro.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Registro eliminado')
    navigate('/equipos-sin-formato')
  }

  if (!esNueva && isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  }
  if (!esNueva && !registro) {
    return <Card><p style={{ color: 'var(--muted)' }}>Registro no encontrado.</p></Card>
  }

  function renderFormulario() {
    return (
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
          {esNueva ? 'Nuevo registro — Equipo Sin Formato' : `Editar SF-${registro?.numero}`}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FG label="Razón social" required>
            <input value={razonSocial} onChange={e => setRazonSocial(e.target.value.toUpperCase())} placeholder="Ej. PINTURAS DAVINCI S.A.S." style={INP} autoFocus />
          </FG>
          <FG label="Asesor" required>
            <select value={asesorCorreo} onChange={e => setAsesorCorreo(e.target.value)} style={INP}>
              <option value="">Selecciona...</option>
              {asesores.map(a => <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>)}
            </select>
          </FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <FG label="Fecha de llegada" required>
            <input type="date" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} style={INP} />
          </FG>
          <FG label="Modo de llegada" required>
            <input value={modoLlegada} onChange={e => setModoLlegada(e.target.value)} placeholder="Ej. Guía TCC #12314221, dejado en bodega por el cliente..." style={INP} />
          </FG>
        </div>

        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginTop: 24, marginBottom: 14 }}>
          Equipos
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {itemsForm.map((it, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FG label="Referencia" required>
                  <input value={it.referencia} onChange={e => actualizarItem(i, 'referencia', e.target.value.toUpperCase())} placeholder="Ej. HI2620" style={INP} />
                </FG>
                <FG label="Serial" required>
                  <input value={it.serial} onChange={e => actualizarItem(i, 'serial', e.target.value.toUpperCase())} placeholder="Ej. C0107019" style={INP} />
                </FG>
              </div>
              <div style={{ marginTop: 12 }}>
                <FG label="Observaciones">
                  <input value={it.observaciones} onChange={e => actualizarItem(i, 'observaciones', e.target.value)} placeholder="Opcional..." style={INP} />
                </FG>
              </div>
              {itemsForm.length > 1 && (
                <button onClick={() => quitarItem(i)} style={{ ...GHOST, marginTop: 10, color: 'var(--red)', padding: '6px 12px', fontSize: 12 }}>
                  <Trash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Quitar equipo
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={agregarItem} style={{ ...GHOST, marginTop: 12 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Agregar otro equipo</button>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={() => esNueva ? navigate('/equipos-sin-formato') : setEditando(false)} style={GHOST}>Cancelar</button>
          <button onClick={esNueva ? crear : guardarEdicion} disabled={saving} style={PRI}>
            {saving ? 'Guardando…' : esNueva ? '+ Crear y notificar' : '✓ Guardar cambios'}
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <button onClick={() => navigate('/equipos-sin-formato')} style={{ ...GHOST, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Volver
      </button>

      {esNueva ? renderFormulario() : registro && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {editando ? renderFormulario() : (
              <>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>SF-{registro.numero} — {ESTADO_LABEL_SF[registro.estado]}</div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{registro.razon_social}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {puedeEditar && registro.estado === 'pendiente' && (
                        <button onClick={reenviarCorreo} style={GHOST}>✉ Reenviar correo</button>
                      )}
                      {puedeEditar && (
                        <button onClick={iniciarEdicion} title="Editar" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer' }}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {puedeEditar && !registro.anulada && (
                        <button onClick={() => setAnulando(true)} title="Anular registro" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--red)', cursor: 'pointer' }}>
                          <Ban size={15} />
                        </button>
                      )}
                      {puedeEditar && registro.anulada && (
                        <button onClick={confirmarReactivar} title="Reactivar registro" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer' }}>
                          <RotateCcw size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setEliminando(true)} title="Eliminar permanentemente (solo Admin)" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--red)', cursor: 'pointer' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Asesor: <strong>{asesorNombre}</strong></span>
                    <span>Fecha de llegada: <strong>{registro.fecha_llegada}</strong></span>
                    {registro.modo_llegada && <span>Modo de llegada: <strong>{registro.modo_llegada}</strong></span>}
                  </div>
                </Card>

                {registro.anulada && (
                  <div style={{ padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Registro anulado</div>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{registro.motivo_anulacion}</div>
                  </div>
                )}

                <StepperSF estado={registro.estado} idxActual={idxActual} idxMostrado={idxMostrado} onSeleccionar={setVistaIdx} />

                <Card>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>Equipos</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((it: EquipoSinFormatoItem) => (
                      <div key={it.id} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface2)', fontSize: 12.5 }}>
                        <strong>{it.referencia}</strong>{it.serial && <> — Serial: <span style={{ fontFamily: 'var(--mono)' }}>{it.serial}</span></>}
                        {it.observaciones && <div style={{ color: 'var(--muted)', marginTop: 4 }}>{it.observaciones}</div>}
                      </div>
                    ))}
                  </div>
                </Card>

                {etapaMostrada?.key === 'recibido' ? (
                  <Card>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Recibido el {new Date(registro.fecha_recibido).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — correo enviado al asesor.
                    </p>
                  </Card>
                ) : etapaMostrada?.key === 'pendiente' ? (
                  <VistaPendiente registro={registro} puedeEditar={puedeAvanzar} soloLectura={soloLectura} onAvanzar={onAvanzar} />
                ) : etapaMostrada?.key === 'preingresado' ? (
                  <VistaPreingresado registro={registro} puedeEditar={puedeAvanzar} soloLectura={soloLectura} onAvanzar={onAvanzar} />
                ) : etapaMostrada?.key === 'ingresado' ? (
                  <VistaIngresado registro={registro} />
                ) : null}
              </>
            )}
          </div>

          <HistorialSidebarSF equipoSfId={registro.id} />
        </div>
      )}

      {anulando && registro && (
        <Modal open onClose={() => setAnulando(false)} title="Anular registro">
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            El registro queda marcado como anulado — no se borra ni pierde su historial, y se puede reactivar en cualquier momento.
          </p>
          <FG label="Motivo de la anulación" required>
            <textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} rows={3} autoFocus style={{ ...INP, resize: 'vertical' }} />
          </FG>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setAnulando(false)} style={GHOST}>Cancelar</button>
            <button onClick={confirmarAnular} disabled={guardandoAnulacion} style={{ ...PRI, background: 'var(--red)' }}>
              {guardandoAnulacion ? 'Guardando…' : '⊘ Anular registro'}
            </button>
          </div>
        </Modal>
      )}

      {eliminando && registro && (
        <Modal open onClose={() => setEliminando(false)} title="Eliminar registro permanentemente">
          <p style={{ fontSize: 13 }}>
            ¿Eliminar el registro <strong>SF-{registro.numero} — {registro.razon_social}</strong>? Esto borra también su historial y sus equipos — no se puede deshacer.
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Para el uso normal, usa "Anular" en vez de esto — conserva el historial y se puede reactivar.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEliminando(false)} style={GHOST}>Cancelar</button>
            <button onClick={confirmarEliminar} style={{ ...PRI, background: 'var(--red)' }}>🗑 Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
