import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { LeadStage, ContactType } from '@/types'
import { STAGES_CONFIG } from '@/components/LeadModal'
import { LossModal } from '@/components/LossModal'
import { getTodayDateString } from '@/data/mockData'
import {
  Phone,
  MessageCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  User,
  Mail,
  Edit3,
  Plus,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertTriangle,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getLeadById,
    updateLead,
    moveLeadStage,
    getHistoryForLead,
    addContactHistory,
    scripts,
    currentUser,
  } = useApp()

  const lead = getLeadById(id || '')

  // Modals state
  const [lossModalOpen, setLossModalOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [editActionModalOpen, setEditActionModalOpen] = useState(false)

  // Edit next action form
  const [editNextAction, setEditNextAction] = useState('')
  const [editFollowUpDate, setEditFollowUpDate] = useState('')

  // Register contact form
  const [contactType, setContactType] = useState<ContactType>('WhatsApp')
  const [contactDateTime, setContactDateTime] = useState('')
  const [contactSummary, setContactSummary] = useState('')
  const [isScriptExpanded, setIsScriptExpanded] = useState(true)
  const [scriptUsedTitle, setScriptUsedTitle] = useState<string>('')

  const todayStr = getTodayDateString(0)

  if (!lead) {
    return (
      <div className="bg-white p-12 rounded-2xl border text-center space-y-4 max-w-lg mx-auto mt-10">
        <h2 className="text-xl font-bold text-slate-800">Lead não encontrado</h2>
        <p className="text-sm text-slate-500">
          O registro solicitado pode ter sido excluído ou não existe.
        </p>
        <Button
          onClick={() => navigate('/crm')}
          className="bg-teal-700 hover:bg-teal-800 text-white"
        >
          Voltar para a lista de Leads
        </Button>
      </div>
    )
  }

  const historyList = getHistoryForLead(lead.id)
  const stageConfig = STAGES_CONFIG.find((s) => s.key === lead.stage)

  // Find suggested script for lead's current stage
  const suggestedScript = scripts.find((s) => s.stage === lead.stage)

  // Phone clean numbers for links
  const phoneNumbersOnly = lead.phone.replace(/\D/g, '')

  // Check if overdue
  const isOverdue =
    lead.followUpDate < todayStr && lead.stage !== 'Fechado' && lead.stage !== 'Perdido'

  // Open Edit Action Modal
  const handleOpenEditAction = () => {
    setEditNextAction(lead.nextAction)
    setEditFollowUpDate(lead.followUpDate)
    setEditActionModalOpen(true)
  }

  const handleSaveNextAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNextAction.trim() || !editFollowUpDate) return

    updateLead(lead.id, {
      nextAction: editNextAction.trim(),
      followUpDate: editFollowUpDate,
    })
    setEditActionModalOpen(false)
  }

  // Open Contact Register Modal
  const handleOpenContactModal = () => {
    const now = new Date()
    const nowFormatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    setContactType('WhatsApp')
    setContactDateTime(nowFormatted)
    setContactSummary('')
    setScriptUsedTitle(suggestedScript?.title || '')
    setContactModalOpen(true)
  }

  const handleInsertScript = () => {
    if (suggestedScript) {
      // Replace placeholders if any
      const textWithLeadName = suggestedScript.content.replace(
        /\[Nome do Paciente\]/g,
        lead.name.split(' ')[0],
      )
      setContactSummary((prev) => (prev ? `${prev}\n\n${textWithLeadName}` : textWithLeadName))
      setScriptUsedTitle(suggestedScript.title)
    }
  }

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactSummary.trim()) return

    addContactHistory({
      leadId: lead.id,
      type: contactType,
      date:
        contactDateTime ||
        `${getTodayDateString(0)} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      summary: contactSummary.trim(),
      scriptTitleUsed: scriptUsedTitle || undefined,
      registeredBy: currentUser?.name || 'CRC Ser Único',
    })

    setContactModalOpen(false)
  }

  // Handle stage change
  const handleStageClick = (targetStage: LeadStage) => {
    if (targetStage === lead.stage) return

    if (targetStage === 'Perdido') {
      setLossModalOpen(true)
    } else {
      moveLeadStage(lead.id, targetStage)
    }
  }

  const handleConfirmLoss = (reason: any, notes?: string) => {
    moveLeadStage(lead.id, 'Perdido', {
      lossReason: reason,
      lossNotes: notes,
    })
  }

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />
      case 'Ligação':
        return <Phone className="w-4 h-4 text-blue-600" />
      case 'E-mail':
        return <Mail className="w-4 h-4 text-amber-600" />
      case 'Presencial':
        return <User className="w-4 h-4 text-purple-600" />
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/crm" className="hover:text-teal-700 transition">
          CRM
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/crm" className="hover:text-teal-700 transition">
          Leads
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold truncate max-w-xs">{lead.name}</span>
      </nav>

      {/* Cartão de Cabeçalho do Lead */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          {/* Avatar Grande com Inicial */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0"
            style={{ backgroundColor: stageConfig?.color || '#0F766E' }}
          >
            {lead.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {lead.name}
              </h2>

              {/* Stage Badge */}
              <span
                className="px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: stageConfig?.bgLight,
                  color: stageConfig?.textColor,
                  borderColor: stageConfig?.borderColor,
                }}
              >
                {lead.stage}
              </span>
            </div>

            {/* Subtitle / Details */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{lead.phone}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                Origem: {lead.origin}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                Interesse: {lead.interest}
              </span>
              <span>•</span>
              <span>
                Responsável: <strong>{lead.assignedToName || 'CRC'}</strong>
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Criado em {formatDisplayDate(lead.createdAt)}
            </p>
          </div>
        </div>

        {/* Action buttons (Call & WhatsApp) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <a
            href={`tel:${phoneNumbersOnly}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
          >
            <Phone className="w-4 h-4 text-slate-600" />
            <span>Ligar</span>
          </a>

          <a
            href={`https://wa.me/55${phoneNumbersOnly}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          <Button
            onClick={handleOpenContactModal}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar contato</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: 2/3 Timeline + 1/3 Side Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Principal (2/3 = 8 cols): Histórico de contatos */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Histórico de contatos e interações
                </h3>
                <p className="text-xs text-slate-500">
                  Linha do tempo de todas as mensagens, ligações e avanços de etapa
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenContactModal}
              className="text-xs font-semibold text-teal-800 border-teal-200 hover:bg-teal-50 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo registro</span>
            </Button>
          </div>

          {/* Timeline */}
          <div className="mt-6 flex-1">
            {historyList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum contato registrado ainda.
                </p>
                <p className="text-xs text-slate-400">
                  Clique em "Registrar contato" para salvar o primeiro atendimento.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {historyList.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Dot / Icon */}
                    <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-2xs group-hover:border-teal-600 transition">
                      {getContactIcon(item.type)}
                    </div>

                    <div className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200/80 transition-all space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{item.type}</span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-[11px] font-medium text-slate-500">
                            Por <strong>{item.registeredBy}</strong>
                          </span>
                        </div>

                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>

                      {/* Script Chip Used */}
                      {item.scriptTitleUsed && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                          <FileText className="w-3 h-3" />
                          <span>Script: {item.scriptTitleUsed}</span>
                        </div>
                      )}

                      {/* Summary */}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Lateral (1/3 = 4 cols): Próxima Ação + Mover Etapa */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Próxima Ação */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-700" />
                <span>Próxima ação de follow-up</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenEditAction}
                className="h-7 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Editar
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {lead.nextAction}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Prazo de follow-up:</span>
                <span
                  className={`px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${
                    isOverdue
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : lead.followUpDate === todayStr
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                  {formatDisplayDate(lead.followUpDate)}
                  {isOverdue && ' (Atrasado)'}
                  {lead.followUpDate === todayStr && ' (Hoje)'}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Mover Etapa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Mover etapa do funil</h3>
              <p className="text-[11px] text-slate-500">
                Selecione para atualizar a fase atual deste lead
              </p>
            </div>

            <div className="space-y-1.5">
              {STAGES_CONFIG.map((stg) => {
                const isCurrent = lead.stage === stg.key

                return (
                  <button
                    key={stg.key}
                    type="button"
                    onClick={() => handleStageClick(stg.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition border ${
                      isCurrent
                        ? 'border-2 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: stg.bgLight,
                            color: stg.textColor,
                            borderColor: stg.color,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stg.color }}
                      />
                      <span>{stg.label}</span>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/80 border">
                        Etapa Atual
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {lead.stage === 'Perdido' && lead.lossReason && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                <p className="font-bold">Motivo da perda:</p>
                <p>{lead.lossReason}</p>
                {lead.lossNotes && (
                  <p className="italic text-[11px] text-red-700">"{lead.lossNotes}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Registrar Contato */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Registrar Contato com {lead.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de Contato */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de contato</Label>
                <Select
                  value={contactType}
                  onValueChange={(val) => setContactType(val as ContactType)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Ligação">Ligação telefônica</SelectItem>
                    <SelectItem value="Presencial">Presencial (na clínica)</SelectItem>
                    <SelectItem value="E-mail">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data e Hora */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Data e hora</Label>
                <Input
                  type="text"
                  value={contactDateTime}
                  onChange={(e) => setContactDateTime(e.target.value)}
                  placeholder="2025-05-10 14:30"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Script Sugerido para esta etapa (Bloco Colapsável) */}
            {suggestedScript && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                  className="w-full p-3 flex items-center justify-between text-xs font-bold text-purple-900 bg-purple-100/50 hover:bg-purple-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Script sugerido para a etapa "{lead.stage}"</span>
                  </div>
                  {isScriptExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isScriptExpanded && (
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-purple-950">{suggestedScript.title}</p>
                    <div className="p-2.5 rounded-lg bg-white border border-purple-200 text-xs text-slate-700 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
                      {suggestedScript.content}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleInsertScript}
                      className="w-full text-xs font-bold bg-white text-purple-800 border-purple-300 hover:bg-purple-100 gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Inserir no resumo do contato
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Resumo do Contato */}
            <div className="space-y-1.5">
              <Label htmlFor="contactSummary" className="text-xs font-semibold text-slate-700">
                Resumo da conversa / interação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="contactSummary"
                value={contactSummary}
                onChange={(e) => setContactSummary(e.target.value)}
                placeholder="Descreva o que foi tratado, dúvidas esclarecidas pelo paciente e próximos combinados..."
                className="text-sm min-h-[110px]"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Editar Próxima Ação */}
      <Dialog open={editActionModalOpen} onOpenChange={setEditActionModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Atualizar Próxima Ação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveNextAction} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editNextAction" className="text-xs font-semibold text-slate-700">
                Descrição da próxima ação <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editNextAction"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                placeholder="Ex.: Ligar para alinhar forma de pagamento da proposta..."
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editFollowUpDate" className="text-xs font-semibold text-slate-700">
                Novo prazo de follow-up <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editFollowUpDate"
                type="date"
                value={editFollowUpDate}
                onChange={(e) => setEditFollowUpDate(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditActionModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                Salvar Ação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Perda Obrigatória */}
      <LossModal
        open={lossModalOpen}
        onOpenChange={setLossModalOpen}
        leadName={lead.name}
        onConfirm={handleConfirmLoss}
      />
    </div>
  )
}
