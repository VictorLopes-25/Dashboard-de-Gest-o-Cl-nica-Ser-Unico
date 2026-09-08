-- Migration: 20260908160000_bootstrap_first_owner_access.sql
-- FIX BOOTSTRAP BUG — FIRST_OWNER_BOOTSTRAP_NOT_ACCESSIBLE
-- Allows legitimate initial OWNER setup when organization has ZERO active OWNERs.
-- Invariants preserved:
-- 1. Single-use per organization, transaction-safe (FOR UPDATE lock on organizations).
-- 2. DENIED if any active OWNER already exists in the organization.
-- 3. Impossible to use for self-promotion or duplicate bootstrap once an OWNER exists.
-- 4. No permanent public signup enabled: this path is strictly gated by (owner_count = 0).

-- 1. Function to inspect bootstrap eligibility without requiring prior authentication
CREATE OR REPLACE FUNCTION public.get_bootstrap_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_first_org record;
  v_owner_count integer;
BEGIN
  -- Identifica a primeira organização
  SELECT id, name INTO v_first_org
  FROM public.organizations
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_first_org.id IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Nenhuma organização cadastrada'
    );
  END IF;

  -- Conta quantos OWNERs ativos existem
  SELECT count(*) INTO v_owner_count
  FROM public.people
  WHERE organization_id = v_first_org.id
    AND org_role = 'OWNER'::public.org_role_type
    AND active = true;

  IF v_owner_count = 0 THEN
    RETURN jsonb_build_object(
      'available', true,
      'target_org_id', v_first_org.id,
      'target_org_name', v_first_org.name,
      'owner_count', 0
    );
  ELSE
    RETURN jsonb_build_object(
      'available', false,
      'target_org_id', v_first_org.id,
      'target_org_name', v_first_org.name,
      'owner_count', v_owner_count
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bootstrap_status() TO anon, authenticated, service_role;

-- 2. Update get_auth_state to return bootstrap availability even when anon/not logged in
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
  -- Obter a primeira organização cadastrada
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
  ELSE
    v_owner_count := 1; -- Bloqueia bootstrap se não houver org
  END IF;

  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'person', null,
      'needs_bootstrap', (v_owner_count = 0),
      'target_org_id', v_first_org.id,
      'target_org_name', v_first_org.name
    );
  END IF;

  -- Usuário autenticado: verificar se já possui person vinculada
  SELECT * INTO v_person
  FROM public.people
  WHERE auth_user_id = v_auth_uid;

  IF v_person.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'person', row_to_json(v_person),
      'active', v_person.active,
      'needs_bootstrap', false,
      'target_org_id', v_person.organization_id
    );
  END IF;

  -- Se autenticado mas sem person: pode fazer bootstrap se não houver OWNER
  IF v_owner_count = 0 THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'person', null,
      'needs_bootstrap', true,
      'target_org_id', v_first_org.id,
      'target_org_name', v_first_org.name
    );
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'person', null,
    'needs_bootstrap', false,
    'target_org_id', v_first_org.id,
    'target_org_name', v_first_org.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_state() TO anon, authenticated, service_role;

-- 3. Procedure/Function segura para registro do primeiro OWNER (zero-OWNER bootstrap)
-- Cria ou atualiza as credenciais do auth.user de forma segura e atômica,
-- cria/vincula a public.people com org_role = 'OWNER', sob lock exclusivo na organization.
CREATE OR REPLACE FUNCTION public.bootstrap_initial_owner(
  target_org_id uuid,
  owner_name text,
  owner_email text,
  owner_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_org_name text;
  v_owner_count integer;
  v_user_id uuid;
  v_person_id uuid;
  v_clean_email text;
  v_clean_name text;
  v_clean_password text;
BEGIN
  v_clean_email := lower(trim(owner_email));
  v_clean_name := trim(owner_name);
  v_clean_password := trim(owner_password);

  -- Validações básicas de entrada
  IF v_clean_email = '' OR position('@' in v_clean_email) = 0 THEN
    RAISE EXCEPTION 'E-mail inválido para o primeiro OWNER.'
      USING ERRCODE = '22023';
  END IF;

  IF length(v_clean_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 6 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Nome completo do primeiro OWNER é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  -- 1. Obter lock transacional exclusivo na organização alvo para evitar corrida
  SELECT name INTO v_org_name
  FROM public.organizations
  WHERE id = target_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. INVARIANTE FUNDAMENTAL: Se a organização já tem QUALQUER OWNER ativo, rejeitar imediatamente
  SELECT count(*) INTO v_owner_count
  FROM public.people
  WHERE organization_id = target_org_id
    AND org_role = 'OWNER'::public.org_role_type
    AND active = true;

  IF v_owner_count > 0 THEN
    RAISE EXCEPTION 'Bootstrap rejeitado: a organização já possui um OWNER ativo.'
      USING ERRCODE = '23505';
  END IF;

  -- 3. Criar ou reutilizar o usuário em auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_clean_email;

  IF v_user_id IS NOT NULL THEN
    -- Usuário já existe no auth: atualiza a senha criptografada e confirma o e-mail
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_clean_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', v_clean_name),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, '')
    WHERE id = v_user_id;
  ELSE
    -- Cria novo auth.user seguindo todas as regras de GoTrue (tokens como '', phone como NULL)
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_clean_email,
      extensions.crypt(v_clean_password, extensions.gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('name', v_clean_name),
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    );
  END IF;

  -- 4. Criar ou atualizar perfil público (public.profiles)
  INSERT INTO public.profiles (id, email, name, is_admin)
  VALUES (v_user_id, v_clean_email, v_clean_name, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        is_admin = true;

  -- 5. Vincular ou criar registro de pessoa (public.people) com papel OWNER
  SELECT id INTO v_person_id
  FROM public.people
  WHERE auth_user_id = v_user_id;

  IF v_person_id IS NOT NULL THEN
    UPDATE public.people
    SET organization_id = target_org_id,
        name = v_clean_name,
        org_role = 'OWNER'::public.org_role_type,
        active = true
    WHERE id = v_person_id;
  ELSE
    INSERT INTO public.people (
      organization_id,
      name,
      auth_user_id,
      org_role,
      active
    ) VALUES (
      target_org_id,
      v_clean_name,
      v_user_id,
      'OWNER'::public.org_role_type,
      true
    )
    RETURNING id INTO v_person_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'person_id', v_person_id,
    'organization_id', target_org_id,
    'organization_name', v_org_name,
    'email', v_clean_email,
    'org_role', 'OWNER'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_initial_owner(uuid, text, text, text) TO anon, authenticated, service_role;
