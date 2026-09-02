import React, { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { Dentist, DentalSpecialty } from '@/types'
import { formatPhoneMask } from '@/components/LeadModal'
import {
  Smile,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  Sparkles,
  Award,
} from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'

const DENTAL_SPECIALTIES: DentalSpecialty[] = [
  'Implantodontia',
  'Ortodontia',
  'Endodontia',
  'Dentística',
  'Periodontia',
  'Prótese',
  'Odontopediatria',
  'Cirurgia',
  'Clareamento',
  'Outro',
]

const SPECIALTY_BADGE_STYLES: Record<string, string> = {
  Implantodontia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Ortodontia: 'bg-blue-50 text-blue-800 border-blue-200',
  Endodontia: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Dentística: 'bg-pink-50 text-pink-800 border-pink-200',
  Periodontia: 'bg-amber-50 text-amber-800 border-amber-200',
  Prótese: 'bg-purple-50 text-purple-800 border-purple-200',
  Odontopediatria: 'bg-teal-50 text-teal-800 border-teal-200',
  Cirurgia: 'bg-rose-50 text-rose-800 border-rose-200',
  Clareamento: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Outro: 'bg-slate-50 text-slate-700 border-slate-200',
}

export default function Dentistas() {
  const { dentists, addDentist, updateDentist, deleteDentist } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null)
  const [dentistToDelete, setDentistToDelete] = useState<Dentist | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('all')

  // Form states
  const [name, setName] = useState('')
  const [cro, setCro] = useState('')
  const [phone, setPhone] = useState('')
  const [specialties, setSpecialties] = useState<DentalSpecialty[]>([])
  const [isActive, setIsActive] = useState(true)

  const [errorName, setErrorName] = useState('')
  const [errorSpecialties, setErrorSpecialties] = useState('')

  const handleOpenCreate = () => {
    setEditingDentist(null)
    setName('')
    setCro('')
    setPhone('')
    setSpecialties(['Implantodontia'])
    setIsActive(true)
    setErrorName('')
    setErrorSpecialties('')
    setModalOpen(true)
  }

  const handleOpenEdit = (dentist: Dentist) => {
    setEditingDentist(dentist)
    setName(dentist.name)
    setCro(dentist.cro || '')
    setPhone(dentist.phone)
    setSpecialties(dentist.specialties)
    setIsActive(dentist.isActive)
    setErrorName('')
    setErrorSpecialties('')
    setModalOpen(true)
  }

  const toggleSpecialty = (spec: DentalSpecialty) => {
    setSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    )
    if (errorSpecialties) setErrorSpecialties('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!name.trim()) {
      setErrorName('O nome do dentista é obrigatório.')
      hasError = true
    }
    if (specialties.length === 0) {
      setErrorSpecialties('Selecione pelo menos uma especialidade.')
      hasError = true
    }

    if (hasError) return

    if (editingDentist) {
      updateDentist(editingDentist.id, {
        name: name.trim(),
        cro: cro.trim() || undefined,
        phone: phone.trim(),
        specialties,
        isActive,
      })
    } else {
      addDentist({
        name: name.trim(),
        cro: cro.trim() || undefined,
        phone: phone.trim(),
        specialties,
        isActive,
      })
    }

    setModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (dentistToDelete) {
      deleteDentist(dentistToDelete.id)
      setDentistToDelete(null)
    }
  }

  // Filter dentists
  const filteredDentists = useMemo(() => {
    return dentists.filter((d) => {
      if (
        search &&
        !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !d.cro?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      if (filterSpecialty !== 'all' && !d.specialties.includes(filterSpecialty as any)) {
        return false
      }
      return true
    })
  }, [dentists, search, filterSpecialty])

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dentistas do Corpo Clínico
          </h2>
          <p className="text-sm text-slate-500">
            Cadastro individual de especialistas com suporte a múltiplas áreas de atuação
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo dentista</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            placeholder="Buscar por nome do dentista ou CRO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        <div className="w-full sm:w-64">
          <Select value={filterSpecialty} onValueChange={(val) => setFilterSpecialty(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Filtrar por especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              {DENTAL_SPECIALTIES.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Dentists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDentists.map((dentist) => (
          <div
            key={dentist.id}
            className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4 ${
              !dentist.isActive ? 'opacity-60 bg-slate-50/50' : ''
            }`}
          >
            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                    {dentist.name.replace(/^Dr\.\s*|^Dra\.\s*/i, '').charAt(0)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {dentist.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      {dentist.cro ? (
                        <span className="font-semibold text-slate-700">{dentist.cro}</span>
                      ) : (
                        <span className="italic text-slate-400">Sem CRO informado</span>
                      )}
                      <span>•</span>
                      {dentist.isActive ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(dentist)}
                    className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                    title="Editar dentista"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDentistToDelete(dentist)}
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Excluir dentista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Phone */}
              {dentist.phone && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dentist.phone}</span>
                </div>
              )}
            </div>

            {/* Specialties Badges */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-500" /> Especialidades:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dentist.specialties.map((spec) => (
                  <span
                    key={spec}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      SPECIALTY_BADGE_STYLES[spec] || 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create / Edit Dentist */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingDentist ? 'Editar Dentista' : 'Novo Dentista'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dentistName" className="text-xs font-semibold text-slate-700">
                Nome do cirurgião-dentista <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dentistName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errorName) setErrorName('')
                }}
                placeholder="Ex.: Dr. Rodrigo Mendes"
                className="h-10 text-sm"
              />
              {errorName && <p className="text-xs text-red-500">{errorName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cro" className="text-xs font-semibold text-slate-700">
                  Número do CRO (opcional)
                </Label>
                <Input
                  id="cro"
                  value={cro}
                  onChange={(e) => setCro(e.target.value)}
                  placeholder="CRO-SP 104.582"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dentistPhone" className="text-xs font-semibold text-slate-700">
                  Telefone celular
                </Label>
                <Input
                  id="dentistPhone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                  placeholder="(11) 98555-1234"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Multiple Specialties Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Especialidade(s) odontológica(s) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  {specialties.length} selecionada(s)
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                {DENTAL_SPECIALTIES.map((spec) => {
                  const isChecked = specialties.includes(spec)
                  return (
                    <label
                      key={spec}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition text-xs font-medium text-slate-800"
                    >
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleSpecialty(spec)} />
                      <span>{spec}</span>
                    </label>
                  )
                })}
              </div>
              {errorSpecialties && <p className="text-xs text-red-500">{errorSpecialties}</p>}
            </div>

            {/* Status Active toggle */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="isActiveDentist"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
              />
              <Label
                htmlFor="isActiveDentist"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Dentista ativo no corpo clínico
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                {editingDentist ? 'Salvar Alterações' : 'Cadastrar Dentista'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!dentistToDelete}
        onOpenChange={(open) => !open && setDentistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Dentista?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover "<strong>{dentistToDelete?.name}</strong>" do
              cadastro clínico?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
