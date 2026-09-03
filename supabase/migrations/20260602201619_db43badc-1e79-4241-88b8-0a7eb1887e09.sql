ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS baralho text;
CREATE INDEX IF NOT EXISTS idx_cards_baralho ON public.cards (criado_por_usuario_id, baralho) WHERE baralho IS NOT NULL;