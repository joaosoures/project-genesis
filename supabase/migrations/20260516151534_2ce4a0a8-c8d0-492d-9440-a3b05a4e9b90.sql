DROP TABLE IF EXISTS public.materiais CASCADE;

CREATE TABLE public.materiais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo_1 TEXT NOT NULL DEFAULT 'PDF',
    link_1 TEXT NOT NULL,
    tipo_2 TEXT DEFAULT 'AUDIO',
    link_2 TEXT,
    especialidade TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3)),
    key_words TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Materiais are viewable by authenticated users" 
ON public.materiais 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage materiais" 
ON public.materiais 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'joaoresende2603@gmail.com');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materiais_updated_at
BEFORE UPDATE ON public.materiais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();