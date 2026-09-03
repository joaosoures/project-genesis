CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.desempenho_cards
    WHERE usuario_id = p_user_id
    AND timestamp_ultima >= CURRENT_DATE;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
