import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import type { UserRole } from '../../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: { email: string; full_name: string; role: UserRole; password: string }) => Promise<void>
}

const ROLE_OPTS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'user',  label: '👤 Usuario', desc: 'Acceso a los módulos de la intranet' },
  { value: 'admin', label: '👑 Admin',   desc: 'Puede gestionar usuarios y acceder a todo' },
]

export function CreateUserModal({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'user' as UserRole, password: '' })
  const [saving, setSaving] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
      setForm({ email: '', full_name: '', role: 'user', password: '' })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear nuevo usuario">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Nombre completo"
          value={form.full_name}
          onChange={set('full_name')}
          placeholder="Ej: Juan Peñuela"
          required
          autoFocus
        />
        <Input
          label="Correo electrónico"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="juan@hanna.com"
          required
        />
        <Input
          label="Contraseña temporal"
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
        />

        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Rol</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ROLE_OPTS.map(opt => {
              const active = form.role === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                  style={{
                    flex: 1, padding: '10px 12px', border: '1.5px solid',
                    borderColor: active
                      ? opt.value === 'admin' ? 'var(--purple)' : 'var(--accent)'
                      : 'var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: active
                      ? opt.value === 'admin' ? 'var(--purple-bg)' : 'var(--accent-bg)'
                      : 'var(--surface)',
                    color: active
                      ? opt.value === 'admin' ? 'var(--purple)' : 'var(--accent)'
                      : 'var(--muted)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
          El usuario podrá iniciar sesión de inmediato con las credenciales que ingreses. Compártelas de forma segura.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !form.email || !form.full_name || form.password.length < 6} style={{ flex: 2 }}>
            {saving ? 'Creando cuenta…' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
