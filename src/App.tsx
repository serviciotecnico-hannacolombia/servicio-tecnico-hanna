import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { UserProvider } from './hooks/useUser'
import { AuthGuard } from './components/auth/AuthGuard'
import { AdminGuard } from './components/auth/AdminGuard'
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
              <Route index element={<Navigate to="/llamadas" replace />} />
              <Route path="/llamadas"    element={<LlamadasPage />} />
              <Route path="/bodega"      element={<OtstBodegaPage />} />
              <Route path="/consumibles" element={<ConsumiblesPage />} />
              <Route path="/tarifas"     element={<TarifasPage />} />
              <Route path="/codigos"     element={<CodigosPage />} />
              <Route path="/editor"       element={<EditorPage />} />
              <Route path="/indicadores" element={<IndicadoresPage />} />
              <Route path="/correos"     element={<FormatosPage />} />
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
