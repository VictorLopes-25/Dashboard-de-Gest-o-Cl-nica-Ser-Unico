-- Migration: 20260908150000_stage_4b_management_core.sql
-- STAGE 4B — MANAGEMENT CORE: ITENS DE GESTÃO, AÇÕES DE GESTÃO, RLS POR VISIBILIDADE E RECONHECIMENTO

-- 1. Helper SECURITY DEFINER: is_current_manager()
-- Identifica se o usuário autenticado ocupa ativamente a função operacional "Gerência"
CREATE OR REPLACE FUNCTION public.is_current_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.function_assignments fa
    JOIN public.functions f ON f.id = fa.function_id
    JOIN public.people p ON p.id = fa.person_id
    WHERE p.auth_user_id = auth.uid()
      AND p.active = true
      AND fa.active = true
      AND lower(trim(f.name)) = 'gerência'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_manager() TO authenticated, service_role;

-- 2. Enums da Matriz de Gestão
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'management_item_type') THEN
    CREATE TYPE public.management_item_type AS ENUM (
      'feedback',
      'nota_privada_gestao',
      'decisao_posse',
      'conteudo_estrategico',
      'instrucao_funcao',
      'reconhecimento',
      'plano_desenvolvimento'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'management_visibility_level') THEN
    CREATE TYPE public.management_visibility_level AS ENUM (
      'OWNER_ONLY',
      'PRIVATE_MANAGEMENT',
      'SHARED_WITH_EMPLOYEE',
      'FUNCTION_VISIBLE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'management_item_status') THEN
    CREATE TYPE public.management_item_status AS ENUM (
      'ativo',
      'resolvido',
      'arquivado'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'management_action_status') THEN
    CREATE TYPE public.management_action_status AS ENUM (
      'pendente',
      'em_andamento',
      'concluida',
      'cancelada'
    );
  END IF;
END $$;

-- 3. Tabelas de Gestão

-- 3.1 management_items
CREATE TABLE IF NOT EXISTS public.management_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type public.management_item_type NOT NULL,
  visibility_level public.management_visibility_level NOT NULL,
  status public.management_item_status NOT NULL DEFAULT 'ativo'::public.management_item_status,
  
  -- Alvos (Pessoa e/ou Função)
  target_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  target_function_id uuid REFERENCES public.functions(id) ON DELETE SET NULL,
  
  -- Auditoria e Reconhecimento
  created_by_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  acknowledged_at timestamptz DEFAULT NULL,
  acknowledged_by_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 management_actions
CREATE TABLE IF NOT EXISTS public.management_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.management_action_status NOT NULL DEFAULT 'pendente'::public.management_action_status,
  
  -- Responsáveis (Pessoa e/ou Função)
  responsible_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  responsible_function_id uuid REFERENCES public.functions(id) ON DELETE SET NULL,
  due_date date DEFAULT NULL,
  
  -- Vínculo opcional de origem a um item de gestão
  origin_item_id uuid REFERENCES public.management_items(id) ON DELETE SET NULL,
  
  -- Auditoria
  created_by_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Índices para performance e consultas comuns
CREATE INDEX IF NOT EXISTS idx_mgmt_items_org ON public.management_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_items_vis ON public.management_items(visibility_level);
CREATE INDEX IF NOT EXISTS idx_mgmt_items_target_person ON public.management_items(target_person_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_items_target_function ON public.management_items(target_function_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_items_created_by ON public.management_items(created_by_person_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_items_status ON public.management_items(status);

CREATE INDEX IF NOT EXISTS idx_mgmt_actions_org ON public.management_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_actions_resp_person ON public.management_actions(responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_actions_resp_function ON public.management_actions(responsible_function_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_actions_status ON public.management_actions(status);
CREATE INDEX IF NOT EXISTS idx_mgmt_actions_due ON public.management_actions(due_date);

-- 5. Triggers de timestamps e integridade de organization_id / created_by
CREATE OR REPLACE FUNCTION public.trg_mgmt_set_defaults()
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
    IF NEW.created_by_person_id IS NULL THEN
      NEW.created_by_person_id := public.current_person_id();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mgmt_items_defaults ON public.management_items;
CREATE TRIGGER trg_mgmt_items_defaults
  BEFORE INSERT OR UPDATE ON public.management_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_mgmt_set_defaults();

DROP TRIGGER IF EXISTS trg_mgmt_actions_defaults ON public.management_actions;
CREATE TRIGGER trg_mgmt_actions_defaults
  BEFORE INSERT OR UPDATE ON public.management_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_mgmt_set_defaults();

-- 6. Habilitar ROW LEVEL SECURITY e FORCE RLS
ALTER TABLE public.management_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.management_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_actions FORCE ROW LEVEL SECURITY;

-- 7. POLICIES RLS — public.management_items

-- 7.1 SELECT (Enforcement de Visibilidade estrito de 4 níveis)
-- Regra D4: OWNER_ONLY é EXCLUSIVO do OWNER. Nenhuma função (incluindo Gerência) herda OWNER_ONLY.
DROP POLICY IF EXISTS "mgmt_items_select" ON public.management_items;
CREATE POLICY "mgmt_items_select" ON public.management_items
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (
      -- Nível 1: OWNER_ONLY — Apenas OWNER da organização
      (visibility_level = 'OWNER_ONLY'::public.management_visibility_level AND public.is_current_owner())
      
      -- Nível 2: PRIVATE_MANAGEMENT — Criador do item OU OWNER da organização
      OR (visibility_level = 'PRIVATE_MANAGEMENT'::public.management_visibility_level AND (
        created_by_person_id = public.current_person_id()
        OR public.is_current_owner()
      ))
      
      -- Nível 3: SHARED_WITH_EMPLOYEE — Criador, Colaborador alvo, OWNER ou função Gerência
      OR (visibility_level = 'SHARED_WITH_EMPLOYEE'::public.management_visibility_level AND (
        target_person_id = public.current_person_id()
        OR created_by_person_id = public.current_person_id()
        OR public.is_current_owner()
        OR public.is_current_manager()
      ))
      
      -- Nível 4: FUNCTION_VISIBLE — Membro ativo da função alvo, criador, OWNER ou função Gerência
      OR (visibility_level = 'FUNCTION_VISIBLE'::public.management_visibility_level AND (
        target_function_id = ANY(public.current_function_ids())
        OR created_by_person_id = public.current_person_id()
        OR public.is_current_owner()
        OR public.is_current_manager()
      ))
    )
  );

-- 7.2 INSERT: Itens de gestão podem ser criados por OWNER ou quem exerce a função Gerência
DROP POLICY IF EXISTS "mgmt_items_insert" ON public.management_items;
CREATE POLICY "mgmt_items_insert" ON public.management_items
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (
      -- OWNER pode criar qualquer nível
      public.is_current_owner()
      -- Gerência pode criar níveis PRIVATE_MANAGEMENT, SHARED_WITH_EMPLOYEE e FUNCTION_VISIBLE (NUNCA OWNER_ONLY)
      OR (public.is_current_manager() AND visibility_level <> 'OWNER_ONLY'::public.management_visibility_level)
    )
  );

-- 7.3 UPDATE:
-- - OWNER pode atualizar qualquer item da sua org
-- - Gerência pode atualizar itens criados por si (exceto OWNER_ONLY)
-- - Colaborador alvo pode registrar reconhecimento em SHARED_WITH_EMPLOYEE direcionado a ele
DROP POLICY IF EXISTS "mgmt_items_update" ON public.management_items;
CREATE POLICY "mgmt_items_update" ON public.management_items
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR (public.is_current_manager() AND visibility_level <> 'OWNER_ONLY'::public.management_visibility_level AND created_by_person_id = public.current_person_id())
      OR (visibility_level = 'SHARED_WITH_EMPLOYEE'::public.management_visibility_level AND target_person_id = public.current_person_id())
    )
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR (public.is_current_manager() AND visibility_level <> 'OWNER_ONLY'::public.management_visibility_level)
      OR (visibility_level = 'SHARED_WITH_EMPLOYEE'::public.management_visibility_level AND target_person_id = public.current_person_id())
    )
  );

-- 7.4 DELETE: Emenda B da 4A — Conservador, restrito a OWNER
DROP POLICY IF EXISTS "mgmt_items_delete_owner" ON public.management_items;
CREATE POLICY "mgmt_items_delete_owner" ON public.management_items
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 8. POLICIES RLS — public.management_actions

-- 8.1 SELECT: Visível a OWNER, Gerência e aos responsáveis designados (por pessoa ou função)
DROP POLICY IF EXISTS "mgmt_actions_select" ON public.management_actions;
CREATE POLICY "mgmt_actions_select" ON public.management_actions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR public.is_current_manager()
      OR responsible_person_id = public.current_person_id()
      OR responsible_function_id = ANY(public.current_function_ids())
      OR created_by_person_id = public.current_person_id()
    )
  );

