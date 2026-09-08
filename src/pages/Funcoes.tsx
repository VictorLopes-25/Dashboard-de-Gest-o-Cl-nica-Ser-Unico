import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Role, Collaborator } from '@/types'
import { toast } from '@/hooks/use-toast'
import {
  BadgeCheck,
  Plus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  CheckSquare,
  Shield,
  Layers,
  Sparkles,
  UserPlus,
  AlertTriangle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const PRESET_COLORS = [
  {
    color: '#0F766E',
    bgLight: '#CCFBF1',
    textColor: '#0F766E',
    borderColor: '#5EEAD4',
    label: 'Teal (Gerência)',
  },
  {
    color: '#0284C7',
    bgLight: '#E0F2FE',
    textColor: '#0369A1',
    borderColor: '#7DD3FC',
    label: 'Sky (Admin)',
  },
  {
    color: '#D97706',
    bgLight: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FCD34D',
    label: 'Amber (Concierge)',
  },
  {
    color: '#7C3AED',
    bgLight: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#C4B5FD',
    label: 'Violet (CRC)',
  },
  {
    color: '#059669',
    bgLight: '#D1FAE5',
    textColor: '#047857',
    borderColor: '#6EE7B7',
    label: 'Emerald (ASB 1)',
  },
  {
    color: '#10B981',
    bgLight: '#ECFDF5',
    textColor: '#065F46',
    borderColor: '#A7F3D0',
    label: 'Green (ASB Aux)',
  },
  {
    color: '#EA580C',
    bgLight: '#FFEDD5',
    textColor: '#C2410C',
    borderColor: '#FDBA74',
    label: 'Orange (Avaliador)',
  },
  {
    color: '#4F46E5',
    bgLight: '#E0E7FF',
    textColor: '#3730A3',
    borderColor: '#A5B4FC',
    label: 'Indigo (Dentistas)',
  },
  {
    color: '#DB2777',
    bgLight: '#FCE7F3',
    textColor: '#BE185D',
    borderColor: '#F9A8D4',
    label: 'Pink (Estética)',
  },
]

export default function Funcoes() {
  const {
    roles,
    collaborators,
    tasks,
    addRole,
    updateRole,
    deleteRole,
    assignRoleOccupant,
    isOwner,
  } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  // Modal Alterar/Substituir Ocupante
  const [occupantModalOpen, setOccupantModalOpen] = useState(false)
  const [targetRoleForOccupant, setTargetRoleForOccupant] = useState<Role | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [replacementConfirmOpen, setReplacementConfirmOpen] = useState(false)
  const [occupantSubmitting, setOccupantSubmitting] = useState(false)

  // Form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)

  const [errorName, setErrorName] = useState('')

  const handleOpenCreate = () => {
    setEditingRole(null)
    setName('')
    setDescription('')
    setSelectedColorIndex(0)
    setErrorName('')
    setModalOpen(true)
  }

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role)
    setName(role.name)
    setDescription(role.description || '')
    const foundIdx = PRESET_COLORS.findIndex((c) => c.color === role.color)
    setSelectedColorIndex(foundIdx >= 0 ? foundIdx : 0)
    setErrorName('')
    setModalOpen(true)
  }

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorName('O nome da função é obrigatório.')
      return
    }

    const colorConfig = PRESET_COLORS[selectedColorIndex]
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: name.trim(),
          description: description.trim(),
          color: colorConfig.color,
          bgLight: colorConfig.bgLight,
          textColor: colorConfig.textColor,
          borderColor: colorConfig.borderColor,
        })
      } else {
        await addRole({
          name: name.trim(),
          description: description.trim(),
          color: colorConfig.color,
          bgLight: colorConfig.bgLight,
          textColor: colorConfig.textColor,
          borderColor: colorConfig.borderColor,
        })
      }
      setModalOpen(false)
    } catch (err: any) {
      setSubmitError(err?.message || 'Falha ao salvar função no banco de dados.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (roleToDelete) {
      try {
        await deleteRole(roleToDelete.id)
        toast({
          title: 'Função desativada',
          description: `A função "${roleToDelete.name}" foi desativada com sucesso.`,
        })
        setRoleToDelete(null)
      } catch (err: any) {
        const msg = err?.message || 'Falha na operação'
        toast({
          title: 'Erro ao desativar função',
          description: msg,
          variant: 'destructive',
        })
      }
    }
  }

  const handleOpenOccupantModal = (role: Role) => {
    setTargetRoleForOccupant(role)
    const currentOccupants = collaborators.filter((c) => c.isActive && c.roleIds.includes(role.id))
    setSelectedPersonId(currentOccupants[0]?.id || '')
    setOccupantModalOpen(true)
  }

  const handleRequestAssignOccupant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetRoleForOccupant || !selectedPersonId) {
      toast({
        title: 'Selecione um colaborador',
        description: 'É necessário selecionar um colaborador cadastrado para assumir a função.',
        variant: 'destructive',
      })
      return
    }

    const currentOccupants = collaborators.filter(
      (c) => c.isActive && c.roleIds.includes(targetRoleForOccupant.id),
    )
    const currentOccupant = currentOccupants[0]

    // Se já for o mesmo ocupante
    if (currentOccupant && currentOccupant.id === selectedPersonId) {
      toast({
        title: 'Ocupante inalterado',
        description: `${currentOccupant.name} já ocupa atualmente a função ${targetRoleForOccupant.name}.`,
      })
      setOccupantModalOpen(false)
      return
    }

    // Se houver ocupante atual diferente, exige confirmação explícita do OWNER
    if (currentOccupant) {
      setReplacementConfirmOpen(true)
      return
    }

    // Se não há ocupante anterior, atribui diretamente
    executeAssignment()
  }

  const executeAssignment = async () => {
    if (!targetRoleForOccupant || !selectedPersonId) return

    setOccupantSubmitting(true)
    try {
      await assignRoleOccupant(targetRoleForOccupant.id, selectedPersonId)
      const newOccupant = collaborators.find((c) => c.id === selectedPersonId)

      toast({
        title: 'Ocupante atribuído com sucesso',
        description: `${newOccupant?.name || 'Colaborador'} agora é o ocupante atual de ${targetRoleForOccupant.name}.`,
      })

      setReplacementConfirmOpen(false)
      setOccupantModalOpen(false)
    } catch (err: any) {
      const msg = err?.message || 'Falha ao atribuir ocupante no Supabase.'
      toast({
        title: 'Erro na atribuição de ocupante',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setOccupantSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Funções da Empresa</h2>
          <p className="text-sm text-slate-500">
            Estrutura organizacional flexível orientada a papéis e rotinas operacionais
          </p>
        </div>

        {isOwner && (
          <Button
            onClick={handleOpenCreate}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova função</span>
          </Button>
        )}
      </div>

      {/* Info Card on Philosophy */}
      <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <p className="text-xs text-teal-900 leading-relaxed">
          <strong>Conceito Central:</strong> As funções representam postos e responsabilidades na
          clínica. Colaboradores podem ser atribuídos a múltiplas funções e alternar conforme o
          turno, sem que as tarefas do dia fiquem vinculadas rigidamente a um CPF fixo.
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => {
          // Count linked collaborators
          const linkedCollaborators = collaborators.filter(
            (c) => c.isActive && c.roleIds.includes(role.id),
          )
          // Count active tasks
          const roleTasks = tasks.filter((t) => t.roleId === role.id)
          const pendingTasks = roleTasks.filter((t) => t.status !== 'Concluída')

          return (
            <div
              key={role.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Badge + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-2"
                    style={{
                      backgroundColor: role.bgLight,
                      color: role.textColor,
                      borderColor: role.borderColor,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <span>{role.name}</span>
                  </span>

                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(role)}
                        className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                        title="Editar função"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRoleToDelete(role)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir função"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-3 leading-relaxed min-h-[40px]">
                  {role.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              {/* Occupant Section & Philosophy Header */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {role.name.toLowerCase().includes('dentista')
                      ? 'Corpo Clínico:'
                      : 'Ocupante Atual:'}
                  </span>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenOccupantModal(role)}
                      className="h-6 text-[11px] px-2 py-0 text-teal-700 hover:text-teal-800 border-teal-200 hover:bg-teal-50"
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      {role.name.toLowerCase().includes('dentista')
                        ? 'Gerenciar equipe'
                        : 'Alterar ocupante'}
                    </Button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                  {role.name.toLowerCase().includes('dentista') ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {linkedCollaborators.length}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          Dentistas / {linkedCollaborators.length} profissionais ativos
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Função multi-membro com escala clínica
                        </p>
                      </div>
                    </div>
                  ) : linkedCollaborators.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {linkedCollaborators[0].name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          {linkedCollaborators[0].name}
                        </p>
                        {linkedCollaborators.length > 1 && (
                          <p className="text-[10px] text-slate-400">
                            +{linkedCollaborators.length - 1} co-atribuído(s)
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 italic">Não atribuído</span>
                  )}
                </div>
              </div>

              {/* Stats Footer */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-800">{linkedCollaborators.length}</span>
                    <p className="text-[10px] text-slate-500">Colaboradores</p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-800">
                      {roleTasks.length} ({pendingTasks.length} pend.)
                    </span>
                    <p className="text-[10px] text-slate-500">Tarefas da função</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Alterar / Atribuir Ocupante da Função (OWNER ONLY) */}
      <Dialog open={occupantModalOpen} onOpenChange={setOccupantModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-700" />
              <span>Atribuir Ocupante — {targetRoleForOccupant?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRequestAssignOccupant} className="space-y-4 py-2">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
              <p className="font-semibold">Regra de Posse & Função:</p>
              <p>
                A <strong>FUNÇÃO</strong> é a estrutura organizacional permanente. O colaborador é o
                ocupante temporário. Rotinas, protocolos e tarefas permanecem na função mesmo quando
                o colaborador é substituído.
              </p>
            </div>

            {targetRoleForOccupant && (
              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Ocupante atual:</strong>{' '}
                  {targetRoleForOccupant.name.toLowerCase().includes('dentista') ? (
                    <span className="font-semibold text-slate-800">
                      Dentistas /{' '}
                      {
                        collaborators.filter(
                          (c) => c.isActive && c.roleIds.includes(targetRoleForOccupant.id),
                        ).length
                      }{' '}
                      profissionais ativos
                    </span>
                  ) : (
                    collaborators.find(
                      (c) => c.isActive && c.roleIds.includes(targetRoleForOccupant.id),
                    )?.name || <span className="text-slate-400 italic">Nenhum ocupante ativo</span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione o novo ocupante da função <span className="text-red-500">*</span>
              </Label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Selecione um colaborador cadastrado...</option>
                {collaborators
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{' '}
                      {c.roleIds.includes(targetRoleForOccupant?.id || '') ? '(Atual)' : ''}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Apenas colaboradores ativos cadastrados em public.people podem ser atribuídos.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOccupantModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={occupantSubmitting || !selectedPersonId}
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                {occupantSubmitting ? 'Gravando...' : 'Confirmar Ocupante'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirmação de Substituição Atômica */}
      <AlertDialog
        open={replacementConfirmOpen}
        onOpenChange={(open) => !open && setReplacementConfirmOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Substituir Ocupante da Função?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2 text-slate-700">
              <p>
                <strong>
                  {
                    collaborators.find(
                      (c) => c.isActive && c.roleIds.includes(targetRoleForOccupant?.id || ''),
                    )?.name
                  }
                </strong>{' '}
                ocupa atualmente a função <strong>{targetRoleForOccupant?.name}</strong>.
              </p>
              <p>
                Deseja substituí-lo(a) por{' '}
                <strong>{collaborators.find((c) => c.id === selectedPersonId)?.name}</strong>?
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <strong>Garantia Histórica:</strong> O histórico de atribuição anterior será
                preservado com data de encerramento. Tarefas e rotinas da função não serão perdidas
                nem duplicadas.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={occupantSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                executeAssignment()
              }}
              disabled={occupantSubmitting}
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              {occupantSubmitting ? 'Substituindo...' : 'Confirmar Substituição'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Create / Edit Role */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingRole ? 'Editar Função' : 'Nova Função da Empresa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {submitError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="roleName" className="text-xs font-semibold text-slate-700">
                Nome da função <span className="text-red-500">*</span>
              </Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errorName) setErrorName('')
                }}
                placeholder="Ex.: Auditor de Qualidade"
                className="h-10 text-sm"
              />
              {errorName && <p className="text-xs text-red-500">{errorName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cor de identificação</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((preset, idx) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                      selectedColorIndex === idx
                        ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                        : 'hover:scale-105 opacity-80'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="roleDesc" className="text-xs font-semibold text-slate-700">
                Descrição e atribuições do papel
              </Label>
              <Textarea
                id="roleDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva as principais responsabilidades operacionais..."
                className="text-sm min-h-[90px]"
              />
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
                {submitting ? 'Salvando...' : editingRole ? 'Salvar Alterações' : 'Criar Função'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Função?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover a função "<strong>{roleToDelete?.name}</strong>"? As
              tarefas e colaboradores vinculados poderão precisar de reatribuição.
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
