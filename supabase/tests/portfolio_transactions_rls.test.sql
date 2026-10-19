begin;

select plan(19);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'portfolio-a@test.local', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'portfolio-b@test.local', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

select lives_ok(
  $$insert into public.portfolio_transactions (id, user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BTC', '2025-01-01T12:00:00Z', 10, 1.49, 0.0002, 'EUR')$$,
  'an authenticated user can create their own transaction'
);
select is((select count(*)::integer from public.portfolio_transactions), 1, 'owner can read their transaction');
select is((select purchase_value_fiat::text from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'), '8.51', 'purchase value excludes the fee exactly once');
select throws_ok(
  $$update public.portfolio_transactions set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null, 'owner cannot reassign their transaction to another user'
);
select throws_ok(
  $$insert into public.portfolio_transactions (user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ETH', now(), 10, 0, 1, 'EUR')$$,
  '42501', null, 'an owner cannot create a row for another user'
);
select throws_ok(
  $$insert into public.portfolio_transactions (user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ETH', now(), 10, 10, 1, 'EUR')$$,
  '23514', null, 'database rejects fees equal to the full cash outflow'
);
select throws_ok(
  $$insert into public.portfolio_transactions (user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ETH', now(), 10, 0, 1, 'JPY')$$,
  '23514', null, 'database rejects unsupported fiat currencies'
);
select throws_ok(
  $$insert into public.portfolio_transactions (user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ETH', now(), 10, 0, 0.0000000000000000001, 'EUR')$$,
  '23514', null, 'database enforces the supported fractional precision'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select is((select count(*)::integer from public.portfolio_transactions), 0, 'another user cannot read the first user transaction');
select lives_ok(
  $$insert into public.portfolio_transactions (id, user_id, asset_symbol, occurred_at, total_fiat_amount, fee_fiat_amount, crypto_amount, fiat_currency)
    values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ETH', now(), 20, 0.5, 0.01, 'EUR')$$,
  'second user can create their own transaction'
);
select is((select count(*)::integer from public.portfolio_transactions), 1, 'second user sees only their own transaction');
select lives_ok($$update public.portfolio_transactions set total_fiat_amount = 99 where id = '11111111-1111-4111-8111-111111111111'$$, 'another user cannot change a foreign row');
select lives_ok($$delete from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'$$, 'another user cannot delete a foreign row');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select is((select count(*)::integer from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'), 1, 'foreign delete did not remove the owner row');
select is((select total_fiat_amount::text from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'), '10', 'foreign update did not change the owner row');
select lives_ok($$update public.portfolio_transactions set total_fiat_amount = 12, fee_fiat_amount = 0.5 where id = '11111111-1111-4111-8111-111111111111'$$, 'owner can edit their transaction');
select is((select purchase_value_fiat::text from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'), '11.5', 'edited net purchase value is still derived once');
select lives_ok($$delete from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'$$, 'owner can delete their transaction');
select is((select count(*)::integer from public.portfolio_transactions where id = '11111111-1111-4111-8111-111111111111'), 0, 'owner delete removes their transaction');
select * from finish();

rollback;
