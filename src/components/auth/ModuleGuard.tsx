import { useUser } from '../../hooks/useUser'
import { Spinner } from '../ui/Spinner'
import type { ModuleKey } from '../../types'
import type { ReactNode } from 'react'

export function ModuleGuard({ moduleKey, children }: { moduleKey: ModuleKey; children: ReactNode }) {
  const { hasModule, loading } = useUser()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!hasModule(moduleKey)) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Sin acceso a este módulo</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Contacta a un líder o administrador si crees que deberías tenerlo.</div>
      </div>
    )
  }

  return <>{children}</>
}