-- 8.2 INSERT: OWNER ou função Gerência
DROP POLICY IF EXISTS "mgmt_actions_insert" ON public.management_actions;
CREATE POLICY "mgmt_actions_insert" ON public.management_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (public.is_current_owner() OR public.is_current_manager())
  );

-- 8.3 UPDATE: OWNER, Gerência, ou responsável designado (para atualizar status/progresso)
DROP POLICY IF EXISTS "mgmt_actions_update" ON public.management_actions;
CREATE POLICY "mgmt_actions_update" ON public.management_actions
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR public.is_current_manager()
      OR responsible_person_id = public.current_person_id()
      OR responsible_function_id = ANY(public.current_function_ids())
      OR created_by_person_id = public.current_person_id()
    )
  )
  WITH CHECK (
    organization_id = public.current_org_id()
    AND (
      public.is_current_owner()
      OR public.is_current_manager()
      OR responsible_person_id = public.current_person_id()
      OR responsible_function_id = ANY(public.current_function_ids())
      OR created_by_person_id = public.current_person_id()
    )
  );

-- 8.4 DELETE: Emenda B — Restrito a OWNER
DROP POLICY IF EXISTS "mgmt_actions_delete_owner" ON public.management_actions;
CREATE POLICY "mgmt_actions_delete_owner" ON public.management_actions
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND public.is_current_owner()
  );

