import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { CredencialProvider, ToastProvider, WorkspaceProvider } from './components/Providers.jsx'
import Agente from './pages/Agente.jsx'
import Atendimento from './pages/Atendimento.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import Conhecimento from './pages/Conhecimento.jsx'
import Protocolos from './pages/Protocolos.jsx'
import Simulador from './pages/Simulador.jsx'
import VisaoGeral from './pages/VisaoGeral.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CredencialProvider>
          <WorkspaceProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<VisaoGeral />} />
                <Route path="simulador" element={<Simulador />} />
                <Route path="atendimento" element={<Atendimento />} />
                <Route path="protocolos" element={<Protocolos />} />
                <Route path="conhecimento" element={<Conhecimento />} />
                <Route path="agente" element={<Agente />} />
                <Route path="configuracoes" element={<Configuracoes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </WorkspaceProvider>
        </CredencialProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
