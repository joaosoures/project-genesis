-- Function to reset user data (Clear Cache)
CREATE OR REPLACE FUNCTION public.reset_user_data(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Only allow if the executing user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem resetar dados.';
    END IF;

    -- Delete data from all analytical and study tables
    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = target_user_id;
    DELETE FROM public.desempenho_cards WHERE usuario_id = target_user_id;
    DELETE FROM public.favoritos WHERE usuario_id = target_user_id;
    DELETE FROM public.historico_estudo WHERE usuario_id = target_user_id;
    DELETE FROM public.material_highlights WHERE usuario_id = target_user_id;
    DELETE FROM public.material_notes WHERE usuario_id = target_user_id;
    DELETE FROM public.user_excluded_cards WHERE usuario_id = target_user_id;
    DELETE FROM public.user_ia_usage WHERE user_id = target_user_id;
    DELETE FROM public.user_settings WHERE user_id = target_user_id;
    DELETE FROM public.temp_oqs WHERE usuario_id = target_user_id;
    
    -- Optional: Reset subscription status to trial if needed, or leave as is
    -- For now we just clear the "cache" (progress)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend trial
CREATE OR REPLACE FUNCTION public.extend_trial(target_user_id UUID, days_to_add INT DEFAULT 7)
RETURNS void AS $$
BEGIN
    -- Only allow if the executing user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Update or insert trial info
    INSERT INTO public.assinaturas (usuario_id, status, plano, data_fim_trial)
    VALUES (target_user_id, 'trial', 'trial', now() + (days_to_add || ' days')::interval)
    ON CONFLICT (usuario_id) DO UPDATE 
    SET data_fim_trial = COALESCE(public.assinaturas.data_fim_trial, now()) + (days_to_add || ' days')::interval,
        status = 'trial',
        plano = 'trial',
        atualizado_em = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the admin view to include trial end date
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
    s.data_fim_trial
   FROM ((public.profiles p
     LEFT JOIN public.user_roles r ON ((p.id = r.user_id)))
     LEFT JOIN public.assinaturas s ON ((p.id = s.usuario_id)));

-- Ensure grants for the view and functions
GRANT SELECT ON public.admin_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_trial(UUID, INT) TO authenticated;
