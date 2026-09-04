import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  INITIAL_ROLES,
  INITIAL_COLLABORATORS,
  INITIAL_DENTISTS,
  INITIAL_TASKS,
  INITIAL_LEADS,
  INITIAL_SCRIPTS,
  INITIAL_CONTACT_HISTORY,
  getTodayDateString,
} from '@/data/mockData'
import type {
  AuthUser,
  Role,
  Task,
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

export type { AuthUser }

// ------------------------------------------------------------------
// Mappers: DB row (snake_case) <-> Frontend types (camelCase)
// ------------------------------------------------------------------

function mapDbRole(r: any): Role {
  return {
    id: r.id,
    name: r.name,
    color: r.color || '#0F766E',
    bgLight: r.bg_light || '#CCFBF1',
    textColor: r.text_color || '#0F766E',
    borderColor: r.border_color || '#5EEAD4',
    description: r.description || '',
    sortOrder: r.sort_order ?? 0,
  }
}

function roleToDb(r: Partial<Role>): any {
  const out: any = {}
  if (r.name !== undefined) out.name = r.name
  if (r.color !== undefined) out.color = r.color
  if (r.bgLight !== undefined) out.bg_light = r.bgLight
  if (r.textColor !== undefined) out.text_color = r.textColor
  if (r.borderColor !== undefined) out.border_color = r.borderColor
  if (r.description !== undefined) out.description = r.description
  if (r.sortOrder !== undefined) out.sort_order = r.sortOrder
  return out
}

function mapDbCollaborator(c: any): Collaborator {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    email: c.email || '',
    roleIds: Array.isArray(c.role_ids) ? c.role_ids : [],
    isActive: c.is_active ?? true,
  }
}

function collaboratorToDb(c: Partial<Collaborator>): any {
  const out: any = {}
  if (c.name !== undefined) out.name = c.name
  if (c.phone !== undefined) out.phone = c.phone
  if (c.email !== undefined) out.email = c.email
  if (c.roleIds !== undefined) out.role_ids = c.roleIds
  if (c.isActive !== undefined) out.is_active = c.isActive
  return out
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

function mapDbTask(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    roleId: t.role_id,
    status: t.status as TaskStatus,
    recurrence: t.recurrence as TaskRecurrence,
    assignedCollaboratorId: t.assigned_collaborator_id || null,
    dueDate: t.due_date || getTodayDateString(0),
    completedAt: t.completed_at || null,
    createdAt: t.created_at,
  }
}

function taskToDb(t: Partial<Task>): any {
  const out: any = {}
  if (t.title !== undefined) out.title = t.title
  if (t.roleId !== undefined) out.role_id = t.roleId
  if (t.status !== undefined) out.status = t.status
  if (t.recurrence !== undefined) out.recurrence = t.recurrence
  if (t.assignedCollaboratorId !== undefined)
    out.assigned_collaborator_id = t.assignedCollaboratorId
  if (t.dueDate !== undefined) out.due_date = t.dueDate
  if (t.completedAt !== undefined) out.completed_at = t.completedAt
  return out
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

  // CRUD Tarefas
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
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
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
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
  // Carregamento inicial dos dados (mocks/localStorage)
  // ----------------------------------------------------------------

  const refreshData = useCallback(async () => {
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshData()
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
  // CRUD — Funções (roles)
  // ----------------------------------------------------------------

  const addRole = async (roleData: Omit<Role, 'id'>): Promise<Role | null> => {
    const localRole: Role = {
      ...roleData,
      id: `role-local-${Date.now()}`,
    }
    setRoles((prev) => [...prev, localRole])
    return localRole
  }

  const updateRole = async (id: string, updates: Partial<Role>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const deleteRole = async (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }

  // ----------------------------------------------------------------
  // CRUD — Colaboradores
  // ----------------------------------------------------------------

  const addCollaborator = async (
    colabData: Omit<Collaborator, 'id'>,
  ): Promise<Collaborator | null> => {
    const localColab: Collaborator = {
      ...colabData,
      id: `colab-local-${Date.now()}`,
    }
    setCollaborators((prev) => [...prev, localColab])
    return localColab
  }

  const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
    setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const deleteCollaborator = async (id: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== id))
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
  // CRUD — Tarefas
  // ----------------------------------------------------------------

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
    const localTask: Task = {
      ...taskData,
      id: `task-local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [localTask, ...prev])
    return localTask
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleTaskCompletion = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const isNowCompleted = task.status !== 'Concluída'
    const newStatus: TaskStatus = isNowCompleted ? 'Concluída' : 'Pendente'
    const completedAt = isNowCompleted ? new Date().toISOString() : null
    await updateTask(id, { status: newStatus, completedAt })
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

  // Reset dados locais para dados de demonstração
  const resetData = async () => {
    setRoles(INITIAL_ROLES)
    setCollaborators(INITIAL_COLLABORATORS)
    setDentists(INITIAL_DENTISTS)
    setTasks(INITIAL_TASKS)
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
