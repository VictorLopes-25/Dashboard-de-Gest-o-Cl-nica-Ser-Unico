import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import {
  createLead,
  updateLead,
  getLeadById,
  deleteLead,
  createLeadContact,
  fetchLeadContacts,
} from '@/services/leadsService'
import { syncLeadFollowUpAgendaItem } from '@/services/agendaService'
import { fetchFunctions } from '@/services/functionsService'
import { fetchPeople } from '@/services/peopleService'

describe('STAGE 3 — Operational CRM / CRC Acceptance Test (20 Steps Verification)', () => {
  let orgId: string
  let testFunctionId: string
  let testPersonId: string | undefined
  const createdLeadIds: string[] = []
  const createdAgendaItemIds: string[] = []
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeDefined()

    const funcs = await fetchFunctions()
    expect(funcs.length).toBeGreaterThan(0)
    const crcFunc = funcs.find((f) => f.name.toLowerCase().includes('crc')) || funcs[0]
    testFunctionId = crcFunc.id

    const people = await fetchPeople()
    if (people.length > 0) {
      testPersonId = people[0].id
    }
  })

  afterAll(async () => {
    // Teardown: ensure complete removal of temporary test artifacts
    for (const leadId of createdLeadIds) {
      await (supabase.from('lead_contacts') as any).delete().eq('lead_id', leadId)
      await (supabase.from('agenda_items') as any).delete().eq('source_id', leadId)
      await (supabase.from('leads') as any).delete().eq('id', leadId)
    }
  })

  it('Executes the 20-step CRC Acceptance Workflow with full persistence & integrity', async () => {
    // STEP 1: create test lead with interest, email, and origin
    const lead = await createLead({
      name: 'TEST LEAD STAGE 3 — Paciente Validação CRC',
      phone: '(11) 98765-4321',
      email: 'teste.paciente@serunico.com.br',
      interest: 'Implantes Dentários',
      origin: 'meta_ads',
      stage: 'novo',
      next_action: 'Enviar WhatsApp de primeiro contato',
      next_contact_at: todayStr,
      commercial_function_id: testFunctionId,
    })

    expect(lead).toBeDefined()
    expect(lead.id).toBeDefined()
    expect(lead.email).toBe('teste.paciente@serunico.com.br')
    expect(lead.interest).toBe('Implantes Dentários')
    expect(lead.stage).toBe('novo')
    expect(lead.last_contact_at).toBeNull()
    createdLeadIds.push(lead.id)

    // STEP 2: verify lead appears as requiring contact (stage novo without last_contact_at)
    expect(lead.stage).toBe('novo')
    expect(lead.last_contact_at).toBeNull()

    // STEP 3: assign responsible function (structural)
    const updatedWithFunction = await updateLead(lead.id, {
      commercial_function_id: testFunctionId,
    })
    expect(updatedWithFunction.commercial_function_id).toBe(testFunctionId)

    // STEP 4: optionally assign responsible person
    if (testPersonId) {
      const updatedWithPerson = await updateLead(lead.id, {
        commercial_person_id: testPersonId,
      })
      expect(updatedWithPerson.commercial_person_id).toBe(testPersonId)
    }

    // STEP 5: open lead and verify fields persisted in database
    const reloadedLead1 = await getLeadById(lead.id)
    expect(reloadedLead1).not.toBeNull()
    expect(reloadedLead1?.name).toBe('TEST LEAD STAGE 3 — Paciente Validação CRC')
    expect(reloadedLead1?.commercial_function_id).toBe(testFunctionId)

    // STEP 6: register first contact with outcome, notes, channel, and function
    const contact1 = await createLeadContact({
      lead_id: lead.id,
      channel: 'WhatsApp',
      outcome: 'Mensagem enviada',
      notes: 'Primeiro contato enviado apresentando a clínica Ser Único.',
      function_id: testFunctionId,
      person_id: testPersonId || null,
      next_action: 'Aguardar resposta e ligar amanhã se não houver retorno',
      next_follow_up_at: `${tomorrowStr}T10:00:00Z`,
    })
    expect(contact1).toBeDefined()
    expect(contact1.id).toBeDefined()
    expect(contact1.channel).toBe('WhatsApp')
    expect(contact1.outcome).toBe('Mensagem enviada')
    expect(contact1.function_id).toBe(testFunctionId)

    // STEP 7: schedule next follow-up and update lead's last_contact_at & stage
    const nowIso1 = new Date().toISOString()
    const updatedAfterContact1 = await updateLead(lead.id, {
      last_contact_at: nowIso1,
      next_action: 'Aguardar resposta e ligar amanhã se não houver retorno',
      next_contact_at: tomorrowStr,
      next_follow_up_at: `${tomorrowStr}T10:00:00Z`,
      stage: 'novo',
    })

    // STEP 8: confirm contact appears in history
    const history1 = await fetchLeadContacts(lead.id)
    expect(history1.length).toBe(1)
    expect(history1[0].id).toBe(contact1.id)
    expect(history1[0].notes).toContain('Primeiro contato enviado')

    // STEP 9: confirm last_contact_at updates on lead record
    expect(updatedAfterContact1.last_contact_at).not.toBeNull()

    // STEP 10: confirm next_follow_up_at persists with timezone
    expect(updatedAfterContact1.next_follow_up_at).toBe(`${tomorrowStr}T10:00:00Z`)
    expect(updatedAfterContact1.next_contact_at).toBe(tomorrowStr)

    // STEP 11: sync with agenda_items follow-up
    const agendaItem = await syncLeadFollowUpAgendaItem({
      leadId: lead.id,
      leadName: lead.name,
      nextContactAt: tomorrowStr,
      nextAction: 'Ligar para paciente',
      commercialFunctionId: testFunctionId,
      commercialPersonId: testPersonId || null,
    })
    expect(agendaItem).toBeDefined()
    expect(agendaItem.due_date).toBe(tomorrowStr)
    expect(agendaItem.type).toBe('follow_up')
    expect(agendaItem.source_id).toBe(lead.id)
    createdAgendaItemIds.push(agendaItem.id)

    // STEP 12: verify upcoming follow-up queue logic
    expect(updatedAfterContact1.next_contact_at > todayStr).toBe(true)

    // STEP 13: simulate overdue follow-up date (set date to yesterday)
    const updatedOverdue = await updateLead(lead.id, {
      next_contact_at: yesterdayStr,
      next_follow_up_at: `${yesterdayStr}T14:00:00Z`,
      next_action: 'Atrasado — Ligar com urgência',
    })
    expect(updatedOverdue.next_contact_at).toBe(yesterdayStr)

    // STEP 14: verify overdue behavior — overdue stays visible and is NOT auto-completed
    const reloadedOverdue = await getLeadById(lead.id)
    expect(reloadedOverdue?.next_contact_at).toBe(yesterdayStr)
    expect(reloadedOverdue?.stage).toBe('novo') // Still active, not marked completed or lost!

    // STEP 15: register second contact interaction (patient answered and scheduled evaluation)
    const contact2 = await createLeadContact({
      lead_id: lead.id,
      channel: 'Telefone',
      outcome: 'Avaliação agendada',
      notes: 'Paciente atendeu! Gostou da explicação sobre implantes e agendou avaliação.',
      function_id: testFunctionId,
      person_id: testPersonId || null,
      next_action: 'Enviar confirmação 24h antes da avaliação clínica',
      next_follow_up_at: `${tomorrowStr}T15:00:00Z`,
    })
    expect(contact2).toBeDefined()
    expect(contact2.id).toBeDefined()

    // STEP 16: confirm previous contact history remains completely unchanged (immutability)
    const history2 = await fetchLeadContacts(lead.id)
    expect(history2.length).toBe(2)
    const foundContact1 = history2.find((c) => c.id === contact1.id)
    expect(foundContact1).toBeDefined()
    expect(foundContact1?.notes).toContain('Primeiro contato enviado')
    expect(foundContact1?.outcome).toBe('Mensagem enviada')

    // STEP 17: change status to avaliacao_agendada and update follow-up
    const updatedAfterContact2 = await updateLead(lead.id, {
      stage: 'avaliacao_agendada',
      evaluation_scheduled_at: `${tomorrowStr}T15:00:00Z`,
      last_contact_at: new Date().toISOString(),
      next_action: 'Enviar confirmação 24h antes da avaliação clínica',
      next_contact_at: tomorrowStr,
      next_follow_up_at: `${tomorrowStr}T15:00:00Z`,
    })
    expect(updatedAfterContact2.stage).toBe('avaliacao_agendada')

    // STEP 18: verify idempotent agenda sync — does not create duplicates
    const agendaItem2 = await syncLeadFollowUpAgendaItem({
      leadId: lead.id,
      leadName: lead.name,
      nextContactAt: tomorrowStr,
      nextAction: 'Confirmar avaliação',
      commercialFunctionId: testFunctionId,
      commercialPersonId: testPersonId || null,
    })
    expect(agendaItem2.id).toBe(agendaItem.id) // Same item updated, no duplicates!

    // STEP 19: reload and verify all state is persistent
    const reloadedFinal = await getLeadById(lead.id)
    expect(reloadedFinal?.stage).toBe('avaliacao_agendada')
    expect(reloadedFinal?.last_contact_at).not.toBeNull()
    expect(reloadedFinal?.next_contact_at).toBe(tomorrowStr)

    // STEP 20: cleanup test artifacts
    await (supabase.from('lead_contacts') as any).delete().eq('lead_id', lead.id)
    await (supabase.from('agenda_items') as any).delete().eq('source_id', lead.id)
    await (supabase.from('leads') as any).delete().eq('id', lead.id)

    const checkCleaned = await getLeadById(lead.id)
    expect(checkCleaned).toBeNull()
  })
})
