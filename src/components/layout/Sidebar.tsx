import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import {
  Phone, Package, DollarSign, Wrench, FileText, Warehouse,
  LogOut, Pencil, ShieldCheck, BarChart2, Mail, KeyRound, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSidebar } from './SidebarContext'
import { useUser } from '../../hooks/useUser'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import type { ModuleKey } from '../../types'

// ── Hamburger animado ────────────────────────────────────────────────────────
// open=false → 3 líneas (hamburguesa)   open=true → X (cerrar)
function HamburgerIcon({ open }: { open: boolean }) {
  const T = 'transform 0.24s cubic-bezier(.4,0,.2,1), opacity 0.18s ease'
  const bar = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    width: 16,
    height: 1.5,
    background: 'currentColor',
    borderRadius: 1,
    transition: T,
    ...extra,
  })

  return (
    <div style={{ position: 'relative', width: 16, height: 12 }}>
      <span style={bar({
        top: 0,
        transform: open ? 'translateY(5.25px) rotate(45deg)' : 'none',
      })} />
      <span style={bar({
        top: 5.25,
        opacity: open ? 0 : 1,
        transform: open ? 'scaleX(0)' : 'none',
      })} />
      <span style={bar({
        bottom: 0,
        transform: open ? 'translateY(-5.25px) rotate(-45deg)' : 'none',
      })} />
    </div>
  )
}

const NAV_ITEMS: { to: string; label: string; icon: typeof Phone; moduleKey: ModuleKey }[] = [
  { to: '/llamadas',    label: 'Control Llamadas',   icon: Phone,      moduleKey: 'llamadas'    },
  { to: '/bodega',      label: 'Bodega',              icon: Warehouse,  moduleKey: 'bodega'      },
  { to: '/consumibles', label: 'Consumibles',         icon: Package,    moduleKey: 'consumibles' },
  { to: '/tarifas',     label: 'Tarifas de Envío',   icon: DollarSign, moduleKey: 'tarifas'     },
  { to: '/codigos',     label: 'Códigos y Partes',   icon: Wrench,     moduleKey: 'codigos'     },
  { to: '/editor',       label: 'Editor de Informes', icon: FileText,   moduleKey: 'editor'      },
  { to: '/indicadores',  label: 'Indicadores',        icon: BarChart2,  moduleKey: 'indicadores' },
  { to: '/correos',      label: 'Correos',             icon: Mail,       moduleKey: 'correos'     },
]

const ANIMALS = [
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🐯',
  '🦁','🐮','🐸','🐙','🦋','🦄','🐬','🦅',
  '🦉','🐧','🦜','🐢','🦈','🐳','🦭','🐘',
]

