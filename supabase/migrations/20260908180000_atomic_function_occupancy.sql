-- Migração: Função atômica RPC para atribuição e substituição segura de ocupante de função
-- Garante atomicidade: se fechar o ocupante anterior e falhar o novo, faz rollback completo.
-- Enforça regras: OWNER-only, mesma organização, integridade histórica (active=false, end_date=CURRENT_DATE).

CREATE OR REPLACE FUNCTION public.replace_function_occupant(
  p_function_id uuid,
  p_new_person_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
DECLARE
  v_org_id uuid;
  v_is_owner boolean;
  v_function_rec record;
  v_new_person_rec record;
  v_current_assignment record;
  v_new_assignment_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  -- 1. Determinar organização do chamador
  v_org_id := public.current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui organização ativa vinculada.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verificar se o chamador é OWNER
  v_is_owner := public.is_current_owner();
  IF NOT v_is_owner AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Permissão negada: apenas o OWNER pode atribuir ou substituir ocupante de função.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validar se a função existe e pertence à mesma organização
  SELECT * INTO v_function_rec
  FROM public.functions
  WHERE id = p_function_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Função % não encontrada na organização do usuário.', p_function_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Validar se a nova pessoa existe, pertence à mesma organização e está ativa
  SELECT * INTO v_new_person_rec
  FROM public.people
  WHERE id = p_new_person_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador % não encontrado na organização do usuário.', p_new_person_id
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_new_person_rec.active THEN
    RAISE EXCEPTION 'Colaborador % está inativo e não pode assumir uma função ativa.', v_new_person_rec.name
      USING ERRCODE = '23514';
  END IF;

  -- 5. Buscar ocupante ativo atual da função
  SELECT * INTO v_current_assignment
  FROM public.function_assignments
  WHERE function_id = p_function_id
    AND organization_id = v_org_id
    AND active = true
    AND end_date IS NULL
  FOR UPDATE;

  -- Se a mesma pessoa já é a ocupante ativa, idempotência: retorna sucesso
  IF FOUND AND v_current_assignment.person_id = p_new_person_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_occupant', true,
      'assignment_id', v_current_assignment.id,
      'function_id', p_function_id,
      'person_id', p_new_person_id
    );
  END IF;

  -- 6. Se houver ocupante atual diferente, encerrar assignment anterior (active = false, end_date = v_today)
  IF FOUND THEN
    UPDATE public.function_assignments
    SET
      active = false,
      end_date = v_today
    WHERE id = v_current_assignment.id;
  END IF;

  -- 7. Criar novo assignment ativo para a nova pessoa
  INSERT INTO public.function_assignments (
    organization_id,
    function_id,
    person_id,
    start_date,
    end_date,
    active
  ) VALUES (
    v_org_id,
    p_function_id,
    p_new_person_id,
    v_today,
    NULL,
    true
  )
  RETURNING id INTO v_new_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_occupant', false,
    'assignment_id', v_new_assignment_id,
    'function_id', p_function_id,
    'new_person_id', p_new_person_id,
    'previous_person_id', CASE WHEN v_current_assignment.person_id IS NOT NULL THEN v_current_assignment.person_id ELSE NULL END
  );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.replace_function_occupant(uuid, uuid) TO authenticated;
