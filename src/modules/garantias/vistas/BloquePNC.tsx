// Carga del PNC (número de producto no conforme) + fecha límite de entrega —
// compartido por "PNC pendiente" (ruta con stock) e "Importación" (ruta sin
// stock). Con ambos datos la garantía pasa a Informe.
import { useState } from 'react'
import { toast } from 'sonner'
import { FG, INP, PRI } from '../ui'
import { linkPnc } from '../hooks/useGarantias'
import type { VistaProps } from './tipos'

export function BloquePNC({ garantia, puedeEditar, soloLectura, onActualizar }: VistaProps) {
  const [pnc, setPnc] = useState(garantia.numero_pnc || '')
  const [fechaLimite, setFechaLimite] = useState(garantia.fecha_limite_entrega || '')
  const [guardando, setGuardando] = useState(false)
  const deshabilitado = !puedeEditar || soloLectura

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!pnc.trim()) { toast.error('Ingresa el número de PNC'); return }
    if (!fechaLimite) { toast.error('Ingresa la fecha límite de entrega'); return }
    setGuardando(true)
    await onActualizar({ numero_pnc: pnc.trim(), fecha_limite_entrega: fechaLimite, estado: 'informe' }, 'PNC cargado — garantía en Informe')
    setGuardando(false)
  }

  return (
    <form onSubmit={confirmar}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <FG label="PNC (producto no conforme)" required>
          <input value={pnc} onChange={e => setPnc(e.target.value.toUpperCase())} placeholder="Número de PNC registrado" style={INP} disabled={deshabilitado} />
          {linkPnc(pnc) && (
            <a href={linkPnc(pnc)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)', wordBreak: 'break-all' }}>{linkPnc(pnc)}</a>
          )}
        </FG>
        <FG label="Fecha límite de entrega" required>
          <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} style={INP} disabled={deshabilitado} />
        </FG>
      </div>
      {!deshabilitado && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="submit" disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : '✓ Cargar PNC y pasar a Informe →'}</button>
        </div>
      )}
    </form>
  )
}
