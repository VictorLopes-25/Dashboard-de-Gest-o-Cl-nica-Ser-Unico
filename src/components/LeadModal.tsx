import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { LeadOrigin, LeadInterest, LeadStage } from '@/types'
import { getTodayDateString } from '@/data/mockData'
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

interface LeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStage?: LeadStage
}

export const ORIGIN_OPTIONS: LeadOrigin[] = [
  'Instagram',
  'Google',
  'Indicação',
  'WhatsApp',
  'Site',
  'Facebook',
  'Panfleto',
  'Outro',
]

export const INTEREST_OPTIONS: LeadInterest[] = [
  'Implantes',
  'Aparelho',
  'Lentes de contato',
  'Clareamento',
  'Prótese',
  'Canal',
  'Odontopediatria',
  'Outro',
]

export const STAGES_CONFIG: {
  key: LeadStage
  label: string
  color: string
  dotColor: string
  bgLight: string
  textColor: string
  borderColor: string
}[] = [
  {
    key: 'Novo',
    label: 'Novo',
    color: '#64748B',
    dotColor: '#94A3B8',
    bgLight: '#F1F5F9',
    textColor: '#475569',
    borderColor: '#CBD5E1',
  },
  {
    key: 'Em Contato',
    label: 'Em Contato',
    color: '#D97706',
    dotColor: '#F59E0B',
    bgLight: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FDE68A',
  },
  {
    key: 'Avaliação',
    label: 'Avaliação',
    color: '#EA580C',
    dotColor: '#F97316',
    bgLight: '#FFEDD5',
    textColor: '#C2410C',
    borderColor: '#FED7AA',
  },
  {
    key: 'Proposta',
    label: 'Proposta',
    color: '#7C3AED',
    dotColor: '#8B5CF6',
    bgLight: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#DDD6FE',
  },
  {
    key: 'Fechado',
    label: 'Fechado',
    color: '#059669',
    dotColor: '#10B981',
    bgLight: '#D1FAE5',
    textColor: '#047857',
    borderColor: '#A7F3D0',
  },
  {
    key: 'Perdido',
    label: 'Perdido',
    color: '#DC2626',
    dotColor: '#EF4444',
    bgLight: '#FEE2E2',
    textColor: '#B91C1C',
    borderColor: '#FECACA',
  },
]

export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export const LeadModal: React.FC<LeadModalProps> = ({
  open,
  onOpenChange,
  defaultStage = 'Novo',
}) => {
  const { addLead, collaborators, dentists } = useApp()

  // Default responsible: Paula Rocha (CRC) if available
  const paulaColab = collaborators.find((c) => c.name.toLowerCase().includes('paula'))
  const defaultAssignedId = paulaColab ? paulaColab.id : collaborators[0]?.id || ''

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [origin, setOrigin] = useState<LeadOrigin>('Instagram')
  const [interest, setInterest] = useState<LeadInterest>('Implantes')
  const [stage, setStage] = useState<LeadStage>(defaultStage)
  const [assignedId, setAssignedId] = useState<string>(defaultAssignedId)
  const [nextAction, setNextAction] = useState('')
  const [followUpDate, setFollowUpDate] = useState(getTodayDateString(0))
  const [notes, setNotes] = useState('')

  const [errorName, setErrorName] = useState('')
  const [errorPhone, setErrorPhone] = useState('')
  const [errorFollowUp, setErrorFollowUp] = useState('')

  React.useEffect(() => {
    if (open) {
      setName('')
      setPhone('')
      setOrigin('Instagram')
      setInterest('Implantes')
      setStage(defaultStage)
      setAssignedId(defaultAssignedId)
      setNextAction('Enviar mensagem de primeiro acolhimento via WhatsApp')
      setFollowUpDate(getTodayDateString(0))
      setNotes('')
      setErrorName('')
      setErrorPhone('')
      setErrorFollowUp('')
    }
  }, [open, defaultStage, defaultAssignedId])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneMask(e.target.value)
    setPhone(formatted)
    if (errorPhone) setErrorPhone('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!name.trim()) {
      setErrorName('O nome do lead é obrigatório.')
      hasError = true
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorPhone('Informe um telefone válido com DDD (ex: (11) 98765-4321).')
      hasError = true
    }
    if (!followUpDate) {
      setErrorFollowUp('O prazo de follow-up é obrigatório.')
      hasError = true
    }

    if (hasError) return

    // Find assigned responsible details (Collaborator or Dentist)
    let assignedToName: string | undefined
    let assignedToRole: string | undefined

    const foundColab = collaborators.find((c) => c.id === assignedId)
    if (foundColab) {
      assignedToName = foundColab.name
      assignedToRole = 'CRC'
    } else {
      const foundDentist = dentists.find((d) => d.id === assignedId)
      if (foundDentist) {
        assignedToName = foundDentist.name
        assignedToRole = 'Dentistas'
      }
    }

    addLead({
      name: name.trim(),
      phone: phone.trim(),
      origin,
      interest,
      stage,
      assignedToId: assignedId || undefined,
      assignedToName,
      assignedToRole,
      nextAction: nextAction.trim() || 'Aguardando primeiro contato com o paciente',
      followUpDate,
      notes: notes.trim() || undefined,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="leadName" className="text-xs font-semibold text-slate-700">
              Nome do lead / paciente <span className="text-red-500">*</span>
            </Label>
            <Input
              id="leadName"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errorName) setErrorName('')
              }}
              placeholder="Ex.: Maria Helena Silveira"
              className="h-10 text-sm"
            />
            {errorName && <p className="text-xs text-red-500">{errorName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Telefone */}
            <div className="space-y-1.5">
              <Label htmlFor="leadPhone" className="text-xs font-semibold text-slate-700">
                Telefone / WhatsApp <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leadPhone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                className="h-10 text-sm"
              />
              {errorPhone && <p className="text-xs text-red-500">{errorPhone}</p>}
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Origem</Label>
              <Select value={origin} onValueChange={(val) => setOrigin(val as LeadOrigin)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map((orig) => (
                    <SelectItem key={orig} value={orig}>
                      {orig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interesse */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Interesse principal</Label>
              <Select value={interest} onValueChange={(val) => setInterest(val as LeadInterest)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEREST_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Etapa do Funil */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Etapa inicial do funil</Label>
              <Select value={stage} onValueChange={(val) => setStage(val as LeadStage)}>
                <SelectTrigger className="h-10">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsável (Colaboradores e Dentistas) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Responsável pelo atendimento
              </Label>
              <Select value={assignedId} onValueChange={(val) => setAssignedId(val)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                    Colaboradores (CRC / Equipe)
                  </div>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 mt-1 border-t">
                    Dentistas
                  </div>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prazo de Follow-up */}
            <div className="space-y-1.5">
              <Label htmlFor="followUpDate" className="text-xs font-semibold text-slate-700">
                Prazo de follow-up <span className="text-red-500">*</span>
              </Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value)
                  if (errorFollowUp) setErrorFollowUp('')
                }}
                className="h-10 text-sm"
              />
              {errorFollowUp && <p className="text-xs text-red-500">{errorFollowUp}</p>}
            </div>
          </div>

          {/* Próxima Ação */}
          <div className="space-y-1.5">
            <Label htmlFor="nextAction" className="text-xs font-semibold text-slate-700">
              Próxima ação
            </Label>
            <Input
              id="nextAction"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ex.: Ligar para apresentar condições de parcelamento"
              className="h-10 text-sm"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
              Observações iniciais do caso
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Paciente busca tratamento estético para casamento em novembro..."
              className="text-sm min-h-[70px]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium">
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
