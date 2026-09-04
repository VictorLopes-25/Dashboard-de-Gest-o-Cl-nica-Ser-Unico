import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import { createTask, updateTask, setTaskActive, fetchTasks, DbTask } from '@/services/tasksService'
import {
  computeExpectedTaskDates,
  ensureTaskOccurrences,
  fetchTodayAgenda,
  fetchAgendaWindow,
  completeAgendaItem,
  reopenAgendaItem,
  loadResolutionContext,
  resolveTaskResponsibility,
} from '@/services/agendaService'
import { createFunction, setFunctionActive } from '@/services/functionsService'
import { createPerson, setPersonActive } from '@/services/peopleService'
import { assignPersonToFunction } from '@/services/functionAssignmentsService'
import { createArea } from '@/services/areasService'

const TEST_PREFIX = 'STAGE2B_TEST_'

describe('Stage 2B: Tarefas + Agenda Unificada Persistence & Execution Engine', () => {
  let orgId: string
  const createdTaskIds: string[] = []
  const createdFunctionIds: string[] = []
  const createdPersonIds: string[] = []
  const createdAreaIds: string[] = []
  const createdAgendaItemIds: string[] = []

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeTruthy()
  })

  afterAll(async () => {
    // Limpeza completa de todos os dados temporários de validação
    // 1. Agenda items
    if (createdAgendaItemIds.length > 0) {
      await supabase.from('agenda_items').delete().in('id', createdAgendaItemIds)
    }
    // Deleta qualquer item de agenda apontando para as tasks criadas no teste
    if (createdTaskIds.length > 0) {
      await supabase
        .from('agenda_items')
        .delete()
        .eq('source_type', 'task')
        .in('source_id', createdTaskIds)
    }

    // 2. Tasks
    if (createdTaskIds.length > 0) {
      await supabase.from('tasks').delete().in('id', createdTaskIds)
    }

    // 3. Areas
    if (createdAreaIds.length > 0) {
      await supabase.from('areas').delete().in('id', createdAreaIds)
    }

    // 4. Function assignments
    if (createdFunctionIds.length > 0) {
      await supabase.from('function_assignments').delete().in('function_id', createdFunctionIds)
    }

    // 5. People
    if (createdPersonIds.length > 0) {
      await supabase.from('people').delete().in('id', createdPersonIds)
    }

    // 6. Functions
    if (createdFunctionIds.length > 0) {
      await supabase.from('functions').delete().in('id', createdFunctionIds)
    }
  })

  it('TEST A — recorrência diária: cria task diária, gera segunda+terça, segunda aberta não impede terça independente', async () => {
    // 1. Cria função de suporte
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_A`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    // 2. Cria task diária
    const task = await createTask({
      title: `${TEST_PREFIX}Task Diaria`,
      function_id: fn.id,
      recurrence: 'diaria',
    })
    createdTaskIds.push(task.id)

    // 3. Simula janela com 2 dias (ex: 2026-03-02 e 2026-03-03)
    const day1 = '2026-03-02'
    const day2 = '2026-03-03'

    const generated = await ensureTaskOccurrences(day1, day2)
    expect(generated).toBeGreaterThanOrEqual(2)

    // Busca ocorrências geradas
    const { data: occurrences } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .in('due_date', [day1, day2])
      .order('due_date', { ascending: true })

    expect(occurrences?.length).toBe(2)
    expect(occurrences![0].due_date).toBe(day1)
    expect(occurrences![0].status).toBe('aberto')
    expect(occurrences![1].due_date).toBe(day2)
    expect(occurrences![1].status).toBe('aberto')

    // Deixa segunda-feira (day1) em aberto / overdue, confirma que dia 2 coexiste independente
    expect(occurrences![0].id).not.toBe(occurrences![1].id)
  })

  it('TEST B — idempotência: rodar gerador várias vezes para o mesmo período gera zero duplicatas', async () => {
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_B`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    const task = await createTask({
      title: `${TEST_PREFIX}Task Idempotente`,
      function_id: fn.id,
      recurrence: 'diaria',
    })
    createdTaskIds.push(task.id)

    const windowStart = '2026-03-04'
    const windowEnd = '2026-03-05'

    // Primeira rodada
    await ensureTaskOccurrences(windowStart, windowEnd)

    // Segunda e terceira rodadas imediatas
    const run2 = await ensureTaskOccurrences(windowStart, windowEnd)
    const run3 = await ensureTaskOccurrences(windowStart, windowEnd)

    expect(run2).toBe(0)
    expect(run3).toBe(0)

    const { data: countData } = await supabase
      .from('agenda_items')
      .select('id')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .in('due_date', [windowStart, windowEnd])

    expect(countData?.length).toBe(2)
  })

  it('TEST C — semanal: apenas o dia da semana ISO esperado é gerado', async () => {
    // 2026-03-02 é segunda (1), 2026-03-08 é domingo (7)
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_C`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    // Quarta-feira = 3
    const task = await createTask({
      title: `${TEST_PREFIX}Task Semanal Quarta`,
      function_id: fn.id,
      recurrence: 'semanal',
      recurrence_day: 3,
    })
    createdTaskIds.push(task.id)

    const weekStart = '2026-03-02'
    const weekEnd = '2026-03-08'

    await ensureTaskOccurrences(weekStart, weekEnd)

    const { data: occ } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd)

    expect(occ?.length).toBe(1)
    expect(occ![0].due_date).toBe('2026-03-04') // 04/03/2026 é quarta-feira
  })

  it('TEST D — mensal: recurrence_day=31 em mês com 28/30 dias gera no último dia do mês', async () => {
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_D`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    // Task mensal dia 31
    const task = await createTask({
      title: `${TEST_PREFIX}Task Mensal 31`,
      function_id: fn.id,
      recurrence: 'mensal',
      recurrence_day: 31,
    })
    createdTaskIds.push(task.id)

    // Janela abrangendo Fevereiro 2026 (ano não bissexto -> 28 dias)
    const datesFeb = computeExpectedTaskDates(task, '2026-02-01', '2026-02-28')
    expect(datesFeb).toEqual(['2026-02-28'])

    // Janela abrangendo Abril 2026 (30 dias)
    const datesApr = computeExpectedTaskDates(task, '2026-04-01', '2026-04-30')
    expect(datesApr).toEqual(['2026-04-30'])

    // Janela abrangendo Março 2026 (31 dias)
    const datesMar = computeExpectedTaskDates(task, '2026-03-01', '2026-03-31')
    expect(datesMar).toEqual(['2026-03-31'])
  })

  it('TEST E — resolução de função: task vinculada à área resolve a função da área', async () => {
    // 1. Função da Área (Dentista/Responsável da Área)
    const fnArea = await createFunction({
      name: `${TEST_PREFIX}Func_Area`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fnArea.id)

    // 2. Área vinculada à função fnArea
    const area = await createArea({
      name: `${TEST_PREFIX}Área Cirurgia`,
      function_id: fnArea.id,
    })
    createdAreaIds.push(area.id)

    // 3. Cria task com area_id e sem function_id
    const task = await createTask({
      title: `${TEST_PREFIX}Task Vinculada à Área`,
      area_id: area.id,
      recurrence: 'diaria',
    })
    createdTaskIds.push(task.id)

    // Testar resolução de responsabilidade
    const context = await loadResolutionContext()
    const resolved = resolveTaskResponsibility(task, context)

    expect(resolved.functionId).toBe(fnArea.id)

    // Ao gerar na agenda, verificar se function_id gravado no agenda_item é fnArea.id
    const testDate = '2026-03-10'
    await ensureTaskOccurrences(testDate, testDate)

    const { data: item } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .eq('due_date', testDate)
      .maybeSingle()

    expect(item).toBeTruthy()
    expect(item?.function_id).toBe(fnArea.id)
  })

  it('TEST F — resolução de pessoa: sem default_person_id recebe ocupante da função; com default_person_id recebe a pessoa explícita', async () => {
    // 1. Função e Pessoas
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_F`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    const pOccupant = await createPerson({
      name: `${TEST_PREFIX}Pessoa Ocupante`,
    })
    createdPersonIds.push(pOccupant.id)

    const pExplicit = await createPerson({
      name: `${TEST_PREFIX}Pessoa Explícita`,
    })
    createdPersonIds.push(pExplicit.id)

    // Designa pOccupant como ocupante da função
    await assignPersonToFunction(pOccupant.id, fn.id)

    // Task 1: Sem default_person_id -> deve receber pOccupant
    const task1 = await createTask({
      title: `${TEST_PREFIX}Task Automatica`,
      function_id: fn.id,
      recurrence: 'pontual',
      due_date: '2026-03-11',
    })
    createdTaskIds.push(task1.id)

    // Task 2: Com default_person_id = pExplicit -> deve receber pExplicit
    const task2 = await createTask({
      title: `${TEST_PREFIX}Task Com Default`,
      function_id: fn.id,
      default_person_id: pExplicit.id,
      recurrence: 'pontual',
      due_date: '2026-03-11',
    })
    createdTaskIds.push(task2.id)

    await ensureTaskOccurrences('2026-03-11', '2026-03-11')

    const { data: item1 } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task1.id)
      .eq('due_date', '2026-03-11')
      .single()

    const { data: item2 } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task2.id)
      .eq('due_date', '2026-03-11')
      .single()

    expect(item1.person_id).toBe(pOccupant.id)
    expect(item2.person_id).toBe(pExplicit.id)
  })

  it('TEST G — histórico: concluir ocorrência, recarregar, verificar status + completed_at persistem', async () => {
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_G`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    const task = await createTask({
      title: `${TEST_PREFIX}Task Conclusao`,
      function_id: fn.id,
      recurrence: 'pontual',
      due_date: '2026-03-12',
    })
    createdTaskIds.push(task.id)

    await ensureTaskOccurrences('2026-03-12', '2026-03-12')

    const { data: item } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .eq('due_date', '2026-03-12')
      .single()

    expect(item.status).toBe('aberto')
    expect(item.completed_at).toBeNull()

    // Conclui
    const completed = await completeAgendaItem(item.id)
    expect(completed.status).toBe('concluido')
    expect(completed.completed_at).toBeTruthy()

    // Recarrega direto do Supabase
    const { data: reloaded } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('id', item.id)
      .single()

    expect(reloaded.status).toBe('concluido')
    expect(reloaded.completed_at).toBe(completed.completed_at)
  })

  it('TEST H — desativação: desativar task -> nenhuma nova ocorrência futura gerada', async () => {
    const fn = await createFunction({
      name: `${TEST_PREFIX}Func_H`,
      color: '#0F766E',
    })
    createdFunctionIds.push(fn.id)

    const task = await createTask({
      title: `${TEST_PREFIX}Task Desativavel`,
      function_id: fn.id,
      recurrence: 'diaria',
    })
    createdTaskIds.push(task.id)

    // Desativa a task
    await setTaskActive(task.id, false)

    // Tenta gerar janela no futuro
    const start = '2026-03-15'
    const end = '2026-03-20'
    await ensureTaskOccurrences(start, end)

    const { data: occurrences } = await supabase
      .from('agenda_items')
      .select('id')
      .eq('source_type', 'task')
      .eq('source_id', task.id)
      .gte('due_date', start)
      .lte('due_date', end)

    expect(occurrences?.length).toBe(0)
  })

  it('TEST I — views: TODAY, WEEK e MONTH carregam dados reais do Supabase', async () => {
    const today = new Date().toISOString().split('T')[0]

    // 1. Test Today Agenda
    const todayAgenda = await fetchTodayAgenda(today)
    expect(todayAgenda).toBeDefined()
    expect(Array.isArray(todayAgenda.overdue)).toBe(true)
    expect(Array.isArray(todayAgenda.todayOpen)).toBe(true)
    expect(Array.isArray(todayAgenda.todayCompleted)).toBe(true)

    // 2. Test Week Agenda Window
    const weekAgenda = await fetchAgendaWindow('2026-03-02', '2026-03-08', true)
    expect(weekAgenda).toBeDefined()
    expect(Array.isArray(weekAgenda.items)).toBe(true)
    expect(Array.isArray(weekAgenda.overdue)).toBe(true)

    // 3. Test Month Agenda Window
    const monthAgenda = await fetchAgendaWindow('2026-03-01', '2026-03-31', true)
    expect(monthAgenda).toBeDefined()
    expect(Array.isArray(monthAgenda.items)).toBe(true)
  })
})
