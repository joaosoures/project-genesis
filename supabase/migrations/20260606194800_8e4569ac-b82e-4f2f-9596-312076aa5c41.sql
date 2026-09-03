
DROP POLICY IF EXISTS "Admins can manage simulados" ON public.simulados;
CREATE POLICY "Admins can manage simulados" ON public.simulados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage questions" ON public.simulado_questoes;
CREATE POLICY "Admins can manage questions" ON public.simulado_questoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own attempts" ON public.simulado_tentativas
  FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own attempts" ON public.simulado_tentativas
  FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);
