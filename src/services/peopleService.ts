import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export interface DbPerson {
  id: string
  organization_id: string
  name: string
  auth_user_id: string | null
  active: boolean
  created_at: string
}

export async function fetchPeople(): Promise<DbPerson[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao buscar pessoas do Supabase:', error)
    throw new Error(`Falha ao buscar pessoas: ${error.message}`)
  }

  return (data || []) as DbPerson[]
}

export async function createPerson(payload: {
  name: string
  auth_user_id?: string | null
  active?: boolean
}): Promise<DbPerson> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('people')
    .insert({
      organization_id: orgId,
      name: payload.name,
      auth_user_id: payload.auth_user_id ?? null,
      active: payload.active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar pessoa no Supabase:', error)
    throw new Error(`Falha ao criar pessoa: ${error.message}`)
  }

  return data as DbPerson
}

export async function updatePerson(
  id: string,
  updates: {
    name?: string
    auth_user_id?: string | null
    active?: boolean
  },
): Promise<DbPerson> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar pessoa no Supabase:', error)
    throw new Error(`Falha ao atualizar pessoa: ${error.message}`)
  }

  return data as DbPerson
}

export async function setPersonActive(id: string, active: boolean): Promise<DbPerson> {
  return updatePerson(id, { active })
}

export async function deletePerson(id: string): Promise<void> {
  const orgId = await getOrganizationId()

  // Desativa assignments primeiro se houver
  await supabase
    .from('function_assignments')
    .delete()
    .eq('person_id', id)
    .eq('organization_id', orgId)

  const { error } = await supabase.from('people').delete().eq('id', id).eq('organization_id', orgId)

  if (error) {
    console.error('Erro ao remover pessoa no Supabase:', error)
    throw new Error(`Falha ao remover pessoa: ${error.message}`)
  }
}
