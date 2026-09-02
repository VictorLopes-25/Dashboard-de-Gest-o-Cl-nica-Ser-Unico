import { Role, Task, Lead, Script, Collaborator, Dentist, ContactHistoryItem } from '@/types'

// Format YYYY-MM-DD
export function getTodayDateString(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-gerencia',
    name: 'Gerência',
    color: '#0F766E', // Teal 700
    bgLight: '#CCFBF1',
    textColor: '#0F766E',
    borderColor: '#5EEAD4',
    description: 'Gestão estratégica, coordenação geral da clínica e tomadas de decisão.',
    isDefault: true,
  },
  {
    id: 'role-admin',
    name: 'Administrativo',
    color: '#0284C7', // Sky 600
    bgLight: '#E0F2FE',
    textColor: '#0369A1',
    borderColor: '#7DD3FC',
    description: 'Operações administrativas, cadastros, compras, contratos e suporte geral.',
    isDefault: true,
  },
  {
    id: 'role-concierge',
    name: 'Concierge',
    color: '#D97706', // Amber 600
    bgLight: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FCD34D',
    description: 'Recepção e acolhimento dos pacientes, experiência do paciente e encaminhamentos.',
    isDefault: true,
  },
  {
    id: 'role-crc',
    name: 'CRC',
    color: '#7C3AED', // Violet 600
    bgLight: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#C4B5FD',
    description:
      'Consultor de Relacionamento com o Cliente — prospecção, qualificação, follow-up e fechamento de leads.',
    isDefault: true,
  },
  {
    id: 'role-asb-principal-1',
    name: 'ASB Principal I',
    color: '#059669', // Emerald 600
    bgLight: '#D1FAE5',
    textColor: '#047857',
    borderColor: '#6EE7B7',
    description:
      'Auxiliar de Saúde Bucal principal da cirurgia e implantes, esterilização crítica e biossegurança.',
    isDefault: true,
  },
  {
    id: 'role-asb-auxiliar',
    name: 'ASB Auxiliar',
    color: '#10B981', // Emerald 500
    bgLight: '#ECFDF5',
    textColor: '#065F46',
    borderColor: '#A7F3D0',
    description:
      'Auxílio em procedimentos gerais, reposição de materiais nos consultórios e desinfecção.',
    isDefault: true,
  },
  {
    id: 'role-avaliador',
    name: 'Avaliador',
    color: '#EA580C', // Orange 600
    bgLight: '#FFEDD5',
    textColor: '#C2410C',
    borderColor: '#FDBA74',
    description:
      'Dentista responsável pelo primeiro diagnóstico, plano de tratamento integral e apresentação clínica.',
    isDefault: true,
  },
  {
    id: 'role-dentistas',
    name: 'Dentistas',
    color: '#4F46E5', // Indigo 600
    bgLight: '#E0E7FF',
    textColor: '#3730A3',
    borderColor: '#A5B4FC',
    description:
      'Corpo clínico de especialistas responsáveis pela execução dos tratamentos odontológicos.',
    isDefault: true,
  },
]

export const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    id: 'colab-paula',
    name: 'Paula Rocha',
    phone: '(11) 98765-4321',
    email: 'paula.rocha@serunico.com.br',
    roleIds: ['role-crc', 'role-concierge'],
    isActive: true,
  },
  {
    id: 'colab-marcos',
    name: 'Marcos Silveira',
    phone: '(11) 99123-4567',
    email: 'marcos.silveira@serunico.com.br',
    roleIds: ['role-gerencia'],
    isActive: true,
  },
  {
    id: 'colab-camila',
    name: 'Camila Albuquerque',
    phone: '(11) 97654-3210',
    email: 'camila.albuquerque@serunico.com.br',
    roleIds: ['role-admin', 'role-concierge'],
    isActive: true,
  },
  {
    id: 'colab-beatriz',
    name: 'Beatriz Lima',
    phone: '(11) 98111-2233',
    email: 'beatriz.lima@serunico.com.br',
    roleIds: ['role-asb-principal-1'],
    isActive: true,
  },
  {
    id: 'colab-lucas',
    name: 'Lucas Ferreira',
    phone: '(11) 98222-3344',
    email: 'lucas.ferreira@serunico.com.br',
    roleIds: ['role-asb-auxiliar'],
    isActive: true,
  },
]

