import { Package } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function ConsumiblesPage() {
  return (
    <div>
      <Header
        title="Consumibles"
        subtitle="Control de llegadas y destapes de consumibles"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <Package size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 3</p>
        </div>
      </Card>
    </div>
  )
}
