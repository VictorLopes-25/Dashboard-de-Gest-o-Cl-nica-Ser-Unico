-- Migration: Stage 3 CRM/CRC Operational Layer additions
-- Adds missing operational fields to leads and lead_contacts
-- Preserves existing lead_stage enum and existing constraints

-- 1. Add missing fields to public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS interest TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Add missing fields to public.lead_contacts
ALTER TABLE public.lead_contacts
  ADD COLUMN IF NOT EXISTS function_id UUID,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

-- 3. Foreign key on lead_contacts.function_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_lc_function'
  ) THEN
    ALTER TABLE public.lead_contacts
      ADD CONSTRAINT fk_lc_function
      FOREIGN KEY (function_id, organization_id)
      REFERENCES public.functions(id, organization_id);
  END IF;
END $$;

-- 4. Indexes for CRM/CRC query efficiency
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads (organization_id, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON public.leads (organization_id, last_contact_at);
CREATE INDEX IF NOT EXISTS idx_leads_comm_function ON public.leads (organization_id, commercial_function_id);
CREATE INDEX IF NOT EXISTS idx_lc_function ON public.lead_contacts (function_id);
CREATE INDEX IF NOT EXISTS idx_lc_created_at ON public.lead_contacts (lead_id, created_at DESC);

-- 5. Seed standard operational scripts if table is empty
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Ser Único' LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  END IF;

  IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.scripts WHERE organization_id = v_org_id LIMIT 1) THEN
      INSERT INTO public.scripts (organization_id, title, content, stage, active, updated_at) VALUES
      (
        v_org_id,
        '1º Contato WhatsApp — Boas-vindas e Acolhimento',
        'Olá, [Nome do Paciente]! Tudo bem? Aqui é a equipe de acolhimento da Ser Único Odontologia. Recebemos seu contato com interesse em nossos tratamentos e gostaríamos de entender como podemos te ajudar a conquistar seu melhor sorriso. Qual o melhor horário para conversarmos?',
        'novo',
        true,
        NOW()
      ),
      (
        v_org_id,
        'Confirmação de Avaliação Clínica',
        'Olá, [Nome do Paciente]! Tudo bem? Passando para confirmar seu horário de avaliação clínica agendado na Ser Único. Nossa equipe clínica e o Dr(a) já reservaram seu horário com muito carinho. Podemos confirmar sua presença?',
        'avaliacao_agendada',
        true,
        NOW()
      ),
      (
        v_org_id,
        'Reagendamento — Paciente Não Compareceu',
        'Olá, [Nome do Paciente]! Sentimos sua falta hoje na Ser Único. Sabemos que imprevistos acontecem! Como prezamos muito pela sua saúde bucal, gostaríamos de reagendar seu atendimento para esta semana. Qual dia fica mais confortável para você?',
        'nao_compareceu',
        true,
        NOW()
      ),
      (
        v_org_id,
        'Follow-up Pós-Avaliação Clínica',
        'Olá, [Nome do Paciente]! Tudo bem após a sua avaliação com nosso dentista avaliador? Ficou alguma dúvida sobre o diagnóstico ou o plano de cuidado apresentado? Estamos à disposição para esclarecer qualquer detalhe!',
        'avaliacao_realizada',
        true,
        NOW()
      ),
      (
        v_org_id,
        'Follow-up de Proposta Comercial',
        'Olá, [Nome do Paciente]! Tudo bem? Gostaria de saber se você conseguiu analisar a proposta e as condições de pagamento que conversamos. Temos condições especiais válidas para este mês para darmos início ao seu tratamento.',
        'proposta_enviada',
        true,
        NOW()
      ),
      (
        v_org_id,
        'Boas-vindas — Tratamento Fechado',
        'Parabéns, [Nome do Paciente]! É uma alegria imensa ter você como nosso paciente na Ser Único Odontologia. Nosso time de especialistas cuidará de cada detalhe com a máxima excelência e conforto.',
        'fechado',
        true,
        NOW()
      );
    END IF;
  END IF;
END $$;
