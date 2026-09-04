import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  INITIAL_ROLES,
  INITIAL_COLLABORATORS,
  INITIAL_DENTISTS,
  INITIAL_LEADS,
  INITIAL_SCRIPTS,
  INITIAL_CONTACT_HISTORY,
  getTodayDateString,
} from '@/data/mockData'
import type {
  AuthUser,
  Role,
  Task,
  AgendaItem,
  Lead,
  Script,
  Collaborator,
  Dentist,
  ContactHistoryItem,
  LeadStage,
  LossReason,
  TaskStatus,
  TaskRecurrence,
  DentalSpecialty,
} from '@/types'
import {
  fetchFunctions,
  createFunction,
  updateFunction,
  setFunctionActive,
  type DbFunction,
} from '@/services/functionsService'
import {
  fetchPeople,
  createPerson,
  updatePerson,
  setPersonActive,
  deletePerson as deletePersonService,
  type DbPerson,
} from '@/services/peopleService'
import {
  fetchActiveAssignments,
  syncPersonFunctions,
  type DbFunctionAssignment,
} from '@/services/functionAssignmentsService'
import { fetchAreas, type DbArea } from '@/services/areasService'
import {
  fetchTasks as fetchTasksService,
  createTask as createTaskService,
  updateTask as updateTaskService,
  setTaskActive as setTaskActiveService,
  type DbTask,
  type DbRecurrenceType,
} from '@/services/tasksService'
import {
  fetchTodayAgenda,
  fetchAgendaWindow,
  completeAgendaItem as completeAgendaItemService,
  reopenAgendaItem as reopenAgendaItemService,
  cancelAgendaItem as cancelAgendaItemService,
  createManualAgendaItem,
  type DbAgendaItem,
  type TodayAgendaData,
} from '@/services/agendaService'

export type { AuthUser }

// Mapa estático de cores/estilos por nome da função para manter a UI consistente
const ROLE_VISUAL_DEFAULTS: Record<
  string,
  { bgLight: string; textColor: string; borderColor: string; description: string }
> = {
  Gerência: {
    bgLight: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#C4B5FD',
    description: 'Gestão estratégica, coordenação geral da clínica e tomadas de decisão.',
  },
  Administrativo: {
    bgLight: '#E0F2FE',
    textColor: '#0369A1',
    borderColor: '#7DD3FC',
    description: 'Operações administrativas, cadastros, compras, contratos e suporte geral.',
  },
  Concierge: {
    bgLight: '#FCE7F3',
    textColor: '#BE185D',
    borderColor: '#F9A8D4',
    description: 'Recepção e acolhimento dos pacientes, experiência do paciente e encaminhamentos.',
  },
  'CRC Comercial': {
    bgLight: '#CCFBF1',
    textColor: '#0F766E',
    borderColor: '#5EEAD4',
    description:
      'Consultor de Relacionamento com o Cliente — prospecção, qualificação, follow-up e fechamento de leads.',
  },
  CRC: {
    bgLight: '#CCFBF1',
    textColor: '#0F766E',
    borderColor: '#5EEAD4',
    description:
      'Consultor de Relacionamento com o Cliente — prospecção, qualificação, follow-up e fechamento de leads.',
  },
  'ASB Principal I': {
    bgLight: '#FFEDD5',
    textColor: '#C2410C',
    borderColor: '#FDBA74',
    description:
      'Auxiliar de Saúde Bucal principal da cirurgia e implantes, esterilização crítica e biossegurança.',
  },
  'ASB Auxiliar': {
    bgLight: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FCD34D',
    description:
      'Auxílio em procedimentos gerais, reposição de materiais nos consultórios e desinfecção.',
  },
  Avaliador: {
    bgLight: '#D1FAE5',
    textColor: '#047857',
    borderColor: '#6EE7B7',
    description:
      'Dentista responsável pelo primeiro diagnóstico, plano de tratamento integral e apresentação clínica.',
  },
  Dentistas: {
    bgLight: '#E0E7FF',
    textColor: '#3730A3',
    borderColor: '#A5B4FC',
    description:
      'Corpo clínico de especialistas responsáveis pela execução dos tratamentos odontológicos.',
  },
}

