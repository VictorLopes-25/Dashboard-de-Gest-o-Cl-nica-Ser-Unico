// Configuração e mapeamento humanizado pt-BR para regras de gestão
// Sem termos técnicos, sem identifiers de banco de dados expostos.

export interface ThresholdHumanConfig {
  key: string
  label: string
  description: string
  unitLabel: (val: number) => string
  example: string
}

export const THRESHOLD_LABELS: Record<string, ThresholdHumanConfig> = {
  task_delay_tolerance_days: {
    key: 'task_delay_tolerance_days',
    label: 'Tolerância para tarefa atrasada',
    description: 'Dias de atraso tolerados antes de exigir intervenção da gerência',
    unitLabel: (val) => (val === 1 ? 'dia' : 'dias'),
    example: 'Ex.: 1 dia',
  },
  lead_followup_tolerance_days: {
    key: 'lead_followup_tolerance_days',
    label: 'Tolerância de follow-up de lead',
    description: 'Dias de atraso tolerados após a data prevista de contato com o paciente/lead',
    unitLabel: (val) => (val === 1 ? 'dia' : 'dias'),
    example: 'Ex.: 2 dias',
  },
  repeated_failure_count: {
    key: 'repeated_failure_count',
    label: 'Limite de reincidência',
    description: 'Número de pendências não resolvidas de uma mesma função que dispara alerta',
    unitLabel: (val) => (val === 1 ? 'ocorrência' : 'ocorrências'),
    example: 'Ex.: 3 ocorrências',
  },
  exception_escalation_sla_hours: {
    key: 'exception_escalation_sla_hours',
    label: 'Prazo para escalonamento',
    description: 'Tempo máximo para o gestor avaliar ou definir uma ação sobre uma situação',
    unitLabel: (val) => (val === 1 ? 'hora' : 'horas'),
    example: 'Ex.: 24 horas',
  },
  near_expiration_window_days: {
    key: 'near_expiration_window_days',
    label: 'Aviso prévio de vencimento',
    description: 'Janela de dias para antecipar alertas de tarefas ou prazos iminentes',
    unitLabel: (val) => (val === 1 ? 'dia' : 'dias'),
    example: 'Ex.: 1 dia',
  },
  critical_stock_threshold: {
    key: 'critical_stock_threshold',
    label: 'Estoque crítico a partir de',
    description: 'Quantidade mínima de itens de material antes de alertar a gerência',
    unitLabel: (val) => (val === 1 ? 'unidade' : 'unidades'),
    example: 'Ex.: 5 unidades',
  },
}

export function getHumanThresholdInfo(key: string): ThresholdHumanConfig {
  if (THRESHOLD_LABELS[key]) {
    return THRESHOLD_LABELS[key]
  }
  const humanized = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  return {
    key,
    label: humanized,
    description: 'Regra de acompanhamento operacional da clínica',
    unitLabel: () => '',
    example: '',
  }
}