const AVATAR_COLORS = [
  { value: '#005eb8', label: 'Azul'     },
  { value: '#7c3aed', label: 'Morado'   },
  { value: '#16a34a', label: 'Verde'    },
  { value: '#ea580c', label: 'Naranja'  },
  { value: '#db2777', label: 'Rosa'     },
  { value: '#0891b2', label: 'Teal'     },
  { value: '#dc2626', label: 'Rojo'     },
  { value: '#334155', label: 'Oscuro'   },
]

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { user, displayName, profile, isAdmin, hasModule, signOut, updateDisplayName, updateAvatar } = useUser()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [pwdOpen,    setPwdOpen]    = useState(false)
  const [pwdActual,  setPwdActual]  = useState('')
  const [pwdNueva,   setPwdNueva]   = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [savingPwd,  setSavingPwd]  = useState(false)

  const handleCambiarPwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwdNueva.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres')
    if (pwdNueva !== pwdConfirm) return toast.error('Las contraseñas no coinciden')
    setSavingPwd(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '', password: pwdActual,
      })
      if (authError) { toast.error('Contraseña actual incorrecta'); return }
      const { error } = await supabase.auth.updateUser({ password: pwdNueva })
      if (error) throw error
      toast.success('Contraseña actualizada')
      setPwdActual(''); setPwdNueva(''); setPwdConfirm(''); setPwdOpen(false)
    } catch {
      toast.error('Error al cambiar la contraseña')
    } finally {
      setSavingPwd(false)
    }
  }

  const openProfile = () => {
    setNombre(displayName)
    setSelectedEmoji(profile?.avatar_emoji ?? null)
    setSelectedColor(profile?.avatar_color ?? null)
    setProfileOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await Promise.all([
        updateDisplayName(nombre.trim()),
        updateAvatar(selectedEmoji, selectedColor),
      ])
      toast.success('Perfil actualizado')
      setProfileOpen(false)
    } catch {
      toast.error('Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const W = collapsed ? 60 : 240

  return (
    <aside style={{
      width: W,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '14px 0' : '18px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        minHeight: 64,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <img
              src={logo}
              alt="Hanna Instruments"
              style={{ height: 28, width: 'auto', display: 'block' }}
            />
            <div style={{
              fontSize: '0.65rem',
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 4,
              whiteSpace: 'nowrap',
            }}>
              Servicio Técnico
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          style={{
            background: 'var(--surface2)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            width: 30,
            height: 30,
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.14s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          <HamburgerIcon open={!collapsed} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.filter(item => hasModule(item.moduleKey)).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '11px 0' : '10px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all 0.14s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            })}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {!collapsed && (
              <div style={{
                margin: '8px 16px 4px',
                fontSize: '0.62rem', fontFamily: 'var(--mono)', fontWeight: 600,
                color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
                opacity: 0.6,
              }}>
                Admin
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />}
            <NavLink
              to="/admin"
              title={collapsed ? 'Administración' : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '11px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive ? 'var(--purple)' : 'var(--muted)',
                background: isActive ? 'var(--purple-bg)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--purple)' : '3px solid transparent',
                transition: 'all 0.14s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Administración</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '12px 0' : '14px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && displayName && (
          <button
            onClick={openProfile}
            title="Editar perfil"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '6px 4px', border: 'none', borderRadius: 'var(--radius-sm)',
              background: 'transparent', cursor: 'pointer', marginBottom: 8,
              textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Avatar
              name={displayName}
              emoji={profile?.avatar_emoji}
              color={profile?.avatar_color}
              size={26}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <Pencil size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          </button>
        )}
        {collapsed && displayName && (
          <button
            onClick={openProfile}
            title="Editar perfil"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '4px 0', border: 'none',
              background: 'transparent', cursor: 'pointer', marginBottom: 8,
            }}
          >
            <Avatar
              name={displayName}
              emoji={profile?.avatar_emoji}
              color={profile?.avatar_color}
              size={28}
            />
          </button>
        )}
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 6, width: '100%', padding: '7px 10px', border: 'none',
            borderRadius: 'var(--radius-sm)', background: 'var(--red-bg)', color: 'var(--red)',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && 'Cerrar sesión'}
        </button>

        {!collapsed && (
          <a
            href="https://www.instagram.com/brayansgl"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 10,
              fontSize: '0.62rem',
              color: 'var(--muted)',
              opacity: 0.45,
              textAlign: 'center',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.03em',
              userSelect: 'none',
              display: 'block',
              textDecoration: 'none',
              transition: 'opacity .2s, transform .2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.opacity = '0.85'
              el.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.opacity = '0.45'
              el.style.transform = 'scale(1)'
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'
            }}
          >
            Desarrollado por @brayansgl <span className="bat-icon" aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Modal de perfil */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Editar perfil" width={500}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar
              name={nombre || displayName}
              emoji={selectedEmoji}
              color={selectedColor}
              size={64}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              Vista previa
            </span>
          </div>

          {/* Nombre */}
          <Input
            label="Nombre completo"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Brayan Galeano"
            required
          />

          {/* Animal picker */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
              Elige un animal
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {/* Opción "sin animal" */}
              <button
                type="button"
                onClick={() => setSelectedEmoji(null)}
                title="Sin animal (usar iniciales)"
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 10,
                  border: `2px solid ${selectedEmoji === null ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedEmoji === null ? 'var(--accent-bg)' : 'var(--surface2)',
                  cursor: 'pointer', fontSize: '0.65rem', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .1s',
                }}
              >
                {nombre ? nombre.slice(0, 2).toUpperCase() : '—'}
              </button>
              {ANIMALS.map(animal => (
                <button
                  key={animal}
                  type="button"
                  onClick={() => setSelectedEmoji(animal)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 10, fontSize: '1.3rem',
                    border: `2px solid ${selectedEmoji === animal ? 'var(--accent)' : 'var(--border)'}`,
                    background: selectedEmoji === animal ? 'var(--accent-bg)' : 'var(--surface2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .1s',
                  }}
                  onMouseEnter={e => { if (selectedEmoji !== animal) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { if (selectedEmoji !== animal) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  {animal}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
              Color de fondo
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Opción "sin color" (gradient por defecto) */}
              <button
                type="button"
                onClick={() => setSelectedColor(null)}
                title="Color por defecto"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: `3px solid ${selectedColor === null ? 'var(--text)' : 'transparent'}`,
                  cursor: 'pointer', outline: selectedColor === null ? '2px solid var(--accent)' : 'none',
                  outlineOffset: 2, transition: 'outline .1s',
                  flexShrink: 0,
                }}
              />
              {AVATAR_COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedColor(value)}
                  title={label}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: value,
                    border: '3px solid transparent',
                    cursor: 'pointer',
                    outline: selectedColor === value ? `2px solid ${value}` : 'none',
                    outlineOffset: 2, transition: 'outline .1s',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
            Tu avatar aparecerá en el sidebar, la carrera del día y el panel de admin.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setProfileOpen(false)} style={{ flex: 1 }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nombre.trim()} style={{ flex: 2 }}>
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </Button>
          </div>
        </form>

        {/* Cambiar contraseña */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => { setPwdOpen(o => !o); setPwdActual(''); setPwdNueva(''); setPwdConfirm('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)',
            }}
          >
            <KeyRound size={14} />
            Cambiar contraseña
            <ChevronDown size={14} style={{ marginLeft: 'auto', transition: 'transform .2s', transform: pwdOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {pwdOpen && (
            <form onSubmit={handleCambiarPwd} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <Input
                label="Contraseña actual"
                type="password"
                value={pwdActual}
                onChange={e => setPwdActual(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="Nueva contraseña"
                type="password"
                value={pwdNueva}
                onChange={e => setPwdNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <Input
                label="Confirmar nueva contraseña"
                type="password"
                value={pwdConfirm}
                onChange={e => setPwdConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Button type="submit" disabled={savingPwd || !pwdActual || !pwdNueva || !pwdConfirm}>
                {savingPwd ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </aside>
  )
}
