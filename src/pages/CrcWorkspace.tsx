import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { Lead, LeadStage } from '@/types'
import { LeadModal, STAGES_CONFIG, ORIGIN_OPTIONS, INTEREST_OPTIONS } from '@/components/LeadModal'
import { QuickContactModal } from '@/components/QuickContactModal'
import { getTodayDateString } from '@/data/mockData'
import {
  Clock,
  AlertTriangle,
  UserPlus,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Phone,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CrcTab = 'hoje' | 'novos' | 'proximos' | 'sem_acao'

export default function CrcWorkspace() {
  const navigate = useNavigate()
  const { leads, roles, collaborators } = useApp()

  const [activeTab, setActiveTab] = useState<CrcTab>('hoje')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFunction, setFilterFunction] = useState<string>('all')
  const [filterPerson, setFilterPerson] = useState<string>('all')
  const [filterOrigin, setFilterOrigin] = useState<string>('all')

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [selectedLeadForContact, setSelectedLeadForContact] = useState<Lead | null>(null)
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false)

  const todayStr = getTodayDateString(0)

  // Classify leads into the 4 operational queues
  const { hojeLeads, novosLeads, proximosLeads, semAcaoLeads } = useMemo(() => {
    const hoje: Lead[] = []
    const novos: Lead[] = []
    const proximos: Lead[] = []
    const semAcao: Lead[] = []

    for (const lead of leads) {
      // Ignora leads já fechados ou perdidos das filas de ação diária
      if (lead.stage === 'fechado' || lead.stage === 'perdido') {
        continue
      }

      const followUpDate =
        lead.nextContactAt || (lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : '')

      // Fila 2: NOVOS LEADS (sem histórico de contato ou stage='novo' sem lastContactAt)
      if (lead.stage === 'novo' && !lead.lastContactAt) {
        novos.push(lead)
        continue
      }

      // Fila 4: SEM PRÓXIMA AÇÃO (sem data ou sem ação preenchida)
      if (!followUpDate || !lead.nextAction?.trim()) {
        semAcao.push(lead)
        continue
      }

      // Fila 1: HOJE (atrasados + vence hoje)
      if (followUpDate <= todayStr) {
        hoje.push(lead)
        continue
      }

      // Fila 3: PRÓXIMOS (follow-up no futuro)
      if (followUpDate > todayStr) {
        proximos.push(lead)
        continue
      }
    }

    // Ordenação de HOJE: mais atrasados primeiro
    hoje.sort((a, b) => {
      const dateA = a.nextContactAt || ''
      const dateB = b.nextContactAt || ''
      return dateA.localeCompare(dateB)
    })

    // Ordenação de PRÓXIMOS: mais próximos primeiro
    proximos.sort((a, b) => {
      const dateA = a.nextContactAt || ''
      const dateB = b.nextContactAt || ''
      return dateA.localeCompare(dateB)
    })

    // Ordenação de NOVOS: mais recentes primeiro
    novos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    return {
      hojeLeads: hoje,
      novosLeads: novos,
      proximosLeads: proximos,
      semAcaoLeads: semAcao,
    }
  }, [leads, todayStr])

  // Current active queue based on tab
  const currentQueueLeads = useMemo(() => {
    let list: Lead[] = []
    switch (activeTab) {
      case 'hoje':
        list = hojeLeads
        break
      case 'novos':
        list = novosLeads
        break
      case 'proximos':
        list = proximosLeads
        break
      case 'sem_acao':
        list = semAcaoLeads
        break
    }

    // Apply local filters
    return list.filter((lead) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchName = lead.name.toLowerCase().includes(q)
        const matchPhone = lead.phone.replace(/\D/g, '').includes(q)
        const matchInterest = (lead.interest || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchInterest) return false
      }

      if (filterFunction !== 'all' && lead.commercialFunctionId !== filterFunction) {
        return false
      }

      if (filterPerson !== 'all' && lead.commercialPersonId !== filterPerson) {
        return false
      }

      if (filterOrigin !== 'all' && lead.origin !== filterOrigin) {
        return false
      }

      return true
    })
  }, [
    activeTab,
    hojeLeads,
    novosLeads,
    proximosLeads,
    semAcaoLeads,
    searchTerm,
    filterFunction,
    filterPerson,
    filterOrigin,
  ])

  // Count overdue leads inside HOJE
  const overdueCount = hojeLeads.filter(
    (l) => (l.nextContactAt || (l.nextFollowUpAt ? l.nextFollowUpAt.slice(0, 10) : '')) < todayStr,
  ).length

  const handleOpenContact = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedLeadForContact(lead)
    setIsQuickContactOpen(true)
  }

  // Helper date badge
  const renderDateBadge = (lead: Lead) => {
    const d = lead.nextContactAt || (lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : '')
    if (!d) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3" /> Sem data
        </span>
      )
    }

    if (d < todayStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 text-red-600" /> Atrasado ({d})
        </span>
      )
    }

    if (d === todayStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-700" /> Vence Hoje
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <Calendar className="w-3 h-3 text-slate-400" /> {d}
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-14">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Central do CRC</h2>
            <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-xs">
              Operacional
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Fila diária de atendimento — quem contatar, por que motivo, por quem e quando.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate('/crm')}
            className="text-xs font-semibold text-slate-700 border-slate-200"
          >
            Ver Funil Kanban
          </Button>

          <Button
            onClick={() => setIsLeadModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lead</span>
          </Button>
        </div>
      </div>

      {/* Operational 4 Queues Navigation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TAB 1: HOJE */}
        <button
          type="button"
          onClick={() => setActiveTab('hoje')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'hoje'
              ? 'bg-teal-900 text-white border-teal-800 shadow-md ring-2 ring-teal-600'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                activeTab === 'hoje' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              Hoje & Atrasados
            </span>
            <Clock
              className={`w-4 h-4 ${activeTab === 'hoje' ? 'text-teal-300' : 'text-teal-700'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{hojeLeads.length}</span>
            {overdueCount > 0 && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'hoje' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                }`}
              >
                {overdueCount} atrasados
              </span>
            )}
          </div>
          <p
            className={`text-xs mt-1 line-clamp-1 ${
              activeTab === 'hoje' ? 'text-teal-100' : 'text-slate-400'
            }`}
          >
            Ações prioritárias para contato agora
          </p>
        </button>

        {/* TAB 2: NOVOS LEADS */}
        <button
          type="button"
          onClick={() => setActiveTab('novos')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'novos'
              ? 'bg-teal-900 text-white border-teal-800 shadow-md ring-2 ring-teal-600'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                activeTab === 'novos' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              Novos Leads
            </span>
            <UserPlus
              className={`w-4 h-4 ${activeTab === 'novos' ? 'text-teal-300' : 'text-teal-700'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{novosLeads.length}</span>
            <span
              className={`text-xs font-medium ${
                activeTab === 'novos' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              sem contato
            </span>
          </div>
          <p
            className={`text-xs mt-1 line-clamp-1 ${
              activeTab === 'novos' ? 'text-teal-100' : 'text-slate-400'
            }`}
          >
            Aguardando 1º contato da clínica
          </p>
        </button>

        {/* TAB 3: PRÓXIMOS */}
        <button
          type="button"
          onClick={() => setActiveTab('proximos')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'proximos'
              ? 'bg-teal-900 text-white border-teal-800 shadow-md ring-2 ring-teal-600'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                activeTab === 'proximos' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              Próximos Follow-ups
            </span>
            <Calendar
              className={`w-4 h-4 ${activeTab === 'proximos' ? 'text-teal-300' : 'text-teal-700'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{proximosLeads.length}</span>
            <span
              className={`text-xs font-medium ${
                activeTab === 'proximos' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              agendados
            </span>
          </div>
          <p
            className={`text-xs mt-1 line-clamp-1 ${
              activeTab === 'proximos' ? 'text-teal-100' : 'text-slate-400'
            }`}
          >
            Programados para os próximos dias
          </p>
        </button>

        {/* TAB 4: SEM PRÓXIMA AÇÃO */}
        <button
          type="button"
          onClick={() => setActiveTab('sem_acao')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'sem_acao'
              ? 'bg-teal-900 text-white border-teal-800 shadow-md ring-2 ring-teal-600'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                activeTab === 'sem_acao' ? 'text-teal-200' : 'text-slate-500'
              }`}
            >
              Sem Próxima Ação
            </span>
            <AlertCircle
              className={`w-4 h-4 ${
                activeTab === 'sem_acao' ? 'text-amber-300' : 'text-amber-600'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{semAcaoLeads.length}</span>
            <span
              className={`text-xs font-semibold ${
                semAcaoLeads.length > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {semAcaoLeads.length > 0 ? 'exige atenção' : 'em dia'}
            </span>
          </div>
          <p
            className={`text-xs mt-1 line-clamp-1 ${
              activeTab === 'sem_acao' ? 'text-teal-100' : 'text-slate-400'
            }`}
          >
            Leads ativos sem follow-up definido
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Buscar por nome, telefone ou interesse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div>
            <Select value={filterFunction} onValueChange={setFilterFunction}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Função Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterPerson} onValueChange={setFilterPerson}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Pessoa Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Origem do Lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {ORIGIN_OPTIONS.map((orig) => (
                  <SelectItem key={orig.key} value={orig.key}>
                    {orig.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Leads Operational List */}
      <div className="space-y-3">
        {currentQueueLeads.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhum lead pendente nesta fila no momento
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Parabéns! Todos os contatos desta categoria foram processados ou estão atualizados.
            </p>
          </div>
        ) : (
          currentQueueLeads.map((lead) => {
            const stageCfg = STAGES_CONFIG.find((s) => s.key === lead.stage)
            const roleName =
              roles.find((r) => r.id === lead.commercialFunctionId)?.name ||
              lead.assignedToRole ||
              'CRC Comercial'
            const personName =
              collaborators.find((c) => c.id === lead.commercialPersonId)?.name ||
              lead.assignedToName ||
              'Aguardando designação'

            const phoneDigits = lead.phone.replace(/\D/g, '')

            return (
              <div
                key={lead.id}
                onClick={() => navigate(`/crm/leads/${lead.id}`)}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Lead Identity & Interest */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-2xs shrink-0"
                    style={{ backgroundColor: stageCfg?.color || '#0F766E' }}
                  >
                    {lead.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{lead.name}</h4>

                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: stageCfg?.bgLight,
                          color: stageCfg?.textColor,
                          borderColor: stageCfg?.borderColor,
                        }}
                      >
                        {stageCfg?.label}
                      </span>

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                        {lead.interest}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{lead.phone}</span>
                      <span>•</span>
                      <span>Origem: {lead.origin}</span>
                      <span>•</span>
                      <span>
                        Função: <strong className="text-slate-800">{roleName}</strong>
                      </span>
                      {personName && (
                        <>
                          <span>•</span>
                          <span>Resp: {personName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Next Action & Follow-up State */}
                <div className="lg:max-w-md w-full space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Próxima ação:</span>
                    {renderDateBadge(lead)}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1 italic">
                    "{lead.nextAction || 'Sem próxima ação cadastrada'}"
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Último contato:{' '}
                    {lead.lastContactAt
                      ? new Date(lead.lastContactAt).toLocaleDateString('pt-BR')
                      : 'Nenhum ainda'}
                  </p>
                </div>

                {/* Right: Fast Action Buttons */}
                <div
                  className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`https://wa.me/55${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>

                  <Button
                    onClick={(e) => handleOpenContact(lead, e)}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold h-9 px-3 gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Registrar contato</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    className="text-xs text-slate-600 hover:text-teal-800 h-9 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Quick Contact Modal */}
      <QuickContactModal
        lead={selectedLeadForContact}
        open={isQuickContactOpen}
        onOpenChange={setIsQuickContactOpen}
      />

      {/* New Lead Modal */}
      <LeadModal open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen} defaultStage="novo" />
    </div>
  )
}
