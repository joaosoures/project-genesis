CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contamos todas as entradas no histórico
    -- Forçamos o uso do fuso horário de Brasília (UTC-3)
    SELECT COUNT(*) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;
    
    RETURN v_count;
END;
$function$;