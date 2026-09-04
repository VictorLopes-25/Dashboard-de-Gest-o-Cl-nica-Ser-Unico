import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  INITIAL_ROLES,
  INITIAL_COLLABORATORS,
  INITIAL_DENTISTS,
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
  syncLeadFollowUpAgendaItem,
  type DbAgendaItem,
  type TodayAgendaData,
} from '@/services/agendaService'
import {
  fetchLeads as fetchLeadsService,
  createLead as createLeadService,
  updateLead as updateLeadService,
  deleteLead as deleteLeadService,
  fetchLeadContacts as fetchLeadContactsService,
  createLeadContact as createLeadContactService,
  type DbLead,
  type DbLeadContact,
} from '@/services/leadsService'
import {
  fetchScripts as fetchScriptsService,
  createScript as createScriptService,
  updateScript as updateScriptService,
  deleteScript as deleteScriptService,
  type DbScript,
} from '@/services/scriptsService'

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

function mapDbLeadToUi(
  l: DbLead,
  peopleMap?: Map<string, string>,
  rolesMap?: Map<string, string>,
): Lead {
  const assignedPersonName = l.commercial_person_id
    ? peopleMap?.get(l.commercial_person_id) || null
    : null
  const assignedRoleName = l.commercial_function_id
    ? rolesMap?.get(l.commercial_function_id) || null
    : null

  return {
    id: l.id,
    organizationId: l.organization_id,
    name: l.name,
    phone: l.phone || '',
    origin: l.origin,
    referredByLeadId: l.referred_by_lead_id,
    referredByName: l.referred_by_name,
    campaign: l.campaign,
    stage: l.stage,
    lostReason: l.lost_reason,
    nextAction: l.next_action || '',
    nextContactAt: l.next_contact_at || '',
    followUpDate: l.next_contact_at || '',
    commercialFunctionId: l.commercial_function_id,
    commercialPersonId: l.commercial_person_id,
    evaluatorPersonId: l.evaluator_person_id,
    evaluationScheduledAt: l.evaluation_scheduled_at,
    evaluationCompletedAt: l.evaluation_completed_at,
    saleValue: l.sale_value !== null ? Number(l.sale_value) : null,
    saleDate: l.sale_date,
    closedAt: l.closed_at,
    lostAt: l.lost_at,
    createdAt: l.created_at,
    // UI Helpers
    assignedToId: l.commercial_person_id || l.evaluator_person_id || null,
    assignedToName: assignedPersonName || (assignedRoleName ? assignedRoleName : 'CRC'),
    assignedToRole: assignedRoleName || 'CRC',
    interest: l.campaign || 'Implantes',
    notes: null,
    lossNotes: null,
  }
}

function mapDbScriptToUi(s: DbScript): Script {
  return {
    id: s.id,
    organizationId: s.organization_id,
    title: s.title,
    stage: s.stage || 'novo',
    content: s.content || '',
    active: s.active,
    updatedAt: s.updated_at
      ? new Date(s.updated_at).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR'),
  }
}

