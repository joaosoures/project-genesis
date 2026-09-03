-- Allow authenticated users to view IA prompts
CREATE POLICY "ia_prompts_select_auth" ON public.ia_prompts
FOR SELECT TO authenticated USING (true);

-- Allow users to see their own triages
ALTER TABLE public.triagens_aula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "triagens_aula_select_own" ON public.triagens_aula
FOR SELECT TO authenticated USING (auth.uid() = criado_por);

CREATE POLICY "triagens_aula_insert_own" ON public.triagens_aula
FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);

-- Add policy for admins to see everything in triagens_aula if they don't already have one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'triagens_aula' AND policyname = 'triagens_aula_admin_all'
    ) THEN
        CREATE POLICY "triagens_aula_admin_all" ON public.triagens_aula
        FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;
