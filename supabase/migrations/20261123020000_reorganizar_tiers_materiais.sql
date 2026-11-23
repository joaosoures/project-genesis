BEGIN;

CREATE TEMP TABLE trilha_material_map (
  ordem_incidencia integer PRIMARY KEY,
  tier integer NOT NULL,
  nome text NOT NULL
) ON COMMIT DROP;

INSERT INTO trilha_material_map (ordem_incidencia, tier, nome) VALUES
  (1, 1, 'HAS e Urgência CM - Resumo'),
  (2, 1, 'Trauma – Abordagem inicial CG - Resumo'),
  (3, 1, 'Distúrbios hipertensivos / resolução em GO - Resumo'),
  (4, 1, 'Calendário Vacinal PED - Resumo'),
  (5, 1, 'Princípios do SUS - Resumo'),
  (6, 1, 'Diabetes Mellitus I II CM - Resumo'),
  (7, 1, 'Trauma torácico e TCE CG - Resumo'),
  (8, 1, 'Hemorragia pós parto - Resumo'),
  (9, 1, 'Assistência ao RN sala de parto PED - Resumo'),
  (10, 1, 'Estudos epidemiológicos - Resumo'),
  (11, 1, 'Transtorno depressivo SM - Resumo'),
  (12, 1, 'IAM CM - Resumo'),
  (13, 1, 'Trauma abdominal CG - Resumo'),
  (14, 1, 'Trabalho de parto / partograma - Resumo'),
  (15, 1, 'Diarreia Aguda e Desidratação Infantil - Resumo'),
  (16, 1, 'Organização do SUS Níveis de atenção PREV - Resumo'),
  (17, 1, 'AVC isquêmico e hemorrágico Neuro CM - Resumo'),
  (18, 1, 'Ab. Inflamatório - Resumo'),
  (19, 1, 'DM gestacional GO - Resumo'),
  (20, 1, 'Pneumonia Comunitária Ped - Resumo'),
  (21, 1, 'Medidas epidemiológicas - Resumo'),
  (22, 1, 'Sepse e Choque Séptico CM - Resumo'),
  (23, 1, 'Vias biliares CG - Resumo'),
  (24, 1, 'Sangramento da segunda metade da gestação GO - Resumo'),
  (25, 1, 'Bronquiolite Viral Aguda - Resumo'),
  (26, 1, 'Sensibilidade e Especificidade - Resumo'),
  (27, 1, 'Risco de Suicídio SM - Resumo'),
  (28, 1, 'Insuficiência Cardíaca - Resumo'),
  (29, 1, 'Ab Obstrutivo CG - Resumo'),
  (30, 1, 'Hemorragia da 1ª metade da gestação GO - Resumo'),
  (31, 1, 'Puericultura PED - Resumo'),
  (32, 1, 'Atributos e fundamentos da APS - Resumo'),
  (33, 1, 'Pneumonia Adquirida na Comunidade CM - Resumo'),
  (34, 1, 'Abdome agudo Perfurativo CG - Resumo'),
  (35, 1, 'Contraceptivos e planejamento Fam. GO - Resumo'),
  (36, 1, 'Doenças exantemáticas PED - Resumo'),
  (37, 1, 'Vigilância Epidemiológica: Endemias e Surtos - Resumo'),
  (38, 1, 'Tuberculose pulmonar e extrapulmonar CM - Resumo'),
  (39, 1, 'Pré operatório CG - Resumo'),
  (40, 1, 'Vulvovaginites / ISTs GO - Resumo'),
  (41, 1, 'Marcos de desenvolvimento Ped - Resumo'),
  (42, 1, 'Vigilância em Saúde - Resumo'),
  (43, 1, 'Ansiedade SM - Resumo'),
  (44, 1, 'Cetoacidose diabética CM - Resumo'),
  (45, 1, 'Hérnias da parede abdominal CG - Resumo'),
  (46, 1, 'Rastreamento HPV GO - Resumo'),
  (47, 1, 'Asma PED - Resumo'),
  (48, 1, 'Pré-natal na APS Prev/MFC - Resumo'),
  (49, 1, 'Arboviroses CM - Resumo'),
  (50, 1, 'Câncer Colorretal CG - Resumo'),
  (51, 1, 'Aleitamento materno GO - Resumo'),
  (52, 1, 'IVAS Ped - Resumo'),
  (53, 1, 'Ética / Bioética Prev/MFC - Resumo'),
  (54, 1, 'HIV: diagnóstico, CD4/carga viral, profilaxias, TARV básica CM - Resumo'),
  (55, 1, 'Cuidados Pós-Operatórios CG - Resumo'),
  (56, 1, 'SOP GO - Resumo'),
  (57, 1, 'Infecção do trato urinário ITU PED - Resumo'),
  (58, 1, 'Linhas de Cuidados Crônicos APS - Resumo'),
  (59, 1, 'Transtorno Mental por SUBSTÂNCIAS - Resumo'),
  (60, 1, 'TVP / TEP CM - Resumo'),
  (61, 1, 'Complicações pós operatórias - Resumo'),
  (62, 1, 'Amenorreias GO - Resumo'),
  (63, 1, 'Meningite Ped - Resumo'),
  (64, 1, 'Asma CM - Resumo'),
  (65, 1, 'Distócias e indicações de cesárea GO - Resumo'),
  (66, 1, 'RN de risco PED - Resumo'),
  (67, 1, 'DPOC Pneumologia - Resumo'),
  (68, 1, 'Urgência na Cardiologia CM - Resumo'),
  (69, 1, 'Injúria Renal Aguda (IRA) - Resumo'),
  (70, 1, 'Doença renal Crônica DRC CM - Resumo'),
  (71, 1, 'Distúrbios Ácido-Base Nefro CM - Resumo'),
  (72, 1, 'Distúrbios Hidroeletrolíticos - Resumo'),
  (73, 1, 'Cirrose Hepática - Resumo'),
  (74, 1, 'Hepatites virais e bilirrubina - Resumo'),
  (75, 2, 'Hemorragia Digestiva Alta CM - Resumo'),
  (76, 2, 'Anestesia e fundamentos CG - Resumo'),
  (77, 2, 'Sangramento uterino anormal GO - Resumo'),
  (78, 2, 'Urgências pediátricas (Convulsão febril, desidratação grave, crise asmática grave) PED - Resumo'),
  (79, 2, 'Saúde do Trabalhador PREV - Resumo'),
  (80, 2, 'Bipolaridade SM - Resumo'),
  (81, 2, 'Anemias (ferropriva, hemolítica, aplásica) CM - Resumo'),
  (82, 2, 'Infecção de sítio cirúrgico, abscessos, fasceíte necrosante CG - Resumo'),
  (83, 2, 'Mamas – nódulos e alterações GO - Resumo'),
  (84, 2, 'Sepse Neonatal PED - Resumo'),
  (85, 2, 'Documentos médicos Prev/MFC - Resumo'),
  (86, 2, 'Hipotireoidismo e hipertireoidismo CM - Resumo'),
  (87, 2, 'Fases da cicatrização / suturas CG - Resumo'),
  (88, 2, 'Climatério / Menopausa GO - Resumo'),
  (89, 2, 'Nefrologia – glomerular PED - Resumo'),
  (90, 2, 'Imunização na APS - Resumo'),
  (91, 2, 'Urgências psiquiátricas - Agitação, agressão, contenção SM - Resumo'),
  (92, 2, 'Pancreatite aguda e crônica CM - Resumo'),
  (93, 2, 'Nódulo de tireoide, bócio, hipertireoidismo cirúrgico CG - Resumo'),
  (94, 2, 'Puerpério patológico GO - Resumo'),
  (95, 2, 'Cardiopatias PED - Resumo'),
  (96, 2, 'Promoção e prevenção Níveis Prev/MFC - Resumo'),
  (97, 2, 'Glomerulopatias CM - Resumo'),
  (98, 2, 'Proctologia – doenças anais CG - Resumo'),
  (99, 2, 'Gestação gemelar GO - Resumo'),
  (100, 2, 'Refluxo e APLV PED - Resumo'),
  (101, 2, 'SUS – História Prev/MFC - Resumo'),
  (102, 2, 'Antidepressivos SM - Resumo'),
  (103, 2, 'Endocardite infecciosa CM - Resumo'),
  (104, 2, 'Anestesia – complicações (Hipertermia maligna, alergia, hipotensão, náusea/vômito pós-op) - Resumo'),
  (105, 2, 'Comorbidades gestacionais GO - Resumo'),
  (106, 2, 'Síndromes febris PED - Resumo'),
  (107, 2, 'Programas de Saúde – ciclos Prev/MFC - Resumo'),
  (108, 2, 'Meningite bacteriana e viral CM - Resumo'),
  (109, 2, 'Cuidados intensivos cirúrgicos CG - Resumo'),
  (110, 2, 'Contraindicações na Imunização Ped - Resumo'),
  (111, 2, 'Planejamento em saúde Prev/MFC - Resumo'),
  (112, 2, 'Psicose SM - Resumo'),
  (113, 2, 'Pneumonias nosocomiais e associadas à ventilação CM - Resumo'),
  (114, 2, 'Cirrose e cirurgia CG - Resumo'),
  (115, 2, 'Gastro / Nutrição – desnutrição PED - Resumo'),
  (116, 2, 'Vigilância Sanitária PREV - Resumo'),
  (117, 2, 'Cefaleias: enxaqueca, tensional, em salvas CM - Resumo'),
  (118, 2, 'Hemato-oncologia PED - Resumo'),
  (119, 2, 'Medidas básicas Estatística - Resumo'),
  (120, 2, 'Saúde mental na APS SM - Resumo'),
  (121, 2, 'Crises epilépticas e epilepsia CM - Resumo'),
  (122, 2, 'Psicofármacos Estabilizadores SM - Resumo'),
  (123, 2, 'Artrite reumatoide CM - Resumo'),
  (124, 2, 'Demência vs Depressão SM - Resumo'),
  (125, 2, 'Doença inflamatória intestinal, diarreias crônicas CM - Resumo'),
  (126, 2, 'Leucemias agudas e crônicas, linfomas CM - Resumo'),
  (127, 2, 'Valvulopatias em CM - Resumo'),
  (128, 2, 'Demência (Alzheimer e outras), avaliação cognitiva CM - Resumo'),
  (129, 2, 'Delirium e síndromes geriátricas (quedas, imobilidade, incontinência) CM - Resumo'),
  (130, 2, 'Síndromes febris Infectologia CM - Resumo'),
  (131, 2, 'Abordagem emergencial em CM - Resumo'),
  (132, 2, 'Tratamento paliativo, Controle da dor CM - Resumo'),
  (133, 2, 'Obesidade no adulto, avaliação nutricional CM - Resumo'),
  (134, 2, 'Distúrbios carenciais e desnutrição CM - Resumo'),
  (135, 3, 'LES, espondiloartrites, vasculites principais CM - Resumo'),
  (136, 3, 'Aneurisma de aorta CG - Resumo'),
  (137, 3, 'Colo uterino / câncer invasivo GO - Resumo'),
  (138, 3, 'Puberdade precoce/tardia, DM1, obesidade infantil PED - Resumo'),
  (139, 3, 'Erro médico / responsabilidade Prev/MFC - Resumo'),
  (140, 3, 'Transtornos alimentares SM - Resumo'),
  (141, 3, 'Acidentes com animais peçonhentos, intoxicações CM - Resumo'),
  (142, 3, 'Abdome agudo isquêmico CG - Resumo'),
  (143, 3, 'CA de endométrio, ovário GO - Resumo'),
  (144, 3, 'Comportamento / desenvolvimento / TEA PED - Resumo'),
  (145, 3, 'Regulação de consultas, exames e internações, centrais de regulação Prev/MFC - Resumo'),
  (146, 3, 'Osteoartrose, gota, condrocalcinose CM - Resumo'),
  (147, 3, 'Doença arterial periférica, claudicação, isquemia CG - Resumo'),
  (148, 3, 'Incontinência urinária / prolapsos, abordagem GO - Resumo'),
  (149, 3, 'Alergia / Imunologia PED - Resumo'),
  (150, 3, 'Avaliação de serviços SUS - Resumo'),
  (151, 3, 'TDAH, TEA, depressão em adolescentes SM - Resumo'),
  (152, 3, 'Insuficiência adrenal, feocromocitoma, hiperaldosteronismo CM - Resumo'),
  (153, 3, 'Câncer gástrico CG - Resumo'),
  (154, 3, 'Vigilância ambiental Prev/MFC - Resumo'),
  (155, 3, 'Saúde mental perinatal SM - Resumo'),
  (156, 3, 'Gamopatias monoclonais, mieloma múltiplo CM - Resumo'),
  (157, 3, 'Proctologia – neoplasias CG - Resumo'),
  (158, 3, 'Transtornos de personalidade SM - Resumo'),
  (159, 3, 'Infecções de pele, partes moles, osteomielite CM - Resumo'),
  (160, 3, 'Tumores de cavidade oral, pescoço, linfonodomegalias CG - Resumo'),
  (161, 3, 'Doenças desmielinizantes (EM), polineuropatias, miopatias CM - Resumo'),
  (162, 3, 'Cirurgia endócrina – Paratireoide CG - Resumo'),
  (163, 3, 'Doenças intersticiais, fibrose pulmonar CM - Resumo'),
  (164, 3, 'Cirurgia minimamente invasiva CG - Resumo'),
  (165, 3, 'Síndrome do intestino irritável e constipação crônica CM - Resumo'),
  (166, 3, 'Enxertos e retalhos CG - Resumo'),
  (167, 3, 'Doença renal hipertensiva e isquêmica, nefroesclerose CM - Resumo'),
  (168, 3, 'Conceitos básicos de transplante / critérios gerais CG - Resumo');

