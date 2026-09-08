import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Lead, ContactOutcome } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STAGES_CONFIG } from '@/components/LeadModal'
import {
  MessageCircle,
  Phone,
  Mail,
  User,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Copy,
  Clock,
  CheckCircle2,
} from 'lucide-react'

interface QuickContactModalProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CHANNELS = [
  { key: 'WhatsApp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'Telefone', label: 'Telefone (Ligação)', icon: Phone },
  { key: 'Instagram', label: 'Instagram Direct', icon: MessageCircle },
  { key: 'Email', label: 'E-mail', icon: Mail },
  { key: 'Presencial', label: 'Presencial', icon: User },
  { key: 'Outro', label: 'Outro canal', icon: CheckCircle2 },
]

const OUTCOMES: ContactOutcome[] = [
  'Sem resposta',
  'Mensagem enviada',
  'Conversa iniciada',
  'Avaliação agendada',
  'Pediu para retornar',
  'Proposta em análise',
  'Tratamento fechado',
  'Sem interesse',
  'Outro',
]

export const QuickContactModal: React.FC<QuickContactModalProps> = ({
  lead,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { registerLeadContactFlow, scripts, roles, collaborators, currentUser } = useApp()

  const [channel, setChannel] = useState<string>('WhatsApp')
  const [outcome, setOutcome] = useState<ContactOutcome>('Mensagem enviada')
  const [notes, setNotes] = useState<string>('')
  const [newStage, setNewStage] = useState<string>('')
  const [nextAction, setNextAction] = useState<string>('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('')
  const [nextFollowUpTime, setNextFollowUpTime] = useState<string>('10:00')
  const [responsibleFunctionId, setResponsibleFunctionId] = useState<string>('')
  const [responsiblePersonId, setResponsiblePersonId] = useState<string>('')
  const [isScriptExpanded, setIsScriptExpanded] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Reset form when opening
  React.useEffect(() => {
    if (open && lead) {
      setChannel('WhatsApp')
      setOutcome('Mensagem enviada')
      setNotes('')
      setNewStage(lead.stage)
      setNextAction(lead.nextAction || 'Follow-up de alinhamento com o paciente')

      // Default next follow-up: tomorrow or next business day
      const d = new Date()
      d.setDate(d.getDate() + 1)
      setNextFollowUpDate(d.toISOString().split('T')[0])
      setNextFollowUpTime('10:00')

      setResponsibleFunctionId(lead.commercialFunctionId || '')
      setResponsiblePersonId(lead.commercialPersonId || '')
      setIsSaving(false)
      setIsScriptExpanded(true)
    }
  }, [open, lead])

  if (!lead) return null

  // Find relevant script for this stage
  const relevantScript =
    scripts.find((s) => s.stage === (newStage || lead.stage) && s.active !== false) ||
    scripts.find((s) => s.stage === lead.stage)

  const handleInsertScript = () => {
    if (relevantScript) {
      const firstName = lead.name.split(' ')[0]
      const formattedScript = relevantScript.content.replace(/\[Nome do Paciente\]/g, firstName)
      setNotes((prev) => (prev ? `${prev}\n\n${formattedScript}` : formattedScript))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) {
      alert('Por favor, informe notas ou o resumo da interação.')
      return
    }

    setIsSaving(true)
    try {
      await registerLeadContactFlow({
        leadId: lead.id,
        channel,
        outcome,
        notes: notes.trim(),
        functionId: responsibleFunctionId || undefined,
        personId: responsiblePersonId || undefined,
        newStage: (newStage as any) || undefined,
        nextAction: nextAction.trim() || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
        nextFollowUpTime: nextFollowUpTime || '10:00',
      })

      setIsSaving(false)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setIsSaving(false)
      alert(err.message || 'Falha ao registrar contato.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Registrar Contato
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Paciente: <strong className="text-slate-800">{lead.name}</strong> • {lead.phone} •
                Interesse: <strong className="text-teal-700">{lead.interest}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Channel and Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Canal de Contato</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Resultado / Desfecho</Label>
              <Select value={outcome} onValueChange={(val) => setOutcome(val as ContactOutcome)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Script Sugerido Integrado */}
          {relevantScript && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-teal-900 bg-teal-100/60 hover:bg-teal-100 transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  <span>Script recomendado: {relevantScript.title}</span>
                </div>
                {isScriptExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {isScriptExpanded && (
                <div className="p-3 space-y-2">
                  <div className="p-2.5 rounded-lg bg-white border border-teal-200 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed font-mono">
                    {relevantScript.content}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleInsertScript}
                    className="w-full text-xs font-semibold bg-white text-teal-800 border-teal-300 hover:bg-teal-50 gap-1.5 h-8"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Inserir texto no resumo do atendimento
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Notas / Resumo da conversa */}
          <div className="space-y-1.5">
            <Label htmlFor="contactNotes" className="text-xs font-semibold text-slate-700">
              Notas da Interação <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="contactNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que foi conversado? Dúvidas do paciente, objeções ou encaminhamentos decididos..."
              className="text-sm min-h-[90px]"
              required
            />
          </div>

          {/* Bloco de Atualização Operacional: Etapa, Próxima Ação e Data */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-1 border-b border-slate-200">
              <Clock className="w-3.5 h-3.5 text-teal-700" />
              <span>Próximos Passos & Follow-up do Lead</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Etapa do Funil */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Atualizar Etapa</Label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger className="h-9 text-xs">
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
              </div>

              {/* Data do Próximo Follow-up */}
              <div className="space-y-1">
                <Label htmlFor="nextDate" className="text-[11px] font-semibold text-slate-600">
                  Data do Próximo Follow-up
                </Label>
                <Input
                  id="nextDate"
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Próxima Ação */}
            <div className="space-y-1">
              <Label htmlFor="nextActionText" className="text-[11px] font-semibold text-slate-600">
                Próxima Ação Clara
              </Label>
              <Input
                id="nextActionText"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Ex.: Ligar para checar se recebeu a proposta de parcelamento"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
            >
              {isSaving ? 'Salvando...' : 'Registrar Contato e Salvar Follow-up'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
