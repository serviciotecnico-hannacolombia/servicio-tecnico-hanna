import { Phone } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function LlamadasPage() {
  return (
    <div>
      <Header
        title="Control de Llamadas"
        subtitle="Seguimiento diario de llamadas al cliente"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <Phone size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 2</p>
        </div>
      </Card>
    </div>
  )
}
