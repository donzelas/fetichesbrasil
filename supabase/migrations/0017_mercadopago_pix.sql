-- =====================================================
-- 0017: Migração de Stripe para Mercado Pago (PIX-only)
-- =====================================================
-- A partir desta migração, todos os pagamentos são processados via
-- Mercado Pago Checkout Pro em modalidade PIX (pagamento único). O modelo
-- de assinatura recorrente (credit_card) é desativado: a coluna
-- payment_method passa a aceitar apenas 'pix'.
--
-- Mantemos as colunas stripe_* nullable para preservar o histórico de
-- pagamentos antigos, mas o código novo só lê/escreve as colunas
-- mercadopago_*.

-- 1. Colunas Mercado Pago em payments -----------------
alter table public.payments
  add column if not exists mercadopago_preference_id text,
  add column if not exists mercadopago_payment_id text,
  add column if not exists mercadopago_status text;

create index if not exists payments_mp_preference_idx
  on public.payments (mercadopago_preference_id);

create index if not exists payments_mp_payment_idx
  on public.payments (mercadopago_payment_id);

-- 2. Restringe payment_method a 'pix' ------------------
-- Existem checks pré-existentes que precisam ser dropados primeiro.
alter table public.plans
  drop constraint if exists plans_payment_method_check;

alter table public.payments
  drop constraint if exists payments_payment_method_check;

-- Reconverter qualquer plano credit_card existente em pix (não usaremos
-- mais cartão recorrente). Os pagamentos antigos ficam intocados.
update public.plans
   set payment_method = 'pix'
 where payment_method <> 'pix';

alter table public.plans
  add constraint plans_payment_method_check
  check (payment_method = 'pix');

alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('pix', 'credit_card'));
-- ^ Mantemos 'credit_card' aceito em payments só para registros antigos.

-- 3. plans.stripe_* fica como histórico ----------------
-- Nenhum drop: deixamos as colunas para auditoria. Frontend e API novos
-- ignoram esses campos.

comment on column public.plans.stripe_product_id is
  'OBSOLETO — Stripe foi descontinuado em 0017. Mantido para histórico.';
comment on column public.plans.stripe_price_id is
  'OBSOLETO — Stripe foi descontinuado em 0017. Mantido para histórico.';

comment on column public.payments.stripe_session_id is
  'OBSOLETO — Stripe foi descontinuado em 0017. Use mercadopago_preference_id.';
comment on column public.payments.stripe_payment_intent_id is
  'OBSOLETO — Stripe foi descontinuado em 0017. Use mercadopago_payment_id.';
comment on column public.payments.stripe_subscription_id is
  'OBSOLETO — Stripe foi descontinuado em 0017. Não há mais assinatura recorrente.';
