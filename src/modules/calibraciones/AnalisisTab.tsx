// Pestaña "Análisis": indicadores agregados, tendencia histórica mensual y
// exportación a CSV — separada de la lista de Órdenes para no saturar esa
// vista con tarjetas que no son parte del flujo operativo del día a día.
import { useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/ui/Card'
import { FG, Stat, INP, PRI, GHOST, fechaLocalISO } from './ui'
import { efectividadPromedio, resumenMensual, evaluarEfectividad, ESTADO_LABEL, MODALIDAD_LABEL, hoyISO } from './hooks/useCalibraciones'
import type { OrdenCalibracion } from '../../types'

const AZUL = '#2563eb'
const MORADO = '#7c3aed'
const VERDE = '#16a34a'

// Mismas convenciones que el resto de la app (ver IndicadoresPage/ReporteST):
// colores de serie en hex fijo (recharts no resuelve var() de forma confiable
// dentro del SVG), chrome del gráfico (grid/ejes) en gris neutro apagado.
const EJE_COMUN = { fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }

function ChartCard({ titulo, children }: { titulo: string, children: React.ReactNode }) {
  return (
    <Card>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14 }}>
        {titulo}
      </h4>
      <div style={{ height: 220 }}>{children}</div>
    </Card>
  )
}

function crearTooltip(sufijo: string) {
  return function TooltipContenido({ active, payload, label }: { active?: boolean, payload?: readonly { value?: unknown }[], label?: unknown }) {
    const valor = payload?.[0]?.value
    if (!active || valor == null) return null
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,.12)', fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2, fontFamily: 'var(--mono)' }}>{String(label)}</div>
        <div style={{ color: 'var(--muted)' }}>{String(valor)}{sufijo}</div>
      </div>
    )
  }
}

function exportarCSV(ordenes: OrdenCalibracion[]) {
  const headers = [
    'No. OC', 'Cliente', 'Correo asesor', 'Modalidad', 'Estado', 'Cantidad equipos',
    'Fecha creación', 'Fecha límite (certificado)', 'Fecha entrega certificado', 'Efectividad %', 'Valor OC antes IVA',
  ]
  const rows = ordenes.map(o => {
    const { porcentaje } = evaluarEfectividad(o)
    return [
      o.numero_oc || '',
      o.cliente || '',
      o.correo_asesor || '',
      o.modalidad ? MODALIDAD_LABEL[o.modalidad] : '',
      ESTADO_LABEL[o.estado],
      o.cantidad_equipos != null ? String(o.cantidad_equipos) : '',
      fechaLocalISO(o.created_at),
      o.certificado_fecha_fin || '',
      o.fecha_entrega_certificado || '',
      porcentaje != null ? String(porcentaje) : '',
      o.valor_oc_antes_iva != null ? String(o.valor_oc_antes_iva) : '',
    ]
  })
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calibraciones_${hoyISO()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Primer día del mes actual en formato YYYY-MM-DD — punto de partida por
// defecto del filtro de exportación (se puede limpiar o ajustar a mano).
function inicioMesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function AnalisisTab({ ordenes }: { ordenes: OrdenCalibracion[] }) {
  const [desde, setDesde] = useState(inicioMesActual)
  const [hasta, setHasta] = useState(hoyISO)

  const efectividad = efectividadPromedio(ordenes)
  const colorEfectividad = efectividad == null ? 'var(--muted)'
    : efectividad >= 80 ? 'var(--green, #16a34a)' : efectividad >= 50 ? 'var(--yellow, #ca8a04)' : 'var(--red)'

  const ahora = new Date()
  const ordenesMesActual = ordenes.filter(o => {
    const creada = new Date(o.created_at)
    return creada.getFullYear() === ahora.getFullYear() && creada.getMonth() === ahora.getMonth()
  })
  const equiposMesActual = ordenesMesActual.reduce((suma, o) => suma + (o.cantidad_equipos || 0), 0)

  const historico = resumenMensual(ordenes, 12)

  // Filtro de fecha de creación para la exportación — vacío = todas.
  const ordenesEnRango = ordenes.filter(o => {
    const fecha = fechaLocalISO(o.created_at)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Stat label="Efectividad (últimas 30)" value={efectividad != null ? `${efectividad}%` : '—'} color={colorEfectividad} />
        <Stat label="Órdenes este mes" value={ordenesMesActual.length} color="var(--accent)" />
        <Stat label="Equipos gestionados este mes" value={equiposMesActual} color="var(--accent)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
        <ChartCard titulo="Órdenes creadas por mes (últimos 12)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mesLabel" tick={EJE_COMUN} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_COMUN} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={crearTooltip(' órdenes')} cursor={{ fill: 'var(--surface2)' }} />
              <Bar dataKey="ordenesCreadas" fill={AZUL} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Equipos gestionados por mes (últimos 12)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mesLabel" tick={EJE_COMUN} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_COMUN} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={crearTooltip(' equipos')} cursor={{ fill: 'var(--surface2)' }} />
              <Bar dataKey="equiposGestionados" fill={MORADO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Efectividad promedio por mes (últimos 12)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mesLabel" tick={EJE_COMUN} axisLine={false} tickLine={false} />
              <YAxis tick={EJE_COMUN} axisLine={false} tickLine={false} domain={[0, 100]} width={28} />
              <Tooltip content={crearTooltip('%')} cursor={{ fill: 'var(--surface2)' }} />
              <Bar dataKey="efectividadPromedio" fill={VERDE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
          Exportar datos
        </h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px' }}>
          Filtra por fecha de creación (opcional) y descarga en un CSV listo para Excel.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: 160 }}>
            <FG label="Desde">
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={INP} />
            </FG>
          </div>
          <div style={{ width: 160 }}>
            <FG label="Hasta">
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={INP} />
            </FG>
          </div>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(''); setHasta('') }} style={GHOST}>Limpiar</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {ordenesEnRango.length} orden{ordenesEnRango.length !== 1 ? 'es' : ''} en el rango
            </span>
            <button onClick={() => exportarCSV(ordenesEnRango)} disabled={ordenesEnRango.length === 0} style={PRI}>
              <Download size={14} style={{ verticalAlign: -2 }} /> Exportar CSV
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
