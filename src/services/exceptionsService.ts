import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import type {
  OrgThresholdConfig,
  ManagedException,
  DerivedPendingItem,
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
} from '@/types'

export interface DbThresholdConfig {
  id: string
  organization_id: string
  key: string
  value: number
  unit: string
  description: string
  created_at: string
  updated_at: string
}

export interface DbManagedException {
  id: string
  organization_id: string
  type: ExceptionType
  severity: ExceptionSeverity
  title: string
  description: string
  entity_type: string
  entity_id: string | null
  responsible_function_id: string
  responsible_person_id: string | null
  status: ExceptionStatus
  recurrence_count: number
  first_detected_at: string
  last_detected_at: string
  acknowledged_at: string | null
  acknowledged_by_person_id: string | null
  decision_text: string | null
  decision_by_person_id: string | null
  decision_at: string | null
  resolved_at: string | null
  dedup_key: string
  created_at: string
  updated_at: string
}

export interface UpsertManagedExceptionPayload {
  type: ExceptionType
  severity: ExceptionSeverity
  title: string
  description: string
  entity_type: string
  entity_id?: string | null
  responsible_function_id: string
  responsible_person_id?: string | null
  dedup_key: string
}

// -----------------------------------------------------------------------------
// 1. LIMIARES CONFIGURÁVEIS (D7_ESCALATION_THRESHOLDS)
// -----------------------------------------------------------------------------

export const DEFAULT_THRESHOLDS: Record<
  string,
  { value: number; unit: string; description: string }
> = {
  task_delay_tolerance_days: {
    value: 1,
    unit: 'dias',
    description: 'Dias de atraso tolerados antes de elevar tarefa a exceção de gestão',
  },
  lead_followup_tolerance_days: {
    value: 2,
    unit: 'dias',
    description: 'Dias após prazo do próximo contato de lead antes de elevar a exceção',
  },
  repeated_failure_count: {
    value: 3,
    unit: 'ocorrências',
    description:
      'Número de pendências não resolvidas de uma mesma função que dispara alerta de reincidência',
  },
  exception_escalation_sla_hours: {
    value: 24,
    unit: 'horas',
    description: 'Tempo limite para o gestor reconhecer ou decidir sobre uma exceção aberta',
  },
  near_expiration_window_days: {
    value: 1,
    unit: 'dias',
    description: 'Janela de dias para alertar sobre tarefas ou prazos iminentes',
  },
  critical_stock_threshold: {
    value: 5,
    unit: 'unidades',
    description: 'Quantidade mínima de itens críticos antes de gerar exceção operacional',
  },
  post_sale_delay_tolerance_days: {
    value: 3,
    unit: 'dias',
    description:
      'Dias de tolerância após vencimento de T+30 antes de alertar gestão por atraso no pós-venda',
  },
}

export async function fetchThresholdConfigs(): Promise<OrgThresholdConfig[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await (supabase as any)
    .from('org_threshold_configs')
    .select('*')
    .eq('organization_id', orgId)
    .order('key', { ascending: true })

  if (error) {
    console.error('Erro ao buscar limiares configuráveis:', error)
    throw error
  }

  return (data || []).map((t: DbThresholdConfig) => ({
    id: t.id,
    organizationId: t.organization_id,
    key: t.key,
    value: Number(t.value),
    unit: t.unit,
    description: t.description,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }))
}

