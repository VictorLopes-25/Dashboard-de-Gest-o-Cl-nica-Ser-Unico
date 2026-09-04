import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from './organizationService'
import type { LeadStage, LeadOrigin } from '@/types'

export interface DbLead {
  id: string
  organization_id: string
  name: string
  phone: string | null
  origin: LeadOrigin
  referred_by_lead_id: string | null
  referred_by_name: string | null
  campaign: string | null
  stage: LeadStage
  lost_reason: string | null
  next_action: string | null
  next_contact_at: string | null // date YYYY-MM-DD
  commercial_function_id: string | null
  commercial_person_id: string | null
  evaluator_person_id: string | null
  evaluation_scheduled_at: string | null
  evaluation_completed_at: string | null
  sale_value: number | null
  sale_date: string | null
  closed_at: string | null
  lost_at: string | null
  created_at: string
}

export interface DbLeadContact {
  id: string
  organization_id: string
  lead_id: string
  contact_date: string
  channel: string | null
  notes: string | null
  person_id: string | null
  created_at: string
}

export interface CreateLeadPayload {
  name: string
  phone?: string | null
  origin: LeadOrigin
  referred_by_lead_id?: string | null
  referred_by_name?: string | null
  campaign?: string | null
  stage?: LeadStage
  next_action?: string | null
  next_contact_at?: string | null
  commercial_function_id?: string | null
  commercial_person_id?: string | null
  evaluator_person_id?: string | null
  evaluation_scheduled_at?: string | null
  evaluation_completed_at?: string | null
  sale_value?: number | null
  sale_date?: string | null
  closed_at?: string | null
  lost_at?: string | null
  lost_reason?: string | null
}

export interface UpdateLeadPayload {
  name?: string
  phone?: string | null
  origin?: LeadOrigin
  referred_by_lead_id?: string | null
  referred_by_name?: string | null
  campaign?: string | null
  stage?: LeadStage
  lost_reason?: string | null
  next_action?: string | null
  next_contact_at?: string | null
  commercial_function_id?: string | null
  commercial_person_id?: string | null
  evaluator_person_id?: string | null
  evaluation_scheduled_at?: string | null
  evaluation_completed_at?: string | null
  sale_value?: number | null
  sale_date?: string | null
  closed_at?: string | null
  lost_at?: string | null
}

export interface CreateLeadContactPayload {
  lead_id: string
  channel?: string | null
  notes?: string | null
  person_id?: string | null
  contact_date?: string
}

/**
 * Valida regras de negócio e constraints antes de persistir um lead no Supabase:
 * - stage ativo (não fechado/perdido) exige next_contact_at
 * - stage='fechado' exige closed_at e não pode ter lost_at
 * - stage='perdido' exige lost_at e não pode ter closed_at
 * - origin='indicacao' exige referred_by_lead_id OU referred_by_name
 */
export function validateLeadConstraints(data: {
  origin?: LeadOrigin
  stage?: LeadStage
  referred_by_lead_id?: string | null
  referred_by_name?: string | null
  next_contact_at?: string | null
  closed_at?: string | null
  lost_at?: string | null
}): void {
  const stage = data.stage || 'novo'
  const origin = data.origin

  // 1. Indicação exige referred_by_lead_id ou referred_by_name
  if (origin === 'indicacao') {
    if (!data.referred_by_lead_id && !data.referred_by_name?.trim()) {
      throw new Error(
        'Lead com origem "indicacao" exige preenchimento de "referred_by_lead_id" ou "referred_by_name".',
      )
    }
  }

  // 2. Stage ativo exige next_contact_at
  if (stage !== 'fechado' && stage !== 'perdido') {
    if (!data.next_contact_at) {
      throw new Error(
        `Para estágios ativos (${stage}), a data do próximo contato (next_contact_at) é obrigatória.`,
      )
    }
  }

  // 3. Stage fechado exige closed_at
  if (stage === 'fechado') {
    if (!data.closed_at) {
      throw new Error('Lead no estágio "fechado" exige o preenchimento de closed_at.')
    }
  }

  // 4. Stage perdido exige lost_at
  if (stage === 'perdido') {
    if (!data.lost_at) {
      throw new Error('Lead no estágio "perdido" exige o preenchimento de lost_at.')
    }
  }

  // 5. closed_at e lost_at não podem coexistir
  if (data.closed_at && data.lost_at) {
    throw new Error('Lead não pode ter closed_at e lost_at preenchidos simultaneamente.')
  }
}

