CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'usuario'
);

CREATE TYPE public.especialidade AS ENUM (
    'clinica_medica',
    'cirurgia_geral',
    'pediatria',
    'ginecologia_obstetricia',
    'medicina_preventiva',
    'saude_mental'
);

CREATE TYPE public.modo_oq AS ENUM (
    'abcde',
    'lacuna',
    'oq_falta'
);

CREATE TYPE public.origem_card AS ENUM (
    'admin',
    'usuario',
    'ia_pdf',
    'ia_csv',
    'material_ouro'
);

CREATE TYPE public.plano AS ENUM (
    'trial',
    'prata',
    'ouro'
);

CREATE TYPE public.prioridade_problema AS ENUM (
    'baixa',
    'media',
    'alta',
    'critica'
);

CREATE TYPE public.status_assinatura AS ENUM (
    'ativo',
    'trial',
    'inadimplente',
    'cancelado'
);

CREATE TYPE public.status_geracao AS ENUM (
    'processando',
    'concluido',
    'erro'
);

CREATE TYPE public.status_problema AS ENUM (
    'aberto',
    'em_andamento',
    'resolvido'
);

CREATE TYPE public.status_report AS ENUM (
    'pendente',
    'resolvido',
    'ignorado'
);

CREATE TYPE public.tipo_material AS ENUM (
    'pdf',
    'audio'
);

CREATE TYPE public.tipo_report AS ENUM (
    'conteudo_incorreto',
    'erro_digitacao',
    'ambiguidade',
    'outro'
);

CREATE TABLE public.assinaturas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    plano text DEFAULT 'trial'::text NOT NULL,
    status text DEFAULT 'trial'::text NOT NULL,
    data_inicio_trial timestamp with time zone DEFAULT now() NOT NULL,
    data_fim_trial timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    data_inicio_plano timestamp with time zone,
    data_ultima_cobranca timestamp with time zone,
    dias_inadimplente integer DEFAULT 0 NOT NULL,
    excluir_dados_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    valor_mensal numeric DEFAULT 0 NOT NULL,
    metodo_pagamento text,
    proxima_renovacao timestamp with time zone,
    data_inadimplencia timestamp with time zone,
    stripe_subscription_id text,
    stripe_customer_id text,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    data_congelamento timestamp with time zone,
    aviso_pre_exclusao_enviado_em timestamp with time zone,
    email_trial_enviado_em timestamp with time zone,
    email_congelamento_enviado_em timestamp with time zone,
    CONSTRAINT assinaturas_plano_check CHECK ((plano = ANY (ARRAY['trial'::text, 'gratis'::text, 'prata'::text, 'ouro'::text]))),
    CONSTRAINT assinaturas_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'ativo'::text, 'inadimplente'::text, 'cancelado'::text, 'expirado'::text])))
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text DEFAULT ''::text NOT NULL,
    email text NOT NULL,
    foto_url text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    whatsapp text,
    onboarding_completed boolean DEFAULT false NOT NULL,
    onboarding_skipped boolean DEFAULT false NOT NULL,
    objetivo_principal text,
    onboarding_completed_at timestamp with time zone,
    referral_code text,
    referred_by uuid,
    is_banned boolean DEFAULT false
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.api_keys_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text DEFAULT 'lovable_gateway'::text NOT NULL,
    key_value text NOT NULL,
    label text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    last_used_at timestamp with time zone,
    error_count integer DEFAULT 0,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.materiais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo_1 text DEFAULT 'PDF'::text NOT NULL,
    link_1 text NOT NULL,
    tipo_2 text DEFAULT 'AUDIO'::text,
    link_2 text,
    especialidade text NOT NULL,
    tier integer DEFAULT 2 NOT NULL,
    key_words text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT materiais_tier_check CHECK ((tier = ANY (ARRAY[1, 2, 3])))
);

CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modo public.modo_oq NOT NULL,
    especialidade public.especialidade NOT NULL,
    comando text NOT NULL,
    alternativa_a text,
    alternativa_b text,
    alternativa_c text,
    alternativa_d text,
    alternativa_e text,
    alternativa_correta character(1),
    info_1 text,
    var_1 text,
    info_2 text,
    var_2 text,
    info_3 text,
    var_3 text,
    info_4 text,
    var_4 text,
    info_5 text,
    var_5 text,
    explicacao text NOT NULL,
    peso_importancia integer DEFAULT 5 NOT NULL,
    origem public.origem_card DEFAULT 'admin'::public.origem_card NOT NULL,
    criado_por_usuario_id uuid,
    verificado boolean DEFAULT false NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    aula_id uuid,
    baralho text
);

CREATE TABLE public.geracoes_ia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    tipo_arquivo text NOT NULL,
    nome_arquivo text,
    quantidade_solicitada integer NOT NULL,
    quantidade_gerada integer DEFAULT 0 NOT NULL,
    usar_distribuicao_ia boolean DEFAULT true NOT NULL,
    qtd_abcde integer DEFAULT 0,
    qtd_lacuna integer DEFAULT 0,
    qtd_oq_falta integer DEFAULT 0,
    status public.status_geracao DEFAULT 'processando'::public.status_geracao NOT NULL,
    erro text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cards_pendentes_revisao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    geracao_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    payload jsonb NOT NULL,
    selecionado boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.desempenho_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    card_id uuid NOT NULL,
    contador_vezes integer DEFAULT 0 NOT NULL,
    contador_acertos integer DEFAULT 0 NOT NULL,
    contador_erros integer DEFAULT 0 NOT NULL,
    nivel_pista_ultima integer DEFAULT 0 NOT NULL,
    ultima_nota integer,
    score_prioridade numeric DEFAULT 10 NOT NULL,
    timestamp_ultima timestamp with time zone,
    proxima_revisao timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.faturamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mes date NOT NULL,
    lucro_total numeric(12,2) DEFAULT 0,
    novas_captacoes integer DEFAULT 0,
    desistencias integer DEFAULT 0,
    inadimplencias integer DEFAULT 0,
    is_projecao boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE public.favoritos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    card_id uuid NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.historico_estudo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    card_id uuid NOT NULL,
    acertou boolean NOT NULL,
    nota integer NOT NULL,
    nivel_pista integer DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ia_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chave text NOT NULL,
    prompt text NOT NULL,
    modelo_padrao text DEFAULT 'google/gemini-2.5-flash'::text NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_por uuid
);

