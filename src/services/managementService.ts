import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import type {
  ManagementItem,
  ManagementAction,
  ManagementItemType,
  ManagementVisibilityLevel,
  ManagementItemStatus,
  ManagementActionStatus,
} from '@/types'

export interface DbManagementItem {
  id: string
  organization_id: string
  title: string
  content: string
  type: ManagementItemType
  visibility_level: ManagementVisibilityLevel
  status: ManagementItemStatus
  target_person_id: string | null
  target_function_id: string | null
  created_by_person_id: string | null
  acknowledged_at: string | null
  acknowledged_by_person_id: string | null
  created_at: string
  updated_at: string
}

export interface DbManagementAction {
  id: string
  organization_id: string
  title: string
  description: string
  status: ManagementActionStatus
  responsible_person_id: string | null
  responsible_function_id: string | null
  due_date: string | null
  origin_item_id: string | null
  created_by_person_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateManagementItemPayload {
  title: string
  content: string
  type: ManagementItemType
  visibility_level: ManagementVisibilityLevel
  target_person_id?: string | null
  target_function_id?: string | null
  status?: ManagementItemStatus
}

export interface UpdateManagementItemPayload {
  title?: string
  content?: string
  type?: ManagementItemType
  visibility_level?: ManagementVisibilityLevel
  status?: ManagementItemStatus
  target_person_id?: string | null
  target_function_id?: string | null
}

export interface CreateManagementActionPayload {
  title: string
  description?: string
  status?: ManagementActionStatus
  responsible_person_id?: string | null
  responsible_function_id?: string | null
  due_date?: string | null
  origin_item_id?: string | null
}

export interface UpdateManagementActionPayload {
  title?: string
  description?: string
  status?: ManagementActionStatus
  responsible_person_id?: string | null
  responsible_function_id?: string | null
  due_date?: string | null
  origin_item_id?: string | null
  completed_at?: string | null
}

// -------------------------------------------------------------------------
// MANAGEMENT ITEMS SERVICES
// -------------------------------------------------------------------------

export async function fetchManagementItems(filters?: {
  type?: ManagementItemType
  visibilityLevel?: ManagementVisibilityLevel
  status?: ManagementItemStatus
  targetPersonId?: string
  targetFunctionId?: string
}): Promise<DbManagementItem[]> {
  let query = (supabase as any)
    .from('management_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.visibilityLevel) {
    query = query.eq('visibility_level', filters.visibilityLevel)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.targetPersonId) {
    query = query.eq('target_person_id', filters.targetPersonId)
  }
  if (filters?.targetFunctionId) {
    query = query.eq('target_function_id', filters.targetFunctionId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar itens de gestão:', error)
    throw error
  }
  return (data || []) as DbManagementItem[]
}

export async function getManagementItemById(id: string): Promise<DbManagementItem | null> {
  const { data, error } = await (supabase as any)
    .from('management_items')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar item de gestão por id:', error)
    throw error
  }
  return data as DbManagementItem | null
}

export async function createManagementItem(
  payload: CreateManagementItemPayload,
): Promise<DbManagementItem> {
  const orgId = await getOrganizationId()

  const { data, error } = await (supabase as any)
    .from('management_items')
    .insert({
      organization_id: orgId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      type: payload.type,
      visibility_level: payload.visibility_level,
      status: payload.status || 'ativo',
      target_person_id: payload.target_person_id || null,
      target_function_id: payload.target_function_id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar item de gestão:', error)
    throw error
  }
  return data as DbManagementItem
}

export async function updateManagementItem(
  id: string,
  updates: UpdateManagementItemPayload,
): Promise<DbManagementItem> {
  const payload: any = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.content !== undefined) payload.content = updates.content.trim()
  if (updates.type !== undefined) payload.type = updates.type
  if (updates.visibility_level !== undefined) payload.visibility_level = updates.visibility_level
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.target_person_id !== undefined) payload.target_person_id = updates.target_person_id
  if (updates.target_function_id !== undefined)
    payload.target_function_id = updates.target_function_id

  const { data, error } = await (supabase as any)
    .from('management_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar item de gestão:', error)
    throw error
  }
  return data as DbManagementItem
}

export async function deleteManagementItem(id: string): Promise<void> {
  const { error } = await (supabase as any).from('management_items').delete().eq('id', id)
  if (error) {
    console.error('Erro ao excluir item de gestão:', error)
    throw error
  }
}

export async function acknowledgeManagementItem(itemId: string): Promise<{
  success: boolean
  itemId: string
  acknowledgedAt: string
  acknowledgedBy: string
}> {
  const { data, error } = await (supabase as any).rpc('acknowledge_management_item', {
    p_item_id: itemId,
  })

  if (error) {
    console.error('Erro ao reconhecer item de gestão:', error)
    throw error
  }
  return data as {
    success: boolean
    itemId: string
    acknowledgedAt: string
    acknowledgedBy: string
  }
}

