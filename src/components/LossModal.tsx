import React, { useState } from 'react'
import { LossReason } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LossModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  onConfirm: (reason: LossReason, notes?: string) => void
}

const LOSS_REASONS: LossReason[] = [
  'Não respondeu',
  'Escolheu outro profissional',
  'Preço',
  'Prazo',
  'Outro',
]

export const LossModal: React.FC<LossModalProps> = ({
  open,
  onOpenChange,
  leadName,
  onConfirm,
}) => {
  const [reason, setReason] = useState<LossReason>('Não respondeu')
  const [notes, setNotes] = useState('')

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(reason, notes.trim() || undefined)
    onOpenChange(false)
    setReason('Não respondeu')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600">
            Registrar Motivo da Perda
          </DialogTitle>
          <DialogDescription>
            Para mover <strong>{leadName}</strong> para a etapa{' '}
            <span className="font-semibold text-red-600">Perdido</span>, é obrigatório registrar o
            motivo para alimentar os relatórios de conversão da gerência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Motivo principal da perda <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={(val) => setReason(val as LossReason)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lossNotes" className="text-xs font-semibold text-slate-700">
              Observações adicionais (opcional)
            </Label>
            <Textarea
              id="lossNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Paciente achou o parcelamento curto ou optou por adiar para o próximo semestre..."
              className="text-sm min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-medium">
              Confirmar Perda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
