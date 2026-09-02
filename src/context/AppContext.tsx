import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Role,
  Task,
  Lead,
  Script,
  Collaborator,
  Dentist,
  ContactHistoryItem,
  AuthUser,
  LeadStage,
  LossReason,
} from '@/types'
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
import { useToast } from '@/hooks/use-toast'

interface AppContextType {
  // Auth
  currentUser: AuthUser | null
  setCurrentUser: (user: AuthUser | null) => void
  logout: () => void
  isManagerOrAdmin: boolean

  // Roles
  roles: Role[]
  addRole: (role: Omit<Role, 'id'>) => Role
  updateRole: (id: string, role: Partial<Role>) => void
  deleteRole: (id: string) => void
  getRoleById: (id: string) => Role | undefined

  // Tasks
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskCompletion: (id: string) => void

  // Leads
  leads: Lead[]
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Lead
  updateLead: (id: string, updates: Partial<Lead>) => void
  moveLeadStage: (
    id: string,
    newStage: LeadStage,
    lossData?: { lossReason: LossReason; lossNotes?: string },
  ) => void
  deleteLead: (id: string) => void
  getLeadById: (id: string) => Lead | undefined

  // Contact History
  contactHistory: ContactHistoryItem[]
  addContactHistory: (item: Omit<ContactHistoryItem, 'id'>) => void
  getHistoryForLead: (leadId: string) => ContactHistoryItem[]

  // Scripts
  scripts: Script[]
  addScript: (script: Omit<Script, 'id' | 'updatedAt'>) => Script
  updateScript: (id: string, updates: Partial<Script>) => void
  deleteScript: (id: string) => void

  // Collaborators
  collaborators: Collaborator[]
  addCollaborator: (colab: Omit<Collaborator, 'id'>) => Collaborator
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => void
  deleteCollaborator: (id: string) => void

  // Dentists
  dentists: Dentist[]
  addDentist: (dentist: Omit<Dentist, 'id'>) => Dentist
  updateDentist: (id: string, updates: Partial<Dentist>) => void
  deleteDentist: (id: string) => void