// -------------------------------------------------------------------------
// MANAGEMENT ACTIONS SERVICES
// -------------------------------------------------------------------------

export async function fetchManagementActions(filters?: {
  status?: ManagementActionStatus
  responsiblePersonId?: string
  responsibleFunctionId?: string
}): Promise<DbManagementAction[]> {
  let query = (supabase as any)
    .from('management_actions')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.responsiblePersonId) {
    query = query.eq('responsible_person_id', filters.responsiblePersonId)
  }
  if (filters?.responsibleFunctionId) {
    query = query.eq('responsible_function_id', filters.responsibleFunctionId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar ações de gestão:', error)
    throw error
  }
  return (data || []) as DbManagementAction[]
}

export async function createManagementAction(
  payload: CreateManagementActionPayload,
): Promise<DbManagementAction> {
  const orgId = await getOrganizationId()

  const { data, error } = await (supabase as any)
    .from('management_actions')
    .insert({
      organization_id: orgId,
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : '',
      status: payload.status || 'pendente',
      responsible_person_id: payload.responsible_person_id || null,
      responsible_function_id: payload.responsible_function_id || null,
      due_date: payload.due_date || null,
      origin_item_id: payload.origin_item_id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar ação de gestão:', error)
    throw error
  }
  return data as DbManagementAction
}

export async function updateManagementAction(
  id: string,
  updates: UpdateManagementActionPayload,
): Promise<DbManagementAction> {
  const payload: any = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.description !== undefined) payload.description = updates.description.trim()
  if (updates.status !== undefined) {
    payload.status = updates.status
    if (updates.status === 'concluida') {
      payload.completed_at = new Date().toISOString()
    } else if (updates.completed_at === undefined) {
      payload.completed_at = null
    }
  }
  if (updates.responsible_person_id !== undefined)
    payload.responsible_person_id = updates.responsible_person_id
  if (updates.responsible_function_id !== undefined)
    payload.responsible_function_id = updates.responsible_function_id
  if (updates.due_date !== undefined) payload.due_date = updates.due_date
  if (updates.origin_item_id !== undefined) payload.origin_item_id = updates.origin_item_id
  if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at

  const { data, error } = await (supabase as any)
    .from('management_actions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar ação de gestão:', error)
    throw error
  }
  return data as DbManagementAction
}

export async function deleteManagementAction(id: string): Promise<void> {
  const { error } = await (supabase as any).from('management_actions').delete().eq('id', id)
  if (error) {
    console.error('Erro ao excluir ação de gestão:', error)
    throw error
  }
}

// -------------------------------------------------------------------------
// MAPPER HELPERS (DB -> UI Model)
// -------------------------------------------------------------------------

export function mapDbManagementItemToUi(
  item: DbManagementItem,
  peopleMap?: Map<string, string>,
  functionsMap?: Map<string, string>,
): ManagementItem {
  return {
    id: item.id,
    organizationId: item.organization_id,
    title: item.title,
    content: item.content,
    type: item.type,
    visibilityLevel: item.visibility_level,
    status: item.status,
    targetPersonId: item.target_person_id,
    targetPersonName: item.target_person_id ? peopleMap?.get(item.target_person_id) || null : null,
    targetFunctionId: item.target_function_id,
    targetFunctionName: item.target_function_id
      ? functionsMap?.get(item.target_function_id) || null
      : null,
    createdByPersonId: item.created_by_person_id,
    createdByName: item.created_by_person_id
      ? peopleMap?.get(item.created_by_person_id) || 'Gestão'
      : 'Gestão',
    acknowledgedAt: item.acknowledged_at,
    acknowledgedByPersonId: item.acknowledged_by_person_id,
    acknowledgedByName: item.acknowledged_by_person_id
      ? peopleMap?.get(item.acknowledged_by_person_id) || null
      : null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function mapDbManagementActionToUi(
  action: DbManagementAction,
  peopleMap?: Map<string, string>,
  functionsMap?: Map<string, string>,
  originItemTitle?: string,
): ManagementAction {
  return {
    id: action.id,
    organizationId: action.organization_id,
    title: action.title,
    description: action.description,
    status: action.status,
    responsiblePersonId: action.responsible_person_id,
    responsiblePersonName: action.responsible_person_id
      ? peopleMap?.get(action.responsible_person_id) || null
      : null,
    responsibleFunctionId: action.responsible_function_id,
    responsibleFunctionName: action.responsible_function_id
      ? functionsMap?.get(action.responsible_function_id) || null
      : null,
    dueDate: action.due_date,
    originItemId: action.origin_item_id,
    originItemTitle: originItemTitle || null,
    createdByPersonId: action.created_by_person_id,
    createdByName: action.created_by_person_id
      ? peopleMap?.get(action.created_by_person_id) || 'Gestão'
      : 'Gestão',
    completedAt: action.completed_at,
    createdAt: action.created_at,
    updatedAt: action.updated_at,
  }
}
