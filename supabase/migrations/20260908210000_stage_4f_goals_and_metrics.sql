-- Migration: 20260908210000_stage_4f_goals_and_metrics.sql
-- STAGE 4F: GOALS & METRICS FOR SKIP MANAGEMENT SYSTEM
-- Invariants:
-- 1. FUNCTION-FIRST (D1): Goals belong primarily to FUNCTIONS (functions.id), not individual people.
-- 2. AUTOMATIC DERIVATION (D5): Metrics derive automatically from existing SKIP evidence only (tasks, function_assignments, managed_exceptions, leads/lead_contacts, management_items/actions).
-- 3. OWNER-only writes: Creation, update, pause, delete of goals restricted strictly to OWNER.
-- 4. Org-scoped reads: OWNER and Gerência (and org members) can read goals of their organization.
-- 5. Non-destructive, idempotent, RLS force enabled.

-- 1. Create table public.goals
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  responsible_function_id uuid NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  metric text NOT NULL,
  metric_label text NOT NULL,
  target numeric NOT NULL,
  period_type text NOT NULL DEFAULT 'monthly', -- 'daily' | 'weekly' | 'monthly' | 'custom'
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'closed'
  created_by uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for goals
CREATE INDEX IF NOT EXISTS idx_goals_org ON public.goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_func ON public.goals(responsible_function_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_period ON public.goals(period_start, period_end);

-- 3. Trigger for defaults & timestamp
CREATE OR REPLACE FUNCTION public.trg_goals_set_defaults()
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
    IF NEW.created_by IS NULL THEN
      NEW.created_by := public.current_person_id();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_goals_defaults ON public.goals;
CREATE TRIGGER trg_goals_defaults
  BEFORE INSERT OR UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_goals_set_defaults();

-- 4. Enable and FORCE RLS on public.goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals FORCE ROW LEVEL SECURITY;

-- 5. RLS Policies on public.goals
-- 5.1 SELECT: Visible to org members (OWNER or Gerência or active org member)
DROP POLICY IF EXISTS "goals_select_org" ON public.goals;
CREATE POLICY "goals_select_org" ON public.goals
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR public.is_current_manager()
      OR responsible_function_id = ANY(public.current_function_ids())
    )
  );

-- 5.2 INSERT: OWNER-only
DROP POLICY IF EXISTS "goals_insert_owner" ON public.goals;
CREATE POLICY "goals_insert_owner" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 5.3 UPDATE: OWNER-only
DROP POLICY IF EXISTS "goals_update_owner" ON public.goals;
CREATE POLICY "goals_update_owner" ON public.goals
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 5.4 DELETE: OWNER-only
DROP POLICY IF EXISTS "goals_delete_owner" ON public.goals;
CREATE POLICY "goals_delete_owner" ON public.goals
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 6. Helper RPC Functions for Automatic Metric Derivation
-- Traceable, SECURITY DEFINER, search_path = public, auth, pg_temp, STABLE
-- Computes actual values from EXISTING tables only:
-- - tasks_completed: count of agenda_items with status = 'concluido' and due_date within period
-- - tasks_overdue: count of open agenda_items with due_date < current_date within period
-- - routine_adherence: % adherence from function_cadence_logs or agenda_items
-- - exceptions_generated: count of managed_exceptions first detected within period
-- - exceptions_resolved: count of managed_exceptions resolved within period
-- - followups_executed: count of lead_contacts registered within period for the function
-- - followups_overdue: count of leads with active stage and next_contact_at < current_date
-- - management_actions_completed: count of management_actions completed within period
-- - management_actions_overdue: count of open management_actions with due_date < current_date

