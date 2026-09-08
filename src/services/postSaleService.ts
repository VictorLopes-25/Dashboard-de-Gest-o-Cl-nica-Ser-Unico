import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'
import type {
  PostSale,
  PostSaleStatus,
  PostSaleOutcome,
  ReferralCampaign,
  Referral,
  Treatment,
} from '@/types'

// -------------------------------------------------------------------------
// TRATAMENTOS
// -------------------------------------------------------------------------

export async function fetchTreatments(leadId?: string): Promise<Treatment[]> {
  const orgId = await getOrganizationId()
  let query = (supabase as any)
    .from('treatments')
    .select('id, organization_id, lead_id, name, status, completed_at, created_at, leads(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (leadId) {
    query = query.eq('lead_id', leadId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar tratamentos:', error)
    throw error
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    organizationId: t.organization_id,
    leadId: t.lead_id,
    leadName: t.leads?.name || 'Paciente',
    name: t.name,
    status: t.status,
    completedAt: t.completed_at,
    createdAt: t.created_at,
  }))
}

export async function createTreatment(leadId: string, name: string): Promise<Treatment> {
  const orgId = await getOrganizationId()
  const { data, error } = await (supabase as any)
    .from('treatments')
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      name: name.trim(),
      status: 'em_andamento',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar tratamento:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    leadId: data.lead_id,
    name: data.name,
    status: data.status,
    completedAt: data.completed_at,
    createdAt: data.created_at,
  }
}

/**
 * TRIGGER REAL: Confirmação de término do tratamento.
 * Dispara confirm_treatment_completion no banco gerando T+30 determinístico.
 */
export async function confirmTreatmentCompletionRpc(
  treatmentId: string,
  completedAt?: string,
): Promise<{
  success: boolean
  treatment_id: string
  post_sale_id: string
  due_date: string
  agenda_item_id: string
}> {
  const { data, error } = await (supabase as any).rpc('confirm_treatment_completion', {
    p_treatment_id: treatmentId,
    p_completed_at: completedAt || new Date().toISOString(),
  })

  if (error) {
    console.error('Erro ao confirmar conclusão de tratamento:', error)
    throw error
  }

  return data
}

// -------------------------------------------------------------------------
// CAMPANHAS DE INDICAÇÃO (REFERRAL CAMPAIGNS)
// -------------------------------------------------------------------------

export async function fetchReferralCampaigns(onlyActive = false): Promise<ReferralCampaign[]> {
  const orgId = await getOrganizationId()
  let query = (supabase as any)
    .from('referral_campaigns')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (onlyActive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar campanhas de indicação:', error)
    throw error
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    organizationId: c.organization_id,
    name: c.name,
    description: c.description || '',
    active: c.active,
    startDate: c.start_date,
    endDate: c.end_date,
    rewardConfig: c.reward_config || {},
    instructionsScript: c.instructions_script || '',
    createdBy: c.created_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }))
}

export async function getActiveReferralCampaign(): Promise<ReferralCampaign | null> {
  const campaigns = await fetchReferralCampaigns(true)
  return campaigns.length > 0 ? campaigns[0] : null
}

