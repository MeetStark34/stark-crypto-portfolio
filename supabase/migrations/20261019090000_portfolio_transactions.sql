-- Dedicated portfolio tables avoid assuming the shape of pre-existing project tables.
create table if not exists public.portfolio_assets (
  symbol text primary key,
  name text not null,
  coingecko_id text not null unique,
  display_order smallint not null,
  is_active boolean not null default true
);

insert into public.portfolio_assets (symbol, name, coingecko_id, display_order) values
  ('BTC', 'Bitcoin', 'bitcoin', 1),
  ('ETH', 'Ethereum', 'ethereum', 2),
  ('SOL', 'Solana', 'solana', 3),
  ('XRP', 'XRP', 'ripple', 4),
  ('ADA', 'Cardano', 'cardano', 5),
  ('DOGE', 'Dogecoin', 'dogecoin', 6),
  ('DOT', 'Polkadot', 'polkadot', 7),
  ('AVAX', 'Avalanche', 'avalanche-2', 8),
  ('LINK', 'Chainlink', 'chainlink', 9),
  ('MATIC', 'Polygon', 'matic-network', 10)
on conflict (symbol) do update set
  name = excluded.name,
  coingecko_id = excluded.coingecko_id,
  display_order = excluded.display_order,
  is_active = true;

alter table public.portfolio_assets enable row level security;
revoke all on public.portfolio_assets from anon, authenticated;
grant select on public.portfolio_assets to authenticated;
drop policy if exists "Authenticated users can read portfolio assets" on public.portfolio_assets;
create policy "Authenticated users can read portfolio assets"
  on public.portfolio_assets for select to authenticated using (true);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_symbol text not null references public.portfolio_assets(symbol),
  occurred_at timestamptz not null,
  total_fiat_amount numeric not null check (
    total_fiat_amount > 0 and total_fiat_amount < 1000000000000000000000000000000 and scale(total_fiat_amount) <= 18
  ),
  fee_fiat_amount numeric not null default 0 check (
    fee_fiat_amount >= 0 and fee_fiat_amount < total_fiat_amount and fee_fiat_amount < 1000000000000000000000000000000 and scale(fee_fiat_amount) <= 18
  ),
  purchase_value_fiat numeric generated always as (total_fiat_amount - fee_fiat_amount) stored,
  crypto_amount numeric not null check (
    crypto_amount > 0 and crypto_amount < 1000000000000000000000000000000 and scale(crypto_amount) <= 18
  ),
  fiat_currency text not null check (fiat_currency in ('EUR', 'USD', 'GBP', 'CHF')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_transactions_user_date_idx
  on public.portfolio_transactions (user_id, occurred_at desc);

create or replace function public.set_portfolio_transaction_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_transactions_set_updated_at on public.portfolio_transactions;
create trigger portfolio_transactions_set_updated_at
  before update on public.portfolio_transactions
  for each row execute function public.set_portfolio_transaction_updated_at();

alter table public.portfolio_transactions enable row level security;
revoke all on public.portfolio_transactions from anon, authenticated;
grant select, insert, update, delete on public.portfolio_transactions to authenticated;

drop policy if exists "Users can read their own portfolio transactions" on public.portfolio_transactions;
create policy "Users can read their own portfolio transactions"
  on public.portfolio_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own portfolio transactions" on public.portfolio_transactions;
create policy "Users can insert their own portfolio transactions"
  on public.portfolio_transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own portfolio transactions" on public.portfolio_transactions;
create policy "Users can update their own portfolio transactions"
  on public.portfolio_transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own portfolio transactions" on public.portfolio_transactions;
create policy "Users can delete their own portfolio transactions"
  on public.portfolio_transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on column public.portfolio_transactions.total_fiat_amount is 'Total cash outflow, including any fee.';
comment on column public.portfolio_transactions.fee_fiat_amount is 'Fee included in total_fiat_amount; do not add it again to total outflow.';
comment on column public.portfolio_transactions.purchase_value_fiat is 'Generated net crypto purchase value: total_fiat_amount minus fee_fiat_amount.';
