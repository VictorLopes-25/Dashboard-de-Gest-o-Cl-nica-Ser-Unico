import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'
import type {
  Goal,
  GoalCalculationResult,
  GoalMetricKey,
  GoalPeriodType,
  GoalStatus,
  AgendaItem,
  Lead,
  Role,
  Collaborator,
} from '@/types'

export interface DbGoal {
  id: string
  organization_id: string
  responsible_function_id: string
  metric: string
  metric_label: string
  target: number
  period_type: string
  period_start: string
  period_end: string
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateGoalPayload {
  responsible_function_id: string
  metric: GoalMetricKey
  metric_label?: string
  target: number
  period_type: GoalPeriodType
  period_start: string
  period_end: string
  status?: GoalStatus
}

export interface UpdateGoalPayload {
  responsible_function_id?: string
  metric?: GoalMetricKey
  metric_label?: string
  target?: number
  period_type?: GoalPeriodType
  period_start?: string
  period_end?: string
  status?: GoalStatus
}

export const SUPPORTED_METRICS: Array<{
  key: GoalMetricKey
  label: string
  unit: string
  description: string
  evidenceSource: string
  isPercentage?: boolean
  lowerIsBetter?: boolean
}> = [
  {
    key: 'tasks_completed',
    label: 'Tarefas concluídas',
    unit: 'tarefas',
    description: 'Quantidade de rotinas e tarefas concluídas com sucesso no período.',
    evidenceSource:
      'Tarefas e rotinas operacionais com status concluído registradas na agenda da clínica durante o período.',
  },
  {
    key: 'tasks_overdue',
    label: 'Tarefas em atraso',
    unit: 'tarefas',
    description: 'Quantidade de tarefas com data prevista vencida sem conclusão.',
    evidenceSource: 'Tarefas pendentes com prazo vencido atribuídas à função no período avaliado.',
    lowerIsBetter: true,
  },
  {
    key: 'routine_adherence',
    label: 'Aderência às rotinas',
    unit: '%',
    description: 'Percentual de rotinas operacionais executadas dentro da janela programada.',
    evidenceSource:
      'Percentual de cumprimento de rotinas operacionais planejadas no período pela função.',
    isPercentage: true,
  },
  {
    key: 'followups_executed',
    label: 'Follow-ups realizados',
    unit: 'contatos',
    description: 'Tentativas e contatos comerciais realizados com pacientes e leads.',
    evidenceSource:
      'Contatos e tentativas de retorno registradas no histórico do CRM durante o período.',
  },
  {
    key: 'followups_overdue',
    label: 'Follow-ups em atraso',
    unit: 'leads',
    description: 'Pacientes em negociação com data de retorno expirada sem novo contato.',
    evidenceSource: 'Leads ativos no CRM cuja data prevista de próximo contato está em atraso.',
    lowerIsBetter: true,
  },
  {
    key: 'exceptions_generated',
    label: 'Exceções geradas',
    unit: 'situações',
    description: 'Desvios e atrasos operacionais detectados que exigiram atenção da gestão.',
    evidenceSource:
      'Situações de desvio e exceções de gestão registradas para a função no período.',
    lowerIsBetter: true,
  },
  {
    key: 'exceptions_resolved',
    label: 'Exceções resolvidas',
    unit: 'situações',
    description: 'Situações e desvios operacionais corrigidos e concluídos no período.',
    evidenceSource: 'Situações de exceção finalizadas e resolvidas para a função no período.',
  },
  {
    key: 'management_actions_completed',
    label: 'Ações de gestão concluídas',
    unit: 'ações',
    description: 'Planos de ação e melhorias operacionais finalizados pela equipe.',
    evidenceSource: 'Ações de melhoria e alinhamento de gestão concluídas no período pela função.',
  },
  {
    key: 'management_actions_overdue',
    label: 'Ações de gestão em atraso',
    unit: 'ações',
    description: 'Planos de ação com prazo acordado ultrapassado.',
    evidenceSource: 'Ações de gestão pendentes cujo prazo limite acordado foi ultrapassado.',
    lowerIsBetter: true,
  },
]

export const PERIOD_TYPE_LABELS: Record<GoalPeriodType, string> = {
  daily: 'Meta diária',
  weekly: 'Meta semanal',
  monthly: 'Meta mensal',
  custom: 'Meta personalizada',
}

/**
 * Busca todas as metas da organização ativa
 */
export async function fetchGoals(): Promise<DbGoal[]> {
  const orgId = await getOrganizationId()
  const { data, error } = await (supabase as any)
    .from('goals')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar metas:', error)
    throw error
  }
  return data || []
}

