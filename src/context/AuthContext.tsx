import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'

export interface ResolvedPerson {
  id: string
  organization_id: string
  name: string
  auth_user_id: string
  org_role: 'OWNER' | null
  active: boolean
  created_at: string
}

export interface AuthStateResponse {
  authenticated: boolean
  person: ResolvedPerson | null
  active?: boolean
  needs_bootstrap?: boolean
  target_org_id?: string
  target_org_name?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  resolvedPerson: ResolvedPerson | null
  needsBootstrap: boolean
  targetOrgId: string | null
  targetOrgName: string | null
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsBootstrap?: boolean }>
  logout: () => Promise<void>
  bootstrapOwner: (ownerName: string) => Promise<{ success: boolean; error?: string }>
  refreshAuthState: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [resolvedPerson, setResolvedPerson] = useState<ResolvedPerson | null>(null)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null)
  const [targetOrgName, setTargetOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveAuthState = useCallback(async (currentUid: string | null) => {
    if (!currentUid) {
      setResolvedPerson(null)
      setNeedsBootstrap(false)
      setTargetOrgId(null)
      setTargetOrgName(null)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_auth_state')
      if (error) {
        console.error('Erro ao resolver get_auth_state:', error)
        return
      }

      const res = data as unknown as AuthStateResponse
      if (res?.needs_bootstrap) {
        setNeedsBootstrap(true)
        setResolvedPerson(null)
        setTargetOrgId(res.target_org_id || null)
        setTargetOrgName(res.target_org_name || null)
      } else if (res?.person) {
        setResolvedPerson(res.person)
        setNeedsBootstrap(false)
        setTargetOrgId(res.person.organization_id)
      } else {
        setResolvedPerson(null)
        setNeedsBootstrap(false)
      }
    } catch (err) {
      console.error('Erro ao carregar estado de identidade:', err)
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Regra de ouro Supabase: sync only dentro do callback onAuthStateChange
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (!newSession?.user) {
        setResolvedPerson(null)
        setNeedsBootstrap(false)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        resolveAuthState(initialSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [resolveAuthState])

  // Quando o user muda (ex.: após login), resolver o person
  useEffect(() => {
    if (user?.id) {
      resolveAuthState(user.id)
    }
  }, [user?.id, resolveAuthState])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      setUser(data.user)
      setSession(data.session)
      await resolveAuthState(data.user.id)
    }

    return { error: null }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setResolvedPerson(null)
    setNeedsBootstrap(false)
    try {
      localStorage.removeItem('ser_unico_current_user')
    } catch {
      // ignore
    }
  }

  const bootstrapOwner = async (ownerName: string) => {
    try {
      let orgId = targetOrgId
      if (!orgId) {
        orgId = await getOrganizationId()
      }

      const { data, error } = await supabase.rpc('bootstrap_owner', {
        target_org_id: orgId,
        owner_name: ownerName,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Re-resolve identidade
      if (user?.id) {
        await resolveAuthState(user.id)
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao executar bootstrap de OWNER' }
    }
  }

  const refreshAuthState = async () => {
    if (user?.id) {
      await resolveAuthState(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        resolvedPerson,
        needsBootstrap,
        targetOrgId,
        targetOrgName,
        loading,
        login,
        logout,
        bootstrapOwner,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
