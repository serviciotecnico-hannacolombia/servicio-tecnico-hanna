import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, Lock, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getDefaultRoute } from '../../lib/constants'
import { useUser } from '../../hooks/useUser'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import logo from '../../assets/logo.svg'

const ALLOWED_DOMAIN = 'hannacolombia.com'

export function LoginPage() {
  const { user, loading, hasModule } = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (user) return <Navigate to={getDefaultRoute(hasModule)} replace />

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message)
    } else {
      navigate('/')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      toast.error(`Solo se permiten cuentas con correo @${ALLOWED_DOMAIN}`)
      return
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('self-signup', {
        body: { email, full_name: fullName, password },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Error al crear la cuenta')

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = mode === 'login' ? handleLogin : handleSignup

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
          {mode === 'signup' && (
            <Input
              label="Nombre completo"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej: José Arcadio Buendía"
              required
              autoFocus
              icon={<User size={15} />}
            />
          )}
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={mode === 'signup' ? `usuario@${ALLOWED_DOMAIN}` : 'usuario@hannainst.com'}
            required
            autoFocus={mode === 'login'}
            icon={<Mail size={15} />}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={mode === 'signup' ? 6 : undefined}
            icon={<Lock size={15} />}
          />
          {mode === 'signup' && (
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              icon={<Lock size={15} />}
            />
          )}
          <Button
            type="submit"
            disabled={submitting}
            style={{ marginTop: 8, width: '100%', padding: '11px 18px', fontSize: '0.9rem' }}
          >
            {submitting ? <Spinner size={16} color="#fff" /> : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem' }}>
          {mode === 'login' ? (
            <>
              <span style={{ color: 'var(--muted)' }}>¿Eres del equipo y no tienes cuenta? </span>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 'inherit' }}
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 'inherit' }}
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </p>

        <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {mode === 'signup' ? `Solo se permiten correos @${ALLOWED_DOMAIN}` : 'Acceso solo para el equipo de Servicio Técnico'}
        </p>

        <a
          href="https://www.instagram.com/brayansgl"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            width: '100%',
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.72rem',
            fontFamily: 'var(--mono)',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--muted)',
            opacity: 0.65,
            textDecoration: 'none',
            animation: 'heartbeat 2.4s ease-in-out infinite',
            transition: 'opacity .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)' }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
        >
          Desarrollado por @brayansgl <span className="bat-icon" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