export const INITIAL_DENTISTS: Dentist[] = [
  {
    id: 'dentist-dr-rodrigo',
    name: 'Dr. Rodrigo Mendes',
    cro: 'CRO-SP 104.582',
    phone: '(11) 98555-1234',
    specialties: ['Implantodontia', 'Prótese', 'Cirurgia'],
    isActive: true,
  },
  {
    id: 'dentist-dra-juliana',
    name: 'Dra. Juliana Vasconcelos',
    cro: 'CRO-SP 112.490',
    phone: '(11) 98444-5678',
    specialties: ['Ortodontia', 'Clareamento'],
    isActive: true,
  },
  {
    id: 'dentist-dr-felipe',
    name: 'Dr. Felipe Antunes',
    cro: 'CRO-SP 98.341',
    phone: '(11) 98333-9012',
    specialties: ['Dentística', 'Lentes de contato' as any, 'Clareamento'],
    isActive: true,
  },
  {
    id: 'dentist-dra-clarice',
    name: 'Dra. Clarice Prado',
    cro: 'CRO-SP 120.315',
    phone: '(11) 98222-7890',
    specialties: ['Endodontia', 'Odontopediatria'],
    isActive: true,
  },
]

export const INITIAL_TASKS: Task[] = [
  // CRC Tasks
  {
    id: 'task-crc-1',
    title: 'Follow-up dos leads recebidos via Instagram e WhatsApp nas últimas 24h',
    roleId: 'role-crc',
    status: 'Pendente',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-paula',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  {
    id: 'task-crc-2',
    title: 'Confirmar presença dos pacientes com avaliação agendada para amanhã',
    roleId: 'role-crc',
    status: 'Concluída',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-paula',
    dueDate: getTodayDateString(0),
    completedAt: new Date().toISOString(),
    createdAt: getTodayDateString(-1),
  },
  {
    id: 'task-crc-3',
    title: 'Recontatar leads em proposta parada há mais de 5 dias',
    roleId: 'role-crc',
    status: 'Em andamento',
    recurrence: 'Semanal',
    assignedCollaboratorId: 'colab-paula',
    dueDate: getTodayDateString(1),
    createdAt: getTodayDateString(-2),
  },
  // Gerência Tasks
  {
    id: 'task-ger-1',
    title: 'Alinhamento semanal de metas de conversão de novos tratamentos',
    roleId: 'role-gerencia',
    status: 'Pendente',
    recurrence: 'Semanal',
    assignedCollaboratorId: 'colab-marcos',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-3),
  },
  {
    id: 'task-ger-2',
    title: 'Auditoria dos indicadores de fechamento de propostas da semana',
    roleId: 'role-gerencia',
    status: 'Concluída',
    recurrence: 'Semanal',
    assignedCollaboratorId: 'colab-marcos',
    dueDate: getTodayDateString(0),
    completedAt: new Date().toISOString(),
    createdAt: getTodayDateString(-4),
  },
  {
    id: 'task-ger-3',
    title: 'Revisão dos scripts de atendimento e padronização da equipe CRC',
    roleId: 'role-gerencia',
    status: 'Pendente',
    recurrence: 'Mensal',
    assignedCollaboratorId: 'colab-marcos',
    dueDate: getTodayDateString(-1), // Atrasada para teste visual
    createdAt: getTodayDateString(-5),
  },
  // Concierge Tasks
  {
    id: 'task-conc-1',
    title: 'Preparação do lounge de acolhimento (café especial, aromaterapia e playlists)',
    roleId: 'role-concierge',
    status: 'Concluída',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-camila',
    dueDate: getTodayDateString(0),
    completedAt: new Date().toISOString(),
    createdAt: getTodayDateString(-1),
  },
  {
    id: 'task-conc-2',
    title: 'Acolhimento VIP e entrega do kit de boas-vindas aos novos pacientes do dia',
    roleId: 'role-concierge',
    status: 'Pendente',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-camila',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  // Administrativo Tasks
  {
    id: 'task-adm-1',
    title: 'Conferência dos contratos digitais e termos de consentimento assinados',
    roleId: 'role-admin',
    status: 'Pendente',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-camila',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  {
    id: 'task-adm-2',
    title: 'Auditoria de cadastros de colaboradores e vinculação de funções',
    roleId: 'role-admin',
    status: 'Pendente',
    recurrence: 'Mensal',
    dueDate: getTodayDateString(3),
    createdAt: getTodayDateString(-2),
  },
  // ASB Principal I Tasks
  {
    id: 'task-asb1-1',
    title: 'Ciclo diário de autoclave, testes biológicos e controle de rastreabilidade',
    roleId: 'role-asb-principal-1',
    status: 'Concluída',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-beatriz',
    dueDate: getTodayDateString(0),
    completedAt: new Date().toISOString(),
    createdAt: getTodayDateString(-1),
  },
  {
    id: 'task-asb1-2',
    title: 'Montagem e checagem de caixas cirúrgicas de implantes para o período da tarde',
    roleId: 'role-asb-principal-1',
    status: 'Pendente',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-beatriz',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  // ASB Auxiliar Tasks
  {
    id: 'task-asba-1',
    title: 'Reposição de EPIs, descartáveis e anestésicos nos consultórios 1, 2 e 3',
    roleId: 'role-asb-auxiliar',
    status: 'Pendente',
    recurrence: 'Diária',
    assignedCollaboratorId: 'colab-lucas',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  // Avaliador Tasks
  {
    id: 'task-aval-1',
    title: 'Revisão dos planos de tratamento multidisciplinares pendentes de aprovação',
    roleId: 'role-avaliador',
    status: 'Pendente',
    recurrence: 'Diária',
    dueDate: getTodayDateString(0),
    createdAt: getTodayDateString(-1),
  },
  // Dentistas Tasks
  {
    id: 'task-dent-1',
    title: 'Alinhamento com CRC sobre propostas clínicas de implantes e facetas apresentadas',
    roleId: 'role-dentistas',
    status: 'Pendente',
    recurrence: 'Semanal',
    dueDate: getTodayDateString(1),
    createdAt: getTodayDateString(-2),
  },
]

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Maria Helena Silveira',
    phone: '(11) 99876-5432',
    origin: 'Instagram',
    interest: 'Implantes',
    stage: 'Novo',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Enviar mensagem de primeiro acolhimento via WhatsApp com apresentação',
    followUpDate: getTodayDateString(0),
    notes: 'Interessada em implante protocolo superior. Viu anúncio sobre dentes fixos.',
    createdAt: getTodayDateString(-1),
    updatedAt: getTodayDateString(0),
  },
  {
    id: 'lead-2',
    name: 'Carlos Eduardo Nogueira',
    phone: '(11) 98123-4567',
    origin: 'Google',
    interest: 'Lentes de contato',
    stage: 'Em Contato',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Confirmar horário preferencial para consulta de avaliação estética',
    followUpDate: getTodayDateString(0),
    notes: 'Busca alinhamento estético e fechamento de diastema com facetas de porcelana.',
    createdAt: getTodayDateString(-3),
    updatedAt: getTodayDateString(-1),
  },
  {
    id: 'lead-3',
    name: 'Fernanda Bastos',
    phone: '(11) 97234-5678',
    origin: 'Indicação',
    interest: 'Aparelho',
    stage: 'Avaliação',
    assignedToId: 'dentist-dra-juliana',
    assignedToName: 'Dra. Juliana Vasconcelos',
    assignedToRole: 'Dentistas',
    nextAction: 'Analisar documentação ortodôntica e preparar planejamento de alinhador',
    followUpDate: getTodayDateString(1),
    notes: 'Indicada pela paciente Marcela. Deseja saber mais sobre alinhadores invisíveis.',
    createdAt: getTodayDateString(-5),
    updatedAt: getTodayDateString(-2),
  },
  {
    id: 'lead-4',
    name: 'Roberto Guimarães',
    phone: '(11) 99345-6789',
    origin: 'WhatsApp',
    interest: 'Implantes',
    stage: 'Proposta',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Follow-up de negociação da proposta de implante duplo',
    followUpDate: getTodayDateString(0),
    notes: 'Proposta de R$ 14.800 apresentada. Avaliando condições de parcelamento.',
    createdAt: getTodayDateString(-7),
    updatedAt: getTodayDateString(-1),
  },
  {
    id: 'lead-5',
    name: 'Juliana Paes Correia',
    phone: '(11) 98456-7890',
    origin: 'Site',
    interest: 'Clareamento',
    stage: 'Fechado',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Acompanhar agendamento da 1ª sessão de clareamento a laser',
    followUpDate: getTodayDateString(2),
    notes: 'Tratamento fechado com sucesso. Protocolo combinado: laser + caseiro.',
    createdAt: getTodayDateString(-10),
    updatedAt: getTodayDateString(-1),
  },
  {
    id: 'lead-6',
    name: 'Ricardo Vasconcelos',
    phone: '(11) 97567-8901',
    origin: 'Facebook',
    interest: 'Prótese',
    stage: 'Perdido',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    lossReason: 'Preço',
    lossNotes: 'Paciente optou por clínica de bairro com orçamento menor.',
    nextAction: 'Recontatar em 90 dias com nova campanha promocional',
    followUpDate: getTodayDateString(90),
    notes: 'Achou o valor acima da expectativa inicial.',
    createdAt: getTodayDateString(-14),
    updatedAt: getTodayDateString(-5),
  },
  {
    id: 'lead-7',
    name: 'Camila Mendonça',
    phone: '(11) 99678-9012',
    origin: 'Instagram',
    interest: 'Aparelho',
    stage: 'Novo',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Ligar para entender queixa principal e apresentar opções de alinhador',
    followUpDate: getTodayDateString(-1), // Atrasado para demonstrar alerta vermelho
    notes: 'Preencheu formulário de interesse em Invisalign.',
    createdAt: getTodayDateString(-2),
    updatedAt: getTodayDateString(-2),
  },
  {
    id: 'lead-8',
    name: 'Thiago Martins',
    phone: '(11) 98789-0123',
    origin: 'Google',
    interest: 'Implantes',
    stage: 'Em Contato',
    assignedToId: 'colab-paula',
    assignedToName: 'Paula Rocha',
    assignedToRole: 'CRC',
    nextAction: 'Aguardando retorno do paciente com horário para avaliação',
    followUpDate: getTodayDateString(1),
    notes: 'Gostou das explicações sobre sedação consciente.',
    createdAt: getTodayDateString(-3),
    updatedAt: getTodayDateString(-1),
  },
]

