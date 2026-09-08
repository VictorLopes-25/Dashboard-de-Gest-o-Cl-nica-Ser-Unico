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
  ManagementItemStatus,
  ManagementActionStatus,
  ManagedException,
  OrgThresholdConfig,
  DerivedPendingItem,
  ExceptionSeverity,
  ExceptionStatus,
} from '@/types'
import {
  ShieldAlert,
  Lock,
  Eye,
  Users,
  Building2,
  Plus,
  Filter,
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
  ChevronRight,
  ListTodo,
} from 'lucide-react'
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
    label: 'OWNER Exclusivo',
    description: 'Decisões de posse, conteúdo estratégico restrito ao OWNER',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    icon: Lock,
  },
  PRIVATE_MANAGEMENT: {
    label: 'Gestão Privada',
    description: 'Notas privadas do gestor sobre colaboradores e rotinas',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-medium',
    icon: Eye,
  },
  SHARED_WITH_EMPLOYEE: {
    label: 'Compartilhado com Colaborador',
    description: 'Feedback visível ao colaborador avaliado e à gestão',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 font-medium',
    icon: UserCheck,
  },
  FUNCTION_VISIBLE: {
    label: 'Visível para a Função',
    description: 'Diretrizes e protocolos visíveis para toda a função',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-medium',
    icon: Building2,
  },
}

