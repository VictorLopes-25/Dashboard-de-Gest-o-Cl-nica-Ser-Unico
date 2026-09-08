import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import { createPerson, setPersonActive, deletePerson, fetchPeople } from '@/services/peopleService'
import {
  assignPersonToFunction,
  replaceFunctionOccupant,
  getCurrentOccupantOfFunction,
  fetchAssignments,
} from '@/services/functionAssignmentsService'
import { fetchFunctions } from '@/services/functionsService'

describe('HOTFIX Acceptance Tests — Collaborator Persistence & Function Occupancy', () => {
  let orgId: string
  let adminFuncId: string
  let asbFuncId: string
  let brunaPersonId: string
  let simonePersonId: string
  let lucianoPersonId: string

  beforeAll(async () => {
    orgId = await getOrganizationId()
    const funcs = await fetchFunctions()
    const adm = funcs.find((f) => f.name === 'Administrativo')
    const asb = funcs.find((f) => f.name === 'ASB Auxiliar')
    expect(adm).toBeDefined()
    expect(asb).toBeDefined()
    adminFuncId = adm!.id
    asbFuncId = asb!.id
  })

  afterAll(async () => {
    // TEST E: CLEANUP — remove/deactivate all QA test data
    if (brunaPersonId) {
      await supabase.from('function_assignments').delete().eq('person_id', brunaPersonId)
      await supabase.from('people').delete().eq('id', brunaPersonId)
    }
    if (simonePersonId) {
      await supabase.from('function_assignments').delete().eq('person_id', simonePersonId)
      await supabase.from('people').delete().eq('id', simonePersonId)
    }
    if (lucianoPersonId) {
      await supabase.from('function_assignments').delete().eq('person_id', lucianoPersonId)
      await supabase.from('people').delete().eq('id', lucianoPersonId)
    }
  })

  it('TEST A — CREATE PERSON: OWNER creates "Bruna Teste" → persisted in public.people with real UUID', async () => {
    const created = await createPerson({
      name: 'Bruna Teste',
      active: true,
    })

    expect(created).toBeDefined()
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(created.name).toBe('Bruna Teste')
    expect(created.auth_user_id).toBeNull()
    expect(created.active).toBe(true)
    brunaPersonId = created.id

    // Confirm against live DB query
    const { data: dbPerson } = await supabase
      .from('people')
      .select('*')
      .eq('id', brunaPersonId)
      .single()

    expect(dbPerson).toBeDefined()
    expect(dbPerson.name).toBe('Bruna Teste')
    expect(dbPerson.organization_id).toBe(orgId)
  })

  it('TEST B — ASSIGN FUNCTION: OWNER assigns Bruna Teste to Administrativo → function_assignments row created', async () => {
    const assignment = await assignPersonToFunction(adminFuncId, brunaPersonId)

    expect(assignment).toBeDefined()
    expect(assignment.function_id).toBe(adminFuncId)
    expect(assignment.person_id).toBe(brunaPersonId)
    expect(assignment.active).toBe(true)
    expect(assignment.end_date).toBeNull()

    // Query occupant of function
    const currentOccupant = await getCurrentOccupantOfFunction(adminFuncId)
    expect(currentOccupant).toBeDefined()
    expect(currentOccupant!.person_id).toBe(brunaPersonId)
  })

  it('TEST C — REPLACE OCCUPANT: Simone Teste → Luciano Teste atomic replacement with historical integrity', async () => {
    // 1. Create Simone Teste and assign to ASB Auxiliar
    const simone = await createPerson({
      name: 'Simone Teste',
      active: true,
    })
    simonePersonId = simone.id

    const simoneAssignment = await assignPersonToFunction(asbFuncId, simonePersonId)
    expect(simoneAssignment.active).toBe(true)
    expect(simoneAssignment.person_id).toBe(simonePersonId)

    // 2. Create Luciano Teste
    const luciano = await createPerson({
      name: 'Luciano Teste',
      active: true,
    })
    lucianoPersonId = luciano.id

    // 3. Atomically replace Simone with Luciano
    const replaceResult = await replaceFunctionOccupant(asbFuncId, lucianoPersonId)
    expect(replaceResult.success).toBe(true)

    // 4. Verify historical integrity:
    // Simone's assignment row must STILL EXIST with active = false and end_date populated
    const { data: simoneHistoric } = await supabase
      .from('function_assignments')
      .select('*')
      .eq('id', simoneAssignment.id)
      .single()

    expect(simoneHistoric.active).toBe(false)
    expect(simoneHistoric.end_date).not.toBeNull()
    expect(simoneHistoric.person_id).toBe(simonePersonId)

    // 5. Verify current occupant of ASB Auxiliar is Luciano
    const currentAsbOccupant = await getCurrentOccupantOfFunction(asbFuncId)
    expect(currentAsbOccupant).toBeDefined()
    expect(currentAsbOccupant!.person_id).toBe(lucianoPersonId)
    expect(currentAsbOccupant!.active).toBe(true)
    expect(currentAsbOccupant!.end_date).toBeNull()

    // 6. Verify constraint: only ONE active occupant for ASB Auxiliar
    const { data: activeOccupants } = await supabase
      .from('function_assignments')
      .select('*')
      .eq('function_id', asbFuncId)
      .eq('active', true)
      .is('end_date', null)

    expect(activeOccupants).toHaveLength(1)
    expect(activeOccupants![0].person_id).toBe(lucianoPersonId)
  })

  it('TEST D — SECURITY & CONSTRAINTS: Cross-org assignment or invalid function blocked', async () => {
    // Cross-org or nonexistent function fails gracefully
    const fakeFuncId = '00000000-0000-0000-0000-000000000000'
    await expect(replaceFunctionOccupant(fakeFuncId, lucianoPersonId)).rejects.toThrow()
  })

  it('TEST E — CLEANUP: QA test people and assignments removed safely', async () => {
    // Clean up QA test data
    await supabase.from('function_assignments').delete().eq('person_id', brunaPersonId)
    await supabase.from('people').delete().eq('id', brunaPersonId)
    await supabase.from('function_assignments').delete().eq('person_id', simonePersonId)
    await supabase.from('people').delete().eq('id', simonePersonId)
    await supabase.from('function_assignments').delete().eq('person_id', lucianoPersonId)
    await supabase.from('people').delete().eq('id', lucianoPersonId)

    // Verify cleanup
    const { data: remainingBruna } = await supabase
      .from('people')
      .select('id')
      .eq('id', brunaPersonId)
    expect(remainingBruna).toHaveLength(0)

    const { data: remainingSimone } = await supabase
      .from('people')
      .select('id')
      .eq('id', simonePersonId)
    expect(remainingSimone).toHaveLength(0)

    const { data: remainingLuciano } = await supabase
      .from('people')
      .select('id')
      .eq('id', lucianoPersonId)
    expect(remainingLuciano).toHaveLength(0)
  })
})
