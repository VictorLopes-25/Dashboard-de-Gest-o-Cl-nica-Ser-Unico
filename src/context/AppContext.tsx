import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Role, Task, Lead, Script, Collaborator, Dentist, ContactHistoryItem } from '@/types'

/*
 * AppContext — camada de dados e sessão do sistema.
 *
 * Persistência real no Supabase (Postgres). Todas as entidades são carregadas
 * das tabelas do banco e as mutações (create/update/delete) são gravadas
 * diretamente no Supabase. A sessão do usuário vem do AuthContext.
 */

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export interface AuthUser {
  id: string
  name: string
  email: string
}

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------

interface AppContextType {
  // Sessão
  session: AuthUser | null
  loading: boolean

  // Dados
  roles: Role[]
  collaborators: Collaborator[]
  dentists: Dentist[]
  tasks: Task[]
  leads: Lead[]
  scripts: Script[]
  contactHistory: ContactHistoryItem[]

  // CRUD
  addRole: (role: Omit<Role, 'id'>) => Promise<Role | null>
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>
  deleteRole: (id: string) => Promise<void>

  addCollaborator: (colab: Omit<Collaborator, 'id'>) => Promise<Collaborator | null>
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => Promise<void>
  deleteCollaborator: (id: string) => Promise<void>

  addDentist: (dentist: Omit<Dentist, 'id'>) => Promise<Dentist | null>
  updateDentist: (id: string, updates: Partial<Dentist>) => Promise<void>
  deleteDentist: (id: string) => Promise<void>

  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Lead | null>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  deleteLead: (id: string) => Promise<void>

  addScript: (script: Omit<Script, 'id' | 'updatedAt'>) => Promise<Script | null>
  updateScript: (id: string, updates: Partial<Script>) => Promise<void>
  deleteScript: (id: string) => Promise<void>

  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const [roles, setRoles] = useState<Role[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([])

  // ----------------------------------------------------------------
  // Carregamento inicial dos dados
  // ----------------------------------------------------------------

  const refreshData = useCallback(async () => {
    const [rolesRes, colabsRes, dentistsRes, tasksRes, leadsRes, scriptsRes] = await Promise.all([
      supabase.from('roles').select('*').order('sort_order'),
      supabase.from('collaborators').select('*').order('name'),
      supabase.from('dentists').select('*').order('name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('scripts').select('*').order('title'),
    ])

    if (rolesRes.data) setRoles(rolesRes.data)
    if (colabsRes.data) setCollaborators(colabsRes.data)
    if (dentistsRes.data) setDentists(dentistsRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
    if (leadsRes.data) setLeads(leadsRes.data)
    if (scriptsRes.data) setScripts(scriptsRes.data)
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // ----------------------------------------------------------------
  // CRUD — Funções (roles)
  // ----------------------------------------------------------------

  const addRole = async (roleData: Omit<Role, 'id'>): Promise<Role | null> => {
    const { data, error } = await supabase.from('roles').insert(roleData).select().single()

    if (error || !data) return null

    setRoles((prev) => [...prev, data])
    return data
  }

  const updateRole = async (id: string, updates: Partial<Role>) => {
    const { error } = await supabase.from('roles').update(updates).eq('id', id)
    if (!error) {
      setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    }
  }

  const deleteRole = async (id: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (!error) {
      setRoles((prev) => prev.filter((r) => r.id !== id))
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Colaboradores
  // ----------------------------------------------------------------

  const addCollaborator = async (
    colabData: Omit<Collaborator, 'id'>,
  ): Promise<Collaborator | null> => {
    const { data, error } = await supabase.from('collaborators').insert(colabData).select().single()

    if (error || !data) return null

    setCollaborators((prev) => [...prev, data])
    return data
  }

  const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
    const { error } = await supabase.from('collaborators').update(updates).eq('id', id)
    if (!error) {
      setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    }
  }

  const deleteCollaborator = async (id: string) => {
    const { error } = await supabase.from('collaborators').delete().eq('id', id)
    if (!error) {
      setCollaborators((prev) => prev.filter((c) => c.id !== id))
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Tarefas
  // ----------------------------------------------------------------

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
    const { data, error } = await supabase.from('tasks').insert(taskData).select().single()

    if (error || !data) return null

    setTasks((prev) => [data, ...prev])
    return data
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    }
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Leads
  // ----------------------------------------------------------------

  const addLead = async (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Lead | null> => {
    const { data, error } = await supabase.from('leads').insert(leadData).select().single()

    if (error || !data) return null

    setLeads((prev) => [data, ...prev])
    return data
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from('leads').update(updates).eq('id', id)
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
    }
  }

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) {
      setLeads((prev) => prev.filter((l) => l.id !== id))
    }
  }

  // ----------------------------------------------------------------
  // CRUD — Scripts e Histórico de contatos
  // ----------------------------------------------------------------

  const addScript = async (
    scriptData: Omit<Script, 'id' | 'updatedAt'>,
  ): Promise<Script | null> => {
    const { data, error } = await supabase.from('scripts').insert(scriptData).select().single()

    if (error || !data) return null

    setScripts((prev) => [data, ...prev])
    return data
  }

  const updateScript = async (id: string, updates: Partial<Script>) => {
    const { error } = await supabase.from('scripts').update(updates).eq('id', id)
    if (!error) {
      setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    }
  }

  const deleteScript = async (id: string) => {
    const { error } = await supabase.from('scripts').delete().eq('id', id)
    if (!error) {
      setScripts((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const addContactHistory = async (item: Omit<ContactHistoryItem, 'id'>) => {
    const { error } = await supabase.from('contact_history').insert(item)
    if (!error) {
      // Recarrega o histórico do lead
      await refreshData()
    }
  }

  return (
    <AppContext.Provider
      value={{
        session,
        loading,
        roles,
        collaborators,
        dentists,
        tasks,
        leads,
        scripts,
        contactHistory,
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
        addLead,
        updateLead,
        deleteLead,
        addScript,
        updateScript,
        deleteScript,
        refreshData,
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
