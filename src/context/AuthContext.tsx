import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

/*
 * AuthContext — sessão do usuário autenticado no Supabase Auth.
 *
 * O AppContext cuida dos dados do negócio (funções, colaboradores, dentistas,
 * tarefas, leads e scripts). Este contexto só expõe quem está logado,
 * o estado de carregamento e as ações de entrar/sair.
 */

interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  session: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        setSession({
          id: user.id,
          name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
        })
      }
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        setSession({
          id: newSession.user.id,
          name:
            (newSession.user.user_metadata?.full_name as string) ||
            newSession.user.email?.split('@')[0] ||
            'Usuário',
          email: newSession.user.email || '',
        })
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
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
