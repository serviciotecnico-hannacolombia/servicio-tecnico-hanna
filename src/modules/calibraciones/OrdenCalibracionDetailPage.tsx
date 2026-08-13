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
  useOrdenesCalibracion, useOrdenParametros, useCatalogoRvCalibr, useAsesores, useProveedores, useHistorialOrden,
  useInvalidateCalibraciones, grupoEstado, ESTADO_LABEL, MODALIDAD_LABEL, CAMPO_LABEL,
  formatValorHistorial, estaVencido, proximoAVencer, logServiciosChange,
  flujoPorModalidad, PROVEEDOR_SEDE_HANNA, miercolesSiguiente,
} from './hooks/useCalibraciones'
import type { EtapaFlujo } from './hooks/useCalibraciones'
import { FG, Seccion, Grid2, INP, PRI, GHOST, B_INFO, B_VENCIDA, B_PROXIMA, GRUPO_COLOR, fmtFecha } from './ui'
import { IdentificacionFields, ReferenciasFields, linkOtst, parseOtstCodes } from './vistas/CamposCompartidos'
import { VistaMantenimiento } from './vistas/VistaMantenimiento'
import { VistaVisitaProgramada } from './vistas/VistaVisitaProgramada'
import { VistaParaEnviar } from './vistas/VistaParaEnviar'
import { VistaEnviado } from './vistas/VistaEnviado'
import { VistaEnCalibracion } from './vistas/VistaEnCalibracion'
import { VistaEnCalibracionSitio } from './vistas/VistaEnCalibracionSitio'
import { VistaEnRetorno } from './vistas/VistaEnRetorno'
import { VistaControlCalidad } from './vistas/VistaControlCalidad'
import { VistaCargaAlSistema } from './vistas/VistaCargaAlSistema'
import { VistaEnvioCertificados } from './vistas/VistaEnvioCertificados'
import { VistaTerminado } from './vistas/VistaTerminado'
import type { EstadoCalibracion, Modalidad, OrdenCalibracion } from '../../types'

