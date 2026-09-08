-- Migration: 20260908190000_stage_4c_exception_engine.sql
-- STAGE 4C — EXCEPTION ENGINE: THRESHOLD CONFIGURATION & MANAGED EXCEPTIONS
-- Invariants:
-- 1. D7_ESCALATION_THRESHOLDS: CONFIGURABLE_DEFAULTS (Stored in org-scoped config table, not hardcoded)
-- 2. D3_PENDING_ITEM: DERIVED (Pending items generated from operational queries, not redundant daily report table)
-- 3. Managed Exceptions: Persisted management state (open -> acknowledged -> decided/resolved, recurrence count, responsible FUNCTION attribution)
-- 4. FUNCTION_FIRST: Exceptions belong primarily to the function responsible (handoff invariant preserved)
-- 5. RLS: Deny-by-default, org-scoped, only OWNER and Gerência (is_current_manager()) have visibility/mutations.

-- 1. Enums para Exceções de Gestão
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exception_severity') THEN
    CREATE TYPE public.exception_severity AS ENUM (
      'baixa',
      'media',
      'alta',
      'critica'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exception_status') THEN
    CREATE TYPE public.exception_status AS ENUM (
      'aberta',
      'reconhecida',
      'decidida',
      'resolvida'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exception_type') THEN
    CREATE TYPE public.exception_type AS ENUM (
      'tarefa_atrasada',
      'ocorrencia_perdida',
      'lead_sem_followup',
      'falhas_recorrentes',
      'outro_desvio'
    );
  END IF;
END $$;

-- 2. Tabela de Limiares Configuráveis da Organização (org_threshold_configs)
CREATE TABLE IF NOT EXISTS public.org_threshold_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'dias',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_threshold_key UNIQUE (organization_id, key)
);

-- 3. Tabela de Exceções de Gestão (managed_exceptions)
CREATE TABLE IF NOT EXISTS public.managed_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Classificação e Tipo
  type public.exception_type NOT NULL,
  severity public.exception_severity NOT NULL DEFAULT 'media'::public.exception_severity,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  
  -- Vínculo operacional (origem do desvio)
  entity_type text NOT NULL, -- 'task' | 'agenda_item' | 'lead' | 'function'
  entity_id uuid DEFAULT NULL,
  
  -- Atribuição de Responsabilidade (FUNCTION FIRST + ocupante histórico preservado)
  responsible_function_id uuid NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  responsible_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  
  -- Workflow de Gestão
  status public.exception_status NOT NULL DEFAULT 'aberta'::public.exception_status,
  recurrence_count integer NOT NULL DEFAULT 1,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  
  -- Auditoria de Reconhecimento
  acknowledged_at timestamptz DEFAULT NULL,
  acknowledged_by_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  
  -- Auditoria de Decisão / Resolução de Gestão
  decision_text text DEFAULT NULL,
  decision_by_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  decision_at timestamptz DEFAULT NULL,
  resolved_at timestamptz DEFAULT NULL,
  
  -- Chave de desduplicação para evitar duplicar ruído em desvios recorrentes
  dedup_key text NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_managed_exception_dedup UNIQUE (organization_id, dedup_key)
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_thresh_org ON public.org_threshold_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_thresh_key ON public.org_threshold_configs(organization_id, key);

CREATE INDEX IF NOT EXISTS idx_exc_org ON public.managed_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_exc_status ON public.managed_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exc_severity ON public.managed_exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_exc_function ON public.managed_exceptions(responsible_function_id);
CREATE INDEX IF NOT EXISTS idx_exc_entity ON public.managed_exceptions(entity_type, entity_id);

-- 5. Trigger de timestamps e auto-preenchimento
CREATE OR REPLACE FUNCTION public.trg_exc_set_defaults()
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

DROP TRIGGER IF EXISTS trg_thresholds_defaults ON public.org_threshold_configs;
CREATE TRIGGER trg_thresholds_defaults
  BEFORE INSERT OR UPDATE ON public.org_threshold_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_exc_set_defaults();

DROP TRIGGER IF EXISTS trg_exceptions_defaults ON public.managed_exceptions;
CREATE TRIGGER trg_exceptions_defaults
  BEFORE INSERT OR UPDATE ON public.managed_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_exc_set_defaults();

-- 6. Habilitar RLS e FORCE RLS
ALTER TABLE public.org_threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_threshold_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.managed_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_exceptions FORCE ROW LEVEL SECURITY;

-- 7. Policies RLS — public.org_threshold_configs
-- Leitura: Qualquer membro da organização ativa (para que regras de negócio possam calcular na UI se necessário)
DROP POLICY IF EXISTS "thresholds_select_org" ON public.org_threshold_configs;
CREATE POLICY "thresholds_select_org" ON public.org_threshold_configs
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

-- Inserção / Atualização / Exclusão: Apenas OWNER e Gerência
DROP POLICY IF EXISTS "thresholds_insert_mgmt" ON public.org_threshold_configs;
CREATE POLICY "thresholds_insert_mgmt" ON public.org_threshold_configs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

DROP POLICY IF EXISTS "thresholds_update_mgmt" ON public.org_threshold_configs;
CREATE POLICY "thresholds_update_mgmt" ON public.org_threshold_configs
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

DROP POLICY IF EXISTS "thresholds_delete_owner" ON public.org_threshold_configs;
CREATE POLICY "thresholds_delete_owner" ON public.org_threshold_configs
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 8. Policies RLS — public.managed_exceptions
-- Acesso restrito: Apenas OWNER e quem exerce a função Gerência podem ler e manipular o painel de exceções
DROP POLICY IF EXISTS "exceptions_select_mgmt" ON public.managed_exceptions;
CREATE POLICY "exceptions_select_mgmt" ON public.managed_exceptions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

DROP POLICY IF EXISTS "exceptions_insert_mgmt" ON public.managed_exceptions;
CREATE POLICY "exceptions_insert_mgmt" ON public.managed_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

DROP POLICY IF EXISTS "exceptions_update_mgmt" ON public.managed_exceptions;
CREATE POLICY "exceptions_update_mgmt" ON public.managed_exceptions
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

DROP POLICY IF EXISTS "exceptions_delete_owner" ON public.managed_exceptions;
CREATE POLICY "exceptions_delete_owner" ON public.managed_exceptions
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 9. RPC para Upsert de Exceção com Incremento de Recorrência (Deduplicação Inteligente)
CREATE OR REPLACE FUNCTION public.upsert_managed_exception(
  p_type public.exception_type,
  p_severity public.exception_severity,
  p_title text,
  p_description text,
  p_entity_type text,
  p_entity_id uuid,
  p_responsible_function_id uuid,
  p_responsible_person_id uuid,
  p_dedup_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_row public.managed_exceptions;
BEGIN
  -- Permissão: OWNER ou Gerência
  IF NOT (public.is_current_owner() OR public.is_current_manager()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas OWNER ou Gerência podem registrar exceções de gestão.'
      USING ERRCODE = '42501';
  END IF;

  v_org_id := public.current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organização ativa não encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Se já existir exceção com esta dedup_key na organização
  SELECT * INTO v_row
  FROM public.managed_exceptions
  WHERE organization_id = v_org_id
    AND dedup_key = p_dedup_key
  FOR UPDATE;

  IF FOUND THEN
    -- Se já estiver resolvida ou decidida e reincidir, volta a ficar aberta e incrementa
    UPDATE public.managed_exceptions
    SET recurrence_count = recurrence_count + 1,
        last_detected_at = now(),
        severity = p_severity,
        title = p_title,
        description = p_description,
        responsible_function_id = p_responsible_function_id,
        responsible_person_id = COALESCE(p_responsible_person_id, responsible_person_id),
        status = CASE WHEN status = 'resolvida' THEN 'aberta'::public.exception_status ELSE status END,
        updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.managed_exceptions (
      organization_id,
      type,
      severity,
      title,
      description,
      entity_type,
      entity_id,
      responsible_function_id,
      responsible_person_id,
      dedup_key,
      status,
      recurrence_count,
      first_detected_at,
      last_detected_at
    ) VALUES (
      v_org_id,
      p_type,
      p_severity,
      p_title,
      p_description,
      p_entity_type,
      p_entity_id,
      p_responsible_function_id,
      p_responsible_person_id,
      p_dedup_key,
      'aberta'::public.exception_status,
      1,
      now(),
      now()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'recurrence_count', v_row.recurrence_count,
    'status', v_row.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_managed_exception(
  public.exception_type,
  public.exception_severity,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  text
) TO authenticated, service_role;

-- 10. Seed inicial de Limiares Configuráveis para a Organização (D7_ESCALATION_THRESHOLDS)
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Localizar organização Ser Único
  SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Ser Único' LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_org_id IS NOT NULL THEN
    -- Limiar 1: Tolerância de Atraso de Tarefas (em dias)
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'task_delay_tolerance_days', 1, 'dias', 'Dias de atraso tolerados antes de elevar tarefa a exceção de gestão')
    ON CONFLICT (organization_id, key) DO NOTHING;

    -- Limiar 2: Tolerância de Follow-up de Leads (em dias)
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'lead_followup_tolerance_days', 2, 'dias', 'Dias após prazo do próximo contato de lead antes de elevar a exceção')
    ON CONFLICT (organization_id, key) DO NOTHING;

    -- Limiar 3: Contagem de Falhas Recorrentes por Função
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'repeated_failure_count', 3, 'ocorrências', 'Número de pendências não resolvidas de uma mesma função que dispara alerta de reincidência')
    ON CONFLICT (organization_id, key) DO NOTHING;

    -- Limiar 4: SLA de Escalonamento de Exceção (em horas)
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'exception_escalation_sla_hours', 24, 'horas', 'Tempo limite para o gestor reconhecer ou decidir sobre uma exceção aberta')
    ON CONFLICT (organization_id, key) DO NOTHING;

    -- Limiar 5: Janela de Próximo Vencimento (near expiration)
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'near_expiration_window_days', 1, 'dias', 'Janela de dias para alertar sobre tarefas ou prazos iminentes')
    ON CONFLICT (organization_id, key) DO NOTHING;

    -- Limiar 6: Limiar de Estoque Crítico (extensibilidade para materiais/insumos odontológicos)
    INSERT INTO public.org_threshold_configs (organization_id, key, value, unit, description)
    VALUES (v_org_id, 'critical_stock_threshold', 5, 'unidades', 'Quantidade mínima de itens críticos antes de gerar exceção operacional')
    ON CONFLICT (organization_id, key) DO NOTHING;
  END IF;
END $$;
