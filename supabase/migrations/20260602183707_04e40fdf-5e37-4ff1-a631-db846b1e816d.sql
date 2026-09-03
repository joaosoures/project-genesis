-- Update the admin view to include renewal date
CREATE OR REPLACE VIEW public.admin_users_view AS
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
    COALESCE(s.plano, 'nenhum'::text) AS plano_tipo,
    s.data_fim_trial,
    s.proxima_renovacao
   FROM ((public.profiles p
     LEFT JOIN public.user_roles r ON ((p.id = r.user_id)))
     LEFT JOIN public.assinaturas s ON ((p.id = s.usuario_id)));

GRANT SELECT ON public.admin_users_view TO authenticated;
