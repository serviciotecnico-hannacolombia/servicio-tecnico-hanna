import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { getDefaultRoute } from './lib/constants'
import { UserProvider, useUser } from './hooks/useUser'
import { AuthGuard } from './components/auth/AuthGuard'
import { AdminGuard } from './components/auth/AdminGuard'
import { ModuleGuard } from './components/auth/ModuleGuard'
import { LoginPage } from './components/auth/LoginPage'
import { AppLayout } from './components/layout/AppLayout'
import { LlamadasPage } from './modules/llamadas/LlamadasPage'
import { OtstBodegaPage } from './modules/otst-bodega/OtstBodegaPage'
import { ConsumiblesPage } from './modules/consumibles/ConsumiblesPage'
import { TarifasPage } from './modules/tarifas/TarifasPage'
import { CodigosPage } from './modules/codigos/CodigosPage'
import { EditorPage } from './modules/editor/EditorPage'
import { AdminPage } from './modules/admin/AdminPage'
import { IndicadoresPage } from './modules/indicadores/IndicadoresPage'
import { FormatosPage } from './modules/formatos/FormatosPage'
import { ReporteSTPage } from './modules/reporte-st/ReporteSTPage'
import { TareasPage } from './modules/tareas/TareasPage'
import { MantenimientoProgramadoPage } from './modules/mantenimiento-programado/MantenimientoProgramadoPage'

function DefaultRedirect() {
  const { hasModule } = useUser()
  return <Navigate to={getDefaultRoute(hasModule)} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<DefaultRedirect />} />
              <Route path="/llamadas"    element={<ModuleGuard moduleKey="llamadas"><LlamadasPage /></ModuleGuard>} />
              <Route path="/bodega"      element={<ModuleGuard moduleKey="bodega"><OtstBodegaPage /></ModuleGuard>} />
              <Route path="/consumibles" element={<ModuleGuard moduleKey="consumibles"><ConsumiblesPage /></ModuleGuard>} />
              <Route path="/tarifas"     element={<ModuleGuard moduleKey="tarifas"><TarifasPage /></ModuleGuard>} />
              <Route path="/codigos"     element={<ModuleGuard moduleKey="codigos"><CodigosPage /></ModuleGuard>} />
              <Route path="/editor"       element={<ModuleGuard moduleKey="editor"><EditorPage /></ModuleGuard>} />
              <Route path="/indicadores" element={<ModuleGuard moduleKey="indicadores"><IndicadoresPage /></ModuleGuard>} />
              <Route path="/correos"     element={<ModuleGuard moduleKey="correos"><FormatosPage /></ModuleGuard>} />
              <Route path="/reporte-st"  element={<ModuleGuard moduleKey="reporte_st"><ReporteSTPage /></ModuleGuard>} />
              <Route path="/tareas"     element={<ModuleGuard moduleKey="tareas"><TareasPage /></ModuleGuard>} />
              <Route path="/mantenimiento-programado" element={<ModuleGuard moduleKey="mantenimiento_programado"><MantenimientoProgramadoPage /></ModuleGuard>} />
              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminPage />
                  </AdminGuard>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </UserProvider>
    </QueryClientProvider>
  )
}
