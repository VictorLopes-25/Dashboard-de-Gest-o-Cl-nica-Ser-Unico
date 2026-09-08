import { describe, it, expect, beforeAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import { computeCadenceSummary, recordCadenceDailyLog } from '@/services/cadenceService'
import { derivePendingItems, fetchThresholdConfigs } from '@/services/exceptionsService'

describe('Stage 4D & 4E: Homes e Cadência Recorrente por Função', () => {
  let orgId: string

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeDefined()
  })

  it('calcula o resumo de cadência por função (esperado vs realizado) sem erros', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const summaries = await computeCadenceSummary(today)

    expect(Array.isArray(summaries)).toBe(true)
    expect(summaries.length).toBeGreaterThan(0)

    for (const summary of summaries) {
      expect(summary.functionId).toBeDefined()
      expect(summary.functionName).toBeDefined()
      expect(typeof summary.expectedRoutinesCount).toBe('number')
      expect(typeof summary.completedRoutinesCount).toBe('number')
      expect(typeof summary.hasDeviation).toBe('boolean')
      expect(Array.isArray(summary.routines)).toBe(true)
    }
  })

  it('permite registrar log de cadência diária com upsert idempotente no Supabase', async () => {
    // Buscar uma função ativa
    const { data: funcs } = await supabase
      .from('functions')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)

    expect(funcs && funcs.length > 0).toBe(true)
    const targetFuncId = funcs![0].id
    const targetDate = '2026-09-08'

    const log = await recordCadenceDailyLog({
      functionId: targetFuncId,
      date: targetDate,
      expectedCount: 5,
      completedCount: 4,
      notes: 'Teste de aceitação de cadência operacional',
    })

    expect(log.id).toBeDefined()
    expect(log.functionId).toBe(targetFuncId)
    expect(log.expectedCount).toBe(5)
    expect(log.completedCount).toBe(4)
    expect(log.adherencePct).toBe(80)

    // Upsert no mesmo dia deve atualizar sem duplicar
    const updatedLog = await recordCadenceDailyLog({
      functionId: targetFuncId,
      date: targetDate,
      expectedCount: 5,
      completedCount: 5,
      notes: 'Cadência atualizada com 100% de conclusão',
    })

    expect(updatedLog.id).toBe(log.id)
    expect(updatedLog.completedCount).toBe(5)
    expect(updatedLog.adherencePct).toBe(100)
  })

  it('alimenta o Exception Engine quando há quebra de cadência acumulada por função', async () => {
    const thresholdConfigs = await fetchThresholdConfigs()
    const thresholds: Record<string, number> = {}
    for (const c of thresholdConfigs) {
      thresholds[c.key] = Number(c.value)
    }
    const today = new Date().toISOString().slice(0, 10)

    // Criar simulação com 4 itens atrasados da mesma função
    const fakeAgendaItems: any[] = [
      {
        id: 'mock-cad-1',
        type: 'tarefa',
        title: 'Rotina Atrasada 1',
        dueDate: '2026-09-01',
        status: 'aberto',
        functionId: 'func-fake-cadence',
      },
      {
        id: 'mock-cad-2',
        type: 'tarefa',
        title: 'Rotina Atrasada 2',
        dueDate: '2026-09-02',
        status: 'aberto',
        functionId: 'func-fake-cadence',
      },
      {
        id: 'mock-cad-3',
        type: 'tarefa',
        title: 'Rotina Atrasada 3',
        dueDate: '2026-09-03',
        status: 'aberto',
        functionId: 'func-fake-cadence',
      },
    ]

    const datasets: any = {
      agendaItems: fakeAgendaItems,
      leads: [],
      tasks: [],
      roles: [{ id: 'func-fake-cadence', name: 'CRC Comercial' }],
      collaborators: [],
    }

    const derived = derivePendingItems(datasets, thresholds, today)

    // Deve derivar tanto as tarefas individuais atrasadas quanto o desvio de cadência agrupado
    const cadenceBreak = derived.find((d) => d.id === 'pending-cadence-failure-func-fake-cadence')
    expect(cadenceBreak).toBeDefined()
    expect(cadenceBreak?.responsibleFunctionName).toBe('CRC Comercial')
    expect(cadenceBreak?.managementDecisionRequired).toBe(true)
  })
})
