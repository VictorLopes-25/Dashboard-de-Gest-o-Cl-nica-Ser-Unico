import React, { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { Collaborator } from '@/types'
import { formatPhoneMask } from '@/components/LeadModal'
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Phone,
  Shield,
  Filter,
  CheckCircle2,
  XCircle,
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

export default function Colaboradores() {
  const { collaborators, roles, addCollaborator, updateCollaborator, deleteCollaborator } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingColab, setEditingColab] = useState<Collaborator | null>(null)
  const [colabToDelete, setColabToDelete] = useState<Collaborator | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  const [errorName, setErrorName] = useState('')
  const [errorRoles, setErrorRoles] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditingColab(null)
    setName('')
    setPhone('')
    setEmail('')
    setSelectedRoleIds(roles[0] ? [roles[0].id] : [])
    setIsActive(true)
    setErrorName('')
    setErrorRoles('')
    setModalOpen(true)
  }

  const handleOpenEdit = (colab: Collaborator) => {
    setEditingColab(colab)
    setName(colab.name)
    setPhone(colab.phone)
    setEmail(colab.email)
    setSelectedRoleIds(colab.roleIds)
    setIsActive(colab.isActive)
    setErrorName('')
    setErrorRoles('')
    setModalOpen(true)
  }

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    )
    if (errorRoles) setErrorRoles('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!name.trim()) {
      setErrorName('Informe o nome do colaborador.')
      hasError = true
    }
    if (selectedRoleIds.length === 0) {
      setErrorRoles('Selecione ao menos uma função.')
      hasError = true
    }

    if (hasError) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editingColab) {
        await updateCollaborator(editingColab.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          roleIds: selectedRoleIds,
          isActive,
        })
      } else {
        await addCollaborator({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          roleIds: selectedRoleIds,
          isActive,
        })
      }

      setModalOpen(false)
    } catch (err: any) {
      setSubmitError(err?.message || 'Falha ao salvar colaborador no banco de dados.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (colabToDelete) {
      try {
        await deleteCollaborator(colabToDelete.id)
        setColabToDelete(null)
      } catch (err: any) {
        alert(`Erro ao remover colaborador: ${err?.message || 'Falha na operação'}`)
      }
    }
  }

  // Filter list
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.email.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      if (filterRole !== 'all' && !c.roleIds.includes(filterRole)) {
        return false
      }
      return true
    })
  }, [collaborators, search, filterRole])

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Colaboradores</h2>
          <p className="text-sm text-slate-500">
            Quadro de equipe com atribuição flexível a uma ou mais funções operacionais
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo colaborador</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        <div className="w-full sm:w-64">
          <Select value={filterRole} onValueChange={(val) => setFilterRole(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Filtrar por função" />
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
      </div>

      {/* Grid of Collaborators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCollaborators.map((colab) => {
          const colabRoles = roles.filter((r) => colab.roleIds.includes(r.id))
          const primaryRole = colabRoles[0]
          const avatarColor = primaryRole ? primaryRole.color : '#0F766E'

          return (
            <div
              key={colab.id}
              className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4 ${
                !colab.isActive ? 'opacity-60 bg-slate-50/50' : ''
              }`}
            >
              <div>
                {/* Top Info & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {colab.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {colab.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        {colab.isActive ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Inativo
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(colab)}
                      className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                      title="Editar colaborador"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setColabToDelete(colab)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Excluir colaborador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Contact Data */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {colab.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{colab.phone}</span>
                    </div>
                  )}
                  {colab.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={colab.email}>
                        {colab.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Roles Badges */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Funções Habilitadas:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {colabRoles.map((r) => (
                    <span
                      key={r.id}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5"
                      style={{
                        backgroundColor: r.bgLight,
                        color: r.textColor,
                        borderColor: r.borderColor,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                      <span>{r.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create / Edit Collaborator */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingColab ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {submitError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="colabName" className="text-xs font-semibold text-slate-700">
                Nome completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="colabName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errorName) setErrorName('')
                }}
                placeholder="Ex.: Paula Rocha"
                className="h-10 text-sm"
              />
              {errorName && <p className="text-xs text-red-500">{errorName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="colabPhone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="colabPhone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="colabEmail" className="text-xs font-semibold text-slate-700">
                  E-mail institucional
                </Label>
                <Input
                  id="colabEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="paula.rocha@serunico.com.br"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Multiple Roles Checkbox Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Funções atribuídas (muitos-para-muitos) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  {selectedRoleIds.length} selecionada(s)
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 max-h-48 overflow-y-auto space-y-2">
                {roles.map((r) => {
                  const isChecked = selectedRoleIds.includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white cursor-pointer transition"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleRoleSelection(r.id)}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="text-xs font-medium text-slate-800">{r.name}</span>
                    </label>
                  )
                })}
              </div>
              {errorRoles && <p className="text-xs text-red-500">{errorRoles}</p>}
            </div>

            {/* Status Active toggle */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="isActiveColab"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
              />
              <Label
                htmlFor="isActiveColab"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Colaborador ativo no quadro da clínica
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                {submitting
                  ? 'Salvando...'
                  : editingColab
                    ? 'Salvar Alterações'
                    : 'Cadastrar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!colabToDelete} onOpenChange={(open) => !open && setColabToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover "<strong>{colabToDelete?.name}</strong>"?
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
