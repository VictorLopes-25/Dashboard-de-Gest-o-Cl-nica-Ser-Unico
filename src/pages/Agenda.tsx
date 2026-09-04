import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { AgendaItem } from '@/types'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Filter,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  BadgeCheck,
  CalendarDays,
  FileText,
  AlertCircle,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type AgendaViewMode = 'today' | 'week' | 'month'

export default function Agenda() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    roles,
    collaborators,
    agendaItems,
    overdueAgendaItems,
    completeAgendaItem,
    reopenAgendaItem,
    cancelAgendaItem,
    addManualAgendaItem,
    loadAgendaWindow,
    refreshData,
  } = useApp()

  const viewMode = (searchParams.get('modo') as AgendaViewMode) || 'today'
  const filterRole = searchParams.get('funcao') || 'all'
  const filterPerson = searchParams.get('pessoa') || 'all'
  const filterStatus = searchParams.get('status') || 'all'

  // Data atual de referência para navegação da semana e do mês
  const [currentPivotDate, setCurrentPivotDate] = useState<Date>(() => new Date())
  const [windowItems, setWindowItems] = useState<AgendaItem[]>([])
  const [windowOverdue, setWindowOverdue] = useState<AgendaItem[]>([])
  const [loadingWindow, setLoadingWindow] = useState(false)

  // Modal para criar item manual (tarefa, compromisso, pendencia)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualType, setManualType] = useState<'tarefa' | 'compromisso' | 'pendencia'>('tarefa')
  const [manualTitle, setManualTitle] = useState('')
  const [manualDueDate, setManualDueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [manualDueTime, setManualDueTime] = useState('')
  const [manualFunctionId, setManualFunctionId] = useState('')
  const [manualPersonId, setManualPersonId] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [manualError, setManualError] = useState('')

  // Dia selecionado na visão de mês
  const [selectedMonthDateStr, setSelectedMonthDateStr] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  )

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const setViewMode = (mode: AgendaViewMode) => {
    updateParam('modo', mode)
  }

  // -------------------------------------------------------------------------
  // Cálculo de janelas de datas (Week / Month)
  // -------------------------------------------------------------------------

  // Retorna início (segunda-feira) e fim (domingo) da semana do pivot
  const weekRange = useMemo(() => {
    const d = new Date(currentPivotDate)
    const day = d.getDay()
    // 0 = domingo -> diff = 6; 1 = seg -> diff = 0; ...
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const format = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const dayNum = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${dayNum}`
    }

    return {
      startStr: format(monday),
      endStr: format(sunday),
      startDate: monday,
      endDate: sunday,
    }
  }, [currentPivotDate])

  // Retorna início e fim do mês do pivot
  const monthRange = useMemo(() => {
    const y = currentPivotDate.getFullYear()
    const m = currentPivotDate.getMonth()
    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)

    const format = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const dayNum = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${dayNum}`
    }

    return {
      startStr: format(firstDay),
      endStr: format(lastDay),
      year: y,
      month: m + 1,
      totalDays: lastDay.getDate(),
      firstDayOfWeek: firstDay.getDay(), // 0 = dom, 1 = seg
    }
  }, [currentPivotDate])

  // Carregar janela quando o modo ou pivot muda
  const fetchCurrentWindow = useCallback(async () => {
    if (viewMode === 'today') return
    setLoadingWindow(true)
    try {
      const start = viewMode === 'week' ? weekRange.startStr : monthRange.startStr
      const end = viewMode === 'week' ? weekRange.endStr : monthRange.endStr
      const res = await loadAgendaWindow(start, end)
      setWindowItems(res.items)
      setWindowOverdue(res.overdue)
    } catch (err) {
      console.error('Erro ao carregar janela de agenda:', err)
    } finally {
      setLoadingWindow(false)
    }
  }, [viewMode, weekRange, monthRange, loadAgendaWindow])

  useEffect(() => {
    fetchCurrentWindow()
  }, [fetchCurrentWindow])

  // Navegação anterior / próximo / hoje
  const handlePrev = () => {
    const d = new Date(currentPivotDate)
    if (viewMode === 'today') {
      d.setDate(d.getDate() - 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    setCurrentPivotDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentPivotDate)
    if (viewMode === 'today') {
      d.setDate(d.getDate() + 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    setCurrentPivotDate(d)
  }

  const handleGoToday = () => {
    setCurrentPivotDate(new Date())
    setSelectedMonthDateStr(todayStr)
  }

  // Helpers de filtro
  const applyFilter = (items: AgendaItem[]) => {
    return items.filter((item) => {
      if (filterRole !== 'all' && item.functionId !== filterRole) return false
      if (filterPerson !== 'all' && item.personId !== filterPerson) return false
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      return true
    })
  }

  const getRoleBadge = (roleId?: string | null) => {
    if (!roleId) return null
    const role = roles.find((r) => r.id === roleId)
    if (!role) return null
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
        style={{
          backgroundColor: role.bgLight,
          color: role.textColor,
          borderColor: role.borderColor,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />
        <span>{role.name}</span>
      </span>
    )
  }

  const getPersonName = (personId?: string | null) => {
    if (!personId) return null
    return collaborators.find((c) => c.id === personId)?.name || null
  }

  const formatPtDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  // -------------------------------------------------------------------------
  // Criação de Item Manual
  // -------------------------------------------------------------------------

  const handleOpenManualModal = () => {
    setManualTitle('')
    setManualDueDate(todayStr)
    setManualDueTime('')
    setManualFunctionId(roles[0]?.id || '')
    setManualPersonId('')
    setManualNotes('')
    setManualType('tarefa')
    setManualError('')
    setManualModalOpen(true)
  }

  const handleCreateManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTitle.trim()) {
      setManualError('Informe o título do item.')
      return
    }

    try {
      await addManualAgendaItem({
        type: manualType,
        title: manualTitle.trim(),
        dueDate: manualDueDate,
        dueTime: manualDueTime || null,
        functionId: manualFunctionId || null,
        personId: manualPersonId || null,
        notes: manualNotes.trim() || null,
      })
      setManualModalOpen(false)
      if (viewMode !== 'today') {
        fetchCurrentWindow()
      }
    } catch (err: any) {
      setManualError(err.message || 'Erro ao registrar item manual na agenda.')
    }
  }

  // -------------------------------------------------------------------------
  // Renderizadores de Visão: TODAY, WEEK, MONTH
  // -------------------------------------------------------------------------

  // Item da Agenda Componente
  const renderItemCard = (item: AgendaItem, showDate = false) => {
    const isCompleted = item.status === 'concluido'
    const isCancelled = item.status === 'cancelado'
    const isOverdue = item.status === 'aberto' && item.dueDate < todayStr
    const personName = getPersonName(item.personId)

    return (
      <div
        key={item.id}
        className={`p-3.5 rounded-xl border transition-all ${
          isCompleted
            ? 'bg-slate-50/70 border-slate-200 opacity-75'
            : isCancelled
              ? 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-60'
              : isOverdue
                ? 'bg-red-50/40 border-red-200 hover:border-red-300 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              if (isCompleted) {
                reopenAgendaItem(item.id)
              } else {
                completeAgendaItem(item.id)
              }
            }}
            className="mt-0.5 shrink-0 text-slate-400 hover:text-teal-700 transition"
            title={isCompleted ? 'Reabrir item' : 'Concluir item'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
            ) : (
              <Circle className="w-5 h-5 hover:text-teal-600" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm font-semibold leading-snug ${
                  isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                }`}
              >
                {item.title}
              </span>

              {item.type !== 'tarefa' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                  {item.type}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {getRoleBadge(item.functionId)}

              {personName && (
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> {personName}
                </span>
              )}

              {showDate && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  <CalendarDays className="w-3 h-3 text-slate-400" />
                  {formatPtDate(item.dueDate)}
                </span>
              )}

              {item.dueTime && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {item.dueTime.slice(0, 5)}
                </span>
              )}

              {isOverdue && !showDate && (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                  Atrasada
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 1. TODAY VIEW
  const renderTodayView = () => {
    // SEÇÃO 1 "ATRASADAS": status='aberto' AND due_date < CURRENT_DATE
    const overdueFiltered = applyFilter(overdueAgendaItems)

    // SEÇÃO 2 "HOJE": status='aberto' AND due_date = CURRENT_DATE
    const todayOpenFiltered = applyFilter(
      agendaItems.filter((i) => i.status === 'aberto' && i.dueDate === todayStr),
    )

    // SEÇÃO 3 "CONCLUÍDAS HOJE": status='concluido' AND due_date = CURRENT_DATE
    const todayCompletedFiltered = applyFilter(
      agendaItems.filter((i) => i.status === 'concluido' && i.dueDate === todayStr),
    )

    return (
      <div className="space-y-6">
        {/* SEÇÃO 1: ATRASADAS */}
        {overdueFiltered.length > 0 && (
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-red-200/80 mb-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base">Tarefas Atrasadas</h3>
                <span className="text-xs bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded-full">
                  {overdueFiltered.length}
                </span>
              </div>
              <p className="text-xs text-red-700 hidden sm:block">
                Itens de dias anteriores que ainda não foram concluídos
              </p>
            </div>

            <div className="space-y-2.5">
              {overdueFiltered.map((item) => renderItemCard(item, true))}
            </div>
          </div>
        )}

        {/* SEÇÃO 2: HOJE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Clock className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-base">Para Fazer Hoje</h3>
              <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                {todayOpenFiltered.length}
              </span>
            </div>
            <span className="text-xs text-slate-500 capitalize">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>

          {todayOpenFiltered.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Tudo em dia para hoje!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nenhuma tarefa pendente agendada para este turno.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayOpenFiltered.map((item) => renderItemCard(item, false))}
            </div>
          )}
        </div>

        {/* SEÇÃO 3: CONCLUÍDAS HOJE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base">Concluídas Hoje</h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {todayCompletedFiltered.length}
              </span>
            </div>
          </div>

          {todayCompletedFiltered.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">
              Nenhuma tarefa concluída hoje até o momento.
            </p>
          ) : (
            <div className="space-y-2.5">
              {todayCompletedFiltered.map((item) => renderItemCard(item, false))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. WEEK VIEW
  const renderWeekView = () => {
    const filteredWeekItems = applyFilter(windowItems)
    const filteredOverdue = applyFilter(windowOverdue)

    // Agrupar itens por dia da semana (segunda a domingo)
    const days: Array<{ date: Date; dateStr: string; label: string }> = []
    const cur = new Date(weekRange.startDate)
    for (let i = 0; i < 7; i++) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      const label = cur.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
      days.push({ date: new Date(cur), dateStr, label })
      cur.setDate(cur.getDate() + 1)
    }

    return (
      <div className="space-y-6">
        {filteredOverdue.length > 0 && (
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>
                Atenção: {filteredOverdue.length} item(ns) atrasado(s) de períodos anteriores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredOverdue.map((i) => renderItemCard(i, true))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map(({ dateStr, label }) => {
            const isToday = dateStr === todayStr
            const dayItems = filteredWeekItems.filter((i) => i.dueDate === dateStr)

            return (
              <div
                key={dateStr}
                className={`flex flex-col rounded-2xl border p-3 min-h-[300px] ${
                  isToday
                    ? 'bg-teal-50/30 border-teal-300 shadow-xs'
                    : 'bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span
                    className={`text-xs font-bold capitalize ${
                      isToday ? 'text-teal-800' : 'text-slate-700'
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {dayItems.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {dayItems.length === 0 ? (
                    <p className="text-[11px] text-slate-300 italic pt-6 text-center">
                      Sem atividades
                    </p>
                  ) : (
                    dayItems.map((item) => renderItemCard(item, false))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 3. MONTH VIEW
  const renderMonthView = () => {
    const filteredMonthItems = applyFilter(windowItems)
    const filteredOverdue = applyFilter(windowOverdue)

    // Agrupa quantidade de itens por dia do mês
    const countsByDate = new Map<string, { total: number; open: number; completed: number }>()
    for (const item of filteredMonthItems) {
      const existing = countsByDate.get(item.dueDate) || { total: 0, open: 0, completed: 0 }
      existing.total++
      if (item.status === 'concluido') existing.completed++
      if (item.status === 'aberto') existing.open++
      countsByDate.set(item.dueDate, existing)
    }

    // Dias do mês
    const daysInMonth = monthRange.totalDays
    const year = monthRange.year
    const month = monthRange.month

    const dayCells = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const counts = countsByDate.get(dateStr)
      const isSelected = selectedMonthDateStr === dateStr
      const isToday = dateStr === todayStr

      dayCells.push({
        dayNum: d,
        dateStr,
        counts,
        isSelected,
        isToday,
      })
    }

    // Itens do dia selecionado
    const selectedDayItems = filteredMonthItems.filter((i) => i.dueDate === selectedMonthDateStr)

    return (
      <div className="space-y-6">
        {filteredOverdue.length > 0 && (
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>
                Atenção: {filteredOverdue.length} item(ns) atrasado(s) de períodos anteriores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredOverdue.map((i) => renderItemCard(i, true))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grade de calendário do mês (Col 7) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-100">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-3">
              {/* Espaços vazios no início do mês */}
              {Array.from({ length: monthRange.firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/40" />
              ))}

              {dayCells.map((cell) => (
                <button
                  type="button"
                  key={cell.dateStr}
                  onClick={() => setSelectedMonthDateStr(cell.dateStr)}
                  className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between text-left transition ${
                    cell.isSelected
                      ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-600/30'
                      : cell.isToday
                        ? 'border-teal-300 bg-teal-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? 'text-teal-700 font-extrabold'
                          : cell.isSelected
                            ? 'text-teal-900'
                            : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" title="Hoje" />
                    )}
                  </div>

                  {cell.counts && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {cell.counts.open > 0 && (
                        <span className="px-1 rounded bg-amber-100 text-amber-800 font-bold">
                          {cell.counts.open}
                        </span>
                      )}
                      {cell.counts.completed > 0 && (
                        <span className="px-1 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {cell.counts.completed}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de itens do dia selecionado (Col 5) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Dia {formatPtDate(selectedMonthDateStr)}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDayItems.length} item(ns) programados
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-1">
              {selectedDayItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhuma atividade registrada para esta data.
                </div>
              ) : (
                selectedDayItems.map((item) => renderItemCard(item, false))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Título do cabeçalho da visão atual
  const headerDateLabel = useMemo(() => {
    if (viewMode === 'today') {
      return new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    if (viewMode === 'week') {
      return `Semana de ${formatPtDate(weekRange.startStr)} até ${formatPtDate(weekRange.endStr)}`
    }
    return currentPivotDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }, [viewMode, weekRange, currentPivotDate])

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Agenda Unificada</span>
          </h2>
          <p className="text-sm text-slate-500 capitalize">{headerDateLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação de data */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 text-slate-600"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToday}
              className="h-8 px-2 text-xs font-semibold text-slate-700"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 text-slate-600"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Abas de Modo: HOJE / SEMANA / MÊS */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'today'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
          </div>

          <Button
            onClick={handleOpenManualModal}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Item manual</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-teal-700" />
          <span>Filtros da Agenda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Função */}
          <div>
            <Select value={filterRole} onValueChange={(val) => updateParam('funcao', val)}>
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

          {/* Pessoa */}
          <div>
            <Select value={filterPerson} onValueChange={(val) => updateParam('pessoa', val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todas as pessoas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(val) => updateParam('status', val)}>
              <SelectTrigger className="h-10 text-sm flex-1">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberto">Abertas</SelectItem>
                <SelectItem value="concluido">Concluídas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            {(filterRole !== 'all' || filterPerson !== 'all' || filterStatus !== 'all') && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchParams({ modo: viewMode })}
                title="Limpar filtros"
                className="h-10 w-10 shrink-0 text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo da Visão */}
      {viewMode === 'today' && renderTodayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Modal Item Manual */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Novo Item na Agenda
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateManualSubmit} className="space-y-4 py-2">
            {manualError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {manualError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de item</Label>
              <Select
                value={manualType}
                onValueChange={(val) =>
                  setManualType(val as 'tarefa' | 'compromisso' | 'pendencia')
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarefa">Tarefa Operacional</SelectItem>
                  <SelectItem value="compromisso">Compromisso</SelectItem>
                  <SelectItem value="pendencia">Pendência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ex.: Reunião de alinhamento com ASB"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Data</Label>
                <Input
                  type="date"
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Hora (opcional)</Label>
                <Input
                  type="time"
                  value={manualDueTime}
                  onChange={(e) => setManualDueTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Função</Label>
                <Select value={manualFunctionId} onValueChange={setManualFunctionId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Pessoa (opcional)</Label>
                <Select value={manualPersonId} onValueChange={setManualPersonId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Qualquer membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguém específico</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Notas / Instruções</Label>
              <Textarea
                rows={2}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Observações complementares..."
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">
                Adicionar à Agenda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
