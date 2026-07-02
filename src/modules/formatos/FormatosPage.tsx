import { useState } from 'react'
import { Mail, Award, ArrowLeft } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { CorreosOCPage } from './correos/CorreosOCPage'
import { CertificadosPage } from './correos/CertificadosPage'

type Vista = 'menu' | 'correos-oc' | 'certificados'

const FORMATOS: {
  id: Exclude<Vista, 'menu'>
  titulo: string
  descripcion: string
  icon: React.ElementType
  color: string
  bg: string
}[] = [
  {
    id: 'correos-oc',
    titulo: 'Orden de Compra',
    descripcion: 'Genera el correo al proveedor con los datos de la OC y abre tu cliente de correo con todo completado.',
    icon: Mail,
    color: 'var(--accent)',
    bg: 'var(--accent-bg)',
  },
  {
    id: 'certificados',
    titulo: 'Certificados de Calibración',
    descripcion: 'Genera el correo al cliente final con los certificados adjuntos. CC automático a Servicio Técnico.',
    icon: Award,
    color: 'var(--green)',
    bg: 'var(--green-bg)',
  },
]

export function FormatosPage() {
  const [vista, setVista] = useState<Vista>('menu')

  const current = FORMATOS.find(f => f.id === vista)

  if (vista !== 'menu') {
    return (
      <>
        <Header
          title={current?.titulo ?? ''}
          subtitle={
            <button
              onClick={() => setVista('menu')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 500,
                padding: 0, fontFamily: 'var(--sans)',
              }}
            >
              <ArrowLeft size={13} />
              Volver a Correos
            </button>
          }
        />
        <div style={{ padding: '24px 32px' }}>
          {vista === 'correos-oc'   && <CorreosOCPage />}
          {vista === 'certificados' && <CertificadosPage />}
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Correos" subtitle="Selecciona una plantilla de correo" />
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {FORMATOS.map(f => {
            const Icon = f.icon
            return (
              <button
                key={f.id}
                onClick={() => setVista(f.id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px 22px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color .14s, box-shadow .14s',
                  fontFamily: 'var(--sans)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = f.color
                  el.style.boxShadow   = `0 0 0 3px ${f.bg}`
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.boxShadow   = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: f.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={20} color={f.color} />
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
                    {f.titulo}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                  {f.descripcion}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
