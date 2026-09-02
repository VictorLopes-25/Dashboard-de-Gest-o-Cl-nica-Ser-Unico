import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { Task, TaskRecurrence, TaskStatus } from '@/types'
import { TaskModal } from '@/components/TaskModal'
import { getTodayDateString } from '@/data/mockData'
import {
  Plus,
  Search,
  RotateCcw,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Tarefas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { tasks, roles, collaborators, deleteTask, updateTask, toggleTaskCompletion } = useApp()

  const filterRole = searchParams.get('funcao') || 'all'
  const filterStatus = searchParams.get('status') || 'all'
  const filterRecurrence = searchParams.get('recorrencia') || 'all'
  const filterSearch = searchParams.get('busca') || ''

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const todayStr = getTodayDateString(0)

  const updateQueryParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterRole !== 'all' && task.roleId !== filterRole) {
        return false
      }
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false
      }
      if (filterRecurrence !== 'all' && task.recurrence !== filterRecurrence) {
        return false
      }
      if (filterSearch && !task.title.toLowerCase().includes(filterSearch.toLowerCase())) {
        return false
      }
      return true
    })
  }, [tasks, filterRole, filterStatus, filterRecurrence, filterSearch])

  const handleOpenCreate = () => {
    setTaskToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id)
      setTaskToDelete(null)
    }
  }

  const getCollaboratorName = (id?: string) => {
    if (!id) return '—'
    return collaborators.find((c) => c.id === id)?.name || '—'
  }

  const formatDatePTBR = (dateStr: string) => {
    if (!dateStr) return '—'
    const [year, month, day] = dateStr.split('-')
    if (!year || !month || !day) return dateStr
    return `${day}/${month}/${year}`
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tarefas</h2>
          <p className="text-sm text-slate-500">
            Gerenciamento e distribuição de rotinas operacionais organizadas por função
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova tarefa</span>
        </Button>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-teal-700" />
          <span>Filtros de visualização</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Buscar por título da tarefa..."
              value={filterSearch}
              onChange={(e) => updateQueryParam('busca', e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div>
            <Select value={filterRole} onValueChange={(val) => updateQueryParam('funcao', val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todas as funções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>{r.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterStatus} onValueChange={(val) => updateQueryParam('status', val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={filterRecurrence}
              onValueChange={(val) => updateQueryParam('recorrencia', val)}
            >
              <SelectTrigger className="h-10 text-sm flex-1">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as recorrências</SelectItem>
                <SelectItem value="Única">Única</SelectItem>
                <SelectItem value="Diária">Diária</SelectItem>
                <SelectItem value="Semanal">Semanal</SelectItem>
                <SelectItem value="Mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>

            {(filterRole !== 'all' ||
              filterStatus !== 'all' ||
              filterRecurrence !== 'all' ||
              filterSearch !== '') && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Limpar filtros"
                className="h-10 w-10 shrink-0 text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Exibindo <strong>{filteredTasks.length}</strong>{' '}
          {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
        </span>
        {filterRole !== 'all' && (
          <span className="bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
            Filtrado por: {roles.find((r) => r.id === filterRole)?.name}
          </span>
        )}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[45px]"></TableHead>
              <TableHead className="font-semibold text-slate-700">Título</TableHead>
              <TableHead className="font-semibold text-slate-700">Função</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">Recorrência</TableHead>
              <TableHead className="font-semibold text-slate-700">Responsável Atual</TableHead>
              <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  Nenhuma tarefa encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const role = roles.find((r) => r.id === task.roleId)
                const isCompleted = task.status === 'Concluída'
                const isOverdue = task.dueDate < todayStr && !isCompleted

                return (
                  <TableRow
                    key={task.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isCompleted ? 'bg-slate-50/40 text-slate-400' : ''
                    }`}
                  >
                    <TableCell className="pl-4">
                      <button
                        type="button"
                        onClick={() => toggleTaskCompletion(task.id)}
                        className="text-slate-400 hover:text-teal-700 transition"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-teal-600" />
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="font-medium max-w-xs">
                      <span
                        className={`text-sm ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                    </TableCell>

                    <TableCell>
                      {role ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: role.bgLight,
                            color: role.textColor,
                            borderColor: role.borderColor,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(val) => {
                          if (val === 'Concluída' && task.status !== 'Concluída') {
                            toggleTaskCompletion(task.id)
                          } else {
                            updateTask(task.id, {
                              status: val as TaskStatus,
                              completedAt:
                                val === 'Concluída' ? new Date().toISOString() : undefined,
                            })
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em andamento">Em andamento</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {task.recurrence}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700 font-medium">
                      {getCollaboratorName(task.assignedCollaboratorId)}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-800">
                          {formatDatePTBR(task.dueDate)}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Atrasada
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(task)}
                          className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                          title="Editar tarefa"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTaskToDelete(task)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center text-slate-400 text-sm">
            Nenhuma tarefa encontrada.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const role = roles.find((r) => r.id === task.roleId)
            const isCompleted = task.status === 'Concluída'
            const isOverdue = task.dueDate < todayStr && !isCompleted

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border bg-white shadow-2xs space-y-3 ${
                  isCompleted ? 'opacity-70 bg-slate-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompletion(task.id)}
                      className="mt-0.5 text-slate-400"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>
                      {role && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: role.bgLight,
                              color: role.textColor,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: role.color }}
                            />
                            <span>{role.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(task)}
                      className="h-8 w-8 text-slate-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTaskToDelete(task)}
                      className="h-8 w-8 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {task.recurrence}
                    </span>
                    <span className="text-slate-500">
                      👤 {getCollaboratorName(task.assignedCollaboratorId)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}>
                      {formatDatePTBR(task.dueDate)} {isOverdue && '(Atrasada)'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        taskToEdit={taskToEdit}
        defaultRoleId={filterRole !== 'all' ? filterRole : undefined}
      />

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover a tarefa "<strong>{taskToDelete?.title}</strong>"?
              Esta ação não poderá ser desfeita.
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
