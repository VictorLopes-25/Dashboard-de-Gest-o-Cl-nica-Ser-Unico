import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'

export interface DbFunctionAssignment {
  id: string
  organization_id: string
  function_id: string
  person_id: string
  start_date: string
  end_date: string | null
  active: boolean
  created_at: string
}

export interface CurrentOccupantInfo {
  assignmentId: string
  functionId: string
  functionName: string
  personId: string
  personName: string
  startDate: string
  active: boolean
}

/**
 * Busca todos os assignments da organização.
 */
export async function fetchAssignments(): Promise<DbFunctionAssignment[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('function_assignments')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar function_assignments do Supabase:', error)
    throw new Error(`Falha ao buscar function_assignments: ${error.message}`)
  }

  return (data || []) as DbFunctionAssignment[]
}

/**
 * Busca assignments ativos (ocupantes atuais): end_date IS NULL AND active = true.
 */
export async function fetchActiveAssignments(): Promise<DbFunctionAssignment[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('function_assignments')
    .select('*')
    .eq('organization_id', orgId)
    .is('end_date', null)
    .eq('active', true)

  if (error) {
    console.error('Erro ao buscar assignments ativos:', error)
    throw new Error(`Falha ao buscar assignments ativos: ${error.message}`)
  }

  return (data || []) as DbFunctionAssignment[]
}

/**
 * Retorna o ocupante atual de uma determinada função (se houver).
 */
export async function getCurrentOccupantOfFunction(
  functionId: string,
): Promise<DbFunctionAssignment | null> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('function_assignments')
    .select('*')
    .eq('organization_id', orgId)
    .eq('function_id', functionId)
    .is('end_date', null)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao buscar ocupante atual da função ${functionId}:`, error)
    throw new Error(`Falha ao buscar ocupante atual: ${error.message}`)
  }

  return data as DbFunctionAssignment | null
}

/**
 * Atribui uma pessoa a uma função respeitando a regra histórica:
 * - Ocupante atual (se diferente) é encerrado com end_date = CURRENT_DATE e active = false.
 * - Uma nova linha de assignment é inserida com start_date = CURRENT_DATE, end_date = null, active = true.
 * - NUNCA sobrescreve linhas históricas de assignment.
 */
export async function assignPersonToFunction(
  functionId: string,
  personId: string,
): Promise<DbFunctionAssignment> {
  const orgId = await getOrganizationId()
  const today = new Date().toISOString().split('T')[0]

  // 1. Verificar se a mesma pessoa já é a ocupante ativa dessa função
  const currentOccupant = await getCurrentOccupantOfFunction(functionId)
  if (currentOccupant && currentOccupant.person_id === personId) {
    return currentOccupant
  }

  // 2. Se houver ocupante atual diferente, encerrar assignment anterior
  if (currentOccupant) {
    const { error: closeError } = await supabase
      .from('function_assignments')
      .update({
        end_date: today,
        active: false,
      })
      .eq('id', currentOccupant.id)
      .eq('organization_id', orgId)

    if (closeError) {
      console.error('Erro ao encerrar assignment anterior:', closeError)
      throw new Error(`Falha ao encerrar ocupante anterior: ${closeError.message}`)
    }
  }

  // 3. Inserir novo assignment
  const { data: newAssignment, error: insertError } = await supabase
    .from('function_assignments')
    .insert({
      organization_id: orgId,
      function_id: functionId,
      person_id: personId,
      start_date: today,
      end_date: null,
      active: true,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Erro ao criar novo function_assignment:', insertError)
    throw new Error(`Falha ao atribuir função à pessoa: ${insertError.message}`)
  }

  return newAssignment as DbFunctionAssignment
}

/**
 * Encerra a atribuição ativa de uma pessoa em uma função específica.
 */
export async function unassignPersonFromFunction(
  functionId: string,
  personId: string,
): Promise<void> {
  const orgId = await getOrganizationId()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('function_assignments')
    .update({
      end_date: today,
      active: false,
    })
    .eq('organization_id', orgId)
    .eq('function_id', functionId)
    .eq('person_id', personId)
    .is('end_date', null)
    .eq('active', true)

  if (error) {
    console.error('Erro ao encerrar assignment:', error)
    throw new Error(`Falha ao remover atribuição de função: ${error.message}`)
  }
}

/**
 * Sincroniza as funções ativas de uma pessoa.
 * Regra:
 * - Para funções que a pessoa deve ter: se não tiver ativa, atribui (fechando quem estivesse antes).
 * - Para funções que a pessoa tinha ativa mas não deve mais ter: encerra (end_date = CURRENT_DATE, active = false).
 */
export async function syncPersonFunctions(
  personId: string,
  targetFunctionIds: string[],
): Promise<void> {
  const orgId = await getOrganizationId()
  const today = new Date().toISOString().split('T')[0]

  // Buscar assignments ativos atuais da pessoa
  const { data: myActiveAssignments, error: fetchError } = await supabase
    .from('function_assignments')
    .select('*')
    .eq('organization_id', orgId)
    .eq('person_id', personId)
    .is('end_date', null)
    .eq('active', true)

  if (fetchError) {
    throw new Error(`Falha ao buscar atribuições ativas da pessoa: ${fetchError.message}`)
  }

  const currentFunctionIds = new Set((myActiveAssignments || []).map((a) => a.function_id))
  const targetSet = new Set(targetFunctionIds)

  // Desativar funções que não estão mais na lista alvo
  for (const assignment of myActiveAssignments || []) {
    if (!targetSet.has(assignment.function_id)) {
      const { error: endError } = await supabase
        .from('function_assignments')
        .update({
          end_date: today,
          active: false,
        })
        .eq('id', assignment.id)
        .eq('organization_id', orgId)

      if (endError) {
        throw new Error(`Falha ao desativar função anterior: ${endError.message}`)
      }
    }
  }

  // Atribuir novas funções
  for (const funcId of targetFunctionIds) {
    if (!currentFunctionIds.has(funcId)) {
      await assignPersonToFunction(funcId, personId)
    }
  }
}