function mapFunctionToRole(f: DbFunction): Role {
  const defaults = ROLE_VISUAL_DEFAULTS[f.name] || {
    bgLight: '#F1F5F9',
    textColor: '#334155',
    borderColor: '#CBD5E1',
    description: '',
  }

  return {
    id: f.id,
    name: f.name,
    color: f.color || '#0F766E',
    bgLight: defaults.bgLight,
    textColor: defaults.textColor,
    borderColor: defaults.borderColor,
    description: defaults.description,
    active: f.active,
  }
}

function mapDbDentist(d: any): Dentist {
  return {
    id: d.id,
    name: d.name,
    cro: d.cro || '',
    phone: d.phone || '',
    specialties: (Array.isArray(d.specialties) ? d.specialties : []) as DentalSpecialty[],
    isActive: d.is_active ?? true,
    createdAt: d.created_at,
  }
}

function dentistToDb(d: Partial<Dentist>): any {
  const out: any = {}
  if (d.name !== undefined) out.name = d.name
  if (d.cro !== undefined) out.cro = d.cro
  if (d.phone !== undefined) out.phone = d.phone
  if (d.specialties !== undefined) out.specialties = d.specialties
  if (d.isActive !== undefined) out.is_active = d.isActive
  return out
}

// Conversão de enums de recorrência UI <-> DB
export function dbRecurrenceToUi(dbRec: DbRecurrenceType): TaskRecurrence {
  switch (dbRec) {
    case 'diaria':
      return 'Diária'
    case 'semanal':
      return 'Semanal'
    case 'mensal':
      return 'Mensal'
    case 'pontual':
    case 'data_especifica':
    default:
      return 'Única'
  }
}

export function uiRecurrenceToDb(uiRec: TaskRecurrence): DbRecurrenceType {
  switch (uiRec) {
    case 'Diária':
      return 'diaria'
    case 'Semanal':
      return 'semanal'
    case 'Mensal':
      return 'mensal'
    case 'Única':
    default:
      return 'pontual'
  }
}

function mapDbTaskToUi(t: DbTask): Task {
  return {
    id: t.id,
    title: t.title,
    roleId: t.function_id || '',
    areaId: t.area_id,
    status: 'Pendente', // status operacional vive em agenda_items
    recurrence: dbRecurrenceToUi(t.recurrence),
    recurrenceDay: t.recurrence_day,
    assignedCollaboratorId: t.default_person_id,
    dueDate: t.due_date || t.created_at.slice(0, 10),
    createdAt: t.created_at,
    completedAt: null,
    active: t.active,
    description: t.description,
  }
}

function mapDbAgendaItemToUi(item: DbAgendaItem): AgendaItem {
  return {
    id: item.id,
    organizationId: item.organization_id,
    type: item.type,
    title: item.title,
    dueDate: item.due_date,
    dueTime: item.due_time,
    status: item.status,
    functionId: item.function_id,
    personId: item.person_id,
    sourceType: item.source_type,
    sourceId: item.source_id,
    notes: item.notes,
    feedback: item.feedback,
    transferred: item.transferred,
    completedAt: item.completed_at,
    createdAt: item.created_at,
  }
}

function mapDbLead(l: any): Lead {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone || '',
    origin: l.origin || 'Outro',
    interest: l.interest || 'Outro',
    stage: l.stage as LeadStage,
    assignedToId: l.assigned_to_id || null,
    assignedToName: l.assigned_to_name || null,
    assignedToRole: l.assigned_to_role || null,
    nextAction: l.next_action || '',
    followUpDate: l.follow_up_date || getTodayDateString(0),
    lossReason: l.loss_reason as LossReason | null,
    lossNotes: l.loss_notes || null,
    notes: l.notes || null,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  }
}

