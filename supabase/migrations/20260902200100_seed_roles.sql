-- Seed: funções (cargos) da empresa — independente de pessoas.
-- Nenhum colaborador, dentista, lead, tarefa ou script fictício é criado.
INSERT INTO public.roles (id, name, color, bg_light, text_color, border_color, description, sort_order, is_default)
VALUES
  ('11111111-1111-4111-8111-111111111101'::uuid, 'Gerência', '#0F766E', '#CCFBF1', '#0F766E', '#5EEAD4', 'Gestão estratégica, coordenação geral da clínica e tomadas de decisão.', 1, true),
  ('11111111-1111-4111-8111-111111111102'::uuid, 'Administrativo', '#0284C7', '#E0F2FE', '#0369A1', '#7DD3FC', 'Operações administrativas, cadastros, compras, contratos e suporte geral.', 2, true),
  ('11111111-1111-4111-8111-111111111103'::uuid, 'Concierge', '#D97706', '#FEF3C7', '#B45309', '#FCD34D', 'Recepção e acolhimento dos pacientes, experiência do paciente e encaminhamentos.', 3, true),
  ('11111111-1111-4111-8111-111111111104'::uuid, 'CRC', '#7C3AED', '#EDE9FE', '#6D28D9', '#C4B5FD', 'Consultor de Relacionamento com o Cliente — prospecção, qualificação, follow-up e fechamento de leads.', 4, true),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'ASB Principal I', '#059669', '#D1FAE5', '#047857', '#6EE7B7', 'Auxiliar de Saúde Bucal principal da cirurgia e implantes, esterilização crítica e biossegurança.', 5, true),
  ('11111111-1111-4111-8111-111111111106'::uuid, 'ASB Auxiliar', '#10B981', '#ECFDF5', '#065F46', '#A7F3D0', 'Auxílio em procedimentos gerais, reposição de materiais nos consultórios e desinfecção.', 6, true),
  ('11111111-1111-4111-8111-111111111107'::uuid, 'Avaliador', '#EA580C', '#FFEDD5', '#C2410C', '#FDBA74', 'Dentista responsável pelo primeiro diagnóstico, plano de tratamento integral e apresentação clínica.', 7, true),
  ('11111111-1111-4111-8111-111111111108'::uuid, 'Dentistas', '#4F46E5', '#E0E7FF', '#3730A3', '#A5B4FC', 'Corpo clínico de especialistas responsáveis pela execução dos tratamentos odontológicos.', 8, true)
ON CONFLICT (id) DO NOTHING;
