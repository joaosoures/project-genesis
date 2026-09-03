CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contamos todas as entradas no histórico para o dia atual no fuso de Brasília
    -- O timestamp no banco é TIMESTAMPTZ (UTC), então convertemos para America/Sao_Paulo
    -- e comparamos com a data atual também em America/Sao_Paulo.
    SELECT COUNT(*) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND (timezone('America/Sao_Paulo', timestamp))::date = (timezone('America/Sao_Paulo', now()))::date;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_daily_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(UUID) TO service_role;