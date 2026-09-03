
CREATE TABLE IF NOT EXISTS public.system_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_select_all" ON public.system_flags FOR SELECT USING (true);
CREATE POLICY "flags_admin_write" ON public.system_flags FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.system_flags(key,value) VALUES
  ('cadastros_abertos', 'true'::jsonb),
  ('manutencao', 'false'::jsonb),
  ('geracao_ia', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lista_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  email text NOT NULL,
  whatsapp text,
  mensagem text,
  contatado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "espera_insert_anyone" ON public.lista_espera FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "espera_admin_all" ON public.lista_espera FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
