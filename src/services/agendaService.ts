import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'
import { DbTask, DbRecurrenceType } from './tasksService'

export type AgendaItemType = 'tarefa' | 'compromisso' | 'follow_up' | 'pendencia'
export type AgendaItemStatus = 'aberto' | 'concluido' | 'cancelado'

export interface DbAgendaItem {
  id: string
  organization_id: string
  type: AgendaItemType
  title: string
  due_date: string // YYYY-MM-DD
  due_time: string | null
  status: AgendaItemStatus
  function_id: string | null
  person_id: string | null
  source_type: string | null
  source_id: string | null
  notes: string | null
  feedback: string | null
  transferred: boolean
  completed_at: string | null
  created_at: string
}

export interface CreateManualAgendaItemPayload {
  type: AgendaItemType // 'tarefa' | 'compromisso' | 'follow_up' | 'pendencia'
  title: string
  due_date: string
  due_time?: string | null
  function_id?: string | null
  person_id?: string | null
  source_type?: string | null
  source_id?: string | null
  notes?: string | null
}

/**
 * Cria ou sincroniza um item de follow-up na agenda unificada para um Lead.
 * - type = 'follow_up'
 * - source_type = 'lead'
 * - source_id = lead.id
 * - due_date = next_contact_at
 * - title = "Follow-up: {lead.name} — {next_action}"
 * - function_id / person_id = snapshot da responsabilidade comercial
 */