CREATE TABLE public.indicacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicador_id uuid NOT NULL,
    convidado_id uuid NOT NULL,
    status text DEFAULT 'pendente'::text NOT NULL,
    cupom_aplicado boolean DEFAULT false NOT NULL,
    valor_credito_brl numeric DEFAULT 28.5 NOT NULL,
    stripe_credit_note_id text,
    ip_signup inet,
    ip_pagamento inet,
    convertido_em timestamp with time zone,
    recompensado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT no_self_referral CHECK ((indicador_id <> convidado_id))
);

CREATE TABLE public.lista_espera (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text,
    email text NOT NULL,
    whatsapp text,
    mensagem text,
    contatado boolean DEFAULT false NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.material_highlights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    material_id uuid NOT NULL,
    page_number integer NOT NULL,
    highlighted_text text NOT NULL,
    color text DEFAULT 'yellow'::text NOT NULL,
    "position" jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.material_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    material_id uuid NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pagamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    valor numeric NOT NULL,
    plano text NOT NULL,
    status text DEFAULT 'pago'::text NOT NULL,
    metodo text,
    data_pagamento timestamp with time zone DEFAULT now() NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pagamentos_status_check CHECK ((status = ANY (ARRAY['pago'::text, 'falhou'::text, 'pendente'::text, 'reembolsado'::text])))
);

CREATE TABLE public.reports_erro (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    card_id uuid NOT NULL,
    tipo public.tipo_report NOT NULL,
    comentario text,
    status public.status_report DEFAULT 'pendente'::public.status_report NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    resolvido_em timestamp with time zone
);

CREATE TABLE public.problemas_admin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descricao text,
    origem text DEFAULT 'manual'::text NOT NULL,
    prioridade public.prioridade_problema DEFAULT 'media'::public.prioridade_problema NOT NULL,
    status public.status_problema DEFAULT 'aberto'::public.status_problema NOT NULL,
    report_id uuid,
    card_id uuid,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.simulados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    especialidade text,
    criado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.simulado_questoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulado_id uuid,
    especialidade text,
    comando text NOT NULL,
    opcao_a text,
    opcao_b text,
    opcao_c text,
    opcao_d text,
    opcao_e text,
    gabarito character(1) NOT NULL,
    explicacao_1 text,
    explicacao_2 text,
    explicacao_3 text,
    ordem integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.simulado_tentativas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulado_id uuid,
    usuario_id uuid,
    acertos integer DEFAULT 0,
    erros integer DEFAULT 0,
    total_questoes integer DEFAULT 0,
    concluido_em timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.simulado_respostas_aluno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tentativa_id uuid,
    questao_id uuid,
    resposta_marcada character(1),
    acertou boolean,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.system_flags (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.temp_oqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pergunta text NOT NULL,
    resposta text NOT NULL,
    modo text NOT NULL,
    opcoes jsonb,
    especialidade text NOT NULL,
    contexto_origem text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    explicacao text,
    variacoes text,
    aula_id uuid,
    modelo_ia text,
    etapa_filtro_status text,
    etapa_filtro_motivo text,
    ponto_id text,
    CONSTRAINT temp_oqs_modo_check CHECK ((modo = ANY (ARRAY['abcde'::text, 'lacuna'::text, 'oq_falta'::text])))
);

