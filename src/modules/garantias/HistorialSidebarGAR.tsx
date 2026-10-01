// Barra lateral de historial — mismo patrón que HistorialSidebarSF (Equipos
// Sin Formato): agrupado por día, y las entradas del mismo instante y la
// misma persona se colapsan bajo un solo encabezado nombre/hora. Los valores
// se traducen a algo legible (uuids de responsables → nombres, estados,
// fechas, sí/no).
import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { useProfiles } from '../../hooks/useProfiles'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import { useHistorialGarantia, CAMPO_LABEL_GAR, ESTADO_LABEL_GAR, fmtFecha } from './hooks/useGarantias'
import type { EstadoGarantia, GarantiaHistorial } from '../../types'

function fechaLocalISO(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface GrupoHistorial { usuario_id: string | null, created_at: string, entradas: GarantiaHistorial[] }

export function HistorialSidebarGAR({ garantiaId }: { garantiaId: string }) {
  const { data: historial = [], isLoading } = useHistorialGarantia(garantiaId)
  const { data: profiles = [] } = useProfiles()
  const { data: asesores = [] } = useAsesores()
  const nombrePorId = new Map(profiles.map(p => [p.id, p.full_name || p.email]))
  const asesorPorCorreo = new Map(asesores.map(a => [a.correo, a.nombre]))

  function formatear(campo: string, valor: string | null): string | null {
    if (!valor) return null
    switch (campo) {
      case 'responsables': return valor.split(',').filter(Boolean).map(id => nombrePorId.get(id) || id).join(', ')
      case 'estado': return ESTADO_LABEL_GAR[valor as EstadoGarantia] || valor
      case 'fecha_seguimiento':
      case 'fecha_limite_entrega': return fmtFecha(valor)
      case 'hay_stock':
      case 'anulada': return valor === 'true' ? 'Sí' : 'No'
      case 'asesor_correo': return asesorPorCorreo.get(valor) || valor
      default: return valor
    }
  }

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
                {fmtFecha(dia)}
              </div>
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grupos.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 12 }}>{nombrePorId.get(g.usuario_id || '') || 'Sistema'}</strong>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{horaLocal(g.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                      {g.entradas.map(h => {
                        const antes = formatear(h.campo, h.valor_anterior)
                        const despues = formatear(h.campo, h.valor_nuevo)
                        return (
                          <div key={h.id} style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            {CAMPO_LABEL_GAR[h.campo] || h.campo}
                            {h.campo !== 'creacion' && (antes || despues) && (
                              <>
                                {': '}
                                {antes && <span style={{ textDecoration: 'line-through' }}>{antes}</span>}
                                {antes && despues && ' → '}
                                {despues && <strong style={{ color: 'var(--text)' }}>{despues}</strong>}
                              </>
                            )}
                          </div>
                        )
                      })}
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
