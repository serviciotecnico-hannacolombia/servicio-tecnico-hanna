import { CheckCircle2, Clock } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { useProfiles } from '../../../hooks/useProfiles'
import { linkPreIngreso, linkOtst, parseOtstCodes, useHistorialEquipoSF, CAMPO_LABEL_SF } from '../hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../../types'

function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function VistaIngresado({ registro }: { registro: EquipoSinFormato }) {
  const codigos = parseOtstCodes(registro.otst)
  const { data: historial = [], isLoading: cargandoHistorial } = useHistorialEquipoSF(registro.id)
  const { data: profiles = [] } = useProfiles()
  const nombrePorId = new Map(profiles.map(p => [p.id, p.full_name || p.email]))

  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <CheckCircle2 size={16} /> Ingresado — proceso completo.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
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

      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} /> Resumen — fechas y modificaciones
      </h4>
      {cargandoHistorial ? (
        <Spinner size={20} />
      ) : historial.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sin cambios registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {historial.map(h => (
            <div key={h.id} style={{ padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                <span>{nombrePorId.get(h.usuario_id || '') || 'Sistema'}</span>
                <span>{fmtFechaHora(h.created_at)}</span>
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>{CAMPO_LABEL_SF[h.campo] || h.campo}</strong>
                {h.campo !== 'creacion' && (h.valor_anterior || h.valor_nuevo) && (
                  <span style={{ color: 'var(--muted)' }}>
                    {': '}
                    {h.valor_anterior && <span style={{ textDecoration: 'line-through' }}>{h.valor_anterior}</span>}
                    {h.valor_anterior && h.valor_nuevo && ' → '}
                    {h.valor_nuevo && <span style={{ color: 'var(--text)', fontWeight: 600 }}>{h.valor_nuevo}</span>}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
