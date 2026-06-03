-- ════════════════════════════════════════════════════════════════════════════
-- MilestoneIQ — Supabase schema, security, and signup trigger
-- ────────────────────────────────────────────────────────────────────────────
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to run again. It creates tables only if missing,
-- (re)creates the signup trigger, and (re)creates row-level-security policies.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  email               text,
  subscription_tier   text default 'program',
  subscription_status text default 'trialing',
  trial_ends_at       timestamptz,
  stripe_customer_id  text,
  created_at          timestamptz default now()
);

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text,
  city        text,
  state       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table if not exists public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text default 'owner',
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade,
  name            text not null,
  mascot          text,
  sport           text,
  primary_color   text,
  logo_url        text,
  incoming_coach  text,
  coach_hof       jsonb default '{}'::jsonb,
  dismissed_alerts jsonb default '[]'::jsonb,
  created_at      timestamptz default now()
);

create table if not exists public.athletes (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete cascade,
  name        text not null,
  position    text,
  grad_year   int,
  jersey      text,
  is_active   boolean default true,
  stats       jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.all_time_players (
  id                  uuid primary key default gen_random_uuid(),
  program_id          uuid references public.programs(id) on delete cascade,
  name                text not null,
  first_year          text,
  last_year           text,
  grad_year           int,
  is_current          boolean default false,
  is_active           boolean default false,
  school_hall_of_fame boolean default false,
  state_hall_of_fame  boolean default false,
  stats               jsonb default '{}'::jsonb,
  created_at          timestamptz default now()
);

create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete cascade,
  stat_name   text,
  variant     text,
  holder_name text,
  holder_year text,
  value       numeric,
  sport       text,
  created_at  timestamptz default now()
);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete cascade,
  stat_name   text,
  values      jsonb default '[]'::jsonb,
  alert_pct   int default 90,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

create table if not exists public.seasons (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid references public.programs(id) on delete cascade,
  season        text,
  wins          int,
  losses        int,
  league_wins   int,
  league_losses int,
  coach         text,
  notes         text,
  win_pct       numeric,
  created_at    timestamptz default now()
);

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid references public.organizations(id) on delete cascade,
  status                 text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  price_id               text,
  current_period_end     timestamptz,
  created_at             timestamptz default now()
);

-- ── Backfill columns on tables that may already exist from earlier setup ──────
-- (no-ops if the table was just created above; safe to run repeatedly)
alter table public.profiles         add column if not exists full_name text;
alter table public.profiles         add column if not exists email text;
alter table public.profiles         add column if not exists subscription_tier text default 'program';
alter table public.profiles         add column if not exists subscription_status text default 'trialing';
alter table public.profiles         add column if not exists trial_ends_at timestamptz;
alter table public.profiles         add column if not exists stripe_customer_id text;

alter table public.organizations    add column if not exists slug text;
alter table public.organizations    add column if not exists city text;
alter table public.organizations    add column if not exists state text;
alter table public.organizations    add column if not exists created_by uuid;

alter table public.org_members       add column if not exists role text default 'owner';

alter table public.programs          add column if not exists mascot text;
alter table public.programs          add column if not exists sport text;
alter table public.programs          add column if not exists primary_color text;
alter table public.programs          add column if not exists logo_url text;
alter table public.programs          add column if not exists incoming_coach text;
alter table public.programs          add column if not exists coach_hof jsonb default '{}'::jsonb;
alter table public.programs          add column if not exists dismissed_alerts jsonb default '[]'::jsonb;

alter table public.athletes          add column if not exists position text;
alter table public.athletes          add column if not exists grad_year int;
alter table public.athletes          add column if not exists jersey text;
alter table public.athletes          add column if not exists is_active boolean default true;
alter table public.athletes          add column if not exists stats jsonb default '{}'::jsonb;

alter table public.all_time_players  add column if not exists first_year text;
alter table public.all_time_players  add column if not exists last_year text;
alter table public.all_time_players  add column if not exists grad_year int;
alter table public.all_time_players  add column if not exists is_current boolean default false;
alter table public.all_time_players  add column if not exists is_active boolean default false;
alter table public.all_time_players  add column if not exists school_hall_of_fame boolean default false;
alter table public.all_time_players  add column if not exists state_hall_of_fame boolean default false;
alter table public.all_time_players  add column if not exists stats jsonb default '{}'::jsonb;

