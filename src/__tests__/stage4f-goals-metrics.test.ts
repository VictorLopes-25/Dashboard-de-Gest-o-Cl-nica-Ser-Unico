import { describe, it, expect, beforeEach } from 'vitest'
import {
  SUPPORTED_METRICS,
  PERIOD_TYPE_LABELS,
  deriveGoalMetricClientSide,
  enrichGoalForUi,
  checkGoalDeviationEscalationHook,
  type DbGoal,
} from '../services/goalsService'
import type { AgendaItem, Lead, Role, Collaborator } from '../types'

describe('Stage 4F: Metas e Indicadores (Goals & Metrics)', () => {
  const dummyFunctionId = 'func-crc-123'
  const dummyOrgId = 'org-ser-unico'

  const baseDbGoal: DbGoal = {
    id: 'goal-1',
    organization_id: dummyOrgId,
    responsible_function_id: dummyFunctionId,
    metric: 'tasks_completed',
    metric_label: 'Tarefas concluídas',
    target: 10,
    period_type: 'monthly',
    period_start: '2026-04-01',
    period_end: '2026-04-30',
    status: 'active',
    created_by: 'person-owner-1',
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  }

  const sampleRoles: Role[] = [
    {
      id: dummyFunctionId,
      name: 'CRC Comercial',
      color: '#0F766E',
      description: 'Central de Relacionamento',
    },
    {
      id: 'func-dentistas',
      name: 'Dentistas',
      color: '#2563EB',
      description: 'Corpo Clínico',
    },
  ]

  const sampleCollaborators: Collaborator[] = [
    {
      id: 'person-owner-1',
      name: 'Dra. Luiza (Diretora)',
      email: 'luiza@serunico.com.br',
      phone: '11999999999',
      roleIds: [dummyFunctionId],
      isActive: true,
    },
  ]

  it('deve ter os 9 indicadores suportados com unidades e fontes de evidência claras em pt-BR', () => {
    expect(SUPPORTED_METRICS.length).toBe(9)
    const keys = SUPPORTED_METRICS.map((m) => m.key)
    expect(keys).toContain('tasks_completed')
    expect(keys).toContain('tasks_overdue')
    expect(keys).toContain('routine_adherence')
    expect(keys).toContain('exceptions_generated')
    expect(keys).toContain('exceptions_resolved')
    expect(keys).toContain('followups_executed')
    expect(keys).toContain('followups_overdue')
    expect(keys).toContain('management_actions_completed')
    expect(keys).toContain('management_actions_overdue')

    for (const m of SUPPORTED_METRICS) {
      expect(m.label).toBeTruthy()
      expect(m.unit).toBeTruthy()
      expect(m.evidenceSource).toBeTruthy()
      // Não deve conter enums técnicos na descrição/label
      expect(m.label).not.toContain('_')
    }
  })

  it('deve calcular corretamente tasks_completed via fallback client-side a partir de agendaItems', () => {
    const agendaItems: AgendaItem[] = [
      {
        id: 'task-1',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Confirmar consultas do dia seguinte',
        dueDate: '2026-04-10',
        completedAt: '2026-04-10T11:00:00Z',
        status: 'concluido',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'task-2',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Follow-up de orçamentos',
        dueDate: '2026-04-15',
        completedAt: '2026-04-15T15:00:00Z',
        status: 'concluido',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'task-3',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Tarefa aberta ainda',
        dueDate: '2026-04-20',
        status: 'aberto',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'task-out-period',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Tarefa de outro mês',
        dueDate: '2026-05-02',
        completedAt: '2026-05-02T10:00:00Z',
        status: 'concluido',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'task-other-func',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Tarefa de outra função',
        dueDate: '2026-04-10',
        completedAt: '2026-04-10T12:00:00Z',
        status: 'concluido',
        functionId: 'other-func',
        type: 'tarefa',
      },
    ]

    const result = deriveGoalMetricClientSide(baseDbGoal, { agendaItems })
    expect(result.actual).toBe(2)
    expect(result.evidenceSource).toContain('agenda')
  })

  it('deve calcular tarefas em atraso (tasks_overdue) respeitando data de corte', () => {
    const overdueGoal: DbGoal = {
      ...baseDbGoal,
      metric: 'tasks_overdue',
      metric_label: 'Tarefas em atraso',
      target: 0,
    }

    const agendaItems: AgendaItem[] = [
      {
        id: 'item-overdue',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Verificar prontuários',
        dueDate: '2026-04-05',
        status: 'aberto',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'item-future',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Envio de relatórios',
        dueDate: '2026-04-25',
        status: 'aberto',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
    ]

    // Simulando que "hoje" é 2026-04-15
    const result = deriveGoalMetricClientSide(overdueGoal, { agendaItems }, '2026-04-15')
    expect(result.actual).toBe(1)
  })

  it('deve calcular aderência às rotinas (routine_adherence) como percentual', () => {
    const adherenceGoal: DbGoal = {
      ...baseDbGoal,
      metric: 'routine_adherence',
      metric_label: 'Aderência às rotinas',
      target: 90,
    }

    const agendaItems: AgendaItem[] = [
      {
        id: 'it-1',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Rotina 1',
        dueDate: '2026-04-05',
        status: 'concluido',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'it-2',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Rotina 2',
        dueDate: '2026-04-06',
        status: 'concluido',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'it-3',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Rotina 3',
        dueDate: '2026-04-07',
        status: 'aberto',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
      {
        id: 'it-4',
        organizationId: dummyOrgId,
        createdAt: '2026-04-01T00:00:00Z',
        title: 'Rotina 4',
        dueDate: '2026-04-08',
        status: 'aberto',
        functionId: dummyFunctionId,
        type: 'tarefa',
      },
    ]

    const result = deriveGoalMetricClientSide(adherenceGoal, { agendaItems })
    // 2 concluidas de 4 = 50%
    expect(result.actual).toBe(50)
  })

  it('deve enriquecer a meta para UI com badges em pt-BR e cálculo de progresso', () => {
    const enriched = enrichGoalForUi(
      baseDbGoal,
      {
        goal_id: baseDbGoal.id,
        metric: 'tasks_completed',
        target: 10,
        actual: 8,
        evidence_source: 'Banco de dados da clínica',
        period_start: '2026-04-01',
        period_end: '2026-04-30',
        period_type: 'monthly',
        status: 'active',
      },
      {
        roles: sampleRoles,
        collaborators: sampleCollaborators,
      },
    )

    expect(enriched.responsibleFunctionName).toBe('CRC Comercial')
    expect(enriched.actual).toBe(8)
    expect(enriched.target).toBe(10)
    expect(enriched.adherencePct).toBe(80)
    expect(enriched.statusBadge).toBe('below') // 8 < 10
    expect(enriched.isMultiMember).toBe(false)
  })

  it('deve marcar agregação multi-membro para a função Dentistas', () => {
    const dentistGoal: DbGoal = {
      ...baseDbGoal,
      id: 'goal-dentistas',
      responsible_function_id: 'func-dentistas',
      metric: 'tasks_completed',
      metric_label: 'Tarefas clínicas',
      target: 50,
    }

    const activeAssignments = [
      { function_id: 'func-dentistas', person_id: 'dentist-1' },
      { function_id: 'func-dentistas', person_id: 'dentist-2' },
      { function_id: 'func-dentistas', person_id: 'dentist-3' },
    ]

    const enriched = enrichGoalForUi(
      dentistGoal,
      {
        goal_id: dentistGoal.id,
        metric: 'tasks_completed',
        target: 50,
        actual: 55,
        evidence_source: 'Agenda clínica',
        period_start: '2026-04-01',
        period_end: '2026-04-30',
        period_type: 'monthly',
        status: 'active',
      },
      {
        roles: sampleRoles,
        collaborators: sampleCollaborators,
        activeAssignments,
      },
    )

    expect(enriched.responsibleFunctionName).toBe('Dentistas')
    expect(enriched.isMultiMember).toBe(true)
    expect(enriched.activeMembersCount).toBe(3)
    expect(enriched.statusBadge).toBe('within') // 55 >= 50
    expect(enriched.adherencePct).toBe(110)
  })

  it('deve respeitar o Princípio 5: hook point do Exception Engine NÃO escala desvios automaticamente', () => {
    const enrichedBelow = enrichGoalForUi(
      baseDbGoal,
      {
        goal_id: baseDbGoal.id,
        metric: 'tasks_completed',
        target: 100,
        actual: 40,
        evidence_source: 'Agenda',
        period_start: '2026-04-01',
        period_end: '2026-04-30',
        period_type: 'monthly',
        status: 'active',
      },
      {
        roles: sampleRoles,
        collaborators: sampleCollaborators,
      },
    )

    expect(enrichedBelow.statusBadge).toBe('below')

    const escalation = checkGoalDeviationEscalationHook(enrichedBelow)
    // Invariante de produto: não auto-cria exceção para não inundar o gestor com ruído
    expect(escalation.shouldEscalate).toBe(false)
    expect(escalation.reason).toContain('CRC Comercial')
  })
})