function mapDbContactToUi(c: DbLeadContact, peopleMap?: Map<string, string>): ContactHistoryItem {
  const registeredBy = c.person_id ? peopleMap?.get(c.person_id) || 'Equipe' : 'CRC Ser Único'
  const dateFormatted = c.contact_date
    ? `${c.contact_date.slice(0, 10)} ${new Date(c.contact_date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : ''

  return {
    id: c.id,
    organizationId: c.organization_id,
    leadId: c.lead_id,
    type: c.channel || 'WhatsApp',
    date: dateFormatted,
    summary: c.notes || '',
    registeredBy,
    personId: c.person_id,
  }
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
    type: 'tarefa' | 'compromisso' | 'follow_up' | 'pendencia'
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
  id: 'user-gerencia-default',
  name: 'Marcos Silveira',
  roleId: 'b205a7eb-b77a-42df-9d22-1cfbdd97363e',
  roleName: 'Gerência',
  roleColor: '#6D28D9',
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
  const [leads, setLeads] = useState<Lead[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([])

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

      // Se o usuário ativo estiver usando uma role que não existe mais nas funções do Supabase
      // ou se o roleId estiver desatualizado, atualiza para a função Gerência do Supabase
      setCurrentUserState((prev) => {
        if (!prev) return prev
        const roleExists = mappedRoles.some((r) => r.id === prev.roleId)
        if (!roleExists) {
          const gerenciaRole =
            mappedRoles.find((r) => r.name.toLowerCase().includes('gerência')) || mappedRoles[0]
          if (gerenciaRole) {
            const updatedUser: AuthUser = {
              ...prev,
              roleId: gerenciaRole.id,
              roleName: gerenciaRole.name,
              roleColor: gerenciaRole.color,
            }
            try {
              localStorage.setItem('ser_unico_current_user', JSON.stringify(updatedUser))
            } catch {
              // ignore
            }
            return updatedUser
          }
        }
        return prev
      })

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

      // 6. Carregar Leads (public.leads)
      const dbLeads = await fetchLeadsService()
      const peopleNamesMap = new Map(dbPeople.map((p) => [p.id, p.name]))
      const roleNamesMap = new Map(dbFuncs.map((f) => [f.id, f.name]))
      const mappedLeads = dbLeads.map((l) => mapDbLeadToUi(l, peopleNamesMap, roleNamesMap))
      setLeads(mappedLeads)

      // 7. Carregar Scripts (public.scripts)
      const dbScripts = await fetchScriptsService(false)
      const mappedScripts = dbScripts.map(mapDbScriptToUi)
      setScripts(mappedScripts)

      // 8. Carregar Histórico de Contatos (public.lead_contacts)
      const dbContacts = await fetchLeadContactsService()
      const mappedContacts = dbContacts.map((c) => mapDbContactToUi(c, peopleNamesMap))
      setContactHistory(mappedContacts)
    } catch (err) {
      console.error('Erro crítico ao carregar dados do Supabase:', err)
      // Conforme Regra de ouro: NÃO fazer fallback silencioso para mocks. Erros claramente sinalizados.
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

      // Regra 5: Completar follow-up pela agenda registra contato se for lead
      if (uiItem.type === 'follow_up' && uiItem.sourceType === 'lead' && uiItem.sourceId) {
        try {
          const leadId = uiItem.sourceId
          const noteText = uiItem.notes || uiItem.title
          await createLeadContactService({
            lead_id: leadId,
            channel: 'Agenda',
            notes: `Follow-up concluído via agenda: ${noteText}`,
            person_id: uiItem.personId || null,
          })

          // Atualiza lista de contatos em memória
          const dbContacts = await fetchLeadContactsService(leadId)
          const peopleMap = new Map(collaborators.map((c) => [c.id, c.name]))
          const mapped = dbContacts.map((c) => mapDbContactToUi(c, peopleMap))
          setContactHistory((prev) => {
            const others = prev.filter((h) => h.leadId !== leadId)
            return [...mapped, ...others]
          })
        } catch (contactErr) {
          console.warn('Follow-up concluído, mas falha ao auto-registrar contato:', contactErr)
        }
      }
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
    type: 'tarefa' | 'compromisso' | 'follow_up' | 'pendencia'
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
  // CRUD — Leads (public.leads no Supabase + Follow-up na agenda)
  // ----------------------------------------------------------------

  const addLead = async (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Lead | null> => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextContactAt = leadData.nextContactAt || leadData.followUpDate || today
      const stage = leadData.stage || 'novo'

      // Resolver comercial / função responsável padrão (ex.: CRC Comercial)
      let commFuncId = leadData.commercialFunctionId || null
      let commPersonId = leadData.commercialPersonId || leadData.assignedToId || null

      if (!commFuncId && !commPersonId) {
        const crcFunc = roles.find(
          (r) => r.name.toLowerCase().includes('crc') || r.name.toLowerCase().includes('comercial'),
        )
        if (crcFunc) commFuncId = crcFunc.id
      }

      const created = await createLeadService({
        name: leadData.name,
        phone: leadData.phone || null,
        origin: leadData.origin,
        referred_by_lead_id: leadData.referredByLeadId || null,
        referred_by_name: leadData.referredByName || null,
        campaign: leadData.campaign || leadData.interest || null,
        stage,
        next_action: leadData.nextAction || 'Aguardando primeiro contato com o paciente',
        next_contact_at: nextContactAt,
        commercial_function_id: commFuncId,
        commercial_person_id: commPersonId,
        evaluator_person_id: leadData.evaluatorPersonId || null,
        sale_value: leadData.saleValue ?? null,
        sale_date: leadData.saleDate || null,
        closed_at: leadData.closedAt || (stage === 'fechado' ? new Date().toISOString() : null),
        lost_at: leadData.lostAt || (stage === 'perdido' ? new Date().toISOString() : null),
        lost_reason: leadData.lostReason || null,
      })

      // Regra 5: Criar follow-up na agenda unificada se stage ativo
      if (stage !== 'fechado' && stage !== 'perdido' && nextContactAt) {
        try {
          const agendaItemCreated = await syncLeadFollowUpAgendaItem({
            leadId: created.id,
            leadName: created.name,
            nextContactAt,
            nextAction: created.next_action,
            commercialFunctionId: created.commercial_function_id,
            commercialPersonId: created.commercial_person_id,
          })
          if (agendaItemCreated.due_date === today) {
            setAgendaItems((prev) => [mapDbAgendaItemToUi(agendaItemCreated), ...prev])
          }
        } catch (agendaErr) {
          console.warn('Falha ao sincronizar follow-up na agenda:', agendaErr)
        }
      }

      const peopleMap = new Map(collaborators.map((c) => [c.id, c.name]))
      const rolesMap = new Map(roles.map((r) => [r.id, r.name]))
      const uiLead = mapDbLeadToUi(created, peopleMap, rolesMap)

      setLeads((prev) => [uiLead, ...prev])
      return uiLead
    } catch (err) {
      console.error('Falha ao cadastrar lead no Supabase:', err)
      throw err
    }
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const dbUpdates: any = {}

      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone
      if (updates.origin !== undefined) dbUpdates.origin = updates.origin
      if (updates.referredByLeadId !== undefined)
        dbUpdates.referred_by_lead_id = updates.referredByLeadId
      if (updates.referredByName !== undefined) dbUpdates.referred_by_name = updates.referredByName
      if (updates.campaign !== undefined) dbUpdates.campaign = updates.campaign
      if (updates.stage !== undefined) dbUpdates.stage = updates.stage
      if (updates.lostReason !== undefined) dbUpdates.lost_reason = updates.lostReason
      if (updates.nextAction !== undefined) dbUpdates.next_action = updates.nextAction

      const nextContact = updates.nextContactAt ?? updates.followUpDate
      if (nextContact !== undefined) {
        dbUpdates.next_contact_at = nextContact
      }

      if (updates.commercialFunctionId !== undefined)
        dbUpdates.commercial_function_id = updates.commercialFunctionId
      if (updates.commercialPersonId !== undefined)
        dbUpdates.commercial_person_id = updates.commercialPersonId
      if (updates.assignedToId !== undefined) dbUpdates.commercial_person_id = updates.assignedToId
      if (updates.evaluatorPersonId !== undefined)
        dbUpdates.evaluator_person_id = updates.evaluatorPersonId
      if (updates.saleValue !== undefined) dbUpdates.sale_value = updates.saleValue
      if (updates.saleDate !== undefined) dbUpdates.sale_date = updates.saleDate
      if (updates.closedAt !== undefined) dbUpdates.closed_at = updates.closedAt
      if (updates.lostAt !== undefined) dbUpdates.lost_at = updates.lostAt

      const updated = await updateLeadService(id, dbUpdates)

      // Regra 5: Sincronizar agenda de follow-up se ativo
      if (updated.stage !== 'fechado' && updated.stage !== 'perdido' && updated.next_contact_at) {
        try {
          const agendaItemSynced = await syncLeadFollowUpAgendaItem({
            leadId: updated.id,
            leadName: updated.name,
            nextContactAt: updated.next_contact_at,
            nextAction: updated.next_action,
            commercialFunctionId: updated.commercial_function_id,
            commercialPersonId: updated.commercial_person_id,
          })
          const mapped = mapDbAgendaItemToUi(agendaItemSynced)
          setAgendaItems((prev) => {
            const exists = prev.some((i) => i.id === mapped.id)
            if (exists) {
              return prev.map((i) => (i.id === mapped.id ? mapped : i))
            }
            if (mapped.dueDate === today) {
              return [mapped, ...prev]
            }
            return prev
          })
        } catch (agendaErr) {
          console.warn('Falha ao sincronizar agenda de follow-up:', agendaErr)
        }
      } else if (updated.stage === 'fechado' || updated.stage === 'perdido') {
        // Se foi fechado ou perdido, cancelar follow-ups abertos desse lead na agenda
        try {
          const matchingItems = agendaItems.filter(
            (i) => i.sourceType === 'lead' && i.sourceId === updated.id && i.status === 'aberto',
          )
          for (const m of matchingItems) {
            await cancelAgendaItemService(m.id)
          }
          setAgendaItems((prev) =>
            prev.map((i) =>
              i.sourceType === 'lead' && i.sourceId === updated.id && i.status === 'aberto'
                ? { ...i, status: 'cancelado' }
                : i,
            ),
          )
        } catch (e) {
          console.warn('Erro ao cancelar agenda de lead fechado/perdido:', e)
        }
      }

      const peopleMap = new Map(collaborators.map((c) => [c.id, c.name]))
      const rolesMap = new Map(roles.map((r) => [r.id, r.name]))
      const uiLead = mapDbLeadToUi(updated, peopleMap, rolesMap)

      setLeads((prev) => prev.map((l) => (l.id === id ? uiLead : l)))
    } catch (err) {
      console.error(`Falha ao atualizar lead ${id}:`, err)
      throw err
    }
  }

  const deleteLead = async (id: string) => {
    try {
      await deleteLeadService(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      setAgendaItems((prev) => prev.filter((i) => !(i.sourceType === 'lead' && i.sourceId === id)))
    } catch (err) {
      console.error(`Falha ao excluir lead ${id}:`, err)
      throw err
    }
  }

  const moveLeadStage = async (
    leadId: string,
    targetStage: LeadStage,
    extra?: { lossReason?: string; lossNotes?: string; nextContactAt?: string },
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const nowIso = new Date().toISOString()

    const currentLead = leads.find((l) => l.id === leadId)
    const existingNext = currentLead?.nextContactAt || currentLead?.followUpDate

    const updates: Partial<Lead> = {
      stage: targetStage,
    }

    if (targetStage === 'fechado') {
      updates.closedAt = nowIso
      updates.lostAt = null
    } else if (targetStage === 'perdido') {
      updates.lostAt = nowIso
      updates.closedAt = null
      updates.lostReason = extra?.lossReason || 'Perda sem motivo informado'
    } else {
      // Estágio ativo: exige next_contact_at
      updates.closedAt = null
      updates.lostAt = null
      updates.nextContactAt = extra?.nextContactAt || existingNext || today
      updates.followUpDate = updates.nextContactAt
    }

    await updateLead(leadId, updates)
  }

  // ----------------------------------------------------------------
  // CRUD — Scripts e Histórico de contatos
  // ----------------------------------------------------------------

  const addScript = async (
    scriptData: Omit<Script, 'id' | 'updatedAt'>,
  ): Promise<Script | null> => {
    try {
      const created = await createScriptService({
        title: scriptData.title,
        content: scriptData.content,
        stage: scriptData.stage || null,
        active: scriptData.active ?? true,
      })
      const uiScript = mapDbScriptToUi(created)
      setScripts((prev) => [uiScript, ...prev])
      return uiScript
    } catch (err) {
      console.error('Falha ao adicionar script no Supabase:', err)
      throw err
    }
  }

  const updateScript = async (id: string, updates: Partial<Script>) => {
    try {
      const updated = await updateScriptService(id, {
        title: updates.title,
        content: updates.content,
        stage: updates.stage || null,
        active: updates.active,
      })
      const uiScript = mapDbScriptToUi(updated)
      setScripts((prev) => prev.map((s) => (s.id === id ? uiScript : s)))
    } catch (err) {
      console.error(`Falha ao atualizar script ${id}:`, err)
      throw err
    }
  }

  const deleteScript = async (id: string) => {
    try {
      await deleteScriptService(id)
      setScripts((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error(`Falha ao excluir script ${id}:`, err)
      throw err
    }
  }

  const addContactHistory = async (item: Omit<ContactHistoryItem, 'id'>) => {
    try {
      const created = await createLeadContactService({
        lead_id: item.leadId,
        channel: item.type,
        notes: item.summary,
        person_id: item.personId || null,
        contact_date: item.date || new Date().toISOString(),
      })
      const peopleMap = new Map(collaborators.map((c) => [c.id, c.name]))
      const uiContact = mapDbContactToUi(created, peopleMap)
      setContactHistory((prev) => [uiContact, ...prev])
    } catch (err) {
      console.error('Falha ao registrar contato com lead no Supabase:', err)
      throw err
    }
  }

  // Reset dados: recarrega tudo do Supabase
  const resetData = async () => {
    await refreshData()
    setDentists(INITIAL_DENTISTS)
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
