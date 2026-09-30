// En importación: la fecha de seguimiento se puede reprogramar (cada cambio
// queda en el historial por trigger), se registran notas de avance, y al
// llegar el producto se carga el PNC para pasar a Informe.
import { useState } from 'react'
import { toast } from 'sonner'
import { Ship, Send } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { useProfiles } from '../../../hooks/useProfiles'
import { useNotasGarantia, agregarNotaGarantia, useInvalidateGarantias } from '../hooks/useGarantias'
import { BannerEstado, CARD_TITULO, FG, INP, PRI, GHOST } from '../ui'
import { BloquePNC } from './BloquePNC'
import type { VistaProps } from './tipos'

export function VistaImportacion(props: VistaProps) {
  const { garantia, puedeEditar, soloLectura, onActualizar } = props
  const deshabilitado = !puedeEditar || soloLectura
  const { data: notas = [] } = useNotasGarantia(garantia.id)
  const { data: profiles = [] } = useProfiles()
  const { invalidateDetalle } = useInvalidateGarantias()
  const nombrePorId = new Map(profiles.map(p => [p.id, p.full_name || p.email]))

  const [fechaSeg, setFechaSeg] = useState(garantia.fecha_seguimiento || '')
  const [guardandoFecha, setGuardandoFecha] = useState(false)
  const [nota, setNota] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)

  async function guardarFecha() {
    if (!fechaSeg) { toast.error('Ingresa la fecha de seguimiento'); return }
    setGuardandoFecha(true)
    await onActualizar({ fecha_seguimiento: fechaSeg }, 'Fecha de seguimiento actualizada')
    setGuardandoFecha(false)
  }

  async function guardarNota(e: React.FormEvent) {
    e.preventDefault()
    if (!nota.trim()) return
    setGuardandoNota(true)
    const { error } = await agregarNotaGarantia(garantia.id, nota)
    setGuardandoNota(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setNota('')
    invalidateDetalle(garantia.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <BannerEstado icon={<Ship size={16} />}>
          {soloLectura ? 'Revisando "Importación" (solo lectura)' : <>En importación con la NV <strong>{garantia.numero_nv}</strong>.</>}
        </BannerEstado>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', maxWidth: 280 }}>
            <FG label="Fecha de seguimiento">
              <input type="date" value={fechaSeg} onChange={e => setFechaSeg(e.target.value)} style={INP} disabled={deshabilitado} />
            </FG>
          </div>
          {!deshabilitado && fechaSeg !== (garantia.fecha_seguimiento || '') && (
            <button onClick={guardarFecha} disabled={guardandoFecha} style={GHOST}>{guardandoFecha ? 'Guardando…' : 'Actualizar fecha'}</button>
          )}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
          Cada cambio de la fecha de seguimiento queda registrado en el historial.
        </p>
      </Card>

      <Card>
        <h4 style={CARD_TITULO}>Notas de avance ({notas.length})</h4>
        {!deshabilitado && (
          <form onSubmit={guardarNota} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. Proveedor confirma despacho la próxima semana…" style={INP} />
            <button type="submit" disabled={guardandoNota || !nota.trim()} style={{ ...PRI, opacity: nota.trim() ? 1 : .5, flexShrink: 0 }}><Send size={13} /> Agregar</button>
          </form>
        )}
        {notas.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Sin notas todavía.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notas.map(n => (
              <div key={n.id} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {nombrePorId.get(n.usuario_id || '') || 'Sistema'} · {new Date(n.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div style={{ fontSize: 13, marginTop: 2, whiteSpace: 'pre-wrap' }}>{n.texto}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h4 style={CARD_TITULO}>PNC</h4>
        <BloquePNC {...props} />
      </Card>
    </div>
  )
}
