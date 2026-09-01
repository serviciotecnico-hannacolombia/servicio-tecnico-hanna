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
import { Table, type Column } from '../../components/ui/Table'
import { Stat, B_INFO, INP, GHOST, fmtFecha, EMPTY } from './ui'
import { rangoSemana, MES_CORTO, UBICACION_EQUIPO_LABEL, useInvalidateCalibraciones } from './hooks/useCalibraciones'
import { parseOtstCodes, parseNumeroOC } from './vistas/CamposCompartidos'
import type { OrdenCalibracion, OrdenCalibracionParametro, RvCalibrItem, UbicacionEquipo } from '../../types'

function fmtRangoSemana(inicio: string, fin: string): string {
  const [, mi, di] = inicio.split('-').map(Number)
  const [af, mf, df] = fin.split('-').map(Number)
  if (mi === mf) return `${di} – ${df} ${MES_CORTO[mf - 1]} ${af}`
  return `${di} ${MES_CORTO[mi - 1]} – ${df} ${MES_CORTO[mf - 1]} ${af}`
}

// El No. de OC es el identificador de la orden (ST{número}-{año}) — mismo
// criterio de orden que la lista principal de Órdenes: mayor a menor.
function porNumeroOCDesc(a: OrdenCalibracion, b: OrdenCalibracion): number {
  const pa = parseNumeroOC(a.numero_oc)
  const pb = parseNumeroOC(b.numero_oc)
  if (pa.anio !== pb.anio) return pb.anio.localeCompare(pa.anio)
  return (parseInt(pb.numero, 10) || 0) - (parseInt(pa.numero, 10) || 0)
}

