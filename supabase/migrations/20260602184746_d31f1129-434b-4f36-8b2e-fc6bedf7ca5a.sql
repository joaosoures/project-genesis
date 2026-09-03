-- Admin function: change user role
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id UUID, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores.';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove other roles for this user to avoid duplicates
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role <> new_role;
END;
$$;

-- Admin function: set subscription status/plan
CREATE OR REPLACE FUNCTION public.admin_set_subscription(
    target_user_id UUID,
    new_status TEXT,
    new_plano TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores.';
    END IF;

    INSERT INTO public.assinaturas (usuario_id, status, plano, valor_mensal)
    VALUES (target_user_id, new_status, new_plano, 0)
    ON CONFLICT (usuario_id) DO UPDATE
    SET status = EXCLUDED.status,
        plano = EXCLUDED.plano,
        atualizado_em = now();
END;
$$;

-- Harden existing admin functions: fix search_path
CREATE OR REPLACE FUNCTION public.toggle_user_ban(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores podem alterar o status de banimento.';
    END IF;

    UPDATE public.profiles
    SET is_banned = NOT COALESCE(is_banned, false)
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores podem resetar dados.';
    END IF;

    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = target_user_id;
    DELETE FROM public.desempenho_cards WHERE usuario_id = target_user_id;
    DELETE FROM public.favoritos WHERE usuario_id = target_user_id;
    DELETE FROM public.historico_estudo WHERE usuario_id = target_user_id;
    DELETE FROM public.material_highlights WHERE user_id = target_user_id;
    DELETE FROM public.material_notes WHERE user_id = target_user_id;
    DELETE FROM public.user_excluded_cards WHERE user_id = target_user_id;
    DELETE FROM public.user_ia_usage WHERE usuario_id = target_user_id;
    DELETE FROM public.user_settings WHERE usuario_id = target_user_id;
    DELETE FROM public.temp_oqs WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_trial(target_user_id UUID, days_to_add INT DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    INSERT INTO public.assinaturas (usuario_id, status, plano, data_fim_trial)
    VALUES (target_user_id, 'trial', 'trial', now() + (days_to_add || ' days')::interval)
    ON CONFLICT (usuario_id) DO UPDATE 
    SET data_fim_trial = COALESCE(public.assinaturas.data_fim_trial, now()) + (days_to_add || ' days')::interval,
        status = 'trial',
        plano = 'trial',
        atualizado_em = now();
END;
$$;

-- Lock down: revoke broad execute, grant only to authenticated (admin check is inside)
REVOKE EXECUTE ON FUNCTION public.admin_set_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_subscription(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_user_ban(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_user_data(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.extend_trial(UUID, INT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_ban(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_trial(UUID, INT) TO authenticated;
