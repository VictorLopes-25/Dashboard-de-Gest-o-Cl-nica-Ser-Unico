-- 0. Teardown legado
DROP TABLE IF EXISTS public.contact_history CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.scripts CASCADE;
DROP TABLE IF EXISTS public.dentists CASCADE;
DROP TABLE IF EXISTS public.collaborators CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
-- profiles, auth.users e handle_new_user PRESERVADOS (não tocados)
DROP TYPE IF EXISTS public.recurrence_type CASCADE;
DROP TYPE IF EXISTS public.agenda_item_type CASCADE;
DROP TYPE IF EXISTS public.agenda_item_status CASCADE;
DROP TYPE IF EXISTS public.lead_stage CASCADE;
DROP TYPE IF EXISTS public.lead_origin CASCADE;
DROP TYPE IF EXISTS public.treatment_status CASCADE;

-- 1. Enums
CREATE TYPE public.recurrence_type    AS ENUM ('pontual','diaria','semanal','mensal','data_especifica');
CREATE TYPE public.agenda_item_type   AS ENUM ('tarefa','compromisso','follow_up','pos_venda','pendencia');
CREATE TYPE public.agenda_item_status AS ENUM ('aberto','concluido','cancelado');
CREATE TYPE public.lead_stage         AS ENUM ('novo','avaliacao_agendada','nao_compareceu','avaliacao_realizada','proposta_enviada','fechado','perdido');
CREATE TYPE public.lead_origin        AS ENUM ('indicacao','meta_ads','google','organico','reativacao','campanha','parceiro','outros');
CREATE TYPE public.treatment_status   AS ENUM ('em_andamento','concluido','cancelado');

-- 2. Raiz do tenant e parents
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.people ADD CONSTRAINT uq_people_id_org UNIQUE (id, organization_id);

CREATE TABLE public.functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
ALTER TABLE public.functions ADD CONSTRAINT uq_functions_id_org UNIQUE (id, organization_id);

CREATE TABLE public.function_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  function_id uuid NOT NULL,
  person_id uuid NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fa_function FOREIGN KEY (function_id, organization_id)
    REFERENCES public.functions (id, organization_id),
  CONSTRAINT fk_fa_person FOREIGN KEY (person_id, organization_id)
    REFERENCES public.people (id, organization_id)
);
CREATE UNIQUE INDEX uq_fa_current_occupant
  ON public.function_assignments (function_id)
  WHERE end_date IS NULL AND active;

CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  function_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, function_id, name),
  CONSTRAINT fk_areas_function FOREIGN KEY (function_id, organization_id)
    REFERENCES public.functions (id, organization_id)
);
ALTER TABLE public.areas ADD CONSTRAINT uq_areas_id_org UNIQUE (id, organization_id);

-- 3. Tasks (template)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  function_id uuid,
  area_id uuid,
  title text NOT NULL,
  description text,
  recurrence public.recurrence_type NOT NULL DEFAULT 'diaria',
  recurrence_day integer,
  due_date date,
  default_person_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_tasks_owner CHECK (area_id IS NOT NULL OR function_id IS NOT NULL),
  CONSTRAINT fk_tasks_area FOREIGN KEY (area_id, organization_id)
    REFERENCES public.areas (id, organization_id),
  CONSTRAINT fk_tasks_function FOREIGN KEY (function_id, organization_id)
    REFERENCES public.functions (id, organization_id),
  CONSTRAINT fk_tasks_person FOREIGN KEY (default_person_id, organization_id)
    REFERENCES public.people (id, organization_id)
);

-- 4. Agenda unificada
CREATE TABLE public.agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  type public.agenda_item_type NOT NULL,
  title text NOT NULL,
  due_date date NOT NULL,
  due_time time,
  status public.agenda_item_status NOT NULL DEFAULT 'aberto',
  function_id uuid,
  person_id uuid,
  source_type text,
  source_id uuid,
  notes text,
  feedback text,
  transferred boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_agenda_function FOREIGN KEY (function_id, organization_id)
    REFERENCES public.functions (id, organization_id),
  CONSTRAINT fk_agenda_person FOREIGN KEY (person_id, organization_id)
    REFERENCES public.people (id, organization_id)
);
CREATE UNIQUE INDEX uq_agenda_task_occurrence
  ON public.agenda_items (source_type, source_id, due_date)
  WHERE source_type = 'task';