const UBICACION_COLOR: Record<UbicacionEquipo, { bg: string, border: string, text: string }> = {
  en_sitio: { bg: 'var(--green-bg, #dcfce7)', border: 'var(--green-border, #86efac)', text: 'var(--green, #16a34a)' },
  en_bodega: { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', text: 'var(--yellow)' },
  en_mantenimiento: { bg: 'var(--red-bg)', border: 'var(--red-border)', text: 'var(--red)' },
}

// Columnas compartidas entre las tres tablas de esta pestaña — solo cambian
// la etiqueta/fuente de la fecha y si se puede editar la ubicación del
// equipo (únicamente en la tabla de visitas).
function columnasSedeHanna({ magnitudesDe, etiquetaFecha, fechaDe, onCambiarUbicacion }: {
  magnitudesDe: (orden: OrdenCalibracion) => string[]
  etiquetaFecha: string
  fechaDe: (orden: OrdenCalibracion) => string | null
  onCambiarUbicacion?: (ordenId: string, valor: UbicacionEquipo | '') => void
}): Column<OrdenCalibracion>[] {
  const columnas: Column<OrdenCalibracion>[] = [
    {
      key: 'cliente', header: 'Cliente',
      render: o => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{o.cliente}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {o.numero_oc && <span style={B_INFO}>{o.numero_oc}</span>}
            {magnitudesDe(o).map(m => <span key={m} style={B_INFO}>{m}</span>)}
          </div>
        </div>
      ),
    },
    {
      key: 'fecha', header: etiquetaFecha, width: '160px',
      render: o => <span style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{fmtFecha(fechaDe(o))}</span>,
    },
    {
      key: 'rmv', header: 'RMV/FV', width: '110px',
      render: o => o.rmv_fv
        ? <span style={{ fontSize: 12 }}>{o.rmv_fv}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'otst', header: 'OTST', width: '150px',
      render: o => {
        const codigos = parseOtstCodes(o.otst)
        return codigos.length
          ? <span style={{ fontSize: 12 }}>{codigos.join(', ')}</span>
          : <span style={{ color: 'var(--muted)' }}>—</span>
      },
    },
    {
      key: 'equipos', header: 'Equipos', width: '80px', align: 'center',
      render: o => <span style={{ fontSize: 12 }}>{o.cantidad_equipos ?? '—'}</span>,
    },
  ]

  if (onCambiarUbicacion) {
    columnas.push({
      key: 'ubicacion', header: 'Ubicación del equipo', width: '200px',
      render: o => {
        const color = o.ubicacion_equipo ? UBICACION_COLOR[o.ubicacion_equipo] : null
        return (
          // Detiene la propagación del clic para no disparar la navegación
          // de la fila al interactuar con el selector.
          <div onClick={e => e.stopPropagation()}>
            <select
              value={o.ubicacion_equipo || ''}
              onChange={e => onCambiarUbicacion(o.id, e.target.value as UbicacionEquipo | '')}
              style={{
                ...INP, width: '100%', minWidth: 180,
                ...(color ? { background: color.bg, borderColor: color.border, color: color.text, fontWeight: 600 } : {}),
              }}
            >
              <option value="">Sin definir</option>
              {(Object.keys(UBICACION_EQUIPO_LABEL) as UbicacionEquipo[]).map(u => (
                <option key={u} value={u}>{UBICACION_EQUIPO_LABEL[u]}</option>
              ))}
            </select>
          </div>
        )
      },
    })
  }

  return columnas
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
    .filter(o => !o.anulada && o.modalidad === 'sede_hanna_dorado'
      && (o.estado === 'en_programacion_visita' || o.estado === 'visita_programada')
      && enSemana(o.fecha_programada_envio))
    .sort(porNumeroOCDesc)

  const ordenesMantenimiento = ordenes
    .filter(o => !o.anulada && o.modalidad === 'sede_hanna_dorado'
      && o.estado === 'en_mantenimiento_reparacion'
      && enSemana(o.fecha_salida_mantenimiento))
    .sort(porNumeroOCDesc)

  // Sin filtro de semana — a diferencia de mantenimiento/visita (eventos con
  // fecha propia), "en calibración" es un estado en curso: se muestran todas
  // las que están activas ahora mismo, sin importar cuándo llegó el metrólogo.
  const ordenesEnCalibracion = ordenes
    .filter(o => !o.anulada && o.modalidad === 'sede_hanna_dorado' && o.estado === 'en_calibracion')
    .sort(porNumeroOCDesc)

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

  const columnasMantenimiento = columnasSedeHanna({
    magnitudesDe, etiquetaFecha: 'Salida de mantenimiento', fechaDe: o => o.fecha_salida_mantenimiento,
  })
  const columnasVisita = columnasSedeHanna({
    magnitudesDe, etiquetaFecha: 'Visita', fechaDe: o => o.fecha_programada_envio,
    onCambiarUbicacion: actualizarUbicacion,
  })
  const columnasEnCalibracion = columnasSedeHanna({
    magnitudesDe, etiquetaFecha: 'Llegada del metrólogo(a)', fechaDe: o => o.fecha_llegada_metrologo,
  })

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

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, flex: 2, minWidth: 320 }}>
          <Stat label="Visitas esta semana" value={ordenesVisita.length} color="var(--accent)" />
          <Stat label="Total equipos" value={totalEquipos} color="var(--accent)" />
          <Stat label="Saliendo de mantenimiento" value={ordenesMantenimiento.length} color="var(--yellow, #ca8a04)" />
          <Stat label="En calibración" value={ordenesEnCalibracion.length} color="var(--green, #16a34a)" />
        </div>

        {conteoMagnitudes.size > 0 && (
          <Card style={{ flex: 1, minWidth: 200 }} bodyStyle={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
              Parámetros de la semana
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[...conteoMagnitudes.entries()].sort((a, b) => b[1] - a[1]).map(([magnitud, n]) => (
                <div key={magnitud} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text)' }}>{magnitud}</span>
                  <strong style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{n}</strong>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {ordenesMantenimiento.length > 0 && (
        <Card bodyStyle={{ padding: 0 }}>
          <h4 style={{
            fontSize: 12, fontWeight: 700, color: 'var(--yellow, #ca8a04)', textTransform: 'uppercase',
            letterSpacing: '.6px', padding: '16px 16px 0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Wrench size={13} /> Saliendo de mantenimiento esta semana — visita todavía sin agendar
          </h4>
          <Table
            columns={columnasMantenimiento}
            data={ordenesMantenimiento}
            keyExtractor={o => o.id}
            onRowClick={o => navigate(`/calibraciones/${o.id}`)}
          />
        </Card>
      )}

      <Card bodyStyle={{ padding: 0 }}>
        {ordenesVisita.length === 0 ? (
          <div style={EMPTY}><CalendarClock size={32} strokeWidth={1.5} /><p>No hay visitas programadas pendientes de Sede Hanna Dorado para esta semana</p></div>
        ) : (
          <Table
            columns={columnasVisita}
            data={ordenesVisita}
            keyExtractor={o => o.id}
            onRowClick={o => navigate(`/calibraciones/${o.id}`)}
          />
        )}
      </Card>

      {ordenesEnCalibracion.length > 0 && (
        <Card bodyStyle={{ padding: 0 }}>
          <h4 style={{
            fontSize: 12, fontWeight: 700, color: 'var(--green, #16a34a)', textTransform: 'uppercase',
            letterSpacing: '.6px', padding: '16px 16px 0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FlaskConical size={13} /> En calibración ahora mismo
          </h4>
          <Table
            columns={columnasEnCalibracion}
            data={ordenesEnCalibracion}
            keyExtractor={o => o.id}
            onRowClick={o => navigate(`/calibraciones/${o.id}`)}
          />
        </Card>
      )}
    </div>
  )
}
