import { describe, it, expect, beforeAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import {
  confirmTreatmentCompletionRpc,
  recordPostSaleSatisfaction,
  resolveDissatisfaction,
  registerReferral,
  fetchReferralCampaigns,
  fetchPostSales,
  fetchReferrals,
} from '@/services/postSaleService'
import { derivePendingItems } from '@/services/exceptionsService'

describe('STAGE 4G: Post-Sale & Referral Acceptance Tests', () => {
  let orgId: string
  let testLeadId: string
  let testTreatmentId: string

  beforeAll(async () => {
    orgId = await getOrganizationId()

    // Garantir lead de teste para o fluxo
    const { data: lead, error: leadErr } = await (supabase as any)
      .from('leads')
      .insert({
        organization_id: orgId,
        name: 'Paciente Teste Stage 4G',
        phone: '11999990041',
        origin: 'google',
        stage: 'fechado',
        interest: 'Implante Dentário',
      })
      .select()
      .single()

    if (leadErr || !lead) {
      throw new Error(`Falha ao criar lead de teste: ${leadErr?.message}`)
    }
    testLeadId = lead.id

    // Garantir tratamento em andamento para o lead
    const { data: tr, error: trErr } = await (supabase as any)
      .from('treatments')
      .insert({
        organization_id: orgId,
        lead_id: testLeadId,
        name: 'Tratamento de Implante Completo',
        status: 'em_andamento',
      })
      .select()
      .single()

    if (trErr || !tr) {
      throw new Error(`Falha ao criar tratamento de teste: ${trErr?.message}`)
    }
    testTreatmentId = tr.id
  })

  it('CRITERION A & B: Confirming treatment completion generates deterministic T+30 due date and is idempotent', async () => {
    const fixedCompletionTime = new Date('2026-08-01T10:00:00Z').toISOString()
    const result1 = await confirmTreatmentCompletionRpc(testTreatmentId, fixedCompletionTime)

    expect(result1.success).toBe(true)
    expect(result1.treatment_id).toBe(testTreatmentId)
    expect(result1.due_date).toBe('2026-08-31') // 2026-08-01 + 30 days = 2026-08-31

    // Verificar se treatment está concluído no banco
    const { data: trDb } = await (supabase as any)
      .from('treatments')
      .select('status, completed_at')
      .eq('id', testTreatmentId)
      .single()
    expect(trDb.status).toBe('concluido')
    expect(trDb.completed_at).toBe(fixedCompletionTime)

    // Reprocessar (Idempotência — Criterion B)
    const result2 = await confirmTreatmentCompletionRpc(testTreatmentId, fixedCompletionTime)
    expect(result2.success).toBe(true)
    expect(result2.post_sale_id).toBe(result1.post_sale_id)

    // Verificar que existe exatamente 1 post_sale para esse tratamento
    const { count } = await (supabase as any)
      .from('post_sales')
      .select('*', { count: 'exact', head: true })
      .eq('treatment_id', testTreatmentId)
    expect(count).toBe(1)
  })

  it('CRITERION C & D: Obligation is created in agenda_items for CRC and unhandled stays pending/overdue', async () => {
    // Agenda item correspondente ao post_sale
    const { data: agendaItem } = await (supabase as any)
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'post_sale')
      .eq('due_date', '2026-08-31')
      .single()

    expect(agendaItem).toBeTruthy()
    expect(agendaItem.type).toBe('pos_venda')
    expect(agendaItem.status).toBe('aberto')
    expect(agendaItem.due_date).toBe('2026-08-31')
  })

  it('CRITERION E & F: Satisfied patient preserves presented campaign snapshot historically', async () => {
    const campaigns = await fetchReferralCampaigns(true)
    expect(campaigns.length).toBeGreaterThan(0)
    const activeCamp = campaigns[0]

    // Buscar post_sale criado
    const { data: ps } = await (supabase as any)
      .from('post_sales')
      .select('*')
      .eq('treatment_id', testTreatmentId)
      .single()

    // Registrar satisfação
    const updated = await recordPostSaleSatisfaction({
      postSaleId: ps.id,
      outcome: 'satisfeito',
      contactNotes: 'Paciente relatou mastigação perfeita e excelente recuperação.',
      campaignPresented: activeCamp,
    })

    expect(updated.status).toBe('contatado')
    expect(updated.outcome).toBe('satisfeito')
    expect(updated.campaignIdPresented).toBe(activeCamp.id)
    expect(updated.campaignNamePresented).toBe(activeCamp.name)
    expect(updated.campaignSnapshot).toBeTruthy()
    expect(updated.campaignSnapshot.name).toBe(activeCamp.name)

    // Verificar que agenda_items foi concluído
    const { data: agendaUpdated } = await (supabase as any)
      .from('agenda_items')
      .select('status')
      .eq('source_type', 'post_sale')
      .eq('source_id', ps.id)
      .single()
    expect(agendaUpdated.status).toBe('concluido')
  })

  it('CRITERION G & H: Referral registration links to source and creates lead using existing CRM leads architecture', async () => {
    const { data: ps } = await (supabase as any)
      .from('post_sales')
      .select('*')
      .eq('treatment_id', testTreatmentId)
      .single()

    const { referral, leadId } = await registerReferral({
      sourceLeadId: testLeadId,
      sourceTreatmentId: testTreatmentId,
      postSaleId: ps.id,
      campaignId: ps.campaign_id_presented,
      referredName: 'Amigo Indicado Teste 4G',
      referredPhone: '11988887777',
      referredNotes: 'Interesse em clareamento',
      createLeadDirectly: true,
    })

    expect(referral.id).toBeTruthy()
    expect(referral.sourceLeadId).toBe(testLeadId)
    expect(referral.resultingLeadId).toBeTruthy()
    expect(leadId).toBeTruthy()

    // Verificar no CRM leads canônico
    const { data: leadDb } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    expect(leadDb.name).toBe('Amigo Indicado Teste 4G')
    expect(leadDb.phone).toBe('11988887777')
    expect(leadDb.origin).toBe('indicacao')
    expect(leadDb.referred_by_lead_id).toBe(testLeadId)
    expect(leadDb.campaign).toBeTruthy()
    expect(leadDb.stage).toBe('novo')
  })

  it('CRITERION I & M: Dissatisfied patient blocks campaign and creates resolution path + Exception Engine receives meaningful deviation', async () => {
    // 1. Criar novo lead e tratamento para testar insatisfação
    const { data: dissLead } = await (supabase as any)
      .from('leads')
      .insert({
        organization_id: orgId,
        name: 'Paciente Insatisfeito Teste',
        phone: '11977770099',
        origin: 'indicacao',
        stage: 'fechado',
      })
      .select()
      .single()

    const { data: dissTr } = await (supabase as any)
      .from('treatments')
      .insert({
        organization_id: orgId,
        lead_id: dissLead.id,
        name: 'Tratamento Prótese Fixa',
        status: 'em_andamento',
      })
      .select()
      .single()

    const compRes = await confirmTreatmentCompletionRpc(dissTr.id)

    // 2. Registrar contato com insatisfação
    const dissPostSale = await recordPostSaleSatisfaction({
      postSaleId: compRes.post_sale_id,
      outcome: 'insatisfeito',
      contactNotes: 'Paciente relatou desconforto na mordida',
      dissatisfactionReason: 'Mordida alta e desconforto ao mastigar',
    })

    expect(dissPostSale.outcome).toBe('insatisfeito')
    expect(dissPostSale.dissatisfactionStatus).toBe('pendente')
    // Campanha deve ser NULA / Bloqueada
    expect(dissPostSale.campaignIdPresented).toBeNull()
    expect(dissPostSale.campaignSnapshot).toBeNull()

    // 3. Exception Engine derivação (Criterion M)
    const derived = derivePendingItems(
      {
        agendaItems: [],
        leads: [],
        tasks: [],
        roles: [{ id: 'role-crc', name: 'CRC Comercial' }],
        collaborators: [],
        activeAssignments: [],
        postSales: [
          {
            id: dissPostSale.id,
            dueDate: dissPostSale.dueDate,
            status: dissPostSale.status,
            outcome: dissPostSale.outcome,
            dissatisfactionStatus: dissPostSale.dissatisfactionStatus,
            dissatisfactionReason: dissPostSale.dissatisfactionReason,
            patientName: 'Paciente Insatisfeito Teste',
            treatmentName: 'Tratamento Prótese Fixa',
            responsibleFunctionId: 'role-crc',
          },
        ],
      },
      { post_sale_delay_tolerance_days: 3 },
    )

    const dissException = derived.find(
      (d) => d.sourceType === 'post_sale' && d.sourceId === dissPostSale.id,
    )
    expect(dissException).toBeTruthy()
    expect(dissException?.title).toContain('Insatisfação pós-venda')
    expect(dissException?.managementDecisionRequired).toBe(true)
    expect(dissException?.severity).toBe('alta')

    // 4. Resolução da insatisfação pela gestão
    const resolved = await resolveDissatisfaction(
      dissPostSale.id,
      'Ajuste oclusal realizado com sucesso no consultório.',
    )
    expect(resolved.dissatisfactionStatus).toBe('resolvido')
    expect(resolved.dissatisfactionResolution).toBe(
      'Ajuste oclusal realizado com sucesso no consultório.',
    )
  })

  it('CRITERION L: Goals/Metrics integration evaluates Stage 4G metrics correctly', async () => {
    // Verificar que a função calculate_goal_metric suporta os novos enums sem erro
    const { data: goal, error: gErr } = await (supabase as any)
      .from('goals')
      .insert({
        organization_id: orgId,
        metric: 'referrals_generated',
        target: 5,
        period_type: 'monthly',
        period_start: '2026-08-01',
        period_end: '2026-09-30',
        status: 'active',
      })
      .select()
      .single()

    expect(gErr).toBeNull()
    expect(goal).toBeTruthy()

    const { data: calcResult, error: calcErr } = await (supabase as any).rpc(
      'calculate_goal_metric',
      {
        p_goal_id: goal.id,
      },
    )

    expect(calcErr).toBeNull()
    expect(calcResult.goal_id).toBe(goal.id)
    expect(calcResult.metric).toBe('referrals_generated')
    expect(Number(calcResult.actual)).toBeGreaterThanOrEqual(1)
    expect(calcResult.evidence_source).toContain('indicações')

    // Limpar meta de teste
    await (supabase as any).from('goals').delete().eq('id', goal.id)
  })
})
