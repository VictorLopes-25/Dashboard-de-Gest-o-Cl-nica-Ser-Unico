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
  validateLeadConstraints,
} from '@/services/leadsService'
import { createScript, updateScript, fetchScripts, deleteScript } from '@/services/scriptsService'
import {
  syncLeadFollowUpAgendaItem,
  completeAgendaItem,
  fetchTodayAgenda,
} from '@/services/agendaService'

describe('STAGE 2C — CRM Commercial Workflow Persistence & Validation', () => {
  let orgId: string
  const createdLeadIds: string[] = []
  const createdScriptIds: string[] = []
  const createdAgendaItemIds: string[] = []
  const todayStr = new Date().toISOString().split('T')[0]

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeDefined()
  })

  afterAll(async () => {
    // Cleanup de segurança: remover qualquer dado de teste criado
    for (const id of createdAgendaItemIds) {
      await supabase.from('agenda_items').delete().eq('id', id)
    }
    for (const id of createdScriptIds) {
      await supabase.from('scripts').delete().eq('id', id)
    }
    for (const id of createdLeadIds) {
      await supabase.from('lead_contacts').delete().eq('lead_id', id)
      await supabase.from('agenda_items').delete().eq('source_id', id)
      await supabase.from('leads').delete().eq('id', id)
    }
  })

  // Validação A: Criar lead → persiste no Supabase → reload mantém
  it('A. Criar lead → persiste no Supabase com campos reais', async () => {
    const lead = await createLead({
      name: 'TEST LEAD A — Validação 2C',
      phone: '(11) 99999-1111',
      origin: 'meta_ads',
      campaign: 'Implantes',
      stage: 'novo',
      next_action: 'Primeiro contato via WhatsApp',
      next_contact_at: todayStr,
    })

    expect(lead).toBeDefined()
    expect(lead.id).toBeDefined()
    expect(lead.name).toBe('TEST LEAD A — Validação 2C')
    expect(lead.origin).toBe('meta_ads')
    expect(lead.stage).toBe('novo')
    expect(lead.next_contact_at).toBe(todayStr)
    createdLeadIds.push(lead.id)

    // Confirma leitura direta do banco (recarregamento)
    const reloaded = await getLeadById(lead.id)
    expect(reloaded).not.toBeNull()
    expect(reloaded?.name).toBe('TEST LEAD A — Validação 2C')
  })

  // Validação B: Transição de estágio → persiste + next_contact_at exigido
  it('B. Transição de estágio (novo -> avaliacao_agendada) e validação de constraints', async () => {
    const lead = await createLead({
      name: 'TEST LEAD B — Stage Transition',
      phone: '(11) 98888-2222',
      origin: 'indicacao',
      referred_by_name: 'Dra. Camila Indicou',
      stage: 'novo',
      next_contact_at: todayStr,
    })
    createdLeadIds.push(lead.id)

    // Transição para avaliacao_agendada mantendo next_contact_at
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const updated = await updateLead(lead.id, {
      stage: 'avaliacao_agendada',
      next_contact_at: tomorrow,
      next_action: 'Enviar confirmação 24h antes da consulta',
    })

    expect(updated.stage).toBe('avaliacao_agendada')
    expect(updated.next_contact_at).toBe(tomorrow)

    // Teste de constraint: estágio ativo SEM next_contact_at deve falhar
    expect(() => {
      validateLeadConstraints({
        stage: 'avaliacao_agendada',
        next_contact_at: null,
      })
    }).toThrow()

    // Teste de constraint: indicação sem referred_by deve falhar
    expect(() => {
      validateLeadConstraints({
        origin: 'indicacao',
        referred_by_lead_id: null,
        referred_by_name: null,
        next_contact_at: todayStr,
      })
    }).toThrow()
  })

  // Validação C: Follow-up criado → aparece na agenda HOJE como follow_up real
  it('C. Follow-up criado → sincroniza na agenda unificada como type="follow_up"', async () => {
    const lead = await createLead({
      name: 'TEST LEAD C — Agenda Follow-up',
      phone: '(11) 97777-3333',
      origin: 'google',
      stage: 'novo',
      next_action: 'Ligar para sondar interesse',
      next_contact_at: todayStr,
    })
    createdLeadIds.push(lead.id)

    const agendaItem = await syncLeadFollowUpAgendaItem({
      leadId: lead.id,
      leadName: lead.name,
      nextContactAt: todayStr,
      nextAction: lead.next_action,
    })

    expect(agendaItem.id).toBeDefined()
    expect(agendaItem.type).toBe('follow_up')
    expect(agendaItem.source_type).toBe('lead')
    expect(agendaItem.source_id).toBe(lead.id)
    expect(agendaItem.due_date).toBe(todayStr)
    expect(agendaItem.status).toBe('aberto')
    createdAgendaItemIds.push(agendaItem.id)

    // Busca agenda de hoje e confirma presença
    const todayAgenda = await fetchTodayAgenda(todayStr)
    const existsInToday = todayAgenda.todayOpen.some((i) => i.id === agendaItem.id)
    expect(existsInToday).toBe(true)
  })

  // Validação D: Completar follow-up → agenda atualiza + lead_contact registrado
  it('D. Concluir follow-up na agenda e registrar contato no lead_contacts', async () => {
    const lead = await createLead({
      name: 'TEST LEAD D — Conclusão de Follow-up',
      phone: '(11) 96666-4444',
      origin: 'organico',
      stage: 'novo',
      next_contact_at: todayStr,
    })
    createdLeadIds.push(lead.id)

    const agendaItem = await syncLeadFollowUpAgendaItem({
      leadId: lead.id,
      leadName: lead.name,
      nextContactAt: todayStr,
      nextAction: 'Verificar resposta do WhatsApp',
    })
    createdAgendaItemIds.push(agendaItem.id)

    // Concluir item na agenda
    const completed = await completeAgendaItem(agendaItem.id)
    expect(completed.status).toBe('concluido')
    expect(completed.completed_at).not.toBeNull()

    // Registrar contato imutável
    const contact = await createLeadContact({
      lead_id: lead.id,
      channel: 'WhatsApp',
      notes: 'Paciente respondeu confirmando interesse para a próxima semana.',
    })

    expect(contact.id).toBeDefined()
    expect(contact.lead_id).toBe(lead.id)
    expect(contact.channel).toBe('WhatsApp')

    // Verificar histórico de contatos
    const history = await fetchLeadContacts(lead.id)
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].notes).toContain('Paciente respondeu confirmando interesse')
  })

  // Validação E: Lead perdido → lost_at + lost_reason persistem; lead fechado → closed_at persiste
  it('E. Lead perdido e fechado com timestamps e constraints', async () => {
    // 1. Lead perdido
    const leadLost = await createLead({
      name: 'TEST LEAD E1 — Perdido',
      origin: 'outros',
      stage: 'perdido',
      lost_at: new Date().toISOString(),
      lost_reason: 'Preço elevado',
    })
    createdLeadIds.push(leadLost.id)
    expect(leadLost.stage).toBe('perdido')
    expect(leadLost.lost_at).not.toBeNull()
    expect(leadLost.lost_reason).toBe('Preço elevado')
    expect(leadLost.closed_at).toBeNull()

    // 2. Lead fechado
    const leadClosed = await createLead({
      name: 'TEST LEAD E2 — Fechado',
      origin: 'meta_ads',
      stage: 'fechado',
      closed_at: new Date().toISOString(),
      sale_value: 4500.0,
      sale_date: todayStr,
    })
    createdLeadIds.push(leadClosed.id)
    expect(leadClosed.stage).toBe('fechado')
    expect(leadClosed.closed_at).not.toBeNull()
    expect(Number(leadClosed.sale_value)).toBe(4500)
    expect(leadClosed.lost_at).toBeNull()

    // Constraint mútua: não pode ter ambos
    expect(() => {
      validateLeadConstraints({
        stage: 'fechado',
        closed_at: new Date().toISOString(),
        lost_at: new Date().toISOString(),
      })
    }).toThrow()
  })

  // Validação F: Scripts CRUD persiste
  it('F. Scripts CRUD persiste no Supabase', async () => {
    const script = await createScript({
      title: 'TEST SCRIPT — Abordagem Inicial',
      stage: 'novo',
      content: 'Olá [Nome do Paciente], tudo bem? Somos da Ser Único Odontologia...',
      active: true,
    })
    expect(script.id).toBeDefined()
    expect(script.title).toBe('TEST SCRIPT — Abordagem Inicial')
    createdScriptIds.push(script.id)

    // Atualização
    const updated = await updateScript(script.id, {
      title: 'TEST SCRIPT — Abordagem Atualizada',
      active: false,
    })
    expect(updated.title).toBe('TEST SCRIPT — Abordagem Atualizada')
    expect(updated.active).toBe(false)

    // Leitura
    const allScripts = await fetchScripts(false)
    const found = allScripts.some((s) => s.id === script.id)
    expect(found).toBe(true)

    // Exclusão
    await deleteScript(script.id)
    const remaining = await fetchScripts(false)
    expect(remaining.some((s) => s.id === script.id)).toBe(false)
  })

  // Validação G: Limpeza garantida de todos os dados de teste
  it('G. Remove dados de teste criados nas asserções (TEMP_TEST_DATA_REMOVED)', async () => {
    for (const id of createdAgendaItemIds) {
      await supabase.from('agenda_items').delete().eq('id', id)
    }
    for (const id of createdScriptIds) {
      await supabase.from('scripts').delete().eq('id', id)
    }
    for (const id of createdLeadIds) {
      await supabase.from('lead_contacts').delete().eq('lead_id', id)
      await supabase.from('agenda_items').delete().eq('source_id', id)
      await supabase.from('leads').delete().eq('id', id)
    }

    // Verificar se não sobrou nenhum lead de teste
    const { data: testLeads } = await supabase.from('leads').select('id').like('name', 'TEST LEAD%')

    expect(testLeads?.length || 0).toBe(0)
  })
})
