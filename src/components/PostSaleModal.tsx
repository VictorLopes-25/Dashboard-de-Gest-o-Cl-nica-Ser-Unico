import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  CheckCircle2,
  Smile,
  Frown,
  PhoneOff,
  CalendarClock,
  Sparkles,
  Gift,
  Share2,
  Copy,
} from 'lucide-react'
import type { PostSale, ReferralCampaign, PostSaleOutcome } from '@/types'
import { recordPostSaleSatisfaction, registerReferral } from '@/services/postSaleService'
import { useToast } from '@/hooks/use-toast'

interface PostSaleModalProps {
  postSale: PostSale | null
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCampaign: ReferralCampaign | null
  onSuccess: () => void
}

export function PostSaleModal({
  postSale,
  open,
  onOpenChange,
  activeCampaign,
  onSuccess,
}: PostSaleModalProps) {
  const { toast } = useToast()
  const [outcome, setOutcome] = useState<PostSaleOutcome>('satisfeito')
  const [contactNotes, setContactNotes] = useState('')
  const [dissatisfactionReason, setDissatisfactionReason] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [loading, setLoading] = useState(false)

  // Referral Sub-form (shown only when outcome === 'satisfeito')
  const [wantsToRefer, setWantsToRefer] = useState(false)
  const [referredName, setReferredName] = useState('')
  const [referredPhone, setReferredPhone] = useState('')
  const [referredNotes, setReferredNotes] = useState('')

  if (!postSale) return null

  const handleCopyScript = () => {
    if (!activeCampaign?.instructionsScript) return
    const personalized = activeCampaign.instructionsScript.replace(
      /\[Nome do Paciente\]/g,
      postSale.patientName || 'Paciente',
    )
    navigator.clipboard.writeText(personalized)
    toast({
      title: 'Roteiro copiado',
      description: 'O texto da campanha foi copiado para sua área de transferência.',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Gravar satisfação operacional
      await recordPostSaleSatisfaction({
        postSaleId: postSale.id,
        outcome,
        contactNotes: contactNotes.trim(),
        dissatisfactionReason:
          outcome === 'insatisfeito' ? dissatisfactionReason.trim() : undefined,
        nextContactAt: outcome === 'reagendado' ? rescheduleDate : undefined,
        campaignPresented: outcome === 'satisfeito' ? activeCampaign : null,
      })

      // 2. Se indicou alguém, registrar na hora integrado ao CRM
      if (outcome === 'satisfeito' && wantsToRefer && referredName.trim() && referredPhone.trim()) {
        await registerReferral({
          sourceLeadId: postSale.patientLeadId,
          sourceTreatmentId: postSale.treatmentId,
          postSaleId: postSale.id,
          campaignId: activeCampaign?.id || null,
          referredName: referredName.trim(),
          referredPhone: referredPhone.trim(),
          referredNotes: referredNotes.trim(),
          createLeadDirectly: true,
        })
      }

      toast({
        title: 'Pós-venda registrado com sucesso',
        description:
          outcome === 'insatisfeito'
            ? 'Insatisfação registrada e encaminhada para a gestão e resolução.'
            : outcome === 'satisfeito' && wantsToRefer
              ? 'Satisfação salva e indicação enviada diretamente para o CRM!'
              : 'Resultado do contato gravado com sucesso.',
      })

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao registrar pós-venda:', err)
      toast({
        title: 'Erro ao registrar contato',
        description: err.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Pós-venda T+30 — Contato de Satisfação
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Paciente:{' '}
            <strong className="text-slate-800">{postSale.patientName || 'Paciente'}</strong> •
            Tratamento:{' '}
            <span className="text-slate-700">{postSale.treatmentName || 'Concluído'}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 1. Escolha do Desfecho Operacional */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Qual foi o resultado do contato com o paciente?
            </Label>
            <RadioGroup
              value={outcome}
              onValueChange={(val) => setOutcome(val as PostSaleOutcome)}
              className="grid grid-cols-2 gap-2"
            >
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  outcome === 'satisfeito'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}
              >
                <RadioGroupItem value="satisfeito" id="out-satisfeito" className="sr-only" />
                <Smile className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs">Paciente Satisfeito</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Tudo certo, apto à campanha
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  outcome === 'insatisfeito'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}
              >
                <RadioGroupItem value="insatisfeito" id="out-insatisfeito" className="sr-only" />
                <Frown className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <div className="text-xs">Paciente Insatisfeito</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Reclamação ou desconforto
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  outcome === 'sem_resposta'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}
              >
                <RadioGroupItem value="sem_resposta" id="out-sem_resposta" className="sr-only" />
                <PhoneOff className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs">Sem Resposta</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Não atendeu / não visualizou
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                  outcome === 'reagendado'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}
              >
                <RadioGroupItem value="reagendado" id="out-reagendado" className="sr-only" />
                <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs">Contato Reagendado</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pediu para ligar depois
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* 2. Campo Condicional: Reagendamento */}
          {outcome === 'reagendado' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <Label className="text-xs font-semibold text-blue-900">
                Nova data prevista para contato
              </Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
                className="bg-white h-9 text-xs"
              />
            </div>
          )}

          {/* 3. Campo Condicional: Insatisfação (bloqueia campanha) */}
          {outcome === 'insatisfeito' && (
            <div className="space-y-2 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
                <Frown className="w-4 h-4" />
                <span>Tratamento da Insatisfação (Prioridade Máxima)</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Por política da clínica, a campanha de indicação é suspensa para este paciente. Uma
                exceção operacional será aberta para acompanhamento da gerência.
              </p>
              <Label className="text-xs font-semibold text-rose-900">
                Qual foi o motivo da insatisfação relatado pelo paciente?
              </Label>
              <Textarea
                rows={3}
                placeholder="Descreva o que houve (dor, insatisfação estética, demora, atendimento...)"
                value={dissatisfactionReason}
                onChange={(e) => setDissatisfactionReason(e.target.value)}
                required
                className="bg-white text-xs"
              />
            </div>
          )}

          {/* 4. Apresentação da Campanha Ativa (SOMENTE quando Satisfeito) */}
          {outcome === 'satisfeito' && activeCampaign && (
            <div className="space-y-3 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-teal-900 text-xs font-bold">
                  <Gift className="w-4 h-4 text-teal-700" />
                  <span>Campanha Ativa: {activeCampaign.name}</span>
                </div>
                {activeCampaign.instructionsScript && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyScript}
                    className="h-7 px-2 text-[11px] text-teal-800 hover:bg-teal-100 gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar Roteiro</span>
                  </Button>
                )}
              </div>

              {activeCampaign.rewardConfig?.benefit_label && (
                <div className="text-[11px] text-teal-800 bg-white p-2 rounded-lg border border-teal-100">
                  <strong>Benefício oferecido:</strong> {activeCampaign.rewardConfig.benefit_label}
                </div>
              )}

              {activeCampaign.instructionsScript && (
                <div className="p-2.5 rounded-lg bg-teal-100/50 text-[11px] text-teal-900 italic line-clamp-3">
                  "{activeCampaign.instructionsScript}"
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-950">
                  <input
                    type="checkbox"
                    checked={wantsToRefer}
                    onChange={(e) => setWantsToRefer(e.target.checked)}
                    className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>O paciente indicou alguém agora? (Cadastrar Indicação)</span>
                </label>
              </div>

              {/* Sub-form de Indicação Imediata */}
              {wantsToRefer && (
                <div className="space-y-2.5 pt-2 border-t border-teal-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-teal-900">
                        Nome do Indicado *
                      </Label>
                      <Input
                        value={referredName}
                        onChange={(e) => setReferredName(e.target.value)}
                        placeholder="Ex: Carlos Oliveira"
                        required
                        className="bg-white h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-teal-900">
                        Telefone / WhatsApp *
                      </Label>
                      <Input
                        value={referredPhone}
                        onChange={(e) => setReferredPhone(e.target.value)}
                        placeholder="(11) 98888-0000"
                        required
                        className="bg-white h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-teal-900">
                      Grau de parentesco ou interesse
                    </Label>
                    <Input
                      value={referredNotes}
                      onChange={(e) => setReferredNotes(e.target.value)}
                      placeholder="Ex: Irmão do paciente, interesse em implante"
                      className="bg-white h-8 text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-teal-700 italic">
                    ✓ Um novo lead será criado automaticamente no CRM com origem "Indicação".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5. Notas Gerais do Contato */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Observações operacionais do contato
            </Label>
            <Textarea
              rows={2}
              placeholder="Ex: Paciente elogiou atendimento da recepção, combinou retorno para limpeza..."
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs px-4"
            >
              {loading ? 'Salvando...' : 'Concluir Contato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
