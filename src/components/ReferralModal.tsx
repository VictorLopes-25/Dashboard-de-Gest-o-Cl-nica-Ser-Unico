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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Sparkles } from 'lucide-react'
import type { ReferralCampaign, Lead } from '@/types'
import { registerReferral } from '@/services/postSaleService'
import { useToast } from '@/hooks/use-toast'

interface ReferralModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: Lead[]
  campaigns: ReferralCampaign[]
  onSuccess: () => void
}

export function ReferralModal({
  open,
  onOpenChange,
  leads,
  campaigns,
  onSuccess,
}: ReferralModalProps) {
  const { toast } = useToast()
  const [sourceLeadId, setSourceLeadId] = useState('')
  const [campaignId, setCampaignId] = useState<string>('none')
  const [referredName, setReferredName] = useState('')
  const [referredPhone, setReferredPhone] = useState('')
  const [referredNotes, setReferredNotes] = useState('')
  const [createLeadDirectly, setCreateLeadDirectly] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceLeadId) {
      toast({
        title: 'Selecione o paciente indicador',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await registerReferral({
        sourceLeadId,
        campaignId: campaignId === 'none' ? null : campaignId,
        referredName: referredName.trim(),
        referredPhone: referredPhone.trim(),
        referredNotes: referredNotes.trim(),
        createLeadDirectly,
      })

      toast({
        title: 'Indicação registrada com sucesso',
        description: createLeadDirectly
          ? 'Novo lead cadastrado no CRM e pronto para follow-up.'
          : 'Indicação armazenada para o pós-venda.',
      })

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao cadastrar indicação:', err)
      toast({
        title: 'Erro ao cadastrar indicação',
        description: err.message || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <UserPlus className="w-4 h-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Registrar Nova Indicação
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Cadastre a indicação recebida de um paciente e integre-a imediatamente ao funil de
            vendas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Paciente que Fez a Indicação *
            </Label>
            <Select value={sourceLeadId} onValueChange={setSourceLeadId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o paciente indicador" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} {l.phone ? `(${l.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Campanha Associada (Opcional)
            </Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma campanha específica</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.active ? '(Ativa)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Indicado *</Label>
              <Input
                value={referredName}
                onChange={(e) => setReferredName(e.target.value)}
                placeholder="Ex: Ana Maria Silva"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp *</Label>
              <Input
                value={referredPhone}
                onChange={(e) => setReferredPhone(e.target.value)}
                placeholder="(11) 98888-7777"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Observações / Procedimento de Interesse
            </Label>
            <Textarea
              rows={2}
              value={referredNotes}
              onChange={(e) => setReferredNotes(e.target.value)}
              placeholder="Ex: Amiga do paciente, interesse em clareamento e lentes"
              className="text-xs"
            />
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-950">
              <input
                type="checkbox"
                checked={createLeadDirectly}
                onChange={(e) => setCreateLeadDirectly(e.target.checked)}
                className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
              />
              <span>Criar Lead automaticamente no CRM com origem "Indicação"</span>
            </label>
            <p className="text-[10px] text-teal-700 mt-1">
              O lead ficará disponível imediatamente para contato do CRC com o nome do indicador
              vinculado.
            </p>
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
              {loading ? 'Salvando...' : 'Salvar Indicação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
