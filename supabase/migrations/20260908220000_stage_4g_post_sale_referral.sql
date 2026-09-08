-- ============================================================================
-- STAGE 4G: POST-SALE / REFERRAL (Pós-Venda e Campanhas de Indicação)
-- Gestão Clínica Ser Único (SKIP)
-- ============================================================================

-- 1. Create Enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_sale_status') THEN
    CREATE TYPE public.post_sale_status AS ENUM (
      'previsto',
      'contatado',
      'reagendado',
      'sem_resposta',
      'insatisfeito'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_sale_outcome') THEN
    CREATE TYPE public.post_sale_outcome AS ENUM (
      'satisfeito',
      'insatisfeito',
      'sem_resposta',
      'reagendado'
    );
  END IF;
END $$;

-- 2. Table: referral_campaigns (Campanhas de Indicação Configuráveis)
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  reward_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions_script text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.people(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_campaigns_org ON public.referral_campaigns(organization_id, active);

-- 3. Table: post_sales (Pós-Venda Operacional T+30)
CREATE TABLE IF NOT EXISTS public.post_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  patient_lead_id uuid NOT NULL,
  due_date date NOT NULL,
  status public.post_sale_status NOT NULL DEFAULT 'previsto',
  outcome public.post_sale_outcome,
  contact_notes text,
  dissatisfaction_reason text,
  dissatisfaction_status text DEFAULT 'pendente', -- 'pendente' | 'em_resolucao' | 'resolvido'
  dissatisfaction_resolution text,
  dissatisfaction_resolved_at timestamptz,
  dissatisfaction_resolved_by uuid REFERENCES public.people(id),
  contacted_at timestamptz,
  contacted_by_person_id uuid REFERENCES public.people(id),
  responsible_function_id uuid REFERENCES public.functions(id),
  campaign_id_presented uuid REFERENCES public.referral_campaigns(id),
  campaign_name_presented text,
  campaign_snapshot jsonb,
  next_contact_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_sale_treatment UNIQUE (treatment_id),
  CONSTRAINT fk_post_sale_patient FOREIGN KEY (patient_lead_id, organization_id)
    REFERENCES public.leads(id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_post_sales_org_due ON public.post_sales(organization_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_post_sales_treatment ON public.post_sales(treatment_id);
CREATE INDEX IF NOT EXISTS idx_post_sales_dissatisfaction ON public.post_sales(organization_id, outcome, dissatisfaction_status);

-- 4. Table: referrals (Indicações geradas pelo pós-venda ou colaboradores)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  source_lead_id uuid NOT NULL,
  source_treatment_id uuid REFERENCES public.treatments(id),
  post_sale_id uuid REFERENCES public.post_sales(id),
  campaign_id uuid REFERENCES public.referral_campaigns(id),
  referred_name text NOT NULL,
  referred_phone text NOT NULL,
  referred_notes text,
  resulting_lead_id uuid,
  registered_by_person_id uuid REFERENCES public.people(id),
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_referral_source_lead FOREIGN KEY (source_lead_id, organization_id)
    REFERENCES public.leads(id, organization_id),
  CONSTRAINT fk_referral_resulting_lead FOREIGN KEY (resulting_lead_id, organization_id)
    REFERENCES public.leads(id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_org ON public.referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_source ON public.referrals(source_lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_post_sale ON public.referrals(post_sale_id);
CREATE INDEX IF NOT EXISTS idx_referrals_resulting_lead ON public.referrals(resulting_lead_id);

-- 5. Trigger: Auto-defaults & Timestamps for new tables
CREATE OR REPLACE FUNCTION public.trg_post_sale_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.current_org_id();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_campaigns_defaults ON public.referral_campaigns;
CREATE TRIGGER trg_referral_campaigns_defaults
  BEFORE INSERT OR UPDATE ON public.referral_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_post_sale_defaults();

DROP TRIGGER IF EXISTS trg_post_sales_defaults ON public.post_sales;
CREATE TRIGGER trg_post_sales_defaults
  BEFORE INSERT OR UPDATE ON public.post_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_post_sale_defaults();

DROP TRIGGER IF EXISTS trg_referrals_defaults ON public.referrals;
CREATE TRIGGER trg_referrals_defaults
  BEFORE INSERT OR UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_post_sale_defaults();

-- 6. Trigger / Function: CONFIRM TREATMENT COMPLETION -> T+30 GENERATION
CREATE OR REPLACE FUNCTION public.confirm_treatment_completion(
  p_treatment_id uuid,
  p_completed_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_treatment public.treatments;
  v_crc_func_id uuid;
  v_due_date date;
  v_post_sale public.post_sales;
  v_agenda_item public.agenda_items;
  v_completed_time timestamptz;
BEGIN
  v_completed_time := COALESCE(p_completed_at, now());
  v_due_date := (v_completed_time + interval '30 days')::date;

  -- 1. Fetch & lock treatment
  SELECT * INTO v_treatment
  FROM public.treatments
  WHERE id = p_treatment_id
    AND organization_id = public.current_org_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tratamento não encontrado ou acesso negado.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Update treatment to concluido
  UPDATE public.treatments
  SET status = 'concluido'::public.treatment_status,
      completed_at = v_completed_time
  WHERE id = v_treatment.id
  RETURNING * INTO v_treatment;

  -- 3. Resolve CRC Comercial function id
  SELECT id INTO v_crc_func_id
  FROM public.functions
  WHERE organization_id = v_treatment.organization_id
    AND name = 'CRC Comercial'
    AND active = true
  LIMIT 1;

  -- 4. Deterministic / Idempotent post_sale generation
  INSERT INTO public.post_sales (
    organization_id,
    treatment_id,
    patient_lead_id,
    due_date,
    status,
    responsible_function_id
  ) VALUES (
    v_treatment.organization_id,
    v_treatment.id,
    v_treatment.lead_id,
    v_due_date,
    'previsto'::public.post_sale_status,
    v_crc_func_id
  )
  ON CONFLICT (treatment_id) DO UPDATE
  SET due_date = EXCLUDED.due_date,
      responsible_function_id = COALESCE(public.post_sales.responsible_function_id, EXCLUDED.responsible_function_id),
      updated_at = now()
  RETURNING * INTO v_post_sale;

  -- 5. Deterministic / Idempotent agenda_items obligation
  -- We link source_type = 'post_sale', source_id = v_post_sale.id
  SELECT * INTO v_agenda_item
  FROM public.agenda_items
  WHERE organization_id = v_treatment.organization_id
    AND source_type = 'post_sale'
    AND source_id = v_post_sale.id;

  IF NOT FOUND THEN
    INSERT INTO public.agenda_items (
      organization_id,
      type,
      title,
      due_date,
      status,
      function_id,
      source_type,
      source_id,
      notes
    ) VALUES (
      v_treatment.organization_id,
      'pos_venda'::public.agenda_item_type,
      'Pós-venda — contato de satisfação (30 dias)',
      v_due_date,
      'aberto'::public.agenda_item_status,
      v_crc_func_id,
      'post_sale',
      v_post_sale.id,
      'Contato de satisfação pós-término de tratamento e apresentação de campanha se satisfeito.'
    )
    RETURNING * INTO v_agenda_item;
  ELSE
    UPDATE public.agenda_items
    SET due_date = v_due_date,
        function_id = COALESCE(function_id, v_crc_func_id)
    WHERE id = v_agenda_item.id
    RETURNING * INTO v_agenda_item;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'treatment_id', v_treatment.id,
    'post_sale_id', v_post_sale.id,
    'due_date', v_due_date,
    'agenda_item_id', v_agenda_item.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_treatment_completion(uuid, timestamptz) TO authenticated, service_role;

-- 7. Enable and FORCE RLS on all new tables
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE public.post_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_sales FORCE ROW LEVEL SECURITY;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals FORCE ROW LEVEL SECURITY;

-- 8. RLS Policies: referral_campaigns
-- 8.1 SELECT: Organization members
DROP POLICY IF EXISTS "campaigns_select_org" ON public.referral_campaigns;
CREATE POLICY "campaigns_select_org" ON public.referral_campaigns
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

-- 8.2 INSERT: OWNER or Gerência
DROP POLICY IF EXISTS "campaigns_insert_mgmt" ON public.referral_campaigns;
CREATE POLICY "campaigns_insert_mgmt" ON public.referral_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

-- 8.3 UPDATE: OWNER or Gerência
DROP POLICY IF EXISTS "campaigns_update_mgmt" ON public.referral_campaigns;
CREATE POLICY "campaigns_update_mgmt" ON public.referral_campaigns
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

-- 8.4 DELETE: OWNER-only
DROP POLICY IF EXISTS "campaigns_delete_owner" ON public.referral_campaigns;
CREATE POLICY "campaigns_delete_owner" ON public.referral_campaigns
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 9. RLS Policies: post_sales
-- 9.1 SELECT: Organization members
DROP POLICY IF EXISTS "post_sales_select_org" ON public.post_sales;
CREATE POLICY "post_sales_select_org" ON public.post_sales
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

-- 9.2 INSERT: Organization members (CRC, Management)
DROP POLICY IF EXISTS "post_sales_insert_org" ON public.post_sales;
CREATE POLICY "post_sales_insert_org" ON public.post_sales
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

-- 9.3 UPDATE: Organization members
DROP POLICY IF EXISTS "post_sales_update_org" ON public.post_sales;
CREATE POLICY "post_sales_update_org" ON public.post_sales
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- 9.4 DELETE: OWNER-only
DROP POLICY IF EXISTS "post_sales_delete_owner" ON public.post_sales;
CREATE POLICY "post_sales_delete_owner" ON public.post_sales
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 10. RLS Policies: referrals
-- 10.1 SELECT: Organization members
DROP POLICY IF EXISTS "referrals_select_org" ON public.referrals;
CREATE POLICY "referrals_select_org" ON public.referrals
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

-- 10.2 INSERT: Organization members
DROP POLICY IF EXISTS "referrals_insert_org" ON public.referrals;
CREATE POLICY "referrals_insert_org" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

-- 10.3 UPDATE: Organization members
DROP POLICY IF EXISTS "referrals_update_org" ON public.referrals;
CREATE POLICY "referrals_update_org" ON public.referrals
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- 10.4 DELETE: OWNER-only
DROP POLICY IF EXISTS "referrals_delete_owner" ON public.referrals;
CREATE POLICY "referrals_delete_owner" ON public.referrals
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 11. Seed Default Initial Referral Campaign (Configurable)
INSERT INTO public.referral_campaigns (
  organization_id,
  name,
  description,
  active,
  reward_config,
  instructions_script
)
SELECT
  o.id,
  'Campanha Sorriso Compartilhado',
  'Programa de recomendação para amigos e familiares de pacientes com tratamentos concluídos.',
  true,
  '{"reward_type": "benefit", "benefit_label": "Consulta de profilaxia ou desconto especial na próxima manutenção", "referred_benefit": "Avaliação completa sem custo + kit higiene"}'::jsonb,
  'Olá [Nome do Paciente]! Que alegria saber que você concluiu seu tratamento com satisfação total. Estamos com nossa campanha especial "Sorriso Compartilhado": indicando um amigo ou familiar querido, ele recebe uma avaliação completa de cortesia e você ganha uma profilaxia na sua próxima visita. Gostaria de indicar alguém especial para presentear?'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_campaigns c WHERE c.organization_id = o.id
);

-- 12. Add new threshold configs for Post-sale if not present
INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
SELECT
  o.id,
  'post_sale_delay_tolerance_days',
  3,
  'dias',
  'Dias de tolerância após o vencimento de T+30 antes de alertar gestão por atraso no pós-venda'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_threshold_configs tc
  WHERE tc.organization_id = o.id AND tc.key = 'post_sale_delay_tolerance_days'
);

-- 13. Update calculate_goal_metric with Stage 4G metrics:
-- post_sales_completed, post_sales_overdue, referrals_generated, referred_leads
CREATE OR REPLACE FUNCTION public.calculate_goal_metric(p_goal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_goal record;
  v_actual numeric := 0;
  v_evidence_source text := '';
  v_notes text := '';
  v_today date := CURRENT_DATE;
BEGIN
  -- 1. Fetch goal
  SELECT * INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id
    AND organization_id = public.current_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada ou acesso negado.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Derivation based on metric type
  CASE v_goal.metric
    -- A. Tarefas Concluídas
    WHEN 'tasks_completed' THEN
      v_evidence_source := 'Tarefas e rotinas operacionais com status concluído registradas na agenda da clínica durante o período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.agenda_items
      WHERE organization_id = v_goal.organization_id
        AND function_id = v_goal.responsible_function_id
        AND status = 'concluido'
        AND (
          (completed_at IS NOT NULL AND completed_at::date BETWEEN v_goal.period_start AND v_goal.period_end)
          OR (completed_at IS NULL AND due_date BETWEEN v_goal.period_start AND v_goal.period_end)
        );

    -- B. Tarefas em Atraso
    WHEN 'tasks_overdue' THEN
      v_evidence_source := 'Tarefas pendentes com prazo vencido atribuídas à função no período avaliado.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.agenda_items
      WHERE organization_id = v_goal.organization_id
        AND function_id = v_goal.responsible_function_id
        AND status = 'aberto'
        AND due_date BETWEEN v_goal.period_start AND v_goal.period_end
        AND due_date < v_today;

    -- C. Aderência às Rotinas (%)
    WHEN 'routine_adherence' THEN
      v_evidence_source := 'Percentual de cumprimento de rotinas operacionais planejadas no período pela função.';
      DECLARE
        v_total integer := 0;
        v_done integer := 0;
      BEGIN
        SELECT count(*), count(*) FILTER (WHERE status = 'concluido')
        INTO v_total, v_done
        FROM public.agenda_items
        WHERE organization_id = v_goal.organization_id
          AND function_id = v_goal.responsible_function_id
          AND due_date BETWEEN v_goal.period_start AND v_goal.period_end
          AND status <> 'cancelado';

        IF v_total > 0 THEN
          v_actual := round((v_done::numeric / v_total::numeric) * 100, 1);
        ELSE
          v_actual := 100;
        END IF;
      END;

    -- D. Exceções Geradas
    WHEN 'exceptions_generated' THEN
      v_evidence_source := 'Situações de desvio e exceções de gestão registradas para a função no período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.managed_exceptions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND first_detected_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- E. Exceções Resolvidas
    WHEN 'exceptions_resolved' THEN
      v_evidence_source := 'Situações de exceção finalizadas e resolvidas para a função no período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.managed_exceptions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND status = 'resolvida'
        AND resolved_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- F. Follow-ups Realizados
    WHEN 'followups_executed' THEN
      v_evidence_source := 'Contatos e tentativas de retorno registradas no histórico do CRM durante o período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.lead_contacts
      WHERE organization_id = v_goal.organization_id
        AND function_id = v_goal.responsible_function_id
        AND contact_date::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- G. Follow-ups em Atraso
    WHEN 'followups_overdue' THEN
      v_evidence_source := 'Leads ativos no CRM cuja data prevista de próximo contato está em atraso.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.leads
      WHERE organization_id = v_goal.organization_id
        AND commercial_function_id = v_goal.responsible_function_id
        AND stage NOT IN ('fechado', 'perdido')
        AND next_contact_at BETWEEN v_goal.period_start AND v_goal.period_end
        AND next_contact_at < v_today;

    -- H. Ações de Gestão Concluídas
    WHEN 'management_actions_completed' THEN
      v_evidence_source := 'Ações de melhoria e alinhamento de gestão concluídas no período pela função.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.management_actions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND status = 'concluida'
        AND (
          (completed_at IS NOT NULL AND completed_at::date BETWEEN v_goal.period_start AND v_goal.period_end)
          OR (completed_at IS NULL AND updated_at::date BETWEEN v_goal.period_start AND v_goal.period_end)
        );

    -- I. Ações de Gestão em Atraso
    WHEN 'management_actions_overdue' THEN
      v_evidence_source := 'Ações de gestão pendentes cujo prazo limite acordado foi ultrapassado.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.management_actions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND status IN ('pendente', 'em_andamento')
        AND due_date BETWEEN v_goal.period_start AND v_goal.period_end
        AND due_date < v_today;

    -- J. Stage 4G: Pós-Vendas Realizados
    WHEN 'post_sales_completed' THEN
      v_evidence_source := 'Contatos de pós-venda T+30 executados e com satisfação registrada no período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.post_sales ps
      WHERE ps.organization_id = v_goal.organization_id
        AND (v_goal.responsible_function_id IS NULL OR ps.responsible_function_id = v_goal.responsible_function_id)
        AND ps.outcome IS NOT NULL
        AND ps.contacted_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- K. Stage 4G: Pós-Vendas em Atraso
    WHEN 'post_sales_overdue' THEN
      v_evidence_source := 'Contatos de pós-venda T+30 pendentes com prazo vencido.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.post_sales ps
      WHERE ps.organization_id = v_goal.organization_id
        AND (v_goal.responsible_function_id IS NULL OR ps.responsible_function_id = v_goal.responsible_function_id)
        AND ps.status IN ('previsto', 'sem_resposta', 'reagendado')
        AND ps.due_date BETWEEN v_goal.period_start AND v_goal.period_end
        AND ps.due_date < v_today;

    -- L. Stage 4G: Indicações Geradas
    WHEN 'referrals_generated' THEN
      v_evidence_source := 'Novas indicações de pacientes registradas no período através das campanhas de pós-venda.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.referrals r
      WHERE r.organization_id = v_goal.organization_id
        AND r.registered_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- M. Stage 4G: Leads Criados por Indicação
    WHEN 'referred_leads' THEN
      v_evidence_source := 'Leads registrados no CRM originados diretamente de indicações geradas no pós-venda.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.referrals r
      JOIN public.leads l ON r.resulting_lead_id = l.id
      WHERE r.organization_id = v_goal.organization_id
        AND r.registered_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    ELSE
      v_evidence_source := 'Métrica personalizada calculada a partir de registros operacionais.';
      v_actual := 0;
  END CASE;

  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'metric', v_goal.metric,
    'target', v_goal.target,
    'actual', v_actual,
    'evidence_source', v_evidence_source,
    'period_start', v_goal.period_start,
    'period_end', v_goal.period_end,
    'period_type', v_goal.period_type,
    'status', v_goal.status
  );
END;
$function$;
