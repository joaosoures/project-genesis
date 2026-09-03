-- Adicionar restrição de chave estrangeira para garantir integridade do vínculo com aulas (materiais)
ALTER TABLE public.cards
ADD CONSTRAINT cards_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES public.materiais(id) ON DELETE SET NULL;

-- Remover tabela redundante 'aulas' que não está sendo utilizada
DROP TABLE IF EXISTS public.aulas;

-- Garantir que o índice exista para performance (já existe mas reforçando caso não estivesse lá)
CREATE INDEX IF NOT EXISTS idx_cards_aula_id ON public.cards(aula_id);