export async function syncLeadFollowUpAgendaItem(params: {
  leadId: string
  leadName: string
  nextContactAt: string // YYYY-MM-DD
  nextAction?: string | null
  commercialFunctionId?: string | null
  commercialPersonId?: string | null
}): Promise<DbAgendaItem> {
  const orgId = await getOrganizationId()

  const title = `Follow-up: ${params.leadName}${params.nextAction ? ` — ${params.nextAction}` : ''}`

  // Verificar se já existe um item de follow-up aberto para este lead
  const { data: existing } = await supabase
    .from('agenda_items')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('source_type', 'lead')
    .eq('source_id', params.leadId)
    .eq('type', 'follow_up')
    .eq('status', 'aberto')
    .maybeSingle()

  if (existing?.id) {
    // Atualiza o item aberto existente com nova data, ação e responsável
    const { data: updated, error } = await supabase
      .from('agenda_items')
      .update({
        title,
        due_date: params.nextContactAt,
        function_id: params.commercialFunctionId ?? null,
        person_id: params.commercialPersonId ?? null,
        notes: params.nextAction ?? null,
      })
      .eq('id', existing.id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar follow-up na agenda:', error)
      throw new Error(`Falha ao sincronizar follow-up na agenda: ${error.message}`)
    }
    return updated as DbAgendaItem
  }

  // Cria novo item de follow_up na agenda
  const { data: created, error } = await supabase
    .from('agenda_items')
    .insert({
      organization_id: orgId,
      type: 'follow_up',
      title,
      due_date: params.nextContactAt,
      status: 'aberto',
      function_id: params.commercialFunctionId ?? null,
      person_id: params.commercialPersonId ?? null,
      source_type: 'lead',
      source_id: params.leadId,
      notes: params.nextAction ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar follow-up na agenda:', error)
    throw new Error(`Falha ao criar follow-up na agenda: ${error.message}`)
  }

  return created as DbAgendaItem
}

export interface AgendaDateRangeFilter {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  functionId?: string
  personId?: string
  status?: AgendaItemStatus
}

// -------------------------------------------------------------------------
// Utilitários de Data & Recorrência
// -------------------------------------------------------------------------

/**
 * Converte data para string YYYY-MM-DD no horário local do calendário
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Cria Date a partir de string YYYY-MM-DD no horário local (evita shift UTC)
 */
export function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Retorna o último dia do mês para um determinado ano e mês (1..12)
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Dia da semana ISO: 1 = segunda-feira ... 7 = domingo
 */
export function getISODayOfWeek(date: Date): number {
  const day = date.getDay() // 0 = dom, 1 = seg ... 6 = sab
  return day === 0 ? 7 : day
}

/**
 * Calcula todas as datas esperadas de uma task dentro de uma janela [windowStart, windowEnd].
 * Regras:
 * - Nunca antes de DATE(task.created_at)
 * - pontual / data_especifica: uma ocorrência em task.due_date (se dentro da janela e >= created_at)
 * - diaria: todo dia calendário no intervalo
 * - semanal: recurrence_day = 1..7 (segunda..domingo ISO)
 * - mensal: recurrence_day = 1..31; se dia não existe no mês, usa último dia do mês
 */
export function computeExpectedTaskDates(
  task: DbTask,
  windowStartDate: string,
  windowEndDate: string,
): string[] {
  if (!task.active) return []

  const createdDateStr = task.created_at.slice(0, 10)
  // Data inicial de corte: o maior entre windowStartDate e createdDateStr
  const effectiveStartStr = windowStartDate < createdDateStr ? createdDateStr : windowStartDate

  if (effectiveStartStr > windowEndDate) return []

  const recurrence = task.recurrence

  // 1. Pontual ou Data Específica
  if (recurrence === 'pontual' || recurrence === 'data_especifica') {
    const targetDate = task.due_date
    if (!targetDate) return []
    if (targetDate >= effectiveStartStr && targetDate <= windowEndDate) {
      return [targetDate]
    }
    return []
  }

  // 2. Diária, Semanal, Mensal
  const results: string[] = []
  const current = parseDateLocal(effectiveStartStr)
  const end = parseDateLocal(windowEndDate)

  if (recurrence === 'diaria') {
    while (current <= end) {
      results.push(formatDateISO(current))
      current.setDate(current.getDate() + 1)
    }
    return results
  }

  if (recurrence === 'semanal') {
    const targetDayOfWeek = task.recurrence_day ?? 1 // default segunda
    while (current <= end) {
      if (getISODayOfWeek(current) === targetDayOfWeek) {
        results.push(formatDateISO(current))
      }
      current.setDate(current.getDate() + 1)
    }
    return results
  }

  if (recurrence === 'mensal') {
    const targetDay = task.recurrence_day ?? 1
    // Itera pelos meses abrangidos pela janela
    const startYear = current.getFullYear()
    const startMonth = current.getMonth() + 1
    const endYear = end.getFullYear()
    const endMonth = end.getMonth() + 1

    let y = startYear
    let m = startMonth

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const lastDay = getLastDayOfMonth(y, m)
      const actualDay = Math.min(targetDay, lastDay)
      const occurrenceStr = `${y}-${String(m).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`

      if (occurrenceStr >= effectiveStartStr && occurrenceStr <= windowEndDate) {
        results.push(occurrenceStr)
      }

      m++
      if (m > 12) {
        m = 1
        y++
      }
    }
    return results
  }

  return results
}

// -------------------------------------------------------------------------
// Resolução de Responsabilidade
// -------------------------------------------------------------------------

export interface ResolutionContext {
  areasMap: Map<string, { id: string; function_id: string }>
  activeAssignmentsByFunc: Map<string, string> // function_id -> person_id
}

/**
 * Carrega contexto de resolução em cache para batch execution
 */
export async function loadResolutionContext(): Promise<ResolutionContext> {
  const orgId = await getOrganizationId()

  const [areasRes, faRes] = await Promise.all([
    supabase.from('areas').select('id, function_id').eq('organization_id', orgId),
    supabase
      .from('function_assignments')
      .select('function_id, person_id')
      .eq('organization_id', orgId)
      .is('end_date', null)
      .eq('active', true),
  ])

  const areasMap = new Map<string, { id: string; function_id: string }>()
  for (const a of areasRes.data || []) {
    areasMap.set(a.id, a)
  }

  const activeAssignmentsByFunc = new Map<string, string>()
  for (const fa of faRes.data || []) {
    activeAssignmentsByFunc.set(fa.function_id, fa.person_id)
  }

  return { areasMap, activeAssignmentsByFunc }
}

