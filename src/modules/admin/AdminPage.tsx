import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Shield, Users, UserX, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Spinner } from '../../components/ui/Spinner'
import { CreateUserModal } from './components/CreateUserModal'
import { useUsers } from './hooks/useUsers'
import { useUser } from '../../hooks/useUser'
import type { Profile, UserRole } from '../../types'

function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      fontFamily: 'var(--mono)',
      background: isAdmin ? 'var(--purple-bg)' : 'var(--surface2)',
      color: isAdmin ? 'var(--purple)' : 'var(--muted)',
      border: `1px solid ${isAdmin ? 'rgba(124,58,237,.3)' : 'var(--border)'}`,
    }}>
      {isAdmin ? '👑 Admin' : '👤 Usuario'}
    </span>
  )
}

function ActiveBadge({ activo }: { activo: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--mono)',
      background: activo ? 'var(--green-bg)' : 'var(--red-bg)',
      color: activo ? 'var(--green)' : 'var(--red)',
      border: `1px solid ${activo ? 'var(--green-border)' : 'var(--red-border)'}`,
    }}>
      {activo ? '● Activo' : '○ Inactivo'}
    </span>
  )
}

export function AdminPage() {
  const { user: currentUser } = useUser()
  const { users, isLoading, updateRole, toggleActivo, createUser, deleteUser } = useUsers()
  const [createOpen, setCreateOpen] = useState(false)

  const total    = users.length
  const admins   = users.filter(u => u.role === 'admin').length
  const inactive = users.filter(u => !u.activo).length

  const handleRoleChange = async (u: Profile) => {
    const newRole: UserRole = u.role === 'admin' ? 'user' : 'admin'
    const label = newRole === 'admin' ? 'administrador' : 'usuario'
    if (!confirm(`¿Cambiar a ${u.full_name ?? u.email} a ${label}?`)) return
    try {
      await updateRole.mutateAsync({ id: u.id, role: newRole })
      toast.success(`Rol actualizado a ${label}`)
    } catch {
      toast.error('Error al cambiar el rol')
    }
  }

  const handleToggleActivo = async (u: Profile) => {
    const action = u.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${u.full_name ?? u.email}?`)) return
    try {
      await toggleActivo.mutateAsync({ id: u.id, activo: !u.activo })
      toast.success(`Usuario ${u.activo ? 'desactivado' : 'activado'}`)
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  const handleDelete = async (u: Profile) => {
    if (!confirm(`¿Eliminar permanentemente a ${u.full_name ?? u.email}?\n\nEsta acción no se puede deshacer.`)) return
    try {
      await deleteUser.mutateAsync(u.id)
      toast.success('Usuario eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleCreate = async (data: { email: string; full_name: string; role: UserRole; password: string }) => {
    try {
      await createUser.mutateAsync(data)
      toast.success(`Usuario ${data.full_name} creado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario')
      throw err
    }
  }

  return (
    <div>
      <Header title="Administración" subtitle="Gestión segura de usuarios de la intranet" />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={statStyle('var(--accent)')}>
          <Users size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total usuarios</div>
          </div>
        </div>
        <div style={statStyle('var(--purple)')}>
          <Shield size={18} style={{ color: 'var(--purple)' }} />
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--purple)', lineHeight: 1 }}>{admins}</div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Administradores</div>
          </div>
        </div>
        <div style={statStyle('var(--red)')}>
          <UserX size={18} style={{ color: 'var(--red)' }} />
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{inactive}</div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inactivos</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <UserPlus size={15} /> Crear usuario
          </Button>
        </div>
      </div>

      {/* User list */}
      <Card bodyStyle={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 20px' }}>
            <Spinner size={28} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 12, opacity: 0.4 }}>👥</div>
            <div style={{ fontWeight: 600 }}>Sin usuarios registrados</div>
            <div style={{ fontSize: '0.85rem', marginTop: 6 }}>
              Configura la tabla <code>profiles</code> en Supabase y ejecuta el trigger para comenzar.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  {['Usuario', 'Rol', 'Estado', 'Creado', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                      fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const isMe = u.id === currentUser?.id
                  const name = u.full_name ?? u.email
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                        background: isMe ? 'var(--accent-bg)' : 'transparent',
                        transition: 'background .1s',
                        opacity: u.activo ? 1 : 0.55,
                      }}
                      onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {/* Usuario */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar
                            name={name}
                            emoji={u.avatar_emoji}
                            color={u.avatar_color ?? (u.role === 'admin' ? '#7c3aed' : undefined)}
                            size={36}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {name}
                              {isMe && (
                                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>
                                  Tú
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '12px 16px' }}>
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px 16px' }}>
                        <ActiveBadge activo={u.activo} />
                      </td>

                      {/* Creado */}
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 16px' }}>
                        {isMe ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <ActionBtn
                              onClick={() => handleRoleChange(u)}
                              disabled={updateRole.isPending}
                              color={u.role === 'admin' ? 'var(--muted)' : 'var(--purple)'}
                              bg={u.role === 'admin' ? 'var(--surface2)' : 'var(--purple-bg)'}
                            >
                              {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                            </ActionBtn>
                            <ActionBtn
                              onClick={() => handleToggleActivo(u)}
                              disabled={toggleActivo.isPending}
                              color={u.activo ? 'var(--red)' : 'var(--green)'}
                              bg={u.activo ? 'var(--red-bg)' : 'var(--green-bg)'}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </ActionBtn>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={deleteUser.isPending}
                              title="Eliminar usuario permanentemente"
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                                background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer',
                                transition: 'all .12s', fontSize: '0.75rem',
                              }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--red)'; el.style.borderColor = 'var(--red-border)'; el.style.background = 'var(--red-bg)' }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--muted)'; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--surface)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

function statStyle(borderColor: string): React.CSSProperties {
  return {
    flex: 1, minWidth: 140,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: 'var(--radius)', padding: '16px 20px',
    boxShadow: 'var(--shadow)',
    display: 'flex', alignItems: 'center', gap: 14,
  }
}

function ActionBtn({
  children, onClick, disabled, color, bg,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  color: string
  bg: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}`,
        background: bg, color, fontWeight: 600, fontSize: '0.73rem',
        cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'opacity .1s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
