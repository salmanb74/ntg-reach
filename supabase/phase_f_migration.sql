-- ============================================================
-- NTG Reach — Phase F Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Historical exchange rates table ──────────────────────
create table if not exists public.exchange_rate_history (
  id         uuid primary key default uuid_generate_v4(),
  base       text not null,
  target     text not null,
  rate       numeric(16,6) not null,
  rate_date  date not null,
  created_at timestamptz default now() not null,
  unique(base, target, rate_date)
);

alter table public.exchange_rate_history enable row level security;

create policy "exchange_rate_history_select" on public.exchange_rate_history
  for select to authenticated using (true);

create policy "exchange_rate_history_write" on public.exchange_rate_history
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and roles && array['admin']
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and roles && array['admin']
    )
  );

-- Index for fast date lookups
create index if not exists exchange_rate_history_lookup
  on public.exchange_rate_history (base, target, rate_date desc);

-- ─── 2. Add currency column to targets ───────────────────────
alter table public.targets
  add column if not exists currency text default 'PKR';

-- Backfill existing targets with current input currency
-- (you may want to manually update these if input currency was different)
update public.targets
  set currency = (
    select value from public.app_settings
    where key = 'input_currency'
    limit 1
  )
  where currency is null;