CREATE TABLE public.user_excluded_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_ia_usage (
    usuario_id uuid NOT NULL,
    count_today integer DEFAULT 0,
    last_reset timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_settings (
    usuario_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now()
);

CREATE VIEW public.admin_users_view WITH (security_invoker='true') AS
 SELECT p.id,
    p.nome,
    p.email,
    p.foto_url,
    p.whatsapp,
    p.criado_em,
    p.atualizado_em,
    p.is_banned,
    r.role,
    COALESCE(s.status, 'nenhum'::text) AS plano_status,
    COALESCE(s.plano, 'nenhum'::text) AS plano_tipo,
    s.data_fim_trial,
    s.proxima_renovacao
   FROM ((public.profiles p
     LEFT JOIN public.user_roles r ON ((p.id = r.user_id)))
     LEFT JOIN public.assinaturas s ON ((p.id = s.usuario_id)));

CREATE VIEW public.indicacoes_safe WITH (security_invoker='true') AS
 SELECT id,
    indicador_id,
    convidado_id,
    status,
    cupom_aplicado,
    valor_credito_brl,
    stripe_credit_note_id,
    convertido_em,
    recompensado_em,
    criado_em,
    atualizado_em
   FROM public.indicacoes;

ALTER TABLE ONLY public.api_keys_pool
    ADD CONSTRAINT api_keys_pool_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_usuario_id_key UNIQUE (usuario_id);
ALTER TABLE ONLY public.cards_pendentes_revisao
    ADD CONSTRAINT cards_pendentes_revisao_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.desempenho_cards
    ADD CONSTRAINT desempenho_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.desempenho_cards
    ADD CONSTRAINT desempenho_cards_usuario_id_card_id_key UNIQUE (usuario_id, card_id);
ALTER TABLE ONLY public.faturamento
    ADD CONSTRAINT faturamento_mes_key UNIQUE (mes);
ALTER TABLE ONLY public.faturamento
    ADD CONSTRAINT faturamento_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_usuario_id_card_id_key UNIQUE (usuario_id, card_id);
ALTER TABLE ONLY public.geracoes_ia
    ADD CONSTRAINT geracoes_ia_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.historico_estudo
    ADD CONSTRAINT historico_estudo_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ia_prompts
    ADD CONSTRAINT ia_prompts_chave_key UNIQUE (chave);
ALTER TABLE ONLY public.ia_prompts
    ADD CONSTRAINT ia_prompts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.indicacoes
    ADD CONSTRAINT indicacoes_convidado_id_key UNIQUE (convidado_id);
ALTER TABLE ONLY public.indicacoes
    ADD CONSTRAINT indicacoes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.indicacoes
    ADD CONSTRAINT indicacoes_stripe_credit_note_id_key UNIQUE (stripe_credit_note_id);
ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.materiais
    ADD CONSTRAINT materiais_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.material_highlights
    ADD CONSTRAINT material_highlights_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.material_notes
    ADD CONSTRAINT material_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.material_notes
    ADD CONSTRAINT material_notes_user_id_material_id_key UNIQUE (user_id, material_id);
ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.problemas_admin
    ADD CONSTRAINT problemas_admin_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
ALTER TABLE ONLY public.reports_erro
    ADD CONSTRAINT reports_erro_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.simulado_respostas_aluno
    ADD CONSTRAINT simulado_respostas_aluno_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.simulado_tentativas
    ADD CONSTRAINT simulado_tentativas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.simulados
    ADD CONSTRAINT simulados_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_flags
    ADD CONSTRAINT system_flags_pkey PRIMARY KEY (key);
ALTER TABLE ONLY public.temp_oqs
    ADD CONSTRAINT temp_oqs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_excluded_cards
    ADD CONSTRAINT user_excluded_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_excluded_cards
    ADD CONSTRAINT user_excluded_cards_user_id_card_id_key UNIQUE (user_id, card_id);
ALTER TABLE ONLY public.user_ia_usage
    ADD CONSTRAINT user_ia_usage_pkey PRIMARY KEY (usuario_id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (usuario_id);

CREATE INDEX idx_assinaturas_paddle_sub ON public.assinaturas USING btree (stripe_subscription_id);
CREATE INDEX idx_assinaturas_usuario_id ON public.assinaturas USING btree (usuario_id);
CREATE INDEX idx_cards_aula_id ON public.cards USING btree (aula_id);
CREATE INDEX idx_cards_baralho ON public.cards USING btree (criado_por_usuario_id, baralho) WHERE (baralho IS NOT NULL);
CREATE INDEX idx_cards_esp ON public.cards USING btree (especialidade);
CREATE INDEX idx_cards_user ON public.cards USING btree (criado_por_usuario_id);
CREATE INDEX idx_cards_ver ON public.cards USING btree (verificado);
CREATE INDEX idx_des_score ON public.desempenho_cards USING btree (usuario_id, score_prioridade DESC);
CREATE INDEX idx_des_user ON public.desempenho_cards USING btree (usuario_id);
CREATE INDEX idx_indicacoes_convidado ON public.indicacoes USING btree (convidado_id);
CREATE INDEX idx_indicacoes_indicador ON public.indicacoes USING btree (indicador_id);
CREATE INDEX idx_indicacoes_status ON public.indicacoes USING btree (status);
CREATE INDEX idx_material_highlights_user_material ON public.material_highlights USING btree (user_id, material_id);
CREATE INDEX idx_pagamentos_usuario ON public.pagamentos USING btree (usuario_id, data_pagamento DESC);
CREATE INDEX idx_user_excluded_cards_user ON public.user_excluded_cards USING btree (user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES public.materiais(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_criado_por_usuario_id_fkey FOREIGN KEY (criado_por_usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.cards_pendentes_revisao
    ADD CONSTRAINT cards_pendentes_revisao_geracao_id_fkey FOREIGN KEY (geracao_id) REFERENCES public.geracoes_ia(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cards_pendentes_revisao
    ADD CONSTRAINT cards_pendentes_revisao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.desempenho_cards
    ADD CONSTRAINT desempenho_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.desempenho_cards
    ADD CONSTRAINT desempenho_cards_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.geracoes_ia
    ADD CONSTRAINT geracoes_ia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.historico_estudo
    ADD CONSTRAINT historico_estudo_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.historico_estudo
    ADD CONSTRAINT historico_estudo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.material_notes
    ADD CONSTRAINT material_notes_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.material_notes
    ADD CONSTRAINT material_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.problemas_admin
    ADD CONSTRAINT problemas_admin_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.problemas_admin
    ADD CONSTRAINT problemas_admin_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_erro(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reports_erro
    ADD CONSTRAINT reports_erro_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reports_erro
    ADD CONSTRAINT reports_erro_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulado_questoes
    ADD CONSTRAINT simulado_questoes_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulado_respostas_aluno
    ADD CONSTRAINT simulado_respostas_aluno_questao_id_fkey FOREIGN KEY (questao_id) REFERENCES public.simulado_questoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulado_respostas_aluno
    ADD CONSTRAINT simulado_respostas_aluno_tentativa_id_fkey FOREIGN KEY (tentativa_id) REFERENCES public.simulado_tentativas(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulado_tentativas
    ADD CONSTRAINT simulado_tentativas_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulado_tentativas
    ADD CONSTRAINT simulado_tentativas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.simulados
    ADD CONSTRAINT simulados_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
ALTER TABLE ONLY public.temp_oqs
    ADD CONSTRAINT temp_oqs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_excluded_cards
    ADD CONSTRAINT user_excluded_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_excluded_cards
    ADD CONSTRAINT user_excluded_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_ia_usage
    ADD CONSTRAINT user_ia_usage_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin'::app_role);
END;
$$;

CREATE FUNCTION public.get_user_plan(_user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_plano text; v_status text; v_fim_trial timestamptz;
  v_inad timestamptz; v_cancel_eop boolean; v_prox timestamptz;
  v_congel timestamptz;
BEGIN
  SELECT plano, status, data_fim_trial, data_inadimplencia, cancel_at_period_end, proxima_renovacao, data_congelamento
    INTO v_plano, v_status, v_fim_trial, v_inad, v_cancel_eop, v_prox, v_congel
  FROM public.assinaturas WHERE usuario_id = _user_id;

  IF v_plano IS NULL THEN RETURN 'congelado'; END IF;

  IF v_plano = 'trial' AND v_fim_trial < now() THEN RETURN 'congelado'; END IF;

  IF v_status = 'cancelado' AND v_prox IS NOT NULL AND v_prox > now() THEN
    RETURN v_plano;
  END IF;

  IF v_status IN ('inadimplente','cancelado','expirado') OR v_congel IS NOT NULL THEN
    RETURN 'congelado';
  END IF;

  RETURN v_plano;
END; $$;

CREATE FUNCTION public.is_premium(_user_id uuid, _min_plan text DEFAULT 'prata'::text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_plan text;
BEGIN
  v_current_plan := public.get_user_plan(_user_id);

  IF _min_plan = 'ouro' THEN
    RETURN v_current_plan = 'ouro';
  ELSIF _min_plan = 'prata' THEN
    RETURN v_current_plan IN ('ouro', 'prata');
  ELSIF _min_plan = 'trial' THEN
    RETURN v_current_plan IN ('ouro', 'prata', 'trial');
  END IF;

  RETURN v_current_plan != 'congelado';
END;
$$;

CREATE FUNCTION public.is_subscriber(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE p text;
BEGIN
  p := public.get_user_plan(p_user_id);
  RETURN p IN ('trial','ouro','prata');
END; $$;

CREATE FUNCTION public.can_use_feature(_user_id uuid, _feature text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
 DECLARE p text;
 BEGIN
   IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;
   p := public.get_user_plan(_user_id);
   RETURN CASE _feature
     WHEN 'estudo_geral'        THEN p IN ('trial','ouro','prata')
     WHEN 'metricas_basicas'    THEN p IN ('trial','ouro','prata')
     WHEN 'metricas_avancadas'  THEN p IN ('trial','ouro','prata')
     WHEN 'estudo_focado'       THEN p IN ('trial','ouro','prata')
     WHEN 'gerar_oq_planilha'   THEN p IN ('trial','ouro','prata')
     WHEN 'gerar_oq_ia'         THEN p IN ('trial','ouro')
     WHEN 'materiais'           THEN p IN ('trial','ouro')
     WHEN 'trilha'              THEN p IN ('trial','ouro')
     ELSE false
   END;
 END; $$;

CREATE FUNCTION public.admin_set_role(target_user_id uuid, new_role public.app_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores.';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role <> new_role;
END;
$$;

CREATE FUNCTION public.admin_set_subscription(target_user_id uuid, new_status text, new_plano text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores.';
    END IF;

    INSERT INTO public.assinaturas (usuario_id, status, plano, valor_mensal)
    VALUES (target_user_id, new_status, new_plano, 0)
    ON CONFLICT (usuario_id) DO UPDATE
    SET status = EXCLUDED.status,
        plano = EXCLUDED.plano,
        atualizado_em = now();
END;
$$;

CREATE FUNCTION public.aulas_stats() RETURNS TABLE(aula_id uuid, nome text, especialidade text, total integer, abcde integer, lacuna integer, oq_falta integer, sem_explicacao integer, irregularidades integer)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
$$;

CREATE FUNCTION public.check_ia_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_limit INTEGER := 20; 
    v_usage INTEGER;
BEGIN
    INSERT INTO public.user_ia_usage (usuario_id, count_today, last_reset)
    VALUES (auth.uid(), 0, now())
    ON CONFLICT (usuario_id) DO NOTHING;

    UPDATE public.user_ia_usage 
    SET count_today = 0, last_reset = now()
    WHERE usuario_id = auth.uid() 
    AND last_reset::date < CURRENT_DATE;

    IF NOT public.is_subscriber(auth.uid()) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'A geração de OQs via IA requer uma assinatura ativa.';
    END IF;

    SELECT count_today INTO v_usage FROM public.user_ia_usage WHERE usuario_id = auth.uid();

    IF v_usage >= v_limit AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Limite diário de gerações de IA atingido.';
    END IF;

    UPDATE public.user_ia_usage SET count_today = count_today + 1 WHERE usuario_id = auth.uid();

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.cleanup_expired_users() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_user uuid;
BEGIN
  FOR v_user IN
    SELECT usuario_id FROM public.assinaturas
    WHERE data_congelamento IS NOT NULL
      AND data_congelamento < now() - interval '60 days'
      AND status <> 'ativo'
  LOOP
    DELETE FROM public.historico_estudo WHERE usuario_id = v_user;
    DELETE FROM public.desempenho_cards WHERE usuario_id = v_user;
    DELETE FROM public.favoritos        WHERE usuario_id = v_user;
    DELETE FROM public.geracoes_ia      WHERE usuario_id = v_user;
    DELETE FROM public.temp_oqs         WHERE user_id    = v_user;
    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = v_user;
    DELETE FROM public.cards
      WHERE criado_por_usuario_id = v_user AND origem = 'usuario';

    UPDATE public.assinaturas
       SET status = 'expirado', atualizado_em = now()
     WHERE usuario_id = v_user;
  END LOOP;
END;
$$;

CREATE FUNCTION public.daily_subscription_maintenance() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.assinaturas
     SET data_congelamento = COALESCE(data_congelamento, data_fim_trial),
         excluir_dados_em  = COALESCE(excluir_dados_em, data_fim_trial + interval '60 days'),
         atualizado_em     = now()
   WHERE plano = 'trial' AND data_fim_trial < now() AND data_congelamento IS NULL;

  UPDATE public.assinaturas
     SET data_congelamento = COALESCE(data_congelamento, data_inadimplencia),
         excluir_dados_em  = COALESCE(excluir_dados_em, data_inadimplencia + interval '60 days'),
         atualizado_em     = now()
   WHERE status = 'inadimplente' AND data_inadimplencia IS NOT NULL AND data_congelamento IS NULL;

  UPDATE public.assinaturas
     SET dias_inadimplente = GREATEST(0, EXTRACT(DAY FROM (now() - data_congelamento))::int),
         atualizado_em = now()
   WHERE data_congelamento IS NOT NULL;

  PERFORM public.cleanup_expired_users();
END;
$$;

CREATE FUNCTION public.extend_trial(target_user_id uuid, days_to_add integer DEFAULT 7) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    INSERT INTO public.assinaturas (usuario_id, status, plano, data_fim_trial)
    VALUES (target_user_id, 'trial', 'trial', now() + (days_to_add || ' days')::interval)
    ON CONFLICT (usuario_id) DO UPDATE 
    SET data_fim_trial = COALESCE(public.assinaturas.data_fim_trial, now()) + (days_to_add || ' days')::interval,
        status = 'trial',
        plano = 'trial',
        atualizado_em = now();
END;
$$;

CREATE FUNCTION public.gen_referral_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := 'OQM-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE FUNCTION public.get_daily_progress(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND (timezone('America/Sao_Paulo', timestamp))::date = (timezone('America/Sao_Paulo', now()))::date;

    RETURN v_count;
END;
$$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto_url) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  INSERT INTO public.assinaturas (
    usuario_id, plano, status, valor_mensal,
    data_inicio_trial, data_fim_trial, excluir_dados_em
  ) VALUES (
    NEW.id, 'trial', 'trial', 0,
    now(), now() + interval '7 days', now() + interval '22 days'
  );
  RETURN NEW;
END; $$;

CREATE FUNCTION public.handle_new_user_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_settings (usuario_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.increment_key_error(_id uuid, _error text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE public.api_keys_pool
    SET error_count = error_count + 1,
        last_error = _error,
        is_active = CASE WHEN error_count + 1 >= 5 THEN false ELSE is_active END,
        updated_at = now()
    WHERE id = _id;
END;
$$;

CREATE FUNCTION public.reset_my_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user uuid;
BEGIN
  v_user := auth.uid();

  IF v_user IS NULL THEN
    BEGIN
      v_user := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user := NULL;
    END;
  END IF;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada. Faça login novamente para excluir seus dados.'
      USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.simulado_respostas_aluno
  WHERE tentativa_id IN (
    SELECT id
    FROM public.simulado_tentativas
    WHERE usuario_id = v_user
  );

  DELETE FROM public.simulado_tentativas WHERE usuario_id = v_user;
  DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = v_user;
  DELETE FROM public.desempenho_cards WHERE usuario_id = v_user;
  DELETE FROM public.favoritos WHERE usuario_id = v_user;
  DELETE FROM public.historico_estudo WHERE usuario_id = v_user;
  DELETE FROM public.material_highlights WHERE user_id = v_user;
  DELETE FROM public.material_notes WHERE user_id = v_user;
  DELETE FROM public.user_excluded_cards WHERE user_id = v_user;
  DELETE FROM public.user_ia_usage WHERE usuario_id = v_user;
  DELETE FROM public.user_settings WHERE usuario_id = v_user;
  DELETE FROM public.temp_oqs WHERE user_id = v_user;
  DELETE FROM public.cards
  WHERE criado_por_usuario_id = v_user
    AND origem = 'usuario';
END;
$$;

CREATE FUNCTION public.reset_user_data(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores podem resetar dados.';
    END IF;

    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = target_user_id;
    DELETE FROM public.desempenho_cards WHERE usuario_id = target_user_id;
    DELETE FROM public.favoritos WHERE usuario_id = target_user_id;
    DELETE FROM public.historico_estudo WHERE usuario_id = target_user_id;
    DELETE FROM public.material_highlights WHERE user_id = target_user_id;
    DELETE FROM public.material_notes WHERE user_id = target_user_id;
    DELETE FROM public.user_excluded_cards WHERE user_id = target_user_id;
    DELETE FROM public.user_ia_usage WHERE usuario_id = target_user_id;
    DELETE FROM public.user_settings WHERE usuario_id = target_user_id;
    DELETE FROM public.temp_oqs WHERE user_id = target_user_id;
END;
$$;

CREATE FUNCTION public.set_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

CREATE FUNCTION public.sync_data_congelamento() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.data_congelamento IS NULL THEN
    IF (NEW.plano = 'trial' AND NEW.data_fim_trial < now())
       OR NEW.status IN ('inadimplente','cancelado','expirado') THEN
      NEW.data_congelamento := COALESCE(NEW.data_inadimplencia, now());
      NEW.excluir_dados_em := NEW.data_congelamento + interval '60 days';
    END IF;
  END IF;

  IF NEW.status = 'ativo' AND NEW.plano IN ('ouro','prata') THEN
    NEW.data_congelamento := NULL;
    NEW.excluir_dados_em := NULL;
    NEW.aviso_pre_exclusao_enviado_em := NULL;
  END IF;

  RETURN NEW;
END; $$;

CREATE FUNCTION public.toggle_user_ban(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: somente administradores podem alterar o status de banimento.';
    END IF;

    UPDATE public.profiles
    SET is_banned = NOT COALESCE(is_banned, false)
    WHERE id = target_user_id;
END;
$$;

CREATE FUNCTION public.touch_indicacoes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_faturamento_updated_at BEFORE UPDATE ON public.faturamento FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_check_ia_limit BEFORE INSERT ON public.geracoes_ia FOR EACH ROW EXECUTE FUNCTION public.check_ia_limit();
CREATE TRIGGER tr_update_reports_updated_at BEFORE UPDATE ON public.reports_erro FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ass_updated BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_des_updated BEFORE UPDATE ON public.desempenho_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prob_updated BEFORE UPDATE ON public.problemas_admin FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();
CREATE TRIGGER trg_sync_data_congelamento BEFORE INSERT OR UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.sync_data_congelamento();
CREATE TRIGGER trg_touch_indicacoes BEFORE UPDATE ON public.indicacoes FOR EACH ROW EXECUTE FUNCTION public.touch_indicacoes();
CREATE TRIGGER update_api_keys_pool_updated_at BEFORE UPDATE ON public.api_keys_pool FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_notes_updated_at BEFORE UPDATE ON public.material_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON TABLE public.assinaturas TO anon;
GRANT ALL ON TABLE public.assinaturas TO authenticated;
GRANT ALL ON TABLE public.assinaturas TO service_role;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT ALL ON TABLE public.admin_users_view TO anon;
GRANT ALL ON TABLE public.admin_users_view TO authenticated;
GRANT ALL ON TABLE public.admin_users_view TO service_role;
GRANT ALL ON TABLE public.api_keys_pool TO anon;
GRANT ALL ON TABLE public.api_keys_pool TO authenticated;
GRANT ALL ON TABLE public.api_keys_pool TO service_role;
GRANT ALL ON TABLE public.cards TO anon;
GRANT ALL ON TABLE public.cards TO authenticated;
GRANT ALL ON TABLE public.cards TO service_role;
GRANT ALL ON TABLE public.cards_pendentes_revisao TO anon;
GRANT ALL ON TABLE public.cards_pendentes_revisao TO authenticated;
GRANT ALL ON TABLE public.cards_pendentes_revisao TO service_role;
GRANT ALL ON TABLE public.desempenho_cards TO anon;
GRANT ALL ON TABLE public.desempenho_cards TO authenticated;
GRANT ALL ON TABLE public.desempenho_cards TO service_role;
GRANT ALL ON TABLE public.faturamento TO anon;
GRANT ALL ON TABLE public.faturamento TO authenticated;
GRANT ALL ON TABLE public.faturamento TO service_role;
GRANT ALL ON TABLE public.favoritos TO anon;
GRANT ALL ON TABLE public.favoritos TO authenticated;
GRANT ALL ON TABLE public.favoritos TO service_role;
GRANT ALL ON TABLE public.geracoes_ia TO anon;
GRANT ALL ON TABLE public.geracoes_ia TO authenticated;
GRANT ALL ON TABLE public.geracoes_ia TO service_role;
GRANT ALL ON TABLE public.historico_estudo TO anon;
GRANT ALL ON TABLE public.historico_estudo TO authenticated;
GRANT ALL ON TABLE public.historico_estudo TO service_role;
GRANT ALL ON TABLE public.ia_prompts TO anon;
GRANT ALL ON TABLE public.ia_prompts TO authenticated;
GRANT ALL ON TABLE public.ia_prompts TO service_role;
GRANT ALL ON TABLE public.indicacoes TO anon;
GRANT ALL ON TABLE public.indicacoes TO authenticated;
GRANT ALL ON TABLE public.indicacoes TO service_role;
GRANT ALL ON TABLE public.indicacoes_safe TO anon;
GRANT ALL ON TABLE public.indicacoes_safe TO authenticated;
GRANT ALL ON TABLE public.indicacoes_safe TO service_role;
GRANT ALL ON TABLE public.lista_espera TO anon;
GRANT ALL ON TABLE public.lista_espera TO authenticated;
GRANT ALL ON TABLE public.lista_espera TO service_role;
GRANT ALL ON TABLE public.materiais TO anon;
GRANT ALL ON TABLE public.materiais TO authenticated;
GRANT ALL ON TABLE public.materiais TO service_role;
GRANT ALL ON TABLE public.material_highlights TO anon;
GRANT ALL ON TABLE public.material_highlights TO authenticated;
GRANT ALL ON TABLE public.material_highlights TO service_role;
GRANT ALL ON TABLE public.material_notes TO anon;
GRANT ALL ON TABLE public.material_notes TO authenticated;
GRANT ALL ON TABLE public.material_notes TO service_role;
GRANT ALL ON TABLE public.pagamentos TO anon;
GRANT ALL ON TABLE public.pagamentos TO authenticated;
GRANT ALL ON TABLE public.pagamentos TO service_role;
GRANT ALL ON TABLE public.problemas_admin TO anon;
GRANT ALL ON TABLE public.problemas_admin TO authenticated;
GRANT ALL ON TABLE public.problemas_admin TO service_role;
GRANT ALL ON TABLE public.reports_erro TO anon;
GRANT ALL ON TABLE public.reports_erro TO authenticated;
GRANT ALL ON TABLE public.reports_erro TO service_role;
GRANT ALL ON TABLE public.simulado_questoes TO anon;
GRANT ALL ON TABLE public.simulado_questoes TO authenticated;
GRANT ALL ON TABLE public.simulado_questoes TO service_role;
GRANT ALL ON TABLE public.simulado_respostas_aluno TO anon;
GRANT ALL ON TABLE public.simulado_respostas_aluno TO authenticated;
GRANT ALL ON TABLE public.simulado_respostas_aluno TO service_role;
GRANT ALL ON TABLE public.simulado_tentativas TO anon;
GRANT ALL ON TABLE public.simulado_tentativas TO authenticated;
GRANT ALL ON TABLE public.simulado_tentativas TO service_role;
GRANT ALL ON TABLE public.simulados TO anon;
GRANT ALL ON TABLE public.simulados TO authenticated;
GRANT ALL ON TABLE public.simulados TO service_role;
GRANT ALL ON TABLE public.system_flags TO anon;
GRANT ALL ON TABLE public.system_flags TO authenticated;
GRANT ALL ON TABLE public.system_flags TO service_role;
GRANT ALL ON TABLE public.temp_oqs TO anon;
GRANT ALL ON TABLE public.temp_oqs TO authenticated;
GRANT ALL ON TABLE public.temp_oqs TO service_role;
GRANT ALL ON TABLE public.user_excluded_cards TO anon;
GRANT ALL ON TABLE public.user_excluded_cards TO authenticated;
GRANT ALL ON TABLE public.user_excluded_cards TO service_role;
GRANT ALL ON TABLE public.user_ia_usage TO anon;
GRANT ALL ON TABLE public.user_ia_usage TO authenticated;
GRANT ALL ON TABLE public.user_ia_usage TO service_role;
GRANT ALL ON TABLE public.user_settings TO anon;
GRANT ALL ON TABLE public.user_settings TO authenticated;
GRANT ALL ON TABLE public.user_settings TO service_role;

REVOKE ALL ON FUNCTION public.admin_set_role(target_user_id uuid, new_role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_role(target_user_id uuid, new_role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_role(target_user_id uuid, new_role public.app_role) TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_subscription(target_user_id uuid, new_status text, new_plano text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_subscription(target_user_id uuid, new_status text, new_plano text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_subscription(target_user_id uuid, new_status text, new_plano text) TO service_role;
GRANT ALL ON FUNCTION public.aulas_stats() TO anon;
GRANT ALL ON FUNCTION public.aulas_stats() TO authenticated;
GRANT ALL ON FUNCTION public.aulas_stats() TO service_role;
REVOKE ALL ON FUNCTION public.can_use_feature(_user_id uuid, _feature text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_use_feature(_user_id uuid, _feature text) TO authenticated;
GRANT ALL ON FUNCTION public.can_use_feature(_user_id uuid, _feature text) TO service_role;
REVOKE ALL ON FUNCTION public.check_ia_limit() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_ia_limit() TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_expired_users() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cleanup_expired_users() TO service_role;
REVOKE ALL ON FUNCTION public.daily_subscription_maintenance() FROM PUBLIC;
GRANT ALL ON FUNCTION public.daily_subscription_maintenance() TO service_role;
REVOKE ALL ON FUNCTION public.extend_trial(target_user_id uuid, days_to_add integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.extend_trial(target_user_id uuid, days_to_add integer) TO authenticated;
GRANT ALL ON FUNCTION public.extend_trial(target_user_id uuid, days_to_add integer) TO service_role;
REVOKE ALL ON FUNCTION public.gen_referral_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.gen_referral_code() TO service_role;
REVOKE ALL ON FUNCTION public.get_daily_progress(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_daily_progress(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_daily_progress(p_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_user_plan(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_plan(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_plan(_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user_settings() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user_settings() TO service_role;
GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;
REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
REVOKE ALL ON FUNCTION public.increment_key_error(_id uuid, _error text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_key_error(_id uuid, _error text) TO service_role;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;
REVOKE ALL ON FUNCTION public.is_premium(_user_id uuid, _min_plan text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_premium(_user_id uuid, _min_plan text) TO authenticated;
GRANT ALL ON FUNCTION public.is_premium(_user_id uuid, _min_plan text) TO service_role;
REVOKE ALL ON FUNCTION public.is_subscriber(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_subscriber(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_subscriber(p_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reset_my_data() FROM PUBLIC;
GRANT ALL ON FUNCTION public.reset_my_data() TO authenticated;
GRANT ALL ON FUNCTION public.reset_my_data() TO service_role;
REVOKE ALL ON FUNCTION public.reset_user_data(target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reset_user_data(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reset_user_data(target_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.set_referral_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_referral_code() TO service_role;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;
REVOKE ALL ON FUNCTION public.sync_data_congelamento() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_data_congelamento() TO service_role;
REVOKE ALL ON FUNCTION public.toggle_user_ban(target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.toggle_user_ban(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.toggle_user_ban(target_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.touch_indicacoes() TO anon;
GRANT ALL ON FUNCTION public.touch_indicacoes() TO authenticated;
GRANT ALL ON FUNCTION public.touch_indicacoes() TO service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

ALTER TABLE public.api_keys_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_pendentes_revisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desempenho_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geracoes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_estudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problemas_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_erro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_respostas_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_tentativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_oqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_excluded_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ia_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage materiais" ON public.materiais TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage questions" ON public.simulado_questoes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage simulados" ON public.simulados TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Cards visibility policy v4" ON public.cards FOR SELECT USING (((verificado = true) OR (criado_por_usuario_id = auth.uid()) OR public.is_admin()));
CREATE POLICY "Materiais are viewable by eligible users" ON public.materiais FOR SELECT TO authenticated USING (public.can_use_feature(auth.uid(), 'materiais'::text));
CREATE POLICY "Questions are viewable by all authenticated" ON public.simulado_questoes FOR SELECT USING (true);
CREATE POLICY "Simulados are viewable by all authenticated" ON public.simulados FOR SELECT USING (true);
CREATE POLICY "Users can create their own answers" ON public.simulado_respostas_aluno FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.simulado_tentativas
  WHERE ((simulado_tentativas.id = simulado_respostas_aluno.tentativa_id) AND (simulado_tentativas.usuario_id = auth.uid())))));
CREATE POLICY "Users can create their own attempts" ON public.simulado_tentativas FOR INSERT WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Users can create their own notes" ON public.material_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own temp oqs" ON public.temp_oqs FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own attempts" ON public.simulado_tentativas FOR DELETE TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can delete their own exclusions" ON public.user_excluded_cards FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own notes" ON public.material_notes FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own temp oqs" ON public.temp_oqs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own exclusions" ON public.user_excluded_cards FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own attempts" ON public.simulado_tentativas FOR UPDATE TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Users can update their own notes" ON public.material_notes FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own profile if not banned" ON public.profiles FOR UPDATE TO authenticated USING (((auth.uid() = id) AND (is_banned = false))) WITH CHECK (((auth.uid() = id) AND (is_banned = false)));
CREATE POLICY "Users can view own payments" ON public.pagamentos FOR SELECT TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can view own temp oqs" ON public.temp_oqs FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own IA usage" ON public.user_ia_usage FOR SELECT USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can view their own answers" ON public.simulado_respostas_aluno FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.simulado_tentativas
  WHERE ((simulado_tentativas.id = simulado_respostas_aluno.tentativa_id) AND (simulado_tentativas.usuario_id = auth.uid())))));
CREATE POLICY "Users can view their own attempts" ON public.simulado_tentativas FOR SELECT USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can view their own exclusions" ON public.user_excluded_cards FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own history" ON public.historico_estudo FOR SELECT USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can view their own notes" ON public.material_notes FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users create their own highlights" ON public.material_highlights FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users delete their own highlights" ON public.material_highlights FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users insert history if active" ON public.historico_estudo FOR INSERT TO authenticated WITH CHECK (((auth.uid() = usuario_id) AND (public.get_user_plan(auth.uid()) = ANY (ARRAY['trial'::text, 'ouro'::text, 'prata'::text]))));
CREATE POLICY "Users update their own highlights" ON public.material_highlights FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users view their own highlights" ON public.material_highlights FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem atualizar suas próprias configurações" ON public.user_settings FOR UPDATE USING ((auth.uid() = usuario_id));
CREATE POLICY "Usuários podem inserir suas próprias configurações" ON public.user_settings FOR INSERT WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Usuários podem ver suas próprias configurações" ON public.user_settings FOR SELECT USING ((auth.uid() = usuario_id));
CREATE POLICY api_keys_pool_admin_manage ON public.api_keys_pool TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY ass_insert ON public.assinaturas FOR INSERT TO authenticated WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY ass_select ON public.assinaturas FOR SELECT TO authenticated USING (((auth.uid() = usuario_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY ass_update_admin_only ON public.assinaturas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY cards_delete ON public.cards FOR DELETE TO authenticated USING (((criado_por_usuario_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY cards_insert ON public.cards FOR INSERT TO authenticated WITH CHECK ((((criado_por_usuario_id = auth.uid()) AND public.can_use_feature(auth.uid(), 'gerar_oq_planilha'::text)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY cards_select ON public.cards FOR SELECT TO authenticated USING (((verificado = true) OR (criado_por_usuario_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY cards_update ON public.cards FOR UPDATE TO authenticated USING (((criado_por_usuario_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY des_delete_own ON public.desempenho_cards FOR DELETE TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY des_insert_if_active ON public.desempenho_cards FOR INSERT TO authenticated WITH CHECK (((auth.uid() = usuario_id) AND (public.get_user_plan(auth.uid()) = ANY (ARRAY['trial'::text, 'ouro'::text, 'prata'::text]))));
CREATE POLICY des_select_own ON public.desempenho_cards FOR SELECT TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY des_update_if_active ON public.desempenho_cards FOR UPDATE TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK (((auth.uid() = usuario_id) AND (public.get_user_plan(auth.uid()) = ANY (ARRAY['trial'::text, 'ouro'::text, 'prata'::text]))));
CREATE POLICY espera_admin_all ON public.lista_espera TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY espera_insert_validated ON public.lista_espera FOR INSERT TO authenticated, anon WITH CHECK (((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text) AND (char_length(email) <= 254) AND ((nome IS NULL) OR (char_length(nome) <= 120)) AND ((whatsapp IS NULL) OR (char_length(whatsapp) <= 32)) AND ((mensagem IS NULL) OR (char_length(mensagem) <= 1000))));
CREATE POLICY faturamento_admin_all ON public.faturamento TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY fav_all ON public.favoritos TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY flags_admin_write ON public.system_flags TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY flags_select_all ON public.system_flags FOR SELECT USING (true);
CREATE POLICY geracoes_ia_delete_own ON public.geracoes_ia FOR DELETE USING ((auth.uid() = usuario_id));
CREATE POLICY geracoes_ia_insert_with_plan ON public.geracoes_ia FOR INSERT WITH CHECK (((auth.uid() = usuario_id) AND public.can_use_feature(auth.uid(), 'gerar_oq_ia'::text)));
CREATE POLICY geracoes_ia_select_own ON public.geracoes_ia FOR SELECT USING ((auth.uid() = usuario_id));
CREATE POLICY geracoes_ia_update_own ON public.geracoes_ia FOR UPDATE USING ((auth.uid() = usuario_id));
CREATE POLICY ia_prompts_admin_all ON public.ia_prompts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY ia_prompts_select_auth ON public.ia_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY ind_select_own_or_admin ON public.indicacoes FOR SELECT TO authenticated USING (((auth.uid() = indicador_id) OR (auth.uid() = convidado_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY pagamentos_admin_all ON public.pagamentos TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY pagamentos_select_own_or_admin ON public.pagamentos FOR SELECT TO authenticated USING (((auth.uid() = usuario_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY pend_all ON public.cards_pendentes_revisao TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY prob_admin_all ON public.problemas_admin TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY profiles_admin_update_all ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY rep_insert ON public.reports_erro FOR INSERT TO authenticated WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY rep_select ON public.reports_erro FOR SELECT TO authenticated USING (((auth.uid() = usuario_id) OR public.is_admin()));
CREATE POLICY rep_update ON public.reports_erro FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY temp_oqs_update_own ON public.temp_oqs FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY user_roles_admin_manage ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY user_roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();