export async function updateThresholdConfig(
  key: string,
  value: number,
): Promise<OrgThresholdConfig> {
  const orgId = await getOrganizationId()

  const { data, error } = await (supabase as any)
    .from('org_threshold_configs')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('key', key)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar limiar configurável:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    key: data.key,
    value: Number(data.value),
    unit: data.unit,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// -----------------------------------------------------------------------------
// 2. EXCEÇÕES DE GESTÃO PERSISTIDAS (managed_exceptions)
// -----------------------------------------------------------------------------

export async function fetchManagedExceptions(filters?: {
  status?: ExceptionStatus
  severity?: ExceptionSeverity
  responsibleFunctionId?: string
}): Promise<ManagedException[]> {
  const orgId = await getOrganizationId()

  let query = (supabase as any)
    .from('managed_exceptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('last_detected_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters?.responsibleFunctionId) {
    query = query.eq('responsible_function_id', filters.responsibleFunctionId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar exceções gerenciadas:', error)
    throw error
  }

  return (data || []).map((e: DbManagedException) => mapDbExceptionToUi(e))
}

export async function upsertManagedException(
  payload: UpsertManagedExceptionPayload,
): Promise<{ success: boolean; id: string; recurrence_count: number; status: string }> {
  const { data, error } = await (supabase as any).rpc('upsert_managed_exception', {
    p_type: payload.type,
    p_severity: payload.severity,
    p_title: payload.title.trim(),
    p_description: payload.description ? payload.description.trim() : '',
    p_entity_type: payload.entity_type,
    p_entity_id: payload.entity_id || null,
    p_responsible_function_id: payload.responsible_function_id,
    p_responsible_person_id: payload.responsible_person_id || null,
    p_dedup_key: payload.dedup_key,
  })

  if (error) {
    console.error('Erro ao realizar upsert de exceção:', error)
    throw error
  }

  return data
}

export async function acknowledgeException(id: string): Promise<ManagedException> {
  const { data: personData } = await (supabase as any).rpc('current_person_id')

  const { data, error } = await (supabase as any)
    .from('managed_exceptions')
    .update({
      status: 'reconhecida',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by_person_id: personData || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao reconhecer exceção:', error)
    throw error
  }

  return mapDbExceptionToUi(data)
}

export async function recordExceptionDecision(
  id: string,
  decisionText: string,
  resolveDirectly = false,
): Promise<ManagedException> {
  const { data: personData } = await (supabase as any).rpc('current_person_id')
  const nowIso = new Date().toISOString()

  const payload: any = {
    status: resolveDirectly ? 'resolvida' : 'decidida',
    decision_text: decisionText.trim(),
    decision_by_person_id: personData || null,
    decision_at: nowIso,
    updated_at: nowIso,
  }

  if (resolveDirectly) {
    payload.resolved_at = nowIso
  }

  const { data, error } = await (supabase as any)
    .from('managed_exceptions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao registrar decisão de exceção:', error)
    throw error
  }

  return mapDbExceptionToUi(data)
}

export async function resolveException(id: string): Promise<ManagedException> {
  const nowIso = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('managed_exceptions')
    .update({
      status: 'resolvida',
      resolved_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao resolver exceção:', error)
    throw error
  }

  return mapDbExceptionToUi(data)
}

// -----------------------------------------------------------------------------
// 3. DETECÇÃO DE EXCEÇÕES E PENDÊNCIAS DERIVADAS (D3_PENDING_ITEM: DERIVED)
// -----------------------------------------------------------------------------

export interface OperationalDatasets {
  agendaItems: any[]
  leads: any[]
  tasks: any[]
  roles: any[]
  collaborators: any[]
  activeAssignments: any[]
  postSales?: any[]
}

/**
 * Deriva pendências do dia comparando Esperado vs Realizado (D3_PENDING_ITEM: DERIVED).
 * NÃO persiste em tabela redundante de relatórios.
 */
export function derivePendingItems(
  datasets: OperationalDatasets,
  thresholds: Record<string, number>,
  todayIso: string = new Date().toISOString().slice(0, 10),
): DerivedPendingItem[] {
  const { agendaItems, leads, tasks, roles, collaborators } = datasets
  const rolesMap = new Map<string, string>(roles.map((r: any) => [r.id, r.name]))
  const peopleMap = new Map<string, string>(collaborators.map((c: any) => [c.id, c.name]))

  const taskDelayTolerance = thresholds.task_delay_tolerance_days ?? 1
  const leadFollowupTolerance = thresholds.lead_followup_tolerance_days ?? 2

  const derived: DerivedPendingItem[] = []

  // 1. Itens da Agenda (tarefas, rotinas de cadência, ocorrências em aberto cuja due_date <= hoje)
  for (const item of agendaItems) {
    if (item.status === 'aberto' && item.dueDate <= todayIso) {
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (new Date(todayIso + 'T00:00:00').getTime() -
            new Date(item.dueDate + 'T00:00:00').getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )

      // Se venceu hoje ou está atrasado
      const isPastDue = item.dueDate < todayIso
      const exceedsTolerance = daysOverdue >= taskDelayTolerance

      let severity: ExceptionSeverity = 'baixa'
      if (exceedsTolerance && daysOverdue >= 3) {
        severity = 'critica'
      } else if (exceedsTolerance) {
        severity = 'alta'
      } else if (isPastDue) {
        severity = 'media'
      }

      const roleName = item.functionId
        ? rolesMap.get(item.functionId) || 'Função Operacional'
        : 'Geral'
      const personName = item.personId ? peopleMap.get(item.personId) || null : null

      derived.push({
        id: `pending-agenda-${item.id}`,
        category: item.type === 'tarefa' ? 'tarefa' : 'agenda',
        title: item.title,
        expectedDate: item.dueDate,
        actualState: 'Não concluído',
        reason: isPastDue
          ? `Rotina/Tarefa atrasada há ${daysOverdue} dia(s) (tolerância: ${taskDelayTolerance}d)`
          : 'Rotina de cadência prevista para hoje e ainda pendente',
        responsibleFunctionId: item.functionId || 'none',
        responsibleFunctionName: roleName,
        responsiblePersonId: item.personId,
        responsiblePersonName: personName,
        managementDecisionRequired: exceedsTolerance,
        severity,
        sourceType: 'agenda_item',
        sourceId: item.id,
        daysOverdue,
      })
    }
  }

  // 1b. Falhas recorrentes ou quebra de cadência por função
  const overdueByFunc = new Map<string, number>()
  for (const item of agendaItems) {
    if (item.status === 'aberto' && item.dueDate < todayIso && item.functionId) {
      overdueByFunc.set(item.functionId, (overdueByFunc.get(item.functionId) || 0) + 1)
    }
  }
  const repeatedTolerance = thresholds.repeated_failure_count ?? 3
  for (const [fId, count] of overdueByFunc.entries()) {
    if (count >= repeatedTolerance) {
      const fName = rolesMap.get(fId) || 'Função Operacional'
      derived.push({
        id: `pending-cadence-failure-${fId}`,
        category: 'tarefa',
        title: `Quebra de cadência operacional: ${count} rotinas atrasadas acumuladas`,
        expectedDate: todayIso,
        actualState: 'Aderência abaixo da tolerância de cadência',
        reason: `A função acumulou ${count} rotinas/tarefas atrasadas (limiar crítico: ${repeatedTolerance})`,
        responsibleFunctionId: fId,
        responsibleFunctionName: fName,
        responsiblePersonId: null,
        responsiblePersonName: null,
        managementDecisionRequired: true,
        severity: count >= repeatedTolerance * 2 ? 'critica' : 'alta',
        sourceType: 'function',
        sourceId: fId,
        daysOverdue: 1,
      })
    }
  }

  // 2. Leads com follow-up vencido além da tolerância
  for (const lead of leads) {
    // Ignora leads já fechados ou perdidos
    if (lead.stage === 'fechado' || lead.stage === 'perdido') continue

    const followUpDate =
      lead.nextContactAt || (lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : null)
    if (followUpDate && followUpDate <= todayIso) {
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (new Date(todayIso + 'T00:00:00').getTime() -
            new Date(followUpDate + 'T00:00:00').getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )

      const exceedsTolerance = daysOverdue >= leadFollowupTolerance

      let severity: ExceptionSeverity = 'media'
      if (daysOverdue >= 5) severity = 'critica'
      else if (exceedsTolerance) severity = 'alta'

      const roleId = lead.commercialFunctionId || 'none'
      const roleName = lead.commercialFunctionId
        ? rolesMap.get(lead.commercialFunctionId) || 'CRC Comercial'
        : 'CRC Comercial'
      const personName = lead.commercialPersonId
        ? peopleMap.get(lead.commercialPersonId) || null
        : null

      derived.push({
        id: `pending-lead-${lead.id}`,
        category: 'lead',
        title: `Follow-up com ${lead.name} (${lead.interest || 'Sem interesse especificado'})`,
        expectedDate: followUpDate,
        actualState: 'Sem contato registrado na data',
        reason:
          daysOverdue > 0
            ? `Follow-up vencido há ${daysOverdue} dia(s) (tolerância: ${leadFollowupTolerance}d)`
            : 'Follow-up agendado para o dia de hoje',
        responsibleFunctionId: roleId,
        responsibleFunctionName: roleName,
        responsiblePersonId: lead.commercialPersonId,
        responsiblePersonName: personName,
        managementDecisionRequired: exceedsTolerance,
        severity,
        sourceType: 'lead',
        sourceId: lead.id,
        daysOverdue,
      })
    }
  }

  // 3. Pós-Venda (Stage 4G): Pós-venda atrasado além da tolerância E insatisfações abertas
  const postSales = datasets.postSales || []
  const postSaleDelayTolerance = thresholds.post_sale_delay_tolerance_days ?? 3

  for (const ps of postSales) {
    // 3a. Insatisfação do Paciente ABERTA (não resolvida)
    if (ps.outcome === 'insatisfeito' && ps.dissatisfactionStatus !== 'resolvido') {
      const crcFuncId =
        ps.responsibleFunctionId || roles.find((r: any) => r.name === 'CRC Comercial')?.id || 'none'
      const crcFuncName = rolesMap.get(crcFuncId) || 'CRC Comercial'

      derived.push({
        id: `pending-postsale-dissatisfaction-${ps.id}`,
        category: 'gestao',
        title: `Insatisfação pós-venda: ${ps.patientName || 'Paciente'} (${ps.treatmentName || 'Tratamento'})`,
        expectedDate: ps.dueDate,
        actualState: 'Insatisfação registrada aguardando resolução',
        reason: ps.dissatisfactionReason
          ? `Paciente relatou: "${ps.dissatisfactionReason}". Exige alinhamento com a gestão.`
          : 'Paciente relatou insatisfação no contato de 30 dias. Exige intervenção.',
        responsibleFunctionId: crcFuncId,
        responsibleFunctionName: crcFuncName,
        responsiblePersonId: ps.contactedByPersonId || null,
        responsiblePersonName: ps.contactedByPersonName || null,
        managementDecisionRequired: true,
        severity: 'alta',
        sourceType: 'post_sale',
        sourceId: ps.id,
        daysOverdue: 0,
      })
    }

    // 3b. Pós-venda T+30 atrasado além da tolerância
    if (
      (ps.status === 'previsto' || ps.status === 'reagendado' || ps.status === 'sem_resposta') &&
      ps.dueDate < todayIso
    ) {
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (new Date(todayIso + 'T00:00:00').getTime() -
            new Date(ps.dueDate + 'T00:00:00').getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )

      const exceedsTolerance = daysOverdue >= postSaleDelayTolerance
      if (exceedsTolerance) {
        const crcFuncId =
          ps.responsibleFunctionId ||
          roles.find((r: any) => r.name === 'CRC Comercial')?.id ||
          'none'
        const crcFuncName = rolesMap.get(crcFuncId) || 'CRC Comercial'

        derived.push({
          id: `pending-postsale-overdue-${ps.id}`,
          category: 'gestao',
          title: `Pós-venda T+30 atrasado: ${ps.patientName || 'Paciente'} (${ps.treatmentName || 'Tratamento'})`,
          expectedDate: ps.dueDate,
          actualState: 'Contato T+30 não realizado',
          reason: `Contato de satisfação pós-término atrasado há ${daysOverdue} dia(s) (tolerância: ${postSaleDelayTolerance}d).`,
          responsibleFunctionId: crcFuncId,
          responsibleFunctionName: crcFuncName,
          responsiblePersonId: null,
          responsiblePersonName: null,
          managementDecisionRequired: true,
          severity: daysOverdue >= 7 ? 'critica' : 'alta',
          sourceType: 'post_sale',
          sourceId: ps.id,
          daysOverdue,
        })
      }
    }
  }

  // Ordena por severidade (crítica -> alta -> media -> baixa) e dias de atraso desc
  const severityRank: Record<ExceptionSeverity, number> = {
    critica: 4,
    alta: 3,
    media: 2,
    baixa: 1,
  }

  return derived.sort((a, b) => {
    const diffSev = severityRank[b.severity] - severityRank[a.severity]
    if (diffSev !== 0) return diffSev
    return b.daysOverdue - a.daysOverdue
  })
}

/**
 * Escala pendências que ultrapassaram tolerância para a tabela de exceções gerenciadas
 * de forma idempotente e incrementando a recorrência caso persista (Deduplicação Inteligente).
 */
export async function syncDerivedExceptionsToDatabase(
  pendingItems: DerivedPendingItem[],
  existingExceptions: ManagedException[],
): Promise<{ addedOrUpdatedCount: number }> {
  // Apenas itens que requerem decisão do gestor são escalados para managed_exceptions
  const escalationCandidates = pendingItems.filter((p) => p.managementDecisionRequired)

  let count = 0
  for (const item of escalationCandidates) {
    if (!item.responsibleFunctionId || item.responsibleFunctionId === 'none') {
      continue
    }

    const dedupKey = `${item.sourceType}:${item.sourceId}`
    const existing = existingExceptions.find((e) => e.dedupKey === dedupKey)

    // Se já estiver resolvida hoje, não reabre a não ser que tenha passado mais de um dia
    let exceptionType: ExceptionType = 'outro_desvio'
    if (item.category === 'tarefa') exceptionType = 'tarefa_atrasada'
    else if (item.category === 'agenda') exceptionType = 'ocorrencia_perdida'
    else if (item.category === 'lead') exceptionType = 'lead_sem_followup'

    await upsertManagedException({
      type: exceptionType,
      severity: item.severity,
      title: item.title,
      description: item.reason,
      entity_type: item.sourceType,
      entity_id: item.sourceId,
      responsible_function_id: item.responsibleFunctionId,
      responsible_person_id: item.responsiblePersonId || null,
      dedup_key: dedupKey,
    })
    count++
  }

  return { addedOrUpdatedCount: count }
}

// -----------------------------------------------------------------------------
// 4. MAPPER HELPERS (DB -> UI)
// -----------------------------------------------------------------------------

export function mapDbExceptionToUi(
  db: DbManagedException,
  peopleMap?: Map<string, string>,
  functionsMap?: Map<string, string>,
): ManagedException {
  return {
    id: db.id,
    organizationId: db.organization_id,
    type: db.type,
    severity: db.severity,
    title: db.title,
    description: db.description,
    entityType: db.entity_type,
    entityId: db.entity_id,
    responsibleFunctionId: db.responsible_function_id,
    responsibleFunctionName: functionsMap?.get(db.responsible_function_id) || null,
    responsiblePersonId: db.responsible_person_id,
    responsiblePersonName: db.responsible_person_id
      ? peopleMap?.get(db.responsible_person_id) || null
      : null,
    status: db.status,
    recurrenceCount: db.recurrence_count,
    firstDetectedAt: db.first_detected_at,
    lastDetectedAt: db.last_detected_at,
    acknowledgedAt: db.acknowledged_at,
    acknowledgedByPersonId: db.acknowledged_by_person_id,
    acknowledgedByName: db.acknowledged_by_person_id
      ? peopleMap?.get(db.acknowledged_by_person_id) || null
      : null,
    decisionText: db.decision_text,
    decisionByPersonId: db.decision_by_person_id,
    decisionByName: db.decision_by_person_id
      ? peopleMap?.get(db.decision_by_person_id) || null
      : null,
    decisionAt: db.decision_at,
    resolvedAt: db.resolved_at,
    dedupKey: db.dedup_key,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
