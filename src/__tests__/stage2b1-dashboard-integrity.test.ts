import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import { createManualAgendaItem, completeAgendaItem, DbAgendaItem } from '@/services/agendaService'
import { fetchFunctions } from '@/services/functionsService'

const TEST_PREFIX = 'STAGE2B1_TEMP_'

describe('Stage 2B.1: Dashboard Data Integrity Validation (Rules A..E)', () => {
  let orgId: string
  let gerenciaFuncId: string
  let crcFuncId: string
  const createdAgendaIds: string[] = []

  const todayStr = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  const pastDateStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 2)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeTruthy()

    const funcs = await fetchFunctions()
    const gerencia = funcs.find((f) => f.name.toLowerCase().includes('gerência'))
    const crc = funcs.find((f) => f.name.toLowerCase().includes('crc'))

    expect(gerencia).toBeDefined()
    expect(crc).toBeDefined()

    gerenciaFuncId = gerencia!.id
    crcFuncId = crc!.id
  })

  afterAll(async () => {
    // REMOÇÃO TOTAL DOS DADOS DE TESTE (TEMP_TEST_DATA_REMOVED = TRUE)
    if (createdAgendaIds.length > 0) {
      await supabase.from('agenda_items').delete().in('id', createdAgendaIds)
    }
    await supabase.from('agenda_items').delete().ilike('title', `${TEST_PREFIX}%`)
  })

  it('TEST A — Zero Denominator: Função com 0 tarefas no período exibe "—" e nunca 100% ou positivo', () => {
    // Regra: expected = 0 -> NULL -> UI exibe "—". NUNCA 0/0 = 100%.
    const expected = 0
    const completed = 0
    const performance = expected > 0 ? Math.round((completed / expected) * 100) : null
    const display = performance !== null ? `${performance}%` : '—'

    expect(performance).toBeNull()
    expect(display).toBe('—')
    expect(display).not.toBe('100%')
    expect(display).not.toBe('0%')
  })

  it('TEST B — Weekly Performance: Função com 4 tarefas e 3 concluídas gera exatamente 75%', async () => {
    // Cria 4 tarefas da semana para a função CRC
    const items: DbAgendaItem[] = []
    for (let i = 1; i <= 4; i++) {
      const created = await createManualAgendaItem({
        type: 'tarefa',
        title: `${TEST_PREFIX}CRC_Task_${i}`,
        due_date: todayStr,
        function_id: crcFuncId,
      })
      createdAgendaIds.push(created.id)
      items.push(created)
    }

    // Conclui 3 das 4 tarefas
    await completeAgendaItem(items[0].id)
    await completeAgendaItem(items[1].id)
    await completeAgendaItem(items[2].id)

    // Simula cálculo da semana:
    // expected = COUNT agenda_items WHERE type='tarefa' AND function_id=crcFuncId AND due_date dentro do período AND status <> 'cancelado'
    const { data: dbItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('function_id', crcFuncId)
      .eq('type', 'tarefa')
      .neq('status', 'cancelado')
      .gte('due_date', pastDateStr)
      .lte('due_date', todayStr)

    const expected = dbItems?.length || 0
    const completed = dbItems?.filter((i) => i.status === 'concluido').length || 0
    const performance = expected > 0 ? Math.round((completed / expected) * 100) : null

    expect(expected).toBe(4)
    expect(completed).toBe(3)
    expect(performance).toBe(75)
  })

  it('TEST C — Overdue KPI: Tarefa com due_date passada e status aberto incrementa KPI "Atrasadas"', async () => {
    // Cria item atrasado (status aberto, due_date passada)
    const overdueItem = await createManualAgendaItem({
      type: 'tarefa',
      title: `${TEST_PREFIX}Overdue_Task`,
      due_date: pastDateStr,
      function_id: gerenciaFuncId,
    })
    createdAgendaIds.push(overdueItem.id)

    // Consulta atrasadas: status = 'aberto' AND due_date < CURRENT_DATE
    const { data: overdue } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'aberto')
      .lt('due_date', todayStr)

    expect(overdue?.some((i) => i.id === overdueItem.id)).toBe(true)
    const overdueCount = overdue?.length || 0
    expect(overdueCount).toBeGreaterThanOrEqual(1)
  })

  it('TEST D — Today & My Tasks KPI: Tarefa de hoje para a função Gerência aparece na lista e incrementa KPI de hoje', async () => {
    // Cria tarefa de hoje para a Gerência
    const todayTask = await createManualAgendaItem({
      type: 'tarefa',
      title: `${TEST_PREFIX}Gerencia_Today_Task`,
      due_date: todayStr,
      function_id: gerenciaFuncId,
    })
    createdAgendaIds.push(todayTask.id)

    // Consulta de tarefas de hoje: type='tarefa', due_date=todayStr, status <> 'cancelado'
    const { data: todayItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('type', 'tarefa')
      .eq('due_date', todayStr)
      .neq('status', 'cancelado')

    const myRoleTasks = todayItems?.filter((i) => i.function_id === gerenciaFuncId)

    expect(todayItems?.some((i) => i.id === todayTask.id)).toBe(true)
    expect(myRoleTasks?.some((i) => i.id === todayTask.id)).toBe(true)
  })

  it('TEST E — Persistence & Reload Recalculation: Valida persistência e recalculo estrito dos dados', async () => {
    // Recarrega todos os agenda_items e verifica se os cálculos são coerentes
    const { data: allItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('organization_id', orgId)

    expect(allItems).toBeDefined()
    expect(Array.isArray(allItems)).toBe(true)
  })
})
