-- Tabela de marcações (highlights) dos materiais por usuário
CREATE TABLE public.material_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  material_id UUID NOT NULL,
  page_number INTEGER NOT NULL,
  highlighted_text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.material_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own highlights"
  ON public.material_highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own highlights"
  ON public.material_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own highlights"
  ON public.material_highlights FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own highlights"
  ON public.material_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_material_highlights_user_material 
  ON public.material_highlights(user_id, material_id);