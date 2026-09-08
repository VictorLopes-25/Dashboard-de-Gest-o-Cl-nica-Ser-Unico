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
  registerInitialOwner: (
    name: string,
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>
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

  const checkBootstrapAvailability = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_bootstrap_status')
      if (!error && data) {
        const res = data as {
          available: boolean
          target_org_id?: string
          target_org_name?: string
          owner_count?: number
        }
        if (res.available) {
          setNeedsBootstrap(true)
          if (res.target_org_id) setTargetOrgId(res.target_org_id)
          if (res.target_org_name) setTargetOrgName(res.target_org_name)
          return true
        }
      }
    } catch (err) {
      console.error('Erro ao verificar disponibilidade de bootstrap:', err)
    }
    return false
  }, [])

  const resolveAuthState = useCallback(
    async (currentUid: string | null) => {
      if (!currentUid) {
        setResolvedPerson(null)
        await checkBootstrapAvailability()
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
    },
    [checkBootstrapAvailability],
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Regra de ouro Supabase: sync only dentro do callback onAuthStateChange
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (!newSession?.user) {
        setResolvedPerson(null)
        checkBootstrapAvailability().finally(() => setLoading(false))
      }
    })

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        resolveAuthState(initialSession.user.id).finally(() => setLoading(false))
      } else {
        checkBootstrapAvailability().finally(() => setLoading(false))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [resolveAuthState, checkBootstrapAvailability])

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

  const registerInitialOwner = async (name: string, emailStr: string, pass: string) => {
    try {
      let orgId = targetOrgId
      if (!orgId) {
        orgId = await getOrganizationId()
      }

      // 1. Invoca a RPC atômica bootstrap_initial_owner
      const { data, error } = await (supabase.rpc as any)('bootstrap_initial_owner', {
        target_org_id: orgId,
        owner_name: name,
        owner_email: emailStr,
        owner_password: pass,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // 2. Com a conta de auth criada e vinculada como OWNER, autentica o usuário
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailStr,
        password: pass,
      })

      if (signInError) {
        return {
          success: false,
          error: `Cadastro concluído com sucesso, mas o login automático falhou: ${signInError.message}`,
        }
      }

      // 3. Atualizar estado de autenticação
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        setSession(sessionData.session)
        setUser(sessionData.session.user)
        await resolveAuthState(sessionData.session.user.id)
      }

      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha no processo de inicialização do primeiro OWNER.',
      }
    }
  }

  const refreshAuthState = async () => {
    if (user?.id) {
      await resolveAuthState(user.id)
    } else {
      await checkBootstrapAvailability()
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
        registerInitialOwner,
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
