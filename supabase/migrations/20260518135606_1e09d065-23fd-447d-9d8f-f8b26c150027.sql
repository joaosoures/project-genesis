DROP TABLE IF EXISTS public.triagens_aula CASCADE;
ALTER TABLE public.cards DROP COLUMN IF EXISTS triagem_id;
ALTER TABLE public.temp_oqs DROP COLUMN IF EXISTS triagem_id;
DELETE FROM public.ia_prompts WHERE chave IN ('triagem_aula','gerar_lacuna','gerar_oq_falta','gerar_abcde','filtro_solubilidade');