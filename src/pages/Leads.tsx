import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { Lead, LeadStage, LeadOrigin, LeadInterest } from '@/types'
import { LeadModal, STAGES_CONFIG, ORIGIN_OPTIONS, INTEREST_OPTIONS } from '@/components/LeadModal'
import { LossModal } from '@/components/LossModal'
import { getTodayDateString } from '@/data/mockData'
import {
  Plus,
  Search,
  RotateCcw,
  Clock,
  Phone,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Leads() {
  const navigate = useNavigate()
  const { leads, collaborators, dentists, moveLeadStage } = useApp()

  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban')

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<string>('all')
  const [filterInterest, setFilterInterest] = useState<string>('all')
  const [filterResponsible, setFilterResponsible] = useState<string>('all')

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [defaultStageForModal, setDefaultStageForModal] = useState<LeadStage>('Novo')

  const [lossModalOpen, setLossModalOpen] = useState(false)
  const [leadPendingLoss, setLeadPendingLoss] = useState<Lead | null>(null)

  // Drag and drop state
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null)

  const todayStr = getTodayDateString(0)

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search by name or phone
      if (filterSearch) {
        const query = filterSearch.toLowerCase()
        const matchesName = lead.name.toLowerCase().includes(query)
        const matchesPhone = lead.phone.replace(/\D/g, '').includes(query)
        if (!matchesName && !matchesPhone) return false
      }
      // Origin
      if (filterOrigin !== 'all' && lead.origin !== filterOrigin) return false
      // Interest
      if (filterInterest !== 'all' && lead.interest !== filterInterest) return false
      // Responsible
      if (filterResponsible !== 'all' && lead.assignedToId !== filterResponsible) return false

      return true
    })
  }, [leads, filterSearch, filterOrigin, filterInterest, filterResponsible])

  // Clear filters
  const clearFilters = () => {
    setFilterSearch('')
    setFilterOrigin('all')
    setFilterInterest('all')
    setFilterResponsible('all')
  }

  // Handle stage change (via drag or menu)
  const handleStageChangeRequest = (lead: Lead, targetStage: LeadStage) => {
    if (lead.stage === targetStage) return

    if (targetStage === 'Perdido') {
      setLeadPendingLoss(lead)
      setLossModalOpen(true)
    } else {
      moveLeadStage(lead.id, targetStage)
    }
  }

  // Confirm loss
  const handleConfirmLoss = (reason: any, notes?: string) => {
    if (leadPendingLoss) {
      moveLeadStage(leadPendingLoss.id, 'Perdido', {
        lossReason: reason,
        lossNotes: notes,
      })
      setLeadPendingLoss(null)
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData('text/plain', lead.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingLeadId(lead.id)
  }

  const handleDragEnd = () => {
    setDraggingLeadId(null)
    setDragOverStage(null)
  }

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    setDragOverStage(null)
    setDraggingLeadId(null)

    const lead = leads.find((l) => l.id === leadId)
    if (lead) {
      handleStageChangeRequest(lead, targetStage)
    }
  }

  // Helper for origin badge styles
  const getOriginBadgeStyle = (origin: string) => {
    switch (origin) {
      case 'Instagram':
        return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'Google':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Indicação':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'WhatsApp':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'Site':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'Facebook':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  // Helper for follow-up date visual state
  const getFollowUpStatus = (dateStr: string) => {
    if (!dateStr) return { color: 'text-slate-400', label: 'Sem prazo' }
    if (dateStr < todayStr) {
      return {
        color: 'text-red-600 font-bold',
        iconColor: 'text-red-500',
        bg: 'bg-red-50 border-red-200',
        label: 'Atrasado',
      }
    }
    if (dateStr === todayStr) {
      return {
        color: 'text-amber-700 font-bold',
        iconColor: 'text-amber-500',
        bg: 'bg-amber-50 border-amber-200',
        label: 'Hoje',
      }
    }
    const [year, month, day] = dateStr.split('-')
    return {
      color: 'text-slate-600',
      iconColor: 'text-slate-400',
      bg: 'bg-slate-50 border-slate-200',
      label: `${day}/${month}`,
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Leads</h2>
          <p className="text-sm text-slate-500">
            Acompanhe o funil de relacionamento comercial desde a atração até o fechamento
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'lista'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <Button
            onClick={() => {
              setDefaultStageForModal('Novo')
              setIsLeadModalOpen(true)
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo lead</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          {/* Origin */}
          <div>
            <Select value={filterOrigin} onValueChange={(val) => setFilterOrigin(val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {ORIGIN_OPTIONS.map((orig) => (
                  <SelectItem key={orig} value={orig}>
                    {orig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interest */}
          <div>
            <Select value={filterInterest} onValueChange={(val) => setFilterInterest(val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todos os interesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os interesses</SelectItem>
                {INTEREST_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsible */}
          <div className="flex items-center gap-2">
            <Select value={filterResponsible} onValueChange={(val) => setFilterResponsible(val)}>
              <SelectTrigger className="h-10 text-sm flex-1">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (CRC)
                  </SelectItem>
                ))}
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} (Dentista)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterSearch ||
              filterOrigin !== 'all' ||
              filterInterest !== 'all' ||
              filterResponsible !== 'all') && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Limpar filtros"
                className="h-10 w-10 shrink-0 text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1280px]">
            {STAGES_CONFIG.map((stageConfig) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stageConfig.key)
              const isOver = dragOverStage === stageConfig.key

              return (
                <div
                  key={stageConfig.key}
                  onDragOver={(e) => handleDragOver(e, stageConfig.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stageConfig.key)}
                  className={`flex-1 min-w-[210px] rounded-2xl flex flex-col transition-all ${
                    isOver
                      ? 'bg-teal-50/70 ring-2 ring-teal-500 ring-offset-2'
                      : 'bg-slate-100/70 border border-slate-200/80'
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stageConfig.dotColor }}
                      />
                      <span className="font-bold text-xs text-slate-800">{stageConfig.label}</span>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: stageConfig.bgLight,
                        color: stageConfig.textColor,
                      }}
                    >
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Column Cards Container */}
                  <div className="p-2.5 space-y-2.5 flex-1 min-h-[480px]">
                    {stageLeads.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const isDragging = draggingLeadId === lead.id
                        const followUpInfo = getFollowUpStatus(lead.followUpDate)
                        const assignedInitial = lead.assignedToName
                          ? lead.assignedToName.charAt(0).toUpperCase()
                          : 'CRC'

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/crm/leads/${lead.id}`)}
                            className={`group relative bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-400/80 transition-all cursor-pointer select-none ${
                              isDragging
                                ? 'opacity-40 scale-105 rotate-1 shadow-2xl ring-2 ring-teal-500'
                                : ''
                            }`}
                          >
                            {/* Card Top: Name + Action Menu (mobile/quick) */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-800 transition line-clamp-1">
                                  {lead.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {lead.phone}
                                </p>
                              </div>

                              {/* Mobile / Quick Move dropdown */}
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                      aria-label="Opções do lead"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel className="text-xs">
                                      Mover para etapa:
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {STAGES_CONFIG.map((stg) => (
                                      <DropdownMenuItem
                                        key={stg.key}
                                        disabled={stg.key === lead.stage}
                                        onClick={() => handleStageChangeRequest(lead, stg.key)}
                                        className="text-xs flex items-center gap-2"
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: stg.color }}
                                        />
                                        <span>{stg.label}</span>
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                      className="text-xs font-semibold text-teal-800"
                                    >
                                      Ver Detalhes do Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Badges: Origin + Interest */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getOriginBadgeStyle(
                                  lead.origin,
                                )}`}
                              >
                                {lead.origin}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {lead.interest}
                              </span>
                            </div>

                            {/* Next Action 1 line preview */}
                            <p
                              className="text-xs text-slate-600 mt-2.5 line-clamp-1 italic bg-slate-50/70 p-1.5 rounded-md border border-slate-100"
                              title={lead.nextAction}
                            >
                              ⚡ {lead.nextAction}
                            </p>

                            {/* Card Footer: Follow-up date + Assigned avatar */}
                            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px]">
                              <div
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${followUpInfo.bg}`}
                              >
                                <Clock className={`w-3 h-3 ${followUpInfo.iconColor}`} />
                                <span className={followUpInfo.color}>{followUpInfo.label}</span>
                              </div>

                              <div
                                className="w-6 h-6 rounded-full bg-teal-800 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs"
                                title={`Responsável: ${lead.assignedToName || 'Equipe'}`}
                              >
                                {assignedInitial}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* VIEW: LIST TABLE */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Nome do Lead</TableHead>
                <TableHead className="font-semibold text-slate-700">Telefone</TableHead>
                <TableHead className="font-semibold text-slate-700">Origem</TableHead>
                <TableHead className="font-semibold text-slate-700">Interesse</TableHead>
                <TableHead className="font-semibold text-slate-700">Etapa do Funil</TableHead>
                <TableHead className="font-semibold text-slate-700">Responsável</TableHead>
                <TableHead className="font-semibold text-slate-700">Próxima Ação</TableHead>
                <TableHead className="font-semibold text-slate-700">Follow-up</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                    Nenhum lead encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const stageConfig = STAGES_CONFIG.find((s) => s.key === lead.stage)
                  const followUpInfo = getFollowUpStatus(lead.followUpDate)

                  return (
                    <TableRow
                      key={lead.id}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="font-bold text-sm text-slate-900">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {lead.phone}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getOriginBadgeStyle(
                            lead.origin,
                          )}`}
                        >
                          {lead.origin}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {lead.interest}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.stage}
                          onValueChange={(val) => handleStageChangeRequest(lead, val as LeadStage)}
                        >
                          <SelectTrigger
                            className="h-8 text-xs font-bold border"
                            style={{
                              backgroundColor: stageConfig?.bgLight,
                              color: stageConfig?.textColor,
                              borderColor: stageConfig?.borderColor,
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES_CONFIG.map((stg) => (
                              <SelectItem key={stg.key} value={stg.key}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: stg.color }}
                                  />
                                  <span>{stg.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {lead.assignedToName || '—'}
                      </TableCell>
                      <TableCell
                        className="text-xs text-slate-600 max-w-[200px] truncate"
                        title={lead.nextAction}
                      >
                        {lead.nextAction}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${followUpInfo.bg} ${followUpInfo.color}`}
                        >
                          <Clock className={`w-3 h-3 ${followUpInfo.iconColor}`} />
                          {followUpInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/crm/leads/${lead.id}`)}
                          className="text-xs text-teal-700 hover:text-teal-900"
                        >
                          Ver <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Lead Modal */}
      <LeadModal
        open={isLeadModalOpen}
        onOpenChange={setIsLeadModalOpen}
        defaultStage={defaultStageForModal}
      />

      {/* Mandatory Loss Modal */}
      <LossModal
        open={lossModalOpen}
        onOpenChange={setLossModalOpen}
        leadName={leadPendingLoss?.name || ''}
        onConfirm={handleConfirmLoss}
      />
    </div>
  )
}
