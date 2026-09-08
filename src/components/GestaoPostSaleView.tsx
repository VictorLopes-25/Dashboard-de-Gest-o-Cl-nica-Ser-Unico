import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Gift,
  Plus,
  Smile,
  Frown,
  CheckCircle2,
  Clock,
  Share2,
  AlertTriangle,
  Edit3,
  Calendar,
} from 'lucide-react'
import type { PostSale, Referral, ReferralCampaign } from '@/types'
import {
  createReferralCampaign,
  updateReferralCampaign,
  resolveDissatisfaction,
} from '@/services/postSaleService'
import { useToast } from '@/hooks/use-toast'

interface GestaoPostSaleViewProps {
  postSales: PostSale[]
  referrals: Referral[]
  campaigns: ReferralCampaign[]
  isOwner: boolean
  onRefresh: () => Promise<void>
}

export function GestaoPostSaleView({
  postSales,
  referrals,
  campaigns,
  isOwner,
  onRefresh,
}: GestaoPostSaleViewProps) {
  const { toast } = useToast()
  const todayStr = new Date().toISOString().slice(0, 10)

  // Modais de Gestão
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<ReferralCampaign | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [selectedDissatisfaction, setSelectedDissatisfaction] = useState<PostSale | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form State: Campanha
  const [campName, setCampName] = useState('')
  const [campDesc, setCampDesc] = useState('')
  const [campBenefit, setCampBenefit] = useState('')
  const [campScript, setCampScript] = useState('')
  const [campActive, setCampActive] = useState(true)

  // Métricas Agregadas de Gestão (sem poluição operacional de contatos normais)
  const stats = React.useMemo(() => {
    const totalScheduled = postSales.length
    const executed = postSales.filter((ps) => ps.outcome !== null).length
    const overdue = postSales.filter(
      (ps) =>
        ps.dueDate < todayStr &&
        (ps.status === 'previsto' || ps.status === 'sem_resposta' || ps.status === 'reagendado'),
    ).length
    const satisfied = postSales.filter((ps) => ps.outcome === 'satisfeito').length
    const openDissatisfaction = postSales.filter(
      (ps) => ps.outcome === 'insatisfeito' && ps.dissatisfactionStatus !== 'resolvido',
    ).length
    const resolvedDissatisfaction = postSales.filter(
      (ps) => ps.outcome === 'insatisfeito' && ps.dissatisfactionStatus === 'resolvido',
    ).length
    const totalReferrals = referrals.length
    const referredLeads = referrals.filter((r) => r.resultingLeadId).length

    return {
      totalScheduled,
      executed,
      overdue,
      satisfied,
      openDissatisfaction,
      resolvedDissatisfaction,
      totalReferrals,
      referredLeads,
    }
  }, [postSales, referrals, todayStr])

  const openNewCampaignModal = () => {
    setEditingCampaign(null)
    setCampName('')
    setCampDesc('')
    setCampBenefit('')
    setCampScript('')
    setCampActive(true)
    setCampaignModalOpen(true)
  }

  const openEditCampaignModal = (c: ReferralCampaign) => {
    setEditingCampaign(c)
    setCampName(c.name)
    setCampDesc(c.description)
    setCampBenefit(c.rewardConfig?.benefit_label || '')
    setCampScript(c.instructionsScript || '')
    setCampActive(c.active)
    setCampaignModalOpen(true)
  }

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campName.trim()) return

    setSubmitting(true)
    try {
      if (editingCampaign) {
        await updateReferralCampaign(editingCampaign.id, {
          name: campName.trim(),
          description: campDesc.trim(),
          active: campActive,
          rewardConfig: {
            ...editingCampaign.rewardConfig,
            benefit_label: campBenefit.trim(),
          },
          instructionsScript: campScript.trim(),
        })
        toast({
          title: 'Campanha atualizada',
          description: `A campanha "${campName}" foi atualizada.`,
        })
      } else {
        await createReferralCampaign({
          name: campName.trim(),
          description: campDesc.trim(),
          active: campActive,
          rewardConfig: {
            benefit_label: campBenefit.trim(),
          },
          instructionsScript: campScript.trim(),
        })
        toast({
          title: 'Campanha criada',
          description: `A campanha "${campName}" foi criada e já está disponível para o CRC.`,
        })
      }
      setCampaignModalOpen(false)
      await onRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar campanha',
        description: err.message || 'Verifique suas permissões.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolveDissatisfactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDissatisfaction || !resolutionText.trim()) return

    setSubmitting(true)
    try {
      await resolveDissatisfaction(selectedDissatisfaction.id, resolutionText)
      toast({
        title: 'Insatisfação solucionada',
        description: 'Registro de resolução salvo no histórico do pós-venda.',
      })
      setResolveModalOpen(false)
      setSelectedDissatisfaction(null)
      setResolutionText('')
      await onRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar resolução',
        description: err.message || 'Falha ao atualizar.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Indicadores Agregados de Gestão (Stage 4G Management View) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Previstos</span>
          <div className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.totalScheduled}</div>
          <span className="text-[10px] text-slate-400">T+30 gerados</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Realizados</span>
          <div className="text-xl font-extrabold text-teal-700 mt-0.5">{stats.executed}</div>
          <span className="text-[10px] text-slate-400">contatos feitos</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Atrasados</span>
          <div
            className={`text-xl font-extrabold mt-0.5 ${
              stats.overdue > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {stats.overdue}
          </div>
          <span className="text-[10px] text-slate-400">pendentes &gt; T+30</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Satisfeitos</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{stats.satisfied}</div>
          <span className="text-[10px] text-slate-400">avaliação positiva</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Insatisfações Abertas</span>
          <div
            className={`text-xl font-extrabold mt-0.5 ${
              stats.openDissatisfaction > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {stats.openDissatisfaction}
          </div>
          <span className="text-[10px] text-slate-400">exigem resolução</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Indicações Geradas</span>
          <div className="text-xl font-extrabold text-teal-800 mt-0.5">{stats.totalReferrals}</div>
          <span className="text-[10px] text-slate-400">amigos/família</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Leads por Indicação</span>
          <div className="text-xl font-extrabold text-teal-900 mt-0.5">{stats.referredLeads}</div>
          <span className="text-[10px] text-slate-400">no funil CRM</span>
        </div>
      </div>

      {/* 2. Gestão de Campanhas de Indicação (Configuráveis - OWNER / Gerência) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <Gift className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Campanhas de Indicação Configuráveis
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie programas de recompensa e roteiros operacionais para o pós-venda. O histórico
              preserva a campanha apresentada.
            </p>
          </div>

          <Button
            size="sm"
            onClick={openNewCampaignModal}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold gap-1.5 h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Campanha</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                camp.active
                  ? 'border-teal-300 bg-teal-50/20 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{camp.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      camp.active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {camp.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {camp.description || 'Sem descrição.'}
                </p>

                {camp.rewardConfig?.benefit_label && (
                  <div className="p-2 rounded-lg bg-white border border-teal-100 text-[11px] text-teal-900">
                    <strong>Benefício:</strong> {camp.rewardConfig.benefit_label}
                  </div>
                )}

                {camp.instructionsScript && (
                  <p className="text-[11px] text-slate-500 italic line-clamp-2">
                    "{camp.instructionsScript}"
                  </p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Criada em {new Date(camp.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditCampaignModal(camp)}
                  className="h-7 px-2 text-xs text-teal-800 hover:bg-teal-100"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  <span>Editar</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Gestão de Insatisfações de Pacientes (Tratamento Imediato) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <Frown className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Tratamento de Insatisfações Pós-Venda
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Casos onde o paciente relatou qualquer insatisfação no contato de 30 dias. A campanha
              fica bloqueada até a resolução.
            </p>
          </div>

          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-xs">
            {stats.openDissatisfaction} pendente(s)
          </Badge>
        </div>

        {postSales.filter((ps) => ps.outcome === 'insatisfeito').length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
            Nenhuma insatisfação registrada no pós-venda. Satisfação plena dos pacientes!
          </div>
        ) : (
          <div className="space-y-3">
            {postSales
              .filter((ps) => ps.outcome === 'insatisfeito')
              .map((ps) => {
                const isResolved = ps.dissatisfactionStatus === 'resolvido'

                return (
                  <div
                    key={ps.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isResolved
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-rose-300 bg-rose-50/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{ps.patientName}</span>
                        <span className="text-xs text-slate-500">• {ps.treatmentName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {isResolved ? 'Resolvido' : 'Aguardando Resolução'}
                        </Badge>
                      </div>

                      <p className="text-xs text-rose-900 font-medium">
                        Motivo: "{ps.dissatisfactionReason || ps.contactNotes}"
                      </p>

                      {isResolved && ps.dissatisfactionResolution && (
                        <p className="text-xs text-emerald-800 italic">
                          Resolução: "{ps.dissatisfactionResolution}" (por{' '}
                          {ps.dissatisfactionResolvedByName || 'Gestão'} em{' '}
                          {ps.dissatisfactionResolvedAt
                            ? new Date(ps.dissatisfactionResolvedAt).toLocaleDateString('pt-BR')
                            : ''}
                          )
                        </p>
                      )}
                    </div>

                    {!isResolved && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDissatisfaction(ps)
                          setResolutionText('')
                          setResolveModalOpen(true)
                        }}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold h-8 shrink-0"
                      >
                        Registrar Solução
                      </Button>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* MODAL: Criar / Editar Campanha */}
      <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campanha de Indicação' : 'Nova Campanha de Indicação'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina os benefícios, validade e roteiro para apresentação aos pacientes satisfeitos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome da Campanha *</Label>
              <Input
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder="Ex: Campanha Sorriso Compartilhado"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
              <Input
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                placeholder="Ex: Programa de recomendação especial de final de ano"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Benefício Oferecido ao Indicador e Indicado *
              </Label>
              <Input
                value={campBenefit}
                onChange={(e) => setCampBenefit(e.target.value)}
                placeholder="Ex: Profilaxia gratuita no retorno + avaliação sem custo para o amigo"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Roteiro / Instruções para o CRC
              </Label>
              <Textarea
                rows={3}
                value={campScript}
                onChange={(e) => setCampScript(e.target.value)}
                placeholder="Ex: Olá [Nome do Paciente]! Que alegria saber da sua satisfação... Gostaria de presentear alguém com uma avaliação cortesia?"
                className="text-xs"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={campActive}
                  onChange={(e) => setCampActive(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                />
                <span>Campanha Ativa no Pós-Venda</span>
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCampaignModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Campanha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Resolver Insatisfação */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Solução da Insatisfação</DialogTitle>
            <DialogDescription className="text-xs">
              Paciente: <strong>{selectedDissatisfaction?.patientName}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveDissatisfactionSubmit} className="space-y-3 pt-2">
            <div className="p-3 rounded-lg bg-rose-50 text-rose-900 text-xs">
              <strong>Motivo relatado:</strong> {selectedDissatisfaction?.dissatisfactionReason}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Como a insatisfação foi solucionada? *
              </Label>
              <Textarea
                rows={3}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Ex: Consulta presencial de ajuste realizada sem custos, paciente plenamente acolhido e satisfeito com o resultado final."
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolveModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Confirmar Resolução'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
