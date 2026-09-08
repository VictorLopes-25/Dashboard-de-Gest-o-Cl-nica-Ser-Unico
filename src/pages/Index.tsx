import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Users,
  Layers,
  Crown,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const {
    user,
    resolvedPerson,
    needsBootstrap,
    targetOrgName,
    login,
    logout,
    bootstrapOwner,
    registerInitialOwner,
    loading: authLoading,
  } = useAuth()
  const { roles, currentUser, switchRoleContext } = useApp()
  const { toast } = useToast()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Contextual role selection when authenticated
  const [selectedRoleId, setSelectedRoleId] = useState('')

  // Redireciona para /dashboard se já estiver autenticado com pessoa ativa
  useEffect(() => {
    if ((user && resolvedPerson?.active) || currentUser) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, resolvedPerson, currentUser, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('Informe seu e-mail e senha cadastrados.')
      return
    }

    setSubmitting(true)
    try {
      const res = await login(email.trim(), password)
      if (res?.error) {
        setErrorMsg('Credenciais inválidas. Verifique seu e-mail e senha.')
        return
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha na autenticação.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Se já estiver logado, usa bootstrapOwner com nome
    if (user) {
      if (!ownerName.trim()) {
        setErrorMsg('Por favor, informe seu nome completo de proprietário/administrador.')
        return
      }

      setSubmitting(true)
      try {
        const res = await bootstrapOwner(ownerName.trim())
        if (!res.success) {
          setErrorMsg(res.error || 'Falha ao concluir o bootstrap de OWNER.')
          return
        }

        toast({
          title: 'Organização inicializada com sucesso!',
          description: 'Você foi registrado como OWNER da clínica Ser Único.',
        })
        navigate('/dashboard')
      } catch (err: any) {
        setErrorMsg(err?.message || 'Erro inesperado no setup inicial.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Se não estiver logado, realiza registro completo do primeiro OWNER
    if (!ownerName.trim()) {
      setErrorMsg('Informe o nome completo do primeiro proprietário (OWNER).')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail institucional válido.')
      return
    }
    if (!password || password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('A confirmação da senha não confere com a senha digitada.')
      return
    }

    setSubmitting(true)
    try {
      const res = await registerInitialOwner(ownerName.trim(), email.trim(), password)
      if (!res.success) {
        setErrorMsg(res.error || 'Falha ao concluir o registro do primeiro OWNER.')
        return
      }

      toast({
        title: 'Clínica configurada com sucesso!',
        description: `Bem-vindo(a), ${ownerName.trim()}. Você é o primeiro OWNER da clínica.`,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado no setup inicial do OWNER.')
    } finally {
      setSubmitting(false)
    }
  }

  // Se a pessoa autenticada está inativa
  const isInactivePerson = user && resolvedPerson && !resolvedPerson.active

  // Se a pessoa autenticada não possui cadastro de person e a org já tem OWNER (acesso negado)
  const isUnlinkedPerson = user && !resolvedPerson && !needsBootstrap

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F6F8F7]">
      {/* Left Column - Branding (desktop) */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-7/12 bg-gradient-to-br from-[#0F766E] to-[#134E4A] p-8 lg:p-14 text-white flex-col justify-between overflow-hidden">
        {/* Ambient subtle decorative background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-300 via-emerald-200 to-white flex items-center justify-center shadow-lg shadow-teal-950/40">
              <span className="text-teal-900 font-extrabold text-2xl tracking-tight">S</span>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Ser Único
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  ERP + CRM v0.0.22
                </span>
              </h1>
              <p className="text-teal-200 text-sm font-medium">
                Clínica Odontológica Multidisciplinar
              </p>
            </div>
          </div>

          <p className="text-teal-100/90 text-sm lg:text-base max-w-lg mt-4 leading-relaxed">
            Plataforma interna com isolamento estrito de tenant (RLS), autoridade organizacional de{' '}
            <strong className="text-white font-semibold">OWNER</strong> e rotinas operacionais
            orientadas a <strong className="text-white font-semibold">funções</strong> da empresa.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 my-8 space-y-4">
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                ERP: rotinas e tarefas por função
              </h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Checklists diários, recorrências inteligentes e controle de execução com isolamento
                no banco de dados.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                CRM: funil e Central do CRC integrado
              </h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Relacionamento de leads, histórico de contatos e sincronização direta com a agenda.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Segurança RLS e Governança OWNER</h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Atribuições de postos e mutações organizacionais restritas a OWNER via banco de
                dados.
              </p>
            </div>
          </div>
        </div>

        {/* Security Note Footer */}
        <div className="relative z-10 pt-4 border-t border-teal-600/40">
          <div className="flex items-center gap-2 text-xs text-teal-200/90">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Autenticação real via Supabase Auth • RLS Tenant Isolation ativado</span>
          </div>
        </div>
      </div>

      {/* Right Column - Form Panel */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-teal-900/5 border border-slate-200/80">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md">
              <span className="text-white font-extrabold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Ser Único</h1>
              <p className="text-xs text-slate-500">Clínica Odontológica Multidisciplinar</p>
            </div>
          </div>

          {/* ESTADO 1: Loading da sessão ou Transição pós-login */}
          {authLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
              <p className="text-xs">Verificando credenciais e permissões...</p>
            </div>
          ) : (user && resolvedPerson?.active) || currentUser ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Entrando...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Autenticação confirmada. Redirecionando para o painel institucional...
                </p>
              </div>
            </div>
          ) : isInactivePerson ? (
            /* ESTADO 2: Pessoa Inativa */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span>Acesso Bloqueado</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Seu cadastro de colaborador está inativo no sistema. Entre em contato com o OWNER
                  da clínica para reativação.
                </p>
              </div>
              <Button variant="outline" onClick={logout} className="w-full">
                Encerrar sessão
              </Button>
            </div>
          ) : isUnlinkedPerson ? (
            /* ESTADO 3: Usuário sem person vinculada em org com OWNER existente */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Sem Vínculo Operacional</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Sua conta de e-mail (<strong>{user?.email}</strong>) foi autenticada, mas ainda
                  não está vinculada a um colaborador ativo desta clínica. Solicite ao OWNER da
                  clínica a criação do seu cadastro.
                </p>
              </div>
              <Button variant="outline" onClick={logout} className="w-full">
                Sair
              </Button>
            </div>
          ) : needsBootstrap ? (
            /* ESTADO 4: EMENDA A — Setup Inicial de OWNER (Acessível na primeira utilização) */
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Setup Inicial Protegido</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Primeiro Acesso — Configuração do OWNER
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  A clínica <strong>{targetOrgName || 'Ser Único'}</strong> não possui nenhum
                  proprietário (OWNER) ativo cadastrado. Registre suas credenciais oficiais para
                  assumir o papel de OWNER.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleBootstrap} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-semibold text-slate-700">
                    Nome completo do Proprietário/Gestor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex.: Vitor Tati"
                    className="h-11 border-slate-200 focus-visible:ring-teal-600"
                    required
                  />
                </div>

                {!user && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="ownerEmail" className="text-xs font-semibold text-slate-700">
                        E-mail de acesso oficial <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <Input
                          id="ownerEmail"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="victor@serunico.com.br"
                          className="h-11 pl-9 border-slate-200 focus-visible:ring-teal-600"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="ownerPassword"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Definir Senha mestra (mín. 6 caracteres){' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <Input
                          id="ownerPassword"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-11 pl-9 border-slate-200 focus-visible:ring-teal-600"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="ownerConfirmPassword"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Confirmar Senha <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <Input
                          id="ownerConfirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-11 pl-9 border-slate-200 focus-visible:ring-teal-600"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                  <strong>Invariante de Segurança:</strong> O bootstrap é estritamente de uso único
                  (single-use). Assim que você for registrado, esta tela se tornará permanentemente
                  inacessível no banco de dados e novos cadastros de OWNER serão bloqueados.
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-teal-700/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Configurando OWNER...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>Registrar e Ativar como OWNER</span>
                    </>
                  )}
                </Button>

                {user && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={logout}
                    className="w-full text-xs text-slate-500"
                  >
                    Cancelar e sair
                  </Button>
                )}
              </form>
            </div>
          ) : (
            /* ESTADO 5: Formulário de Login Seguro Email + Senha */
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Acessar o sistema
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Entre com suas credenciais de acesso autenticado da clínica.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    E-mail institucional <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="victor@serunico.com.br"
                      className="h-11 pl-9 border-slate-200 focus-visible:ring-teal-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pl-9 border-slate-200 focus-visible:ring-teal-600"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* System security note */}
              <div className="mt-6 p-3 rounded-lg bg-teal-50/80 border border-teal-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-900/90 leading-relaxed">
                  <strong className="font-semibold text-teal-950">Acesso Restrito:</strong> Sessões
                  são validadas via Supabase Auth e protegidas por Row Level Security no banco de
                  dados.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
