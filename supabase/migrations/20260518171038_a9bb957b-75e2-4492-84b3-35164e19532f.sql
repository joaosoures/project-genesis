DROP FUNCTION IF EXISTS public.aulas_stats();

CREATE OR REPLACE FUNCTION public.aulas_stats()
RETURNS TABLE(
    aula_id uuid,
    nome text,
    especialidade text,
    total integer,
    abcde integer,
    lacuna integer,
    oq_falta integer
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS aula_id,
    m.nome,
    m.especialidade::text,
    COUNT(c.id)::integer AS total,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'abcde')::integer AS abcde,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'lacuna')::integer AS lacuna,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'oq_falta')::integer AS oq_falta
  FROM public.materiais m
  LEFT JOIN public.cards c ON c.aula_id = m.id
  WHERE m.link_1 IS NOT NULL
    AND m.tipo_1 = 'PDF'
  GROUP BY m.id, m.nome, m.especialidade
  ORDER BY m.nome;
$$;
