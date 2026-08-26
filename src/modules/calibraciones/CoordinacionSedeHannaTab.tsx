// Pestaña "Sede Hanna": coordinación semanal de las órdenes en modalidad
// Sede Hanna Dorado que están por visitarse. A diferencia de in situ, aquí
// el equipo tiene que estar físicamente en la sede antes de que llegue el
// metrólogo(a), así que esta vista rastrea dónde está cada uno (en sitio,
// en bodega, en mantenimiento) para poder pasar a "En calibración" rápido
// apenas llegue. Incluye también, aparte, las órdenes que todavía siguen en
// mantenimiento pero salen esta semana — la visita todavía no está agendada,
// pero conviene verlas venir con anticipación.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CalendarClock, Wrench, FlaskConical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Stat, B_INFO, INP, GHOST, fmtFecha, EMPTY } from './ui'
import { rangoSemana, MES_CORTO, UBICACION_EQUIPO_LABEL, useInvalidateCalibraciones } from './hooks/useCalibraciones'
import { parseOtstCodes } from './vistas/CamposCompartidos'
import type { OrdenCalibracion, OrdenCalibracionParametro, RvCalibrItem, UbicacionEquipo } from '../../types'

function fmtRangoSemana(inicio: string, fin: string): string {
  const [, mi, di] = inicio.split('-').map(Number)
  const [af, mf, df] = fin.split('-').map(Number)
  if (mi === mf) return `${di} – ${df} ${MES_CORTO[mf - 1]} ${af}`
  return `${di} ${MES_CORTO[mi - 1]} – ${df} ${MES_CORTO[mf - 1]} ${af}`
}

const UBICACION_COLOR: Record<UbicacionEquipo, { bg: string, border: string, text: string }> = {
  en_sitio: { bg: 'var(--green-bg, #dcfce7)', border: 'var(--green-border, #86efac)', text: 'var(--green, #16a34a)' },
  en_bodega: { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', text: 'var(--yellow)' },
  en_mantenimiento: { bg: 'var(--red-bg)', border: 'var(--red-border)', text: 'var(--red)' },
}

function FilaOrden({ orden, magnitudes, etiquetaFecha, fecha, onCambiarUbicacion, onClick }: {
  orden: OrdenCalibracion
  magnitudes: string[]
  etiquetaFecha: string
  fecha: string | null
  onCambiarUbicacion?: (valor: UbicacionEquipo | '') => void
  onClick: () => void
}) {
  const otstCodigos = parseOtstCodes(orden.otst)
  const ubicacionColor = orden.ubicacion_equipo ? UBICACION_COLOR[orden.ubicacion_equipo] : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
      border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)',
    }}>
      <div onClick={onClick} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{orden.cliente}</span>
          {orden.numero_oc && <span style={B_INFO}>{orden.numero_oc}</span>}
          <span style={B_INFO}>{etiquetaFecha}: {fmtFecha(fecha)}</span>
          {magnitudes.map(m => <span key={m} style={B_INFO}>{m}</span>)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {orden.rmv_fv && <span>RMV/FV: <strong>{orden.rmv_fv}</strong></span>}
          {otstCodigos.length > 0 && <span>OTST: <strong>{otstCodigos.join(', ')}</strong></span>}
          {orden.cantidad_equipos != null && <span>Equipos: <strong>{orden.cantidad_equipos}</strong></span>}
        </div>
      </div>
      {onCambiarUbicacion && (
        <select
          value={orden.ubicacion_equipo || ''}
          onChange={e => onCambiarUbicacion(e.target.value as UbicacionEquipo | '')}
          style={{
            ...INP, width: 'auto', minWidth: 190, flexShrink: 0,
            ...(ubicacionColor ? { background: ubicacionColor.bg, borderColor: ubicacionColor.border, color: ubicacionColor.text, fontWeight: 600 } : {}),
          }}
        >
          <option value="">Sin definir</option>
          {(Object.keys(UBICACION_EQUIPO_LABEL) as UbicacionEquipo[]).map(u => (
            <option key={u} value={u}>{UBICACION_EQUIPO_LABEL[u]}</option>
          ))}
        </select>
      )}
    </div>
  )
}

