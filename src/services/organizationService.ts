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
    // Tenta fallback para primeira organização se não encontrar pelo nome exato
    const { data: firstOrg, error: firstError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .maybeSingle()

    if (firstError || !firstOrg?.id) {
      throw new Error('Organização Ser Único não encontrada no Supabase.')
    }

    cachedOrgId = firstOrg.id
    return firstOrg.id
  }

  cachedOrgId = data.id
  return data.id
}