function leadToDb(l: Partial<Lead>): any {
  const out: any = {}
  if (l.name !== undefined) out.name = l.name
  if (l.phone !== undefined) out.phone = l.phone
  if (l.origin !== undefined) out.origin = l.origin
  if (l.interest !== undefined) out.interest = l.interest
  if (l.stage !== undefined) out.stage = l.stage
  if (l.assignedToId !== undefined) out.assigned_to_id = l.assignedToId
  if (l.assignedToName !== undefined) out.assigned_to_name = l.assignedToName
  if (l.assignedToRole !== undefined) out.assigned_to_role = l.assignedToRole
  if (l.nextAction !== undefined) out.next_action = l.nextAction
  if (l.followUpDate !== undefined) out.follow_up_date = l.followUpDate
  if (l.lossReason !== undefined) out.loss_reason = l.lossReason
  if (l.lossNotes !== undefined) out.loss_notes = l.lossNotes
  if (l.notes !== undefined) out.notes = l.notes
  return out
}

function mapDbScript(s: any): Script {
  return {
    id: s.id,
    title: s.title,
    stage: s.stage as LeadStage,
    content: s.content || '',
    updatedAt: s.updated_at || '',
  }
}

function scriptToDb(s: Partial<Script>): any {
  const out: any = {}
  if (s.title !== undefined) out.title = s.title
  if (s.stage !== undefined) out.stage = s.stage
  if (s.content !== undefined) out.content = s.content
  return out
}

function mapDbContactHistory(h: any): ContactHistoryItem {
  return {
    id: h.id,
    leadId: h.lead_id,
    type: h.type || 'WhatsApp',
    date: h.date || '',
    summary: h.summary || '',
    scriptTitleUsed: h.script_title_used || undefined,
    registeredBy: h.registered_by || 'CRC Ser Único',
  }
}

function contactHistoryToDb(h: Partial<ContactHistoryItem>): any {
  const out: any = {}
  if (h.leadId !== undefined) out.lead_id = h.leadId
  if (h.type !== undefined) out.type = h.type
  if (h.date !== undefined) out.date = h.date
  if (h.summary !== undefined) out.summary = h.summary
  if (h.scriptTitleUsed !== undefined) out.script_title_used = h.scriptTitleUsed
  if (h.registeredBy !== undefined) out.registered_by = h.registeredBy
  return out
}

// ------------------------------------------------------------------
// Context interface (com compatibilidade para currentUser, toggleTaskCompletion, etc.)
// ------------------------------------------------------------------

interface AppContextType {
  // Sessão / Usuário ativo
  session: AuthUser | null
  currentUser: AuthUser | null
  setCurrentUser: (user: AuthUser | null) => void
  logout: () => void
  isManagerOrAdmin: boolean
  loading: boolean

  // Dados
  roles: Role[]
  collaborators: Collaborator[]
  dentists: Dentist[]
  tasks: Task[]
  agendaItems: AgendaItem[]
  overdueAgendaItems: AgendaItem[]
  leads: Lead[]
  scripts: Script[]
  contactHistory: ContactHistoryItem[]

  // Helper getters
  getLeadById: (id: string) => Lead | undefined
  getHistoryForLead: (leadId: string) => ContactHistoryItem[]

  // CRUD Roles
  addRole: (role: Omit<Role, 'id'>) => Promise<Role | null>
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>
  deleteRole: (id: string) => Promise<void>

  // CRUD Colaboradores
  addCollaborator: (colab: Omit<Collaborator, 'id'>) => Promise<Collaborator | null>
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => Promise<void>
  deleteCollaborator: (id: string) => Promise<void>

  // CRUD Dentistas
  addDentist: (dentist: Omit<Dentist, 'id'>) => Promise<Dentist | null>
  updateDentist: (id: string, updates: Partial<Dentist>) => Promise<void>
  deleteDentist: (id: string) => Promise<void>

  // CRUD Tarefas (Templates em public.tasks)
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setTaskActive: (id: string, active: boolean) => Promise<void>