// Labels de tipos de item
const TYPE_CONFIG: Record<ManagementItemType, { label: string; icon: any }> = {
  feedback: { label: 'Feedback', icon: UserCheck },
  nota_privada_gestao: { label: 'Nota Privada', icon: Eye },
  decisao_posse: { label: 'Decisão de Posse', icon: Lock },
  conteudo_estrategico: { label: 'Conteúdo Estratégico', icon: Sparkles },
  instrucao_funcao: { label: 'Instrução de Função', icon: Building2 },
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

// Labels de severidade de exceção
const SEVERITY_CONFIG: Record<ExceptionSeverity, { label: string; badgeClass: string; icon: any }> =
  {
    baixa: {
      label: 'Baixa',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Clock,
    },
    media: {
      label: 'Média',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
      icon: AlertTriangle,
    },
    alta: {
      label: 'Alta',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
      icon: AlertCircle,
    },
    critica: {
      label: 'Crítica',
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-extrabold',
      icon: ShieldAlert,
    },
  }

// Labels de status de exceção
const EXCEPTION_STATUS_CONFIG: Record<ExceptionStatus, { label: string; badgeClass: string }> = {
  aberta: {
    label: 'Aberta',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  },
  reconhecida: {
    label: 'Reconhecida',
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
  const { currentUser, isOwner, roles, collaborators, agendaItems, leads, tasks } = useApp()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<
    'exceptions' | 'pending_day' | 'items' | 'actions' | 'thresholds'
  >('exceptions')
  const [items, setItems] = useState<ManagementItem[]>([])
  const [actions, setActions] = useState<ManagementAction[]>([])
  const [exceptions, setExceptions] = useState<ManagedException[]>([])
  const [thresholds, setThresholds] = useState<OrgThresholdConfig[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros gerais
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
  const [selectedException, setSelectedException] = useState<ManagedException | null>(null)
  const [decisionText, setDecisionText] = useState('')
  const [resolveImmediately, setResolveImmediately] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Estado do formulário de Item de Gestão
  const [itemTitle, setItemTitle] = useState('')
  const [itemContent, setItemContent] = useState('')
  const [itemType, setItemType] = useState<ManagementItemType>('feedback')
  const [itemVisibility, setItemVisibility] =
    useState<ManagementVisibilityLevel>('SHARED_WITH_EMPLOYEE')
  const [itemTargetPersonId, setItemTargetPersonId] = useState<string>('')
  const [itemTargetFunctionId, setItemTargetFunctionId] = useState<string>('')

  // Estado do formulário de Ação de Gestão
  const [actionTitle, setActionTitle] = useState('')
  const [actionDescription, setActionDescription] = useState('')
  const [actionRespPersonId, setActionRespPersonId] = useState<string>('')
  const [actionRespFunctionId, setActionRespFunctionId] = useState<string>('')
  const [actionDueDate, setActionDueDate] = useState<string>('')
  const [actionOriginItemId, setActionOriginItemId] = useState<string>('')

  // Estado do formulário de Edição de Limiares
  const [editingThresholdKey, setEditingThresholdKey] = useState('')
  const [editingThresholdVal, setEditingThresholdVal] = useState<number>(1)
  const [editingThresholdDesc, setEditingThresholdDesc] = useState('')

  // Mapas rápidos
  const peopleMap = useMemo(
    () => new Map(collaborators.map((c) => [c.id, c.name])),
    [collaborators],
  )
  const functionsMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles])

  // Limiares em formato de objeto Record<key, number>
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

  // Pendências do Dia DERIVADAS (D3_PENDING_ITEM: DERIVED)
  const derivedPending = useMemo(() => {
    return derivePendingItems(
      {
        agendaItems,
        leads,
        tasks,
        roles,
        collaborators,
        activeAssignments: [],
      },
      thresholdsObj,
    )
  }, [agendaItems, leads, tasks, roles, collaborators, thresholdsObj])

  // Carregar dados de gestão e exceções
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dbItems, dbActions, dbExceptions, dbThresholds] = await Promise.all([
        fetchManagementItems(),
        fetchManagementActions(),
        fetchManagedExceptions(),
        fetchThresholdConfigs(),
      ])

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

      // Anexar nomes às exceções
      const uiExceptions = dbExceptions.map((e) => ({
        ...e,
        responsibleFunctionName: functionsMap.get(e.responsibleFunctionId) || 'Função',
        responsiblePersonName: e.responsiblePersonId ? peopleMap.get(e.responsiblePersonId) : null,
        acknowledgedByName: e.acknowledgedByPersonId
          ? peopleMap.get(e.acknowledgedByPersonId)
          : null,
        decisionByName: e.decisionByPersonId ? peopleMap.get(e.decisionByPersonId) : null,
      }))

      setItems(uiItems)
      setActions(uiActions)
      setExceptions(uiExceptions)
      setThresholds(dbThresholds)
    } catch (err: any) {
      console.error('Falha ao carregar dados de gestão:', err)
      toast({
        title: 'Erro ao carregar dados de gestão',
        description: err?.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [peopleMap, functionsMap, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Ação: Reconhecer Exceção
  const handleAcknowledgeException = async (exc: ManagedException) => {
    try {
      await acknowledgeException(exc.id)
      toast({
        title: 'Exceção reconhecida',
        description: `O desvio "${exc.title}" foi marcado como reconhecido pela gestão.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao reconhecer exceção',
        description: err?.message || 'Erro ao atualizar no banco de dados.',
        variant: 'destructive',
      })
    }
  }

  // Ação: Abrir modal de decisão
  const handleOpenDecisionModal = (exc: ManagedException) => {
    setSelectedException(exc)
    setDecisionText(exc.decisionText || '')
    setResolveImmediately(exc.status === 'decidida')
    setDecisionModalOpen(true)
  }

  // Submeter Decisão de Gestão
  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedException || !decisionText.trim()) {
      toast({
        title: 'Decisão obrigatória',
        description: 'Descreva a decisão de gestão ou plano de ação adotado.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await recordExceptionDecision(selectedException.id, decisionText, resolveImmediately)
      toast({
        title: resolveImmediately ? 'Exceção resolvida' : 'Decisão registrada',
        description: 'Registro de gestão atualizado com sucesso.',
      })
      setDecisionModalOpen(false)
      setSelectedException(null)
      setDecisionText('')
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar decisão',
        description: err?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Ação: Resolver Exceção
  const handleResolveException = async (exc: ManagedException) => {
    try {
      await resolveException(exc.id)
      toast({
        title: 'Exceção marcada como resolvida',
        description: `O desvio "${exc.title}" foi encerrado.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao resolver exceção',
        description: err?.message || 'Erro no banco de dados.',
        variant: 'destructive',
      })
    }
  }

  // Ação: Sincronizar Pendências Derivadas com a Tabela de Exceções
  const handleSyncDerivedExceptions = async () => {
    try {
      const res = await syncDerivedExceptionsToDatabase(derivedPending, exceptions)
      toast({
        title: 'Sincronização concluída',
        description: `${res.addedOrUpdatedCount} exceção(ões) derivada(s) processada(s) ou atualizada(s).`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha na sincronização de exceções',
        description: err?.message || 'Erro ao sincronizar.',
        variant: 'destructive',
      })
    }
  }

  // Ação: Abrir modal de limiar
  const handleOpenThresholdModal = (cfg: OrgThresholdConfig) => {
    setEditingThresholdKey(cfg.key)
    setEditingThresholdVal(cfg.value)
    setEditingThresholdDesc(cfg.description)
    setThresholdModalOpen(true)
  }

  // Submeter Atualização de Limiar
  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateThresholdConfig(editingThresholdKey, Number(editingThresholdVal))
      toast({
        title: 'Limiar atualizado',
        description: 'A política de escalonamento da organização foi atualizada com sucesso.',
      })
      setThresholdModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao atualizar limiar',
        description: err?.message || 'Erro ao salvar no banco.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submeter novo item de gestão
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemTitle.trim() || !itemContent.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título e o conteúdo do item de gestão.',
        variant: 'destructive',
      })
      return
    }

    if (itemVisibility === 'OWNER_ONLY' && !isOwner) {
      toast({
        title: 'Permissão negada',
        description: 'Apenas o OWNER da organização pode criar itens de nível OWNER_ONLY.',
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
        title: 'Item de gestão registrado',
        description: 'Item salvo com sucesso na matriz de gestão.',
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
        title: 'Falha ao salvar item',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submeter nova ação de gestão
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionTitle.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título da ação corretiva ou estratégica.',
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
        title: 'Ação de gestão criada',
        description: 'Ação registrada e atribuída aos responsáveis.',
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

  // Atualizar status de ação
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
        description: err?.message || 'Erro ao comunicar com o servidor.',
        variant: 'destructive',
      })
    }
  }

  // Excluir item de gestão (restrito a OWNER via RLS)
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Deseja realmente excluir este item de gestão?')) return
    try {
      await deleteManagementItem(itemId)
      toast({ title: 'Item de gestão excluído' })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Exclusão negada',
        description: err?.message || 'Apenas o OWNER pode excluir itens de gestão permanentemente.',
        variant: 'destructive',
      })
    }
  }

  // Excluir ação de gestão (restrito a OWNER via RLS)
  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Deseja realmente excluir esta ação de gestão?')) return
    try {
      await deleteManagementAction(actionId)
      toast({ title: 'Ação de gestão excluída' })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Exclusão negada',
        description: err?.message || 'Apenas o OWNER pode excluir ações de gestão.',
        variant: 'destructive',
      })
    }
  }

  // Filtragem das Exceções
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

  // Filtragem das Pendências Derivadas do Dia
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

  // Filtragem dos Itens de Gestão
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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Gestão Clínica Ser Único
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-900 border border-teal-300">
                  v0.0.23
                </span>
                {isOwner && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    OWNER
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Sistema Operacional do Gestor — Gestão por Exceção, Limiares Calibráveis e Ações por
                Função
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleSyncDerivedExceptions}
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs gap-1.5"
            title="Escanear evidências operacionais e atualizar painel de exceções"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            <span>Sincronizar Exceções</span>
          </Button>

          <Button
            onClick={() => setItemModalOpen(true)}
            size="sm"
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Item de Gestão</span>
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

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('exceptions')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'exceptions'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <span>Exceções de Gestão ({filteredExceptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending_day')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'pending_day'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="w-4 h-4 text-teal-600" />
          <span>Pendências do Dia [Derivadas] ({filteredDerivedPending.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Itens de Gestão ({filteredItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'actions'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Ações Corretivas ({filteredActions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'thresholds'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Limiares Configuráveis ({thresholds.length})</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, motivo, desvio ou destinatário..."
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>

        {/* Filtro de Severidade (para exceções e pendências) */}
        {(activeTab === 'exceptions' || activeTab === 'pending_day') && (
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas severidades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Filtro de Status das Exceções */}
        {activeTab === 'exceptions' && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Status exceção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="reconhecida">Reconhecida</SelectItem>
              <SelectItem value="decidida">Decidida</SelectItem>
              <SelectItem value="resolvida">Resolvida</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Filtros específicos de Itens de Gestão */}
        {activeTab === 'items' && (
          <>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Tipo de item" />
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
                <SelectValue placeholder="Nível de visibilidade" />
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* Filtro de Status para Ações */}
        {activeTab === 'actions' && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Status ação" />
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

        {/* Filtro de Função */}
        <Select value={filterFunction} onValueChange={setFilterFunction}>
          <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
            <SelectValue placeholder="Função" />
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
            className="text-xs text-slate-500 hover:text-slate-900 h-9"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* ABA 1: EXCEÇÕES DE GESTÃO */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">
                Princípio de Gestão por Exceção (Primary Manager Behavior)
              </p>
              <p className="text-amber-800/90 leading-relaxed">
                Operações rotineiras em conformidade não geram ruído para a gestão. Apenas desvios
                que ultrapassam os limiares calibrados da clínica são escalonados aqui, preservando
                a atribuição da Função responsável.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando exceções de gestão...
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Nenhuma exceção pendente encontrada.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas as tarefas, agendamentos e follow-ups de leads estão dentro dos limiares de
                tolerância configurados.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncDerivedExceptions}
                className="text-xs mt-2"
              >
                Escanear evidências operacionais
              </Button>
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
                            Severidade: {sevCfg.label}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>

                          {exc.recurrenceCount > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-extrabold border border-red-300">
                              Reincidência x{exc.recurrenceCount}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {new Date(exc.lastDetectedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3.5 space-y-2">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {exc.title}
                        </h3>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {exc.description}
                        </p>
                      </div>

                      {/* Invariante Handoff / Responsabilidade por Função */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-400">Função Responsável:</strong>
                          <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            🏢 {exc.responsibleFunctionName || 'Função'}
                          </span>
                        </div>

                        {exc.responsiblePersonName && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400">Ocupante no Momento:</span>
                            <span>👤 {exc.responsiblePersonName}</span>
                          </div>
                        )}

                        {/* Decisão Registrada */}
                        {exc.decisionText && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                              <span>Decisão da Gestão:</span>
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

                    {/* Actions Workflow (Reconhecer, Decidir, Resolver) */}
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
                            Reconhecer
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
                            Resolver
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

      {/* ABA 2: PENDÊNCIAS DO DIA (DERIVADAS - D3) */}
      {activeTab === 'pending_day' && (
        <div className="space-y-4">
          <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
            <ListTodo className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-teal-950">
                Pendências do Dia (Decisão Arquitetural D3 — Query Derivada)
              </p>
              <p className="text-teal-800/90 leading-relaxed">
                Este relatório é computado em tempo real comparando{' '}
                <strong>Esperado vs Realizado</strong> a partir das tabelas operacionais (agenda,
                tarefas, leads), sem duplicação ou tabelas redundantes de histórico diário.
              </p>
            </div>
          </div>

          {filteredDerivedPending.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Nenhuma pendência operacional em aberto para a data de hoje.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas as tarefas e follow-ups previstos foram concluídos pelas funções responsáveis.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-bold">Item Esperado</th>
                      <th className="py-3 px-4 font-bold">Categoria</th>
                      <th className="py-3 px-4 font-bold">Data Prevista</th>
                      <th className="py-3 px-4 font-bold">Desvio Observado</th>
                      <th className="py-3 px-4 font-bold">Função Responsável</th>
                      <th className="py-3 px-4 font-bold">Severidade</th>
                      <th className="py-3 px-4 font-bold">Decisão Gestão?</th>
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
                                Sim (Escalado)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Não (Tolerado)</span>
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

      {/* ABA 3: ITENS DE GESTÃO (FEEDBACK / NOTAS / DIRETRIZES) */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Carregando itens de gestão...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-700">
                Nenhum item de gestão encontrado.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Registre feedbacks estruturados, notas privadas de desenvolvimento ou diretrizes
                operacionais para as funções da clínica.
              </p>
              <Button
                onClick={() => setItemModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Criar primeiro item
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

                      {/* Destinatários (Pessoa / Função) */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                        {item.targetPersonName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Destinatário (Pessoa):</span>
                            <span>👤 {item.targetPersonName}</span>
                          </div>
                        )}
                        {item.targetFunctionName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Destinatário (Função):</span>
                            <span>🏢 {item.targetFunctionName}</span>
                          </div>
                        )}

                        {/* Reconhecimento */}
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
                        Criado por <strong className="text-slate-600">{item.createdByName}</strong>{' '}
                        em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Excluir item (exclusivo OWNER)"
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

      {/* ABA 4: AÇÕES CORRETIVAS E ESTRATÉGICAS */}
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
                Nenhuma ação corretiva ou estratégica cadastrada.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Crie ações de melhoria operacional, treinamentos ou alinhamentos estratégicos com
                prazos e responsáveis definidos.
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
                            <span className="text-slate-400">Responsável (Pessoa):</span>
                            <span>👤 {action.responsiblePersonName}</span>
                          </div>
                        )}
                        {action.responsibleFunctionName && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-slate-400">Responsável (Função):</span>
                            <span>🏢 {action.responsibleFunctionName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Alterar:</span>
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
                          title="Excluir ação (exclusivo OWNER)"
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

      {/* ABA 5: LIMIARES CONFIGURÁVEIS (D7_ESCALATION_THRESHOLDS) */}
      {activeTab === 'thresholds' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Sliders className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">
                Limiares Operacionais Configuráveis (D7_ESCALATION_THRESHOLDS)
              </p>
              <p className="leading-relaxed">
                Nenhum limiar de tolerância de falhas, atrasos ou follow-up é gravado de forma
                estática no código-fonte. Como gestor ou OWNER, você calibra a sensibilidade do
                sistema para os fluxos da sua clínica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thresholds.map((cfg) => (
              <div
                key={cfg.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-semibold">
                      {cfg.key}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {cfg.value} {cfg.unit}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{cfg.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Atualizado em {new Date(cfg.updatedAt).toLocaleDateString('pt-BR')}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenThresholdModal(cfg)}
                    className="text-xs h-7 px-2.5 text-teal-800 border-teal-300 hover:bg-teal-50"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Calibrar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Criar Item de Gestão */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Item de Gestão</DialogTitle>
            <DialogDescription>
              Registre feedbacks estruturados, notas privadas ou diretrizes operacionais.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Título do item <span className="text-red-500">*</span>
              </Label>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Ex.: Feedback sobre follow-up de orçamentos"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de item</Label>
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
                  Nível de Visibilidade <span className="text-red-500">*</span>
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
                  Colaborador Alvo (opcional)
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
                <Label className="text-xs font-semibold text-slate-700">
                  Função Alvo (opcional)
                </Label>
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
                placeholder="Descreva pontos de evidência, feedback ou diretrizes práticas..."
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
                {submitting ? 'Salvando...' : 'Salvar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Criar Ação de Gestão */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova Ação Corretiva / Estratégica</DialogTitle>
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
                placeholder="Ex.: Treinamento intensivo sobre script de reativação"
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
                <Label className="text-xs font-semibold text-slate-700">
                  Prazo de conclusão (Due Date)
                </Label>
                <Input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Origem (Item de gestão vinculado)
                </Label>
                <Select value={actionOriginItemId} onValueChange={setActionOriginItemId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Vincular a item existente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum item vinculado</SelectItem>
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
                Descrição e plano de execução
              </Label>
              <Textarea
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                placeholder="Detalhes operacionais sobre o que deve ser entregue..."
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

      {/* MODAL 3: Registrar Decisão sobre Exceção */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Decisão de Gestão</DialogTitle>
            <DialogDescription>
              Defina a providência administrativa para o desvio observado.
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
                  Parecer da Gestão / Decisão Tomada <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  placeholder="Ex.: Alinhado com o titular da função. Follow-up reagendado para amanhã e reforço do processo..."
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
                  Marcar exceção como totalmente <strong>Resolvida</strong> de imediato
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

      {/* MODAL 4: Calibrar Limiar da Organização (D7) */}
      <Dialog open={thresholdModalOpen} onOpenChange={setThresholdModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calibrar Limiar Operacional</DialogTitle>
            <DialogDescription>
              Ajuste o valor que dispara a elevação de exceções para esta organização.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateThreshold} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Chave do Limiar</Label>
              <Input
                value={editingThresholdKey}
                disabled
                className="h-9 text-xs bg-slate-50 font-mono text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">{editingThresholdDesc}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Novo Valor Limiar <span className="text-red-500">*</span>
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
                {submitting ? 'Salvando...' : 'Salvar Novo Limiar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
