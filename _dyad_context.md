# OQmed — contexto arquitetural para o Dyad

> **Baseline:** `main` · commit `59c5314c518a3348955bc0268fb36a422f9fee26`  
> **Atualizado em:** 2026-09-24  
> **Escopo:** índice operacional do frontend React/TypeScript e do backend Supabase. Não substitui o código-fonte, os tipos gerados ou o schema.

## Como usar este arquivo

1. Leia este arquivo antes de explorar o repositório.
2. Escolha a linha correspondente na [matriz de tarefa](#matriz-tarefa--arquivos-prioritários).
3. Leia inicialmente somente os 2–3 caminhos indicados.
4. Expanda a leitura apenas quando existir dependência real, alteração de rota, regra de acesso, integração ou schema.
5. Depois de uma mudança estrutural, atualize as seções afetadas e o [changelog](#changelog).

### Leitura mínima obrigatória

- [`AGENTS.md`](AGENTS.md) — regras de execução e skills.
- [`skills/refactoring-ux.md`](skills/refactoring-ux.md) — critérios de UX/refatoração.
- [`src/App.tsx`](src/App.tsx) — providers, lazy loading e rotas.
- [`src/integrations/supabase/client.ts`](src/integrations/supabase/client.ts) — cliente frontend.
- [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) — contrato gerado do banco.

## Matriz: tarefa → arquivos prioritários

| Tarefa | Consultar primeiro |
|---|---|
| Nova página autenticada | [`src/App.tsx`](src/App.tsx) · [`src/components/AppLayout.tsx`](src/components/AppLayout.tsx) · página de domínio mais próxima em [`src/pages/`](src/pages/) |
| Nova página pública/landing | [`src/App.tsx`](src/App.tsx) · [`src/pages/Landing.tsx`](src/pages/Landing.tsx) · [`src/index.css`](src/index.css) |
| Alterar rotas ou navegação | [`src/App.tsx`](src/App.tsx) · [`src/components/AppLayout.tsx`](src/components/AppLayout.tsx) · [`src/components/NavLink.tsx`](src/components/NavLink.tsx) |
| Alterar fluxo de estudo/fila | [`src/pages/Estudo.tsx`](src/pages/Estudo.tsx) · [`src/lib/queue.ts`](src/lib/queue.ts) · [`src/lib/sync.ts`](src/lib/sync.ts) |
| Alterar ABCDE/Lacuna/OQ Falta | [`src/components/oq/ModoABCDE.tsx`](src/components/oq/ModoABCDE.tsx) · [`src/components/oq/ModoLacuna.tsx`](src/components/oq/ModoLacuna.tsx) · [`src/components/oq/ModoOQFalta.tsx`](src/components/oq/ModoOQFalta.tsx) |
| Geração/importação de OQs | [`src/pages/GerarOQs.tsx`](src/pages/GerarOQs.tsx) · [`src/lib/oq.ts`](src/lib/oq.ts) · [`supabase/functions/gerar-oqs-ia/index.ts`](supabase/functions/gerar-oqs-ia/index.ts) |
| Novo controle de plano/feature gate | [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) · [`src/components/ProtectedRoute.tsx`](src/components/ProtectedRoute.tsx) · [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) |
| Materiais, highlights e notas | [`src/pages/Materiais.tsx`](src/pages/Materiais.tsx) · [`src/components/MaterialPdfViewer.tsx`](src/components/MaterialPdfViewer.tsx) · [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) |
| Trilha estratégica | [`src/pages/TrilhaEstrategica.tsx`](src/pages/TrilhaEstrategica.tsx) · [`src/components/trilha/`](src/components/trilha/) · [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) |
| Simulados | Fluxo não está exposto nas rotas atuais; consultar [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) · [`supabase/migrations/`](supabase/migrations/) · [`src/App.tsx`](src/App.tsx) antes de criar a primeira tela |
| Dashboard/métricas | [`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx) · [`src/hooks/useDashboardData.ts`](src/hooks/useDashboardData.ts) · [`src/lib/queue.ts`](src/lib/queue.ts) |
| Autenticação/perfil/configurações | [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) · [`src/pages/Configuracoes.tsx`](src/pages/Configuracoes.tsx) · [`src/pages/Login.tsx`](src/pages/Login.tsx) |
| Assinatura/Stripe | [`src/pages/MeuPlano.tsx`](src/pages/MeuPlano.tsx) · [`src/components/StripeEmbeddedCheckout.tsx`](src/components/StripeEmbeddedCheckout.tsx) · [`supabase/functions/payments-webhook/index.ts`](supabase/functions/payments-webhook/index.ts) |
| Edge Function/IA | [`supabase/functions/gerar-oqs-ia/index.ts`](supabase/functions/gerar-oqs-ia/index.ts) · [`supabase/functions/_shared/`](supabase/functions/_shared/) · [`src/pages/GerarOQs.tsx`](src/pages/GerarOQs.tsx) |
| Alterar tabelas, RLS, RPC ou trigger | [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) · [`supabase/migrations/`](supabase/migrations/) · [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) |
| Mudança visual global/reutilizável | [`src/index.css`](src/index.css) · [`src/App.css`](src/App.css) · [`src/components/ui/`](src/components/ui/) |

> A matriz indica pontos de entrada, não autorização para ignorar dependências. Toda mudança de banco deve ser confirmada contra o schema Supabase atual; não criar migration manualmente nesta etapa.

## Arquitetura frontend

- **Bootstrap:** [`src/App.tsx`](src/App.tsx) compõe `QueryClientProvider`, `TooltipProvider`, Toasters, `BrowserRouter`, `AuthProvider`, `SettingsProvider` e `Suspense` global. As rotas permanecem neste arquivo.
- **Shell autenticado:** [`src/components/AppLayout.tsx`](src/components/AppLayout.tsx) fornece sidebar, navegação, banners de trial/plano, conteúdo outlet e ações globais.
- **Acesso:** [`src/components/ProtectedRoute.tsx`](src/components/ProtectedRoute.tsx) protege sessão e páginas admin; [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) mantém identidade/sessão; [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) resolve plano, status, trial e gates.
- **Páginas:** páginas ficam em [`src/pages/`](src/pages/); componentes de domínio em [`src/components/`](src/components/); primitives shadcn em [`src/components/ui/`](src/components/ui/).
- **Dados:** React Query coordena cache onde usado; acesso Supabase parte de [`src/integrations/supabase/client.ts`](src/integrations/supabase/client.ts) e deve respeitar [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts).

### Rotas atuais

| Rota | Público/proteção | Destino/layout |
|---|---|---|
| `/` | Público | `Landing`, sem `AppLayout` |
| `/login` | Público | `Login`, sem `AppLayout` |
| `/estudo` | Autenticado | `Estudo` dentro de `ProtectedRoute` + `AppLayout` |
| `/trilha` | Autenticado | `TrilhaEstrategica` + shell |
| `/pre-aula/:materialId` | Autenticado | `PreAula` Ghost Mode + shell; estado temporário, sem métricas |
| `/dashboard` | Autenticado | `Dashboard` + shell |
| `/favoritos` | Autenticado | Alias para `/estudo?tipo=favoritos` |
| `/banco-cards` | Autenticado | `BancoCards` + shell |
| `/gerar-oqs` | Autenticado | `GerarOQs` + shell |
| `/materiais` | Autenticado | `Materiais` + shell |
| `/configuracoes` | Autenticado | `Configuracoes` + shell |
| `/meu-plano` | Autenticado | `MeuPlano` + shell |
| `/status` | Autenticado | `Status` + shell |
| `/admin` | Autenticado + admin | `Admin`, nested `ProtectedRoute adminOnly` |
| `/gerar-oqs/aulas` | Autenticado + admin | `AdminGerarAulas`, nested `ProtectedRoute adminOnly` |
| `*` | Público | `NotFound` |

## Domínio OQ e estudo

- [`src/lib/oq.ts`](src/lib/oq.ts) é a regra pura: modos `abcde`, `lacuna`, `oq_falta`; especialidades; normalização sem acentos; comparação tolerante; seleção de lacuna; nota de 0–4; score de prioridade.
- [`src/pages/Estudo.tsx`](src/pages/Estudo.tsx) monta filtros a partir da URL e orquestra carregamento, resposta, avanço, desempenho e explicação.
- [`src/lib/queue.ts`](src/lib/queue.ts) busca desempenhos/cards, remove `user_excluded_cards`, aplica filtros, carrega favoritos quando necessário e ordena/prioriza. Em modo de estudo, a fila usa desempenho: atrasados primeiro (`overdue`), depois prioridade (`priority`). Há caminhos especiais para retrógrado e filtros como favoritos, críticos, difíceis, novos, esquecidos, aula e baralho.
- `registrarDesempenho` em [`src/lib/queue.ts`](src/lib/queue.ts) atualiza nota, contadores, score e próxima revisão; consultar sua implementação antes de alterar espaçamento ou pontuação.
- Explicações são carregadas sob demanda para reduzir o payload inicial.
- [`src/lib/sync.ts`](src/lib/sync.ts) fornece fila/resiliência para sincronização offline.
- Os três modos delegam a interação visual e a validação aos componentes em [`src/components/oq/`](src/components/oq/): `ModoABCDE`, `ModoLacuna` e `ModoOQFalta`.

## Autenticação, planos e acesso

- O ciclo de sessão é centralizado em [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx); não duplicar listeners de auth em páginas.
- [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) consulta `get_user_plan` e expõe gates como estudo, métricas, geração por planilha/IA, materiais e trilha. O admin tem bypass de UI, mas a autoridade final é RLS/RPC/backend.
- Plano efetivo atual: `trial`, `prata`, `ouro`, além de estados legados/derivados `gratis`, `gratis_expirado` e `congelado` aceitos pelo frontend. O schema principal trabalha com `trial`, `prata`, `ouro` e estados de assinatura como `ativo`, `trial`, `inadimplente`, `cancelado`.
- Trial padrão: 7 dias, com lembretes e banners de urgência. Após expiração/inadimplência, a conta pode congelar; a janela de preservação é de até 60 dias antes da exclusão de dados conforme regras do backend.
- Geração de OQs por IA é restrita a plano elegível e limitada diariamente no backend; o gate do frontend é apenas UX.
- [`src/components/LoginAlerts.tsx`](src/components/LoginAlerts.tsx), [`src/components/TrialUrgencyBanner.tsx`](src/components/TrialUrgencyBanner.tsx) e [`src/pages/MeuPlano.tsx`](src/pages/MeuPlano.tsx) refletem os estados de trial/congelamento para o usuário.

## Supabase: mapa de dados e regras críticas

O contrato canônico é [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts). As migrations históricas estão em [`supabase/migrations/`](supabase/migrations/) e são referência de evolução, não substituto para verificar o banco conectado.

### Domínios

- **Identidade/acesso:** `profiles`, `user_roles`, `assinaturas`; relação com `auth.users` por usuário. RLS deve limitar dados do usuário por `auth.uid()`; administração usa `has_role`/`is_admin`.
- **Cards/OQs/IA:** `cards`, `cards_pendentes_revisao`, registros de geração/importação e pool interno de chaves (`api_keys_pool`). Cards podem relacionar-se a `materiais` por `aula_id`; cards gerados pelo usuário guardam `criado_por_usuario_id`.
- **Pré-aula/Ghost Mode:** `pre_aula_questoes` pertence a `materiais`, é deduplicada por `(material_id, fingerprint)` e nunca alimenta `cards` ou filas. A escrita ocorre apenas via `admin_import_pre_aula_questoes(jsonb)`, que revalida admin, especialidade, material e conteúdo.
- **Desempenho/estudo:** `desempenho_cards`, `favoritos`, `user_excluded_cards` e tabelas auxiliares de progresso. O usuário só acessa seus próprios registros; RPCs de progresso devem preservar esse limite.
- **Materiais:** `materiais`, highlights/notas e relações com aulas/cards. Recursos de materiais são condicionados por plano e RLS.
- **Simulados:** tabelas de simulados, questões, tentativas/respostas e resultados; consultar tipos e migrations antes de alterar relações ou métricas.
- **Assinaturas/pagamentos/indicações:** `assinaturas`, eventos/checkout Stripe e entidades de indicação/saldo. Webhook é a fonte de reconciliação de status; nunca confiar somente no retorno do navegador.
- **Administração/relatórios/configurações:** tabelas de configurações, relatórios e dados administrativos. Consultas administrativas devem exigir `is_admin`/`has_role` tanto no backend quanto na UI.

### RPCs, triggers e segurança

- RPCs críticos conhecidos: `get_user_plan`, `can_use_feature`, `has_role`, `is_admin`, `get_daily_progress` e `extend_trial`.
- Triggers/funções de manutenção cobrem criação de perfil/novo usuário, contagem/limite diário de IA e manutenção de assinatura. Confirmar nome e assinatura no tipo gerado antes de chamar.
- Todas as tabelas expostas pela API devem ter RLS habilitado, grants mínimos e policies por operação. Para dados de usuário, use `auth.uid()`; para dados administrativos, use função segura de papel/admin.
- Não expor `service_role`, chaves de provedores, secrets Stripe/IA ou valores de credenciais neste arquivo, no cliente ou em logs.

## Edge Functions e integrações

Todas as funções ficam em [`supabase/functions/`](supabase/functions/) e devem manter CORS, autenticação explícita quando necessário e logs prefixados pelo nome da função.

- [`gerar-oqs-ia/index.ts`](supabase/functions/gerar-oqs-ia/index.ts): valida acesso/plano, limite diário e geração de OQs via provedor de IA; persiste pendências/resultados conforme contrato.
- [`payments-webhook/index.ts`](supabase/functions/payments-webhook/index.ts): reconcilia eventos Stripe e atualiza assinatura; tratar como fonte confiável de billing.
- [`create-checkout/index.ts`](supabase/functions/create-checkout/index.ts) e [`create-portal-session/index.ts`](supabase/functions/create-portal-session/index.ts): iniciam checkout/portal.
- [`ai-status/index.ts`](supabase/functions/ai-status/index.ts): estado/limite do serviço de IA.
- [`google-drive-proxy/index.ts`](supabase/functions/google-drive-proxy/index.ts): proxy protegido para materiais/Drive.
- [`register-referral/index.ts`](supabase/functions/register-referral/index.ts) e [`get-referral-balance/index.ts`](supabase/functions/get-referral-balance/index.ts): indicações.
- [`test-api-key/index.ts`](supabase/functions/test-api-key/index.ts): diagnóstico controlado de provedor.
- [`_shared/stripe.ts`](supabase/functions/_shared/stripe.ts): integração Stripe compartilhada.

## Design system e componentes reutilizáveis

- Identidade: neumorphism claro, deep navy, gradientes, sombras táteis e tokens `hsl`; dark mode e reduced motion devem continuar funcionando.
- Tipografia: Poppins/Montserrat para títulos/ênfase e Inter para corpo, conforme tokens/estilos existentes.
- Estilos globais: [`src/index.css`](src/index.css) e [`src/App.css`](src/App.css). Preferir Tailwind e tokens existentes a valores isolados.
- Shell/console: [`src/components/AppLayout.tsx`](src/components/AppLayout.tsx), [`src/components/console/`](src/components/console/) e `NavLink` concentram sidebar, console tátil, wheel/skins e navegação.
- OQ/dashboard/trilha/simulados: reutilizar componentes de seus diretórios de domínio antes de criar duplicatas.
- UI base: [`src/components/ui/`](src/components/ui/) contém shadcn/Radix — especialmente `Button`, `Card`, `Dialog`, `Tabs`, `Tooltip`, `Toast` e `Sonner`. Não editar esses primitives diretamente; criar wrapper/componente de domínio quando necessário.
- Ícones devem seguir `lucide-react`; feedback usa os toasts existentes. Preservar estados de foco, teclado, loading, erro, vazio, dark mode e `prefers-reduced-motion`.

## Regras de implementação e testes

- Manter rotas em `src/App.tsx`; páginas em `src/pages/`; componentes em `src/components/`; lógica reutilizável em `src/lib/` ou hooks.
- Não editar diretamente componentes shadcn em `src/components/ui/`.
- Não confiar apenas em feature gates do frontend: RLS, RPC e Edge Function são a autoridade de segurança.
- Não inserir secrets, tokens, API keys ou credenciais em Markdown, código client-side ou logs.
- Não criar migration SQL manualmente para uma alteração de banco; usar o fluxo Supabase definido pelo projeto e manter tipos gerados sincronizados.
- Ao alterar estudo, validar fila, filtros, notas 0–4, próxima revisão, offline e explicação lazy.
- Ao alterar rotas, conferir proteção, layout e aliases nesta página.
- Ao alterar visual global, conferir dark mode, contraste, responsividade, reduced motion e consistência com tokens.
- Validar type-check/build apropriado ao escopo e revisar `git diff`; nesta mudança o diff esperado é somente este arquivo.

## Apêndice técnico essencial

### Pontos de entrada por camada

| Camada | Arquivos de referência |
|---|---|
| Execução/regras | [`AGENTS.md`](AGENTS.md) · [`skills/refactoring-ux.md`](skills/refactoring-ux.md) |
| Roteamento/providers | [`src/App.tsx`](src/App.tsx) · [`src/contexts/SettingsContext.tsx`](src/contexts/SettingsContext.tsx) |
| Sessão/acesso | [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) · [`src/components/ProtectedRoute.tsx`](src/components/ProtectedRoute.tsx) · [`src/hooks/useUserPlan.ts`](src/hooks/useUserPlan.ts) |
| OQ/estudo | [`src/lib/oq.ts`](src/lib/oq.ts) · [`src/lib/queue.ts`](src/lib/queue.ts) · [`src/pages/Estudo.tsx`](src/pages/Estudo.tsx) |
| Banco cliente | [`src/integrations/supabase/client.ts`](src/integrations/supabase/client.ts) · [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) |
| Backend externo | [`supabase/functions/gerar-oqs-ia/index.ts`](supabase/functions/gerar-oqs-ia/index.ts) · [`supabase/functions/payments-webhook/index.ts`](supabase/functions/payments-webhook/index.ts) |
| UI global | [`src/index.css`](src/index.css) · [`src/App.css`](src/App.css) · [`src/components/ui/`](src/components/ui/) |

### Invariantes de segurança, produto e UX

1. Identidade e acesso são por usuário; RLS não pode ser contornado por filtros client-side.
2. Admin bypass é conveniência de produto, não substitui policy/backend.
3. A fila deve excluir cards explicitamente excluídos e manter prioridade/atraso coerentes.
4. Respostas e explicações não devem vazar conteúdo de card além do fluxo previsto.
5. Trial, congelamento, inadimplência e exclusão devem manter a janela de preservação comunicada ao usuário.
6. IA e billing usam funções server-side; segredos nunca chegam ao browser.
7. A interface deve permanecer acessível, responsiva, tátil e respeitar reduced motion.
8. Questões pré-aula permanecem fora de `cards`; o player Ghost Mode não registra desempenho, histórico, pendências, metas ou eventos de revisão.

## Changelog

- **2026-09-24 · pré-aula/Ghost Mode** — adicionados `pre_aula_questoes`, RPC administrativa idempotente, importador XLSX/CSV, rota `/pre-aula/:materialId` e interceptação exclusiva dos botões Resumo da Trilha.
- **2026-09-24 · baseline `59c5314c`** — criado o índice arquitetural mestre com protocolo de leitura econômica, matriz tarefa→arquivos, rotas atuais, fluxo OQ, planos/acesso, mapa Supabase, Edge Functions, design system, invariantes e regras de manutenção.
- Futuras mudanças estruturais devem registrar aqui data, commit/referência, seções afetadas e impacto na matriz. Atualizar especialmente quando houver mudança de rota, schema/RLS/RPC, regra de plano, Edge Function ou tokens visuais.
