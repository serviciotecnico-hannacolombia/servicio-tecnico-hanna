import { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import {
  useOrdenesCalibracion, useOrdenParametros, useCatalogoRvCalibr, useHistorialOrden,
  useInvalidateCalibraciones, grupoEstado, ESTADO_LABEL, MODALIDAD_LABEL, CAMPO_LABEL,
  formatValorHistorial, estaVencido, proximoAVencer, logServiciosChange,
} from './hooks/useCalibraciones'
import { FG, Seccion, Grid2, Grid3, INP, PRI, GHOST, B_INFO, B_VENCIDA, B_PROXIMA, GRUPO_COLOR, fmtFecha } from './ui'
import type { EstadoCalibracion, Modalidad, OrdenCalibracion } from '../../types'

const PROVEEDORES_SUGERIDOS = ['METROLOGICAL CENTER', 'METRONIKA', 'METRILAB', 'CONAMET']

const EMPTY_ORDEN: Partial<OrdenCalibracion> = {
  cliente: '', numero_oc: '', correo_cliente: '', correo_asesor: '', saci: '', link_solicitud: '',
  otst: '', link_otst: '', codigo_recepcion: '', rmv_fv: '', modalidad: null, lugar_ejecucion: '',
  proveedor: '', estado: 'oc_creada', novedad_detalle: '', enviado_cliente_final: false,
  fecha_programada_envio: null, fecha_envio: null, nota_envio: '',
  certificado_fecha_inicio: null, certificado_fecha_fin: null,
  fecha_salida_lab: null, fecha_retorno: null, nota_retorno: '',
  fecha_llegada_hanna: null, fecha_entrega_certificado: null,
  carta_entrega: '', carta_certificado: '', parametros_nota: '', valor_oc_antes_iva: null,
}

const STAGES: { key: string, label: string, match: EstadoCalibracion[] }[] = [
  { key: 'oc_creada', label: 'OC creada', match: ['oc_creada', 'para_enviar', 'en_mantenimiento_reparacion'] },
  { key: 'enviado', label: 'Enviado', match: ['en_programacion_visita', 'visita_programada', 'enviado'] },
  { key: 'en_calibracion', label: 'En calibración', match: ['en_calibracion'] },
  { key: 'en_retorno', label: 'En retorno', match: ['en_retorno', 'recolectado_en_hanna', 'a_falta_certificado'] },
  { key: 'terminado', label: 'Terminado', match: ['terminado'] },
]

export function OrdenCalibracionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasCapability } = useUser()
  const puedeEditar = hasCapability('calibraciones_editar')
  const esNueva = id === 'nueva'

  const { data: ordenes = [], isLoading: cargandoOrdenes } = useOrdenesCalibracion()
  const orden = esNueva ? undefined : ordenes.find(o => o.id === id)
  const { data: catalogo = [] } = useCatalogoRvCalibr()
  const { data: parametrosActuales } = useOrdenParametros(orden?.id || null)
  const { data: historial = [], isLoading: cargandoHistorial } = useHistorialOrden(orden?.id || null)
  const { data: profiles = [] } = useProfiles()
  const invalidate = useInvalidateCalibraciones()

  const [form, setForm] = useState<Partial<OrdenCalibracion>>(orden || EMPTY_ORDEN)
  const [codigosSel, setCodigosSel] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { if (orden) setForm(orden) }, [orden])
  useEffect(() => { if (parametrosActuales) setCodigosSel(new Set(parametrosActuales.map(p => p.rv_calibr_codigo))) }, [parametrosActuales])

  const historialPorDia = useMemo(() => {
    const map = new Map<string, typeof historial>()
    for (const h of historial) {
      const dia = h.created_at.slice(0, 10)
      if (!map.has(dia)) map.set(dia, [])
      map.get(dia)!.push(h)
    }
    return [...map.entries()]
  }, [historial])

  const profileName = (uid: string | null) => {
    if (!uid) return 'Sistema'
    const p = profiles.find(x => x.id === uid)
    return p?.full_name || p?.email || 'Usuario'
  }

  const set = <K extends keyof OrdenCalibracion>(key: K, value: OrdenCalibracion[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const toggleCodigo = (codigo: string) => {
    setCodigosSel(prev => {
      const next = new Set(prev)
      next.has(codigo) ? next.delete(codigo) : next.add(codigo)
      return next
    })
  }

  async function submit() {
    if (!form.cliente?.trim()) { toast.error('Ingresa el cliente'); return }

    if (form.modalidad) {
      const noPermitidos = [...codigosSel].filter(c => {
        const item = catalogo.find(k => k.codigo === c)
        return item && !item.modalidades_permitidas.includes(form.modalidad!)
      })
      if (noPermitidos.length) {
        toast.error(`Estos servicios no aplican en la modalidad seleccionada: ${noPermitidos.join(', ')}`)
        return
      }
    }

    setSaving(true)
    const payload = {
      ...form,
      cliente: form.cliente!.trim(),
      numero_oc: form.numero_oc?.trim() || null,
      correo_cliente: form.correo_cliente?.trim() || null,
      correo_asesor: form.correo_asesor?.trim() || null,
      novedad_detalle: form.estado === 'novedad' ? (form.novedad_detalle?.trim() || null) : null,
      valor_oc_antes_iva: form.valor_oc_antes_iva || null,
    }
    delete (payload as Record<string, unknown>).id
    delete (payload as Record<string, unknown>).created_at
    delete (payload as Record<string, unknown>).updated_at
    delete (payload as Record<string, unknown>).asesor_id
    delete (payload as Record<string, unknown>).creado_por

    let ordenId = orden?.id
    const codigosAntes = new Set(parametrosActuales?.map(p => p.rv_calibr_codigo) || [])

    if (orden) {
      const { error } = await supabase.from('ordenes_calibracion')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', orden.id)
      if (error) { setSaving(false); toast.error('Error: ' + error.message); return }
    } else {
      const { data, error } = await supabase.from('ordenes_calibracion')
        .insert({ ...payload, creado_por: user?.id }).select('id').single()
      if (error) { setSaving(false); toast.error('Error: ' + error.message); return }
      ordenId = data.id
    }

    if (ordenId) {
      const agregados = [...codigosSel].filter(c => !codigosAntes.has(c))
      const quitados = [...codigosAntes].filter(c => !codigosSel.has(c))
      if (quitados.length) {
        const { error } = await supabase.from('ordenes_calibracion_parametros')
          .delete().eq('orden_id', ordenId).in('rv_calibr_codigo', quitados)
        if (error) toast.error('Error al quitar servicios: ' + error.message)
      }
      if (agregados.length) {
        const { error } = await supabase.from('ordenes_calibracion_parametros')
          .insert(agregados.map(codigo => ({ orden_id: ordenId, rv_calibr_codigo: codigo })))
        if (error) toast.error('Error al agregar servicios: ' + error.message)
      }
      await logServiciosChange(ordenId, codigosAntes, codigosSel)
    }

    setSaving(false)
    toast.success(orden ? 'Orden actualizada' : 'Orden creada')
    if (ordenId) { invalidate.historial(ordenId); invalidate.parametros(ordenId) }
    if (!orden && ordenId) {
      // Espera a que el refetch de la lista incluya la orden recién creada
      // antes de navegar — de lo contrario `orden` no se encuentra momentáneamente
      // y se muestra "esta orden no existe".
      await invalidate.ordenes()
      navigate(`/calibraciones/${ordenId}`, { replace: true })
    } else {
      invalidate.ordenes()
    }
  }

  async function eliminar() {
    if (!orden) return
    const { error } = await supabase.from('ordenes_calibracion').delete().eq('id', orden.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Orden eliminada')
    invalidate.ordenes()
    navigate('/calibraciones')
  }

  if (!esNueva && cargandoOrdenes) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner size={32} /></div>
  }
  if (!esNueva && !orden) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <p style={{ marginBottom: 16 }}>Esta orden no existe o no tienes acceso a ella.</p>
        <button onClick={() => navigate('/calibraciones')} style={GHOST}>← Volver a Calibraciones</button>
      </div>
    )
  }
  if (esNueva && !puedeEditar) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <p style={{ marginBottom: 16 }}>No tienes permisos para crear órdenes de calibración.</p>
        <button onClick={() => navigate('/calibraciones')} style={GHOST}>← Volver a Calibraciones</button>
      </div>
    )
  }

  const vencida = orden ? estaVencido(orden) : false
  const proxima = orden ? proximoAVencer(orden) : false
  const grupo = form.estado ? grupoEstado(form.estado as EstadoCalibracion) : 'pendiente'
  const grupoColor = GRUPO_COLOR[grupo]

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <button onClick={() => navigate('/calibraciones')} title="Volver" style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--muted)', cursor: 'pointer', flexShrink: 0, marginTop: 2,
          }}><ArrowLeft size={16} /></button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
              {esNueva ? 'Nueva orden de calibración' : form.cliente}
            </h1>
            {!esNueva && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {form.numero_oc && <span style={B_INFO}>{form.numero_oc}</span>}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20,
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  background: grupoColor.bg, color: grupoColor.text, border: `1px solid ${grupoColor.border}`,
                }}>{ESTADO_LABEL[form.estado as EstadoCalibracion]}</span>
                {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vencida</span>}
                {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Próxima a vencer</span>}
              </div>
            )}
          </div>
        </div>
        {puedeEditar && orden && (
          <button onClick={() => setEliminando(true)} title="Eliminar orden" style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--red)', cursor: 'pointer', flexShrink: 0,
          }}><Trash2 size={16} /></button>
        )}
      </div>

      {!esNueva && <Stepper estado={form.estado as EstadoCalibracion} />}

      <div style={{ display: 'grid', gridTemplateColumns: esNueva ? '1fr' : '1fr 340px', gap: 24, alignItems: 'flex-start' }}>
        {/* Formulario */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
          <fieldset disabled={!puedeEditar} style={{ border: 'none', padding: 0, margin: 0 }}>
            <Seccion titulo="Identificación">
              <Grid2>
                <FG label="Cliente"><input value={form.cliente || ''} onChange={e => set('cliente', e.target.value)} style={INP} autoFocus={esNueva} /></FG>
                <FG label="No. Orden de Compra"><input value={form.numero_oc || ''} onChange={e => set('numero_oc', e.target.value)} placeholder="Ej. ST211-2026" style={INP} /></FG>
                <FG label="Correo cliente"><input value={form.correo_cliente || ''} onChange={e => set('correo_cliente', e.target.value)} style={INP} /></FG>
                <FG label="Correo asesor(a)"><input value={form.correo_asesor || ''} onChange={e => set('correo_asesor', e.target.value)} style={INP} /></FG>
              </Grid2>
            </Seccion>

            <Seccion titulo="Referencias">
              <Grid2>
                <FG label="SACI"><input value={form.saci || ''} onChange={e => set('saci', e.target.value)} style={INP} /></FG>
                <FG label="Link solicitud SACI"><input value={form.link_solicitud || ''} onChange={e => set('link_solicitud', e.target.value)} style={INP} /></FG>
                <FG label="OTST"><input value={form.otst || ''} onChange={e => set('otst', e.target.value)} style={INP} /></FG>
                <FG label="Link OTST"><input value={form.link_otst || ''} onChange={e => set('link_otst', e.target.value)} style={INP} /></FG>
                <FG label="Código de recepción"><input value={form.codigo_recepcion || ''} onChange={e => set('codigo_recepcion', e.target.value)} style={INP} /></FG>
                <FG label="RMV/FV"><input value={form.rmv_fv || ''} onChange={e => set('rmv_fv', e.target.value)} style={INP} /></FG>
              </Grid2>
            </Seccion>

            <Seccion titulo="Proceso">
              <Grid2>
                <FG label="Modalidad">
                  <select value={form.modalidad || ''} onChange={e => set('modalidad', (e.target.value || null) as OrdenCalibracion['modalidad'])} style={INP}>
                    <option value="">Sin definir</option>
                    {(['laboratorio_externo', 'in_situ', 'sede_hanna_dorado'] as Modalidad[]).map(m => (
                      <option key={m} value={m}>{MODALIDAD_LABEL[m]}</option>
                    ))}
                  </select>
                </FG>
                <FG label="Proveedor (laboratorio)">
                  <input value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)} list="proveedores-sugeridos" style={INP} />
                  <datalist id="proveedores-sugeridos">{PROVEEDORES_SUGERIDOS.map(p => <option key={p} value={p} />)}</datalist>
                </FG>
                <FG label="Lugar de ejecución"><input value={form.lugar_ejecucion || ''} onChange={e => set('lugar_ejecucion', e.target.value)} style={INP} /></FG>
                <FG label="Estado">
                  <select value={form.estado} onChange={e => set('estado', e.target.value as EstadoCalibracion)} style={INP}>
                    {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </FG>
              </Grid2>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="enviado-cliente-final" checked={!!form.enviado_cliente_final} onChange={e => set('enviado_cliente_final', e.target.checked)} />
                <label htmlFor="enviado-cliente-final" style={{ fontSize: 13, color: 'var(--text)' }}>
                  El equipo ya se despachó al cliente (aunque la orden siga abierta)
                </label>
              </div>
              {form.estado === 'novedad' && (
                <div style={{ marginTop: 14 }}>
                  <FG label="Detalle de la novedad">
                    <textarea value={form.novedad_detalle || ''} onChange={e => set('novedad_detalle', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
                  </FG>
                </div>
              )}
            </Seccion>

            <Seccion titulo="Servicios RV CALIBR">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catalogo.filter(c => c.activo).map(c => {
                  const checked = codigosSel.has(c.codigo)
                  const permitido = !form.modalidad || c.modalidades_permitidas.includes(form.modalidad)
                  return (
                    <label key={c.codigo} title={c.descripcion} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
                      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'var(--accent-bg)' : 'var(--surface2)',
                      cursor: 'pointer', opacity: permitido ? 1 : 0.5, fontSize: 12.5,
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCodigo(c.codigo)} />
                      {c.codigo} — {c.magnitud}{!permitido && ' ⚠'}
                    </label>
                  )
                })}
              </div>
              <div style={{ marginTop: 14 }}>
                <FG label="Notas de parámetros (histórico / texto libre)">
                  <textarea value={form.parametros_nota || ''} onChange={e => set('parametros_nota', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
                </FG>
              </div>
            </Seccion>

            <Seccion titulo="Fechas del proceso">
              <Grid3>
                <FG label="Programada de envío"><input type="date" value={form.fecha_programada_envio || ''} onChange={e => set('fecha_programada_envio', e.target.value || null)} style={INP} /></FG>
                <FG label="Envío"><input type="date" value={form.fecha_envio || ''} onChange={e => set('fecha_envio', e.target.value || null)} style={INP} /></FG>
                <FG label="Nota de envío"><input value={form.nota_envio || ''} onChange={e => set('nota_envio', e.target.value)} style={INP} /></FG>
                <FG label="Certificados — inicio"><input type="date" value={form.certificado_fecha_inicio || ''} onChange={e => set('certificado_fecha_inicio', e.target.value || null)} style={INP} /></FG>
                <FG label="Certificados — fin"><input type="date" value={form.certificado_fecha_fin || ''} onChange={e => set('certificado_fecha_fin', e.target.value || null)} style={INP} /></FG>
                <FG label="Salida del laboratorio"><input type="date" value={form.fecha_salida_lab || ''} onChange={e => set('fecha_salida_lab', e.target.value || null)} style={INP} /></FG>
                <FG label="Retorno"><input type="date" value={form.fecha_retorno || ''} onChange={e => set('fecha_retorno', e.target.value || null)} style={INP} /></FG>
                <FG label="Nota de retorno"><input value={form.nota_retorno || ''} onChange={e => set('nota_retorno', e.target.value)} style={INP} /></FG>
                <FG label="Llegada a Hanna"><input type="date" value={form.fecha_llegada_hanna || ''} onChange={e => set('fecha_llegada_hanna', e.target.value || null)} style={INP} /></FG>
                <FG label="Entrega del certificado"><input type="date" value={form.fecha_entrega_certificado || ''} onChange={e => set('fecha_entrega_certificado', e.target.value || null)} style={INP} /></FG>
              </Grid3>
            </Seccion>

            <div style={{ marginBottom: 0 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14 }}>Documentos y comercial</h4>
              <Grid2>
                <FG label="Carta de entrega"><input value={form.carta_entrega || ''} onChange={e => set('carta_entrega', e.target.value)} style={INP} /></FG>
                <FG label="Carta del certificado"><input value={form.carta_certificado || ''} onChange={e => set('carta_certificado', e.target.value)} style={INP} /></FG>
                <FG label="Valor OC antes de IVA (COP)">
                  <input type="number" value={form.valor_oc_antes_iva ?? ''} onChange={e => set('valor_oc_antes_iva', e.target.value ? Number(e.target.value) : null)} style={INP} />
                </FG>
              </Grid2>
            </div>
          </fieldset>

          {puedeEditar && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => navigate('/calibraciones')} style={GHOST}>Cancelar</button>
              <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : esNueva ? '+ Crear orden' : '✓ Guardar cambios'}</button>
            </div>
          )}
        </div>

        {/* Historial */}
        {!esNueva && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, position: 'sticky', top: 20 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} /> Historial
            </h4>
            {cargandoHistorial ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando…</p>
            ) : historialPorDia.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Sin cambios registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: 640, overflowY: 'auto' }}>
                {historialPorDia.map(([dia, entradas]) => (
                  <div key={dia}>
                    <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                      {fmtFecha(dia)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                      {entradas.map(h => (
                        <div key={h.id} style={{ fontSize: 12.5 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <strong style={{ color: 'var(--text)' }}>{profileName(h.usuario_id)}</strong>
                            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10.5, flexShrink: 0 }}>
                              {h.created_at.slice(11, 16)}
                            </span>
                          </div>
                          <div style={{ color: 'var(--muted)', marginTop: 2 }}>
                            {h.campo === 'creacion' || h.campo === 'servicios' ? (
                              <span>{CAMPO_LABEL[h.campo]}{h.valor_nuevo ? `: ${h.valor_nuevo}` : ''}</span>
                            ) : (
                              <span>
                                {CAMPO_LABEL[h.campo] || h.campo}: <em style={{ fontStyle: 'normal', textDecoration: 'line-through', opacity: 0.7 }}>{formatValorHistorial(h.campo, h.valor_anterior)}</em> → <strong style={{ color: 'var(--text)' }}>{formatValorHistorial(h.campo, h.valor_nuevo)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {eliminando && orden && (
        <Modal open onClose={() => setEliminando(false)} title="Eliminar orden">
          <p style={{ fontSize: 13 }}>¿Eliminar la orden de <strong>{orden.cliente}</strong>{orden.numero_oc ? ` (${orden.numero_oc})` : ''}? Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEliminando(false)} style={GHOST}>Cancelar</button>
            <button onClick={eliminar} style={{ ...PRI, background: 'var(--red)' }}>🗑 Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stepper({ estado }: { estado: EstadoCalibracion }) {
  if (estado === 'novedad') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 'var(--radius)',
        background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <AlertTriangle size={16} /> Esta orden tiene una novedad activa — revisa el detalle en la sección Proceso.
      </div>
    )
  }

  const idx = STAGES.findIndex(s => s.match.includes(estado))

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, padding: '0 4px' }}>
      {STAGES.map((s, i) => (
        <Fragment key={s.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 90 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= idx ? 'var(--accent)' : 'var(--surface2)',
              color: i <= idx ? '#fff' : 'var(--muted)',
              border: `1px solid ${i <= idx ? 'var(--accent)' : 'var(--border)'}`,
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i <= idx ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--mono)', textAlign: 'center' }}>{s.label}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? 'var(--accent)' : 'var(--border)', marginTop: 13 }} />
          )}
        </Fragment>
      ))}
    </div>
  )
}
