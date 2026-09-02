export interface Role {
  id: string
  name: string
  color: string // hex or tailwind badge color
  bgLight: string
  textColor: string
  borderColor: string
  description: string
  isDefault?: boolean
}

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída'
export type TaskRecurrence = 'Única' | 'Diária' | 'Semanal' | 'Mensal'

export interface Task {
  id: string
  title: string
  roleId: string // Função responsável
  status: TaskStatus
  recurrence: TaskRecurrence
  assignedCollaboratorId?: string // Responsável atual opcional
  dueDate: string // YYYY-MM-DD
  completedAt?: string
  createdAt: string
}

export type LeadStage = 'Novo' | 'Em Contato' | 'Avaliação' | 'Proposta' | 'Fechado' | 'Perdido'

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
  | 'Não respondeu'
  | 'Escolheu outro profissional'
  | 'Preço'
  | 'Prazo'
  | 'Outro'

export type ContactType = 'Ligação' | 'WhatsApp' | 'E-mail' | 'Presencial'

export interface ContactHistoryItem {
  id: string
  leadId: string
  type: ContactType
  date: string // ISO string or YYYY-MM-DD HH:mm
  summary: string
  scriptTitleUsed?: string
  registeredBy: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  origin: LeadOrigin
  interest: LeadInterest
  stage: LeadStage
  assignedToId?: string // Colaborador ou Dentista ID
  assignedToName?: string
  assignedToRole?: string
  nextAction: string
  followUpDate: string // YYYY-MM-DD
  notes?: string
  lossReason?: LossReason
  lossNotes?: string
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
  phone: string
  email: string
  roleIds: string[] // pode ter múltiplas funções
  isActive: boolean
}

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

export interface Dentist {
  id: string
  name: string
  cro?: string
  phone: string
  specialties: DentalSpecialty[]
  isActive: boolean
}

export interface AuthUser {
  name: string
  roleId: string
  roleName: string
  roleColor: string
}