/**
 * Regra 2: Resolução de Responsabilidade
 * Para cada task:
 * - IF area_id IS NOT NULL -> resolved_function_id = areas.function_id; ELSE -> tasks.function_id
 * - IF default_person_id IS NOT NULL -> resolved_person_id = default_person_id;
 *   ELSE -> ocupante atual da função resolvida (function_assignments WHERE function_id = resolved_function_id AND end_date IS NULL AND active = true)
 */
export function resolveTaskResponsibility(
  task: DbTask,
  context: ResolutionContext,
): { functionId: string | null; personId: string | null } {
  let resolvedFunctionId: string | null = null

  if (task.area_id) {
    const area = context.areasMap.get(task.area_id)
    resolvedFunctionId = area ? area.function_id : task.function_id
  } else {
    resolvedFunctionId = task.function_id
  }

  let resolvedPersonId: string | null = null
  if (task.default_person_id) {
    resolvedPersonId = task.default_person_id
  } else if (resolvedFunctionId) {
    resolvedPersonId = context.activeAssignmentsByFunc.get(resolvedFunctionId) || null
  }

  return {
    functionId: resolvedFunctionId,
    personId: resolvedPersonId,
  }
}

// -------------------------------------------------------------------------
// Gerador de Ocorrências (Lazy Determinístico)
// -------------------------------------------------------------------------

/**
 * Garante que todas as ocorrências de tasks ativas existam na janela especificada.
 * Idempotente via INSERT ... ON CONFLICT DO NOTHING (constraint uq_agenda_task_occurrence).
 */
export async function ensureTaskOccurrences(
  windowStartDate: string,
  windowEndDate: string,
): Promise<number> {
  const orgId = await getOrganizationId()

  // 1. Buscar todas as tasks ativas
  const { data: activeTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)

  if (tasksError) {
    console.error('Erro ao buscar tasks para geração de ocorrências:', tasksError)
    throw new Error(`Falha ao carregar tarefas para agenda: ${tasksError.message}`)
  }

  if (!activeTasks || activeTasks.length === 0) {
    return 0
  }

  // 2. Carregar contexto para resolução de função/pessoa
  const resolutionContext = await loadResolutionContext()

  // 3. Montar todas as ocorrências esperadas no período
  const itemsToInsert: Array<{
    organization_id: string
    type: AgendaItemType
    title: string
    due_date: string
    status: AgendaItemStatus
    function_id: string | null
    person_id: string | null
    source_type: string
    source_id: string
  }> = []

  for (const task of activeTasks as DbTask[]) {
    const expectedDates = computeExpectedTaskDates(task, windowStartDate, windowEndDate)
    if (expectedDates.length === 0) continue

    const { functionId, personId } = resolveTaskResponsibility(task, resolutionContext)

    for (const d of expectedDates) {
      itemsToInsert.push({
        organization_id: orgId,
        type: 'tarefa',
        title: task.title,
        due_date: d,
        status: 'aberto',
        function_id: functionId,
        person_id: personId,
        source_type: 'task',
        source_id: task.id,
      })
    }
  }

  if (itemsToInsert.length === 0) {
    return 0
  }

  // 4. Inserir em lotes com ignoreDuplicates: true (ON CONFLICT DO NOTHING)
  // O Supabase JS client suporta upsert({ ... }, { onConflict: 'source_type,source_id,due_date', ignoreDuplicates: true })
  // Porém a constraint é parcial: uq_agenda_task_occurrence (source_type, source_id, due_date) WHERE source_type = 'task'
  // No PostgreSQL, se a constraint é partial index, o upsert sem o predicado exato pode falhar se especificado errado,
  // ou podemos usar select prévio dos que já existem na janela para ser 100% à prova de falhas e seguro.
  // Vamos buscar os agenda_items já existentes na janela para source_type='task' para garantir idempotência sem depender de sintaxe de parcial unique index.
  const { data: existing, error: existingError } = await supabase
    .from('agenda_items')
    .select('source_id, due_date')
    .eq('organization_id', orgId)
    .eq('source_type', 'task')
    .gte('due_date', windowStartDate)
    .lte('due_date', windowEndDate)

  if (existingError) {
    console.error('Erro ao verificar ocorrências existentes:', existingError)
    throw new Error(`Falha ao verificar ocorrências existentes: ${existingError.message}`)
  }

  const existingKeys = new Set((existing || []).map((e) => `${e.source_id}_${e.due_date}`))

  const genuinelyNew = itemsToInsert.filter(
    (i) => !existingKeys.has(`${i.source_id}_${i.due_date}`),
  )

  if (genuinelyNew.length === 0) {
    return 0
  }

  // Inserir os novos itens
  const { error: insertError } = await supabase.from('agenda_items').insert(genuinelyNew)

  if (insertError) {
    // Se colidiu em corrida com constraint uq_agenda_task_occurrence, ignoramos erro de duplicata
    if (insertError.code === '23505') {
      console.warn('Concorrência detectada na criação de ocorrências de agenda (23505 ignorado).')
      return 0
    }
    console.error('Erro ao inserir novas ocorrências na agenda:', insertError)
    throw new Error(`Falha ao registrar ocorrências na agenda: ${insertError.message}`)
  }

  return genuinelyNew.length
}

