import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { TaskModal } from '@/components/TaskModal'
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AgendaItem } from '@/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    currentUser,
    roles,
    collaborators,
    agendaItems,
    overdueAgendaItems,
    leads,
    loadAgendaWindow,
    toggleTaskCompletion,
  } = useApp()

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [weeklyItems, setWeeklyItems] = useState<AgendaItem[]>([])

  // Data atual no formato ISO YYYY-MM-DD local
  const todayStr = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Período de 7 dias para Desempenho da Semana (dos últimos 6 dias até hoje inclusive = 7 dias)
  const weekStartStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Carregar itens reais da janela de 7 dias via loadAgendaWindow (Supabase)
  useEffect(() => {
    let mounted = true
    loadAgendaWindow(weekStartStr, todayStr)
      .then((res) => {
        if (mounted) {
          setWeeklyItems(res.items)
        }
      })
      .catch((err) => {
        console.error('Falha ao carregar itens da semana para o Dashboard:', err)
      })

    return () => {
      mounted = false
    }
  }, [weekStartStr, todayStr, loadAgendaWindow, agendaItems])

  // Saudação com base no horário
  const currentHour = new Date().getHours()
  let greeting = 'Bom dia'
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Boa tarde'
  } else if (currentHour >= 18 || currentHour < 5) {
    greeting = 'Boa noite'
  }

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalizedDate =
    currentDateFormatted.charAt(0).toUpperCase() + currentDateFormatted.slice(1)

  // Função ativa atual segundo o mecanismo do app
  const userRole = roles.find((r) => r.id === currentUser?.roleId)
  const userRoleId = currentUser?.roleId || ''

  // -------------------------------------------------------------------------
  // REGRAS DE NEGÓCIO: TOP KPIs REAIS DE agenda_items (sem mock fallback)
  // -------------------------------------------------------------------------
  // 1. "Tarefas de hoje": type='tarefa', due_date=CURRENT_DATE, status <> 'cancelado'
  const todayTaskItems = useMemo(() => {
    return agendaItems.filter(
      (i) => i.type === 'tarefa' && i.dueDate === todayStr && i.status !== 'cancelado',
    )
  }, [agendaItems, todayStr])

  // 2. "Concluídas hoje": as concluídas de hoje (type='tarefa', due_date=CURRENT_DATE, status='concluido')
  const completedTodayTasks = useMemo(() => {
    return todayTaskItems.filter((i) => i.status === 'concluido')
  }, [todayTaskItems])

  // 3. "Atrasadas": status='aberto' AND due_date < CURRENT_DATE
  const overdueTasks = useMemo(() => {
    return overdueAgendaItems.filter((i) => i.status === 'aberto' && i.dueDate < todayStr)
  }, [overdueAgendaItems, todayStr])

  // 4. "Follow-ups de hoje" (Regra Stage 2C): type='follow_up', due_date=CURRENT_DATE, status='aberto'
  const todayFollowUps = useMemo(() => {
    return agendaItems.filter(
      (i) => i.type === 'follow_up' && i.dueDate === todayStr && i.status === 'aberto',
    )
  }, [agendaItems, todayStr])

  // Minhas tarefas de hoje: agenda da função do usuário ativo atual (abertas e concluídas)
  const myTasks = useMemo(() => {
    return agendaItems.filter((i) => {
      if (i.type !== 'tarefa') return false
      if (i.status === 'cancelado') return false
      if (userRoleId && i.functionId && i.functionId !== userRoleId) return false
      return i.dueDate === todayStr
    })
  }, [agendaItems, userRoleId, todayStr])

  // Nome do colaborador
  const getCollaboratorName = (id?: string) => {
    if (!id) return null
    return collaborators.find((c) => c.id === id)?.name
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {currentUser?.name || 'Colaborador(a)'}!
            </span>
            <Sparkles className="w-5 h-5 text-amber-500 hidden sm:inline" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {capitalizedDate} • Visão operacional Ser Único
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2"
            style={{
              backgroundColor: userRole?.bgLight || '#CCFBF1',
              color: userRole?.textColor || '#0F766E',
              borderColor: (userRole?.color || '#0F766E') + '40',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: userRole?.color || '#0F766E' }}
            />
            <span>Função Ativa: {currentUser?.roleName}</span>
          </div>

          <Button
            onClick={() => setTaskModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
          </Button>
        </div>
      </div>

      {/* Top KPI Statistics Cards (Restaurado KPI Follow-ups de hoje com dados reais de agenda_items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tarefas de hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-teal-300 transition">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: userRole?.bgLight || '#CCFBF1',
              color: userRole?.color || '#0F766E',
            }}
          >
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {todayTaskItems.length}
            </div>
            <p className="text-xs font-medium text-slate-500 truncate" title="Tarefas de hoje">
              Tarefas de hoje
            </p>
          </div>
        </div>

        {/* Card 2: Concluídas hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {completedTodayTasks.length}
            </div>
            <p className="text-xs font-medium text-slate-500">Concluídas hoje</p>
          </div>
        </div>

        {/* Card 3: Atrasadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-red-300 transition">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overdueTasks.length}
            </div>
            <p className="text-xs font-medium text-slate-500">Atrasadas</p>
          </div>
        </div>

        {/* Card 4: Follow-ups de hoje (Regra Stage 2C: honestidade de dados, contagem real) */}
        <div
          onClick={() => navigate('/agenda')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {todayFollowUps.length > 0 ? todayFollowUps.length : '0'}
            </div>
            <p className="text-xs font-medium text-slate-500 truncate" title="Follow-ups de hoje">
              Follow-ups de hoje
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Minhas Tarefas) + Right (Tarefas por Função) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel: Minhas tarefas de hoje (Col 5) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Minhas tarefas de hoje</h2>
              <p className="text-xs text-slate-500">
                Rotinas da função{' '}
                <span className="font-semibold text-slate-700">{currentUser?.roleName}</span>
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {myTasks.filter((i) => i.status === 'aberto').length} pendentes
            </span>
          </div>

          <div className="mt-4 space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma tarefa pendente hoje. 🎉
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tudo em dia para a função {currentUser?.roleName}!
                </p>
              </div>
            ) : (
              myTasks.map((item) => {
                const isCompleted = item.status === 'concluido'
                const isOverdue = item.dueDate < todayStr && item.status === 'aberto'
                const assignedName = getCollaboratorName(item.personId || undefined)

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-50/60 border-slate-200 opacity-75'
                        : isOverdue
                          ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                          : 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={() => toggleTaskCompletion(item.id)}
                        className="mt-0.5 shrink-0 text-slate-400 hover:text-teal-700 transition"
                        aria-label={isCompleted ? 'Desmarcar tarefa' : 'Concluir tarefa'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-teal-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {item.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                          {item.type !== 'tarefa' && (
                            <span className="px-2 py-0.5 rounded-md border font-medium bg-slate-50 text-slate-600 border-slate-200 uppercase text-[10px]">
                              {item.type}
                            </span>
                          )}

                          {/* Overdue alert */}
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold border border-red-200">
                              Atrasada
                            </span>
                          )}

                          {/* Assigned Collaborator */}
                          {assignedName && (
                            <span className="text-slate-500 flex items-center gap-1">
                              • 👤 {assignedName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-4 mt-auto border-t border-slate-100 flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/agenda')}
              className="flex-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
            >
              Abrir Agenda Completa
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tarefas?funcao=${userRoleId}`)}
              className="text-xs font-semibold text-slate-700 hover:text-teal-800"
            >
              Modelos
            </Button>
          </div>
        </div>

        {/* Painel: Tarefas por Função (Col 7) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tarefas por função</h2>
              <p className="text-xs text-slate-500">
                Visão panorâmica de todas as funções ativas na clínica
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tarefas')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver tarefas completas
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {roles.map((role) => {
              // Regra 3: Cards de função de hoje por função
              // total_today = COUNT agenda_items WHERE type='tarefa' AND due_date=CURRENT_DATE AND function_id=<função> AND status <> 'cancelado'
              // completed_today = mesma query AND status='concluido'
              const roleTodayTasks = agendaItems.filter(
                (i) =>
                  i.type === 'tarefa' &&
                  i.dueDate === todayStr &&
                  i.functionId === role.id &&
                  i.status !== 'cancelado',
              )
              const totalToday = roleTodayTasks.length
              const completedToday = roleTodayTasks.filter((i) => i.status === 'concluido').length

              // Regra 3: Se total_today = 0 -> "Sem tarefas cadastradas para hoje" e percentual "—". NUNCA "100% concluído" para 0/0.
              const progressPct =
                totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : null

              const top4Tasks = roleTodayTasks.slice(0, 4)

              return (
                <div
                  key={role.id}
                  onClick={() => navigate(`/tarefas?funcao=${role.id}`)}
                  className="rounded-xl border border-slate-200/90 hover:border-slate-300 p-3.5 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group bg-slate-50/40 hover:bg-white"
                >
                  <div>
                    {/* Role Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-xs font-bold text-slate-800 group-hover:text-teal-800 transition">
                          {role.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {totalToday > 0 ? `${completedToday}/${totalToday}` : '0/0'}
                      </span>
                    </div>

                    {/* Progress bar (se total=0, 0%) */}
                    <div className="mt-2.5">
                      <Progress value={progressPct ?? 0} className="h-1.5 bg-slate-100" />
                    </div>

                    {/* Top 4 tasks list */}
                    <div className="mt-3 space-y-1.5">
                      {top4Tasks.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2">
                          Sem tarefas cadastradas para hoje.
                        </p>
                      ) : (
                        top4Tasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-2 text-xs text-slate-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTaskCompletion(t.id)
                            }}
                          >
                            {t.status === 'concluido' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-teal-600 shrink-0" />
                            )}
                            <span
                              className={`truncate text-[11px] ${
                                t.status === 'concluido'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-700'
                              }`}
                              title={t.title}
                            >
                              {t.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 group-hover:text-teal-700 flex items-center justify-between">
                    <span>{progressPct !== null ? `${progressPct}% concluído` : '—'}</span>
                    <span className="flex items-center gap-0.5">
                      Abrir <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Painel: Métricas Comerciais Básicas Reais (Stage 2C: leads reais, sem mocks) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Métricas Comerciais do CRM</h2>
              <p className="text-xs text-slate-500">
                Funil e conversão calculados diretamente dos leads cadastrados no Supabase
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/crm')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Ver funil completo
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500">Total de Leads</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{leads.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Na base ativa</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800">Em Atendimento</p>
            <p className="text-2xl font-bold text-amber-950 mt-1">
              {leads.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido').length}
            </p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">Estágios ativos</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-800">Leads Fechados</p>
            <p className="text-2xl font-bold text-emerald-950 mt-1">
              {leads.filter((l) => l.stage === 'fechado').length}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">
              {leads.length > 0
                ? `${Math.round((leads.filter((l) => l.stage === 'fechado').length / leads.length) * 100)}% conversão`
                : '— conversão'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100">
            <p className="text-xs font-semibold text-teal-800">Valor em Vendas</p>
            <p className="text-2xl font-bold text-teal-950 mt-1">
              {leads.filter((l) => l.stage === 'fechado' && l.saleValue).length > 0
                ? `R$ ${leads
                    .filter((l) => l.stage === 'fechado' && l.saleValue)
                    .reduce((acc, curr) => acc + (curr.saleValue || 0), 0)
                    .toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`
                : 'R$ 0'}
            </p>
            <p className="text-[11px] text-teal-700/80 mt-0.5">Total contratado</p>
          </div>
        </div>
      </div>

      {/* Painel: Desempenho da semana por função */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Desempenho da semana por função
              </h2>
              <p className="text-xs text-slate-500">
                Percentual de tarefas concluídas nos últimos 7 dias por cada função
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Últimos 7 dias
          </span>
        </div>

        <TooltipProvider>
          <div className="mt-6 space-y-4">
            {roles.map((role) => {
              // Regra 2: Desempenho semanal por função
              // expected = COUNT agenda_items WHERE type='tarefa' AND function_id=<função> AND due_date dentro do período de 7 dias selecionado AND status <> 'cancelado'
              // completed = mesmo conjunto AND status='concluido'
              // expected > 0 -> performance = completed/expected*100; expected = 0 -> NULL -> UI exibe "—". NUNCA 0/0 = 100%.
              const roleWeekItems = weeklyItems.filter(
                (i) =>
                  i.type === 'tarefa' &&
                  i.functionId === role.id &&
                  i.status !== 'cancelado' &&
                  i.dueDate >= weekStartStr &&
                  i.dueDate <= todayStr,
              )
              const expected = roleWeekItems.length
              const completed = roleWeekItems.filter((i) => i.status === 'concluido').length
              const performance = expected > 0 ? Math.round((completed / expected) * 100) : null

              return (
                <div key={role.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-semibold text-slate-800">{role.name}</span>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-bold text-slate-700 cursor-help">
                          {performance !== null ? `${performance}%` : '—'}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {expected > 0
                            ? `${completed} de ${expected} tarefas concluídas`
                            : 'Sem tarefas cadastradas no período'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Horizontal Bar with Animation */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${performance ?? 0}%`,
                        backgroundColor: role.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setTaskModalOpen(true)}
        className="md:hidden fixed right-5 bottom-6 z-40 w-14 h-14 rounded-full bg-teal-700 text-white shadow-xl flex items-center justify-center hover:bg-teal-800 active:scale-95 transition"
        aria-label="Nova tarefa"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Task Creation Modal */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultRoleId={currentUser?.roleId}
      />
    </div>
  )
}
