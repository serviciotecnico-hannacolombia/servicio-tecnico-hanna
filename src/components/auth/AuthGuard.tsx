import { Navigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser'
import { Spinner } from '../ui/Spinner'
import type { ReactNode } from 'react'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useUser()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (profile && !profile.activo) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Cuenta desactivada</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Contacta al administrador para recuperar el acceso.</div>
      </div>
    )
  }

  return <>{children}</>
}