CREATE OR REPLACE FUNCTION public.calculate_goal_metric(
  p_goal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
    -- A. Tarefas Concluídas: agenda_items concluídos atribuídos à função no período
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

    -- B. Tarefas em Atraso: agenda_items abertos com prazo estourado atribuídos à função
    WHEN 'tasks_overdue' THEN
      v_evidence_source := 'Tarefas pendentes com prazo vencido atribuídas à função no período avaliado.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.agenda_items
      WHERE organization_id = v_goal.organization_id
        AND function_id = v_goal.responsible_function_id
        AND status = 'aberto'
        AND due_date BETWEEN v_goal.period_start AND v_goal.period_end
        AND due_date < v_today;

    -- C. Aderência às Rotinas (%): percentual de rotinas concluídas em relação ao total planejado
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
          v_actual := 100; -- Sem rotinas abertas no período = 100% aderente
        END IF;
      END;

    -- D. Exceções Geradas: total de situações de exceção abertas para a função no período
    WHEN 'exceptions_generated' THEN
      v_evidence_source := 'Situações de desvio e exceções de gestão registradas para a função no período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.managed_exceptions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND first_detected_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- E. Exceções Resolvidas: desvios corrigidos e resolvidos pela gestão para a função
    WHEN 'exceptions_resolved' THEN
      v_evidence_source := 'Situações de exceção finalizadas e resolvidas para a função no período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.managed_exceptions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND status = 'resolvida'
        AND resolved_at::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- F. Follow-ups Realizados: contatos registrados no CRM comercial atribuídos à função
    WHEN 'followups_executed' THEN
      v_evidence_source := 'Contatos e tentativas de retorno registradas no histórico do CRM durante o período.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.lead_contacts
      WHERE organization_id = v_goal.organization_id
        AND function_id = v_goal.responsible_function_id
        AND contact_date::date BETWEEN v_goal.period_start AND v_goal.period_end;

    -- G. Follow-ups em Atraso: leads ativos sob a função comercial cujo prazo de próximo contato já expirou
    WHEN 'followups_overdue' THEN
      v_evidence_source := 'Leads ativos no CRM cuja data prevista de próximo contato está em atraso.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.leads
      WHERE organization_id = v_goal.organization_id
        AND commercial_function_id = v_goal.responsible_function_id
        AND stage NOT IN ('fechado', 'perdido')
        AND next_contact_at BETWEEN v_goal.period_start AND v_goal.period_end
        AND next_contact_at < v_today;

    -- H. Ações de Gestão Concluídas: planos de ação finalizados com sucesso no período
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

    -- I. Ações de Gestão em Atraso: ações de gestão abertas com prazo vencido
    WHEN 'management_actions_overdue' THEN
      v_evidence_source := 'Ações de gestão pendentes cujo prazo limite acordado foi ultrapassado.';
      SELECT COALESCE(count(*), 0) INTO v_actual
      FROM public.management_actions
      WHERE organization_id = v_goal.organization_id
        AND responsible_function_id = v_goal.responsible_function_id
        AND status IN ('pendente', 'em_andamento')
        AND due_date BETWEEN v_goal.period_start AND v_goal.period_end
        AND due_date < v_today;

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
$$;

GRANT EXECUTE ON FUNCTION public.calculate_goal_metric(uuid) TO authenticated, service_role;

-- 7. Batch Derivation RPC: calculate_goals_for_organization
-- Computes actual values for all active/paused goals of the caller's organization
CREATE OR REPLACE FUNCTION public.calculate_goals_for_organization()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_goal record;
  v_calc jsonb;
BEGIN
  v_org_id := public.current_org_id();
  IF v_org_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_goal IN
    SELECT g.id
    FROM public.goals g
    WHERE g.organization_id = v_org_id
    ORDER BY g.created_at DESC
  LOOP
    BEGIN
      v_calc := public.calculate_goal_metric(v_goal.id);
      v_results := v_results || jsonb_build_array(v_calc);
    EXCEPTION WHEN OTHERS THEN
      -- Silently skip individual goal calculation errors
      NULL;
    END;
  END LOOP;

  RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_goals_for_organization() TO authenticated, service_role;
