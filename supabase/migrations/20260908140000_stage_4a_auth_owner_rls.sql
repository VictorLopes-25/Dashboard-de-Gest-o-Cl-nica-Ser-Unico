-- Migration: 20260908140000_stage_4a_auth_owner_rls.sql
-- STAGE 4A: AUTH / IDENTITY + OWNER RULE + BASE ACCESS ENFORCEMENT + RLS TENANT/FUNCTION ISOLATION
-- Emenda A: OWNER Bootstrap Safety (single-use por org, transaction safe, impossível se já houver OWNER)
-- Emenda B: Delete permissions restritas a OWNER para entidades operacionais

-- 1. Enum org_role_type e coluna people.org_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role_type') THEN
    CREATE TYPE public.org_role_type AS ENUM ('OWNER');
  END IF;
END $$;

ALTER TABLE public.people 
  ADD COLUMN IF NOT EXISTS org_role public.org_role_type DEFAULT NULL;

-- 2. Funções auxiliares SECURITY DEFINER (com search_path explícito)
-- 2.1 current_person_id(): retorna o id de public.people correspondente a auth.uid(), apenas se ativo
CREATE OR REPLACE FUNCTION public.current_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT p.id 
  FROM public.people p
  WHERE p.auth_user_id = auth.uid()
    AND p.active = true
  LIMIT 1;
$$;

-- 2.2 current_person(): retorna o registro completo de public.people correspondente a auth.uid(), apenas se ativo
CREATE OR REPLACE FUNCTION public.current_person()
RETURNS public.people
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT p.* 
  FROM public.people p
  WHERE p.auth_user_id = auth.uid()
    AND p.active = true
  LIMIT 1;
$$;

-- 2.3 current_org_id(): retorna o organization_id da pessoa ativa vinculada ao auth.uid()
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT p.organization_id 
  FROM public.people p
  WHERE p.auth_user_id = auth.uid()
    AND p.active = true
  LIMIT 1;
$$;

-- 2.4 current_org_role(): retorna o org_role da pessoa ativa vinculada ao auth.uid()
CREATE OR REPLACE FUNCTION public.current_org_role()
RETURNS public.org_role_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT p.org_role 
  FROM public.people p
  WHERE p.auth_user_id = auth.uid()
    AND p.active = true
  LIMIT 1;
$$;

-- 2.5 is_current_owner(): atalho booleano seguro
CREATE OR REPLACE FUNCTION public.is_current_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.people p
    WHERE p.auth_user_id = auth.uid()
      AND p.active = true
      AND p.org_role = 'OWNER'::public.org_role_type
  );
$$;

-- 2.6 current_function_ids(): retorna array de UUIDs das funções ativas da pessoa autenticada
CREATE OR REPLACE FUNCTION public.current_function_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT COALESCE(array_agg(fa.function_id), '{}'::uuid[])
  FROM public.function_assignments fa
  JOIN public.people p ON p.id = fa.person_id
  WHERE p.auth_user_id = auth.uid()
    AND p.active = true
    AND fa.active = true;
$$;

-- Conceder permissão de execução aos roles authenticated e service_role
GRANT EXECUTE ON FUNCTION public.current_person_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_person() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_org_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_function_ids() TO authenticated, service_role;

