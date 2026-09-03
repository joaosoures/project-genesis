-- Add is_banned column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Drop and recreate the view to change column structure
DROP VIEW IF EXISTS public.admin_users_view;

CREATE VIEW public.admin_users_view AS
 SELECT p.id,
    p.nome,
    p.email,
    p.foto_url,
    p.whatsapp,
    p.criado_em,
    p.atualizado_em,
    p.is_banned,
    r.role,
    COALESCE(s.status, 'nenhum'::text) AS plano_status,
    COALESCE(s.plano, 'nenhum'::text) AS plano_tipo
   FROM ((profiles p
     LEFT JOIN user_roles r ON ((p.id = r.user_id)))
     LEFT JOIN assinaturas s ON ((p.id = s.usuario_id)));
