import { useState } from 'react'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { FG, INP, PRI } from '../ui'
import { linkPreIngreso } from '../hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../../types'

export function VistaPendiente({ registro, puedeEditar, onAvanzar }: {
  registro: EquipoSinFormato
  puedeEditar: boolean
  onAvanzar: (overrides: Record<string, unknown>) => void
}) {
  const [numero, setNumero] = useState(registro.numero_pre_ingreso || '')

  function confirmar() {
    if (!numero.trim()) { toast.error('Ingresa el número de pre-ingreso'); return }
    onAvanzar({ estado: 'preingresado', numero_pre_ingreso: numero.trim(), fecha_preingreso: new Date().toISOString() })
  }

  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <Clock size={16} /> Pendiente — esperando el número de pre-ingreso del asesor.
      </div>

      <div style={{ maxWidth: 320 }}>
        <FG label="Número de pre-ingreso">
          <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ej. 462" style={INP} disabled={!puedeEditar} />
        </FG>
        {linkPreIngreso(numero) && (
          <a href={linkPreIngreso(numero)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>
            {linkPreIngreso(numero)}
          </a>
        )}
      </div>

      {puedeEditar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={confirmar} style={PRI}>✓ Confirmar preingreso →</button>
        </div>
      )}
    </Card>
  )
}
