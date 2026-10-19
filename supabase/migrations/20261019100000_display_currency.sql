-- Persist the user's preferred reporting currency without changing transaction currencies.
create table if not exists public.portfolio_settings (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.portfolio_settings
  add column if not exists display_currency text not null default 'EUR';
create unique index if not exists portfolio_settings_user_id_display_currency_uidx
  on public.portfolio_settings (user_id);

alter table public.portfolio_settings
  drop constraint if exists portfolio_settings_display_currency_check;
alter table public.portfolio_settings
  add constraint portfolio_settings_display_currency_check check (display_currency in ('EUR','USD','INR'));

alter table public.portfolio_settings enable row level security;
do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'portfolio_settings'
  loop
    execute format('drop policy %I on public.portfolio_settings', policy_name);
  end loop;
end;
$$;

revoke all on public.portfolio_settings from anon, authenticated;
create policy "Users read own portfolio settings" on public.portfolio_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own portfolio settings" on public.portfolio_settings;
create policy "Users insert own portfolio settings" on public.portfolio_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own portfolio settings" on public.portfolio_settings;
create policy "Users update own portfolio settings" on public.portfolio_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update on public.portfolio_settings to authenticated;

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_fiat_currency_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_fiat_currency_check check (fiat_currency in ('EUR','USD','INR','GBP','CHF'));

alter table public.portfolio_market_cache
  drop constraint if exists portfolio_market_cache_fiat_currency_check;
alter table public.portfolio_market_cache
  add constraint portfolio_market_cache_fiat_currency_check check (fiat_currency in ('EUR','USD','INR','GBP','CHF'));
