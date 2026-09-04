import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CheckCircle2,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  UserCheck,
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const { roles, setCurrentUser } = useApp()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [errorName, setErrorName] = useState('')
  const [errorRole, setErrorRole] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!name.trim()) {
      setErrorName('Por favor, informe seu nome completo.')
      hasError = true
    } else {
      setErrorName('')
    }

    if (!selectedRoleId) {
      setErrorRole('Por favor, selecione a função que você exercerá hoje.')
      hasError = true
    } else {
      setErrorRole('')
    }

    if (hasError) return

    const role = roles.find((r) => r.id === selectedRoleId)
    if (!role) return

    const authUser = {
      name: name.trim(),
      roleId: role.id,
      roleName: role.name,
      roleColor: role.color,
    }

    setCurrentUser(authUser)
    toast({
      title: `Bem-vindo(a), ${authUser.name}!`,
      description: `Acesso realizado com a função: ${role.name}.`,
    })
    navigate('/dashboard')
  }

  // Quick helper to fill demo profiles
  const fillDemoUser = (demoName: string, roleId: string) => {
    setName(demoName)
    setSelectedRoleId(roleId)
    setErrorName('')
    setErrorRole('')
  }

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
                  ERP + CRM
                </span>
              </h1>
              <p className="text-teal-200 text-sm font-medium">
                Clínica Odontológica Multidisciplinar
              </p>
            </div>
          </div>

          <p className="text-teal-100/90 text-sm lg:text-base max-w-lg mt-4 leading-relaxed">
            Plataforma interna integrada de gestão operacional e comercial orientada a{' '}
            <strong className="text-white font-semibold">funções da empresa</strong>, garantindo
            continuidade, excelência no acolhimento e alta taxa de conversão.
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
                Checklists diários, recorrências inteligentes e controle de execução independentes
                de quem assume o turno.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                CRM: relacionamento com leads do início ao fechamento
              </h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Funil em 6 etapas, follow-ups pontuais, histórico de contatos e scripts padronizados
                para o CRC.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Cadastros flexíveis de funções, colaboradores e dentistas
              </h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Atribuição flexível muitos-para-muitos e cadastro de corpo clínico especializado.
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Floating Cards in Footer */}
        <div className="relative z-10 pt-4 border-t border-teal-600/40">
          <div className="grid grid-cols-2 gap-3">
            {/* Mini Task Card */}
            <div className="bg-teal-950/60 backdrop-blur-md rounded-xl p-3 border border-teal-500/30 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tarefa do Dia
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-semibold">
                  CRC
                </span>
              </div>
              <p className="text-xs text-white font-medium line-clamp-1">
                Follow-up dos leads do dia — CRC
              </p>
              <div className="flex items-center justify-between mt-2 text-[10px] text-teal-300/80">
                <span>Diária</span>
                <span className="text-emerald-300 font-medium">100% pronta</span>
              </div>
            </div>

            {/* Mini Lead Card */}
            <div className="bg-teal-950/60 backdrop-blur-md rounded-xl p-3 border border-teal-500/30 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Novo Lead
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-semibold">
                  Implantes
                </span>
              </div>
              <p className="text-xs text-white font-medium line-clamp-1">
                Maria — Interesse em Implantes
              </p>
              <div className="flex items-center justify-between mt-2 text-[10px] text-teal-300/80">
                <span>Instagram</span>
                <span className="text-amber-300 font-medium">Follow-up hoje</span>
              </div>
            </div>
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

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Acessar o sistema</h2>
            <p className="text-sm text-slate-500 mt-1">
              Entre com seu nome e selecione a função que você está exercendo hoje.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="userName" className="text-xs font-semibold text-slate-700">
                Nome completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="userName"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errorName) setErrorName('')
                }}
                placeholder="Ex.: Paula Rocha"
                className="h-11 border-slate-200 focus-visible:ring-teal-600"
              />
              {errorName && <p className="text-xs text-red-500">{errorName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="roleSelect" className="text-xs font-semibold text-slate-700">
                Função <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedRoleId}
                onValueChange={(val) => {
                  setSelectedRoleId(val)
                  if (errorRole) setErrorRole('')
                }}
              >
                <SelectTrigger
                  id="roleSelect"
                  className="h-11 border-slate-200 focus:ring-teal-600"
                >
                  <SelectValue placeholder="Selecione sua função atual" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-medium text-slate-800">{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorRole && <p className="text-xs text-red-500">{errorRole}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 mt-2"
            >
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* System philosophy note */}
          <div className="mt-6 p-3 rounded-lg bg-teal-50/80 border border-teal-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="text-xs text-teal-900/90 leading-relaxed">
              <strong className="font-semibold text-teal-950">Nota de arquitetura:</strong> As
              tarefas e rotinas são organizadas por <strong>função</strong>, não por pessoa.
            </p>
          </div>

          {/* Quick Demo Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Atalhos de demonstração rápida:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roles.find((r) => r.name.toLowerCase().includes('gerência')) && (
                <button
                  type="button"
                  onClick={() => {
                    const r = roles.find((role) => role.name.toLowerCase().includes('gerência'))
                    if (r) fillDemoUser('Marcos Silveira', r.id)
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-medium flex items-center gap-1 transition"
                >
                  <UserCheck className="w-3 h-3" /> Marcos (Gerência)
                </button>
              )}
              {roles.find((r) => r.name.toLowerCase().includes('crc')) && (
                <button
                  type="button"
                  onClick={() => {
                    const r = roles.find((role) => role.name.toLowerCase().includes('crc'))
                    if (r) fillDemoUser('Paula Rocha', r.id)
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-medium flex items-center gap-1 transition"
                >
                  <UserCheck className="w-3 h-3" /> Paula (CRC)
                </button>
              )}
              {roles.find((r) => r.name.toLowerCase().includes('concierge')) && (
                <button
                  type="button"
                  onClick={() => {
                    const r = roles.find((role) => role.name.toLowerCase().includes('concierge'))
                    if (r) fillDemoUser('Camila Albuquerque', r.id)
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium flex items-center gap-1 transition"
                >
                  <UserCheck className="w-3 h-3" /> Camila (Concierge)
                </button>
              )}
              {roles.find((r) => r.name.toLowerCase().includes('dentista')) && (
                <button
                  type="button"
                  onClick={() => {
                    const r = roles.find((role) => role.name.toLowerCase().includes('dentista'))
                    if (r) fillDemoUser('Dr. Rodrigo Mendes', r.id)
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-medium flex items-center gap-1 transition"
                >
                  <UserCheck className="w-3 h-3" /> Dr. Rodrigo (Dentista)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
