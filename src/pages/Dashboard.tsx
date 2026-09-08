import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { TaskModal } from '@/components/TaskModal'
import {
  fetchManagementItems,
  acknowledgeManagementItem,
  mapDbManagementItemToUi,
} from '@/services/managementService'
import { computeCadenceSummary } from '@/services/cadenceService'
import { useToast } from '@/hooks/use-toast'
import type { AgendaItem, ManagementItem, FunctionCadenceSummary } from '@/types'
import { ColaboradorHome } from '@/components/homes/ColaboradorHome'
import { GestorHome } from '@/components/homes/GestorHome'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    currentUser,
    isOwner,
    roles,
    collaborators,
    agendaItems,
    overdueAgendaItems,
    leads,
    loadAgendaWindow,
    toggleTaskCompletion,
  } = useApp()

  const { toast } = useToast()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [weeklyItems, setWeeklyItems] = useState<AgendaItem[]>([])
  const [feedbacks, setFeedbacks] = useState<ManagementItem[]>([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(true)
  const [cadenceSummaries, setCadenceSummaries] = useState<FunctionCadenceSummary[]>([])
  const [cadenceLoading, setCadenceLoading] = useState(true)

  // Modo de visualização: gestor pode alternar entre Visão Gestor e Minha Home de Colaborador
  const isManagerOrOwner = Boolean(
    isOwner ||
    currentUser?.roleName?.toLowerCase().includes('gerência') ||
    currentUser?.roleName?.toLowerCase().includes('gerencia') ||
    currentUser?.roleName?.toLowerCase().includes('administrativo'),
  )

  const [viewMode, setViewMode] = useState<'gestor' | 'colaborador'>(
    isManagerOrOwner ? 'gestor' : 'colaborador',
  )

  // Atualizar viewMode se o usuário alternar contexto de função
  useEffect(() => {
    if (isManagerOrOwner) {
      setViewMode('gestor')
    } else {
      setViewMode('colaborador')
    }
  }, [isManagerOrOwner, currentUser?.roleId])

  // Data atual no formato ISO YYYY-MM-DD local
  const todayStr = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Período de 7 dias para Desempenho da Semana
  const weekStartStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Carregar itens reais da janela de 7 dias via loadAgendaWindow
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

  // Carregar Comunicados e Feedbacks direcionados ao colaborador / função
  const loadFeedbacks = useCallback(async () => {
    if (!currentUser) return
    setFeedbacksLoading(true)
    try {
      const dbItems = await fetchManagementItems()
      const peopleMap = new Map(collaborators.map((c) => [c.id, c.name]))
      const functionsMap = new Map(roles.map((r) => [r.id, r.name]))
      const mapped = dbItems.map((i) => mapDbManagementItemToUi(i, peopleMap, functionsMap))

      const relevant = mapped.filter((item) => {
        if (item.visibilityLevel === 'SHARED_WITH_EMPLOYEE') {
          return item.targetPersonId === currentUser.id
        }
        if (item.visibilityLevel === 'FUNCTION_VISIBLE') {
          return (
            item.targetFunctionId === currentUser.roleId ||
            (currentUser.allowedRoleIds &&
              item.targetFunctionId &&
              currentUser.allowedRoleIds.includes(item.targetFunctionId))
          )
        }
        return false
      })

      setFeedbacks(relevant)
    } catch (err) {
      console.error('Falha ao carregar comunicados/feedbacks:', err)
    } finally {
      setFeedbacksLoading(false)
    }
  }, [currentUser, collaborators, roles])

  // Carregar Resumo de Cadência por Função
  const loadCadence = useCallback(async () => {
    setCadenceLoading(true)
    try {
      const summaries = await computeCadenceSummary(todayStr)
      setCadenceSummaries(summaries)
    } catch (err) {
      console.warn('Falha ao calcular cadência:', err)
    } finally {
      setCadenceLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    loadFeedbacks()
    loadCadence()
  }, [loadFeedbacks, loadCadence])

  // Ação de confirmar leitura / reconhecimento de feedback pelo colaborador
  const handleAcknowledge = async (itemId: string) => {
    try {
      await acknowledgeManagementItem(itemId)
      toast({
        title: 'Leitura confirmada',
        description: 'Você confirmou a leitura e reconhecimento deste comunicado/feedback.',
      })
      await loadFeedbacks()
    } catch (err: any) {
      toast({
        title: 'Falha ao confirmar leitura',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
      throw err
    }
  }

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

  const userRole = roles.find((r) => r.id === currentUser?.roleId)
  const userRoleId = currentUser?.roleId || ''

  // 1. "Tarefas de hoje"
  const todayTaskItems = useMemo(() => {
    return agendaItems.filter(
      (i) => i.type === 'tarefa' && i.dueDate === todayStr && i.status !== 'cancelado',
    )
  }, [agendaItems, todayStr])

  // 2. "Concluídas hoje"
  const completedTodayTasks = useMemo(() => {
    return todayTaskItems.filter((i) => i.status === 'concluido')
  }, [todayTaskItems])

  // 3. "Atrasadas gerais"
  const overdueTasks = useMemo(() => {
    return overdueAgendaItems.filter((i) => i.status === 'aberto' && i.dueDate < todayStr)
  }, [overdueAgendaItems, todayStr])

  // 4. "Follow-ups de hoje"
  const todayFollowUps = useMemo(() => {
    return agendaItems.filter(
      (i) => i.type === 'follow_up' && i.dueDate === todayStr && i.status === 'aberto',
    )
  }, [agendaItems, todayStr])

  // Minhas tarefas de hoje (escopo estrito da função ativa atual)
  const myTasks = useMemo(() => {
    return agendaItems.filter((i) => {
      if (i.type !== 'tarefa') return false
      if (i.status === 'cancelado') return false
      if (userRoleId && i.functionId && i.functionId !== userRoleId) return false
      return i.dueDate === todayStr
    })
  }, [agendaItems, userRoleId, todayStr])

  // Minhas tarefas atrasadas da função ativa
  const myOverdueTasks = useMemo(() => {
    return overdueAgendaItems.filter((i) => {
      if (i.status !== 'aberto') return false
      if (userRoleId && i.functionId && i.functionId !== userRoleId) return false
      return i.dueDate < todayStr
    })
  }, [overdueAgendaItems, userRoleId, todayStr])

  if (!currentUser) return null

  return (
    <div>
      {/* Alternador de Visão de Home (apenas para Gestores/OWNER para auditar como colaborador) */}
      {isManagerOrOwner && (
        <div className="flex items-center justify-end mb-4">
          <div className="inline-flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
              Alternar Tela Inicial:
            </span>
            <Button
              size="sm"
              variant={viewMode === 'gestor' ? 'default' : 'ghost'}
              onClick={() => setViewMode('gestor')}
              className={`h-7 text-xs font-semibold ${
                viewMode === 'gestor'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Gestor
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'colaborador' ? 'default' : 'ghost'}
              onClick={() => setViewMode('colaborador')}
              className={`h-7 text-xs font-semibold ${
                viewMode === 'colaborador'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Minha Home de Colaborador
            </Button>
          </div>
        </div>
      )}

      {/* Renderização Condicional da Home Específica (Stage 4D) */}
      {viewMode === 'gestor' ? (
        <GestorHome
          currentUser={currentUser}
          userRole={userRole}
          roles={roles}
          collaborators={collaborators}
          leads={leads}
          todayTaskItems={todayTaskItems}
          completedTodayTasks={completedTodayTasks}
          overdueTasks={overdueTasks}
          todayFollowUps={todayFollowUps}
          myTasks={myTasks}
          weeklyItems={weeklyItems}
          weekStartStr={weekStartStr}
          todayStr={todayStr}
          cadenceSummaries={cadenceSummaries}
          cadenceLoading={cadenceLoading}
          onToggleTask={toggleTaskCompletion}
          onOpenNewTask={() => setTaskModalOpen(true)}
          capitalizedDate={capitalizedDate}
          greeting={greeting}
        />
      ) : (
        <ColaboradorHome
          currentUser={currentUser}
          userRole={userRole}
          todayTasks={myTasks}
          overdueTasks={myOverdueTasks}
          feedbacks={feedbacks}
          feedbacksLoading={feedbacksLoading}
          onToggleTask={toggleTaskCompletion}
          onAcknowledgeFeedback={handleAcknowledge}
          onOpenNewTask={() => setTaskModalOpen(true)}
          capitalizedDate={capitalizedDate}
          greeting={greeting}
        />
      )}

      {/* Modal de Criação de Tarefas */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultRoleId={currentUser?.roleId}
      />
    </div>
  )
}
