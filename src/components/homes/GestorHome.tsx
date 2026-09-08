import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Plus,
  Circle,
  Clock,
  Layers,
  Activity,
  ShieldCheck,
  Building2,
  Users2,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  AgendaItem,
  Role,
  Collaborator,
  Lead,
  AuthUser,
  FunctionCadenceSummary,
} from '@/types'

interface GestorHomeProps {
  currentUser: AuthUser
  userRole?: Role
  roles: Role[]
  collaborators: Collaborator[]
  leads: Lead[]
  todayTaskItems: AgendaItem[]
  completedTodayTasks: AgendaItem[]
  overdueTasks: AgendaItem[]
  todayFollowUps: AgendaItem[]
  myTasks: AgendaItem[]
  weeklyItems: AgendaItem[]
  weekStartStr: string
  todayStr: string
  cadenceSummaries: FunctionCadenceSummary[]
  cadenceLoading: boolean
  onToggleTask: (id: string) => Promise<void>
  onOpenNewTask: () => void
  capitalizedDate: string
  greeting: string
}

export const GestorHome: React.FC<GestorHomeProps> = ({
  currentUser,
  userRole,
  roles,
  collaborators,
  leads,
  todayTaskItems,
  completedTodayTasks,
  overdueTasks,
  todayFollowUps,
  myTasks,
  weeklyItems,
  weekStartStr,
  todayStr,
  cadenceSummaries,
  cadenceLoading,
  onToggleTask,
  onOpenNewTask,
  capitalizedDate,
  greeting,
}) => {
  const navigate = useNavigate()

  const getCollaboratorName = (id?: string) => {
    if (!id) return null
    return collaborators.find((c) => c.id === id)?.name
  }

  // Desvios de cadência detectados hoje
  const deviationsCount = cadenceSummaries.filter((s) => s.hasDeviation).length

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Gestor — Visão Estratégica & Transversal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {currentUser.name}!
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
              {currentUser.isOwner ? 'OWNER' : 'GESTOR'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {capitalizedDate} • Painel Institucional de Coordenação & Cadência
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/gestao')}
            className="text-xs font-semibold text-teal-800 border-teal-200 hover:bg-teal-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-700" />
            Central de Exceções
          </Button>

          <Button
            onClick={onOpenNewTask}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      {/* 2. Top KPIs de Gestão da Clínica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarefas Totais de Hoje */}
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
              Total de tarefas hoje
            </p>
          </div>
        </div>

        {/* Concluídas Hoje */}
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

        {/* Atrasadas Gerais */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-red-300 transition">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overdueTasks.length}
            </div>
            <p className="text-xs font-medium text-slate-500">Atrasadas no sistema</p>
          </div>
        </div>

        {/* Desvios de Cadência Hoje */}
        <div
          onClick={() => navigate('/gestao')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {deviationsCount}
            </div>
            <p className="text-xs font-medium text-slate-500 truncate" title="Funções com desvio">
              Funções com desvio de cadência
            </p>
          </div>
        </div>
      </div>

      {/* 3. STAGE 4E: Painel de Cadência & Rotinas Recorrentes por Função */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cadência de Rotinas por Função (Esperado vs Realizado)
              </h2>
              <p className="text-xs text-slate-500">
                Aderência das rotinas operacionais diárias de cada função na clínica
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/gestao')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Ver central de exceções
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {cadenceLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Calculando cadência operacional por função...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cadenceSummaries.map((summary) => {
              const hasItems = summary.expectedRoutinesCount > 0
              return (
                <div
                  key={summary.functionId}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                    summary.hasDeviation
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-white border-slate-200/90 hover:border-teal-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: summary.functionColor }}
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {summary.functionName}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {summary.completedRoutinesCount}/{summary.expectedRoutinesCount}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <Progress value={summary.adherencePct ?? 0} className="h-1.5 bg-slate-100" />
                    </div>

                    <div className="mt-3 text-xs space-y-1">
                      <p className="text-[11px] text-slate-500">
                        Ocupante atual:{' '}
                        <strong className="text-slate-700">
                          {summary.currentOccupantName || 'Não atribuído'}
                        </strong>
                      </p>
                      {summary.hasDeviation && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Desvio de cadência
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>
                      {summary.adherencePct !== null ? `${summary.adherencePct}% aderência` : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/tarefas?funcao=${summary.functionId}`)}
                      className="text-teal-700 hover:underline flex items-center gap-0.5"
                    >
                      Rotinas <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Grid Principal: Minhas Tarefas de Gestão + Tarefas por Função */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel: Minhas Tarefas da Gerência */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Minhas tarefas do dia</h2>
              <p className="text-xs text-slate-500">
                Rotinas e despachos da função{' '}
                <span className="font-semibold text-slate-700">{currentUser.roleName}</span>
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
                  Nenhuma tarefa pendente na gerência hoje.
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tudo em dia para a coordenação geral!
                </p>
              </div>
            ) : (
              myTasks.map((item) => {
                const isCompleted = item.status === 'concluido'
                const isOverdue = item.dueDate < todayStr && item.status === 'aberto'

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
                      <button
                        type="button"
                        onClick={() => onToggleTask(item.id)}
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
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold border border-red-200">
                              Atrasada
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-slate-500 truncate">{item.notes}</span>
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
              Abrir Agenda da Clínica
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tarefas')}
              className="text-xs font-semibold text-slate-700 hover:text-teal-800"
            >
              Modelos
            </Button>
          </div>
        </div>

        {/* Painel: Tarefas por Função (Visão Panorâmica) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Visão Geral de Tarefas por Função
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhamento em tempo real de todas as funções ativas
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tarefas')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Gerenciar modelos
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {roles.map((role) => {
              const roleTodayTasks = todayTaskItems.filter((i) => i.functionId === role.id)
              const totalToday = roleTodayTasks.length
              const completedToday = roleTodayTasks.filter((i) => i.status === 'concluido').length
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

                    <div className="mt-2.5">
                      <Progress value={progressPct ?? 0} className="h-1.5 bg-slate-100" />
                    </div>

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
                              onToggleTask(t.id)
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

      {/* 5. Painel Comercial Integrado */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Métricas Comerciais do CRM</h2>
              <p className="text-xs text-slate-500">
                Funil de vendas calculado diretamente dos leads do Supabase
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
    </div>
  )
}
