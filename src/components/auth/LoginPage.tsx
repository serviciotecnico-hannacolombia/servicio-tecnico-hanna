import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import logo from '../../assets/logo.svg'

export function LoginPage() {
  const { user, loading } = useUser()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (user) return <Navigate to="/llamadas" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message)
    } else {
      navigate('/llamadas')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '44px 40px',
        width: '100%',
        maxWidth: 400,
        border: '1px solid var(--border)',
        animation: 'fadeIn .2s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img
            src={logo}
            alt="Hanna Instruments"
            style={{ height: 42, width: 'auto', display: 'block', margin: '0 auto' }}
          />
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--muted)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginTop: '10px',
          }}>
            Servicio Técnico · Intranet
          </div>
          <div style={{
            width: 40,
            height: 3,
            background: 'var(--accent)',
            borderRadius: 2,
            margin: '14px auto 0',
            opacity: 0.4,
          }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="usuario@hannainst.com"
            required
            autoFocus
            icon={<Mail size={15} />}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={<Lock size={15} />}
          />
          <Button
            type="submit"
            disabled={submitting}
            style={{ marginTop: 8, width: '100%', padding: '11px 18px', fontSize: '0.9rem' }}
          >
            {submitting ? <Spinner size={16} color="#fff" /> : 'Ingresar'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: 'var(--muted)' }}>
          Acceso solo para el equipo de Servicio Técnico
        </p>
      </div>
    </div>
  )
}