alter table public.records           add column if not exists variant text;
alter table public.records           add column if not exists holder_name text;
alter table public.records           add column if not exists holder_year text;
alter table public.records           add column if not exists value numeric;
alter table public.records           add column if not exists sport text;

alter table public.milestones        add column if not exists values jsonb default '[]'::jsonb;
alter table public.milestones        add column if not exists alert_pct int default 90;
alter table public.milestones        add column if not exists sort_order int default 0;

alter table public.seasons           add column if not exists wins int;
alter table public.seasons           add column if not exists losses int;
alter table public.seasons           add column if not exists league_wins int;
alter table public.seasons           add column if not exists league_losses int;
alter table public.seasons           add column if not exists coach text;
alter table public.seasons           add column if not exists notes text;
alter table public.seasons           add column if not exists win_pct numeric;

alter table public.subscriptions     add column if not exists status text;
alter table public.subscriptions     add column if not exists stripe_customer_id text;
alter table public.subscriptions     add column if not exists stripe_subscription_id text;
alter table public.subscriptions     add column if not exists price_id text;
alter table public.subscriptions     add column if not exists current_period_end timestamptz;

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_programs_org      on public.programs(org_id);
create index if not exists idx_athletes_program  on public.athletes(program_id);
create index if not exists idx_atp_program       on public.all_time_players(program_id);
create index if not exists idx_records_program   on public.records(program_id);
create index if not exists idx_milestones_program on public.milestones(program_id);
create index if not exists idx_seasons_program   on public.seasons(program_id);
create index if not exists idx_orgmembers_user   on public.org_members(user_id);
create index if not exists idx_orgmembers_org    on public.org_members(org_id);

-- ── Auto-create a profile (with 7-day trial) when a user signs up ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, subscription_status, trial_ends_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'trialing',
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist (e.g. your test account)
insert into public.profiles (id, email, subscription_status, trial_ends_at)
select id, email, 'trialing', now() + interval '7 days'
from auth.users
on conflict (id) do nothing;

-- ── Membership helpers (SECURITY DEFINER → bypass RLS, avoid recursion) ───────
create or replace function public.user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.user_program_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.programs
  where org_id in (select org_id from public.org_members where user_id = auth.uid());
$$;

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- This is the tenant boundary: a user can only touch rows for orgs they belong to.

alter table public.profiles         enable row level security;
alter table public.organizations    enable row level security;
alter table public.org_members      enable row level security;
alter table public.programs         enable row level security;
alter table public.athletes         enable row level security;
alter table public.all_time_players enable row level security;
alter table public.records          enable row level security;
alter table public.milestones       enable row level security;
alter table public.seasons          enable row level security;
alter table public.subscriptions    enable row level security;

drop policy if exists prof_all on public.profiles;
create policy prof_all on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists org_all on public.organizations;
create policy org_all on public.organizations for all
  using (id in (select public.user_org_ids()) or created_by = auth.uid())
  with check (created_by = auth.uid() or id in (select public.user_org_ids()));

drop policy if exists om_all on public.org_members;
create policy om_all on public.org_members for all
  using (user_id = auth.uid() or org_id in (select public.user_org_ids()))
  with check (user_id = auth.uid() or org_id in (select public.user_org_ids()));

drop policy if exists prog_all on public.programs;
create policy prog_all on public.programs for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists ath_all on public.athletes;
create policy ath_all on public.athletes for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

drop policy if exists atp_all on public.all_time_players;
create policy atp_all on public.all_time_players for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

drop policy if exists rec_all on public.records;
create policy rec_all on public.records for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

drop policy if exists ms_all on public.milestones;
create policy ms_all on public.milestones for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

drop policy if exists seas_all on public.seasons;
create policy seas_all on public.seasons for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

drop policy if exists sub_all on public.subscriptions;
create policy sub_all on public.subscriptions for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- ── Grants (PostgREST roles; RLS still applies on top of these) ───────────────
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Done. Expect 10 tables under Database → Tables, each with RLS enabled.