  // Agenda Operations (Ocorrências em public.agenda_items)
  completeAgendaItem: (id: string) => Promise<void>
  reopenAgendaItem: (id: string) => Promise<void>
  cancelAgendaItem: (id: string) => Promise<void>
  addManualAgendaItem: (payload: {
    type: 'tarefa' | 'compromisso' | 'pendencia'
    title: string
    dueDate: string
    dueTime?: string | null
    functionId?: string | null
    personId?: string | null
    notes?: string | null
  }) => Promise<AgendaItem | null>
  loadAgendaWindow: (
    startDate: string,
    endDate: string,
  ) => Promise<{ items: AgendaItem[]; overdue: AgendaItem[] }>
  toggleTaskCompletion: (id: string) => Promise<void>

  // CRUD Leads
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Lead | null>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  moveLeadStage: (
    leadId: string,
    targetStage: LeadStage,
    extra?: { lossReason?: LossReason; lossNotes?: string },
  ) => Promise<void>

  // CRUD Scripts & Histórico
  addScript: (script: Omit<Script, 'id' | 'updatedAt'>) => Promise<Script | null>
  updateScript: (id: string, updates: Partial<Script>) => Promise<void>
  deleteScript: (id: string) => Promise<void>
  addContactHistory: (item: Omit<ContactHistoryItem, 'id'>) => Promise<void>

