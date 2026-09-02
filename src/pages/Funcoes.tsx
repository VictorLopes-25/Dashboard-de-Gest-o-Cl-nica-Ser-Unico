import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Role } from '@/types'
import {
  BadgeCheck,
  Plus,
  Pencil,
  Trash2,
  Users,
  CheckSquare,
  Shield,
  Layers,
  Sparkles,
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
  const { roles, collaborators, tasks, addRole, updateRole, deleteRole } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorName('O nome da função é obrigatório.')
      return
    }

    const colorConfig = PRESET_COLORS[selectedColorIndex]

    if (editingRole) {
      updateRole(editingRole.id, {
        name: name.trim(),
        description: description.trim(),
        color: colorConfig.color,
        bgLight: colorConfig.bgLight,
        textColor: colorConfig.textColor,
        borderColor: colorConfig.borderColor,
      })
    } else {
      addRole({
        name: name.trim(),
        description: description.trim(),
        color: colorConfig.color,
        bgLight: colorConfig.bgLight,
        textColor: colorConfig.textColor,
        borderColor: colorConfig.borderColor,
      })
    }

    setModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteRole(roleToDelete.id)
      setRoleToDelete(null)
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

        <Button
          onClick={handleOpenCreate}
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova função</span>
        </Button>
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
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-3 leading-relaxed min-h-[40px]">
                  {role.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-800">{linkedCollaborators.length}</span>
                    <p className="text-[10px] text-slate-500">Colaboradores</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-800">
                      {roleTasks.length} ({pendingTasks.length} pendentes)
                    </span>
                    <p className="text-[10px] text-slate-500">Tarefas cadastradas</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create / Edit Role */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingRole ? 'Editar Função' : 'Nova Função da Empresa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                {editingRole ? 'Salvar Alterações' : 'Criar Função'}
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