CREATE TEMP TABLE trilha_material_normalizado ON COMMIT DROP AS
SELECT id, nome, regexp_replace(
  regexp_replace(lower(btrim(nome)), '[‐‑‒–—―−]', '-', 'g'),
  '[[:space:]]+', ' ', 'g'
) AS nome_normalizado
FROM public.materiais;

CREATE TEMP TABLE trilha_material_mapeado ON COMMIT DROP AS
SELECT n.id, m.ordem_incidencia, m.tier, m.nome
FROM trilha_material_map m
JOIN trilha_material_normalizado n
  ON n.nome_normalizado = regexp_replace(
    regexp_replace(lower(btrim(m.nome)), '[‐‑‒–—―−]', '-', 'g'),
    '[[:space:]]+', ' ', 'g'
  );

DO $$
DECLARE
  v_erros text;
  v_regular_total integer;
BEGIN
  SELECT string_agg(format('%s (correspondências: %s)', m.nome, c.total), '; ' ORDER BY m.ordem_incidencia)
    INTO v_erros
  FROM trilha_material_map m
  CROSS JOIN LATERAL (
    SELECT count(*)::integer AS total
    FROM trilha_material_normalizado n
    WHERE n.nome_normalizado = regexp_replace(
      regexp_replace(lower(btrim(m.nome)), '[‐‑‒–—―−]', '-', 'g'),
      '[[:space:]]+', ' ', 'g'
    )
  ) c
  WHERE c.total <> 1;
  IF v_erros IS NOT NULL THEN
    RAISE EXCEPTION 'Mapeamento de materiais ausente ou ambíguo: %', v_erros;
  END IF;

  SELECT count(*)::integer INTO v_regular_total
  FROM trilha_material_normalizado n
  WHERE n.nome !~* 'aula[[:space:]]+extra';
  IF v_regular_total <> 168 THEN
    SELECT string_agg(n.nome, '; ' ORDER BY n.nome) INTO v_erros
    FROM trilha_material_normalizado n
    WHERE n.nome !~* 'aula[[:space:]]+extra'
      AND NOT EXISTS (SELECT 1 FROM trilha_material_mapeado mm WHERE mm.id = n.id);
    RAISE EXCEPTION 'Esperados exatamente 168 materiais regulares; encontrados %. Residuais: %', v_regular_total, COALESCE(v_erros, '(nenhum)');
  END IF;

  SELECT string_agg(n.nome, '; ' ORDER BY n.nome) INTO v_erros
  FROM trilha_material_normalizado n
  WHERE n.nome !~* 'aula[[:space:]]+extra'
    AND NOT EXISTS (SELECT 1 FROM trilha_material_mapeado mm WHERE mm.id = n.id);
  IF v_erros IS NOT NULL THEN
    RAISE EXCEPTION 'Materiais regulares não reconhecidos: %', v_erros;
  END IF;

  IF (SELECT count(*) FROM trilha_material_mapeado) <> 168 THEN
    RAISE EXCEPTION 'A correspondência final não contém exatamente 168 registros.';
  END IF;
