-- Create user_excluded_cards table
CREATE TABLE IF NOT EXISTS public.user_excluded_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.user_excluded_cards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own exclusions"
ON public.user_excluded_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exclusions"
ON public.user_excluded_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exclusions"
ON public.user_excluded_cards FOR DELETE
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_user_excluded_cards_user ON public.user_excluded_cards(user_id);