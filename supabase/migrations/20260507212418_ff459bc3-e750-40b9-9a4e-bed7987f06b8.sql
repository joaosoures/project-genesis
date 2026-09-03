CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contamos todas as entradas no histórico (não apenas distintas)
    -- E usamos o fuso horário de Brasília para definir o que é "hoje"
    SELECT COUNT(*) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
    
    RETURN v_count;
END;
$function$;