// `created_at` llega en UTC — cortar el string directo mostraba la hora UTC
// en vez de la hora local (Colombia = UTC-5).
function fechaLocalISO(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function horaLocal(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function segBtnStyle(activo: boolean, deshabilitado?: boolean): React.CSSProperties {
  return {
    padding: '7px 13px', border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8,
    cursor: deshabilitado ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: activo ? 600 : 500,
    fontFamily: 'var(--sans)', background: activo ? 'var(--accent-bg)' : 'var(--surface)',
    color: activo ? 'var(--accent)' : 'var(--text)', opacity: deshabilitado ? 0.5 : 1,
  }
}

const EMPTY_ORDEN: Partial<OrdenCalibracion> = {
  cliente: '', numero_oc: '', correo_cliente: '', correo_asesor: '', saci: '', link_solicitud: '',
  otst: '', link_otst: '', codigo_recepcion: '', rmv_fv: '', modalidad: null, lugar_ejecucion: '',
  proveedor: '', estado: 'oc_creada', novedad_detalle: '', enviado_cliente_final: false,
  cantidad_equipos: null,
  fecha_salida_mantenimiento: null,
  fecha_salida_mantenimiento_real: null, nota_mantenimiento: '',
  fecha_programada_envio: null, fecha_llegada_metrologo: null, fecha_envio: null, nota_envio: '',
  codigos_certificados: '',
  certificado_fecha_inicio: null, certificado_fecha_fin: null,
  fecha_salida_lab: null, fecha_retorno: null, nota_retorno: '',
  fecha_llegada_hanna: null, fecha_entrega_certificado: null,
  carta_entrega: '', carta_certificado: '',
  fecha_control_calidad: null, notas_control_calidad: '',
  parametros_nota: '', valor_oc_antes_iva: null,
}

export function OrdenCalibracionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasCapability } = useUser()
  const puedeEditar = hasCapability('calibraciones_editar')
  const esNueva = id === 'nueva'

  const { data: ordenes = [], isLoading: cargandoOrdenes } = useOrdenesCalibracion()
  const orden = esNueva ? undefined : ordenes.find(o => o.id === id)
  const { data: catalogo = [] } = useCatalogoRvCalibr()
  const { data: asesores = [] } = useAsesores()
  const { data: proveedores = [] } = useProveedores()
  const { data: parametrosActuales } = useOrdenParametros(orden?.id || null)
  const { data: historial = [], isLoading: cargandoHistorial } = useHistorialOrden(orden?.id || null)
  const { data: profiles = [] } = useProfiles()
  const invalidate = useInvalidateCalibraciones()

  const [form, setForm] = useState<Partial<OrdenCalibracion>>(orden || EMPTY_ORDEN)
  const [codigosSel, setCodigosSel] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [vistaIdx, setVistaIdx] = useState<number | null>(null)

  useEffect(() => { if (orden) setForm(orden) }, [orden])
  useEffect(() => { if (parametrosActuales) setCodigosSel(new Set(parametrosActuales.map(p => p.rv_calibr_codigo))) }, [parametrosActuales])
  // Si de verdad se guarda un cambio de estado, se vuelve a mostrar la etapa
  // actual — no queda "atascado" viendo una etapa pasada tras avanzar.
  useEffect(() => { setVistaIdx(null) }, [orden?.estado])

  const historialPorDia = useMemo(() => {
    const map = new Map<string, typeof historial>()
    for (const h of historial) {
      const dia = fechaLocalISO(h.created_at)
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

  async function submit(overrides?: Partial<OrdenCalibracion>) {
    const datos = overrides ? { ...form, ...overrides } : form
    if (!datos.cliente?.trim()) { toast.error('Ingresa el cliente'); return }

    if (esNueva) {
      if (!datos.numero_oc?.trim()) { toast.error('Ingresa el No. de Orden de Compra'); return }
      if (!datos.correo_cliente?.trim()) { toast.error('Ingresa el correo del cliente'); return }
      if (!datos.correo_asesor?.trim()) { toast.error('Ingresa el correo del asesor(a)'); return }
      if (!datos.rmv_fv?.trim()) { toast.error('Ingresa el RMV/FV'); return }
      if (!datos.modalidad) { toast.error('Selecciona la modalidad'); return }
      if (!datos.proveedor?.trim()) { toast.error('Ingresa el proveedor (laboratorio)'); return }
      if (codigosSel.size === 0) { toast.error('Selecciona al menos un servicio en Servicios RV CALIBR'); return }
      if (!datos.cantidad_equipos) { toast.error('Ingresa la cantidad de equipos'); return }
      if (!datos.estado || datos.estado === 'oc_creada') { toast.error('Define el Siguiente paso antes de crear la orden'); return }
      if (datos.estado === 'en_mantenimiento_reparacion' && !datos.fecha_salida_mantenimiento) {
        toast.error('Ingresa la fecha de salida de mantenimiento'); return
      }
    }

    if (datos.modalidad) {
      const noPermitidos = [...codigosSel].filter(c => {
        const item = catalogo.find(k => k.codigo === c)
        return item && !item.modalidades_permitidas.includes(datos.modalidad!)
      })
      if (noPermitidos.length) {
        toast.error(`Estos servicios no aplican en la modalidad seleccionada: ${noPermitidos.join(', ')}`)
        return
      }
    }

    if (datos.proveedor) {
      const noPermitidosProveedor = [...codigosSel].filter(c => {
        const item = catalogo.find(k => k.codigo === c)
        return item && item.proveedores_permitidos?.length && !item.proveedores_permitidos.includes(datos.proveedor!)
      })
      if (noPermitidosProveedor.length) {
        toast.error(`Estos servicios no los hace el proveedor seleccionado: ${noPermitidosProveedor.join(', ')}`)
        return
      }
    }

    setSaving(true)
    const payload = {
      ...datos,
      cliente: datos.cliente!.trim().toUpperCase(),
      numero_oc: datos.numero_oc?.trim() || null,
      correo_cliente: datos.correo_cliente?.trim() || null,
      correo_asesor: datos.correo_asesor?.trim() || null,
      novedad_detalle: datos.estado === 'novedad' ? (datos.novedad_detalle?.trim() || null) : null,
      valor_oc_antes_iva: datos.valor_oc_antes_iva || null,
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

  function terminarMantenimiento(overrides: Partial<OrdenCalibracion>) {
    if (!form.modalidad) { toast.error('Define la modalidad antes de continuar'); return }
    const siguienteEstado = form.modalidad === 'laboratorio_externo' ? 'para_enviar' : 'visita_programada'
    // Ruta in situ / sede Hanna: sugiere la fecha de la visita como el
    // miércoles siguiente a la salida de mantenimiento, ya que "Visita
    // programada" ya no permite editarla directamente.
    const fechaSalida = (overrides.fecha_salida_mantenimiento_real ?? form.fecha_salida_mantenimiento_real) as string | null
    const fechaVisitaSugerida = siguienteEstado === 'visita_programada' && !form.fecha_programada_envio && fechaSalida
      ? { fecha_programada_envio: miercolesSiguiente(fechaSalida) }
      : {}
    avanzarEtapa({ ...overrides, ...fechaVisitaSugerida, estado: siguienteEstado })
  }

  // Usado por las vistas dedicadas de cada etapa para confirmar su avance a
  // la siguiente — reemplaza al antiguo modal "Avanzar a: X".
  function avanzarEtapa(overrides: Partial<OrdenCalibracion>) {
    setForm(f => ({ ...f, ...overrides }))
    submit(overrides)
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
  const correoAsesorNorm = (form.correo_asesor || '').trim().toLowerCase()
  const asesorSeleccionado = correoAsesorNorm ? asesores.find(a => a.correo.toLowerCase() === correoAsesorNorm) : undefined

  // El estado REAL (persistido) manda para decidir qué vista se muestra — no
  // el `form.estado` en vivo, que puede tener un cambio de "Siguiente paso"
  // sin guardar todavía. Así nunca se salta de vista antes de confirmar.
  const estadoReal = (orden?.estado ?? form.estado) as EstadoCalibracion
  const pasoPorMantenimiento = estadoReal === 'en_mantenimiento_reparacion' || !!(orden?.fecha_salida_mantenimiento)
  const flujo = flujoPorModalidad(form.modalidad ?? null, pasoPorMantenimiento)
  const idxActual = flujo.findIndex(s => s.match.includes(estadoReal))
  const idxMostrado = vistaIdx ?? idxActual
  const etapaMostrada = idxMostrado >= 0 ? flujo[idxMostrado] : undefined
  const soloLectura = idxMostrado !== idxActual

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

      {!esNueva && (
        <Stepper
          flujo={flujo}
          estado={estadoReal}
          idxActual={idxActual}
          idxMostrado={idxMostrado}
          onSeleccionar={setVistaIdx}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: esNueva ? '1fr' : '1fr 340px', gap: 24, alignItems: 'flex-start' }}>
        {/* Formulario */}
        {/* Las vistas dedicadas solo aplican a órdenes que ya existen — una
            orden nueva siempre se llena en el formulario completo, sin
            importar qué se haya marcado en "Siguiente paso" todavía. */}
        {!esNueva && etapaMostrada?.key === 'en_mantenimiento_reparacion' ? (
          <VistaMantenimiento
            form={form} asesorSeleccionado={asesorSeleccionado} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onTerminar={terminarMantenimiento}
          />
        ) : !esNueva && etapaMostrada?.key === 'visita_programada' ? (
          <VistaVisitaProgramada
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura} saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'terminado' ? (
          <VistaTerminado form={form} catalogo={catalogo} codigosSel={codigosSel} asesorSeleccionado={asesorSeleccionado} />
        ) : !esNueva && etapaMostrada?.key === 'para_enviar' ? (
          <VistaParaEnviar
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'enviado' ? (
          <VistaEnviado
            form={form} catalogo={catalogo} codigosSel={codigosSel} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'en_calibracion' && form.modalidad === 'laboratorio_externo' ? (
          <VistaEnCalibracion
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'en_retorno' ? (
          <VistaEnRetorno
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'control_calidad' ? (
          <VistaControlCalidad
            form={form} asesorSeleccionado={asesorSeleccionado} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'carga_al_sistema' ? (
          <VistaCargaAlSistema
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'envio_certificados' ? (
          <VistaEnvioCertificados
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : !esNueva && etapaMostrada?.key === 'en_calibracion' ? (
          <VistaEnCalibracionSitio
            form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
            saving={saving} onAvanzar={avanzarEtapa}
          />
        ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
          {soloLectura && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
              background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
              marginBottom: 24, fontSize: 13, fontWeight: 600,
            }}>
              Revisando "OC creada" (solo lectura)
            </div>
          )}
          <fieldset disabled={!puedeEditar || soloLectura} style={{ border: 'none', padding: 0, margin: 0 }}>
            <IdentificacionFields form={form} set={set} esNueva={esNueva} asesores={asesores} asesorSeleccionado={asesorSeleccionado} />
            <ReferenciasFields form={form} setForm={setForm} set={set} esNueva={esNueva} />

            <Seccion titulo="Proceso">
              <Grid2>
                <FG label="Modalidad" required={esNueva}>
                  <select
                    value={form.modalidad || ''}
                    onChange={e => {
                      const m = (e.target.value || null) as Modalidad | null
                      setForm(f => ({
                        ...f,
                        modalidad: m,
                        proveedor: m === 'sede_hanna_dorado' ? PROVEEDOR_SEDE_HANNA : f.proveedor,
                        lugar_ejecucion: m === 'in_situ' ? f.lugar_ejecucion : '',
                      }))
                    }}
                    style={INP}
                  >
                    <option value="">Sin definir</option>
                    {(['laboratorio_externo', 'in_situ', 'sede_hanna_dorado'] as Modalidad[]).map(m => (
                      <option key={m} value={m}>{MODALIDAD_LABEL[m]}</option>
                    ))}
                  </select>
                </FG>
                <FG label="Proveedor (laboratorio)" required={esNueva}>
                  {form.modalidad === 'sede_hanna_dorado' ? (
                    <div style={{ ...INP, color: 'var(--muted)' }}>{PROVEEDOR_SEDE_HANNA} (único proveedor en esta sede)</div>
                  ) : (
                    <>
                      <input value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)} list="proveedores-sugeridos" style={INP} />
                      <datalist id="proveedores-sugeridos">
                        {proveedores.filter(p => p.activo).map(p => <option key={p.id} value={p.nombre} />)}
                      </datalist>
                    </>
                  )}
                </FG>
                {form.modalidad === 'in_situ' && (
                  <FG label="Lugar de ejecución">
                    <input value={form.lugar_ejecucion || ''} onChange={e => set('lugar_ejecucion', e.target.value)} placeholder="Dirección o instalaciones del cliente" style={INP} />
                  </FG>
                )}
              </Grid2>
              {form.estado === 'novedad' && (
                <div style={{ marginTop: 14 }}>
                  <FG label="Detalle de la novedad">
                    <textarea value={form.novedad_detalle || ''} onChange={e => set('novedad_detalle', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
                  </FG>
                </div>
              )}
            </Seccion>

            <Seccion titulo={esNueva ? 'Servicios RV CALIBR *' : 'Servicios RV CALIBR'}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catalogo.filter(c => c.activo).map(c => {
                  const checked = codigosSel.has(c.codigo)
                  const permitidoModalidad = !form.modalidad || c.modalidades_permitidas.includes(form.modalidad)
                  const permitidoProveedor = !form.proveedor || !c.proveedores_permitidos?.length || c.proveedores_permitidos.includes(form.proveedor)
                  const permitido = permitidoModalidad && permitidoProveedor
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
              <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ width: 160 }}>
                  <FG label="Cantidad de equipos" required={esNueva}>
                    <input
                      type="number" min={1} step={1}
                      value={form.cantidad_equipos ?? ''}
                      onChange={e => set('cantidad_equipos', e.target.value ? Number(e.target.value) : null)}
                      style={INP}
                    />
                  </FG>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <FG label="Notas de parámetros (histórico / texto libre)">
                  <textarea value={form.parametros_nota || ''} onChange={e => set('parametros_nota', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
                </FG>
              </div>
            </Seccion>

            {(esNueva || grupoEstado(form.estado as EstadoCalibracion) === 'pendiente') && (
              <Seccion titulo={esNueva ? 'Siguiente paso *' : 'Siguiente paso'}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => set('estado', 'oc_creada')} style={segBtnStyle(form.estado === 'oc_creada')}>
                    Aún sin definir
                  </button>
                  <button
                    type="button"
                    disabled={!form.otst?.trim()}
                    title={!form.otst?.trim() ? 'Define el OTST antes de continuar' : undefined}
                    onClick={() => set('estado', 'en_mantenimiento_reparacion')}
                    style={segBtnStyle(form.estado === 'en_mantenimiento_reparacion', !form.otst?.trim())}
                  >
                    En mantenimiento / reparación
                  </button>
                  <button
                    type="button"
                    disabled={!form.modalidad}
                    title={!form.modalidad ? 'Define la modalidad antes de continuar' : undefined}
                    onClick={() => set('estado', form.modalidad === 'laboratorio_externo' ? 'para_enviar' : 'visita_programada')}
                    style={segBtnStyle(form.estado === 'para_enviar' || form.estado === 'visita_programada', !form.modalidad)}
                  >
                    {form.modalidad === 'laboratorio_externo' ? 'Para enviar' : 'Visita programada'}
                  </button>
                </div>

                {form.estado === 'en_mantenimiento_reparacion' && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ maxWidth: 260 }}>
                      <FG label="Fecha de salida de mantenimiento" required={esNueva}>
                        <input
                          type="date" value={form.fecha_salida_mantenimiento || ''}
                          onChange={e => set('fecha_salida_mantenimiento', e.target.value || null)}
                          style={INP}
                        />
                      </FG>
                    </div>
                    {parseOtstCodes(form.otst).map(codigo => (
                      <a
                        key={codigo}
                        href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer"
                        style={{ ...GHOST, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        Ir a la OTST {codigo} →
                      </a>
                    ))}
                  </div>
                )}
                {(form.estado === 'para_enviar' || form.estado === 'visita_programada') && (
                  <div style={{ marginTop: 14, maxWidth: 260 }}>
                    <FG label={form.estado === 'para_enviar' ? 'Fecha ideal de envío' : 'Fecha ideal de la visita'}>
                      <input
                        type="date" value={form.fecha_programada_envio || ''}
                        onChange={e => set('fecha_programada_envio', e.target.value || null)}
                        style={INP}
                      />
                    </FG>
                  </div>
                )}
              </Seccion>
            )}
          </fieldset>

          {puedeEditar && !soloLectura && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => navigate('/calibraciones')} style={GHOST}>Cancelar</button>
              <button onClick={() => submit()} disabled={saving} style={PRI}>{saving ? 'Guardando…' : esNueva ? '+ Crear orden' : '✓ Guardar cambios'}</button>
            </div>
          )}
        </div>
        )}

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
                              {horaLocal(h.created_at)}
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

function Stepper({ flujo, estado, idxActual, idxMostrado, onSeleccionar }: {
  flujo: EtapaFlujo[]
  estado: EstadoCalibracion
  idxActual: number
  idxMostrado: number
  onSeleccionar: (idx: number | null) => void
}) {
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

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 4px' }}>
        {flujo.map((s, i) => {
          const navegable = i <= idxActual
          const esMostrado = i === idxMostrado
          return (
            <Fragment key={s.key}>
              <div
                onClick={() => navegable && onSeleccionar(i === idxActual ? null : i)}
                onMouseEnter={e => { if (navegable) (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 96,
                  cursor: navegable ? 'pointer' : 'default', opacity: 1, transition: 'opacity .12s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i <= idxActual ? 'var(--accent)' : 'var(--surface2)',
                  color: i <= idxActual ? '#fff' : 'var(--muted)',
                  border: esMostrado ? '2px solid var(--text)' : `1px solid ${i <= idxActual ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {i < idxActual ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10, color: i <= idxActual ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--mono)',
                  textAlign: 'center', fontWeight: esMostrado ? 700 : 400,
                }}>
                  {i === idxActual ? ESTADO_LABEL[estado] : s.label}
                </span>
              </div>
              {i < flujo.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < idxActual ? 'var(--accent)' : 'var(--border)', marginTop: 13 }} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