/**
 * Cria uma nova meta (apenas OWNER possui permissão no banco)
 */
export async function createGoal(payload: CreateGoalPayload): Promise<DbGoal> {
  const orgId = await getOrganizationId()
  const metricConfig = SUPPORTED_METRICS.find((m) => m.key === payload.metric)
  const metricLabel = payload.metric_label || metricConfig?.label || payload.metric

  const { data, error } = await (supabase as any)
    .from('goals')
    .insert({
      organization_id: orgId,
      responsible_function_id: payload.responsible_function_id,
      metric: payload.metric,
      metric_label: metricLabel,
      target: payload.target,
      period_type: payload.period_type,
      period_start: payload.period_start,
      period_end: payload.period_end,
      status: payload.status || 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar meta:', error)
    throw error
  }
  return data
}

/**
 * Atualiza meta existente (apenas OWNER possui permissão no banco)
 */
export async function updateGoal(id: string, payload: UpdateGoalPayload): Promise<DbGoal> {
  const orgId = await getOrganizationId()
  const updates: Record<string, any> = { ...payload }
  if (payload.metric && !payload.metric_label) {
    const metricConfig = SUPPORTED_METRICS.find((m) => m.key === payload.metric)
    if (metricConfig) {
      updates.metric_label = metricConfig.label
    }
  }

  const { data, error } = await (supabase as any)
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar meta:', error)
    throw error
  }
  return data
}

/**
 * Pausa ou ativa meta
 */
export async function setGoalStatus(id: string, status: GoalStatus): Promise<DbGoal> {
  return updateGoal(id, { status })
}

/**
 * Exclui meta (apenas OWNER possui permissão no banco)
 */
export async function deleteGoal(id: string): Promise<void> {
  const orgId = await getOrganizationId()
  const { error } = await (supabase as any)
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    console.error('Erro ao excluir meta:', error)
    throw error
  }
}

/**
 * Executa a derivação automática no servidor via RPC calculate_goals_for_organization.
 * Retorna array de resultados computados.
 */
