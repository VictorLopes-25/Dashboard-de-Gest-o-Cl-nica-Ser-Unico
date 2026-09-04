import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export interface DbScript {
  id: string
  organization_id: string
  title: string
  content: string | null
  stage: string | null
  active: boolean
  updated_at: string
}

export interface CreateScriptPayload {
  title: string
  content?: string | null
  stage?: string | null
  active?: boolean
}

export interface UpdateScriptPayload {
  title?: string
  content?: string | null
  stage?: string | null
  active?: boolean
}

/**
 * Busca todos os scripts da organização.
 */
export async function fetchScripts(onlyActive = false): Promise<DbScript[]> {
  const orgId = await getOrganizationId()

  let query = supabase
    .from('scripts')
    .select('*')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })

  if (onlyActive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar scripts:', error)
    throw new Error(`Falha ao buscar scripts: ${error.message}`)
  }

  return (data || []) as DbScript[]
}

/**
 * Cria um novo script em public.scripts.
 */
export async function createScript(payload: CreateScriptPayload): Promise<DbScript> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('scripts')
    .insert({
      organization_id: orgId,
      title: payload.title.trim(),
      content: payload.content?.trim() || null,
      stage: payload.stage || null,
      active: payload.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar script:', error)
    throw new Error(`Falha ao criar script: ${error.message}`)
  }

  return data as DbScript
}

/**
 * Atualiza um script existente.
 */
export async function updateScript(id: string, updates: UpdateScriptPayload): Promise<DbScript> {
  const orgId = await getOrganizationId()

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.title !== undefined) dbUpdates.title = updates.title.trim()
  if (updates.content !== undefined)
    dbUpdates.content = updates.content !== null ? updates.content.trim() : null
  if (updates.stage !== undefined) dbUpdates.stage = updates.stage || null
  if (updates.active !== undefined) dbUpdates.active = updates.active

  const { data, error } = await (supabase.from('scripts') as any)
    .update(dbUpdates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error(`Erro ao atualizar script ${id}:`, error)
    throw new Error(`Falha ao atualizar script: ${error.message}`)
  }

  return data as DbScript
}

/**
 * Ativa ou desativa um script (soft activate/deactivate).
 */
export async function setScriptActive(id: string, active: boolean): Promise<DbScript> {
  return updateScript(id, { active })
}

/**
 * Exclui fisicamente um script.
 */
export async function deleteScript(id: string): Promise<void> {
  const orgId = await getOrganizationId()

  const { error } = await supabase
    .from('scripts')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    console.error(`Erro ao excluir script ${id}:`, error)
    throw new Error(`Falha ao excluir script: ${error.message}`)
  }
}