// -------------------------------------------------------------------------
// Queries de Agenda (Today, Week, Month, Overdue)
// -------------------------------------------------------------------------

export interface TodayAgendaData {
  overdue: DbAgendaItem[]
  todayOpen: DbAgendaItem[]
  todayCompleted: DbAgendaItem[]
}

/**
 * Busca itens da Agenda para a TODAY VIEW:
 * SEÇÃO 1: "ATRASADAS": status='aberto' AND due_date < CURRENT_DATE
 * SEÇÃO 2: "HOJE": status='aberto' AND due_date = CURRENT_DATE
 * SEÇÃO 3: "CONCLUÍDAS HOJE": status='concluido' AND due_date = CURRENT_DATE
 */
export async function fetchTodayAgenda(todayStr: string): Promise<TodayAgendaData> {
  const orgId = await getOrganizationId()

  // 1. Garantir que as ocorrências de hoje existam
  await ensureTaskOccurrences(todayStr, todayStr)

  // 2. Buscar atrasadas (status = 'aberto' AND due_date < todayStr)
  const { data: overdueData, error: overdueError } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'aberto')
    .lt('due_date', todayStr)
    .order('due_date', { ascending: true })

  if (overdueError) {
    console.error('Erro ao buscar itens atrasados da agenda:', overdueError)
    throw new Error(`Falha ao buscar agenda atrasada: ${overdueError.message}`)
  }

  // 3. Buscar itens de hoje (abertos e concluídos)
  const { data: todayData, error: todayError } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('organization_id', orgId)
    .eq('due_date', todayStr)
    .order('due_time', { ascending: true, nullsFirst: false })

  if (todayError) {
    console.error('Erro ao buscar itens de hoje da agenda:', todayError)
    throw new Error(`Falha ao buscar agenda de hoje: ${todayError.message}`)
  }

  const allToday = (todayData || []) as DbAgendaItem[]

  return {
    overdue: (overdueData || []) as DbAgendaItem[],
    todayOpen: allToday.filter((i) => i.status === 'aberto'),
    todayCompleted: allToday.filter((i) => i.status === 'concluido'),
  }
}

/**
 * Busca itens da Agenda para uma janela de datas (WEEK VIEW ou MONTH VIEW).
 * Garante ocorrências lazy na janela e traz também os atrasados se solicitado.
 */
