-- Migração inicial — Ser Único (ERP + CRM de clínica odontológica)
-- Cria todas as tabelas necessárias para persistir os dados reais do sistema
-- no Supabase, com RLS habilitado e políticas para usuários autenticados.

-- ------------------------------------------------------------------
-- Funções (cargos) da empresa — independentes das pessoas
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0F766E',
  bg_light TEXT NOT NULL DEFAULT '#CCFBF1',
  text_color TEXT NOT NULL DEFAULT '#0F766E',
  border_color TEXT NOT NULL DEFAULT '#5EEAD4',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Colaboradores (vinculados a uma ou mais funções)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Dentistas (corpo clínico, múltiplas especialidades)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cro TEXT,
  phone TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Tarefas (rotinas por função)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  recurrence TEXT NOT NULL DEFAULT 'Diária',
  assigned_collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Leads (funil de CRM)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'Outro',
  interest TEXT NOT NULL DEFAULT 'Outro',
  stage TEXT NOT NULL DEFAULT 'Novo',
  assigned_to_id UUID,
  assigned_to_name TEXT,
  assigned_to_role TEXT,
  next_action TEXT,
  follow_up_date DATE,
  loss_reason TEXT,
  loss_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Scripts de atendimento (edição restrita a Gerência/Administrativo na UI)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Novo',
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Histórico de contatos (vinculado a leads)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'WhatsApp',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT NOT NULL,
  script_title_used TEXT,
  registered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Perfis de usuários autenticados (Supabase Auth)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  role_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente a cada novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data ->> 'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_role ON public.tasks(role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_contact_history_lead ON public.contact_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem ler qualquer dado do sistema
DROP POLICY IF EXISTS "authenticated_select" ON public.roles;
CREATE POLICY "authenticated_select" ON public.roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.collaborators;
CREATE POLICY "authenticated_select" ON public.collaborators
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.dentists;
CREATE POLICY "authenticated_select" ON public.dentists
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.tasks;
CREATE POLICY "authenticated_select" ON public.tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.leads;
CREATE POLICY "authenticated_select" ON public.leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.scripts;
CREATE POLICY "authenticated_select" ON public.scripts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.contact_history;
CREATE POLICY "authenticated_select" ON public.contact_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select" ON public.profiles;
CREATE POLICY "authenticated_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Escrita: todos os usuários autenticados podem gravar os dados do sistema
DROP POLICY IF EXISTS "authenticated_insert" ON public.roles;
CREATE POLICY "authenticated_insert" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.roles;
CREATE POLICY "authenticated_update" ON public.roles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.roles;
CREATE POLICY "authenticated_delete" ON public.roles
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.collaborators;
CREATE POLICY "authenticated_insert" ON public.collaborators
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.collaborators;
CREATE POLICY "authenticated_update" ON public.collaborators
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.collaborators;
CREATE POLICY "authenticated_delete" ON public.collaborators
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.dentists;
CREATE POLICY "authenticated_insert" ON public.dentists
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.dentists;
CREATE POLICY "authenticated_update" ON public.dentists
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.dentists;
CREATE POLICY "authenticated_delete" ON public.dentists
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.tasks;
CREATE POLICY "authenticated_insert" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.tasks;
CREATE POLICY "authenticated_update" ON public.tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.tasks;
CREATE POLICY "authenticated_delete" ON public.tasks
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.leads;
CREATE POLICY "authenticated_insert" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.leads;
CREATE POLICY "authenticated_update" ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.leads;
CREATE POLICY "authenticated_delete" ON public.leads
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.scripts;
CREATE POLICY "authenticated_insert" ON public.scripts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.scripts;
CREATE POLICY "authenticated_update" ON public.scripts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.scripts;
CREATE POLICY "authenticated_delete" ON public.scripts
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert" ON public.contact_history;
CREATE POLICY "authenticated_insert" ON public.contact_history
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update" ON public.contact_history;
CREATE POLICY "authenticated_update" ON public.contact_history
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete" ON public.contact_history;
CREATE POLICY "authenticated_delete" ON public.contact_history
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_own" ON public.profiles;
CREATE POLICY "authenticated_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "authenticated_update_own" ON public.profiles;
CREATE POLICY "authenticated_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
