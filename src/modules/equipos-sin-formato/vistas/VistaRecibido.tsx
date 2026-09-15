import { Inbox } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { PRI } from '../ui'
import type { EquipoSinFormato } from '../../../types'

export function VistaRecibido({ puedeEditar, onAvanzar }: {
  registro: EquipoSinFormato
  puedeEditar: boolean
  onAvanzar: (overrides: Record<string, unknown>) => void
}) {
  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <Inbox size={16} /> Recibido — el correo ya fue enviado al asesor. Cuando confirme que está gestionando el ingreso, márcalo como pendiente.
      </div>

      {puedeEditar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => onAvanzar({ estado: 'pendiente', fecha_pendiente: new Date().toISOString() })} style={PRI}>
            ✓ Marcar como pendiente →
          </button>
        </div>
      )}
    </Card>
  )
}
