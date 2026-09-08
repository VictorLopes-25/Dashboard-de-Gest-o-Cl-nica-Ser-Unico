import { supabase } from '@/lib/supabase/client'

let cachedOrgId: string | null = null

/**
 * Resolve o UUID da organização "Ser Único" no banco de dados.
 * Cacheia o ID em memória para evitar queries repetidas.
 */
export async function getOrganizationId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'Ser Único')
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar organização Ser Único:', error)
    throw new Error(`Falha ao obter organização Ser Único: ${error.message}`)
  }

  if (!data?.id) {
    // Tentar via get_auth_state (função SECURITY DEFINER)
    try {
      const { data: authState } = await supabase.rpc('get_auth_state')
      const stateObj = authState as any
      if (stateObj?.person?.organization_id) {
        cachedOrgId = stateObj.person.organization_id
        return cachedOrgId
      }
      if (stateObj?.target_org_id) {
        cachedOrgId = stateObj.target_org_id
        return cachedOrgId
      }
    } catch {
      // fallback
    }

    // Tenta fallback para primeira organização se não encontrar pelo nome exato
    const { data: firstOrg, error: firstError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .maybeSingle()

    if (firstOrg?.id) {
      cachedOrgId = firstOrg.id
      return firstOrg.id
    }

    // Fallback padrão da clínica Ser Único se o usuário atual ainda não tiver leitura via RLS
    const fallbackOrgId = 'a0000000-0000-0000-0000-000000000001'
    cachedOrgId = fallbackOrgId
    return fallbackOrgId
  }

  cachedOrgId = data.id
  return data.id
}
