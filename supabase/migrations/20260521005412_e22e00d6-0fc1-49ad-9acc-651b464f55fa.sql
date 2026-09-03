
-- 1. Adicionar campos em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Função para gerar código curto
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := 'OQM-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Backfill para usuários existentes
UPDATE public.profiles
SET referral_code = public.gen_referral_code()
WHERE referral_code IS NULL;

-- Trigger para gerar código em novos profiles
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- 2. Tabela indicacoes
CREATE TABLE IF NOT EXISTS public.indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id uuid NOT NULL,
  convidado_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente', -- pendente|convertido|recompensado|bloqueado|reembolsado
  cupom_aplicado boolean NOT NULL DEFAULT false,
  valor_credito_brl numeric NOT NULL DEFAULT 28.5,
  stripe_credit_note_id text UNIQUE,
  ip_signup inet,
  ip_pagamento inet,
  convertido_em timestamptz,
  recompensado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (indicador_id <> convidado_id)
);

CREATE INDEX IF NOT EXISTS idx_indicacoes_indicador ON public.indicacoes(indicador_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_convidado ON public.indicacoes(convidado_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_status ON public.indicacoes(status);

ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ind_select_own ON public.indicacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = indicador_id OR auth.uid() = convidado_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Sem políticas de INSERT/UPDATE/DELETE: apenas service role (edge functions) pode escrever.

CREATE OR REPLACE FUNCTION public.touch_indicacoes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_indicacoes ON public.indicacoes;
CREATE TRIGGER trg_touch_indicacoes
BEFORE UPDATE ON public.indicacoes
FOR EACH ROW EXECUTE FUNCTION public.touch_indicacoes();
