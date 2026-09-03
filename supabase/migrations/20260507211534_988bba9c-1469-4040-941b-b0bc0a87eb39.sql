-- Update the admin view to include subscription details using TEXT to avoid enum mismatches in the view
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view WITH (security_invoker = true) AS
SELECT 
  p.id, 
  p.nome, 
  p.email, 
  p.foto_url, 
  p.whatsapp, 
  p.criado_em, 
  p.atualizado_em,
  r.role,
  COALESCE(s.status::text, 'nenhum') as plano_status,
  COALESCE(s.plano::text, 'nenhum') as plano_tipo
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
LEFT JOIN public.assinaturas s ON p.id = s.usuario_id;

-- Ensure is_subscriber handles all valid active states (ativo, trial)
CREATE OR REPLACE FUNCTION public.is_subscriber(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.assinaturas 
    WHERE usuario_id = p_user_id 
    AND status IN ('ativo', 'trial')
    AND expiracao > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