export async function calculateGoalsRpc(): Promise<GoalCalculationResult[]> {
  try {
    const { data, error } = await (supabase as any).rpc('calculate_goals_for_organization')
    if (error) {
      console.warn(
        'RPC calculate_goals_for_organization indisponível ou falhou, acionando fallback:',
        error,
      )
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Erro ao chamar RPC calculate_goals_for_organization:', err)
    return []
  }
}

/**
 * Executa cálculo de uma meta individual via RPC calculate_goal_metric.
 */
export async function calculateSingleGoalRpc(
  goalId: string,
): Promise<GoalCalculationResult | null> {
  try {
    const { data, error } = await (supabase as any).rpc('calculate_goal_metric', {
      p_goal_id: goalId,
    })
    if (error) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Fallback client-side para cálculo de métricas a partir dos dados já em memória/cache
 * quando a RPC do servidor não responder ou em ambiente offline.
 */
export function deriveGoalMetricClientSide(
  goal: DbGoal,
  context: {
    agendaItems?: AgendaItem[]
    leads?: Lead[]
    leadContacts?: Array<{
      contactDate?: string
      functionId?: string | null
      outcome?: string | null
    }>
    managedExceptions?: Array<{
      id: string
      responsibleFunctionId: string
      status: string
      firstDetectedAt: string
      resolvedAt?: string | null
    }>
    managementActions?: Array<{
      id: string
      responsibleFunctionId?: string | null
      status: string
      dueDate?: string | null
      completedAt?: string | null
      updatedAt: string
    }>
  },
  todayIso: string = new Date().toISOString().slice(0, 10),
): { actual: number; evidenceSource: string } {
  const {
    agendaItems = [],
    leads = [],
    leadContacts = [],
    managedExceptions = [],
    managementActions = [],
  } = context

  const start = goal.period_start
  const end = goal.period_end
  const funcId = goal.responsible_function_id

  const metricConfig = SUPPORTED_METRICS.find((m) => m.key === goal.metric)
  const defaultEvidence =
    metricConfig?.evidenceSource || 'Evidência operacional derivada do sistema SKIP.'

  switch (goal.metric as GoalMetricKey) {
    case 'tasks_completed': {
      const count = agendaItems.filter((item) => {
        if (item.functionId !== funcId) return false
        if (item.status !== 'concluido') return false
        const date = item.completedAt ? item.completedAt.slice(0, 10) : item.dueDate
        return date >= start && date <= end
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'tasks_overdue': {
      const count = agendaItems.filter((item) => {
        if (item.functionId !== funcId) return false
        if (item.status !== 'aberto') return false
        return item.dueDate >= start && item.dueDate <= end && item.dueDate < todayIso
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'routine_adherence': {
      const itemsInPeriod = agendaItems.filter((item) => {
        if (item.functionId !== funcId) return false
        if (item.status === 'cancelado') return false
        return item.dueDate >= start && item.dueDate <= end
      })
      if (itemsInPeriod.length === 0) {
        return { actual: 100, evidenceSource: defaultEvidence }
      }
      const done = itemsInPeriod.filter((i) => i.status === 'concluido').length
      const pct = Math.round((done / itemsInPeriod.length) * 100)
      return { actual: pct, evidenceSource: defaultEvidence }
    }

    case 'exceptions_generated': {
      const count = managedExceptions.filter((e) => {
        if (e.responsibleFunctionId !== funcId) return false
        const detected = e.firstDetectedAt ? e.firstDetectedAt.slice(0, 10) : ''
        return detected >= start && detected <= end
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'exceptions_resolved': {
      const count = managedExceptions.filter((e) => {
        if (e.responsibleFunctionId !== funcId) return false
        if (e.status !== 'resolvida') return false
        const resolved = e.resolvedAt ? e.resolvedAt.slice(0, 10) : ''
        return resolved >= start && resolved <= end
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'followups_executed': {
      const count = leadContacts.filter((c) => {
        if (c.functionId && c.functionId !== funcId) return false
        const date = c.contactDate ? c.contactDate.slice(0, 10) : ''
        return date >= start && date <= end
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'followups_overdue': {
      const count = leads.filter((l) => {
        if (l.commercialFunctionId && l.commercialFunctionId !== funcId) return false
        if (l.stage === 'fechado' || l.stage === 'perdido') return false
        const contactDate = l.nextContactAt || l.followUpDate
        if (!contactDate) return false
        return contactDate >= start && contactDate <= end && contactDate < todayIso
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'management_actions_completed': {
      const count = managementActions.filter((a) => {
        if (a.responsibleFunctionId !== funcId) return false
        if (a.status !== 'concluida') return false
        const doneDate = a.completedAt ? a.completedAt.slice(0, 10) : a.updatedAt.slice(0, 10)
        return doneDate >= start && doneDate <= end
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    case 'management_actions_overdue': {
      const count = managementActions.filter((a) => {
        if (a.responsibleFunctionId !== funcId) return false
        if (a.status !== 'pendente' && a.status !== 'em_andamento') return false
        if (!a.dueDate) return false
        return a.dueDate >= start && a.dueDate <= end && a.dueDate < todayIso
      }).length
      return { actual: count, evidenceSource: defaultEvidence }
    }

    default:
      return { actual: 0, evidenceSource: defaultEvidence }
  }
}

/**
 * Converte DbGoal + cálculos para o formato rico da interface de Gestão (UI)
 */
export function enrichGoalForUi(
  dbGoal: DbGoal,
  calcResult: GoalCalculationResult | null | undefined,
  context: {
    roles: Role[]
    collaborators: Collaborator[]
    activeAssignments?: Array<{ function_id: string; person_id: string }>
    // Datasets para fallback client-side se calcResult for nulo
    fallbackDatasets?: {
      agendaItems?: AgendaItem[]
      leads?: Lead[]
      leadContacts?: any[]
      managedExceptions?: any[]
      managementActions?: any[]
    }
  },
): Goal {
  const role = context.roles.find((r) => r.id === dbGoal.responsible_function_id)
  const isDentistas = (role?.name || '').toLowerCase().includes('dentista')

  let actual: number | null = null
  let evidenceSource: string = ''

  if (calcResult && typeof calcResult.actual === 'number') {
    actual = calcResult.actual
    evidenceSource = calcResult.evidence_source || ''
  } else if (context.fallbackDatasets) {
    const fallback = deriveGoalMetricClientSide(dbGoal, context.fallbackDatasets)
    actual = fallback.actual
    evidenceSource = fallback.evidenceSource
  }

  const metricConfig = SUPPORTED_METRICS.find((m) => m.key === dbGoal.metric)
  const isPercentage = metricConfig?.isPercentage ?? false
  const lowerIsBetter = metricConfig?.lowerIsBetter ?? false

  let adherencePct: number | null = null
  let statusBadge: 'within' | 'below' | 'no_data' = 'no_data'

  if (actual !== null && dbGoal.target > 0) {
    if (isPercentage) {
      adherencePct = Math.min(100, Math.round((actual / dbGoal.target) * 100))
      statusBadge = actual >= dbGoal.target ? 'within' : 'below'
    } else if (lowerIsBetter) {
      // Para métricas como "atrasos" ou "exceções": ter MENOS ou IGUAL à meta de tolerância é bom
      statusBadge = actual <= dbGoal.target ? 'within' : 'below'
      adherencePct =
        actual <= dbGoal.target ? 100 : Math.max(0, Math.round((dbGoal.target / actual) * 100))
    } else {
      // Para métricas normais (tarefas concluídas, follow-ups realizados)
      adherencePct = Math.round((actual / dbGoal.target) * 100)
      statusBadge = actual >= dbGoal.target ? 'within' : 'below'
    }
  } else if (actual !== null && dbGoal.target === 0) {
    // Meta zero (ex.: 0 tarefas em atraso toleradas)
    if (lowerIsBetter) {
      statusBadge = actual === 0 ? 'within' : 'below'
      adherencePct = actual === 0 ? 100 : 0
    }
  }

  // Contagem de profissionais da função (especialmente útil para agregação dos Dentistas)
  const memberCount = context.activeAssignments
    ? context.activeAssignments.filter((fa) => fa.function_id === dbGoal.responsible_function_id)
        .length
    : 0

  const creator = context.collaborators.find((c) => c.id === dbGoal.created_by)

  return {
    id: dbGoal.id,
    organizationId: dbGoal.organization_id,
    responsibleFunctionId: dbGoal.responsible_function_id,
    responsibleFunctionName: role?.name || 'Função Operacional',
    responsibleFunctionColor: role?.color || '#0F766E',
    metric: dbGoal.metric as GoalMetricKey,
    metricLabel: dbGoal.metric_label || metricConfig?.label || dbGoal.metric,
    target: Number(dbGoal.target),
    periodType: dbGoal.period_type as GoalPeriodType,
    periodStart: dbGoal.period_start,
    periodEnd: dbGoal.period_end,
    status: dbGoal.status as GoalStatus,
    createdBy: dbGoal.created_by,
    createdByName: creator?.name || null,
    createdAt: dbGoal.created_at,
    updatedAt: dbGoal.updated_at,
    actual,
    adherencePct,
    evidenceSource:
      evidenceSource ||
      metricConfig?.evidenceSource ||
      'Evidência operacional automática do sistema.',
    statusBadge,
    isMultiMember: isDentistas,
    activeMembersCount: memberCount,
  }
}

// -------------------------------------------------------------------------
// EXCEPTION ENGINE INTEGRATION HOOK POINT (STAGE 4F PRINCIPLE 5)
// -------------------------------------------------------------------------
/**
 * STABLE HOOK POINT FOR EXCEPTION ENGINE:
 *
 * Conforme o Princípio 5 do produto SKIP:
 * "Métricas abaixo da meta NÃO geram exceções automaticamente para não poluir
 * a Gestão Clínica com ruído desnecessário."
 *
 * Este ponto de extensão pode ser consumido futuramente por rotinas de auditoria
 * ou regras configuráveis no `org_threshold_configs` (ex: desvio persistente > 3 períodos).
 *
 * @param goal Meta avaliada
 * @returns boolean indicando se a regra preenche os requisitos para escalonamento
 */
export function checkGoalDeviationEscalationHook(goal: Goal): {
  shouldEscalate: boolean
  suggestedSeverity: 'baixa' | 'media' | 'alta'
  reason: string | null
} {
  // Por padrão de projeto, NUNCA escalona automaticamente sem regra explícita do OWNER.
  if (goal.status !== 'active') {
    return { shouldEscalate: false, suggestedSeverity: 'baixa', reason: null }
  }

  if (goal.statusBadge === 'below') {
    return {
      shouldEscalate: false, // Invariante: NÃO auto-cria exceção no momento
      suggestedSeverity: 'media',
      reason: `Meta "${goal.metricLabel}" da função ${goal.responsibleFunctionName} está abaixo do planejado (${goal.actual}/${goal.target}).`,
    }
  }

  return { shouldEscalate: false, suggestedSeverity: 'baixa', reason: null }
}
