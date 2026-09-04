-- Seed: primeiro usuário administrador (Gerência) para acessar o sistema.
-- Login: vitortati@hotmail.com / Senha: Skip@Pass
DO $$
DECLARE
  admin_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vitortati@hotmail.com') THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'vitortati@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Vitor Tati"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, is_admin, role_ids)
    VALUES (
      admin_id,
      'vitortati@hotmail.com',
      'Vitor Tati',
      true,
      ARRAY['11111111-1111-4111-8111-111111111101'::uuid]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
