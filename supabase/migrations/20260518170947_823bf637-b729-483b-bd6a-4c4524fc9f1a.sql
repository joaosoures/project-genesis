-- Adicionar 'saude_mental' ao enum de especialidade
ALTER TYPE public.especialidade ADD VALUE IF NOT EXISTS 'saude_mental';

-- Dropar função antiga para mudar o tipo de retorno
DROP FUNCTION IF EXISTS public.aulas_stats();

-- Recriar a função aulas_stats
CREATE OR REPLACE FUNCTION public.aulas_stats()
RETURNS TABLE(
    aula_id uuid,
    nome text,
    especialidade text,
    total bigint,
    abcde bigint,
    lacuna bigint,
    oq_falta bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS aula_id,
    m.nome,
    m.especialidade::text,
    COUNT(c.id) AS total,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'abcde') AS abcde,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'lacuna') AS lacuna,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'oq_falta') AS oq_falta
  FROM public.materiais m
  LEFT JOIN public.cards c ON c.aula_id = m.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND m.link_1 IS NOT NULL
    AND m.tipo_1 = 'PDF'
  GROUP BY m.id, m.nome, m.especialidade
  ORDER BY m.nome;
$$;