-- 9. Helper Function para Colaborador Reconhecer Feedback
CREATE OR REPLACE FUNCTION public.acknowledge_management_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_person_id uuid;
  v_item record;
BEGIN
  v_person_id := public.current_person_id();
  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'Operação negada: usuário não possui pessoa ativa vinculada.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item
  FROM public.management_items
  WHERE id = p_item_id
    AND organization_id = public.current_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de gestão não encontrado.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Apenas o colaborador alvo de um item SHARED_WITH_EMPLOYEE ou membro da função alvo pode reconhecer
  IF v_item.visibility_level = 'SHARED_WITH_EMPLOYEE'::public.management_visibility_level THEN
    IF v_item.target_person_id <> v_person_id AND NOT public.is_current_owner() THEN
      RAISE EXCEPTION 'Operação negada: apenas o colaborador alvo pode confirmar leitura deste feedback.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_item.visibility_level = 'FUNCTION_VISIBLE'::public.management_visibility_level THEN
    IF NOT (v_item.target_function_id = ANY(public.current_function_ids())) AND NOT public.is_current_owner() THEN
      RAISE EXCEPTION 'Operação negada: colaborador não pertence à função destinatária desta instrução.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Itens privados ou restritos a OWNER não possuem fluxo de reconhecimento de colaborador.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.management_items
  SET acknowledged_at = now(),
      acknowledged_by_person_id = v_person_id
  WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', p_item_id,
    'acknowledged_at', now(),
    'acknowledged_by', v_person_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_management_item(uuid) TO authenticated, service_role;