  // Reset to initial mock
  resetData: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const STORAGE_KEYS = {
  USER: 'serunico_auth_user',
  ROLES: 'serunico_roles_v1',
  TASKS: 'serunico_tasks_v1',
  LEADS: 'serunico_leads_v1',
  SCRIPTS: 'serunico_scripts_v1',
  COLLABORATORS: 'serunico_colabs_v1',
  DENTISTS: 'serunico_dentists_v1',
  HISTORY: 'serunico_history_v1',
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast()

  // Auth User
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    // Default logged in user as Paula Rocha (CRC) for quick access if preferred, or null
    return {
      name: 'Paula Rocha',
      roleId: 'role-crc',
      roleName: 'CRC',
      roleColor: '#7C3AED',
    }
  })

  // Roles
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLES)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error(e)
    }
    return INITIAL_ROLES
  })

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLLABORATORS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_COLLABORATORS
  })

  // Dentists
  const [dentists, setDentists] = useState<Dentist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DENTISTS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_DENTISTS
  })

  // Tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_TASKS
  })

  // Leads
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEADS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_LEADS
  })

  // Scripts
  const [scripts, setScripts] = useState<Script[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCRIPTS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_SCRIPTS
  })

  // Contact History
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_CONTACT_HISTORY
  })

  // Persist changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser))
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER)
    }
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles))
  }, [roles])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLABORATORS, JSON.stringify(collaborators))
  }, [collaborators])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DENTISTS, JSON.stringify(dentists))
  }, [dentists])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads))
  }, [leads])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(scripts))
  }, [scripts])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contactHistory))
  }, [contactHistory])

  // Helper auth methods
  const setCurrentUser = (user: AuthUser | null) => {
    setCurrentUserState(user)
  }

  const logout = () => {
    setCurrentUserState(null)
  }

  const isManagerOrAdmin =
    currentUser?.roleId === 'role-gerencia' ||
    currentUser?.roleId === 'role-admin' ||
    currentUser?.roleName?.toLowerCase().includes('gerência') ||
    currentUser?.roleName?.toLowerCase().includes('administrativo')

  // Roles CRUD
  const getRoleById = (id: string) => {
    return roles.find((r) => r.id === id)
  }

  const addRole = (roleData: Omit<Role, 'id'>): Role => {
    const newRole: Role = {
      ...roleData,
      id: `role-${Date.now()}`,
    }
    setRoles((prev) => [...prev, newRole])
    toast({
      title: 'Função criada!',
      description: `A função "${newRole.name}" foi adicionada com sucesso.`,
    })
    return newRole
  }

  const updateRole = (id: string, updates: Partial<Role>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    toast({ title: 'Função atualizada com sucesso!' })
  }

  const deleteRole = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
    toast({ title: 'Função excluída.' })
  }

  // Tasks CRUD with intelligent recurrence
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>): Task => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: getTodayDateString(0),
    }
    setTasks((prev) => [newTask, ...prev])
    toast({
      title: 'Tarefa salva!',
      description: `A tarefa "${newTask.title}" foi cadastrada com sucesso.`,
    })
    return newTask
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    toast({ title: 'Tarefa excluída.' })
  }

  const toggleTaskCompletion = (id: string) => {
    const targetTask = tasks.find((t) => t.id === id)
    if (!targetTask) return

    if (targetTask.status === 'Concluída') {
      // Revert to Pendente
      updateTask(id, { status: 'Pendente', completedAt: undefined })
      toast({ title: 'Tarefa reaberta.', description: 'Status alterado para Pendente.' })
      return
    }

    // Mark as completed
    const completedAt = new Date().toISOString()
    updateTask(id, { status: 'Concluída', completedAt })

    // Check intelligent recurrence
    if (targetTask.recurrence !== 'Única') {
      const baseDate = new Date(targetTask.dueDate || getTodayDateString(0))
      let nextDate = new Date(baseDate)

      if (targetTask.recurrence === 'Diária') {
        nextDate.setDate(baseDate.getDate() + 1)
      } else if (targetTask.recurrence === 'Semanal') {
        nextDate.setDate(baseDate.getDate() + 7)
      } else if (targetTask.recurrence === 'Mensal') {
        nextDate.setMonth(baseDate.getMonth() + 1)
      }

      const nextDateStr = nextDate.toISOString().split('T')[0]
      const formattedDate = nextDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      const recurringNextTask: Task = {
        id: `task-${Date.now()}`,
        title: targetTask.title,
        roleId: targetTask.roleId,
        status: 'Pendente',
        recurrence: targetTask.recurrence,
        assignedCollaboratorId: targetTask.assignedCollaboratorId,
        dueDate: nextDateStr,
        createdAt: getTodayDateString(0),
      }

      setTasks((prev) => [recurringNextTask, ...prev])

      toast({
        title: 'Tarefa concluída!',
        description: `Próxima ocorrência criada para ${formattedDate}.`,
      })
    } else {
      toast({
        title: 'Tarefa concluída!',
        description: `"${targetTask.title}" foi marcada como finalizada.`,
      })
    }
  }

  // Leads CRUD
  const getLeadById = (id: string) => {
    return leads.find((l) => l.id === id)
  }

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead => {
    const today = getTodayDateString(0)
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: today,
      updatedAt: today,
    }
    setLeads((prev) => [newLead, ...prev])
    toast({ title: 'Lead criado!', description: `Lead "${newLead.name}" cadastrado com sucesso.` })
    return newLead
  }

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: getTodayDateString(0) } : l)),
    )
  }

  const moveLeadStage = (
    id: string,
    newStage: LeadStage,
    lossData?: { lossReason: LossReason; lossNotes?: string },
  ) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return

    const updates: Partial<Lead> = {
      stage: newStage,
      updatedAt: getTodayDateString(0),
    }

    if (newStage === 'Perdido' && lossData) {
      updates.lossReason = lossData.lossReason
      updates.lossNotes = lossData.lossNotes
    }

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))

    // Register movement in contact history timeline
    const historyItem: ContactHistoryItem = {
      id: `hist-${Date.now()}`,
      leadId: id,
      type: 'Presencial',
      date: `${getTodayDateString(0)} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      summary:
        newStage === 'Perdido'
          ? `Etapa alterada para Perdido. Motivo: ${lossData?.lossReason}${lossData?.lossNotes ? ` (${lossData.lossNotes})` : ''}`
          : newStage === 'Fechado'
            ? `Tratamento fechado com sucesso! 🎉`
            : `Etapa alterada de ${lead.stage} para ${newStage}.`,
      registeredBy: currentUser?.name || 'Sistema',
    }
    setContactHistory((prev) => [historyItem, ...prev])

    if (newStage === 'Fechado') {
      toast({
        title: 'Lead fechado! 🎉',
        description: `Parabéns pelo fechamento do tratamento de ${lead.name}!`,
      })
    } else {
      toast({
        title: `Lead movido para ${newStage}`,
        description: `${lead.name} agora está na etapa ${newStage}.`,
      })
    }
  }

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    toast({ title: 'Lead excluído.' })
  }

  // Contact history
  const addContactHistory = (item: Omit<ContactHistoryItem, 'id'>) => {
    const newItem: ContactHistoryItem = {
      ...item,
      id: `hist-${Date.now()}`,
    }
    setContactHistory((prev) => [newItem, ...prev])
    // update lead updatedAt
    updateLead(item.leadId, { updatedAt: getTodayDateString(0) })
    toast({ title: 'Contato registrado!', description: `Registro salvo no histórico com sucesso.` })
  }

  const getHistoryForLead = (leadId: string) => {
    return contactHistory
      .filter((h) => h.leadId === leadId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  // Scripts CRUD
  const addScript = (scriptData: Omit<Script, 'id' | 'updatedAt'>): Script => {
    const newScript: Script = {
      ...scriptData,
      id: `script-${Date.now()}`,
      updatedAt: getTodayDateString(0),
    }
    setScripts((prev) => [newScript, ...prev])
    toast({ title: 'Script criado!', description: `Script "${newScript.title}" adicionado.` })
    return newScript
  }

  const updateScript = (id: string, updates: Partial<Script>) => {
    setScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: getTodayDateString(0) } : s)),
    )
    toast({ title: 'Script atualizado!', description: 'Alterações salvas com sucesso.' })
  }

  const deleteScript = (id: string) => {
    setScripts((prev) => prev.filter((s) => s.id !== id))
    toast({ title: 'Script excluído.' })
  }

  // Collaborators CRUD
  const addCollaborator = (colabData: Omit<Collaborator, 'id'>): Collaborator => {
    const newColab: Collaborator = {
      ...colabData,
      id: `colab-${Date.now()}`,
    }
    setCollaborators((prev) => [...prev, newColab])
    toast({
      title: 'Colaborador cadastrado!',
      description: `${newColab.name} adicionado ao quadro.`,
    })
    return newColab
  }

  const updateCollaborator = (id: string, updates: Partial<Collaborator>) => {
    setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    toast({ title: 'Colaborador atualizado!' })
  }

  const deleteCollaborator = (id: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Colaborador excluído.' })
  }

  // Dentists CRUD
  const addDentist = (dentistData: Omit<Dentist, 'id'>): Dentist => {
    const newDentist: Dentist = {
      ...dentistData,
      id: `dentist-${Date.now()}`,
    }
    setDentists((prev) => [...prev, newDentist])
    toast({
      title: 'Dentista cadastrado!',
      description: `${newDentist.name} registrado com sucesso.`,
    })
    return newDentist
  }

  const updateDentist = (id: string, updates: Partial<Dentist>) => {
    setDentists((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
    toast({ title: 'Dentista atualizado!' })
  }

  const deleteDentist = (id: string) => {
    setDentists((prev) => prev.filter((d) => d.id !== id))
    toast({ title: 'Dentista excluído.' })
  }

  const resetData = () => {
    setRoles(INITIAL_ROLES)
    setCollaborators(INITIAL_COLLABORATORS)
    setDentists(INITIAL_DENTISTS)
    setTasks(INITIAL_TASKS)
    setLeads(INITIAL_LEADS)
    setScripts(INITIAL_SCRIPTS)
    setContactHistory(INITIAL_CONTACT_HISTORY)
    toast({ title: 'Dados restaurados para o padrão de demonstração!' })
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout,
        isManagerOrAdmin,
        roles,
        addRole,
        updateRole,
        deleteRole,
        getRoleById,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        leads,
        addLead,
        updateLead,
        moveLeadStage,
        deleteLead,
        getLeadById,
        contactHistory,
        addContactHistory,
        getHistoryForLead,
        scripts,
        addScript,
        updateScript,
        deleteScript,
        collaborators,
        addCollaborator,
        updateCollaborator,
        deleteCollaborator,
        dentists,
        addDentist,
        updateDentist,
        deleteDentist,
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
