import { CheckCircle2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { linkPreIngreso, linkOtst, parseOtstCodes } from '../hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../../types'

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

export function VistaIngresado({ registro }: { registro: EquipoSinFormato }) {
  const codigos = parseOtstCodes(registro.otst)
  const etapas: { label: string, fecha: string | null, desde: string | null }[] = [
    { label: 'Recibido', fecha: registro.fecha_recibido, desde: null },
    { label: 'Pendiente', fecha: registro.fecha_pendiente, desde: registro.fecha_recibido },
    { label: 'Preingresado', fecha: registro.fecha_preingreso, desde: registro.fecha_pendiente },
    { label: 'Ingresado', fecha: registro.fecha_ingreso, desde: registro.fecha_preingreso },
  ]

  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <CheckCircle2 size={16} /> Ingresado — proceso completo.
      </div>

      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>
        Línea de tiempo
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {etapas.map(e => (
          <div key={e.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface2)', fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>{e.label}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
              {fmtFechaHora(e.fecha)}
              {duracion(e.desde, e.fecha) && <span style={{ marginLeft: 10, color: 'var(--accent)' }}>({duracion(e.desde, e.fecha)})</span>}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 6 }}>Pre-ingreso</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{registro.numero_pre_ingreso || '—'}</div>
          {registro.numero_pre_ingreso && (
            <a href={linkPreIngreso(registro.numero_pre_ingreso)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)' }}>
              {linkPreIngreso(registro.numero_pre_ingreso)}
            </a>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 6 }}>OTST</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {codigos.map(c => (
              <a key={c} href={linkOtst(c)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)' }}>
                {c}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
