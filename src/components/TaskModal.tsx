import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Task, TaskRecurrence, TaskStatus } from '@/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskToEdit?: Task | null
  defaultRoleId?: string
}

export const TaskModal: React.FC<TaskModalProps> = ({
  open,
  onOpenChange,
  taskToEdit,
  defaultRoleId,
}) => {
  const { roles, collaborators, addTask, updateTask, currentUser } = useApp()

  const [title, setTitle] = useState(taskToEdit?.title || '')
  const [roleId, setRoleId] = useState(
    taskToEdit?.roleId || defaultRoleId || currentUser?.roleId || roles[0]?.id || '',
  )
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || 'Pendente')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(taskToEdit?.recurrence || 'Diária')
  const [assignedCollaboratorId, setAssignedCollaboratorId] = useState<string>(
    taskToEdit?.assignedCollaboratorId || '',
  )
  const [dueDate, setDueDate] = useState(taskToEdit?.dueDate || getTodayDateString(0))

  const [errorTitle, setErrorTitle] = useState('')
  const [errorRole, setErrorRole] = useState('')

  // Reset form when opened or taskToEdit changed
  React.useEffect(() => {
    if (open) {
      if (taskToEdit) {
        setTitle(taskToEdit.title)
        setRoleId(taskToEdit.roleId)
        setStatus(taskToEdit.status)
        setRecurrence(taskToEdit.recurrence)
        setAssignedCollaboratorId(taskToEdit.assignedCollaboratorId || '')
        setDueDate(taskToEdit.dueDate)
      } else {
        setTitle('')
        setRoleId(defaultRoleId || currentUser?.roleId || roles[0]?.id || '')
        setStatus('Pendente')
        setRecurrence('Diária')
        setAssignedCollaboratorId('')
        setDueDate(getTodayDateString(0))
      }
      setErrorTitle('')
      setErrorRole('')
    }
  }, [open, taskToEdit, defaultRoleId, currentUser, roles])

  // Filter collaborators that have the selected role
  const eligibleCollaborators = collaborators.filter(
    (c) => c.isActive && c.roleIds.includes(roleId),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!title.trim()) {
      setErrorTitle('Informe o título da tarefa.')
      hasError = true
    } else {
      setErrorTitle('')
    }

    if (!roleId) {
      setErrorRole('Selecione a função responsável.')
      hasError = true
    } else {
      setErrorRole('')
    }

    if (hasError) return

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: title.trim(),
        roleId,
        status,
        recurrence,
        assignedCollaboratorId: assignedCollaboratorId || undefined,
        dueDate,
      })
    } else {
      addTask({
        title: title.trim(),
        roleId,
        status,
        recurrence,
        assignedCollaboratorId: assignedCollaboratorId || undefined,
        dueDate,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="taskTitle" className="text-xs font-semibold text-slate-700">
              Título da tarefa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="taskTitle"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errorTitle) setErrorTitle('')
              }}
              placeholder="Ex.: Conferir estoque de anestésicos"
              className="h-10 text-sm"
            />
            {errorTitle && <p className="text-xs text-red-500">{errorTitle}</p>}
          </div>

          {/* Função Responsável */}
          <div className="space-y-1.5">
            <Label htmlFor="taskRole" className="text-xs font-semibold text-slate-700">
              Função responsável <span className="text-red-500">*</span>
            </Label>
            <Select
              value={roleId}
              onValueChange={(val) => {
                setRoleId(val)
                if (errorRole) setErrorRole('')
                // Clear assigned collaborator if they do not belong to the newly selected role
                const isStillEligible = collaborators.some(
                  (c) => c.id === assignedCollaboratorId && c.roleIds.includes(val),
                )
                if (!isStillEligible) {
                  setAssignedCollaboratorId('')
                }
              }}
            >
              <SelectTrigger id="taskRole" className="h-10">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: r.color }}
                      />
                      <span>{r.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorRole && <p className="text-xs text-red-500">{errorRole}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as TaskStatus)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recorrência */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Recorrência</Label>
              <Select
                value={recurrence}
                onValueChange={(val) => setRecurrence(val as TaskRecurrence)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Única">Única (sem repetição)</SelectItem>
                  <SelectItem value="Diária">Diária</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsável Atual (Opcional - filtrado pela função) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Responsável atual (opcional)
                </Label>
              </div>
              <Select
                value={assignedCollaboratorId || 'none'}
                onValueChange={(val) => setAssignedCollaboratorId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Nenhum (aberto à função)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (qualquer membro da função)</SelectItem>
                  {eligibleCollaborators.length > 0 ? (
                    eligibleCollaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-colabs" disabled>
                      Nenhum colaborador com esta função
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                Lista apenas colaboradores vinculados à função selecionada.
              </p>
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-semibold text-slate-700">
                Data de vencimento
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium">
              {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
