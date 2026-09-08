// ------------------------------------------------------------------
// Tipos do domínio — Ser Único
// ------------------------------------------------------------------

export type OrgRole = 'OWNER' | null

export interface AuthUser {
  id?: string // person_id
  authUserId?: string // Supabase auth.users.id
  name: string
  email?: string
  orgRole?: OrgRole
  isOwner?: boolean
  roleId: string // Current contextual function ID
  roleName: string // Current contextual function Name
  roleColor?: string
  allowedRoleIds?: string[] // Active function assignments of the authenticated person
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

export type TimeWindow = 'manha' | 'tarde' | 'noite' | 'dia_todo'
export type CadencePriority = 'baixa' | 'media' | 'alta' | 'critica'

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
  estimatedMinutes?: number | null
  timeWindow?: TimeWindow
  priority?: CadencePriority
  isRoutine?: boolean
}

export interface FunctionCadenceLog {
  id: string
  organizationId: string
  functionId: string
  functionName?: string
  personId?: string | null
  personName?: string | null
  date: string
  expectedCount: number
  completedCount: number
  adherencePct: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FunctionCadenceSummary {
  functionId: string
  functionName: string
  functionColor: string
  currentOccupantId?: string | null
  currentOccupantName?: string | null
  isMultiMember?: boolean
  activeMembersCount?: number
  expectedRoutinesCount: number
  completedRoutinesCount: number
  pendingRoutinesCount?: number
  adherencePct: number | null
  hasDeviation: boolean
  delayedCount: number
  routines: Task[]
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
  email?: string | null
  interest?: string | null
  origin: LeadOrigin
  referredByLeadId?: string | null
  referredByName?: string | null
  campaign?: string | null
  stage: LeadStage
  lostReason?: string | null
  lossReason?: string | null
  nextAction: string
  nextContactAt: string // YYYY-MM-DD (exigido para stages ativos)
  nextFollowUpAt?: string | null // ISO timestamp with timezone
  lastContactAt?: string | null // ISO timestamp with timezone
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
  updatedAt?: string
  // UI helpers compatíveis
  followUpDate?: string // alias para nextContactAt
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToRole?: string | null
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
  outcome?: string | null
  nextAction?: string | null
  nextFollowUpAt?: string | null
  functionId?: string | null
  functionName?: string | null
  scriptTitleUsed?: string
  registeredBy: string
  personId?: string | null
  createdAt?: string
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

export type ContactType =
  | 'WhatsApp'
  | 'Telefone'
  | 'Ligação'
  | 'Instagram'
  | 'Email'
  | 'E-mail'
  | 'Presencial'
  | 'Outro'

export type ContactOutcome =
  | 'Sem resposta'
  | 'Mensagem enviada'
  | 'Conversa iniciada'
  | 'Avaliação agendada'
  | 'Pediu para retornar'
  | 'Proposta em análise'
  | 'Tratamento fechado'
  | 'Sem interesse'
  | 'Outro'

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

// -------------------------------------------------------------------------
// STAGE 4B: MANAGEMENT CORE TYPES
// -------------------------------------------------------------------------

export type ManagementVisibilityLevel =
  | 'OWNER_ONLY'
  | 'PRIVATE_MANAGEMENT'
  | 'SHARED_WITH_EMPLOYEE'
  | 'FUNCTION_VISIBLE'

export type ManagementItemType =
  | 'feedback'
  | 'nota_privada_gestao'
  | 'decisao_posse'
  | 'conteudo_estrategico'
  | 'instrucao_funcao'
  | 'reconhecimento'
  | 'plano_desenvolvimento'

export type ManagementItemStatus = 'ativo' | 'resolvido' | 'arquivado'

export type ManagementActionStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'

export interface ManagementItem {
  id: string
  organizationId: string
  title: string
  content: string
  type: ManagementItemType
  visibilityLevel: ManagementVisibilityLevel
  status: ManagementItemStatus
  targetPersonId?: string | null
  targetPersonName?: string | null
  targetFunctionId?: string | null
  targetFunctionName?: string | null
  createdByPersonId?: string | null
  createdByName?: string | null
  acknowledgedAt?: string | null
  acknowledgedByPersonId?: string | null
  acknowledgedByName?: string | null
  createdAt: string
  updatedAt: string
}

export interface ManagementAction {
  id: string
  organizationId: string
  title: string
  description: string
  status: ManagementActionStatus
  responsiblePersonId?: string | null
  responsiblePersonName?: string | null
  responsibleFunctionId?: string | null
  responsibleFunctionName?: string | null
  dueDate?: string | null
  originItemId?: string | null
  originItemTitle?: string | null
  createdByPersonId?: string | null
  createdByName?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

// -------------------------------------------------------------------------
// STAGE 4C: EXCEPTION ENGINE TYPES
// -------------------------------------------------------------------------

export type ExceptionSeverity = 'baixa' | 'media' | 'alta' | 'critica'

export type ExceptionStatus = 'aberta' | 'reconhecida' | 'decidida' | 'resolvida'

export type ExceptionType =
  | 'tarefa_atrasada'
  | 'ocorrencia_perdida'
  | 'lead_sem_followup'
  | 'falhas_recorrentes'
  | 'outro_desvio'

export interface OrgThresholdConfig {
  id: string
  organizationId: string
  key: string
  value: number
  unit: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface ManagedException {
  id: string
  organizationId: string
  type: ExceptionType
  severity: ExceptionSeverity
  title: string
  description: string
  entityType: 'task' | 'agenda_item' | 'lead' | 'function' | string
  entityId?: string | null
  responsibleFunctionId: string
  responsibleFunctionName?: string | null
  responsiblePersonId?: string | null
  responsiblePersonName?: string | null
  status: ExceptionStatus
  recurrenceCount: number
  firstDetectedAt: string
  lastDetectedAt: string
  acknowledgedAt?: string | null
  acknowledgedByPersonId?: string | null
  acknowledgedByName?: string | null
  decisionText?: string | null
  decisionByPersonId?: string | null
  decisionByName?: string | null
  decisionAt?: string | null
  resolvedAt?: string | null
  dedupKey: string
  createdAt: string
  updatedAt: string
}

/**
 * Pendência do Dia DERIVADA (D3_PENDING_ITEM: DERIVED)
 * Gerada dinamicamente via query sem persistência de tabela redundante
 */
export interface DerivedPendingItem {
  id: string
  category: 'tarefa' | 'agenda' | 'lead' | 'gestao'
  title: string
  expectedDate: string
  actualState: string
  reason: string
  responsibleFunctionId: string
  responsibleFunctionName: string
  responsiblePersonId?: string | null
  responsiblePersonName?: string | null
  managementDecisionRequired: boolean
  severity: 'baixa' | 'media' | 'alta' | 'critica'
  sourceType: 'task' | 'agenda_item' | 'lead' | 'function'
  sourceId: string
  daysOverdue?: number
}

// -------------------------------------------------------------------------
// STAGE 4F: GOALS & METRICS TYPES
// -------------------------------------------------------------------------

export type GoalMetricKey =
  | 'tasks_completed'
  | 'tasks_overdue'
  | 'routine_adherence'
  | 'exceptions_generated'
  | 'exceptions_resolved'
  | 'followups_executed'
  | 'followups_overdue'
  | 'management_actions_completed'
  | 'management_actions_overdue'

export type GoalPeriodType = 'daily' | 'weekly' | 'monthly' | 'custom'

export type GoalStatus = 'active' | 'paused' | 'closed'

export interface Goal {
  id: string
  organizationId: string
  responsibleFunctionId: string
  responsibleFunctionName?: string
  responsibleFunctionColor?: string
  metric: GoalMetricKey
  metricLabel: string
  target: number
  periodType: GoalPeriodType
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  status: GoalStatus
  createdBy?: string | null
  createdByName?: string | null
  createdAt: string
  updatedAt: string
  // Computed values
  actual?: number | null
  adherencePct?: number | null
  evidenceSource?: string
  statusBadge?: 'within' | 'below' | 'no_data'
  isMultiMember?: boolean
  activeMembersCount?: number
}

export interface GoalCalculationResult {
  goal_id: string
  metric: string
  target: number
  actual: number
  evidence_source: string
  period_start: string
  period_end: string
  period_type: string
  status: string
}
