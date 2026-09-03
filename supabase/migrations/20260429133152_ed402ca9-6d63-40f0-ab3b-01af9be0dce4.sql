-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');
CREATE TYPE public.modo_oq AS ENUM ('abcde', 'lacuna', 'oq_falta');
CREATE TYPE public.especialidade AS ENUM ('clinica_medica','cirurgia_geral','pediatria','ginecologia_obstetricia','medicina_preventiva');
CREATE TYPE public.origem_card AS ENUM ('admin','usuario','ia_pdf','ia_csv','material_ouro');
CREATE TYPE public.plano AS ENUM ('trial','prata','ouro');
CREATE TYPE public.status_assinatura AS ENUM ('ativo','trial','inadimplente','cancelado');
CREATE TYPE public.tipo_report AS ENUM ('conteudo_incorreto','erro_digitacao','ambiguidade','outro');
CREATE TYPE public.status_report AS ENUM ('pendente','resolvido','ignorado');
CREATE TYPE public.tipo_material AS ENUM ('pdf','audio');
CREATE TYPE public.status_geracao AS ENUM ('processando','concluido','erro');
CREATE TYPE public.prioridade_problema AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.status_problema AS ENUM ('aberto','em_andamento','resolvido');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  foto_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ASSINATURAS
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plano plano NOT NULL DEFAULT 'trial',
  status status_assinatura NOT NULL DEFAULT 'trial',
  data_inicio_trial TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim_trial TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  data_inicio_plano TIMESTAMPTZ,
  data_ultima_cobranca TIMESTAMPTZ,
  dias_inadimplente INTEGER NOT NULL DEFAULT 0,
  excluir_dados_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ass_updated BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "ass_select" ON public.assinaturas FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ass_update" ON public.assinaturas FOR UPDATE TO authenticated USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ass_insert" ON public.assinaturas FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- CARDS
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modo modo_oq NOT NULL,
  especialidade especialidade NOT NULL,
  comando TEXT NOT NULL,
  alternativa_a TEXT, alternativa_b TEXT, alternativa_c TEXT, alternativa_d TEXT, alternativa_e TEXT,
  alternativa_correta CHAR(1),
  info_1 TEXT, var_1 TEXT,
  info_2 TEXT, var_2 TEXT,
  info_3 TEXT, var_3 TEXT,
  info_4 TEXT, var_4 TEXT,
  info_5 TEXT, var_5 TEXT,
  explicacao TEXT NOT NULL,
  peso_importancia INTEGER NOT NULL DEFAULT 5,
  origem origem_card NOT NULL DEFAULT 'admin',
  criado_por_usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verificado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cards_esp ON public.cards(especialidade);
CREATE INDEX idx_cards_ver ON public.cards(verificado);
CREATE INDEX idx_cards_user ON public.cards(criado_por_usuario_id);
CREATE POLICY "cards_select" ON public.cards FOR SELECT TO authenticated
  USING (verificado = true OR criado_por_usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cards_insert" ON public.cards FOR INSERT TO authenticated
  WITH CHECK (criado_por_usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cards_update" ON public.cards FOR UPDATE TO authenticated
  USING (criado_por_usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cards_delete" ON public.cards FOR DELETE TO authenticated
  USING (criado_por_usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- DESEMPENHO
CREATE TABLE public.desempenho_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  contador_vezes INTEGER NOT NULL DEFAULT 0,
  contador_acertos INTEGER NOT NULL DEFAULT 0,
  contador_erros INTEGER NOT NULL DEFAULT 0,
  nivel_pista_ultima INTEGER NOT NULL DEFAULT 0,
  ultima_nota INTEGER,
  score_prioridade NUMERIC NOT NULL DEFAULT 10,
  timestamp_ultima TIMESTAMPTZ,
  proxima_revisao TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, card_id)
);
ALTER TABLE public.desempenho_cards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_des_updated BEFORE UPDATE ON public.desempenho_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_des_user ON public.desempenho_cards(usuario_id);
CREATE INDEX idx_des_score ON public.desempenho_cards(usuario_id, score_prioridade DESC);
CREATE POLICY "des_all" ON public.desempenho_cards FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- FAVORITOS
CREATE TABLE public.favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, card_id)
);
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_all" ON public.favoritos FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- GERACOES_IA
CREATE TABLE public.geracoes_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_arquivo TEXT NOT NULL,
  nome_arquivo TEXT,
  quantidade_solicitada INTEGER NOT NULL,
  quantidade_gerada INTEGER NOT NULL DEFAULT 0,
  usar_distribuicao_ia BOOLEAN NOT NULL DEFAULT true,
  qtd_abcde INTEGER DEFAULT 0,
  qtd_lacuna INTEGER DEFAULT 0,
  qtd_oq_falta INTEGER DEFAULT 0,
  status status_geracao NOT NULL DEFAULT 'processando',
  erro TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geracoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ger_all" ON public.geracoes_ia FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- CARDS PENDENTES
