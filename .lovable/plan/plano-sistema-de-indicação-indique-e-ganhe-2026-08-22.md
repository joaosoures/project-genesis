
# Plano: Sistema de Indicação "Indique e Ganhe"

## Visão geral
Cada aluno terá um link único `?ref=USER_ID`. Convidados ganham 10% de desconto automático no primeiro pagamento. Quando o convidado paga, o indicador recebe automaticamente o valor de uma mensalidade do plano Ouro (R$ 28,50) como **crédito na conta Stripe** (Customer Balance), que abate a próxima fatura — efetivamente "1 mês grátis" por indicação, acumulável sem limite.

## 1. Banco de dados (nova tabela `indicacoes`)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `indicador_id` | uuid | quem convidou (FK lógico → profiles.id) |
| `convidado_id` | uuid | quem se cadastrou pelo link (unique) |
| `status` | text | `pendente` \| `convertido` \| `recompensado` \| `bloqueado` |
| `cupom_aplicado` | boolean | true se 10% foi aplicado no checkout |
| `valor_credito_brl` | numeric | valor creditado ao indicador (28.50) |
| `stripe_credit_note_id` | text | id da operação de crédito no Stripe (idempotência) |
| `convertido_em` | timestamptz | quando o convidado pagou |
| `ip_signup` / `ip_pagamento` | inet | antifraude |
| `criado_em` | timestamptz | |

Também adicionar em `profiles`:
- `referral_code` text unique (códigos curtos tipo `OQM-AB12CD`, melhor que expor user_id)
- `referred_by` uuid nullable (preenchido no signup)

RLS: usuário só lê suas próprias indicações (como indicador). Inserts/updates só via service role (edge functions).

## 2. Captura do `ref` no signup
- Landing/Auth lê `?ref=CODIGO` da URL → salva em `localStorage`.
- Ao concluir cadastro, edge function `register-referral` valida:
  - código existe e pertence a outro usuário
  - novo usuário não pode indicar a si mesmo
  - email/IP do convidado diferente do indicador (antifraude básica)
- Cria linha em `indicacoes` com status `pendente` e seta `profiles.referred_by`.

## 3. Desconto de 10% no checkout do convidado
- Criar **um cupom Stripe único reutilizável** `REF10` (10% off, `duration: once`, aplica só na primeira fatura) via script de setup.
- Modificar `create-checkout` edge function: se o usuário tem `referred_by` e ainda não usou o cupom, adicionar `discounts: [{ coupon: 'REF10' }]` na sessão.
- Marcar `indicacoes.cupom_aplicado = true`.
- Não combinar com outros cupons: a função só injeta `REF10` se não houver outro cupom de balcão pendente para o usuário.

## 4. Recompensa via webhook
Estender `payments-webhook` para tratar `invoice.payment_succeeded`:
1. Verificar se é o **primeiro pagamento bem-sucedido** do convidado (consultar Stripe ou flag em `assinaturas.data_inicio_plano`).
2. Buscar `indicacoes` onde `convidado_id = userId` e `status != 'recompensado'`.
3. Validações antifraude:
   - convidado e indicador têm emails diferentes
   - IPs distintos no signup vs pagamento (warning, não bloqueio)
   - pagamento não foi reembolsado (`charge.refunded = false`)
   - fatura ≥ valor mínimo (evita abuso de planos de centavos)
4. Buscar `stripe_customer_id` do indicador (criar se não existir).
5. Chamar `stripe.customers.createBalanceTransaction(customerId, { amount: -2850, currency: 'brl', description: 'Crédito por indicação - <email_convidado>' })`.
   - Valor negativo = crédito a favor do cliente.
   - Stripe abate automaticamente da próxima fatura de assinatura.
6. Salvar `stripe_credit_note_id` (idempotência: se já existe, pular).
7. Atualizar status para `recompensado`.

## 5. Tela "Indique e Ganhe" em /meu-plano
Novo card/aba dentro de MeuPlano.tsx (mantendo design system atual, fontes e tons existentes):

- **Hero**: link único copiável + botões "Compartilhar WhatsApp/Telegram/Copiar".
- **Card de gamificação**:
  - Saldo atual em créditos (consultado via edge function `get-referral-balance` que chama `stripe.customers.retrieve` e lê `balance`)
  - Conversão visual: `R$ XX,XX = N meses grátis de Ouro`
  - Barra de progresso até o próximo "mês grátis"
- **Estatísticas**:
  - Convites enviados (link gerado/visitado — opcional)
  - Cadastros pelo link (`status >= pendente`)
  - Pagantes confirmados (`status = recompensado`)
- **Histórico**: lista das últimas indicações (mascarando email: `joa***@gmail.com`).
- **Como funciona**: 3 steps com ícones sérios (Link, UserPlus, Gift).

## 6. Segurança e antifraude
- Códigos curtos (`OQM-XXXXXX`) em vez de UUID exposto.
- Rate limit no `register-referral` (10/h por IP).
- Bloqueio se mesmo IP/email tentar múltiplas indicações.
- Crédito só é emitido após **webhook confirmado** do Stripe (nunca client-side).
- Idempotência por `stripe_credit_note_id` evita duplo crédito em reentrega de webhook.
- Se o convidado pedir reembolso (`charge.refunded`), webhook reverte o crédito via outra `createBalanceTransaction` positiva.
- Validação server-side: indicador deve estar ativo (não congelado) para receber crédito; se congelado, fica `pendente_reativacao`.

## 7. Detalhes técnicos

**Novos arquivos:**
- `supabase/migrations/...` — tabela `indicacoes` + colunas em `profiles` + RLS.
- `supabase/functions/register-referral/index.ts` — valida e registra ref no signup.
- `supabase/functions/get-referral-balance/index.ts` — retorna saldo Stripe + estatísticas.
- `src/components/IndiqueGanhe.tsx` — UI completa.
- `src/hooks/useReferral.ts` — captura `?ref=` da URL e persiste.

**Modificações:**
- `supabase/functions/create-checkout/index.ts` — injetar cupom `REF10` quando aplicável.
- `supabase/functions/payments-webhook/index.ts` — handler para `invoice.payment_succeeded` + lógica de crédito + reversão em refund.
- `src/pages/MeuPlano.tsx` — nova seção/aba "Indique e Ganhe".
- `src/pages/Auth.tsx` (ou similar) — chamar `register-referral` no signup.

**Setup único (script ou migração de dados):**
- Criar cupom `REF10` no Stripe sandbox e live (10% off, once).
- Gerar `referral_code` para todos os usuários existentes.

## 8. Fora do escopo desta entrega
- Notificação por email/WhatsApp ao indicador quando recebe crédito (pode ser fase 2).
- Painel admin para auditar fraudes (pode reutilizar AdminPanel existente depois).
- Indicações em cascata (multi-nível) — manter explicitamente 1 nível.

---

Após sua aprovação, sigo nesta ordem: migração do banco → cupom no Stripe → edge functions → modificações no webhook e checkout → UI em Meu Plano → captura no signup.
