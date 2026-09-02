import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import {
  LayoutGrid,
  CheckSquare,
  Users2,
  FileText,
  BadgeCheck,
  UserCheck,
  Smile,
  LogOut,
  Menu,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { currentUser, logout, roles, resetData } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Determine current page title based on route
  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'ERP — Dashboard'
    if (path.startsWith('/tarefas')) return 'ERP — Tarefas por Função'
    if (path.startsWith('/crm/leads/')) return 'CRM — Detalhe do Lead'
    if (path.startsWith('/crm/scripts')) return 'CRM — Scripts de Atendimento'
    if (path.startsWith('/crm')) return 'CRM — Funil de Leads'
    if (path.startsWith('/cadastros/funcoes')) return 'Cadastros — Funções'
    if (path.startsWith('/cadastros/colaboradores')) return 'Cadastros — Colaboradores'
    if (path.startsWith('/cadastros/dentistas')) return 'Cadastros — Dentistas'
    return 'Ser Único — Gestão Odontológica'
  }

  // Current date formatted in pt-BR
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Capitalize first letter of weekday
  const capitalizedDate =
    currentDateFormatted.charAt(0).toUpperCase() + currentDateFormatted.slice(1)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleData = roles.find((r) => r.id === currentUser?.roleId)
  const roleColor = roleData?.color || currentUser?.roleColor || '#0F766E'
  const roleBgLight = roleData?.bgLight || '#CCFBF1'
  const roleTextColor = roleData?.textColor || '#0F766E'

  // User initial
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'

  // If user is on login page or not logged in and on root, render just Outlet
  if (location.pathname === '/' || !currentUser) {
    return <Outlet />
  }

  const navGroups = [
    {
      group: 'ERP',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
        { label: 'Tarefas', path: '/tarefas', icon: CheckSquare },
      ],
    },
    {
      group: 'CRM',
      items: [
        { label: 'Leads', path: '/crm', icon: Users2 },
        { label: 'Scripts', path: '/crm/scripts', icon: FileText },
      ],
    },
    {
      group: 'Cadastros',
      items: [
        { label: 'Funções', path: '/cadastros/funcoes', icon: BadgeCheck },
        { label: 'Colaboradores', path: '/cadastros/colaboradores', icon: UserCheck },
        { label: 'Dentistas', path: '/cadastros/dentistas', icon: Smile },
      ],
    },
  ]

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-900/10">
            <span className="text-white font-extrabold text-xl tracking-tight">S</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base text-slate-900 tracking-tight">Ser Único</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            </div>
            <p className="text-[11px] font-medium text-slate-500 tracking-tight">
              Clínica Odontológica
            </p>
          </div>
        </div>

        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 md:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            <div className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400">
              {grp.group}
            </div>
            <div className="space-y-0.5 pt-1">
              {grp.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/crm'
                    ? location.pathname === '/crm' || location.pathname.startsWith('/crm/leads')
                    : location.pathname === item.path

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50/80 text-teal-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-teal-700" />
                    )}
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}

        {/* Quick Reset Demo button */}
        <div className="pt-2 px-1">
          <button
            type="button"
            onClick={resetData}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-teal-700 transition rounded-md border border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/30"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar dados de teste
          </button>
        </div>
      </div>

      {/* Logged User Footer Card */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
            style={{ backgroundColor: roleColor }}
          >
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate" title={currentUser.name}>
              {currentUser.name}
            </p>
            <div className="mt-0.5">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight truncate max-w-full"
                style={{
                  backgroundColor: roleBgLight,
                  color: roleTextColor,
                }}
              >
                {currentUser.roleName}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Trocar usuário"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition shrink-0"
            aria-label="Trocar usuário"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#F6F8F7]">
      {/* Desktop Fixed Sidebar (260px) */}
      <aside className="hidden md:flex md:w-[260px] md:flex-col md:fixed md:inset-y-0 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white animate-in slide-in-from-left duration-200 shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Wrapper with left margin for fixed sidebar */}
      <div className="flex-1 flex flex-col md:pl-[260px] min-w-0">
        {/* Topbar (64px) */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight line-clamp-1">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-block text-xs font-medium text-slate-500 capitalize">
              {capitalizedDate}
            </span>

            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs border"
                style={{
                  backgroundColor: roleBgLight,
                  color: roleTextColor,
                  borderColor: roleColor + '40',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }} />
                <span>{currentUser.roleName}</span>
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden lg:flex text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Trocar</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