export const INITIAL_SCRIPTS: Script[] = [
  {
    id: 'script-1',
    title: '1º Contato WhatsApp — Novo Lead (Boas-vindas e Acolhimento)',
    stage: 'Novo',
    content: `Olá, [Nome do Paciente]! Tudo bem com você? 😊

Aqui é a Paula da Clínica Ser Único! Vi que você demonstrou interesse em transformar seu sorriso com [Interesse/Tratamento].

Aqui na Ser Único nós unimos tecnologia de ponta, conforto absoluto e um atendimento humanizado para planejar o tratamento perfeito para o seu rosto e saúde.

Como você prefere que a gente converse: por aqui ou posso te ligar rapidinho para tirar suas dúvidas?`,
    updatedAt: getTodayDateString(-2),
  },
  {
    id: 'script-2',
    title: 'Qualificação e Agendamento de Avaliação',
    stage: 'Em Contato',
    content: `Que ótimo, [Nome do Paciente]!

Nossa consulta de avaliação é completa: fazemos o escaneamento digital do seu sorriso, fotos em alta resolução e o Dr. Especialista desenha na hora uma prévia do seu resultado.

Tenho dois horários especiais nesta semana:
Opção 1: [Data e Hora 1]
Opção 2: [Data e Hora 2]

Qual desses se encaixa melhor na sua rotina?`,
    updatedAt: getTodayDateString(-3),
  },
  {
    id: 'script-3',
    title: 'Confirmação e Preparação para Consulta de Avaliação',
    stage: 'Avaliação',
    content: `Olá, [Nome do Paciente]!

Confirmando sua consulta de avaliação com a nossa equipe amanhã às [Horário] aqui na Ser Único.

📍 Nosso endereço: Av. Paulista, 1000 - 12º andar (com estacionamento no local).
☕ Chegue 10 minutinhos antes para desfrutar de um café exclusivo no nosso lounge do Concierge!

Podemos confirmar sua presença?`,
    updatedAt: getTodayDateString(-4),
  },
  {
    id: 'script-4',
    title: 'Follow-up de Proposta Clínica e Condições de Pagamento',
    stage: 'Proposta',
    content: `Olá, [Nome do Paciente]! Como você está?

Passando para saber se você conseguiu analisar o planejamento do seu tratamento que o doutor apresentou!

Conversei com a gerência e conseguimos uma condição muito flexível no parcelamento para você iniciar o tratamento ainda este mês sem pesar no seu orçamento.

Podemos marcar 5 minutinhos para eu te apresentar essa facilidade?`,
    updatedAt: getTodayDateString(-5),
  },
  {
    id: 'script-5',
    title: 'Boas-vindas ao Paciente Fechado e Próximos Passos',
    stage: 'Fechado',
    content: `Parabéns pela decisão, [Nome do Paciente]! 🎉

Estamos muito felizes em fazer parte dessa transformação do seu sorriso na Ser Único.

Nossa equipe do Concierge e os ASBs já deixaram tudo preparado para sua primeira sessão. Qualquer dúvida, estou 100% à sua disposição por aqui!`,
    updatedAt: getTodayDateString(-6),
  },
]

