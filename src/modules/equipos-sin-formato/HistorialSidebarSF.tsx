// Barra lateral de historial — visible en cualquier parte del proceso,
// mismo patrón que el panel de historial de Calibraciones
// (OrdenCalibracionDetailPage.tsx): agrupado por día, y dentro de un día,
// las entradas escritas en el mismo instante por la misma persona se
// colapsan bajo un solo encabezado nombre/hora.
import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { useProfiles } from '../../hooks/useProfiles'
import { useHistorialEquipoSF, CAMPO_LABEL_SF } from './hooks/useEquiposSinFormato'
import type { EquipoSinFormatoHistorial } from '../../types'

function fechaLocalISO(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface GrupoHistorial { usuario_id: string | null, created_at: string, entradas: EquipoSinFormatoHistorial[] }

export function HistorialSidebarSF({ equipoSfId }: { equipoSfId: string }) {
  const { data: historial = [], isLoading } = useHistorialEquipoSF(equipoSfId)
  const { data: profiles = [] } = useProfiles()
  const nombrePorId = new Map(profiles.map(p => [p.id, p.full_name || p.email]))

  const historialPorDia = useMemo(() => {
    const porDia = new Map<string, GrupoHistorial[]>()
    for (const h of historial) {
      const dia = fechaLocalISO(h.created_at)
      if (!porDia.has(dia)) porDia.set(dia, [])
      const grupos = porDia.get(dia)!
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.usuario_id === h.usuario_id && ultimo.created_at === h.created_at) {
        ultimo.entradas.push(h)
      } else {
        grupos.push({ usuario_id: h.usuario_id, created_at: h.created_at, entradas: [h] })
      }
    }
    return [...porDia.entries()]
  }, [historial])

  return (
    <Card bodyStyle={{ padding: '16px 18px' }} style={{ position: 'sticky', top: 20 }}>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} /> Historial
      </h4>
      {isLoading ? (
        <Spinner size={20} />
      ) : historial.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Sin cambios registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {historialPorDia.map(([dia, grupos]) => (
            <div key={dia}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                {fmtFechaCorta(dia)}
              </div>
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grupos.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 12 }}>{nombrePorId.get(g.usuario_id || '') || 'Sistema'}</strong>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{horaLocal(g.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                      {g.entradas.map(h => (
                        <div key={h.id} style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {CAMPO_LABEL_SF[h.campo] || h.campo}
                          {h.campo !== 'creacion' && (h.valor_anterior || h.valor_nuevo) && (
                            <>
                              {': '}
                              {h.valor_anterior && <span style={{ textDecoration: 'line-through' }}>{h.valor_anterior}</span>}
                              {h.valor_anterior && h.valor_nuevo && ' → '}
                              {h.valor_nuevo && <strong style={{ color: 'var(--text)' }}>{h.valor_nuevo}</strong>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
