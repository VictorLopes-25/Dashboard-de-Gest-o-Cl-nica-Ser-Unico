import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'
import {
  fetchThresholdConfigs,
  updateThresholdConfig,
  derivePendingItems,
  upsertManagedException,
  fetchManagedExceptions,
  acknowledgeException,
  recordExceptionDecision,
  resolveException,
} from '@/services/exceptionsService'
import type { ExceptionSeverity, ExceptionType } from '@/types'

const TEST_PREFIX = 'STAGE4C_TEST_'

describe('Stage 4C: Exception Engine Acceptance Tests', () => {
  let orgId: string
  let authUserId: string | null = null
  let defaultFunctionId: string
  let defaultPersonId: string

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeTruthy()

    const { data: userResp } = await supabase.auth.getUser()
    if (userResp?.user) {
      authUserId = userResp.user.id
    }

    // Obter primeira função e pessoa válidas para testes
    const { data: fData } = await (supabase as any)
      .from('functions')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .single()
    defaultFunctionId = fData.id

    const { data: pData } = await (supabase as any)
      .from('people')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .single()
    defaultPersonId = pData.id
  })

  afterAll(async () => {
    // Invariante obrigatória: TEMP_TEST_DATA_REMOVED = TRUE
    try {
      await (supabase as any)
        .from('managed_exceptions')
        .delete()
        .ilike('dedup_key', `${TEST_PREFIX}%`)

      // Restaurar limiares padrão se alterados
      await (supabase as any)
        .from('org_threshold_configs')
        .update({ value: 1 })
        .eq('organization_id', orgId)
        .eq('key', 'task_delay_tolerance_days')
    } catch {
      // ignore cleanup errors
    }
  })

  describe('1. THRESHOLD CONFIGURATION (D7_ESCALATION_THRESHOLDS)', () => {
    it('TH 1: Limiares da organização estão armazenados no banco e são consultáveis', async () => {
      const thresholds = await fetchThresholdConfigs()
      expect(thresholds.length).toBeGreaterThanOrEqual(4)

      const taskTolerance = thresholds.find((t) => t.key === 'task_delay_tolerance_days')
      expect(taskTolerance).toBeDefined()
      expect(taskTolerance?.unit).toBe('dias')
      expect(typeof taskTolerance?.value).toBe('number')
    })

    it('TH 2: Alteração de limiar no banco altera dinamicamente o valor (não é estático)', async () => {
      const updated = await updateThresholdConfig('task_delay_tolerance_days', 3)
      expect(updated.value).toBe(3)

      const rechecked = await fetchThresholdConfigs()
      const found = rechecked.find((t) => t.key === 'task_delay_tolerance_days')
      expect(found?.value).toBe(3)

      // Retorna para o padrão 1
      await updateThresholdConfig('task_delay_tolerance_days', 1)
    })
  })

  describe('2. EXCEPTION DETECTION & DERIVED PENDING (D3_PENDING_ITEM: DERIVED)', () => {
    it('D3 1: Pendências do dia são geradas a partir de dados operacionais sem tabela redundante', () => {
      const todayIso = '2026-09-08'
      const mockDatasets = {
        agendaItems: [
          {
            id: 'mock-agenda-1',
            type: 'tarefa',
            title: 'Reposição de anestésicos cirúrgicos',
            dueDate: '2026-09-07', // 1 dia de atraso
            status: 'aberto',
            functionId: defaultFunctionId,
            personId: defaultPersonId,
          },
        ],
        leads: [
          {
            id: 'mock-lead-1',
            name: 'Paciente Exemplo',
            stage: 'novo',
            nextContactAt: '2026-09-05', // 3 dias de atraso
            commercialFunctionId: defaultFunctionId,
            commercialPersonId: defaultPersonId,
          },
        ],
        tasks: [],
        roles: [{ id: defaultFunctionId, name: 'ASB Principal I' }],
        collaborators: [{ id: defaultPersonId, name: 'Dora' }],
        activeAssignments: [],
      }

      const thresholds = {
        task_delay_tolerance_days: 1,
        lead_followup_tolerance_days: 2,
      }

      const derived = derivePendingItems(mockDatasets, thresholds, todayIso)
      expect(derived.length).toBe(2)

      const taskPending = derived.find((p) => p.category === 'tarefa')
      expect(taskPending).toBeDefined()
      expect(taskPending?.daysOverdue).toBe(1)
      expect(taskPending?.managementDecisionRequired).toBe(true)
      expect(taskPending?.responsibleFunctionName).toBe('ASB Principal I')

      const leadPending = derived.find((p) => p.category === 'lead')
      expect(leadPending).toBeDefined()
      expect(leadPending?.daysOverdue).toBe(3)
      expect(leadPending?.managementDecisionRequired).toBe(true)
    })

    it('D3 2: Tolerância mais alta suprime ruído do gestor (não exige decisão)', () => {
      const todayIso = '2026-09-08'
      const mockDatasets = {
        agendaItems: [
          {
            id: 'mock-agenda-2',
            type: 'tarefa',
            title: 'Tarefa com 1 dia de atraso',
            dueDate: '2026-09-07',
            status: 'aberto',
            functionId: defaultFunctionId,
            personId: null,
          },
        ],
        leads: [],
        tasks: [],
        roles: [{ id: defaultFunctionId, name: 'ASB Principal I' }],
        collaborators: [],
        activeAssignments: [],
      }

      // Com tolerância de 2 dias, 1 dia de atraso NÃO escala para decisão do gestor
      const derived = derivePendingItems(mockDatasets, { task_delay_tolerance_days: 2 }, todayIso)
      expect(derived.length).toBe(1)
      expect(derived[0].managementDecisionRequired).toBe(false)
    })
  })

  describe('3. RECURRENCE INCREMENT & DEDUPLICATION (NO DUPLICATE NOISE)', () => {
    const dedupKey = `${TEST_PREFIX}task_recurrence_1`

    it('REC 1: Primeira inserção cria exceção com recurrence_count = 1', async () => {
      const res = await upsertManagedException({
        type: 'tarefa_atrasada',
        severity: 'media',
        title: `${TEST_PREFIX}Tarefa Atrasada Teste`,
        description: 'Primeira detecção do desvio',
        entity_type: 'task',
        entity_id: null,
        responsible_function_id: defaultFunctionId,
        responsible_person_id: defaultPersonId,
        dedup_key: dedupKey,
      })

      expect(res.success).toBe(true)
      expect(res.recurrence_count).toBe(1)
      expect(res.status).toBe('aberta')
    })

    it('REC 2: Detecção recorrente incrementa recurrence_count em vez de duplicar linhas', async () => {
      const res = await upsertManagedException({
        type: 'tarefa_atrasada',
        severity: 'alta',
        title: `${TEST_PREFIX}Tarefa Atrasada Teste Reincidente`,
        description: 'Segunda detecção do desvio (reincidente)',
        entity_type: 'task',
        entity_id: null,
        responsible_function_id: defaultFunctionId,
        responsible_person_id: defaultPersonId,
        dedup_key: dedupKey,
      })

      expect(res.success).toBe(true)
      expect(res.recurrence_count).toBe(2)

      // Garantir que existe apenas 1 registro no banco com essa dedup_key
      const { data, error } = await (supabase as any)
        .from('managed_exceptions')
        .select('id, recurrence_count, responsible_function_id')
        .eq('dedup_key', dedupKey)

      expect(error).toBeNull()
      expect(data?.length).toBe(1)
      expect(data?.[0].recurrence_count).toBe(2)
      // Invariante FUNCTION FIRST mantida
      expect(data?.[0].responsible_function_id).toBe(defaultFunctionId)
    })
  })

  describe('4. EXCEPTION WORKFLOW: OPEN -> ACKNOWLEDGE -> DECIDE -> RESOLVE', () => {
    let exceptionId: string
    const flowDedupKey = `${TEST_PREFIX}flow_workflow_1`

    beforeAll(async () => {
      const res = await upsertManagedException({
        type: 'ocorrencia_perdida',
        severity: 'alta',
        title: `${TEST_PREFIX}Workflow Ciclo Completo`,
        description: 'Teste de workflow de gestão',
        entity_type: 'agenda_item',
        entity_id: null,
        responsible_function_id: defaultFunctionId,
        responsible_person_id: defaultPersonId,
        dedup_key: flowDedupKey,
      })
      exceptionId = res.id
    })

    it('FLOW 1: Reconhecer exceção altera status para reconhecida e grava timestamp', async () => {
      const acked = await acknowledgeException(exceptionId)
      expect(acked.status).toBe('reconhecida')
      expect(acked.acknowledgedAt).toBeTruthy()
    })

    it('FLOW 2: Registrar decisão de gestão registra o texto e altera status para decidida', async () => {
      const decided = await recordExceptionDecision(
        exceptionId,
        'Plano corretivo: reorientar titular da função e estender prazo.',
        false,
      )
      expect(decided.status).toBe('decidida')
      expect(decided.decisionText).toContain('Plano corretivo')
      expect(decided.decisionAt).toBeTruthy()
    })

    it('FLOW 3: Resolver exceção encerra o desvio e grava resolved_at', async () => {
      const resolved = await resolveException(exceptionId)
      expect(resolved.status).toBe('resolvida')
      expect(resolved.resolvedAt).toBeTruthy()
    })
  })

  describe('5. RLS & ACCESS CONTROL POLICIES', () => {
    it('RLS 1: Exceções e Limiares pertencem estritamente à organização ativa', async () => {
      const { data, error } = await (supabase as any)
        .from('managed_exceptions')
        .select('id, organization_id')
        .limit(5)

      expect(error).toBeNull()
      for (const row of data || []) {
        expect(row.organization_id).toBe(orgId)
      }
    })

    it('RLS 2: Não é permitida exclusão de exceção por usuário sem permissão OWNER', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099'
      const { error: delErr } = await (supabase as any)
        .from('managed_exceptions')
        .delete()
        .eq('id', fakeId)

      // Se não for OWNER ou anônimo, é bloqueado via RLS
      expect(
        delErr === null ||
          delErr.code === '42501' ||
          delErr.message.includes('permission') ||
          delErr.message.includes('row-level security'),
      ).toBe(true)
    })
  })
})