-- 5. Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  phone text,
  origin public.lead_origin NOT NULL DEFAULT 'outros',
  referred_by_lead_id uuid,
  referred_by_name text,
  campaign text,
  stage public.lead_stage NOT NULL DEFAULT 'novo',
  lost_reason text,
  next_action text,
  next_contact_at date,
  commercial_function_id uuid,
  commercial_person_id uuid,
  evaluator_person_id uuid,
  evaluation_scheduled_at timestamptz,
  evaluation_completed_at timestamptz,
  sale_value numeric(12,2),
  sale_date date,
  closed_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_lead_active_next_action CHECK (
    stage IN ('fechado','perdido') OR next_contact_at IS NOT NULL),
  CONSTRAINT ck_lead_closed CHECK (stage <> 'fechado' OR closed_at IS NOT NULL),
  CONSTRAINT ck_lead_lost CHECK (stage <> 'perdido' OR lost_at IS NOT NULL),
  CONSTRAINT ck_lead_closed_xor_lost CHECK (
    NOT (closed_at IS NOT NULL AND lost_at IS NOT NULL)),
  CONSTRAINT ck_lead_indicacao CHECK (
    origin <> 'indicacao'
    OR referred_by_lead_id IS NOT NULL
    OR referred_by_name IS NOT NULL),
  CONSTRAINT fk_leads_commercial_function FOREIGN KEY (commercial_function_id, organization_id)
    REFERENCES public.functions (id, organization_id),
  CONSTRAINT fk_leads_commercial_person FOREIGN KEY (commercial_person_id, organization_id)
    REFERENCES public.people (id, organization_id),
  CONSTRAINT fk_leads_evaluator FOREIGN KEY (evaluator_person_id, organization_id)
    REFERENCES public.people (id, organization_id)
);

ALTER TABLE public.leads ADD CONSTRAINT uq_leads_id_org UNIQUE (id, organization_id);

ALTER TABLE public.leads ADD CONSTRAINT fk_leads_referred_by
  FOREIGN KEY (referred_by_lead_id, organization_id)
  REFERENCES public.leads (id, organization_id);

-- 6. Histórico de contatos
CREATE TABLE public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  lead_id uuid NOT NULL,
  contact_date timestamptz NOT NULL DEFAULT now(),
  channel text,
  notes text,
  person_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_lc_lead FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_lc_person FOREIGN KEY (person_id, organization_id)
    REFERENCES public.people (id, organization_id)
);

-- 7. Tratamentos
CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  lead_id uuid NOT NULL,
  name text NOT NULL,
  status public.treatment_status NOT NULL DEFAULT 'em_andamento',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_treatment_completed CHECK (status <> 'concluido' OR completed_at IS NOT NULL),
  CONSTRAINT fk_treatment_lead FOREIGN KEY (lead_id, organization_id)
    REFERENCES public.leads (id, organization_id)
);

-- 8. Scripts
CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  content text,
  stage text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Índices
CREATE INDEX idx_agenda_due_status  ON public.agenda_items (organization_id, due_date, status);
CREATE INDEX idx_agenda_person_due  ON public.agenda_items (person_id, due_date);
CREATE INDEX idx_agenda_func_due    ON public.agenda_items (function_id, due_date);
CREATE INDEX idx_leads_stage        ON public.leads (organization_id, stage);
CREATE INDEX idx_leads_next_contact ON public.leads (organization_id, next_contact_at);
CREATE INDEX idx_leads_eval_done    ON public.leads (organization_id, evaluation_completed_at);
CREATE INDEX idx_leads_closed       ON public.leads (organization_id, closed_at);
CREATE INDEX idx_leads_comm_person  ON public.leads (organization_id, commercial_person_id);
CREATE INDEX idx_leads_evaluator    ON public.leads (organization_id, evaluator_person_id);
CREATE INDEX idx_leads_origin       ON public.leads (organization_id, origin);
CREATE INDEX idx_lc_lead_date       ON public.lead_contacts (lead_id, contact_date);
CREATE INDEX idx_lc_person          ON public.lead_contacts (person_id);
CREATE INDEX idx_treat_lead_status  ON public.treatments (lead_id, status);
CREATE INDEX idx_fa_function        ON public.function_assignments (function_id);
CREATE INDEX idx_fa_person          ON public.function_assignments (person_id);

-- 10. Seed estrutural (CORREÇÃO: 'CRC' → 'CRC Comercial')
INSERT INTO public.organizations (name) VALUES ('Ser Único');

INSERT INTO public.functions (organization_id, name, color)
SELECT o.id, v.name, v.color
FROM public.organizations o
CROSS JOIN (VALUES
  ('Gerência',        '#7C3AED'),
  ('Administrativo',  '#2563EB'),
  ('Concierge',       '#DB2777'),
  ('CRC Comercial',   '#0D9488'),
  ('ASB Principal I', '#EA580C'),
  ('ASB Auxiliar',    '#CA8A04'),
  ('Avaliador',       '#059669'),
  ('Dentistas',       '#4F46E5')
) AS v(name, color)
WHERE o.name = 'Ser Único';