/**
 * Busca todos os leads da organização ordenados por data de criação decrescente.
 */
export async function fetchLeads(): Promise<DbLead[]> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar leads:', error)
    throw new Error(`Falha ao buscar leads: ${error.message}`)
  }

  return (data || []) as DbLead[]
}

/**
 * Busca um lead por ID.
 */
export async function getLeadById(id: string): Promise<DbLead | null> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao buscar lead ${id}:`, error)
    throw new Error(`Falha ao buscar lead: ${error.message}`)
  }

  return data as DbLead | null
}

/**
 * Cria um novo lead em public.leads.
 * Aplica constraints e defaults.
 */
export async function createLead(payload: CreateLeadPayload): Promise<DbLead> {
  const orgId = await getOrganizationId()

  const stage = payload.stage || 'novo'
  const today = new Date().toISOString().split('T')[0]
  const nextContactAt =
    payload.next_contact_at ?? (stage !== 'fechado' && stage !== 'perdido' ? today : null)

  const toValidate = {
    origin: payload.origin,
    stage,
    referred_by_lead_id: payload.referred_by_lead_id,
    referred_by_name: payload.referred_by_name,
    next_contact_at: nextContactAt,
    closed_at: payload.closed_at,
    lost_at: payload.lost_at,
  }

  validateLeadConstraints(toValidate)

  const insertData = {
    organization_id: orgId,
    name: payload.name.trim(),
    phone: payload.phone?.trim() || null,
    origin: payload.origin,
    referred_by_lead_id: payload.referred_by_lead_id || null,
    referred_by_name: payload.referred_by_name?.trim() || null,
    campaign: payload.campaign?.trim() || null,
    stage,
    lost_reason: payload.lost_reason?.trim() || null,
    next_action: payload.next_action?.trim() || 'Aguardando primeiro contato com o paciente',
    next_contact_at: nextContactAt,
    commercial_function_id: payload.commercial_function_id || null,
    commercial_person_id: payload.commercial_person_id || null,
    evaluator_person_id: payload.evaluator_person_id || null,
    evaluation_scheduled_at: payload.evaluation_scheduled_at || null,
    evaluation_completed_at: payload.evaluation_completed_at || null,
    sale_value: payload.sale_value ?? null,
    sale_date: payload.sale_date || null,
    closed_at: payload.closed_at || null,
    lost_at: payload.lost_at || null,
  }

  const { data, error } = await supabase.from('leads').insert(insertData).select().single()

  if (error) {
    console.error('Erro ao criar lead:', error)
    throw new Error(`Falha ao criar lead: ${error.message}`)
  }

  return data as DbLead
}

/**
 * Atualiza um lead existente em public.leads.
 */
export async function updateLead(id: string, updates: UpdateLeadPayload): Promise<DbLead> {
  const orgId = await getOrganizationId()

  // Buscar lead atual para validar constraints combinadas
  const existing = await getLeadById(id)
  if (!existing) {
    throw new Error(`Lead ${id} não encontrado para atualização.`)
  }

  const merged = {
    origin: updates.origin ?? existing.origin,
    stage: updates.stage ?? existing.stage,
    referred_by_lead_id:
      updates.referred_by_lead_id !== undefined
        ? updates.referred_by_lead_id
        : existing.referred_by_lead_id,
    referred_by_name:
      updates.referred_by_name !== undefined ? updates.referred_by_name : existing.referred_by_name,
    next_contact_at:
      updates.next_contact_at !== undefined ? updates.next_contact_at : existing.next_contact_at,
    closed_at: updates.closed_at !== undefined ? updates.closed_at : existing.closed_at,
    lost_at: updates.lost_at !== undefined ? updates.lost_at : existing.lost_at,
  }

  validateLeadConstraints(merged)

  const dbUpdates: Record<string, any> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim()
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone ? updates.phone.trim() : null
  if (updates.origin !== undefined) dbUpdates.origin = updates.origin
  if (updates.referred_by_lead_id !== undefined)
    dbUpdates.referred_by_lead_id = updates.referred_by_lead_id || null
  if (updates.referred_by_name !== undefined)
    dbUpdates.referred_by_name = updates.referred_by_name ? updates.referred_by_name.trim() : null
  if (updates.campaign !== undefined)
    dbUpdates.campaign = updates.campaign ? updates.campaign.trim() : null
  if (updates.stage !== undefined) dbUpdates.stage = updates.stage
  if (updates.lost_reason !== undefined)
    dbUpdates.lost_reason = updates.lost_reason ? updates.lost_reason.trim() : null
  if (updates.next_action !== undefined)
    dbUpdates.next_action = updates.next_action ? updates.next_action.trim() : null
  if (updates.next_contact_at !== undefined) dbUpdates.next_contact_at = updates.next_contact_at
  if (updates.commercial_function_id !== undefined)
    dbUpdates.commercial_function_id = updates.commercial_function_id || null
  if (updates.commercial_person_id !== undefined)
    dbUpdates.commercial_person_id = updates.commercial_person_id || null
  if (updates.evaluator_person_id !== undefined)
    dbUpdates.evaluator_person_id = updates.evaluator_person_id || null
  if (updates.evaluation_scheduled_at !== undefined)
    dbUpdates.evaluation_scheduled_at = updates.evaluation_scheduled_at || null
  if (updates.evaluation_completed_at !== undefined)
    dbUpdates.evaluation_completed_at = updates.evaluation_completed_at || null
  if (updates.sale_value !== undefined) dbUpdates.sale_value = updates.sale_value
  if (updates.sale_date !== undefined) dbUpdates.sale_date = updates.sale_date || null
  if (updates.closed_at !== undefined) dbUpdates.closed_at = updates.closed_at
  if (updates.lost_at !== undefined) dbUpdates.lost_at = updates.lost_at

  const { data, error } = await (supabase.from('leads') as any)
    .update(dbUpdates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) {
    console.error(`Erro ao atualizar lead ${id}:`, error)
    throw new Error(`Falha ao atualizar lead: ${error.message}`)
  }

  return data as DbLead
}

/**
 * Remove fisicamente um lead.
 */
export async function deleteLead(id: string): Promise<void> {
  const orgId = await getOrganizationId()

  // Remove itens da agenda associados a esse lead
  await supabase
    .from('agenda_items')
    .delete()
    .eq('organization_id', orgId)
    .eq('source_type', 'lead')
    .eq('source_id', id)

  const { error } = await supabase.from('leads').delete().eq('id', id).eq('organization_id', orgId)

  if (error) {
    console.error(`Erro ao excluir lead ${id}:`, error)
    throw new Error(`Falha ao excluir lead: ${error.message}`)
  }
}

// -------------------------------------------------------------------------
// Histórico de Contatos (public.lead_contacts)
// -------------------------------------------------------------------------

/**
 * Busca histórico imutável de contatos para um lead (ordenado por contact_date DESC).
 */
export async function fetchLeadContacts(leadId?: string): Promise<DbLeadContact[]> {
  const orgId = await getOrganizationId()

  let query = supabase
    .from('lead_contacts')
    .select('*')
    .eq('organization_id', orgId)
    .order('contact_date', { ascending: false })

  if (leadId) {
    query = query.eq('lead_id', leadId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar histórico de contatos:', error)
    throw new Error(`Falha ao buscar histórico de contatos: ${error.message}`)
  }

  return (data || []) as DbLeadContact[]
}

/**
 * Registra novo contato no histórico (imutável — nunca atualiza ou sobrescreve).
 */
export async function createLeadContact(payload: CreateLeadContactPayload): Promise<DbLeadContact> {
  const orgId = await getOrganizationId()

  const { data, error } = await supabase
    .from('lead_contacts')
    .insert({
      organization_id: orgId,
      lead_id: payload.lead_id,
      channel: payload.channel || 'WhatsApp',
      notes: payload.notes?.trim() || null,
      person_id: payload.person_id || null,
      contact_date: payload.contact_date || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao registrar contato com o lead:', error)
    throw new Error(`Falha ao registrar contato com o lead: ${error.message}`)
  }

  return data as DbLeadContact
}
