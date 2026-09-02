// ------------------------------------------------------------------
// Tipos do domínio — Ser Único
// ------------------------------------------------------------------

export interface AuthUser {
  id: string
  name: string
  email: string
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
}

export interface Task {
  id: string
  title: string
  roleId: string
  status: TaskStatus
  recurrence: TaskRecurrence
  assignedCollaboratorId?: string | null
  dueDate: string
  createdAt: string
  completedAt?: string | null
}

export interface Lead {
  id: string
  name: string
  phone: string
  origin: string
  interest: string
  stage: LeadStage
  assignedToId?: string | null
  nextAction?: string | null
  followUpDate?: string | null
  lossReason?: LossReason | null
  lossNotes?: string | null
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
  roleId: string
  isActive: boolean
}

export interface Dentist {
  id: string
  name: string
  cro?: string
  phone?: string
  specialties: string[]
  isActive: boolean
  createdAt: string
}

export interface ContactHistoryItem {
  id: string
  leadId: string
  type: string
  date: string
  summary: string
  registeredBy: string
}

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída'

export type TaskRecurrence = 'Única' | 'Diária' | 'Semanal' | 'Mensal'

export type LeadStage = 'Novo' | 'Em negociação' | 'Fechado' | 'Perdido'

export type LossReason =
  | 'Preço'
  | 'Não tem interesse'
  | 'Sem resposta'
  | 'Escolheu concorrência'
  | 'Outro'
