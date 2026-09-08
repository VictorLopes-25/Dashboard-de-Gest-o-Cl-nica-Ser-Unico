-- Migration: 20260908200000_stage_4d_4e_cadence_homes.sql
-- Stage 4D (Role Homes) & Stage 4E (Cadence/Routines & Daily Occurrences)
-- Idempotente, RLS ativado, deny-by-default, function-first, auditável.

-- 1. Ampliar tasks com metadados de cadência/rotina operacional se não existirem
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS time_window text DEFAULT 'dia_todo', -- 'manha' | 'tarde' | 'noite' | 'dia_todo'
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media',       -- 'baixa' | 'media' | 'alta' | 'critica'
  ADD COLUMN IF NOT EXISTS is_routine boolean DEFAULT true;     -- true = rotina recorrente de cadência

-- 2. Tabela de Log de Execução de Cadência por Função (Routines Execution Audit)
CREATE TABLE IF NOT EXISTS public.function_cadence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  function_id uuid NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  expected_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  adherence_pct numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cadence_func_date UNIQUE (organization_id, function_id, date)
);

-- Habilitar RLS
ALTER TABLE public.function_cadence_logs ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cadence_func_date ON public.function_cadence_logs(organization_id, function_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_cadence ON public.tasks(organization_id, function_id, recurrence, active);

-- Políticas RLS para function_cadence_logs
DROP POLICY IF EXISTS cadence_select_org ON public.function_cadence_logs;
CREATE POLICY cadence_select_org ON public.function_cadence_logs
  FOR SELECT TO authenticated
  USING (organization_id = current_org_id());

DROP POLICY IF EXISTS cadence_insert_org ON public.function_cadence_logs;
CREATE POLICY cadence_insert_org ON public.function_cadence_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS cadence_update_org ON public.function_cadence_logs;
CREATE POLICY cadence_update_org ON public.function_cadence_logs
  FOR UPDATE TO authenticated
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS cadence_delete_owner ON public.function_cadence_logs;
CREATE POLICY cadence_delete_owner ON public.function_cadence_logs
  FOR DELETE TO authenticated
  USING (organization_id = current_org_id() AND is_current_owner());

-- 3. Inserir tarefas e rotinas padrão de cadência para as funções da clínica Ser Único (idempotente)
-- As funções existentes no banco são:
-- Gerência, Administrativo, Concierge, CRC Comercial, ASB Principal I, ASB Auxiliar, Avaliador, Dentistas

DO $$
DECLARE
  v_org_id uuid;
  v_f_gerencia uuid;
  v_f_admin uuid;
  v_f_concierge uuid;
  v_f_crc uuid;
  v_f_asb1 uuid;
  v_f_asb_aux uuid;
  v_f_avaliador uuid;
  v_f_dentistas uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_f_gerencia FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%gerência%' LIMIT 1;
  SELECT id INTO v_f_admin FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%administrativo%' LIMIT 1;
  SELECT id INTO v_f_concierge FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%concierge%' LIMIT 1;
  SELECT id INTO v_f_crc FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%crc%' LIMIT 1;
  SELECT id INTO v_f_asb1 FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%asb principal%' LIMIT 1;
  SELECT id INTO v_f_asb_aux FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%asb auxiliar%' LIMIT 1;
  SELECT id INTO v_f_avaliador FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%avaliador%' LIMIT 1;
  SELECT id INTO v_f_dentistas FROM public.functions WHERE organization_id = v_org_id AND name ILIKE '%dentistas%' LIMIT 1;

  -- Rotinas Concierge
  IF v_f_concierge IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_concierge AND title ILIKE '%Abertura da recepção%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_concierge, 'Abertura da recepção e acolhimento', 'Checar ambiente, climatização, aromatização, música ambiente e cafeteira da recepção', 'diaria', true, 20, 'manha', 'alta', true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_concierge AND title ILIKE '%Confirmação de chegadas e check-in%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_concierge, 'Confirmação de chegadas e check-in', 'Recepcionar pacientes, conferir documentação inicial e direcionar à sala clínica', 'diaria', true, 15, 'manha', 'media', true);
    END IF;
  END IF;

  -- Rotinas ASB Principal I
  IF v_f_asb1 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_asb1 AND title ILIKE '%Conferência dos kits cirúrgicos%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_asb1, 'Conferência dos kits cirúrgicos e autoclave', 'Checagem diária dos envelopes de esterilização, indicadores químicos e testes biológicos', 'diaria', true, 30, 'manha', 'critica', true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_asb1 AND title ILIKE '%Fechamento de expurgo e esterilização%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_asb1, 'Fechamento de expurgo e esterilização', 'Lavagem ultrassônica, secagem, embalagem e ciclo final da autoclave', 'diaria', true, 45, 'tarde', 'alta', true);
    END IF;
  END IF;

  -- Rotinas CRC Comercial
  IF v_f_crc IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_crc AND title ILIKE '%Varredura matinal de leads novos%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_crc, 'Varredura matinal de leads novos', 'Qualificar e fazer primeiro contato com todos os leads entrantes no WhatsApp/formulários', 'diaria', true, 30, 'manha', 'alta', true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_crc AND title ILIKE '%Follow-ups do dia agendados no CRM%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_crc, 'Follow-ups do dia agendados no CRM', 'Executar ligações e contatos estruturados com propostas pendentes e pacientes em dúvida', 'diaria', true, 60, 'dia_todo', 'critica', true);
    END IF;
  END IF;

  -- Rotinas Administrativo
  IF v_f_admin IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_admin AND title ILIKE '%Conferência de relógio ponto e equipe%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_admin, 'Conferência de relógio ponto e equipe', 'Verificar faltas, atestados e fechamento de registros diários', 'diaria', true, 20, 'manha', 'media', true);
    END IF;
  END IF;

  -- Rotinas Gerência
  IF v_f_gerencia IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = v_org_id AND function_id = v_f_gerencia AND title ILIKE '%Monitoramento de exceções e pendências%') THEN
      INSERT INTO public.tasks (organization_id, function_id, title, description, recurrence, active, estimated_minutes, time_window, priority, is_routine)
      VALUES (v_org_id, v_f_gerencia, 'Monitoramento de exceções e pendências', 'Revisar desvios do dia, limiares de atraso e alinhamento de decisões de gestão', 'diaria', true, 30, 'manha', 'alta', true);
    END IF;
  END IF;
END $$;