export async function fetchAgendaWindow(
  startDate: string,
  endDate: string,
  includeOverdueBeforeWindow = true,
): Promise<{ items: DbAgendaItem[]; overdue: DbAgendaItem[] }> {
  const orgId = await getOrganizationId()

  // 1. Garantir ocorrências da janela
  await ensureTaskOccurrences(startDate, endDate)

  // 2. Buscar itens da janela
  const { data: itemsData, error: itemsError } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('organization_id', orgId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })

  if (itemsError) {
    console.error('Erro ao buscar itens do período da agenda:', itemsError)
    throw new Error(`Falha ao carregar agenda: ${itemsError.message}`)
  }

  let overdue: DbAgendaItem[] = []
  if (includeOverdueBeforeWindow) {
    const today = new Date().toISOString().split('T')[0]
    const { data: overdueData, error: overdueError } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'aberto')
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (overdueError) {
      console.error('Erro ao buscar itens atrasados:', overdueError)
      throw new Error(`Falha ao buscar atrasados: ${overdueError.message}`)
    }
    overdue = (overdueData || []) as DbAgendaItem[]
  }

  return {
    items: (itemsData || []) as DbAgendaItem[],
    overdue,
  }
}

// -------------------------------------------------------------------------
// Operações em Ocorrências da Agenda (Conclusão, Reabertura, Cancelamento, Criação Manual)
// -------------------------------------------------------------------------

/**
 * Cria item manual na agenda (source_type = null, source_id = null).
 * Tipos permitidos nesta stage: 'tarefa' | 'compromisso' | 'pendencia'
 */
export async function createManualAgendaItem(
  payload: CreateManualAgendaItemPayload,
): Promise<DbAgendaItem> {
  const orgId = await getOrganizationId()

  if (
    payload.type !== 'tarefa' &&
    payload.type !== 'compromisso' &&
    payload.type !== 'follow_up' &&
    payload.type !== 'pendencia'
  ) {
    throw new Error(`Tipo de item '${payload.type}' não permitido.`)
  }

  const { data, error } = await supabase
    .from('agenda_items')
    .insert({
      organization_id: orgId,
      type: payload.type,
      title: payload.title.trim(),
      due_date: payload.due_date,
      due_time: payload.due_time ?? null,
      status: 'aberto',
      function_id: payload.function_id ?? null,
      person_id: payload.person_id ?? null,
      source_type: payload.source_type ?? null,
      source_id: payload.source_id ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar item manual na agenda:', error)
    throw new Error(`Falha ao criar item na agenda: ${error.message}`)
  }

  return data as DbAgendaItem
}

/**
 * Conclui um item da agenda: status = 'concluido', completed_at = now().
 */
export async function completeAgendaItem(id: string): Promise<DbAgendaItem> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('agenda_items')
    .update({
      status: 'concluido',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error(`Erro ao concluir item ${id}:`, error)
    throw new Error(`Falha ao concluir item da agenda: ${error.message}`)
  }

  return data as DbAgendaItem
}

/**
 * Reabre um item da agenda: status = 'aberto', completed_at = null.
 */
export async function reopenAgendaItem(id: string): Promise<DbAgendaItem> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('agenda_items')
    .update({
      status: 'aberto',
      completed_at: null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error(`Erro ao reabrir item ${id}:`, error)
    throw new Error(`Falha ao reabrir item da agenda: ${error.message}`)
  }

  return data as DbAgendaItem
}

/**
 * Cancela um item da agenda: status = 'cancelado'. Nunca deleta físico.
 */
export async function cancelAgendaItem(id: string): Promise<DbAgendaItem> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('agenda_items')
    .update({
      status: 'cancelado',
    })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error(`Erro ao cancelar item ${id}:`, error)
    throw new Error(`Falha ao cancelar item da agenda: ${error.message}`)
  }

  return data as DbAgendaItem
}
