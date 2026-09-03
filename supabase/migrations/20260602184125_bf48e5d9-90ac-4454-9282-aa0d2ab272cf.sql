-- Function to toggle ban status safely
CREATE OR REPLACE FUNCTION public.toggle_user_ban(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Only allow if the executing user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem alterar o status de banimento.';
    END IF;

    -- Update the is_banned status (toggle)
    UPDATE public.profiles
    SET is_banned = NOT is_banned
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permission to execute
GRANT EXECUTE ON FUNCTION public.toggle_user_ban(UUID) TO authenticated;