  // Reset / Refresh
  refreshData: () => Promise<void>
  resetData: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

const DEFAULT_CURRENT_USER: AuthUser = {
  id: 'user-crc-default',
  name: 'Paula Rocha',
  roleId: '11111111-1111-4111-8111-111111111104',
  roleName: 'CRC',
  roleColor: '#7C3AED',
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('ser_unico_current_user')
      if (stored) return JSON.parse(stored)
    } catch {
      // fallback
    }
    return DEFAULT_CURRENT_USER
  })

  const [loading, setLoading] = useState(true)

  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES)
  const [collaborators, setCollaborators] = useState<Collaborator[]>(INITIAL_COLLABORATORS)
  const [dentists, setDentists] = useState<Dentist[]>(INITIAL_DENTISTS)
  const [tasks, setTasks] = useState<Task[]>([])
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [overdueAgendaItems, setOverdueAgendaItems] = useState<AgendaItem[]>([])
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS)
  const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS)
  const [contactHistory, setContactHistory] =
    useState<ContactHistoryItem[]>(INITIAL_CONTACT_HISTORY)

  const setCurrentUser = useCallback((user: AuthUser | null) => {
    setCurrentUserState(user)
    try {
      if (user) {
        localStorage.setItem('ser_unico_current_user', JSON.stringify(user))
      } else {
        localStorage.removeItem('ser_unico_current_user')
      }
    } catch {
      // ignore
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [setCurrentUser])

  const isManagerOrAdmin = useMemo(() => {
    if (!currentUser) return false
    const name = currentUser.roleName.toLowerCase()
    return name.includes('gerência') || name.includes('administrativo') || name.includes('admin')
  }, [currentUser])

  // ----------------------------------------------------------------
  // Carregamento dos dados estruturais (Supabase como fonte da verdade)
  // ----------------------------------------------------------------

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Buscar funções (public.functions)
      const dbFuncs = await fetchFunctions()
      const mappedRoles: Role[] = dbFuncs.map(mapFunctionToRole)

      // 2. Buscar pessoas (public.people)
      const dbPeople = await fetchPeople()

      // 3. Buscar assignments ativos (public.function_assignments)
      const dbAssignments = await fetchActiveAssignments()

      // Mapear roleIds por pessoa a partir dos assignments ativos
      const personRolesMap = new Map<string, string[]>()
      for (const assignment of dbAssignments) {
        const existing = personRolesMap.get(assignment.person_id) || []
        existing.push(assignment.function_id)
        personRolesMap.set(assignment.person_id, existing)
      }

      const mappedCollaborators: Collaborator[] = dbPeople.map((p) => ({
        id: p.id,
        name: p.name,
        email: '',
        phone: '',
        roleIds: personRolesMap.get(p.id) || [],
        isActive: p.active,
      }))

      setRoles(mappedRoles)
      setCollaborators(mappedCollaborators)

      // 4. Buscar tarefas do Supabase (public.tasks)
      const dbTasks = await fetchTasksService(true)
      const mappedTasks = dbTasks.map(mapDbTaskToUi)
      setTasks(mappedTasks)

      // 5. Carregar Agenda do Dia (public.agenda_items com Today View + Atrasados)
      const today = new Date().toISOString().split('T')[0]
      const todayAgenda = await fetchTodayAgenda(today)
      const allTodayUi = [...todayAgenda.todayOpen, ...todayAgenda.todayCompleted].map(
        mapDbAgendaItemToUi,
      )
      const overdueUi = todayAgenda.overdue.map(mapDbAgendaItemToUi)

      setAgendaItems(allTodayUi)
      setOverdueAgendaItems(overdueUi)
    } catch (err) {
      console.error('Erro crítico ao carregar dados estruturais do Supabase:', err)
      // Conforme Regra 7: NÃO fazer fallback silencioso para mocks. Erros claramente sinalizados.
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData().catch((err) => {
      console.error('Falha na inicialização do AppContext:', err)
    })
  }, [refreshData])

  // Helpers
  const getLeadById = useCallback(
    (id: string): Lead | undefined => {
      return leads.find((l) => l.id === id)
    },
    [leads],
  )

  const getHistoryForLead = useCallback(
    (leadId: string): ContactHistoryItem[] => {
      return contactHistory.filter((h) => h.leadId === leadId)
    },
    [contactHistory],
  )

  // ----------------------------------------------------------------
  // CRUD — Funções (public.functions via Supabase)
  // ----------------------------------------------------------------

  const addRole = async (roleData: Omit<Role, 'id'>): Promise<Role | null> => {
    try {
      const created = await createFunction({
        name: roleData.name,
        color: roleData.color,
        active: roleData.active ?? true,
      })
      const mapped = mapFunctionToRole(created)
      // Preserva descrições/cores complementares fornecidas na criação
      mapped.bgLight = roleData.bgLight || mapped.bgLight
      mapped.textColor = roleData.textColor || mapped.textColor
      mapped.borderColor = roleData.borderColor || mapped.borderColor
      mapped.description = roleData.description || mapped.description

      setRoles((prev) => [...prev, mapped])
      return mapped
    } catch (err) {
      console.error('Falha ao adicionar função no Supabase:', err)
      throw err
    }
  }

  const updateRole = async (id: string, updates: Partial<Role>) => {
    try {
      const updated = await updateFunction(id, {
        name: updates.name,
        color: updates.color,
        active: updates.active,
      })
      setRoles((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          return {
            ...r,
            ...updates,
            name: updated.name,
            color: updated.color || r.color,
            active: updated.active,
          }
        }),
      )
    } catch (err) {
      console.error('Falha ao atualizar função no Supabase:', err)
      throw err
    }
  }

  const deleteRole = async (id: string) => {
    // Regra 2: Não deletar fisicamente funções referenciadas; preferir active=false
    try {
      await setFunctionActive(id, false)
      setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, active: false } : r)))
    } catch (err) {
      console.error('Falha ao desativar função no Supabase:', err)
      throw err
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Colaboradores (public.people + public.function_assignments)
  // ----------------------------------------------------------------

  const addCollaborator = async (
    colabData: Omit<Collaborator, 'id'>,
  ): Promise<Collaborator | null> => {
    try {
      // 1. Criar pessoa em public.people
      const createdPerson = await createPerson({
        name: colabData.name,
        active: colabData.isActive ?? true,
      })

      // 2. Se houver funções atribuídas, sincronizar em public.function_assignments
      if (colabData.roleIds && colabData.roleIds.length > 0) {
        await syncPersonFunctions(createdPerson.id, colabData.roleIds)
      }

      const newColab: Collaborator = {
        id: createdPerson.id,
        name: createdPerson.name,
        email: colabData.email || '',
        phone: colabData.phone || '',
        roleIds: colabData.roleIds || [],
        isActive: createdPerson.active,
      }

      setCollaborators((prev) => [...prev, newColab])
      return newColab
    } catch (err) {
      console.error('Falha ao cadastrar colaborador no Supabase:', err)
      throw err
    }
  }

  const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
    try {
      // 1. Atualizar pessoa se nome ou isActive mudou
      if (updates.name !== undefined || updates.isActive !== undefined) {
        await updatePerson(id, {
          name: updates.name,
          active: updates.isActive,
        })
      }

      // 2. Se as funções foram alteradas, sincronizar function_assignments
      if (updates.roleIds !== undefined) {
        await syncPersonFunctions(id, updates.roleIds)
      }

      setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    } catch (err) {
      console.error('Falha ao atualizar colaborador no Supabase:', err)
      throw err
    }
  }

  const deleteCollaborator = async (id: string) => {
    // Soft delete preferencial em public.people (active = false) + encerramento de assignments
    try {
      await syncPersonFunctions(id, [])
      await setPersonActive(id, false)
      setCollaborators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: false, roleIds: [] } : c)),
      )
    } catch (err) {
      console.error('Falha ao desativar colaborador no Supabase:', err)
      throw err
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Dentistas
  // ----------------------------------------------------------------

  const addDentist = async (dentistData: Omit<Dentist, 'id'>): Promise<Dentist | null> => {
    const localDentist: Dentist = {
      ...dentistData,
      id: `dentist-local-${Date.now()}`,
    }
    setDentists((prev) => [...prev, localDentist])
    return localDentist
  }

  const updateDentist = async (id: string, updates: Partial<Dentist>) => {
    setDentists((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
  }

  const deleteDentist = async (id: string) => {
    setDentists((prev) => prev.filter((d) => d.id !== id))
  }

  // ----------------------------------------------------------------
  // CRUD — Tarefas (public.tasks via Supabase)
  // ----------------------------------------------------------------

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
    try {
      const created = await createTaskService({
        title: taskData.title,
        description: taskData.description || null,
        function_id: taskData.roleId || null,
        area_id: taskData.areaId || null,
        recurrence: uiRecurrenceToDb(taskData.recurrence),
        recurrence_day: taskData.recurrenceDay ?? null,
        due_date: taskData.dueDate || null,
        default_person_id: taskData.assignedCollaboratorId || null,
        active: taskData.active ?? true,
      })

      const mapped = mapDbTaskToUi(created)
      setTasks((prev) => [mapped, ...prev])

      // Atualiza ocorrências na agenda para hoje
      const today = new Date().toISOString().split('T')[0]
      const todayAgenda = await fetchTodayAgenda(today)
      setAgendaItems(
        [...todayAgenda.todayOpen, ...todayAgenda.todayCompleted].map(mapDbAgendaItemToUi),
      )
      setOverdueAgendaItems(todayAgenda.overdue.map(mapDbAgendaItemToUi))

      return mapped
    } catch (err) {
      console.error('Falha ao criar tarefa no Supabase:', err)
      throw err
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const dbUpdates: any = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.roleId !== undefined) dbUpdates.function_id = updates.roleId
      if (updates.areaId !== undefined) dbUpdates.area_id = updates.areaId
      if (updates.recurrence !== undefined)
        dbUpdates.recurrence = uiRecurrenceToDb(updates.recurrence)
      if (updates.recurrenceDay !== undefined) dbUpdates.recurrence_day = updates.recurrenceDay
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
      if (updates.assignedCollaboratorId !== undefined)
        dbUpdates.default_person_id = updates.assignedCollaboratorId || null
      if (updates.active !== undefined) dbUpdates.active = updates.active

      const updated = await updateTaskService(id, dbUpdates)
      const mapped = mapDbTaskToUi(updated)

      setTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)))
    } catch (err) {
      console.error('Falha ao atualizar tarefa no Supabase:', err)
      throw err
    }
  }

  const deleteTask = async (id: string) => {
    // Regra 7: Desativação (active=false), para geração de ocorrências futuras e cancela futuras abertas
    try {
      await setTaskActiveService(id, false)
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, active: false } : t)))

      // Recarrega agenda de hoje para refletir cancelamento
      const today = new Date().toISOString().split('T')[0]
      const todayAgenda = await fetchTodayAgenda(today)
      setAgendaItems(
        [...todayAgenda.todayOpen, ...todayAgenda.todayCompleted].map(mapDbAgendaItemToUi),
      )
    } catch (err) {
      console.error('Falha ao desativar tarefa no Supabase:', err)
      throw err
    }
  }

  const setTaskActive = async (id: string, active: boolean) => {
    try {
      const updated = await setTaskActiveService(id, active)
      const mapped = mapDbTaskToUi(updated)
      setTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)))

      const today = new Date().toISOString().split('T')[0]
      const todayAgenda = await fetchTodayAgenda(today)
      setAgendaItems(
        [...todayAgenda.todayOpen, ...todayAgenda.todayCompleted].map(mapDbAgendaItemToUi),
      )
      setOverdueAgendaItems(todayAgenda.overdue.map(mapDbAgendaItemToUi))
    } catch (err) {
      console.error('Falha ao alterar status de atividade da tarefa:', err)
      throw err
    }
  }

  // ----------------------------------------------------------------
  // Operações em Agenda (public.agenda_items via Supabase)
  // ----------------------------------------------------------------

  const completeAgendaItem = async (id: string) => {
    try {
      const updated = await completeAgendaItemService(id)
      const uiItem = mapDbAgendaItemToUi(updated)

      setAgendaItems((prev) => prev.map((i) => (i.id === id ? uiItem : i)))
      setOverdueAgendaItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('Falha ao concluir item na agenda:', err)
      throw err
    }
  }

  const reopenAgendaItem = async (id: string) => {
    try {
      const updated = await reopenAgendaItemService(id)
      const uiItem = mapDbAgendaItemToUi(updated)

      setAgendaItems((prev) => prev.map((i) => (i.id === id ? uiItem : i)))
      const today = new Date().toISOString().split('T')[0]
      if (uiItem.dueDate < today) {
        setOverdueAgendaItems((prev) => {
          if (prev.some((i) => i.id === id)) return prev
          return [...prev, uiItem]
        })
      }
    } catch (err) {
      console.error('Falha ao reabrir item na agenda:', err)
      throw err
    }
  }

  const cancelAgendaItem = async (id: string) => {
    try {
      const updated = await cancelAgendaItemService(id)
      const uiItem = mapDbAgendaItemToUi(updated)

      setAgendaItems((prev) => prev.map((i) => (i.id === id ? uiItem : i)))
      setOverdueAgendaItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('Falha ao cancelar item na agenda:', err)
      throw err
    }
  }

  const addManualAgendaItem = async (payload: {
    type: 'tarefa' | 'compromisso' | 'pendencia'
    title: string
    dueDate: string
    dueTime?: string | null
    functionId?: string | null
    personId?: string | null
    notes?: string | null
  }): Promise<AgendaItem | null> => {
    try {
      const created = await createManualAgendaItem({
        type: payload.type,
        title: payload.title,
        due_date: payload.dueDate,
        due_time: payload.dueTime ?? null,
        function_id: payload.functionId ?? null,
        person_id: payload.personId ?? null,
        notes: payload.notes ?? null,
      })
      const uiItem = mapDbAgendaItemToUi(created)
      setAgendaItems((prev) => [uiItem, ...prev])
      return uiItem
    } catch (err) {
      console.error('Falha ao criar item manual na agenda:', err)
      throw err
    }
  }

  const loadAgendaWindow = async (
    startDate: string,
    endDate: string,
  ): Promise<{ items: AgendaItem[]; overdue: AgendaItem[] }> => {
    try {
      const res = await fetchAgendaWindow(startDate, endDate, true)
      return {
        items: res.items.map(mapDbAgendaItemToUi),
        overdue: res.overdue.map(mapDbAgendaItemToUi),
      }
    } catch (err) {
      console.error('Falha ao carregar janela de agenda:', err)
      throw err
    }
  }

  // Compatibilidade com toggleTaskCompletion para callers legados ou UI de agenda
  const toggleTaskCompletion = async (id: string) => {
    // Procura primeiro em agendaItems
    const agendaItem =
      agendaItems.find((i) => i.id === id) || overdueAgendaItems.find((i) => i.id === id)
    if (agendaItem) {
      if (agendaItem.status === 'concluido') {
        await reopenAgendaItem(id)
      } else {
        await completeAgendaItem(id)
      }
      return
    }

    // Se for id de task template, busca ocorrência de hoje para essa task ou cria
    const task = tasks.find((t) => t.id === id)
    if (task) {
      const today = new Date().toISOString().split('T')[0]
      const matchingAgenda =
        agendaItems.find((i) => i.sourceId === id && i.dueDate === today) ||
        overdueAgendaItems.find((i) => i.sourceId === id)
      if (matchingAgenda) {
        if (matchingAgenda.status === 'concluido') {
          await reopenAgendaItem(matchingAgenda.id)
        } else {
          await completeAgendaItem(matchingAgenda.id)
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Leads
  // ----------------------------------------------------------------

  const addLead = async (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Lead | null> => {
    const now = new Date().toISOString()
    const localLead: Lead = {
      ...leadData,
      id: `lead-local-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    setLeads((prev) => [localLead, ...prev])
    return localLead
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  const moveLeadStage = async (
    leadId: string,
    targetStage: LeadStage,
    extra?: { lossReason?: LossReason; lossNotes?: string },
  ) => {
    const updates: Partial<Lead> = {
      stage: targetStage,
      lossReason: extra?.lossReason ?? null,
      lossNotes: extra?.lossNotes ?? null,
    }
    await updateLead(leadId, updates)
  }

  // ----------------------------------------------------------------
  // CRUD — Scripts e Histórico de contatos
  // ----------------------------------------------------------------

  const addScript = async (
    scriptData: Omit<Script, 'id' | 'updatedAt'>,
  ): Promise<Script | null> => {
    const localScript: Script = {
      ...scriptData,
      id: `script-local-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('pt-BR'),
    }
    setScripts((prev) => [localScript, ...prev])
    return localScript
  }

  const updateScript = async (id: string, updates: Partial<Script>) => {
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const deleteScript = async (id: string) => {
    setScripts((prev) => prev.filter((s) => s.id !== id))
  }

  const addContactHistory = async (item: Omit<ContactHistoryItem, 'id'>) => {
    const localItem: ContactHistoryItem = {
      ...item,
      id: `hist-local-${Date.now()}`,
    }
    setContactHistory((prev) => [localItem, ...prev])
  }

  // Reset dados locais para dados de demonstração (módulos não conectados recarregam; conectados recarregam do Supabase)
  const resetData = async () => {
    await refreshData()
    setDentists(INITIAL_DENTISTS)
    setLeads(INITIAL_LEADS)
    setScripts(INITIAL_SCRIPTS)
    setContactHistory(INITIAL_CONTACT_HISTORY)
  }

  return (
    <AppContext.Provider
      value={{
        session: currentUser,
        currentUser,
        setCurrentUser,
        logout,
        isManagerOrAdmin,
        loading,
        roles,
        collaborators,
        dentists,
        tasks,
        agendaItems,
        overdueAgendaItems,
        leads,
        scripts,
        contactHistory,
        getLeadById,
        getHistoryForLead,
        addRole,
        updateRole,
        deleteRole,
        addCollaborator,
        updateCollaborator,
        deleteCollaborator,
        addDentist,
        updateDentist,
        deleteDentist,
        addTask,
        updateTask,
        deleteTask,
        setTaskActive,
        completeAgendaItem,
        reopenAgendaItem,
        cancelAgendaItem,
        addManualAgendaItem,
        loadAgendaWindow,
        toggleTaskCompletion,
        addLead,
        updateLead,
        deleteLead,
        moveLeadStage,
        addScript,
        updateScript,
        deleteScript,
        addContactHistory,
        refreshData,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
