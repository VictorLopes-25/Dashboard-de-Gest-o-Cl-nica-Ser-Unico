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
 * Calcula em tempo real o resumo de cadência (Esperado vs Realizado de Rotinas)
 * por função para uma data específica.
 */
export async function computeCadenceSummary(
  targetDate: string = new Date().toISOString().slice(0, 10),
): Promise<FunctionCadenceSummary[]> {
  const orgId = await getOrganizationId()

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
    supabase.from('people').select('id, name').eq('organization_id', orgId),
  ])

  const functions = funcsRes.data || []
  const tasks = (tasksRes.data || []) as DbTask[]
  const agendaItems = agendaRes.data || []
  const peopleMap = new Map((peopleRes.data || []).map((p) => [p.id, p.name]))

  // Mapa de ocupante ativo por função
  const activeOccupantMap = new Map<string, string>()
  for (const fa of faRes) {
    activeOccupantMap.set(fa.function_id, fa.person_id)
  }

  const summaries: FunctionCadenceSummary[] = []

  for (const func of functions) {
    const occupantPersonId = activeOccupantMap.get(func.id) || null
    const occupantName = occupantPersonId ? peopleMap.get(occupantPersonId) || null : null

    // Rotinas configuradas para essa função
    const funcRoutineTasks = tasks.filter((t) => t.function_id === func.id)

    // Ocorrências da agenda hoje para essa função
    const funcTodayAgenda = agendaItems.filter((item) => item.function_id === func.id)
    const completedItems = funcTodayAgenda.filter((item) => item.status === 'concluido')
    const delayedItems = funcTodayAgenda.filter(
      (item) => item.status === 'aberto' && item.due_date < targetDate,
    )

    const expectedCount = funcTodayAgenda.length
    const completedCount = completedItems.length
    const adherencePct =
      expectedCount > 0 ? Math.round((completedCount / expectedCount) * 100) : null

    // Se adherencePct < 70% ou houver atrasados, marca como desvio operacional
    const hasDeviation = (adherencePct !== null && adherencePct < 70) || delayedItems.length > 0

    summaries.push({
      functionId: func.id,
      functionName: func.name,
      functionColor: func.color || '#0F766E',
      currentOccupantId: occupantPersonId,
      currentOccupantName: occupantName,
      expectedRoutinesCount: expectedCount,
      completedRoutinesCount: completedCount,
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