END;
$$;

CREATE TEMP TABLE trilha_material_extras ON COMMIT DROP AS
SELECT n.id,
       168 + row_number() OVER (ORDER BY m.ordem_incidencia ASC NULLS LAST, m.id ASC)::integer AS nova_ordem
FROM trilha_material_normalizado n
JOIN public.materiais m ON m.id = n.id
WHERE n.nome ~* 'aula[[:space:]]+extra';

DO $$
DECLARE
  v_order_att smallint;
  v_has_unique boolean;
  v_offset bigint;
BEGIN
  SELECT a.attnum INTO v_order_att
  FROM pg_attribute a
  WHERE a.attrelid = 'public.materiais'::regclass
    AND a.attname = 'ordem_incidencia'
    AND NOT a.attisdropped;

  SELECT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = 'public.materiais'::regclass
      AND i.indisunique
      AND i.indnkeyatts = 1
      AND i.indkey[0] = v_order_att
  ) INTO v_has_unique;

  IF v_has_unique THEN
    SELECT COALESCE(max(ordem_incidencia), 0)::bigint
           + count(*)::bigint + 10000
      INTO v_offset
    FROM public.materiais;
    UPDATE public.materiais
       SET ordem_incidencia = ordem_incidencia + v_offset::integer
     WHERE ordem_incidencia IS NOT NULL;
  END IF;
