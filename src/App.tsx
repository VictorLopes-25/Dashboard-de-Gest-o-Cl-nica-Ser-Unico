import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'

import Login from './pages/Login'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Tarefas from './pages/Tarefas'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Scripts from './pages/Scripts'
import Funcoes from './pages/Funcoes'
import Colaboradores from './pages/Colaboradores'
import Dentistas from './pages/Dentistas'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Rotas autenticadas (o AppContext exige sessão válida) */}
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/crm" element={<Leads />} />
            <Route path="/crm/leads/:id" element={<LeadDetail />} />
            <Route path="/crm/scripts" element={<Scripts />} />
            <Route path="/cadastros/funcoes" element={<Funcoes />} />
            <Route path="/cadastros/colaboradores" element={<Colaboradores />} />
            <Route path="/cadastros/dentistas" element={<Dentistas />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
