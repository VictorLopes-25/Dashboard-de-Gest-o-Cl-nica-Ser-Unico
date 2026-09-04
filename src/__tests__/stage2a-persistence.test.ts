import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getOrganizationId } from '../services/organizationService'
import { fetchFunctions, setFunctionActive } from '../services/functionsService'
import {
  createPerson,
  updatePerson,
  setPersonActive,
  deletePerson,
  fetchPeople,
} from '../services/peopleService'
import {
  assignPersonToFunction,
  getCurrentOccupantOfFunction,
  fetchAssignments,
  fetchActiveAssignments,
} from '../services/functionAssignmentsService'
import { supabase } from '../lib/supabase/client'

describe('STAGE 2A — Validação de Persistência Supabase', () => {
  let orgId: string
  let testPersonId: string | null = null
  let gerenciaFuncId: string
  let adminFuncId: string

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeDefined()

    const funcs = await fetchFunctions()
    const gerencia = funcs.find((f) => f.name === 'Gerência')
    const admin = funcs.find((f) => f.name === 'Administrativo')
    expect(gerencia).toBeDefined()
    expect(admin).toBeDefined()
    gerenciaFuncId = gerencia!.id
    adminFuncId = admin!.id
  })

  afterAll(async () => {
    // REMOVER qualquer dado de teste temporário criado na validação
    if (testPersonId) {
      await supabase
        .from('function_assignments')
        .delete()
        .eq('person_id', testPersonId)
        .eq('organization_id', orgId)

      await supabase.from('people').delete().eq('id', testPersonId).eq('organization_id', orgId)
    }
  })

  it('A. Criar uma pessoa de teste no public.people', async () => {
    const person = await createPerson({
      name: 'Teste QA Automatizado Stage 2A',
      active: true,
    })
    expect(person).toBeDefined()
    expect(person.id).toBeDefined()
    expect(person.name).toBe('Teste QA Automatizado Stage 2A')
    expect(person.organization_id).toBe(orgId)
    testPersonId = person.id
  })

  it('B. Atribuí-la a uma função (Gerência)', async () => {
    const assignment = await assignPersonToFunction(gerenciaFuncId, testPersonId!)
    expect(assignment).toBeDefined()
    expect(assignment.function_id).toBe(gerenciaFuncId)
    expect(assignment.person_id).toBe(testPersonId)
    expect(assignment.active).toBe(true)
    expect(assignment.end_date).toBeNull()
  })

  it('C & D. Verificar persistência vinda do Supabase', async () => {
    const people = await fetchPeople()
    const found = people.find((p) => p.id === testPersonId)
    expect(found).toBeDefined()
    expect(found?.name).toBe('Teste QA Automatizado Stage 2A')

    const occupant = await getCurrentOccupantOfFunction(gerenciaFuncId)
    expect(occupant).toBeDefined()
    expect(occupant?.person_id).toBe(testPersonId)
    expect(occupant?.active).toBe(true)
  })

  it('E. Mover/trocar a atribuição de função (para Administrativo)', async () => {
    // Para testar troca de ocupante na mesma função:
    // Criamos uma segunda pessoa temporária B para assumir Gerência
    const personB = await createPerson({
      name: 'Pessoa B Teste Troca',
      active: true,
    })

    try {
      // Atribuir Pessoa B à Gerência (onde testPerson estava)
      const assignmentB = await assignPersonToFunction(gerenciaFuncId, personB.id)
      expect(assignmentB.person_id).toBe(personB.id)

      // F. Verificar que o assignment histórico permanece
      const allAssignments = await fetchAssignments()
      const testPersonHistory = allAssignments.filter(
        (a) => a.person_id === testPersonId && a.function_id === gerenciaFuncId,
      )
      expect(testPersonHistory.length).toBeGreaterThan(0)
      const closedAssignment = testPersonHistory[0]
      expect(closedAssignment.active).toBe(false)
      expect(closedAssignment.end_date).not.toBeNull()

      // G. Verificar que a query de ocupante atual retorna a nova pessoa (Pessoa B)
      const currentGerencia = await getCurrentOccupantOfFunction(gerenciaFuncId)
      expect(currentGerencia?.person_id).toBe(personB.id)
      expect(currentGerencia?.active).toBe(true)
      expect(currentGerencia?.end_date).toBeNull()
    } finally {
      // Limpar Pessoa B
      await supabase
        .from('function_assignments')
        .delete()
        .eq('person_id', personB.id)
        .eq('organization_id', orgId)

      await supabase.from('people').delete().eq('id', personB.id).eq('organization_id', orgId)
    }
  })

  it('H. Desativar/reativar onde suportado (people)', async () => {
    const deactivated = await setPersonActive(testPersonId!, false)
    expect(deactivated.active).toBe(false)

    const reactivated = await setPersonActive(testPersonId!, true)
    expect(reactivated.active).toBe(true)
  })
})