END;
$$;

UPDATE public.materiais AS material
SET tier = mapped.tier,
    ordem_incidencia = mapped.ordem_incidencia
FROM trilha_material_mapeado AS mapped
WHERE material.id = mapped.id;

UPDATE public.materiais AS material
SET ordem_incidencia = extra.nova_ordem
FROM trilha_material_extras AS extra
WHERE material.id = extra.id;

DO $$
DECLARE
  v_regular_count integer;
  v_tier1 integer;
  v_tier2 integer;
  v_tier3 integer;
  v_min_order integer;
  v_max_order integer;
  v_extra_count integer;
  v_extra_min integer;
  v_extra_max integer;
BEGIN
  SELECT count(*)::integer, count(*) FILTER (WHERE tier = 1)::integer,
         count(*) FILTER (WHERE tier = 2)::integer, count(*) FILTER (WHERE tier = 3)::integer,
         min(ordem_incidencia), max(ordem_incidencia)
    INTO v_regular_count, v_tier1, v_tier2, v_tier3, v_min_order, v_max_order
  FROM public.materiais
  WHERE nome !~* 'aula[[:space:]]+extra';

  IF v_regular_count <> 168 OR v_tier1 <> 74 OR v_tier2 <> 60 OR v_tier3 <> 34
     OR v_min_order <> 1 OR v_max_order <> 168
     OR (SELECT count(DISTINCT ordem_incidencia) FROM public.materiais WHERE nome !~* 'aula[[:space:]]+extra') <> 168 THEN
    RAISE EXCEPTION 'Validação final dos materiais regulares falhou: total %, tiers %/%/%, ordem %..%',
      v_regular_count, v_tier1, v_tier2, v_tier3, v_min_order, v_max_order;
  END IF;

  SELECT count(*)::integer, min(ordem_incidencia), max(ordem_incidencia)
    INTO v_extra_count, v_extra_min, v_extra_max
  FROM public.materiais
  WHERE nome ~* 'aula[[:space:]]+extra';

  IF v_extra_count > 0 AND (v_extra_min <> 169 OR v_extra_max <> 168 + v_extra_count
     OR (SELECT count(DISTINCT ordem_incidencia) FROM public.materiais WHERE nome ~* 'aula[[:space:]]+extra') <> v_extra_count) THEN
    RAISE EXCEPTION 'Validação final das aulas extras falhou: total %, ordem %..%', v_extra_count, v_extra_min, v_extra_max;
  END IF;
END;
$$;

COMMIT;
