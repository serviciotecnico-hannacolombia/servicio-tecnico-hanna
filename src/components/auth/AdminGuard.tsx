import { Navigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser'
import { Spinner } from '../ui/Spinner'
import type { ReactNode } from 'react'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useUser()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/llamadas" replace />

  return <>{children}</>
}
