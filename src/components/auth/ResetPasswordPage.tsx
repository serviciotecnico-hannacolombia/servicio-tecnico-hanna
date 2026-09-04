import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import logo from '../../assets/logo.svg'

// Página independiente de LoginPage/AuthGuard a propósito: en cuanto
// supabase-js procesa el token del correo de recuperación (lo hace solo,
// vía detectSessionInUrl), deja una sesión activa — si esto pasara dentro
// de LoginPage (que redirige a la app apenas ve `user`), mandaría al
// usuario directo adentro sin darle chance de poner la nueva contraseña.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) setReady(true)
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) { toast.error('Error al actualizar la contraseña'); return }
    toast.success('Contraseña actualizada')
    navigate('/')
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
            Nueva contraseña
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

        {checking ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Spinner size={28} />
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: 8 }}>
              Este enlace no es válido o ya expiró.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 20 }}>
              Pide un nuevo enlace de recuperación desde la pantalla de inicio de sesión.
            </p>
            <Button onClick={() => navigate('/login')} style={{ width: '100%', padding: '11px 18px', fontSize: '0.9rem' }}>
              Ir a iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoFocus
              icon={<Lock size={15} />}
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              icon={<Lock size={15} />}
            />
            <Button
              type="submit"
              disabled={submitting}
              style={{ marginTop: 8, width: '100%', padding: '11px 18px', fontSize: '0.9rem' }}
            >
              {submitting ? <Spinner size={16} color="#fff" /> : 'Guardar nueva contraseña'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
