import { DollarSign } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function TarifasPage() {
  return (
    <div>
      <Header
        title="Tarifas de Envío"
        subtitle="Calculadora de costos de envío"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <DollarSign size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 4</p>
        </div>
      </Card>
    </div>
  )
}
