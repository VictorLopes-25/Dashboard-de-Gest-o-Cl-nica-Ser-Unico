// ------------------------------------------------------------------
// Tipos do domínio — Ser Único
// ------------------------------------------------------------------

export interface AuthUser {
  id?: string
  name: string
  email?: string
  roleId: string
  roleName: string
  roleColor?: string
}

export interface Role {
  id: string
  name: string
  color: string
  bgLight?: string
  textColor?: string
  borderColor?: string
  description?: string
  sortOrder?: number
  isDefault?: boolean
  active?: boolean
}

export interface Task {
  id: string
  title: string
  roleId: string
  areaId?: string | null
  status: TaskStatus
  recurrence: TaskRecurrence
  recurrenceDay?: number | null
  assignedCollaboratorId?: string | null
  dueDate: string
  createdAt: string
  completedAt?: string | null
  active?: boolean
  description?: string | null
}

export interface AgendaItem {
  id: string
  organizationId: string
  type: 'tarefa' | 'compromisso' | 'follow_up' | 'pendencia'
  title: string
  dueDate: string // YYYY-MM-DD
  dueTime?: string | null
  status: 'aberto' | 'concluido' | 'cancelado'
  functionId?: string | null
  personId?: string | null
  sourceType?: string | null
  sourceId?: string | null
  notes?: string | null
  feedback?: string | null
  transferred?: boolean
  completedAt?: string | null
  createdAt: string
}

export interface Lead {
  id: string
  organizationId?: string
  name: string
  phone: string
  origin: LeadOrigin
  referredByLeadId?: string | null
  referredByName?: string | null
  campaign?: string | null
  stage: LeadStage
  lostReason?: string | null
  lossReason?: string | null
  nextAction: string
  nextContactAt: string // YYYY-MM-DD (exigido para stages ativos)
  commercialFunctionId?: string | null
  commercialPersonId?: string | null
  evaluatorPersonId?: string | null
  evaluationScheduledAt?: string | null
  evaluationCompletedAt?: string | null
  saleValue?: number | null
  saleDate?: string | null
  closedAt?: string | null
  lostAt?: string | null
  createdAt: string
  // UI helpers compatíveis
  followUpDate?: string // alias para nextContactAt
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToRole?: string | null
  interest?: string
  notes?: string | null
  lossNotes?: string | null
}

export interface Script {
  id: string
  organizationId?: string
  title: string
  stage?: LeadStage | string
  content: string
  active?: boolean
  updatedAt: string
}

export interface Collaborator {
  id: string
  name: string
  email?: string
  phone?: string
  roleIds: string[]
  isActive: boolean
}

export interface Dentist {
  id: string
  name: string
  cro?: string
  phone?: string
  specialties: DentalSpecialty[]
  isActive: boolean
  createdAt?: string
}

export interface ContactHistoryItem {
  id: string
  organizationId?: string
  leadId: string
  type: string
  date: string
  summary: string
  scriptTitleUsed?: string
  registeredBy: string
  personId?: string | null
}

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída'

export type TaskRecurrence = 'Única' | 'Diária' | 'Semanal' | 'Mensal'

// Enum real public.lead_stage
export type LeadStage =
  | 'novo'
  | 'avaliacao_agendada'
  | 'nao_compareceu'
  | 'avaliacao_realizada'
  | 'proposta_enviada'
  | 'fechado'
  | 'perdido'

// Enum real public.lead_origin
export type LeadOrigin =
  | 'indicacao'
  | 'meta_ads'
  | 'google'
  | 'organico'
  | 'reativacao'
  | 'campanha'
  | 'parceiro'
  | 'outros'

export type LeadInterest =
  | 'Implantes'
  | 'Aparelho'
  | 'Lentes de contato'
  | 'Clareamento'
  | 'Prótese'
  | 'Canal'
  | 'Odontopediatria'
  | 'Outro'

export type LossReason =
  | 'Preço'
  | 'Não tem interesse'
  | 'Sem resposta'
  | 'Escolheu concorrência'
  | 'Não respondeu'
  | 'Escolheu outro profissional'
  | 'Prazo'
  | 'Outro'

export type ContactType = 'WhatsApp' | 'Ligação' | 'E-mail' | 'Presencial'

export type DentalSpecialty =
  | 'Implantodontia'
  | 'Ortodontia'
  | 'Endodontia'
  | 'Dentística'
  | 'Periodontia'
  | 'Prótese'
  | 'Odontopediatria'
  | 'Cirurgia'
  | 'Clareamento'
  | 'Outro'
