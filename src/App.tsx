/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/context/AppContext'

import Layout from './components/Layout'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
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
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Authenticated Layout Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/crm" element={<Leads />} />
            <Route path="/crm/leads/:id" element={<LeadDetail />} />
            <Route path="/crm/scripts" element={<Scripts />} />
            <Route path="/cadastros/funcoes" element={<Funcoes />} />
            <Route path="/cadastros/colaboradores" element={<Colaboradores />} />
            <Route path="/cadastros/dentistas" element={<Dentistas />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AppProvider>
  </BrowserRouter>
)

export default App
