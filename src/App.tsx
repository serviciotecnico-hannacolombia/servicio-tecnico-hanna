import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { UserProvider } from './hooks/useUser'
import { AuthGuard } from './components/auth/AuthGuard'
import { LoginPage } from './components/auth/LoginPage'
import { AppLayout } from './components/layout/AppLayout'
import { LlamadasPage } from './modules/llamadas/LlamadasPage'
import { ConsumiblesPage } from './modules/consumibles/ConsumiblesPage'
import { TarifasPage } from './modules/tarifas/TarifasPage'
import { CodigosPage } from './modules/codigos/CodigosPage'
import { PhPage } from './modules/ph/PhPage'
import { EditorPage } from './modules/editor/EditorPage'

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
              <Route path="/consumibles" element={<ConsumiblesPage />} />
              <Route path="/tarifas"     element={<TarifasPage />} />
              <Route path="/codigos"     element={<CodigosPage />} />
              <Route path="/ph"          element={<PhPage />} />
              <Route path="/editor"      element={<EditorPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </UserProvider>
    </QueryClientProvider>
  )
}
