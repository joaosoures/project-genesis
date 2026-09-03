-- Create study history table
CREATE TABLE IF NOT EXISTS public.historico_estudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    acertou BOOLEAN NOT NULL,
    nota INTEGER NOT NULL,
    nivel_pista INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_estudo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own history" 
ON public.historico_estudo FOR SELECT 
USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own history" 
ON public.historico_estudo FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

-- Update get_daily_progress function
CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count total interactions today in the user's local timezone (or UTC if simple)
    -- Using CURRENT_DATE which is UTC date
    SELECT COUNT(*) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND timestamp >= CURRENT_DATE;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
