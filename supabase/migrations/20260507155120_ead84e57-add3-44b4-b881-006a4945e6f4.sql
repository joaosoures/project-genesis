-- Add whatsapp to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Update the view to include whatsapp
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view AS
 SELECT p.id,
    p.nome,
    p.email,
    p.foto_url,
    p.whatsapp,
    p.criado_em,
    ( SELECT user_roles.role
           FROM user_roles
          WHERE user_roles.user_id = p.id
         LIMIT 1) AS role,
    ( SELECT assinaturas.status
           FROM assinaturas
          WHERE assinaturas.usuario_id = p.id
         LIMIT 1) AS plano_status,
    ( SELECT assinaturas.plano
           FROM assinaturas
          WHERE assinaturas.usuario_id = p.id
         LIMIT 1) AS plano_tipo
   FROM profiles p;

-- Create faturamento table
CREATE TABLE IF NOT EXISTS public.faturamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes DATE NOT NULL UNIQUE, -- Store as first day of month
    lucro_total NUMERIC(12,2) DEFAULT 0,
    novas_captacoes INTEGER DEFAULT 0,
    desistencias INTEGER DEFAULT 0,
    inadimplencias INTEGER DEFAULT 0,
    is_projecao BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faturamento ENABLE ROW LEVEL SECURITY;

-- Policies for faturamento (Admins only)
CREATE POLICY "Admins can do everything on faturamento"
ON public.faturamento
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for faturamento
CREATE TRIGGER set_faturamento_updated_at
BEFORE UPDATE ON public.faturamento
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert some dummy data for the dashboard to look good initially if empty
INSERT INTO public.faturamento (mes, lucro_total, novas_captacoes, desistencias, inadimplencias, is_projecao)
VALUES 
(date_trunc('month', now() - interval '3 months'), 15000.00, 45, 2, 1, false),
(date_trunc('month', now() - interval '2 months'), 18500.00, 52, 3, 2, false),
(date_trunc('month', now() - interval '1 month'), 21000.00, 60, 4, 3, false),
(date_trunc('month', now()), 24500.00, 75, 5, 2, false),
(date_trunc('month', now() + interval '1 month'), 28000.00, 85, 6, 2, true)
ON CONFLICT (mes) DO NOTHING;