-- 3. EMENDA A: Bootstrap Seguro de OWNER (Single-use por organização, transaction-safe, deny se já existir OWNER)
CREATE OR REPLACE FUNCTION public.bootstrap_owner(
  target_org_id uuid,
  owner_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
  v_existing_owner uuid;
  v_person_id uuid;
  v_org_name text;
  v_existing_person_id uuid;
BEGIN
  -- 1. Verificar se quem invocou está autenticado no Supabase
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: bootstrap exige usuário autenticado no Supabase.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Obter lock exclusivo na organização para evitar corrida (race condition)
  SELECT name INTO v_org_name
  FROM public.organizations
  WHERE id = target_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Invariante Emenda A: se a organização já tem qualquer OWNER ativo, negar bootstrap
  SELECT id INTO v_existing_owner
  FROM public.people
  WHERE organization_id = target_org_id
    AND org_role = 'OWNER'::public.org_role_type
    AND active = true
  LIMIT 1;

  IF v_existing_owner IS NOT NULL THEN
    RAISE EXCEPTION 'Bootstrap rejeitado: a organização já possui um OWNER ativo.'
      USING ERRCODE = '23505';
  END IF;

  -- 4. Verificar se o auth_user_id já está vinculado a alguma pessoa
  SELECT id INTO v_existing_person_id
  FROM public.people
  WHERE auth_user_id = v_auth_uid;

  IF v_existing_person_id IS NOT NULL THEN
    -- Atualiza a pessoa existente para se tornar o OWNER da organização alvo
    UPDATE public.people
    SET organization_id = target_org_id,
        name = COALESCE(NULLIF(trim(owner_name), ''), name),
        org_role = 'OWNER'::public.org_role_type,
        active = true
    WHERE id = v_existing_person_id
    RETURNING id INTO v_person_id;
  ELSE
    -- Cria nova pessoa para este usuário já como OWNER
    INSERT INTO public.people (
      organization_id,
      name,
      auth_user_id,
      org_role,
      active
    ) VALUES (
      target_org_id,
      COALESCE(NULLIF(trim(owner_name), ''), 'Proprietário Ser Único'),
      v_auth_uid,
      'OWNER'::public.org_role_type,
      true
    )
    RETURNING id INTO v_person_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'person_id', v_person_id,
    'organization_id', target_org_id,
    'org_role', 'OWNER'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_owner(uuid, text) TO authenticated, service_role;

-- 4. Função auxiliar para resolução do status de auth / org para o cliente
CREATE OR REPLACE FUNCTION public.get_auth_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
  v_person record;
  v_owner_count integer;
  v_first_org record;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'person', null,
      'needs_bootstrap', false
    );
  END IF;

  SELECT * INTO v_person
  FROM public.people
  WHERE auth_user_id = v_auth_uid;

  IF v_person.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'person', row_to_json(v_person),
      'active', v_person.active,
      'needs_bootstrap', false
    );
  END IF;

  -- Se não há person vinculada a este auth.uid():
  -- Verifica se existe alguma organização sem OWNER
  SELECT id, name INTO v_first_org
  FROM public.organizations
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_first_org.id IS NOT NULL THEN
    SELECT count(*) INTO v_owner_count
    FROM public.people
    WHERE organization_id = v_first_org.id
      AND org_role = 'OWNER'::public.org_role_type
      AND active = true;

    IF v_owner_count = 0 THEN
      RETURN jsonb_build_object(
        'authenticated', true,
        'person', null,
        'needs_bootstrap', true,
        'target_org_id', v_first_org.id,
        'target_org_name', v_first_org.name
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'person', null,
    'needs_bootstrap', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_state() TO authenticated, anon, service_role;

-- 5. Trigger de Defesa em Profundidade em public.function_assignments
-- Bloqueia INSERT/UPDATE/DELETE feito por não-OWNER
CREATE OR REPLACE FUNCTION public.check_fa_owner_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Permite se for service_role / postgres / background
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verifica se a pessoa logada é OWNER
  IF NOT public.is_current_owner() THEN
    RAISE EXCEPTION 'Permissão negada: apenas o OWNER da organização pode criar, alterar ou remover atribuições de função.'
      USING ERRCODE = '42501';
  END IF;

  -- Garante que o organization_id corresponda à organização do usuário autenticado
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.organization_id := public.current_org_id();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_fa_owner ON public.function_assignments;
CREATE TRIGGER trg_enforce_fa_owner
  BEFORE INSERT OR UPDATE OR DELETE ON public.function_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fa_owner_mutation();

-- 6. Trigger de Defesa em Profundidade em public.people: proteger self-promotion de org_role
CREATE OR REPLACE FUNCTION public.check_people_org_role_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Se org_role está sendo alterado
  IF TG_OP = 'UPDATE' AND (OLD.org_role IS DISTINCT FROM NEW.org_role) THEN
    IF NOT public.is_current_owner() THEN
      RAISE EXCEPTION 'Permissão negada: org_role só pode ser alterado por um OWNER existente.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Não permitir que um não-OWNER insira alguém já com papel de OWNER diretamente
  IF TG_OP = 'INSERT' AND NEW.org_role = 'OWNER'::public.org_role_type THEN
    IF NOT public.is_current_owner() THEN
      RAISE EXCEPTION 'Permissão negada: atribuição de OWNER via inserção direta é proibida. Utilize a função bootstrap_owner.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_people_role ON public.people;
CREATE TRIGGER trg_enforce_people_role
  BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.check_people_org_role_mutation();

-- 7. Habilitar ROW LEVEL SECURITY e FORCE RLS em todas as tabelas operacionais
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people FORCE ROW LEVEL SECURITY;

ALTER TABLE public.function_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contacts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments FORCE ROW LEVEL SECURITY;

-- 8. POLICIES RLS

-- 8.1 ORGANIZATIONS
DROP POLICY IF EXISTS "org_select_own" ON public.organizations;
CREATE POLICY "org_select_own" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id());

