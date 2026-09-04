import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export interface DbArea {
  id: string
  organization_id: string
  name: string
  function_id: string
  active: boolean
}

/**
 * Camada mínima de serviço para Áreas (tabela public.areas).
 * Não há UI dedicada no momento; pronta para consumo futuro ou das tarefas.
 */
export async function fetchAreas(): Promise<DbArea[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar áreas do Supabase:', error)
    throw new Error(`Falha ao buscar áreas: ${error.message}`)
  }

  return (data || []) as DbArea[]
}

export async function createArea(payload: {
  name: string
  function_id: string
  active?: boolean
}): Promise<DbArea> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('areas')
    .insert({
      organization_id: orgId,
      name: payload.name,
      function_id: payload.function_id,
      active: payload.active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar área no Supabase:', error)
    throw new Error(`Falha ao criar área: ${error.message}`)
  }

  return data as DbArea
}

export async function updateArea(
  id: string,
  updates: {
    name?: string
    function_id?: string
    active?: boolean
  },
): Promise<DbArea> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('areas')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar área no Supabase:', error)
    throw new Error(`Falha ao atualizar área: ${error.message}`)
  }

  return data as DbArea
}

export async function setAreaActive(id: string, active: boolean): Promise<DbArea> {
  return updateArea(id, { active })
}
