// Línea de tiempo de los 4 estados — visible siempre en el detalle,
// similar al historial que Calibraciones muestra en su página de detalle.
import { Card } from '../../components/ui/Card'
import { ESTADO_LABEL_SF } from './hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../types'

function fmtFechaHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function duracion(desde: string | null, hasta: string | null): string | null {
  if (!desde || !hasta) return null
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  const horas = ms / (1000 * 60 * 60)
  if (horas < 24) return `${Math.round(horas)} h`
  return `${Math.round(horas / 24)} día${Math.round(horas / 24) !== 1 ? 's' : ''}`
}

const ORDEN_ESTADOS = ['recibido', 'pendiente', 'preingresado', 'ingresado'] as const

export function LineaTiempoSF({ registro }: { registro: EquipoSinFormato }) {
  const etapas: { key: string, label: string, fecha: string | null, desde: string | null }[] = [
    { key: 'recibido', label: ESTADO_LABEL_SF.recibido, fecha: registro.fecha_recibido, desde: null },
    { key: 'pendiente', label: ESTADO_LABEL_SF.pendiente, fecha: registro.fecha_pendiente, desde: registro.fecha_recibido },
    { key: 'preingresado', label: ESTADO_LABEL_SF.preingresado, fecha: registro.fecha_preingreso, desde: registro.fecha_pendiente },
    { key: 'ingresado', label: ESTADO_LABEL_SF.ingresado, fecha: registro.fecha_ingreso, desde: registro.fecha_preingreso },
  ]
  const indiceActual = ORDEN_ESTADOS.indexOf(registro.estado)

  return (
    <Card>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>
        Línea de tiempo
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {etapas.map((e, i) => {
          const completada = !!e.fecha
          const esActual = i === indiceActual
          return (
            <div key={e.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px',
              borderRadius: 9, fontSize: 12.5,
              border: `1px solid ${esActual ? 'var(--accent)' : 'var(--border)'}`,
              background: esActual ? 'var(--accent-bg)' : completada ? 'var(--surface2)' : 'var(--surface)',
              opacity: completada || esActual ? 1 : 0.5,
            }}>
              <span style={{ fontWeight: 600, color: esActual ? 'var(--accent)' : 'var(--text)' }}>
                {completada ? '✓ ' : ''}{e.label}
              </span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                {fmtFechaHora(e.fecha)}
                {duracion(e.desde, e.fecha) && <span style={{ marginLeft: 10, color: 'var(--accent)' }}>({duracion(e.desde, e.fecha)})</span>}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
