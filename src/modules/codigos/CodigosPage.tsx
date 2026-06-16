import { Wrench } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function CodigosPage() {
  return (
    <div>
      <Header
        title="Códigos y Partes"
        subtitle="Catálogo de búsqueda de partes Hanna"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <Wrench size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 5</p>
        </div>
      </Card>
    </div>
  )
}