export function CoordinacionSedeHannaTab({ ordenes, parametros, catalogo }: {
  ordenes: OrdenCalibracion[]
  parametros: OrdenCalibracionParametro[]
  catalogo: RvCalibrItem[]
}) {
  const navigate = useNavigate()
  const invalidate = useInvalidateCalibraciones()
  const [offset, setOffset] = useState(0)
  const { inicio, fin } = rangoSemana(offset)

  const magnitudPorCodigo = new Map(catalogo.map(c => [c.codigo, c.magnitud]))
  const codigosPorOrden = new Map<string, string[]>()
  for (const p of parametros) {
    if (!codigosPorOrden.has(p.orden_id)) codigosPorOrden.set(p.orden_id, [])
    codigosPorOrden.get(p.orden_id)!.push(p.rv_calibr_codigo)
  }
  function magnitudesDe(orden: OrdenCalibracion): string[] {
    const codigos = codigosPorOrden.get(orden.id) || []
    return [...new Set(codigos.map(c => magnitudPorCodigo.get(c)).filter((m): m is string => !!m))]
  }

  const enSemana = (fecha: string | null) => !!fecha && fecha >= inicio && fecha <= fin

  const ordenesVisita = ordenes
    .filter(o => o.modalidad === 'sede_hanna_dorado'
      && (o.estado === 'en_programacion_visita' || o.estado === 'visita_programada')
      && enSemana(o.fecha_programada_envio))
    .sort((a, b) => (a.fecha_programada_envio || '').localeCompare(b.fecha_programada_envio || ''))

  const ordenesMantenimiento = ordenes
    .filter(o => o.modalidad === 'sede_hanna_dorado'
      && o.estado === 'en_mantenimiento_reparacion'
      && enSemana(o.fecha_salida_mantenimiento))
    .sort((a, b) => (a.fecha_salida_mantenimiento || '').localeCompare(b.fecha_salida_mantenimiento || ''))

  // Sin filtro de semana — a diferencia de mantenimiento/visita (eventos con
  // fecha propia), "en calibración" es un estado en curso: se muestran todas
  // las que están activas ahora mismo, sin importar cuándo llegó el metrólogo.
  const ordenesEnCalibracion = ordenes
    .filter(o => o.modalidad === 'sede_hanna_dorado' && o.estado === 'en_calibracion')
    .sort((a, b) => (b.fecha_llegada_metrologo || '').localeCompare(a.fecha_llegada_metrologo || ''))

  const conteoMagnitudes = new Map<string, number>()
  for (const o of ordenesVisita) {
    for (const m of magnitudesDe(o)) conteoMagnitudes.set(m, (conteoMagnitudes.get(m) || 0) + 1)
  }
  const totalEquipos = ordenesVisita.reduce((suma, o) => suma + (o.cantidad_equipos || 0), 0)

  async function actualizarUbicacion(ordenId: string, valor: UbicacionEquipo | '') {
    const { error } = await supabase.from('ordenes_calibracion')
      .update({ ubicacion_equipo: valor || null }).eq('id', ordenId)
    if (error) { toast.error('Error: ' + error.message); return }
    invalidate.ordenes()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setOffset(o => o - 1)} style={GHOST}><ChevronLeft size={14} /></button>
            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmtRangoSemana(inicio, fin)}</div>
              {offset !== 0 && (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {offset > 0 ? `${offset} semana${offset !== 1 ? 's' : ''} adelante` : `${-offset} semana${offset !== -1 ? 's' : ''} atrás`}
                </div>
              )}
            </div>
            <button onClick={() => setOffset(o => o + 1)} style={GHOST}><ChevronRight size={14} /></button>
          </div>
          {offset !== 0 && <button onClick={() => setOffset(0)} style={GHOST}>Esta semana</button>}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Stat label="Visitas esta semana" value={ordenesVisita.length} color="var(--accent)" />
        <Stat label="Total equipos" value={totalEquipos} color="var(--accent)" />
        <Stat label="Saliendo de mantenimiento" value={ordenesMantenimiento.length} color="var(--yellow, #ca8a04)" />
        <Stat label="En calibración" value={ordenesEnCalibracion.length} color="var(--green, #16a34a)" />
        {[...conteoMagnitudes.entries()].map(([magnitud, n]) => (
          <Stat key={magnitud} label={magnitud} value={n} color="var(--accent)" />
        ))}
      </div>

      {ordenesMantenimiento.length > 0 && (
        <Card>
          <h4 style={{
            fontSize: 12, fontWeight: 700, color: 'var(--yellow, #ca8a04)', textTransform: 'uppercase',
            letterSpacing: '.6px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Wrench size={13} /> Saliendo de mantenimiento esta semana — visita todavía sin agendar
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordenesMantenimiento.map(o => (
              <FilaOrden
                key={o.id} orden={o} magnitudes={magnitudesDe(o)}
                etiquetaFecha="Salida de mantenimiento" fecha={o.fecha_salida_mantenimiento}
                onClick={() => navigate(`/calibraciones/${o.id}`)}
              />
            ))}
          </div>
        </Card>
      )}

      <Card>
        {ordenesVisita.length === 0 ? (
          <div style={EMPTY}><CalendarClock size={32} strokeWidth={1.5} /><p>No hay visitas programadas pendientes de Sede Hanna Dorado para esta semana</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordenesVisita.map(o => (
              <FilaOrden
                key={o.id} orden={o} magnitudes={magnitudesDe(o)}
                etiquetaFecha="Visita" fecha={o.fecha_programada_envio}
                onCambiarUbicacion={valor => actualizarUbicacion(o.id, valor)}
                onClick={() => navigate(`/calibraciones/${o.id}`)}
              />
            ))}
          </div>
        )}
      </Card>

      {ordenesEnCalibracion.length > 0 && (
        <Card>
          <h4 style={{
            fontSize: 12, fontWeight: 700, color: 'var(--green, #16a34a)', textTransform: 'uppercase',
            letterSpacing: '.6px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FlaskConical size={13} /> En calibración ahora mismo
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordenesEnCalibracion.map(o => (
              <FilaOrden
                key={o.id} orden={o} magnitudes={magnitudesDe(o)}
                etiquetaFecha="Llegada del metrólogo(a)" fecha={o.fecha_llegada_metrologo}
                onClick={() => navigate(`/calibraciones/${o.id}`)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
