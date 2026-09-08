import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'
import { fetchTasks, type DbTask } from './tasksService'
import { fetchActiveAssignments } from './functionAssignmentsService'
import type { FunctionCadenceLog, FunctionCadenceSummary, Task } from '@/types'

export interface DbCadenceLog {
  id: string
  organization_id: string
  function_id: string
  person_id: string | null
  date: string
  expected_count: number
  completed_count: number
  adherence_pct: number
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Registra ou atualiza snapshot diário de cadência por função (idempotente).
 */
export async function recordCadenceDailyLog(params: {
  functionId: string
  personId?: string | null
  date?: string
  expectedCount: number
  completedCount: number
  notes?: string
}): Promise<FunctionCadenceLog> {
  const orgId = await getOrganizationId()
  const targetDate = params.date || new Date().toISOString().slice(0, 10)
  const adherencePct =
    params.expectedCount > 0
      ? Math.round((params.completedCount / params.expectedCount) * 100)
      : 100

  const { data, error } = await (supabase as any)
    .from('function_cadence_logs')
    .upsert(
      {
        organization_id: orgId,
        function_id: params.functionId,
        person_id: params.personId || null,
        date: targetDate,
        expected_count: params.expectedCount,
        completed_count: params.completedCount,
        adherence_pct: adherencePct,
        notes: params.notes || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,function_id,date' },
    )
    .select()
    .single()

  if (error) {
    console.error('Erro ao salvar log de cadência:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    functionId: data.function_id,
    personId: data.person_id,
    date: data.date,
    expectedCount: data.expected_count,
    completedCount: data.completed_count,
    adherencePct: Number(data.adherence_pct),
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Helper para verificar se a janela de turno de uma rotina expirou no dia de hoje.
 * - manha: expira às 12h
 * - tarde: expira às 18h
 * - noite: expira às 22h
 * - dia_todo: expira ao fim do dia (23h59)
 */
export function isWindowExpired(
  timeWindow: string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  const currentHour = referenceDate.getHours()
  if (timeWindow === 'manha') {
    return currentHour >= 12
  }
  if (timeWindow === 'tarde') {
    return currentHour >= 18
  }
  if (timeWindow === 'noite') {
    return currentHour >= 22
  }
  return false
}

/**
 * Calcula em tempo real o resumo de cadência (Acompanhamento Diário por Função)
 * por função para uma data específica.
 *
 * REGRA CANÔNICA DE DESVIO:
 * Rotina do dia dentro da janela = PENDENTE, nunca "desvio"/"atrasada"/exceção.
 * Atraso real = due_date < hoje OU janela do turno já estourada (ex.: manha vista de tarde).
 * Aderência parcial (ex.: 0% no início do dia) NÃO é desvio se não houver atraso real.
 */
export async function computeCadenceSummary(
  targetDate: string = new Date().toISOString().slice(0, 10),
): Promise<FunctionCadenceSummary[]> {
  const orgId = await getOrganizationId()
  const todayIso = new Date().toISOString().slice(0, 10)
  const isTargetToday = targetDate === todayIso
  const isTargetPast = targetDate < todayIso

  const [funcsRes, tasksRes, agendaRes, faRes, peopleRes] = await Promise.all([
    supabase.from('functions').select('*').eq('organization_id', orgId).eq('active', true),
    supabase.from('tasks').select('*').eq('organization_id', orgId).eq('active', true),
    supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('due_date', targetDate)
      .neq('status', 'cancelado'),
    fetchActiveAssignments(),
    supabase.from('people').select('id, name, active').eq('organization_id', orgId),
  ])

  const functions = funcsRes.data || []
  const tasks = (tasksRes.data || []) as DbTask[]
  const agendaItems = agendaRes.data || []
  const peopleMap = new Map((peopleRes.data || []).map((p) => [p.id, p.name]))
  const tasksMap = new Map(tasks.map((t) => [t.id, t]))

  // Contagem de ocupantes ativos por função
  const activeAssignmentsByFunc = new Map<string, string[]>()
  for (const fa of faRes) {
    const list = activeAssignmentsByFunc.get(fa.function_id) || []
    list.push(fa.person_id)
    activeAssignmentsByFunc.set(fa.function_id, list)
  }

  const summaries: FunctionCadenceSummary[] = []

  for (const func of functions) {
    const isMultiMember = func.name.toLowerCase().includes('dentista')
    const assignedPersonIds = activeAssignmentsByFunc.get(func.id) || []
    const activeMembersCount = assignedPersonIds.length

    let occupantPersonId: string | null = null
    let occupantName: string | null = null

    if (isMultiMember) {
      occupantPersonId = null
      occupantName = `${activeMembersCount} profissionais ativos`
    } else {
      occupantPersonId = assignedPersonIds[0] || null
      occupantName = occupantPersonId ? peopleMap.get(occupantPersonId) || null : null
    }

    // Rotinas configuradas para essa função
    const funcRoutineTasks = tasks.filter((t) => t.function_id === func.id)

    // Ocorrências da agenda no targetDate para essa função
    const funcAgendaItems = agendaItems.filter((item) => item.function_id === func.id)
    const completedItems = funcAgendaItems.filter((item) => item.status === 'concluido')
    const openItems = funcAgendaItems.filter((item) => item.status === 'aberto')

    // Itens com atraso REAL:
    // 1. Data anterior a hoje
    // 2. Se for hoje, janela do turno já expirou
    // 3. Se a data avaliada for passada (isTargetPast), todo item aberto é atraso real
    const delayedItems = openItems.filter((item) => {
      if (item.due_date < todayIso) return true
      if (isTargetPast) return true
      if (isTargetToday) {
        const originTask =
          item.source_type === 'task' && item.source_id ? tasksMap.get(item.source_id) : undefined
        const window = originTask?.time_window
        return isWindowExpired(window)
      }
      return false
    })

    const expectedCount = funcAgendaItems.length
    const completedCount = completedItems.length
    const pendingCount = openItems.length - delayedItems.length
    const adherencePct =
      expectedCount > 0 ? Math.round((completedCount / expectedCount) * 100) : null

    // Desvio de cadência ocorre estritamente quando há ATRASO REAL (janela estourada ou due_date < hoje).
    // Se a data já passou (isTargetPast) e sobraram pendências, também há desvio.
    // Pendências do dia dentro da janela regular NUNCA são marcadas como desvio.
    const hasDeviation = delayedItems.length > 0 || (isTargetPast && openItems.length > 0)

    summaries.push({
      functionId: func.id,
      functionName: func.name,
      functionColor: func.color || '#0F766E',
      currentOccupantId: occupantPersonId,
      currentOccupantName: occupantName,
      isMultiMember,
      activeMembersCount,
      expectedRoutinesCount: expectedCount,
      completedRoutinesCount: completedCount,
      pendingRoutinesCount: Math.max(0, pendingCount),
      adherencePct,
      hasDeviation,
      delayedCount: delayedItems.length,
      routines: funcRoutineTasks.map((t) => ({
        id: t.id,
        title: t.title,
        roleId: t.function_id || '',
        areaId: t.area_id,
        status: 'Pendente',
        recurrence: t.recurrence === 'diaria' ? 'Diária' : 'Única',
        dueDate: t.due_date || targetDate,
        createdAt: t.created_at,
        active: t.active,
        description: t.description,
        estimatedMinutes: t.estimated_minutes ?? 15,
        timeWindow: t.time_window ?? 'dia_todo',
        priority: t.priority ?? 'media',
        isRoutine: t.is_routine ?? true,
      })),
    })
  }

  return summaries
}
