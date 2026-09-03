DROP FUNCTION IF EXISTS public.aulas_stats();

CREATE OR REPLACE FUNCTION public.aulas_stats()
RETURNS TABLE (
    aula_id UUID,
    nome TEXT,
    especialidade TEXT,
    total INTEGER,
    sem_explicacao INTEGER,
    irregularidades INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS aula_id,
        m.nome,
        m.especialidade::text,
        COUNT(c.id)::integer AS total,
        COUNT(c.id) FILTER (
            WHERE c.explicacao IS NULL 
            OR TRIM(c.explicacao) = '' 
            OR c.explicacao = 'Importado via planilha.'
            OR c.explicacao = 'Explicação não disponível.'
        )::integer AS sem_explicacao,
        COUNT(c.id) FILTER (
            WHERE c.comando IS NULL 
            OR TRIM(c.comando) = ''
            OR c.modo IS NULL
        )::integer AS irregularidades
    FROM public.materiais m
    LEFT JOIN public.cards c ON c.aula_id = m.id
    WHERE m.link_1 IS NOT NULL
      AND m.tipo_1 = 'PDF'
    GROUP BY m.id, m.nome, m.especialidade
    ORDER BY m.nome;
END;
$$;