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
  type: 'tarefa' | 'compromisso' | 'pendencia'
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
  name: string
  phone: string
  origin: string
  interest: string
  stage: LeadStage
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToRole?: string | null
  nextAction: string
  followUpDate: string
  lossReason?: LossReason | null
  lossNotes?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface Script {
  id: string
  title: string
  stage: LeadStage
  content: string
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
  leadId: string
  type: string
  date: string
  summary: string
  scriptTitleUsed?: string
  registeredBy: string
}

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída'

export type TaskRecurrence = 'Única' | 'Diária' | 'Semanal' | 'Mensal'

export type LeadStage =
  | 'Novo'
  | 'Em Contato'
  | 'Avaliação'
  | 'Proposta'
  | 'Fechado'
  | 'Perdido'
  | 'Em negociação'

export type LeadOrigin =
  | 'Instagram'
  | 'Google'
  | 'Indicação'
  | 'WhatsApp'
  | 'Site'
  | 'Facebook'
  | 'Panfleto'
  | 'Outro'

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
