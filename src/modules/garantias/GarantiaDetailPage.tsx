import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Ban, RotateCcw, Trash2, Settings } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import { linkOtst, parseOtstCodes } from '../equipos-sin-formato/hooks/useEquiposSinFormato'
import {
  useGarantias, useResponsablesGarantias, useInvalidateGarantias,
  crearGarantia, editarGarantia, actualizarGarantia,
  anularGarantia, reactivarGarantia, eliminarGarantia,
  ESTADO_LABEL_GAR, estadoInicial, flujoGarantia, fmtFecha, type GarantiaForm,
} from './hooks/useGarantias'
import { StepperGAR } from './StepperGAR'
import { HistorialSidebarGAR } from './HistorialSidebarGAR'
import { ResponsablesConfigModal } from './ResponsablesConfigModal'
import { VistaPncPendiente } from './vistas/VistaPncPendiente'
import { VistaNV } from './vistas/VistaNV'
import { VistaImportacion } from './vistas/VistaImportacion'
import { VistaInforme, VistaFinalizada } from './vistas/VistaInforme'
import { FG, INP, PRI, GHOST, SemaforoGarantia } from './ui'
import type { Garantia } from '../../types'

const FORM_VACIO: GarantiaForm = {
  cliente: '', referencia: '', otst: '', asesor_correo: '', responsables: [],
  hay_stock: true, numero_pnc: '', fecha_limite_entrega: '',
}

const ICON_BTN: React.CSSProperties = {
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer',
}

