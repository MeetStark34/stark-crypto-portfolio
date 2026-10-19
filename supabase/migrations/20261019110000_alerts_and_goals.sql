create table if not exists public.portfolio_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_symbol text not null references public.portfolio_assets(symbol),
  target_price numeric not null check (target_price > 0 and target_price < 1000000000000000000000000000000 and scale(target_price) <= 18),
  direction text not null check (direction in ('above','below')),
  fiat_currency text not null check (fiat_currency in ('EUR','USD','INR')),
  is_enabled boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_price_alerts_user_created_idx
  on public.portfolio_price_alerts (user_id, created_at desc);

alter table public.portfolio_price_alerts enable row level security;
revoke all on public.portfolio_price_alerts from anon, authenticated;
grant select, insert, update, delete on public.portfolio_price_alerts to authenticated;
drop policy if exists "Users manage their own portfolio price alerts" on public.portfolio_price_alerts;
create policy "Users manage their own portfolio price alerts" on public.portfolio_price_alerts
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.portfolio_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  goal_type text not null check (goal_type in ('portfolio_value','investment_amount')),
  target_amount numeric not null check (target_amount > 0 and target_amount < 1000000000000000000000000000000 and scale(target_amount) <= 18),
  fiat_currency text not null check (fiat_currency in ('EUR','USD','INR')),
  deadline date,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_goals_user_created_idx
  on public.portfolio_goals (user_id, created_at desc);

alter table public.portfolio_goals enable row level security;
revoke all on public.portfolio_goals from anon, authenticated;
grant select, insert, update, delete on public.portfolio_goals to authenticated;
drop policy if exists "Users manage their own portfolio goals" on public.portfolio_goals;
create policy "Users manage their own portfolio goals" on public.portfolio_goals
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