DROP POLICY IF EXISTS "org_update_owner" ON public.organizations;
CREATE POLICY "org_update_owner" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.is_current_owner())
  WITH CHECK (id = public.current_org_id() AND public.is_current_owner());

-- 8.2 FUNCTIONS (Funções operacionais da clínica)
DROP POLICY IF EXISTS "functions_select_org" ON public.functions;
CREATE POLICY "functions_select_org" ON public.functions
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "functions_insert_owner" ON public.functions;
CREATE POLICY "functions_insert_owner" ON public.functions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.is_current_owner());

DROP POLICY IF EXISTS "functions_update_owner" ON public.functions;
CREATE POLICY "functions_update_owner" ON public.functions
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_current_owner());

DROP POLICY IF EXISTS "functions_delete_owner" ON public.functions;
CREATE POLICY "functions_delete_owner" ON public.functions
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.3 AREAS
DROP POLICY IF EXISTS "areas_select_org" ON public.areas;
CREATE POLICY "areas_select_org" ON public.areas
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "areas_insert_owner" ON public.areas;
CREATE POLICY "areas_insert_owner" ON public.areas
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.is_current_owner());

DROP POLICY IF EXISTS "areas_update_owner" ON public.areas;
CREATE POLICY "areas_update_owner" ON public.areas
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_current_owner());

DROP POLICY IF EXISTS "areas_delete_owner" ON public.areas;
CREATE POLICY "areas_delete_owner" ON public.areas
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.4 PEOPLE
DROP POLICY IF EXISTS "people_select_org" ON public.people;
CREATE POLICY "people_select_org" ON public.people
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id() 
    OR auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "people_insert_owner" ON public.people;
CREATE POLICY "people_insert_owner" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.is_current_owner()
  );

DROP POLICY IF EXISTS "people_update_owner_or_self" ON public.people;
CREATE POLICY "people_update_owner_or_self" ON public.people
  FOR UPDATE TO authenticated
  USING (
    (organization_id = public.current_org_id() AND public.is_current_owner())
    OR (auth_user_id = auth.uid())
  )
  WITH CHECK (
    (organization_id = public.current_org_id() AND public.is_current_owner())
    OR (auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "people_delete_owner" ON public.people;
CREATE POLICY "people_delete_owner" ON public.people
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.5 FUNCTION_ASSIGNMENTS (Exige OWNER para qualquer mutação)
DROP POLICY IF EXISTS "fa_select_org" ON public.function_assignments;
CREATE POLICY "fa_select_org" ON public.function_assignments
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "fa_insert_owner" ON public.function_assignments;
CREATE POLICY "fa_insert_owner" ON public.function_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.is_current_owner()
  );

DROP POLICY IF EXISTS "fa_update_owner" ON public.function_assignments;
CREATE POLICY "fa_update_owner" ON public.function_assignments
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id() 
    AND public.is_current_owner()
  )
  WITH CHECK (
    organization_id = public.current_org_id() 
    AND public.is_current_owner()
  );

