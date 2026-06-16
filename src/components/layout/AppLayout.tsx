import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarProvider, useSidebar } from './SidebarContext'

function AppContent() {
  const { collapsed } = useSidebar()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: collapsed ? 60 : 240,
        padding: '32px',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        transition: 'margin-left 0.22s cubic-bezier(.4,0,.2,1)',
        maxWidth: '100%',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  )
}