export function GarantiaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasCapability, isAdmin } = useUser()
  const puedeEditar = hasCapability('garantias_editar')
  const esNueva = id === 'nueva'

  const { data: garantias = [], isLoading } = useGarantias()
  const { data: asesores = [] } = useAsesores()
  const responsablesST = useResponsablesGarantias()
  const [configResponsables, setConfigResponsables] = useState(false)
  const { data: profiles = [] } = useProfiles()
  const { invalidate, invalidateDetalle } = useInvalidateGarantias()

  const garantia = esNueva ? undefined : garantias.find(g => g.id === id)
  const asesorNombre = garantia ? (asesores.find(a => a.correo === garantia.asesor_correo)?.nombre || garantia.asesor_correo) : ''
  const nombreResponsable = new Map(profiles.map(p => [p.id, p.full_name || p.email]))
  const puedeAvanzar = puedeEditar && !garantia?.anulada

  // Stepper: null = paso actual (en vivo); se resetea al cambiar de garantía.
  const [seleccion, setSeleccion] = useState<{ id: string | undefined, idx: number | null }>({ id, idx: null })
  const vistaIdx = seleccion.id === id ? seleccion.idx : null
  const setVistaIdx = (idx: number | null) => setSeleccion({ id, idx })
  const pasos = garantia ? flujoGarantia(garantia.hay_stock) : []
  const idxActual = garantia ? pasos.indexOf(garantia.estado) : -1
  const idxMostrado = vistaIdx ?? idxActual
  const pasoMostrado = idxMostrado >= 0 ? pasos[idxMostrado] : undefined
  const soloLectura = idxMostrado !== idxActual

  // ── Formulario de creación / edición ─────────────────────────────────────
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<GarantiaForm>(FORM_VACIO)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof GarantiaForm>(campo: K, valor: GarantiaForm[K]) => setForm(prev => ({ ...prev, [campo]: valor }))
  // La ruta solo se puede cambiar mientras la garantía siga en su primer paso.
  const puedeCambiarRuta = esNueva || garantia?.estado === 'nv' || garantia?.estado === 'pnc_pendiente'

  function iniciarEdicion() {
    if (!garantia) return
    setForm({
      cliente: garantia.cliente, referencia: garantia.referencia, otst: garantia.otst || '',
      asesor_correo: garantia.asesor_correo, responsables: garantia.responsables,
      hay_stock: garantia.hay_stock, numero_pnc: '', fecha_limite_entrega: '',
    })
    setEditando(true)
  }

  function toggleResponsable(profileId: string) {
    set('responsables', form.responsables.includes(profileId)
      ? form.responsables.filter(r => r !== profileId)
      : [...form.responsables, profileId])
  }

  function validar(): boolean {
    if (!form.cliente.trim()) { toast.error('Ingresa el cliente'); return false }
    if (!form.referencia.trim()) { toast.error('Ingresa la referencia'); return false }
    if (!form.asesor_correo) { toast.error('Selecciona el asesor comercial'); return false }
    if (esNueva && form.hay_stock && form.numero_pnc.trim() && !form.fecha_limite_entrega) {
      toast.error('Con PNC, ingresa también la fecha límite de entrega'); return false
    }
    return true
  }

  async function crear() {
    if (!validar()) return
    setSaving(true)
    const { data, error } = await crearGarantia(form, user?.id || null)
    setSaving(false)
    if (error || !data) { toast.error('Error: ' + error?.message); return }
    toast.success(`Garantía GAR-${data.numero} creada — ${ESTADO_LABEL_GAR[data.estado]}`)
    invalidate()
    navigate(`/garantias/${data.id}`, { replace: true })
  }

  async function guardarEdicion() {
    if (!garantia || !validar()) return
    setSaving(true)
    const { error } = await editarGarantia(garantia.id, form, form.hay_stock !== garantia.hay_stock)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Garantía actualizada')
    invalidate()
    invalidateDetalle(garantia.id)
    setVistaIdx(null)
    setEditando(false)
  }

  async function onActualizar(overrides: Partial<Garantia>, mensaje: string): Promise<boolean> {
    if (!garantia) return false
    const { error } = await actualizarGarantia(garantia.id, overrides)
    if (error) { toast.error('Error: ' + error.message); return false }
    toast.success(mensaje)
    invalidate()
    invalidateDetalle(garantia.id)
    return true
  }

  // ── Anular / Reactivar / Eliminar ────────────────────────────────────────
  const [anulando, setAnulando] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [eliminando, setEliminando] = useState(false)

  async function confirmarAnular() {
    if (!garantia) return
    if (!motivoAnulacion.trim()) { toast.error('Ingresa el motivo de la anulación'); return }
    const { error } = await anularGarantia(garantia.id, motivoAnulacion)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Garantía anulada')
    invalidate()
    invalidateDetalle(garantia.id)
    setAnulando(false)
    setMotivoAnulacion('')
  }

  async function confirmarReactivar() {
    if (!garantia || !confirm('¿Reactivar esta garantía?')) return
    const { error } = await reactivarGarantia(garantia.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Garantía reactivada')
    invalidate()
    invalidateDetalle(garantia.id)
  }

  async function confirmarEliminar() {
    if (!garantia) return
    const { error } = await eliminarGarantia(garantia.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Garantía eliminada')
    invalidate()
    navigate('/garantias')
  }

  if (!esNueva && isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  }
  if (!esNueva && !garantia) {
    return <Card><p style={{ color: 'var(--muted)' }}>Garantía no encontrada.</p></Card>
  }
  if (esNueva && !puedeEditar) {
    return <Card><p style={{ color: 'var(--muted)' }}>No tienes permiso para crear garantías.</p></Card>
  }

  function renderFormulario() {
    const destino = esNueva ? estadoInicial(form) : null
    return (
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
          {esNueva ? 'Nueva garantía' : `Editar GAR-${garantia?.numero}`}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <FG label="Cliente" required>
            <input value={form.cliente} onChange={e => set('cliente', e.target.value.toUpperCase())} placeholder="Ej. LABORATORIOS ABC S.A.S." style={INP} autoFocus />
          </FG>
          <FG label="Referencia" required>
            <input value={form.referencia} onChange={e => set('referencia', e.target.value.toUpperCase())} placeholder="Ej. HI98107" style={INP} />
          </FG>
          <FG label="OTST">
            <input value={form.otst} onChange={e => set('otst', e.target.value)} placeholder="Ej. 41784 (separados por coma si son varios)" style={INP} />
          </FG>
          <FG label="Asesor comercial" required>
            <select value={form.asesor_correo} onChange={e => set('asesor_correo', e.target.value)} style={INP}>
              <option value="">Selecciona...</option>
              {asesores.map(a => <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>)}
            </select>
          </FG>
        </div>

        <div style={{ marginTop: 16 }}>
          <FG label="Responsables (Servicio Técnico)">
            {isAdmin && (
              <button type="button" onClick={() => setConfigResponsables(true)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', color: 'var(--accent)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                <Settings size={12} /> Configurar quiénes aparecen aquí
              </button>
            )}
            {responsablesST.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>No hay responsables habilitados{isAdmin ? ' — usa "Configurar" para agregarlos.' : '. Pídele al administrador que los configure.'}</p>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {responsablesST.map(p => {
                  const activo = form.responsables.includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggleResponsable(p.id)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer',
                      border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                      background: activo ? 'var(--accent)' : 'var(--surface2)',
                      color: activo ? '#fff' : 'var(--text)', fontWeight: activo ? 600 : 400,
                    }}>
                      {activo ? '✓ ' : ''}{p.full_name || p.email}
                    </button>
                  )
                })}
              </div>
            )}
          </FG>
        </div>

        <div style={{ marginTop: 16 }}>
          <FG label="¿Hay stock?" required>
            <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, opacity: puedeCambiarRuta ? 1 : .6 }}>
              {([[true, 'Hay stock'], [false, 'No hay stock']] as [boolean, string][]).map(([v, label]) => (
                <button key={label} type="button" disabled={!puedeCambiarRuta} onClick={() => set('hay_stock', v)} style={{
                  padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 12.5, fontFamily: 'var(--sans)',
                  cursor: puedeCambiarRuta ? 'pointer' : 'not-allowed',
                  fontWeight: form.hay_stock === v ? 600 : 500,
                  background: form.hay_stock === v ? 'var(--accent)' : 'transparent',
                  color: form.hay_stock === v ? '#fff' : 'var(--muted)',
                }}>{label}</button>
              ))}
            </div>
          </FG>
          {!puedeCambiarRuta && (
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>La ruta ya no se puede cambiar porque la garantía avanzó.</p>
          )}
          {!esNueva && puedeCambiarRuta && garantia && form.hay_stock !== garantia.hay_stock && (
            <p style={{ fontSize: 11.5, color: 'var(--yellow)', marginTop: 6 }}>
              Al guardar la garantía pasa a {form.hay_stock ? '"PNC pendiente"' : '"NV"'}.
            </p>
          )}
        </div>

        {esNueva && form.hay_stock && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)' }}>
            <FG label="PNC (producto no conforme)">
              <input value={form.numero_pnc} onChange={e => set('numero_pnc', e.target.value.toUpperCase())} placeholder="Opcional — si aún no existe, queda pendiente" style={INP} />
            </FG>
            <FG label="Fecha límite de entrega" required={!!form.numero_pnc.trim()}>
              <input type="date" value={form.fecha_limite_entrega} onChange={e => set('fecha_limite_entrega', e.target.value)} style={INP} />
            </FG>
          </div>
        )}

        {destino && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            Al crear, la garantía queda en <strong style={{ color: 'var(--text)' }}>{ESTADO_LABEL_GAR[destino]}</strong>.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={() => esNueva ? navigate('/garantias') : setEditando(false)} style={GHOST}>Cancelar</button>
          <button onClick={esNueva ? crear : guardarEdicion} disabled={saving} style={PRI}>
            {saving ? 'Guardando…' : esNueva ? '+ Crear garantía' : '✓ Guardar cambios'}
          </button>
        </div>
      </Card>
    )
  }

  function renderVista(g: Garantia) {
    const props = { garantia: g, puedeEditar: puedeAvanzar, soloLectura, onActualizar }
    switch (pasoMostrado) {
      case 'registro':
        return (
          <Card>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Registrada el {new Date(g.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — {g.hay_stock ? 'con stock' : 'sin stock (ruta de importación)'}.
            </p>
          </Card>
        )
      // key por garantía+paso: los formularios de cada vista se inicializan
      // desde la garantía y deben reiniciarse al cambiar de paso.
      case 'pnc_pendiente': return <VistaPncPendiente key={`${g.id}-pnc-${g.updated_at}`} {...props} />
      case 'nv': return <VistaNV key={`${g.id}-nv-${g.updated_at}`} {...props} />
      case 'importacion': return <VistaImportacion key={`${g.id}-imp-${g.updated_at}`} {...props} />
      case 'informe': return <VistaInforme {...props} />
      case 'finalizada': return <VistaFinalizada garantia={g} />
      default: return null
    }
  }

  return (
    <div>
      <button onClick={() => navigate('/garantias')} style={{ ...GHOST, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Volver
      </button>

      {esNueva ? renderFormulario() : garantia && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {editando ? renderFormulario() : (
              <>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>
                        GAR-{garantia.numero} — {ESTADO_LABEL_GAR[garantia.estado]}
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{garantia.cliente}</h3>
                      <div style={{ marginTop: 6 }}><SemaforoGarantia garantia={garantia} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {puedeEditar && (
                        <button onClick={iniciarEdicion} title="Editar" style={{ ...ICON_BTN, color: 'var(--muted)' }}><Pencil size={15} /></button>
                      )}
                      {puedeEditar && !garantia.anulada && (
                        <button onClick={() => setAnulando(true)} title="Anular garantía" style={{ ...ICON_BTN, color: 'var(--red)' }}><Ban size={15} /></button>
                      )}
                      {puedeEditar && garantia.anulada && (
                        <button onClick={confirmarReactivar} title="Reactivar garantía" style={{ ...ICON_BTN, color: 'var(--accent)' }}><RotateCcw size={15} /></button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setEliminando(true)} title="Eliminar permanentemente (solo Admin)" style={{ ...ICON_BTN, color: 'var(--red)' }}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Referencia: <strong>{garantia.referencia}</strong></span>
                    <span>OTST:{' '}
                      {parseOtstCodes(garantia.otst).length === 0 ? <strong>—</strong> : parseOtstCodes(garantia.otst).map((c, i) => (
                        <span key={c}>{i > 0 && ', '}<a href={linkOtst(c)!} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'var(--accent)' }}>{c}</a></span>
                      ))}
                    </span>
                    <span>Asesor: <strong>{asesorNombre}</strong></span>
                    <span>Stock: <strong>{garantia.hay_stock ? 'Sí' : 'No'}</strong></span>
                    {garantia.fecha_seguimiento && <span>Seguimiento: <strong>{fmtFecha(garantia.fecha_seguimiento)}</strong></span>}
                    {garantia.fecha_limite_entrega && <span>Entrega: <strong>{fmtFecha(garantia.fecha_limite_entrega)}</strong></span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                    Responsables:{' '}
                    {garantia.responsables.length === 0
                      ? <em>sin asignar</em>
                      : <strong style={{ color: 'var(--text)' }}>{garantia.responsables.map(r => nombreResponsable.get(r) || 'Usuario').join(', ')}</strong>}
                  </div>
                </Card>

                {garantia.anulada && (
                  <div style={{ padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Garantía anulada</div>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{garantia.motivo_anulacion}</div>
                  </div>
                )}

                <StepperGAR pasos={pasos} idxActual={idxActual} idxMostrado={idxMostrado} onSeleccionar={setVistaIdx} />
                {renderVista(garantia)}
              </>
            )}
          </div>

          <HistorialSidebarGAR garantiaId={garantia.id} />
        </div>
      )}

      {configResponsables && <ResponsablesConfigModal onClose={() => setConfigResponsables(false)} />}

      {anulando && garantia && (
        <Modal open onClose={() => setAnulando(false)} title="Anular garantía">
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            La garantía queda marcada como anulada — no se borra ni pierde su historial, y se puede reactivar.
          </p>
          <FG label="Motivo de la anulación" required>
            <textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} rows={3} autoFocus style={{ ...INP, resize: 'vertical' }} />
          </FG>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setAnulando(false)} style={GHOST}>Cancelar</button>
            <button onClick={confirmarAnular} style={{ ...PRI, background: 'var(--red)' }}>⊘ Anular garantía</button>
          </div>
        </Modal>
      )}

      {eliminando && garantia && (
        <Modal open onClose={() => setEliminando(false)} title="Eliminar garantía permanentemente">
          <p style={{ fontSize: 13 }}>
            ¿Eliminar <strong>GAR-{garantia.numero} — {garantia.cliente}</strong>? Esto borra también su historial y notas — no se puede deshacer.
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