DROP POLICY IF EXISTS "fa_delete_owner" ON public.function_assignments;
CREATE POLICY "fa_delete_owner" ON public.function_assignments
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_org_id() 
    AND public.is_current_owner()
  );

-- 8.6 TASKS (Templates de rotinas operacionais)
DROP POLICY IF EXISTS "tasks_select_org" ON public.tasks;
CREATE POLICY "tasks_select_org" ON public.tasks
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "tasks_insert_org" ON public.tasks;
CREATE POLICY "tasks_insert_org" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "tasks_update_org" ON public.tasks;
CREATE POLICY "tasks_update_org" ON public.tasks
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "tasks_delete_owner" ON public.tasks;
CREATE POLICY "tasks_delete_owner" ON public.tasks
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.7 AGENDA_ITEMS (Ocorrências operacionais)
DROP POLICY IF EXISTS "agenda_select_org" ON public.agenda_items;
CREATE POLICY "agenda_select_org" ON public.agenda_items
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "agenda_insert_org" ON public.agenda_items;
CREATE POLICY "agenda_insert_org" ON public.agenda_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "agenda_update_org" ON public.agenda_items;
CREATE POLICY "agenda_update_org" ON public.agenda_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "agenda_delete_owner" ON public.agenda_items;
CREATE POLICY "agenda_delete_owner" ON public.agenda_items
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.8 LEADS (CRM)
DROP POLICY IF EXISTS "leads_select_org" ON public.leads;
CREATE POLICY "leads_select_org" ON public.leads
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "leads_insert_org" ON public.leads;
CREATE POLICY "leads_insert_org" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "leads_update_org" ON public.leads;
CREATE POLICY "leads_update_org" ON public.leads
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "leads_delete_owner" ON public.leads;
CREATE POLICY "leads_delete_owner" ON public.leads
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.9 LEAD_CONTACTS (Histórico imutável de contatos)
DROP POLICY IF EXISTS "lc_select_org" ON public.lead_contacts;
CREATE POLICY "lc_select_org" ON public.lead_contacts
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "lc_insert_org" ON public.lead_contacts;
CREATE POLICY "lc_insert_org" ON public.lead_contacts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "lc_update_owner" ON public.lead_contacts;
CREATE POLICY "lc_update_owner" ON public.lead_contacts
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_current_owner());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "lc_delete_owner" ON public.lead_contacts;
CREATE POLICY "lc_delete_owner" ON public.lead_contacts
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.10 SCRIPTS (Templates comerciais CRC)
DROP POLICY IF EXISTS "scripts_select_org" ON public.scripts;
CREATE POLICY "scripts_select_org" ON public.scripts
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "scripts_insert_org" ON public.scripts;
CREATE POLICY "scripts_insert_org" ON public.scripts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "scripts_update_org" ON public.scripts;
CREATE POLICY "scripts_update_org" ON public.scripts
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "scripts_delete_owner" ON public.scripts;
CREATE POLICY "scripts_delete_owner" ON public.scripts
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());

-- 8.11 TREATMENTS
DROP POLICY IF EXISTS "treatments_select_org" ON public.treatments;
CREATE POLICY "treatments_select_org" ON public.treatments
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "treatments_insert_org" ON public.treatments;
CREATE POLICY "treatments_insert_org" ON public.treatments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS "treatments_update_org" ON public.treatments;
CREATE POLICY "treatments_update_org" ON public.treatments
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Emenda B: DELETE OWNER-only
DROP POLICY IF EXISTS "treatments_delete_owner" ON public.treatments;
CREATE POLICY "treatments_delete_owner" ON public.treatments
  FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_current_owner());
