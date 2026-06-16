import { FileText } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'

export function EditorPage() {
  return (
    <div>
      <Header
        title="Editor de Informes"
        subtitle="Plantillas HTML para informes técnicos"
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16, color: 'var(--muted)' }}>
          <FileText size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.95rem' }}>Módulo en construcción — Fase 7</p>
        </div>
      </Card>
    </div>
  )
}
