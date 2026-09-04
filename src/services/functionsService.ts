import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export interface DbFunction {
  id: string
  organization_id: string
  name: string
  color: string | null
  active: boolean
  created_at: string
}

export async function fetchFunctions(): Promise<DbFunction[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('functions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao buscar funções do Supabase:', error)
    throw new Error(`Falha ao buscar funções: ${error.message}`)
  }

  return (data || []) as DbFunction[]
}

export async function createFunction(payload: {
  name: string
  color?: string | null
  active?: boolean
}): Promise<DbFunction> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('functions')
    .insert({
      organization_id: orgId,
      name: payload.name,
      color: payload.color ?? null,
      active: payload.active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar função no Supabase:', error)
    throw new Error(`Falha ao criar função: ${error.message}`)
  }

  return data as DbFunction
}

export async function updateFunction(
  id: string,
  updates: {
    name?: string
    color?: string | null
    active?: boolean
  },
): Promise<DbFunction> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('functions')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar função no Supabase:', error)
    throw new Error(`Falha ao atualizar função: ${error.message}`)
  }

  return data as DbFunction
}

export async function setFunctionActive(id: string, active: boolean): Promise<DbFunction> {
  return updateFunction(id, { active })
}
