import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, Package, DollarSign, Wrench, FlaskConical, FileText,
  LogOut, ChevronLeft, Menu,
} from 'lucide-react'
import { useSidebar } from './SidebarContext'
import { useUser } from '../../hooks/useUser'

const NAV_ITEMS = [
  { to: '/llamadas',    label: 'Control Llamadas',   icon: Phone        },
  { to: '/consumibles', label: 'Consumibles',         icon: Package      },
  { to: '/tarifas',     label: 'Tarifas de Envío',   icon: DollarSign   },
  { to: '/codigos',     label: 'Códigos y Partes',   icon: Wrench       },
  { to: '/ph',          label: 'Pendiente de pH',    icon: FlaskConical },
  { to: '/editor',      label: 'Editor de Informes', icon: FileText     },
]

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { displayName, signOut } = useUser()
  const navigate = useNavigate()

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
            <div style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: 'var(--accent)',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              HANNA
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
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
          }}
        >
          {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '12px 0' : '14px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && displayName && (
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 8,
            padding: '0 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>
        )}
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 6,
            width: '100%',
            padding: '7px 10px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--red-bg)',
            color: 'var(--red)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
