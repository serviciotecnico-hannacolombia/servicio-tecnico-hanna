// Módulo Biblioteca: documentos del SGC de Servicio Técnico (PDF por
// carpetas, con revisiones y aprobación). Va con pestañas porque en una fase
// 2 se suma aquí el control de activos fijos con sus certificados de
// calibración vigentes (conectado con Mantenimiento programado).
import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { DocumentosSgc } from './DocumentosSgc'

const TABS = [
  { key: 'documentos', label: 'Documentos SGC', icon: FileText },
] as const

type TabKey = typeof TABS[number]['key']

export function BibliotecaPage() {
  const [tab, setTab] = useState<TabKey>('documentos')

  return (
    <div>
      <Header title="Biblioteca" subtitle="Documentos del SGC de Servicio Técnico" />

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontWeight: tab === key ? 700 : 500,
              border: `1px solid ${tab === key ? 'var(--accent)' : 'var(--border)'}`,
              background: tab === key ? 'var(--accent)' : 'var(--surface)',
              color: tab === key ? '#fff' : 'var(--muted)',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'documentos' && <DocumentosSgc />}
    </div>
  )
}
