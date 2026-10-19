create table if not exists public.portfolio_market_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_symbol text not null references public.portfolio_assets(symbol),
  fiat_currency text not null check (fiat_currency in ('EUR','USD','GBP','CHF')),
  current_price numeric not null check (current_price > 0 and current_price < 1e30),
  price_updated_at timestamptz,
  cached_at timestamptz not null default now(),
  primary key (user_id, asset_symbol, fiat_currency)
);

alter table public.portfolio_market_cache enable row level security;
drop policy if exists "Users read their own market cache" on public.portfolio_market_cache;
create policy "Users read their own market cache" on public.portfolio_market_cache for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert their own market cache" on public.portfolio_market_cache;
create policy "Users insert their own market cache" on public.portfolio_market_cache for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update their own market cache" on public.portfolio_market_cache;
create policy "Users update their own market cache" on public.portfolio_market_cache for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.portfolio_market_cache to authenticated;
