
DROP FUNCTION IF EXISTS public.aulas_stats();

CREATE OR REPLACE FUNCTION public.aulas_stats()
RETURNS TABLE(
  aula_id uuid,
  nome text,
  especialidade text,
  total integer,
  abcde integer,
  lacuna integer,
  oq_falta integer,
  sem_explicacao integer,
  irregularidades integer
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS aula_id,
        m.nome,
        m.especialidade::text,
        COUNT(c.id)::integer AS total,
        COUNT(c.id) FILTER (WHERE c.modo::text = 'abcde')::integer AS abcde,
        COUNT(c.id) FILTER (WHERE c.modo::text = 'lacuna')::integer AS lacuna,
        COUNT(c.id) FILTER (WHERE c.modo::text = 'oq_falta')::integer AS oq_falta,
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
$function$;