export async function createReferralCampaign(payload: {
  name: string
  description?: string
  active?: boolean
  startDate?: string | null
  endDate?: string | null
  rewardConfig?: Record<string, any>
  instructionsScript?: string
}): Promise<ReferralCampaign> {
  const orgId = await getOrganizationId()
  const { data, error } = await (supabase as any)
    .from('referral_campaigns')
    .insert({
      organization_id: orgId,
      name: payload.name.trim(),
      description: payload.description || '',
      active: payload.active ?? true,
      start_date: payload.startDate || null,
      end_date: payload.endDate || null,
      reward_config: payload.rewardConfig || {},
      instructions_script: payload.instructionsScript || '',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar campanha de indicação:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    description: data.description,
    active: data.active,
    startDate: data.start_date,
    endDate: data.end_date,
    rewardConfig: data.reward_config,
    instructionsScript: data.instructions_script,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateReferralCampaign(
  id: string,
  updates: Partial<{
    name: string
    description: string
    active: boolean
    startDate: string | null
    endDate: string | null
    rewardConfig: Record<string, any>
    instructionsScript: string
  }>,
): Promise<ReferralCampaign> {
  const orgId = await getOrganizationId()
  const dbUpdates: any = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim()
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.active !== undefined) dbUpdates.active = updates.active
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
  if (updates.rewardConfig !== undefined) dbUpdates.reward_config = updates.rewardConfig
  if (updates.instructionsScript !== undefined)
    dbUpdates.instructions_script = updates.instructionsScript

  const { data, error } = await (supabase as any)
    .from('referral_campaigns')
    .update(dbUpdates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar campanha:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    description: data.description,
    active: data.active,
    startDate: data.start_date,
    endDate: data.end_date,
    rewardConfig: data.reward_config,
    instructionsScript: data.instructions_script,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// -------------------------------------------------------------------------
// PÓS-VENDA (POST SALES T+30)
// -------------------------------------------------------------------------

export async function fetchPostSales(): Promise<PostSale[]> {
  const orgId = await getOrganizationId()
  const { data, error } = await (supabase as any)
    .from('post_sales')
    .select(
      `
      *,
      treatments(name, completed_at),
      leads:patient_lead_id(name, phone),
      people:contacted_by_person_id(name),
      resolver:dissatisfaction_resolved_by(name)
    `,
    )
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Erro ao buscar pós-vendas:', error)
    throw error
  }

  return (data || []).map((ps: any) => ({
    id: ps.id,
    organizationId: ps.organization_id,
    treatmentId: ps.treatment_id,
    patientLeadId: ps.patient_lead_id,
    patientName: ps.leads?.name || 'Paciente',
    patientPhone: ps.leads?.phone || '',
    treatmentName: ps.treatments?.name || 'Tratamento Concluído',
    treatmentCompletedAt: ps.treatments?.completed_at,
    dueDate: ps.due_date,
    status: ps.status,
    outcome: ps.outcome,
    contactNotes: ps.contact_notes,
    dissatisfactionReason: ps.dissatisfaction_reason,
    dissatisfactionStatus: ps.dissatisfaction_status,
    dissatisfactionResolution: ps.dissatisfaction_resolution,
    dissatisfactionResolvedAt: ps.dissatisfaction_resolved_at,
    dissatisfactionResolvedBy: ps.dissatisfaction_resolved_by,
    dissatisfactionResolvedByName: ps.resolver?.name,
    contactedAt: ps.contacted_at,
    contactedByPersonId: ps.contacted_by_person_id,
    contactedByPersonName: ps.people?.name,
    responsibleFunctionId: ps.responsible_function_id,
    campaignIdPresented: ps.campaign_id_presented,
    campaignNamePresented: ps.campaign_name_presented,
    campaignSnapshot: ps.campaign_snapshot,
    nextContactAt: ps.next_contact_at,
    createdAt: ps.created_at,
    updatedAt: ps.updated_at,
  }))
}

export interface RecordSatisfactionPayload {
  postSaleId: string
  outcome: PostSaleOutcome
  contactNotes?: string
  dissatisfactionReason?: string
  nextContactAt?: string
  campaignPresented?: ReferralCampaign | null
}

/**
 * Registra contato operacional T+30 e desfecho de satisfação.
 * Preserva rastreabilidade do autor (current_person_id) e snapshot histórico da campanha se apresentada.
 * Também conclui/atualiza a obrigação correspondente em agenda_items.
 */
export async function recordPostSaleSatisfaction(
  payload: RecordSatisfactionPayload,
): Promise<PostSale> {
  const orgId = await getOrganizationId()
  const { data: currentPersonId } = await (supabase as any).rpc('current_person_id')
  const nowIso = new Date().toISOString()

  let newStatus: PostSaleStatus = 'contatado'
  if (payload.outcome === 'insatisfeito') {
    newStatus = 'insatisfeito'
  } else if (payload.outcome === 'sem_resposta') {
    newStatus = 'sem_resposta'
  } else if (payload.outcome === 'reagendado') {
    newStatus = 'reagendado'
  }

  const updates: any = {
    status: newStatus,
    outcome: payload.outcome,
    contact_notes: payload.contactNotes || '',
    contacted_at: nowIso,
    contacted_by_person_id: currentPersonId || null,
    next_contact_at: payload.nextContactAt || null,
    updated_at: nowIso,
  }

  if (payload.outcome === 'insatisfeito') {
    updates.dissatisfaction_reason = payload.dissatisfactionReason || payload.contactNotes || ''
    updates.dissatisfaction_status = 'pendente'
    // Não apresenta campanha para paciente insatisfeito!
    updates.campaign_id_presented = null
    updates.campaign_name_presented = null
    updates.campaign_snapshot = null
  } else if (payload.outcome === 'satisfeito' && payload.campaignPresented) {
    // Preservação exata da campanha apresentada no momento (snapshot)
    updates.campaign_id_presented = payload.campaignPresented.id
    updates.campaign_name_presented = payload.campaignPresented.name
    updates.campaign_snapshot = {
      id: payload.campaignPresented.id,
      name: payload.campaignPresented.name,
      description: payload.campaignPresented.description,
      rewardConfig: payload.campaignPresented.rewardConfig,
      presentedAt: nowIso,
    }
  }

  const { data, error } = await (supabase as any)
    .from('post_sales')
    .update(updates)
    .eq('id', payload.postSaleId)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao registrar satisfação de pós-venda:', error)
    throw error
  }

  // Atualizar a obrigação na agenda_items
  if (payload.outcome === 'satisfeito' || payload.outcome === 'insatisfeito') {
    await (supabase as any)
      .from('agenda_items')
      .update({
        status: 'concluido',
        completed_at: nowIso,
        feedback: `Pós-venda registrado: ${payload.outcome === 'satisfeito' ? 'Satisfeito' : 'Insatisfeito (aberto para resolução)'}`,
      })
      .eq('source_type', 'post_sale')
      .eq('source_id', payload.postSaleId)
      .eq('organization_id', orgId)
  } else if (payload.outcome === 'reagendado' && payload.nextContactAt) {
    await (supabase as any)
      .from('agenda_items')
      .update({
        due_date: payload.nextContactAt,
        notes: `Contato reagendado para ${payload.nextContactAt}.`,
      })
      .eq('source_type', 'post_sale')
      .eq('source_id', payload.postSaleId)
      .eq('organization_id', orgId)
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    treatmentId: data.treatment_id,
    patientLeadId: data.patient_lead_id,
    dueDate: data.due_date,
    status: data.status,
    outcome: data.outcome,
    contactNotes: data.contact_notes,
    dissatisfactionReason: data.dissatisfaction_reason,
    dissatisfactionStatus: data.dissatisfaction_status,
    dissatisfactionResolution: data.dissatisfaction_resolution,
    dissatisfactionResolvedAt: data.dissatisfaction_resolved_at,
    dissatisfactionResolvedBy: data.dissatisfaction_resolved_by,
    contactedAt: data.contacted_at,
    contactedByPersonId: data.contacted_by_person_id,
    responsibleFunctionId: data.responsible_function_id,
    campaignIdPresented: data.campaign_id_presented,
    campaignNamePresented: data.campaign_name_presented,
    campaignSnapshot: data.campaign_snapshot,
    nextContactAt: data.next_contact_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Resolve insatisfação registrada (gestão / pós-venda).
 */
export async function resolveDissatisfaction(
  postSaleId: string,
  resolutionNotes: string,
): Promise<PostSale> {
  const orgId = await getOrganizationId()
  const { data: currentPersonId } = await (supabase as any).rpc('current_person_id')
  const nowIso = new Date().toISOString()

  const { data, error } = await (supabase as any)
    .from('post_sales')
    .update({
      dissatisfaction_status: 'resolvido',
      dissatisfaction_resolution: resolutionNotes.trim(),
      dissatisfaction_resolved_at: nowIso,
      dissatisfaction_resolved_by: currentPersonId || null,
      updated_at: nowIso,
    })
    .eq('id', postSaleId)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao resolver insatisfação:', error)
    throw error
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    treatmentId: data.treatment_id,
    patientLeadId: data.patient_lead_id,
    dueDate: data.due_date,
    status: data.status,
    outcome: data.outcome,
    contactNotes: data.contact_notes,
    dissatisfactionReason: data.dissatisfaction_reason,
    dissatisfactionStatus: data.dissatisfaction_status,
    dissatisfactionResolution: data.dissatisfaction_resolution,
    dissatisfactionResolvedAt: data.dissatisfaction_resolved_at,
    dissatisfactionResolvedBy: data.dissatisfaction_resolved_by,
    contactedAt: data.contacted_at,
    contactedByPersonId: data.contacted_by_person_id,
    responsibleFunctionId: data.responsible_function_id,
    campaignIdPresented: data.campaign_id_presented,
    campaignNamePresented: data.campaign_name_presented,
    campaignSnapshot: data.campaign_snapshot,
    nextContactAt: data.next_contact_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// -------------------------------------------------------------------------
// INDICAÇÕES (REFERRALS & REFERRAL -> LEAD PIPELINE)
// -------------------------------------------------------------------------

export async function fetchReferrals(): Promise<Referral[]> {
  const orgId = await getOrganizationId()
  const { data, error } = await (supabase as any)
    .from('referrals')
    .select(
      `
      *,
      source:source_lead_id(name),
      campaign:campaign_id(name),
      registrar:registered_by_person_id(name),
      resulting_lead:resulting_lead_id(stage)
    `,
    )
    .eq('organization_id', orgId)
    .order('registered_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar indicações:', error)
    throw error
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    organizationId: r.organization_id,
    sourceLeadId: r.source_lead_id,
    sourceLeadName: r.source?.name || 'Paciente Indicador',
    sourceTreatmentId: r.source_treatment_id,
    postSaleId: r.post_sale_id,
    campaignId: r.campaign_id,
    campaignName: r.campaign?.name,
    referredName: r.referred_name,
    referredPhone: r.referred_phone,
    referredNotes: r.referred_notes,
    resultingLeadId: r.resulting_lead_id,
    resultingLeadStage: r.resulting_lead?.stage,
    registeredByPersonId: r.registered_by_person_id,
    registeredByPersonName: r.registrar?.name,
    registeredAt: r.registered_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export interface RegisterReferralPayload {
  sourceLeadId: string
  sourceTreatmentId?: string | null
  postSaleId?: string | null
  campaignId?: string | null
  referredName: string
  referredPhone: string
  referredNotes?: string
  createLeadDirectly?: boolean
}

/**
 * Registra indicação gerada e opcionalmente cria lead imediato na estrutura canônica de leads (CRM).
 * Preserva rastreabilidade: origin='indicacao', referred_by_lead_id=sourceLeadId, campaign=campaignName
 */
export async function registerReferral(payload: RegisterReferralPayload): Promise<{
  referral: Referral
  leadId?: string
}> {
  const orgId = await getOrganizationId()
  const { data: currentPersonId } = await (supabase as any).rpc('current_person_id')
  const nowIso = new Date().toISOString()

  let resultingLeadId: string | null = null

  // Se solicitado criar o lead direto no CRM do SKIP
  if (payload.createLeadDirectly) {
    // Buscar nome do indicador e campanha para attribution
    const [{ data: sourceLead }, { data: campaign }] = await Promise.all([
      (supabase as any).from('leads').select('name').eq('id', payload.sourceLeadId).single(),
      payload.campaignId
        ? (supabase as any)
            .from('referral_campaigns')
            .select('name')
            .eq('id', payload.campaignId)
            .single()
        : Promise.resolve({ data: null }),
    ])

    // Resolver CRC Comercial para commercial_function_id
    const { data: crcFunc } = await (supabase as any)
      .from('functions')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'CRC Comercial')
      .single()

    const { data: newLead, error: leadError } = await (supabase as any)
      .from('leads')
      .insert({
        organization_id: orgId,
        name: payload.referredName.trim(),
        phone: payload.referredPhone.trim(),
        origin: 'indicacao',
        referred_by_lead_id: payload.sourceLeadId,
        referred_by_name: sourceLead?.name || 'Paciente Indicador',
        campaign: campaign?.name || 'Campanha de Indicação Pós-Venda',
        stage: 'novo',
        next_action: 'Primeiro contato com indicado do pós-venda',
        next_contact_at: new Date().toISOString().slice(0, 10),
        commercial_function_id: crcFunc?.id || null,
        commercial_person_id: currentPersonId || null,
        interest: payload.referredNotes || 'Indicação de paciente',
      })
      .select()
      .single()

    if (leadError) {
      console.error('Erro ao criar lead derivado de indicação:', leadError)
      throw leadError
    }

    resultingLeadId = newLead.id
  }

  const { data: refData, error: refError } = await (supabase as any)
    .from('referrals')
    .insert({
      organization_id: orgId,
      source_lead_id: payload.sourceLeadId,
      source_treatment_id: payload.sourceTreatmentId || null,
      post_sale_id: payload.postSaleId || null,
      campaign_id: payload.campaignId || null,
      referred_name: payload.referredName.trim(),
      referred_phone: payload.referredPhone.trim(),
      referred_notes: payload.referredNotes || '',
      resulting_lead_id: resultingLeadId,
      registered_by_person_id: currentPersonId || null,
      registered_at: nowIso,
    })
    .select()
    .single()

  if (refError) {
    console.error('Erro ao registrar indicação:', refError)
    throw refError
  }

  return {
    referral: {
      id: refData.id,
      organizationId: refData.organization_id,
      sourceLeadId: refData.source_lead_id,
      sourceTreatmentId: refData.source_treatment_id,
      postSaleId: refData.post_sale_id,
      campaignId: refData.campaign_id,
      referredName: refData.referred_name,
      referredPhone: refData.referred_phone,
      referredNotes: refData.referred_notes,
      resultingLeadId: refData.resulting_lead_id,
      registeredByPersonId: refData.registered_by_person_id,
      registeredAt: refData.registered_at,
      createdAt: refData.created_at,
      updatedAt: refData.updated_at,
    },
    leadId: resultingLeadId || undefined,
  }
}
