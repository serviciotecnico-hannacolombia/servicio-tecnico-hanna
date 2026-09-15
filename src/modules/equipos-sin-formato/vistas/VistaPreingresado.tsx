import { useState } from 'react'
import { toast } from 'sonner'
import { FileCheck } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { FG, INP, PRI } from '../ui'
import { linkOtst, parseOtstCodes } from '../hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../../types'

export function VistaPreingresado({ registro, puedeEditar, onAvanzar }: {
  registro: EquipoSinFormato
  puedeEditar: boolean
  onAvanzar: (overrides: Record<string, unknown>) => void
}) {
  const [otst, setOtst] = useState(registro.otst || '')
  const codigos = parseOtstCodes(otst)

  function confirmar() {
    if (!codigos.length) { toast.error('Ingresa al menos un OTST'); return }
    onAvanzar({ estado: 'ingresado', otst: codigos.join(', '), fecha_ingreso: new Date().toISOString() })
  }

  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <FileCheck size={16} /> Preingresado — con el pre-ingreso <strong>{registro.numero_pre_ingreso}</strong> ya asignado, falta el OTST para quedar ingresado.
      </div>

      <div style={{ maxWidth: 400 }}>
        <FG label="OTST (separados por coma si son varios)">
          <input value={otst} onChange={e => setOtst(e.target.value)} placeholder="Ej. 41784, 41785" style={INP} disabled={!puedeEditar} />
        </FG>
        {codigos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {codigos.map(c => (
              <a key={c} href={linkOtst(c)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)' }}>
                {linkOtst(c)}
              </a>
            ))}
          </div>
        )}
      </div>

      {puedeEditar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={confirmar} style={PRI}>✓ Confirmar ingreso →</button>
        </div>
      )}
    </Card>
  )
}
