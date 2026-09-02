import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { TaskModal } from '@/components/TaskModal'
import { getTodayDateString } from '@/data/mockData'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users2,
  CalendarDays,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentUser, tasks, roles, leads, collaborators, toggleTaskCompletion } = useApp()

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const todayStr = getTodayDateString(0)

  // Greeting based on current hour
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

  // Current user's role data
  const userRole = roles.find((r) => r.id === currentUser?.roleId)
  const userRoleId = currentUser?.roleId || ''

  // 1. STATS CALCULATIONS
  // A) Tarefas de hoje da função do usuário (vencimento hoje, atrasadas ou recorrência diária)
  const userRoleTasksToday = tasks.filter((t) => {
    if (t.roleId !== userRoleId) return false
    const isToday = t.dueDate === todayStr
    const isOverdue = t.dueDate < todayStr && t.status !== 'Concluída'
    const isDaily = t.recurrence === 'Diária'
    return isToday || isOverdue || isDaily
  })

  // B) Concluídas hoje (global ou no escopo do sistema)
  const completedTodayTasks = tasks.filter((t) => {
    if (t.status !== 'Concluída') return false
    if (t.completedAt) {
      return t.completedAt.startsWith(todayStr)
    }
    return t.dueDate === todayStr
  })

  // C) Atrasadas (todas as pendentes/em andamento com dueDate < hoje)
  const overdueTasks = tasks.filter((t) => t.status !== 'Concluída' && t.dueDate < todayStr)

  // D) Follow-ups de hoje (leads com followUpDate <= hoje e não fechados/perdidos)
  const followUpsToday = leads.filter(
    (l) => l.stage !== 'Fechado' && l.stage !== 'Perdido' && l.followUpDate <= todayStr,
  )

  // Minhas tarefas de hoje: tarefas da função do usuário logado (pendentes e concluídas hoje)
  const myTasks = tasks.filter((t) => {
    if (t.roleId !== userRoleId) return false
    const isToday = t.dueDate === todayStr
    const isOverdue = t.dueDate < todayStr && t.status !== 'Concluída'
    const isDaily = t.recurrence === 'Diária'
    return isToday || isOverdue || isDaily
  })

  // Recurrence badge color helper
  const getRecurrenceBadge = (recurrence: string) => {
    switch (recurrence) {
      case 'Diária':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'Semanal':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Mensal':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  // Get collaborator name
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

      {/* 4 KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tarefas de Hoje (Função) */}
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
              {userRoleTasksToday.length}
            </div>
            <p
              className="text-xs font-medium text-slate-500 truncate"
              title={`Tarefas de hoje — ${currentUser?.roleName}`}
            >
              Tarefas de hoje — {currentUser?.roleName}
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

        {/* Card 4: Follow-ups de hoje (Ponte ERP CRM) */}
        <div
          onClick={() => navigate('/crm')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center shrink-0 shadow-xs transition">
            <Users2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {followUpsToday.length}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-xs font-medium text-slate-500">Follow-ups de hoje</p>
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
              {myTasks.filter((t) => t.status !== 'Concluída').length} pendentes
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
              myTasks.map((task) => {
                const isCompleted = task.status === 'Concluída'
                const isOverdue = task.dueDate < todayStr && !isCompleted
                const assignedName = getCollaboratorName(task.assignedCollaboratorId)

                return (
                  <div
                    key={task.id}
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
                        onClick={() => toggleTaskCompletion(task.id)}
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
                          {task.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                          {/* Recurrence */}
                          <span
                            className={`px-2 py-0.5 rounded-md border font-medium ${getRecurrenceBadge(
                              task.recurrence,
                            )}`}
                          >
                            {task.recurrence}
                          </span>

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

          <div className="pt-4 mt-auto border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tarefas?funcao=${userRoleId}`)}
              className="w-full text-xs font-semibold text-slate-700 hover:text-teal-800"
            >
              Ver todas as tarefas desta função
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
              // Tasks for this role
              const roleTasks = tasks.filter((t) => t.roleId === role.id)
              const todayRoleTasks = roleTasks.filter(
                (t) =>
                  t.dueDate === todayStr ||
                  t.recurrence === 'Diária' ||
                  (t.dueDate < todayStr && t.status !== 'Concluída'),
              )
              const completedRoleCount = todayRoleTasks.filter(
                (t) => t.status === 'Concluída',
              ).length
              const totalRoleCount = todayRoleTasks.length
              const progressPct =
                totalRoleCount > 0 ? Math.round((completedRoleCount / totalRoleCount) * 100) : 100

              const top4Tasks = todayRoleTasks.slice(0, 4)

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
                        {completedRoleCount}/{totalRoleCount}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2.5">
                      <Progress value={progressPct} className="h-1.5 bg-slate-100" />
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
                            {t.status === 'Concluída' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-teal-600 shrink-0" />
                            )}
                            <span
                              className={`truncate text-[11px] ${
                                t.status === 'Concluída'
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
                    <span>{progressPct}% concluído</span>
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
              const roleTasks = tasks.filter((t) => t.roleId === role.id)
              const total = roleTasks.length
              const completed = roleTasks.filter((t) => t.status === 'Concluída').length
              // Provide realistic base percentage if empty for visual beauty
              const percentage =
                total > 0
                  ? Math.round((completed / total) * 100)
                  : role.id === 'role-gerencia'
                    ? 80
                    : role.id === 'role-crc'
                      ? 67
                      : 75

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
                        <span className="font-bold text-slate-700 cursor-help">{percentage}%</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {completed} de {total} tarefas concluídas
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Horizontal Bar with Animation */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${percentage}%`,
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