CREATE TABLE public.cards_pendentes_revisao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geracao_id UUID NOT NULL REFERENCES public.geracoes_ia(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  selecionado BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cards_pendentes_revisao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pend_all" ON public.cards_pendentes_revisao FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- REPORTS
CREATE TABLE public.reports_erro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tipo tipo_report NOT NULL,
  comentario TEXT,
  status status_report NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em TIMESTAMPTZ
);
ALTER TABLE public.reports_erro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rep_select" ON public.reports_erro FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rep_insert" ON public.reports_erro FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "rep_update" ON public.reports_erro FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- MATERIAIS
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  especialidade especialidade NOT NULL,
  tipo tipo_material NOT NULL,
  drive_file_id TEXT,
  duracao_audio INTEGER,
  paginas_pdf INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mat_select" ON public.materiais FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mat_admin_all" ON public.materiais FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PROBLEMAS
CREATE TABLE public.problemas_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  origem TEXT NOT NULL DEFAULT 'manual',
  prioridade prioridade_problema NOT NULL DEFAULT 'media',
  status status_problema NOT NULL DEFAULT 'aberto',
  report_id UUID REFERENCES public.reports_erro(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.problemas_admin ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_prob_updated BEFORE UPDATE ON public.problemas_admin FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "prob_admin_all" ON public.problemas_admin FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto_url) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  INSERT INTO public.assinaturas (usuario_id, plano, status) VALUES (NEW.id, 'trial', 'trial');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED — 5 OQs verificados (colunas explícitas)
INSERT INTO public.cards (modo, especialidade, comando, info_1, var_1, info_2, var_2, info_3, var_3, info_4, var_4, info_5, var_5, explicacao, peso_importancia, origem, verificado)
VALUES ('oq_falta','clinica_medica',
'A Pêntade de Reynolds é um conjunto de 5 sinais clínicos indicativos de colangite aguda grave (tóxica).',
'Dor no quadrante superior direito do abdômen','Dor em QSD; Dor abdominal em hipocôndrio direito; Dor HCD',
'Icterícia','Ictericia; Amarelão',
'Febre com calafrios','Febre; Calafrios',
'Hipotensão','Hipotensao; Choque; Pressão baixa',
'Confusão mental','Alteração do nível de consciência; Rebaixamento; Confusao',
'Pêntade de Reynolds = Tríade de Charcot (dor em QSD + icterícia + febre) + hipotensão + confusão mental. Indica colangite aguda supurativa, exigindo descompressão biliar de urgência.',
9,'admin',true);

INSERT INTO public.cards (modo, especialidade, comando, info_1, var_1, info_2, var_2, info_3, var_3, info_4, var_4, explicacao, peso_importancia, origem, verificado)
VALUES ('oq_falta','cirurgia_geral',
'Sinais clássicos da apendicite aguda no exame físico:',
'Sinal de Blumberg','Blumberg; Descompressão dolorosa em FID',
'Sinal de Rovsing','Rovsing',
'Sinal do psoas','Psoas; Sinal de psoas',
'Sinal do obturador','Obturador',
'Esses 4 sinais sugerem irritação peritoneal localizada em fossa ilíaca direita. O ponto doloroso de McBurney também é clássico.',
8,'admin',true);

INSERT INTO public.cards (modo, especialidade, comando, info_1, var_1, explicacao, peso_importancia, origem, verificado)
VALUES ('lacuna','pediatria',
'Primeira medida da reanimação neonatal em RN não vigoroso após o clampeamento do cordão:',
'Ventilação por Pressão Positiva','VPP; Ventilação; Ventilação com pressão positiva',
'A VPP deve ser iniciada nos primeiros 60 segundos de vida ("Minuto de Ouro") em RN com FC<100, apneia ou respiração irregular após passos iniciais.',
10,'admin',true);

INSERT INTO public.cards (modo, especialidade, comando, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, alternativa_correta, explicacao, peso_importancia, origem, verificado)
VALUES ('abcde','ginecologia_obstetricia',
'Gestante de 32 semanas, PA 160x110 mmHg, proteinúria +++, cefaleia e escotomas. Conduta inicial mais adequada:',
'Anti-hipertensivo oral e alta hospitalar',
'Sulfato de magnésio + anti-hipertensivo IV + internação',
'Indução do parto imediata por via vaginal',
'Apenas repouso domiciliar e reavaliação em 48h',
'Cesárea de urgência sem estabilização',
'B',
'Pré-eclâmpsia grave com sinais de iminência de eclâmpsia. Conduta: estabilizar (sulfato de magnésio para neuroproteção, anti-hipertensivo IV) e internar. Resolução da gestação após estabilização, conforme idade gestacional.',
10,'admin',true);

INSERT INTO public.cards (modo, especialidade, comando, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, alternativa_correta, explicacao, peso_importancia, origem, verificado)
VALUES ('abcde','medicina_preventiva',
'Qual indicador epidemiológico expressa o número de óbitos por uma doença em relação ao total de pessoas acometidas por ela?',
'Incidência','Prevalência','Letalidade','Mortalidade','Morbidade','C',
'Letalidade = óbitos pela doença / total de doentes. Mortalidade usa a população total como denominador. Incidência mede casos novos; prevalência mede casos existentes.',
7,'admin',true);