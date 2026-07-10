import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { useRoles } from '../hooks/useRoles'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: { email: string; full_name: string; role_id: string; password: string }) => Promise<void>
}

export function CreateUserModal({ open, onClose, onSubmit }: Props) {
  const { roles } = useRoles()
  const [form, setForm] = useState({ email: '', full_name: '', role_id: '', password: '' })
  const [saving, setSaving] = useState(false)

  const effectiveRoleId = form.role_id || roles[0]?.id || ''

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveRoleId) return
    setSaving(true)
    try {
      await onSubmit({ ...form, role_id: effectiveRoleId })
      setForm({ email: '', full_name: '', role_id: '', password: '' })
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {roles.map(role => {
              const active = effectiveRoleId === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role_id: role.id }))}
                  style={{
                    padding: '8px 12px', border: '1.5px solid',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--accent-bg)' : 'var(--surface)',
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all .12s',
                  }}
                >
                  {role.name}
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
          <Button type="submit" disabled={saving || !form.email || !form.full_name || !effectiveRoleId || form.password.length < 6} style={{ flex: 2 }}>
            {saving ? 'Creando cuenta…' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
