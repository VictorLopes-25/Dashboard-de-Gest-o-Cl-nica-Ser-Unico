import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  UserCheck,
  Building2,
  Check,
  Calendar,
  Layers,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { AgendaItem, ManagementItem, Role, AuthUser } from '@/types'

interface ColaboradorHomeProps {
  currentUser: AuthUser
  userRole?: Role
  todayTasks: AgendaItem[]
  overdueTasks: AgendaItem[]
  feedbacks: ManagementItem[]
  feedbacksLoading: boolean
  onToggleTask: (id: string) => Promise<void>
  onAcknowledgeFeedback: (id: string) => Promise<void>
  onOpenNewTask: () => void
  capitalizedDate: string
  greeting: string
}

export const ColaboradorHome: React.FC<ColaboradorHomeProps> = ({
  currentUser,
  userRole,
  todayTasks,
  overdueTasks,
  feedbacks,
  feedbacksLoading,
  onToggleTask,
  onAcknowledgeFeedback,
  onOpenNewTask,
  capitalizedDate,
  greeting,
}) => {
  const navigate = useNavigate()
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [filterWindow, setFilterWindow] = useState<'todas' | 'pendentes' | 'concluidas'>('todas')

  const totalToday = todayTasks.length
  const completedToday = todayTasks.filter((t) => t.status === 'concluido').length
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : null

  const filteredTasks = todayTasks.filter((t) => {
    if (filterWindow === 'pendentes') return t.status === 'aberto'
    if (filterWindow === 'concluidas') return t.status === 'concluido'
    return true
  })

  const unreadFeedbacks = feedbacks.filter((f) => !f.acknowledgedAt)

  const handleAck = async (id: string) => {
    setAcknowledgingId(id)
    try {
      await onAcknowledgeFeedback(id)
    } finally {
      setAcknowledgingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Colaborador — Identidade, Função Ativa e Saudação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {currentUser.name}!
            </span>
            <Sparkles className="w-5 h-5 text-amber-500 hidden sm:inline" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {capitalizedDate} • Meu painel diário de trabalho
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
            <span>Minha Função: {currentUser.roleName}</span>
          </div>

          <Button
            onClick={onOpenNewTask}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 text-xs"
          >
            Nova anotação / tarefa
          </Button>
        </div>
      </div>

      {/* 2. Top KPIs do Colaborador (Meu Dia) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Minhas Tarefas Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: userRole?.bgLight || '#CCFBF1',
              color: userRole?.color || '#0F766E',
            }}
          >
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalToday}</div>
            <p className="text-xs font-medium text-slate-500">Minhas tarefas hoje</p>
          </div>
        </div>

        {/* Minhas Concluídas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{completedToday}</div>
            <p className="text-xs font-medium text-slate-500">Concluídas hoje</p>
          </div>
        </div>

        {/* Atrasadas sob minha responsabilidade */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
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

        {/* Comunicados / Feedbacks Pendentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {unreadFeedbacks.length}
            </div>
            <p className="text-xs font-medium text-slate-500">Comunicados não lidos</p>
          </div>
        </div>
      </div>

      {/* 3. Barra de Progresso da Minha Função */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <span className="font-bold text-slate-800">
              Minha Cadência Diária ({currentUser.roleName})
            </span>
          </div>
          <span className="font-bold text-teal-800">
            {progressPct !== null ? `${progressPct}% concluído` : 'Sem tarefas hoje'}
          </span>
        </div>
        <Progress value={progressPct ?? 0} className="h-2 bg-slate-100" />
      </div>

      {/* 4. Lista Principal de Tarefas do Dia do Colaborador */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Minhas Rotinas & Tarefas de Hoje</h2>
            <p className="text-xs text-slate-500">
              Cadência operacional esperada para a função {currentUser.roleName}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilterWindow('todas')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterWindow === 'todas'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({todayTasks.length})
            </button>
            <button
              onClick={() => setFilterWindow('pendentes')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterWindow === 'pendentes'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendentes ({todayTasks.filter((t) => t.status === 'aberto').length})
            </button>
            <button
              onClick={() => setFilterWindow('concluidas')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterWindow === 'concluidas'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Concluídas ({completedToday})
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma tarefa para este filtro.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Você completou todas as tarefas ou não há agendamentos.
              </p>
            </div>
          ) : (
            filteredTasks.map((item) => {
              const isCompleted = item.status === 'concluido'
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isCompleted
                      ? 'bg-slate-50/60 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(item.id)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-teal-700 transition"
                    aria-label={isCompleted ? 'Desmarcar rotina' : 'Concluir rotina'}
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

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                      {item.notes && (
                        <span className="text-slate-500 italic max-w-md truncate">
                          {item.notes}
                        </span>
                      )}
                      {item.dueTime && (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.dueTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Concluída
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleTask(item.id)}
                        className="h-7 text-xs text-teal-800 border-teal-200 hover:bg-teal-50"
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/agenda')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Abrir Minha Agenda Operacional Completa
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* 5. Comunicados & Feedbacks Direcionados (com Reconhecimento de Leitura) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Comunicados e Feedbacks da Gestão
              </h2>
              <p className="text-xs text-slate-500">
                Instruções operacionais e feedbacks direcionados a você ou à função{' '}
                {currentUser.roleName}
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {unreadFeedbacks.length} não lidos
          </span>
        </div>

        <div className="mt-4">
          {feedbacksLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Carregando comunicados e feedbacks...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Nenhum comunicado ou feedback pendente.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Você está em dia com todas as orientações da gestão.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks.map((item) => {
                const isAcknowledged = !!item.acknowledgedAt
                const isShared = item.visibilityLevel === 'SHARED_WITH_EMPLOYEE'

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      isAcknowledged
                        ? 'bg-slate-50/60 border-slate-200'
                        : 'bg-white border-teal-200 shadow-2xs hover:border-teal-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isShared
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isShared ? (
                            <>
                              <UserCheck className="w-3 h-3" /> Feedback Individual
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3" /> Instrução da Função
                            </>
                          )}
                        </span>

                        <span className="text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-800 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Por:{' '}
                        <strong className="text-slate-600">{item.createdByName || 'Gestão'}</strong>
                      </span>

                      {isAcknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Confirmado em {new Date(item.acknowledgedAt!).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAck(item.id)}
                          disabled={acknowledgingId === item.id}
                          className="h-7 text-xs bg-teal-700 hover:bg-teal-800 text-white font-medium"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {acknowledgingId === item.id ? 'Confirmando...' : 'Confirmar leitura'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
