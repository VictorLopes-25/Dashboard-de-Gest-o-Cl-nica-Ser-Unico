import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export type DbRecurrenceType = 'pontual' | 'diaria' | 'semanal' | 'mensal' | 'data_especifica'

export type TimeWindow = 'manha' | 'tarde' | 'noite' | 'dia_todo'
export type CadencePriority = 'baixa' | 'media' | 'alta' | 'critica'

export interface DbTask {
  id: string
  organization_id: string
  function_id: string | null
  area_id: string | null
  title: string
  description: string | null
  recurrence: DbRecurrenceType
  recurrence_day: number | null
  due_date: string | null
  default_person_id: string | null
  active: boolean
  created_at: string
  estimated_minutes?: number | null
  time_window?: TimeWindow
  priority?: CadencePriority
  is_routine?: boolean
}

export interface CreateTaskPayload {
  title: string
  description?: string | null
  function_id?: string | null
  area_id?: string | null
  recurrence: DbRecurrenceType
  recurrence_day?: number | null
  due_date?: string | null
  default_person_id?: string | null
  active?: boolean
  estimated_minutes?: number | null
  time_window?: TimeWindow
  priority?: CadencePriority
  is_routine?: boolean
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
  function_id?: string | null
  area_id?: string | null
  recurrence?: DbRecurrenceType
  recurrence_day?: number | null
  due_date?: string | null
  default_person_id?: string | null
  active?: boolean
  estimated_minutes?: number | null
  time_window?: TimeWindow
  priority?: CadencePriority
  is_routine?: boolean
}

/**
 * Busca todas as tarefas (templates) da organização.
 */
export async function fetchTasks(includeInactive = false): Promise<DbTask[]> {
  const orgId = await getOrganizationId()

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar tarefas do Supabase:', error)
    throw new Error(`Falha ao buscar tarefas: ${error.message}`)
  }

  return (data || []) as DbTask[]
}

/**
 * Busca uma tarefa por ID.
 */
export async function getTaskById(id: string): Promise<DbTask | null> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao buscar tarefa ${id}:`, error)
    throw new Error(`Falha ao buscar tarefa: ${error.message}`)
  }

  return data as DbTask | null
}

/**
 * Cria uma nova tarefa (template) no Supabase.
 * Valida a constraint: (area_id IS NOT NULL OR function_id IS NOT NULL).
 */
export async function createTask(payload: CreateTaskPayload): Promise<DbTask> {
  const orgId = await getOrganizationId()

  if (!payload.function_id && !payload.area_id) {
    throw new Error('A tarefa deve possuir uma Função ou uma Área associada.')
  }

  const insertData: any = {
    organization_id: orgId,
    title: payload.title.trim(),
    description: payload.description ?? null,
    function_id: payload.function_id ?? null,
    area_id: payload.area_id ?? null,
    recurrence: payload.recurrence,
    recurrence_day: payload.recurrence_day ?? null,
    due_date: payload.due_date ?? null,
    default_person_id: payload.default_person_id ?? null,
    active: payload.active ?? true,
  }

  if (payload.estimated_minutes !== undefined)
    insertData.estimated_minutes = payload.estimated_minutes
  if (payload.time_window !== undefined) insertData.time_window = payload.time_window
  if (payload.priority !== undefined) insertData.priority = payload.priority
  if (payload.is_routine !== undefined) insertData.is_routine = payload.is_routine

  const { data, error } = await supabase.from('tasks').insert(insertData).select().single()

  if (error) {
    console.error('Erro ao criar tarefa no Supabase:', error)
    throw new Error(`Falha ao criar tarefa: ${error.message}`)
  }

  return data as DbTask
}

/**
 * Atualiza uma tarefa (template) existente.
 * Editar o template afeta apenas geração nova/futura.
 */
export async function updateTask(id: string, updates: UpdateTaskPayload): Promise<DbTask> {
  const orgId = await getOrganizationId()

  const { data, error } = await (supabase as any)
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar tarefa no Supabase:', error)
    throw new Error(`Falha ao atualizar tarefa: ${error.message}`)
  }

  return data as DbTask
}

/**
 * Ativa ou desativa uma tarefa.
 * Ao desativar: para a geração de novas ocorrências; não apaga histórico nem itens concluídos.
 * Ocorrências futuras abertas existentes são canceladas (status = 'cancelado') pelo agendaService.
 */
export async function setTaskActive(id: string, active: boolean): Promise<DbTask> {
  const updatedTask = await updateTask(id, { active })

  if (!active) {
    // Cancelar ocorrências futuras abertas desta task
    const today = new Date().toISOString().split('T')[0]
    const orgId = await getOrganizationId()

    await supabase
      .from('agenda_items')
      .update({ status: 'cancelado' })
      .eq('organization_id', orgId)
      .eq('source_type', 'task')
      .eq('source_id', id)
      .eq('status', 'aberto')
      .gte('due_date', today)
  }

  return updatedTask
}
