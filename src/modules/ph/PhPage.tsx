import { FlaskConical } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function PhPage() {
  return (
    <div>
      <Header
        title="Pendiente de pH"
        subtitle="Calibraciones de pH pendientes y tracker"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <FlaskConical size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 6</p>
        </div>
      </Card>
    </div>
  )
}
