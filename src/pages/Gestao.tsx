import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import {
  fetchManagementItems,
  fetchManagementActions,
  createManagementItem,
  updateManagementItem,
  deleteManagementItem,
  createManagementAction,
  updateManagementAction,
  deleteManagementAction,
  mapDbManagementItemToUi,
  mapDbManagementActionToUi,
} from '@/services/managementService'
import {
  fetchThresholdConfigs,
  updateThresholdConfig,
  fetchManagedExceptions,
  acknowledgeException,
  recordExceptionDecision,
  resolveException,
  derivePendingItems,
  syncDerivedExceptionsToDatabase,
} from '@/services/exceptionsService'
import type {
  ManagementItem,
  ManagementAction,
  ManagementItemType,
  ManagementVisibilityLevel,
  ManagementActionStatus,
  ManagedException,
  OrgThresholdConfig,
  ExceptionSeverity,
  ExceptionStatus,
} from '@/types'
import { getHumanThresholdInfo } from '@/config/thresholdLabels'
import { GestaoPostSaleView } from '@/components/GestaoPostSaleView'
import {
  ShieldAlert,
  Lock,
  Eye,
  Building2,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  UserCheck,
  TrendingUp,
  Sparkles,
  Trash2,
  Edit3,
  Search,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Check,
  ListTodo,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Info,
  Target,
  Pause,
  Play,
} from 'lucide-react'
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  setGoalStatus,
  calculateGoalsRpc,
  enrichGoalForUi,
  SUPPORTED_METRICS,
  PERIOD_TYPE_LABELS,
  type DbGoal,
} from '@/services/goalsService'
import type { Goal, GoalMetricKey, GoalPeriodType, GoalStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

// Labels e cores de visibilidade
const VISIBILITY_CONFIG: Record<
  ManagementVisibilityLevel,
  { label: string; description: string; badgeClass: string; icon: any }
> = {
  OWNER_ONLY: {
    label: 'Diretoria (OWNER)',
    description: 'Decisões de posse e diretrizes restritas ao proprietário da clínica',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    icon: Lock,
  },
  PRIVATE_MANAGEMENT: {
    label: 'Anotação Gerencial Privada',
    description: 'Notas privadas da gerência sobre o acompanhamento da operação',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-medium',
    icon: Eye,
  },
  SHARED_WITH_EMPLOYEE: {
    label: 'Compartilhado com Colaborador',
    description: 'Orientação visível ao colaborador avaliado e à gerência',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 font-medium',
    icon: UserCheck,
  },
  FUNCTION_VISIBLE: {
    label: 'Visível para a Função',
    description: 'Diretrizes e protocolos operacionais visíveis para toda a função',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-medium',
    icon: Building2,
  },
}

// Labels humanizados de tipos de orientações
const TYPE_CONFIG: Record<ManagementItemType, { label: string; icon: any }> = {
  feedback: { label: 'Feedback e Alinhamento', icon: UserCheck },
  nota_privada_gestao: { label: 'Anotação Interna', icon: Eye },
  decisao_posse: { label: 'Decisão Organizacional', icon: Lock },
  conteudo_estrategico: { label: 'Planejamento Estratégico', icon: Sparkles },
  instrucao_funcao: { label: 'Instrução para a Função', icon: Building2 },
  reconhecimento: { label: 'Reconhecimento', icon: CheckCircle2 },
  plano_desenvolvimento: { label: 'Plano de Desenvolvimento', icon: TrendingUp },
}

// Labels de status de ação
const ACTION_STATUS_CONFIG: Record<ManagementActionStatus, { label: string; badgeClass: string }> =
  {
    pendente: { label: 'Pendente', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
    em_andamento: {
      label: 'Em Andamento',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-medium',
    },
    concluida: {
      label: 'Concluída',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
    },
    cancelada: { label: 'Cancelada', badgeClass: 'bg-red-100 text-red-700 border-red-300' },
  }

// Labels de severidade humanizados
const SEVERITY_CONFIG: Record<ExceptionSeverity, { label: string; badgeClass: string; icon: any }> =
  {
    baixa: {
      label: 'Atenção Leve',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Clock,
    },
    media: {
      label: 'Atenção Média',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
      icon: AlertTriangle,
    },
    alta: {
      label: 'Prioridade Alta',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
      icon: AlertCircle,
    },
    critica: {
      label: 'Urgente / Crítico',
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-extrabold',
      icon: ShieldAlert,
    },
  }

// Labels de status de situação humanizados
const EXCEPTION_STATUS_CONFIG: Record<ExceptionStatus, { label: string; badgeClass: string }> = {
  aberta: {
    label: 'Aguardando Decisão',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  },
  reconhecida: {
    label: 'Ciente pela Gerência',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
  },
  decidida: {
    label: 'Decisão Registrada',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
  },
  resolvida: {
    label: 'Resolvida',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
  },
}

export default function Gestao() {
  const {
    isOwner,
    roles,
    collaborators,
    agendaItems,
    leads,
    tasks,
    postSales,
    referrals,
    referralCampaigns,
    refreshPostSales,
  } = useApp()
  const { toast } = useToast()

  // Seções primárias da tela operacional na ordem requerida:
  // 1. PRECISA DA SUA ATENÇÃO ('attention')
  // 2. PENDÊNCIAS DE HOJE ('pending')
  // 3. AÇÕES DE GESTÃO ('actions')
  // 4. FEEDBACKS E ORIENTAÇÕES ('feedback')
  // Secundárias:
  // - Pós-Venda & Campanhas ('post_sale')
  // - Metas e Indicadores ('goals')
  // - Regras de Gestão ('rules')
  const [activeTab, setActiveTab] = useState<
    'attention' | 'pending' | 'actions' | 'feedback' | 'rules' | 'goals' | 'post_sale'
  >('attention')

  const [items, setItems] = useState<ManagementItem[]>([])
  const [actions, setActions] = useState<ManagementAction[]>([])
  const [exceptions, setExceptions] = useState<ManagedException[]>([])
  const [thresholds, setThresholds] = useState<OrgThresholdConfig[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterVisibility, setFilterVisibility] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPerson, setFilterPerson] = useState<string>('all')
  const [filterFunction, setFilterFunction] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  // Modais
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [expandedGoalDetails, setExpandedGoalDetails] = useState<Record<string, boolean>>({})
  const [selectedException, setSelectedException] = useState<ManagedException | null>(null)
  const [decisionText, setDecisionText] = useState('')
  const [resolveImmediately, setResolveImmediately] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Formulário: Meta / Indicador (OWNER)
  const [goalFuncId, setGoalFuncId] = useState('')
  const [goalMetric, setGoalMetric] = useState<GoalMetricKey>('tasks_completed')
  const [goalTarget, setGoalTarget] = useState<number>(10)
  const [goalPeriodType, setGoalPeriodType] = useState<GoalPeriodType>('monthly')
  const [goalPeriodStart, setGoalPeriodStart] = useState('')
  const [goalPeriodEnd, setGoalPeriodEnd] = useState('')
  const [goalStatusVal, setGoalStatusVal] = useState<GoalStatus>('active')

  // Formulário: Item de Gestão
  const [itemTitle, setItemTitle] = useState('')
  const [itemContent, setItemContent] = useState('')
  const [itemType, setItemType] = useState<ManagementItemType>('feedback')
  const [itemVisibility, setItemVisibility] =
    useState<ManagementVisibilityLevel>('SHARED_WITH_EMPLOYEE')
  const [itemTargetPersonId, setItemTargetPersonId] = useState<string>('')
  const [itemTargetFunctionId, setItemTargetFunctionId] = useState<string>('')

  // Formulário: Ação de Gestão
  const [actionTitle, setActionTitle] = useState('')
  const [actionDescription, setActionDescription] = useState('')
  const [actionRespPersonId, setActionRespPersonId] = useState<string>('')
  const [actionRespFunctionId, setActionRespFunctionId] = useState<string>('')
  const [actionDueDate, setActionDueDate] = useState<string>('')
  const [actionOriginItemId, setActionOriginItemId] = useState<string>('')

  // Formulário: Edição de Regras / Limiares
  const [editingThresholdKey, setEditingThresholdKey] = useState('')
  const [editingThresholdVal, setEditingThresholdVal] = useState<number>(1)
  const [editingThresholdUnit, setEditingThresholdUnit] = useState('dias')

  // Mapas rápidos
  const peopleMap = useMemo(
    () => new Map(collaborators.map((c) => [c.id, c.name])),
    [collaborators],
  )
  const functionsMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles])

  // Limiares em formato de dicionário
  const thresholdsObj = useMemo(() => {
    const map: Record<string, number> = {
      task_delay_tolerance_days: 1,
      lead_followup_tolerance_days: 2,
      repeated_failure_count: 3,
      exception_escalation_sla_hours: 24,
      near_expiration_window_days: 1,
      critical_stock_threshold: 5,
    }
    for (const t of thresholds) {
      map[t.key] = t.value
    }
    return map
  }, [thresholds])

  // Pendências do dia computadas em tempo real (incluindo pós-venda)
  const derivedPending = useMemo(() => {
    return derivePendingItems(
      {
        agendaItems,
        leads,
        tasks,
        roles,
        collaborators,
        activeAssignments: [],
        postSales,
      },
      thresholdsObj,
    )
  }, [agendaItems, leads, tasks, roles, collaborators, postSales, thresholdsObj])

  // Sincronização automática e silenciosa de pendências para a base de situações
  const runAutoSync = useCallback(
    async (currentDerived: typeof derivedPending, currentExceptions: ManagedException[]) => {
      try {
        await syncDerivedExceptionsToDatabase(currentDerived, currentExceptions)
      } catch (err) {
        console.warn('Sincronização em segundo plano:', err)
      }
    },
    [],
  )

  // Carregar dados de gestão do Supabase
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dbItems, dbActions, dbExceptions, dbThresholds, dbGoals, rpcCalcs] = await Promise.all(
        [
          fetchManagementItems(),
          fetchManagementActions(),
          fetchManagedExceptions(),
          fetchThresholdConfigs(),
          fetchGoals().catch(() => [] as DbGoal[]),
          calculateGoalsRpc().catch(() => []),
        ],
      )

      const itemTitlesMap = new Map(dbItems.map((i) => [i.id, i.title]))

      const uiItems = dbItems.map((i) => mapDbManagementItemToUi(i, peopleMap, functionsMap))
      const uiActions = dbActions.map((a) =>
        mapDbManagementActionToUi(
          a,
          peopleMap,
          functionsMap,
          a.origin_item_id ? itemTitlesMap.get(a.origin_item_id) : undefined,
        ),
      )

      const uiExceptions = dbExceptions.map((e) => ({
        ...e,
        responsibleFunctionName: functionsMap.get(e.responsibleFunctionId) || 'Função Operacional',
        responsiblePersonName: e.responsiblePersonId ? peopleMap.get(e.responsiblePersonId) : null,
        acknowledgedByName: e.acknowledgedByPersonId
          ? peopleMap.get(e.acknowledgedByPersonId)
          : null,
        decisionByName: e.decisionByPersonId ? peopleMap.get(e.decisionByPersonId) : null,
      }))

      const rpcCalcsMap = new Map((rpcCalcs || []).map((c: any) => [c.goal_id, c]))
      const enrichedGoals = dbGoals.map((g) =>
        enrichGoalForUi(g, rpcCalcsMap.get(g.id), {
          roles,
          collaborators,
          fallbackDatasets: {
            agendaItems,
            leads,
            managedExceptions: dbExceptions,
            managementActions: dbActions,
            postSales,
            referrals,
          },
        }),
      )

      setItems(uiItems)
      setActions(uiActions)
      setExceptions(uiExceptions)
      setThresholds(dbThresholds)
      setGoals(enrichedGoals)
    } catch (err: any) {
      console.error('Falha ao carregar dados de gestão:', err)
      toast({
        title: 'Erro ao carregar dados de gestão',
        description: err?.message || 'Falha na comunicação com o banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [peopleMap, functionsMap, roles, collaborators, agendaItems, leads, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sincronização automática idempotente ao detectar novas pendências
  useEffect(() => {
    if (!loading && derivedPending.length > 0) {
      runAutoSync(derivedPending, exceptions)
    }
  }, [loading, derivedPending, exceptions, runAutoSync])

  // Ações de gerenciamento das situações (exceções)
  const handleAcknowledgeException = async (exc: ManagedException) => {
    try {
      await acknowledgeException(exc.id)
      toast({
        title: 'Situação reconhecida',
        description: `Você registrou ciência sobre "${exc.title}".`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao reconhecer situação',
        description: err?.message || 'Erro ao atualizar no banco.',
        variant: 'destructive',
      })
    }
  }

  const handleOpenDecisionModal = (exc: ManagedException) => {
    setSelectedException(exc)
    setDecisionText(exc.decisionText || '')
    setResolveImmediately(exc.status === 'decidida')
    setDecisionModalOpen(true)
  }

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedException || !decisionText.trim()) {
      toast({
        title: 'Decisão obrigatória',
        description: 'Descreva a decisão tomada ou a orientação dada à equipe.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await recordExceptionDecision(selectedException.id, decisionText, resolveImmediately)
      toast({
        title: resolveImmediately ? 'Situação resolvida' : 'Decisão registrada',
        description: 'Registro de acompanhamento atualizado com sucesso.',
      })
      setDecisionModalOpen(false)
      setSelectedException(null)
      setDecisionText('')
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar decisão',
        description: err?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolveException = async (exc: ManagedException) => {
    try {
      await resolveException(exc.id)
      toast({
        title: 'Situação concluída',
        description: `"${exc.title}" foi marcada como resolvida.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao resolver situação',
        description: err?.message || 'Erro no banco de dados.',
        variant: 'destructive',
      })
    }
  }

  // Ações de Regras de Gestão (Limiares)
  const handleOpenThresholdModal = (cfg: OrgThresholdConfig) => {
    setEditingThresholdKey(cfg.key)
    setEditingThresholdVal(cfg.value)
    setEditingThresholdUnit(cfg.unit)
    setThresholdModalOpen(true)
  }

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas o proprietário (OWNER) pode alterar as regras de gestão.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await updateThresholdConfig(editingThresholdKey, Number(editingThresholdVal))
      const human = getHumanThresholdInfo(editingThresholdKey)
      toast({
        title: 'Regra de gestão atualizada',
        description: `"${human.label}" foi atualizada com sucesso.`,
      })
      setThresholdModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao atualizar regra',
        description: err?.message || 'Erro ao salvar no banco.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Criar item de gestão (feedback / diretriz)
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemTitle.trim() || !itemContent.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título e o conteúdo da orientação.',
        variant: 'destructive',
      })
      return
    }

    if (itemVisibility === 'OWNER_ONLY' && !isOwner) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas o proprietário (OWNER) pode registrar itens de nível Diretoria.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await createManagementItem({
        title: itemTitle,
        content: itemContent,
        type: itemType,
        visibility_level: itemVisibility,
        target_person_id: itemTargetPersonId || null,
        target_function_id: itemTargetFunctionId || null,
      })

      toast({
        title: 'Orientação registrada',
        description: 'Item salvo com sucesso no painel de gestão.',
      })

      setItemTitle('')
      setItemContent('')
      setItemType('feedback')
      setItemVisibility('SHARED_WITH_EMPLOYEE')
      setItemTargetPersonId('')
      setItemTargetFunctionId('')
      setItemModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar orientação',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Criar ação de gestão
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionTitle.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título da ação para a equipe.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await createManagementAction({
        title: actionTitle,
        description: actionDescription,
        responsible_person_id: actionRespPersonId || null,
        responsible_function_id: actionRespFunctionId || null,
        due_date: actionDueDate || null,
        origin_item_id: actionOriginItemId || null,
      })

      toast({
        title: 'Ação criada com sucesso',
        description: 'Ação atribuída aos responsáveis com acompanhamento de prazo.',
      })

      setActionTitle('')
      setActionDescription('')
      setActionRespPersonId('')
      setActionRespFunctionId('')
      setActionDueDate('')
      setActionOriginItemId('')
      setActionModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao criar ação',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateActionStatus = async (actionId: string, newStatus: ManagementActionStatus) => {
    try {
      await updateManagementAction(actionId, { status: newStatus })
      toast({
        title: 'Status atualizado',
        description: `Ação alterada para "${ACTION_STATUS_CONFIG[newStatus].label}".`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao atualizar status',
        description: err?.message || 'Erro de comunicação.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Deseja realmente remover esta anotação?')) return
    try {
      await deleteManagementItem(itemId)
      toast({ title: 'Item removido' })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Exclusão não permitida',
        description:
          err?.message || 'Apenas o proprietário pode excluir anotações permanentemente.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Deseja realmente remover esta ação?')) return
    try {
      await deleteManagementAction(actionId)
      toast({ title: 'Ação removida' })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Exclusão não permitida',
        description: err?.message || 'Apenas o proprietário pode excluir ações.',
        variant: 'destructive',
      })
    }
  }

  // Ações de Metas e Indicadores (OWNER)
  const handleOpenCreateGoal = () => {
    setEditingGoal(null)
    setGoalFuncId(roles[0]?.id || '')
    setGoalMetric('tasks_completed')
    setGoalTarget(10)
    setGoalPeriodType('monthly')
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10)
    setGoalPeriodStart(firstDay)
    setGoalPeriodEnd(lastDay)
    setGoalStatusVal('active')
    setGoalModalOpen(true)
  }

  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalFuncId(goal.responsibleFunctionId)
    setGoalMetric(goal.metric)
    setGoalTarget(goal.target)
    setGoalPeriodType(goal.periodType)
    setGoalPeriodStart(goal.periodStart)
    setGoalPeriodEnd(goal.periodEnd)
    setGoalStatusVal(goal.status)
    setGoalModalOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas o proprietário (OWNER) pode configurar metas na clínica.',
        variant: 'destructive',
      })
      return
    }

    if (!goalFuncId) {
      toast({
        title: 'Função obrigatória',
        description: 'Selecione a função responsável pela meta.',
        variant: 'destructive',
      })
      return
    }

    if (!goalPeriodStart || !goalPeriodEnd) {
      toast({
        title: 'Período obrigatório',
        description: 'Informe as datas de início e término do período da meta.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          responsible_function_id: goalFuncId,
          metric: goalMetric,
          target: Number(goalTarget),
          period_type: goalPeriodType,
          period_start: goalPeriodStart,
          period_end: goalPeriodEnd,
          status: goalStatusVal,
        })
        toast({
          title: 'Meta atualizada',
          description: 'A meta e os indicadores da função foram salvos com sucesso.',
        })
      } else {
        await createGoal({
          responsible_function_id: goalFuncId,
          metric: goalMetric,
          target: Number(goalTarget),
          period_type: goalPeriodType,
          period_start: goalPeriodStart,
          period_end: goalPeriodEnd,
          status: goalStatusVal,
        })
        toast({
          title: 'Meta definida com sucesso',
          description: 'Nova meta cadastrada e vinculada à função responsável.',
        })
      }

      setGoalModalOpen(false)
      setEditingGoal(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar meta',
        description: err?.message || 'Erro de comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleGoalPause = async (goal: Goal) => {
    if (!isOwner) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas o proprietário pode pausar ou reativar metas.',
        variant: 'destructive',
      })
      return
    }
    const newStatus: GoalStatus = goal.status === 'active' ? 'paused' : 'active'
    try {
      await setGoalStatus(goal.id, newStatus)
      toast({
        title: newStatus === 'active' ? 'Meta ativada' : 'Meta pausada',
        description: `A meta "${goal.metricLabel}" agora está ${newStatus === 'active' ? 'ativa' : 'pausada'}.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao alterar status da meta',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Deseja realmente remover esta meta?')) return
    try {
      await deleteGoal(goalId)
      toast({ title: 'Meta removida com sucesso' })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Exclusão não permitida',
        description: err?.message || 'Apenas o proprietário pode excluir metas.',
        variant: 'destructive',
      })
    }
  }

  const toggleGoalDetails = (goalId: string) => {
    setExpandedGoalDetails((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }))
  }

  // Situações que precisam de atenção (não resolvidas)
  const activeExceptions = useMemo(() => {
    return exceptions.filter((e) => e.status !== 'resolvida')
  }, [exceptions])

  // Contagens para o resumo do dia
  const attentionCount = activeExceptions.length
  const pendingCount = derivedPending.length
  const ongoingActionsCount = actions.filter(
    (a) => a.status === 'em_andamento' || a.status === 'pendente',
  ).length
  const hasCritical = activeExceptions.some(
    (e) => e.severity === 'critica' || e.severity === 'alta',
  )

  // Filtragem das Situações que precisam de atenção
  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exc) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesTitle = exc.title.toLowerCase().includes(term)
        const matchesDesc = exc.description?.toLowerCase().includes(term)
        const matchesFunc = exc.responsibleFunctionName?.toLowerCase().includes(term)
        const matchesPerson = exc.responsiblePersonName?.toLowerCase().includes(term)
        if (!matchesTitle && !matchesDesc && !matchesFunc && !matchesPerson) return false
      }

      if (filterStatus !== 'all' && exc.status !== filterStatus) return false
      if (filterSeverity !== 'all' && exc.severity !== filterSeverity) return false
      if (filterFunction !== 'all' && exc.responsibleFunctionId !== filterFunction) return false

      return true
    })
  }, [exceptions, searchTerm, filterStatus, filterSeverity, filterFunction])

  // Filtragem das Pendências de hoje
  const filteredDerivedPending = useMemo(() => {
    return derivedPending.filter((p) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesTitle = p.title.toLowerCase().includes(term)
        const matchesReason = p.reason.toLowerCase().includes(term)
        const matchesFunc = p.responsibleFunctionName.toLowerCase().includes(term)
        if (!matchesTitle && !matchesReason && !matchesFunc) return false
      }

      if (filterFunction !== 'all' && p.responsibleFunctionId !== filterFunction) return false
      if (filterSeverity !== 'all' && p.severity !== filterSeverity) return false

      return true
    })
  }, [derivedPending, searchTerm, filterFunction, filterSeverity])

  // Filtragem dos Itens de Gestão (Feedbacks)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.visibilityLevel === 'OWNER_ONLY' && !isOwner) {
        return false
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(term)
        const matchesContent = item.content.toLowerCase().includes(term)
        const matchesPerson = item.targetPersonName?.toLowerCase().includes(term)
        const matchesFunc = item.targetFunctionName?.toLowerCase().includes(term)
        if (!matchesTitle && !matchesContent && !matchesPerson && !matchesFunc) return false
      }

      if (filterType !== 'all' && item.type !== filterType) return false
      if (filterVisibility !== 'all' && item.visibilityLevel !== filterVisibility) return false
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (filterPerson !== 'all' && item.targetPersonId !== filterPerson) return false
      if (filterFunction !== 'all' && item.targetFunctionId !== filterFunction) return false

      return true
    })
  }, [
    items,
    isOwner,
    searchTerm,
    filterType,
    filterVisibility,
    filterStatus,
    filterPerson,
    filterFunction,
  ])

  // Filtragem das Ações de Gestão
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesTitle = action.title.toLowerCase().includes(term)
        const matchesDesc = action.description.toLowerCase().includes(term)
        const matchesPerson = action.responsiblePersonName?.toLowerCase().includes(term)
        const matchesFunc = action.responsibleFunctionName?.toLowerCase().includes(term)
        if (!matchesTitle && !matchesDesc && !matchesPerson && !matchesFunc) return false
      }

      if (filterStatus !== 'all' && action.status !== filterStatus) return false
      if (filterPerson !== 'all' && action.responsiblePersonId !== filterPerson) return false
      if (filterFunction !== 'all' && action.responsibleFunctionId !== filterFunction) return false

      return true
    })
  }, [actions, searchTerm, filterStatus, filterPerson, filterFunction])

  // Filtragem das Metas & Indicadores
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesLabel = g.metricLabel.toLowerCase().includes(term)
        const matchesFunc = g.responsibleFunctionName?.toLowerCase().includes(term)
        if (!matchesLabel && !matchesFunc) return false
      }

      if (filterStatus !== 'all' && g.status !== filterStatus) return false
      if (filterFunction !== 'all' && g.responsibleFunctionId !== filterFunction) return false

      return true
    })
  }, [goals, searchTerm, filterStatus, filterFunction])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Resumo: "Hoje" - resposta imediata ao gerente em 5 segundos */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-extrabold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Hoje na Clínica
              </span>
              {isOwner && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  Proprietário (OWNER)
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestão Clínica
            </h1>

            {/* Resumo em linha conforme pedido */}
            <p className="text-sm sm:text-base font-medium text-slate-700 flex items-center gap-2 flex-wrap">
              <span
                className={
                  attentionCount > 0
                    ? hasCritical
                      ? 'text-red-700 font-bold'
                      : 'text-amber-800 font-semibold'
                    : 'text-emerald-700'
                }
              >
                {attentionCount === 0
                  ? 'Nenhuma situação exige intervenção'
                  : attentionCount === 1
                    ? '1 situação precisa da sua atenção'
                    : `${attentionCount} situações precisam da sua atenção`}
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-slate-600">
                {pendingCount === 1 ? '1 pendência' : `${pendingCount} pendências`}
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-slate-600">
                {ongoingActionsCount === 1
                  ? '1 ação em andamento'
                  : `${ongoingActionsCount} ações em andamento`}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => setItemModalOpen(true)}
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Orientação</span>
            </Button>

            <Button
              onClick={() => setActionModalOpen(true)}
              size="sm"
              variant="outline"
              className="border-teal-600 text-teal-800 hover:bg-teal-50 font-medium gap-1.5 text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
              <span>Nova Ação</span>
            </Button>
          </div>
        </div>

        {/* Alerta de status geral / sob controle */}
        {attentionCount === 0 && pendingCount === 0 && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Operação sob controle. Nenhuma situação exige sua intervenção agora.</span>
          </div>
        )}
      </div>

      {/* 2. Seções Primárias de Navegação do Gerente */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('attention')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'attention'
              ? 'border-teal-700 text-teal-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle
            className={`w-4 h-4 ${attentionCount > 0 ? 'text-red-600' : 'text-slate-400'}`}
          />
          <span>PRECISA DA SUA ATENÇÃO</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              attentionCount > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {attentionCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-teal-700 text-teal-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="w-4 h-4 text-teal-600" />
          <span>PENDÊNCIAS DE HOJE</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-teal-100 text-teal-800">
            {filteredDerivedPending.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'actions'
              ? 'border-teal-700 text-teal-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-teal-700" />
          <span>AÇÕES DE GESTÃO</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
            {filteredActions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'border-teal-700 text-teal-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <span>FEEDBACKS E ORIENTAÇÕES</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
            {filteredItems.length}
          </span>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setActiveTab('post_sale')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'post_sale'
                ? 'border-teal-700 text-teal-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            title="Visão Agregada de Pós-Venda e Gestão de Campanhas de Indicação"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span className="text-xs">Pós-Venda & Campanhas</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-teal-100 text-teal-800">
              {postSales.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'goals'
                ? 'border-teal-700 text-teal-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            title="Metas e Indicadores de Execução por Função"
          >
            <Target className="w-3.5 h-3.5 text-teal-700" />
            <span className="text-xs">Metas e Indicadores</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-teal-100 text-teal-800">
              {goals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-teal-700 text-teal-950 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
            title="Regras operacionais e prazos de tolerância da clínica"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-xs">Regras de Gestão</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca Simplificada */}
      {activeTab !== 'rules' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, responsável ou assunto..."
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

          {/* Filtro de Severidade (para Atenção e Pendências) */}
          {(activeTab === 'attention' || activeTab === 'pending') && (
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas severidades</SelectItem>
                <SelectItem value="baixa">Atenção Leve</SelectItem>
                <SelectItem value="media">Atenção Média</SelectItem>
                <SelectItem value="alta">Prioridade Alta</SelectItem>
                <SelectItem value="critica">Urgente / Crítico</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Filtro de Status das Situações */}
          {activeTab === 'attention' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas situações</SelectItem>
                <SelectItem value="aberta">Aguardando Decisão</SelectItem>
                <SelectItem value="reconhecida">Ciente pela Gerência</SelectItem>
                <SelectItem value="decidida">Decisão Registrada</SelectItem>
                <SelectItem value="resolvida">Resolvida</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Filtro de Status para Ações */}
          {activeTab === 'actions' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Status da Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Filtros específicos de Feedbacks e Orientações */}
          {activeTab === 'feedback' && (
            <>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
                  <SelectValue placeholder="Tipo de Orientação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterVisibility} onValueChange={setFilterVisibility}>
                <SelectTrigger className="w-[180px] h-9 text-xs border-slate-200">
                  <SelectValue placeholder="Visibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas visibilidades</SelectItem>
                  {Object.entries(VISIBILITY_CONFIG)
                    .filter(([k]) => isOwner || k !== 'OWNER_ONLY')
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Filtro de Status para Metas */}
          {activeTab === 'goals' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Status da Meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="closed">Encerradas</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Filtro por Função Responsável */}
          <Select value={filterFunction} onValueChange={setFilterFunction}>
            <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Função Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm ||
            filterType !== 'all' ||
            filterVisibility !== 'all' ||
            filterStatus !== 'all' ||
            filterFunction !== 'all' ||
            filterSeverity !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterType('all')
                setFilterVisibility('all')
                setFilterStatus('all')
                setFilterFunction('all')
                setFilterPerson('all')
                setFilterSeverity('all')
              }}
              className="text-xs text-slate-500 hover:text-slate-900 h-9 px-2.5"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* SEÇÃO 1: PRECISA DA SUA ATENÇÃO (situações reais / escalonadas) */}
      {activeTab === 'attention' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando situações prioritárias...
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Operação sob controle. Nenhuma situação exige sua intervenção agora.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tarefas, atendimentos e contatos estão dentro dos prazos acordados para as funções
                da clínica.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExceptions.map((exc) => {
                const sevCfg = SEVERITY_CONFIG[exc.severity]
                const statusCfg = EXCEPTION_STATUS_CONFIG[exc.status]
                const SevIcon = sevCfg.icon

                return (
                  <div
                    key={exc.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${sevCfg.badgeClass}`}
                          >
                            <SevIcon className="w-3 h-3" />
                            {sevCfg.label}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>

                          {exc.recurrenceCount > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-extrabold border border-red-300">
                              {exc.recurrenceCount}ª reincidência
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {new Date(exc.lastDetectedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Título & Detalhes do que aconteceu */}
                      <div className="mt-3.5 space-y-1.5">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {exc.title}
                        </h3>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {exc.description}
                        </p>
                      </div>

                      {/* Função e Pessoa Responsável */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-400">Função responsável:</strong>
                          <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            🏢 {exc.responsibleFunctionName || 'Função Operacional'}
                          </span>
                        </div>

                        {exc.responsiblePersonName && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400">Colaborador no posto:</span>
                            <span>👤 {exc.responsiblePersonName}</span>
                          </div>
                        )}

                        {/* Decisão já registrada */}
                        {exc.decisionText && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                              <span>Decisão da Gerência:</span>
                              {exc.decisionAt && (
                                <span className="font-normal text-blue-700">
                                  {new Date(exc.decisionAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs italic leading-relaxed">"{exc.decisionText}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações e Decisões Esperadas do Gerente */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {exc.status === 'aberta' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeException(exc)}
                            className="text-xs h-8 border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Estou ciente
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handleOpenDecisionModal(exc)}
                          className="text-xs h-8 bg-teal-700 hover:bg-teal-800 text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Registrar Decisão
                        </Button>

                        {exc.status !== 'resolvida' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveException(exc)}
                            className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Concluir
                          </Button>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {exc.status === 'resolvida' && exc.resolvedAt && (
                          <span className="text-emerald-700 font-medium">
                            Resolvida em {new Date(exc.resolvedAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: PENDÊNCIAS DE HOJE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {filteredDerivedPending.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Operação sob controle. Nenhuma pendência em aberto para hoje.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas as tarefas operacionais e contatos com pacientes foram realizados pelas
                funções responsáveis.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-bold">Item Previsto</th>
                      <th className="py-3 px-4 font-bold">Tipo</th>
                      <th className="py-3 px-4 font-bold">Data Prevista</th>
                      <th className="py-3 px-4 font-bold">Situação Atual</th>
                      <th className="py-3 px-4 font-bold">Função Responsável</th>
                      <th className="py-3 px-4 font-bold">Prioridade</th>
                      <th className="py-3 px-4 font-bold">Exige Decisão?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDerivedPending.map((p) => {
                      const sevCfg = SEVERITY_CONFIG[p.severity]

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td
                            className="py-3 px-4 font-semibold text-slate-900 max-w-[240px] truncate"
                            title={p.title}
                          >
                            {p.title}
                          </td>
                          <td className="py-3 px-4 text-slate-600 capitalize">{p.category}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(p.expectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {p.daysOverdue > 0 && (
                              <span className="ml-1 text-[10px] text-red-600 font-bold">
                                (+{p.daysOverdue}d)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{p.reason}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              {p.responsibleFunctionName}
                            </span>
                            {p.responsiblePersonName && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ({p.responsiblePersonName})
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] border ${sevCfg.badgeClass}`}
                            >
                              {sevCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {p.managementDecisionRequired ? (
                              <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                Sim (Atenção do Gestor)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Rotina operacional</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 3: AÇÕES DE GESTÃO */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando ações de gestão...
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-700">
                Nenhuma ação de gestão aberta no momento.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Crie ações de alinhamento com a equipe, treinamentos ou melhorias com prazos e
                responsáveis.
              </p>
              <Button
                onClick={() => setActionModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Criar primeira ação
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActions.map((action) => {
                const statusCfg = ACTION_STATUS_CONFIG[action.status]
                const isOverdue =
                  action.dueDate &&
                  action.dueDate < new Date().toISOString().slice(0, 10) &&
                  action.status !== 'concluida' &&
                  action.status !== 'cancelada'

                return (
                  <div
                    key={action.id}
                    className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Status and Due Date */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] border ${statusCfg.badgeClass}`}
                        >
                          {statusCfg.label}
                        </span>

                        {action.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              isOverdue ? 'text-red-600' : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Prazo:{' '}
                            {new Date(action.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {isOverdue && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                                ATRASADO
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3.5 space-y-2">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {action.title}
                        </h3>
                        {action.description && (
                          <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                            {action.description}
                          </p>
                        )}
                      </div>

                      {/* Origin and Responsibles */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                        {action.originItemTitle && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400">Origem:</span>
                            <span className="font-medium truncate" title={action.originItemTitle}>
                              📄 {action.originItemTitle}
                            </span>
                          </div>
                        )}
                        {action.responsiblePersonName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Responsável:</span>
                            <span>👤 {action.responsiblePersonName}</span>
                          </div>
                        )}
                        {action.responsibleFunctionName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Função:</span>
                            <span>🏢 {action.responsibleFunctionName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Status:</span>
                        <select
                          value={action.status}
                          onChange={(e) =>
                            handleUpdateActionStatus(
                              action.id,
                              e.target.value as ManagementActionStatus,
                            )
                          }
                          className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50 cursor-pointer"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteAction(action.id)}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Remover ação (exclusivo OWNER)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO METAS E INDICADORES (Aba integrada ao lado de Regras de Gestão) */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-700" />
                Metas e Indicadores por Função
              </h2>
              <p className="text-xs text-slate-500">
                A equipe executa o trabalho, o SKIP mede a execução. Indicadores derivados
                automaticamente de evidências reais.
              </p>
            </div>

            {isOwner && (
              <Button
                onClick={handleOpenCreateGoal}
                size="sm"
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Meta</span>
              </Button>
            )}
          </div>

          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando metas e indicadores da equipe...
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 mx-auto flex items-center justify-center text-teal-700">
                <Target className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Nenhuma meta cadastrada no momento.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isOwner
                  ? 'Como proprietário, utilize o botão "Nova Meta" acima para definir os indicadores de execução de cada função operacional.'
                  : 'As metas da equipe são configuradas pela Diretoria (OWNER) e medidas automaticamente pelo sistema.'}
              </p>
              {isOwner && (
                <div className="pt-2">
                  <Button
                    onClick={handleOpenCreateGoal}
                    size="sm"
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar primeira meta</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((g) => {
                const isExpanded = !!expandedGoalDetails[g.id]
                const periodLabel = PERIOD_TYPE_LABELS[g.periodType] || 'Meta'
                const metricMeta = SUPPORTED_METRICS.find((m) => m.key === g.metric)
                const isPercentage = metricMeta?.isPercentage ?? false
                const isPaused = g.status === 'paused'

                let badgeText = 'Sem dados'
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300'
                if (g.statusBadge === 'within') {
                  badgeText = 'Dentro da meta'
                  badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                } else if (g.statusBadge === 'below') {
                  badgeText = 'Abaixo da meta'
                  badgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                }

                const actualDisplay = g.actual !== null && g.actual !== undefined ? g.actual : '—'
                const progressWidth =
                  g.actual !== null && g.actual !== undefined && g.target > 0
                    ? Math.min(
                        100,
                        Math.max(0, Math.round((Number(g.actual) / Number(g.target)) * 100)),
                      )
                    : 0

                return (
                  <div
                    key={g.id}
                    className={`bg-white rounded-xl border p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between ${
                      isPaused ? 'border-dashed border-slate-300 opacity-80' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: `${g.responsibleFunctionColor}15`,
                              color: g.responsibleFunctionColor,
                              borderColor: `${g.responsibleFunctionColor}40`,
                            }}
                          >
                            🏢 {g.responsibleFunctionName}
                          </span>

                          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {periodLabel}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] border ${badgeClass}`}
                          >
                            {badgeText}
                          </span>

                          {isPaused && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Pausada
                            </span>
                          )}
                        </div>

                        {g.isMultiMember && (
                          <span className="text-[11px] text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Corpo Clínico ({g.activeMembersCount || 0} profissionais)
                          </span>
                        )}
                      </div>

                      {/* Header do Card: "CRC Comercial — Meta mensal — Follow-ups realizados — 82/100 — 82%" */}
                      <div className="mt-3.5 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {g.metricLabel}
                          </h3>
                          <div className="text-right whitespace-nowrap">
                            <span className="text-lg font-extrabold text-slate-900">
                              {actualDisplay}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {' '}
                              / {g.target} {isPercentage ? '%' : ''}
                            </span>
                            {g.adherencePct !== null && g.adherencePct !== undefined && (
                              <span className="ml-1.5 text-xs font-bold text-teal-700">
                                ({g.adherencePct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                g.statusBadge === 'within'
                                  ? 'bg-emerald-600'
                                  : g.statusBadge === 'below'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                              }`}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botão Ver Detalhes (Progressive Disclosure) */}
                      <div className="mt-4 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleGoalDetails(g.id)}
                          className="text-xs text-teal-800 hover:text-teal-950 font-semibold flex items-center gap-1 py-1"
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                          <span>{isExpanded ? 'Ocultar detalhes' : 'Ver detalhes da medição'}</span>
                        </button>

                        {/* Conteúdo Expansível de Detalhes da Medição */}
                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400 block">Período medido:</span>
                                <span className="font-semibold text-slate-800">
                                  {new Date(g.periodStart + 'T00:00:00').toLocaleDateString(
                                    'pt-BR',
                                  )}{' '}
                                  até{' '}
                                  {new Date(g.periodEnd + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Meta acordada:</span>
                                <span className="font-semibold text-slate-800">
                                  {g.target} {isPercentage ? '%' : metricMeta?.unit || ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Realizado no período:</span>
                                <span className="font-semibold text-slate-800">
                                  {actualDisplay} {isPercentage ? '%' : metricMeta?.unit || ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Situação de entrega:</span>
                                <span className="font-semibold text-slate-800">{badgeText}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200">
                              <span className="text-slate-500 font-medium block text-[11px]">
                                Fonte de evidência:
                              </span>
                              <p className="text-slate-700 italic mt-0.5 leading-relaxed">
                                {g.evidenceSource}
                              </p>
                            </div>

                            {g.isMultiMember && (
                              <div className="pt-1 text-[11px] text-teal-800">
                                ℹ️ Os números apresentados representam a produção e execução
                                agregada de todos os dentistas da equipe.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações do OWNER */}
                    {isOwner && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleGoalPause(g)}
                            className="text-xs h-7 px-2.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            {isPaused ? (
                              <>
                                <Play className="w-3 h-3 mr-1 text-emerald-600" />
                                Reativar
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3 mr-1 text-amber-600" />
                                Pausar
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditGoal(g)}
                            className="text-xs h-7 px-2.5 text-teal-800 border-teal-300 hover:bg-teal-50"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGoal(g.id)}
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 4: FEEDBACKS E ORIENTAÇÕES */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando feedbacks e orientações...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-700">
                Nenhuma orientação ou feedback registrado.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Registre orientações individuais, feedbacks estruturados ou anotações internas da
                gerência.
              </p>
              <Button
                onClick={() => setItemModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Registrar primeira orientação
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const vis = VISIBILITY_CONFIG[item.visibilityLevel]
                const VisIcon = vis.icon
                const typeInfo = TYPE_CONFIG[item.type]
                const isAcknowledged = !!item.acknowledgedAt

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${vis.badgeClass}`}
                          >
                            <VisIcon className="w-3 h-3" />
                            {vis.label}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                            {typeInfo?.label || item.type}
                          </span>
                        </div>

                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            item.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Title & Content */}
                      <div className="mt-3.5 space-y-2">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </p>
                      </div>

                      {/* Destinatários */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                        {item.targetPersonName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Destinatário:</span>
                            <span>👤 {item.targetPersonName}</span>
                          </div>
                        )}
                        {item.targetFunctionName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Função:</span>
                            <span>🏢 {item.targetFunctionName}</span>
                          </div>
                        )}

                        {/* Confirmação de Leitura */}
                        {item.visibilityLevel === 'SHARED_WITH_EMPLOYEE' && (
                          <div className="mt-2 text-[11px]">
                            {isAcknowledged ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Lido por {item.acknowledgedByName || 'colaborador'} em{' '}
                                {new Date(item.acknowledgedAt!).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Aguardando leitura do colaborador
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <div>
                        Registrado por{' '}
                        <strong className="text-slate-600">{item.createdByName}</strong> em{' '}
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Remover anotação (exclusivo OWNER)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO SECUNDÁRIA: PÓS-VENDA & GESTÃO DE CAMPANHAS (STAGE 4G) */}
      {activeTab === 'post_sale' && (
        <GestaoPostSaleView
          postSales={postSales}
          referrals={referrals}
          campaigns={referralCampaigns}
          isOwner={isOwner}
          onRefresh={async () => {
            await refreshPostSales()
            await loadData()
          }}
        />
      )}

      {/* SEÇÃO SECUNDÁRIA: REGRAS DE GESTÃO (DISCLOSURE PROGRESSIVO) */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5 max-w-2xl">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  Regras de Acompanhamento e Prazos da Clínica
                </p>
                <p className="leading-relaxed">
                  Estas configurações determinam quando uma pendência da equipe deve ser apresentada
                  à gerência para decisão, permitindo que a rotina diária flua sem ruídos
                  desnecessários.
                </p>
              </div>
            </div>

            {isOwner ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                Ajuste restrito ao Proprietário (OWNER)
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Modo Somente Leitura (Consulte o OWNER para alterar regras)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thresholds.map((cfg) => {
              const human = getHumanThresholdInfo(cfg.key)
              const unitText = human.unitLabel(cfg.value) || cfg.unit

              return (
                <div
                  key={cfg.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">{human.label}</span>
                      <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {cfg.value} {unitText}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                      {human.description}
                    </p>

                    {human.example && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">{human.example}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Atualizado em {new Date(cfg.updatedAt).toLocaleDateString('pt-BR')}
                    </span>

                    {isOwner ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenThresholdModal(cfg)}
                        className="text-xs h-7 px-2.5 text-teal-800 border-teal-300 hover:bg-teal-50"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Ajustar regra
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        Fixado pela Diretoria
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAIS OPERACIONAIS */}

      {/* MODAL 1: Nova Orientação / Feedback */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova Orientação / Feedback</DialogTitle>
            <DialogDescription>
              Registre orientações estruturadas, feedbacks de equipe ou anotações gerenciais.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Título do assunto <span className="text-red-500">*</span>
              </Label>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Ex.: Alinhamento sobre contato com novos pacientes"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de orientação</Label>
                <Select
                  value={itemType}
                  onValueChange={(val) => setItemType(val as ManagementItemType)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Visibilidade <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={itemVisibility}
                  onValueChange={(val) => setItemVisibility(val as ManagementVisibilityLevel)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VISIBILITY_CONFIG)
                      .filter(([k]) => isOwner || k !== 'OWNER_ONLY')
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong>Visibilidade:</strong> {VISIBILITY_CONFIG[itemVisibility]?.description}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Colaborador (opcional)
                </Label>
                <Select value={itemTargetPersonId} onValueChange={setItemTargetPersonId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum colaborador específico</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Função (opcional)</Label>
                <Select value={itemTargetFunctionId} onValueChange={setItemTargetFunctionId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma função específica</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Conteúdo detalhado <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={itemContent}
                onChange={(e) => setItemContent(e.target.value)}
                placeholder="Descreva pontos de evidência, feedback ou orientações práticas para a equipe..."
                rows={4}
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Orientação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Nova Ação */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova Ação de Gestão</DialogTitle>
            <DialogDescription>
              Crie uma tarefa ou compromisso de melhoria operacional com prazo e responsáveis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAction} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Título da ação <span className="text-red-500">*</span>
              </Label>
              <Input
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Ex.: Alinhamento presencial sobre reativação de orçamentos"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Responsável (Pessoa)</Label>
                <Select value={actionRespPersonId} onValueChange={setActionRespPersonId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável específico</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Responsável (Função)</Label>
                <Select value={actionRespFunctionId} onValueChange={setActionRespFunctionId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem função específica</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prazo de conclusão</Label>
                <Input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Orientação vinculada</Label>
                <Select value={actionOriginItemId} onValueChange={setActionOriginItemId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Vincular a orientação existente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma orientação vinculada</SelectItem>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição e orientações
              </Label>
              <Textarea
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                placeholder="Detalhes sobre o que deve ser realizado..."
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Ação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Registrar Decisão sobre a Situação */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Decisão de Gestão</DialogTitle>
            <DialogDescription>
              Defina a providência administrativa para orientar a equipe.
            </DialogDescription>
          </DialogHeader>

          {selectedException && (
            <form onSubmit={handleSaveDecision} className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-800">{selectedException.title}</div>
                <div className="text-slate-600">{selectedException.description}</div>
                <div className="text-[11px] text-teal-800 font-semibold pt-1">
                  Função responsável: {selectedException.responsibleFunctionName}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Parecer da Gerência / Decisão Tomada <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  placeholder="Ex.: Alinhado com a equipe. Reagendado o contato para amanhã e reorientado o processo..."
                  rows={4}
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="resolveNow"
                  checked={resolveImmediately}
                  onChange={(e) => setResolveImmediately(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <Label htmlFor="resolveNow" className="text-xs text-slate-700 cursor-pointer">
                  Marcar situação como totalmente <strong>Concluída/Resolvida</strong> agora
                </Label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDecisionModalOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Decisão'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: CRIAR / EDITAR META E INDICADOR (OWNER-ONLY) */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Target className="w-5 h-5 text-teal-700" />
              {editingGoal ? 'Editar Meta e Indicador' : 'Nova Meta por Função'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingGoal
                ? 'Ajuste os parâmetros de medição e meta acordada para a função.'
                : 'Defina a meta de execução para a função. O SKIP medirá automaticamente a entrega a partir das evidências operacionais.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGoal} className="space-y-4 pt-2">
            {/* Função Responsável */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Função Responsável *</Label>
              <Select value={goalFuncId} onValueChange={setGoalFuncId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Indicador / Métrica */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Indicador Medido *</Label>
              <Select
                value={goalMetric}
                onValueChange={(val) => setGoalMetric(val as GoalMetricKey)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione o indicador" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label} ({m.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const cur = SUPPORTED_METRICS.find((m) => m.key === goalMetric)
                return cur ? (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    {cur.description}
                  </p>
                ) : null
              })()}
            </div>

            {/* Meta (Target) e Periodicidade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Meta Alvo *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 50"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Periodicidade *</Label>
                <Select
                  value={goalPeriodType}
                  onValueChange={(val) => setGoalPeriodType(val as GoalPeriodType)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Período: Início e Fim */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Início do Período *</Label>
                <Input
                  type="date"
                  value={goalPeriodStart}
                  onChange={(e) => setGoalPeriodStart(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Fim do Período *</Label>
                <Input
                  type="date"
                  value={goalPeriodEnd}
                  onChange={(e) => setGoalPeriodEnd(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            {/* Status (ativo / pausado / encerrado) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Situação da Meta</Label>
              <Select
                value={goalStatusVal}
                onValueChange={(val) => setGoalStatusVal(val as GoalStatus)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa (em medição)</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="closed">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGoalModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Ajustar Regra de Gestão */}
      <Dialog open={thresholdModalOpen} onOpenChange={setThresholdModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Regra de Gestão</DialogTitle>
            <DialogDescription>
              Defina o limite de tolerância para acompanhamento da clínica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateThreshold} className="space-y-4 py-2">
            {editingThresholdKey &&
              (() => {
                const info = getHumanThresholdInfo(editingThresholdKey)
                return (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">{info.label}</Label>
                    <p className="text-xs text-slate-600 leading-relaxed">{info.description}</p>
                  </div>
                )
              })()}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Novo Limite ({editingThresholdUnit}) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={editingThresholdVal}
                onChange={(e) => setEditingThresholdVal(Number(e.target.value))}
                className="h-10 text-xs"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setThresholdModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