export const INITIAL_CONTACT_HISTORY: ContactHistoryItem[] = [
  {
    id: 'hist-1',
    leadId: 'lead-1',
    type: 'WhatsApp',
    date: `${getTodayDateString(-1)} 14:30`,
    summary:
      'Envio de mensagem de primeiro contato com script de acolhimento. Paciente visualizou.',
    scriptTitleUsed: '1º Contato WhatsApp — Novo Lead (Boas-vindas e Acolhimento)',
    registeredBy: 'Paula Rocha',
  },
  {
    id: 'hist-2',
    leadId: 'lead-2',
    type: 'Ligação',
    date: `${getTodayDateString(-2)} 10:15`,
    summary:
      'Conversa telefônica de 6 minutos. Paciente tirou dúvidas sobre facetas e durabilidade. Ficou de confirmar dia da avaliação.',
    registeredBy: 'Paula Rocha',
  },
  {
    id: 'hist-3',
    leadId: 'lead-4',
    type: 'Presencial',
    date: `${getTodayDateString(-1)} 16:00`,
    summary:
      'Apresentação detalhada da proposta comercial de implante. Paciente pediu para conversar com a esposa sobre as parcelas.',
    scriptTitleUsed: 'Follow-up de Proposta Clínica e Condições de Pagamento',
    registeredBy: 'Paula Rocha',
  },
]
