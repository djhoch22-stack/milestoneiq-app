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

-- Done (base). Expect 10 tables under Database → Tables, each with RLS enabled.

-- ════════════════════════════════════════════════════════════════════════════
-- v2 — School directory + role-based access (coaches own programs; AD sees all)
-- Idempotent; safe to re-run. Layers on top of the base schema above.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) School (organizations) directory + AD fields
alter table public.organizations add column if not exists address  text;
alter table public.organizations add column if not exists zip      text;
alter table public.organizations add column if not exists website  text;
alter table public.organizations add column if not exists level    text;   -- 'HS' | 'MS'
alter table public.organizations add column if not exists ad_name  text;
alter table public.organizations add column if not exists ad_email text;

-- 2) Program ownership
alter table public.programs add column if not exists created_by uuid;

create table if not exists public.program_coaches (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (program_id, user_id)
);
create index if not exists idx_program_coaches_program on public.program_coaches(program_id);
create index if not exists idx_program_coaches_user    on public.program_coaches(user_id);
grant all privileges on public.program_coaches to anon, authenticated, service_role;

-- 3) Membership / visibility helpers (SECURITY DEFINER → bypass RLS, no recursion)
create or replace function public.is_school_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

create or replace function public.program_org(p_program uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.programs where id = p_program;
$$;

create or replace function public.visible_program_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id from public.programs p
  where exists (select 1 from public.program_coaches pc
                where pc.program_id = p.id and pc.user_id = auth.uid())
     or exists (select 1 from public.org_members m
                where m.org_id = p.org_id and m.user_id = auth.uid() and m.role = 'admin');
$$;

-- 4) Searchable directory (non-sensitive columns only; intentionally school-wide)
create or replace view public.schools_directory as
  select id, name, state, city, level, website from public.organizations;
grant select on public.schools_directory to anon, authenticated, service_role;

-- 5) RLS rewrite — programs: a coach sees only assigned programs; an admin sees all.
--    INSERT can't use visible_program_ids (row doesn't exist yet) → check org membership.
drop policy if exists prog_all on public.programs;
drop policy if exists prog_sel on public.programs;
drop policy if exists prog_ins on public.programs;
drop policy if exists prog_upd on public.programs;
drop policy if exists prog_del on public.programs;
create policy prog_sel on public.programs for select
  using (id in (select public.visible_program_ids()));
create policy prog_ins on public.programs for insert
  with check (org_id in (select org_id from public.org_members where user_id = auth.uid()));
create policy prog_upd on public.programs for update
  using (id in (select public.visible_program_ids()))
  with check (id in (select public.visible_program_ids()));
create policy prog_del on public.programs for delete
  using (id in (select public.visible_program_ids()));

-- Child tables follow program visibility
drop policy if exists ath_all  on public.athletes;
create policy ath_all  on public.athletes        for all
  using (program_id in (select public.visible_program_ids()))
  with check (program_id in (select public.visible_program_ids()));
drop policy if exists atp_all  on public.all_time_players;
create policy atp_all  on public.all_time_players for all
  using (program_id in (select public.visible_program_ids()))
  with check (program_id in (select public.visible_program_ids()));
drop policy if exists rec_all  on public.records;
create policy rec_all  on public.records          for all
  using (program_id in (select public.visible_program_ids()))
  with check (program_id in (select public.visible_program_ids()));
drop policy if exists ms_all   on public.milestones;
create policy ms_all   on public.milestones       for all
  using (program_id in (select public.visible_program_ids()))
  with check (program_id in (select public.visible_program_ids()));
drop policy if exists seas_all on public.seasons;
create policy seas_all on public.seasons          for all
  using (program_id in (select public.visible_program_ids()))
  with check (program_id in (select public.visible_program_ids()));

-- program_coaches: self or school admin (the create-trigger self-inserts the owner)
alter table public.program_coaches enable row level security;
drop policy if exists pc_sel on public.program_coaches;
drop policy if exists pc_ins on public.program_coaches;
drop policy if exists pc_del on public.program_coaches;
create policy pc_sel on public.program_coaches for select
  using (user_id = auth.uid() or public.is_school_admin(public.program_org(program_id)));
create policy pc_ins on public.program_coaches for insert
  with check (user_id = auth.uid() or public.is_school_admin(public.program_org(program_id)));
create policy pc_del on public.program_coaches for delete
  using (public.is_school_admin(public.program_org(program_id)));

-- 6) Auto-link the creating coach to their new program
create or replace function public.link_program_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.program_coaches (program_id, user_id)
    values (new.id, auth.uid())
    on conflict (program_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_program_created on public.programs;
create trigger on_program_created after insert on public.programs
  for each row execute function public.link_program_creator();

-- 7) Invited users (AD or coach) auto-join their school + role on signup.
--    (The base on_auth_user_created trigger already calls handle_new_user.)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org  uuid;
  v_role text;
begin
  insert into public.profiles (id, full_name, email, subscription_status, trial_ends_at)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'trialing', now() + interval '7 days')
  on conflict (id) do nothing;

  v_org  := nullif(new.raw_user_meta_data->>'invite_org_id','')::uuid;
  v_role := coalesce(nullif(new.raw_user_meta_data->>'invite_role',''), 'coach');
  if v_org is not null then
    insert into public.org_members (org_id, user_id, role)
    values (v_org, new.id, v_role)
    on conflict (org_id, user_id) do nothing;
  else
    -- No explicit invite → if this email is a school's named AD, auto-make them its admin.
    insert into public.org_members (org_id, user_id, role)
    select o.id, new.id, 'admin'
    from public.organizations o
    where o.ad_email is not null and lower(o.ad_email) = lower(new.email)
    on conflict (org_id, user_id) do nothing;
  end if;

  -- Consume any pre-authorized invites for this email (edge-function-free invites).
  insert into public.org_members (org_id, user_id, role)
  select pi.org_id, new.id, pi.role
  from public.pending_invites pi
  where lower(pi.email) = lower(new.email)
  on conflict (org_id, user_id) do nothing;
  -- If the invite named a program, attach the coach to it.
  insert into public.program_coaches (program_id, user_id)
  select pi.program_id, new.id
  from public.pending_invites pi
  where lower(pi.email) = lower(new.email) and pi.program_id is not null
  on conflict (program_id, user_id) do nothing;
  delete from public.pending_invites where lower(email) = lower(new.email);

  return new;
end;
$$;

-- 8) MIGRATION — promote existing owners to admin so they keep seeing all programs.
--    WITHOUT THIS, the new RLS hides Denver Christian's programs from you.
update public.org_members set role = 'admin'
  where coalesce(role,'') not in ('coach','admin');

-- Done (v2). Adds program_coaches + schools_directory; role-based per-program RLS.

-- ════════════════════════════════════════════════════════════════════════════
-- v2.1 — Member management: read fellow members, admin-only role changes,
--        profiles readable by fellow members (so the admin console shows names).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members a
    join public.org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- profiles: read self OR a fellow school member (for the roster); write self only
drop policy if exists prof_all on public.profiles;
drop policy if exists prof_sel on public.profiles;
drop policy if exists prof_ins on public.profiles;
drop policy if exists prof_upd on public.profiles;
create policy prof_sel on public.profiles for select
  using (id = auth.uid() or public.shares_org_with(id));
create policy prof_ins on public.profiles for insert with check (id = auth.uid());
create policy prof_upd on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- org_members: any member READS their school's roster; a user may self-join only as
-- 'coach'; only an ADMIN may change roles or remove others (coaches can't self-promote).
drop policy if exists om_all on public.org_members;
drop policy if exists om_sel on public.org_members;
drop policy if exists om_ins on public.org_members;
drop policy if exists om_upd on public.org_members;
drop policy if exists om_del on public.org_members;
create policy om_sel on public.org_members for select
  using (org_id in (select public.user_org_ids()));
create policy om_ins on public.org_members for insert
  with check ((user_id = auth.uid() and role = 'coach') or public.is_school_admin(org_id));
create policy om_upd on public.org_members for update
  using (public.is_school_admin(org_id)) with check (public.is_school_admin(org_id));
create policy om_del on public.org_members for delete
  using (user_id = auth.uid() or public.is_school_admin(org_id));

-- Done (v2.1).

-- v2.2 — store an optional phone number on the profile.
alter table public.profiles add column if not exists phone text;

-- v2.3 — self-service account deletion via RPC (no edge function / CORS needed).
-- Deletes ONLY the calling user (auth.uid()); cascades to profiles/org_members/program_coaches.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  -- Detach references that would otherwise block deletion (created_by points at the user).
  update public.organizations set created_by = null where created_by = auth.uid();
  -- Wipe the caller's app data (always permitted on these tables).
  delete from public.program_coaches where user_id = auth.uid();
  delete from public.org_members     where user_id = auth.uid();
  delete from public.profiles        where id      = auth.uid();
  -- Remove the auth login too if the project permits it (otherwise app data is still gone).
  begin
    delete from auth.users where id = auth.uid();
  exception when others then
    null;
  end;
end;
$$;
revoke all on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;

-- Make PostgREST re-read the schema so newly-added functions (like delete_my_account)
-- and columns are exposed to the API immediately. Run this any time RPC says
-- "could not find the function ... in the schema cache."
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.4 — Remove LEGACY org-level policies from the original setup (e.g. "Org members
-- can view/edit programs" using is_org_member). RLS OR's SELECT policies together, so
-- these permissive org-wide rules defeat the strict program-level ones and let any
-- coach see every program in their school. Drop them across all tables.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and qual like '%is_org_member%'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.5 — Edge-function-free invites. An admin pre-authorizes an email+role; the
-- signup trigger (handle_new_user) places that person on registration. No email
-- sent yet (admin tells them to sign up); custom email can be layered on later.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.pending_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'coach',
  program_id uuid references public.programs(id) on delete cascade,
  created_at timestamptz default now(),
  unique (org_id, email)
);
alter table public.pending_invites add column if not exists program_id uuid references public.programs(id) on delete cascade;
alter table public.pending_invites enable row level security;
drop policy if exists pi_all on public.pending_invites;
create policy pi_all on public.pending_invites for all
  using (public.is_school_admin(org_id))
  with check (public.is_school_admin(org_id));
grant all on public.pending_invites to anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.6 — Instant email alerts. `sent_alerts` is a dedup ledger so each record /
-- milestone crossing emails exactly once. The send-alert edge function (service
-- role) inserts here right after emailing; "broke record" still fires after
-- "approaching" because `kind` is part of the unique key. athlete_id is text
-- (no FK) since app athlete ids may still be seed strings like "bb026".
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.sent_alerts (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  athlete_id text,
  stat_name  text,
  kind       text,
  target     numeric,
  created_at timestamptz default now(),
  unique (program_id, athlete_id, stat_name, kind, target)
);
alter table public.sent_alerts enable row level security;
drop policy if exists sa_sel on public.sent_alerts;
create policy sa_sel on public.sent_alerts for select
  using (program_id in (select public.visible_program_ids()));
-- Writes happen via the edge function's service-role key (bypasses RLS).
grant select on public.sent_alerts to authenticated;
grant all on public.sent_alerts to service_role;
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.7 — Billing moves to the SCHOOL (org): one subscription unlocks every member.
-- Each new org auto-gets a 7-day trial (no card) via the column default. The
-- stripe-webhook keeps subscription_status/tier in sync; AppWrapper gates the app
-- on these org columns (unlock only when 'active' or a non-expired trial).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.organizations add column if not exists subscription_status text default 'trialing';
alter table public.organizations add column if not exists subscription_tier   text default 'program';
alter table public.organizations add column if not exists trial_ends_at        timestamptz default (now() + interval '7 days');
alter table public.organizations add column if not exists stripe_customer_id   text;
-- Grandfather existing schools (e.g. Denver Christian) so we don't lock ourselves
-- out while testing billing. New orgs created after this still default to 'trialing'.
update public.organizations set subscription_status = 'active'
  where subscription_status is null or subscription_status = 'trialing';
-- Unique key so the stripe-webhook can upsert subscription rows on conflict.
create unique index if not exists subscriptions_stripe_sub_uidx
  on public.subscriptions (stripe_subscription_id);
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.8 — Claim pending invites on LOGIN, not just signup. The signup trigger only
-- fires for brand-new accounts; if you invite someone who already has an account
-- (or who signed up before the invite landed), this RPC — called by the app on
-- every load — applies their pending invite and upgrades their role if needed
-- (e.g. a coach who's now invited as admin). Fixes "invited as admin but landed
-- as a coach."
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.claim_my_invites()
returns void language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  select lower(email) into em from auth.users where id = auth.uid();
  if em is null then return; end if;
  insert into public.org_members (org_id, user_id, role)
  select pi.org_id, auth.uid(), pi.role from public.pending_invites pi
  where lower(pi.email) = em
  on conflict (org_id, user_id) do update set role = excluded.role;
  insert into public.program_coaches (program_id, user_id)
  select pi.program_id, auth.uid() from public.pending_invites pi
  where lower(pi.email) = em and pi.program_id is not null
  on conflict (program_id, user_id) do nothing;
  delete from public.pending_invites where lower(email) = em;
end $$;
revoke all on function public.claim_my_invites() from anon, public;
grant execute on function public.claim_my_invites() to authenticated;
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v2.9 — Trial-abuse guard. A persistent ledger of every email that has started a
-- free trial. It survives account + org deletion, so re-signing-up with the same
-- email does NOT grant a second free trial — that new school starts expired and
-- must subscribe. Brand-new emails get their one trial as normal.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.trial_ledger (
  email          text primary key,
  first_trial_at timestamptz default now()
);
grant all on public.trial_ledger to service_role;

create or replace function public.gate_org_trial()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if new.created_by is null then return new; end if;
  select lower(email) into em from auth.users where id = new.created_by;
  if em is null then return new; end if;
  if exists (select 1 from public.trial_ledger where email = em) then
    -- this email already used its free trial → no fresh trial; school starts locked
    new.trial_ends_at := now() - interval '1 second';
  else
    insert into public.trial_ledger (email) values (em) on conflict (email) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists gate_org_trial_trg on public.organizations;
create trigger gate_org_trial_trg before insert on public.organizations
  for each row execute function public.gate_org_trial();
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v3.0 — Beta / promo codes. Platform-owner-issued codes that grant free or
-- extended access. A 'trial_days' code pushes trial_ends_at out N days; a 'comp'
-- code flips the org to 'active' (optionally bumping its tier). One redemption per
-- school. Redeeming OVERRIDES the trial-abuse guard (a real code legitimately
-- unlocks even a repeat email). All writes go through SECURITY DEFINER RPCs so a
-- school can't self-grant — validation (active/expiry/limit/already-used) is
-- enforced server-side.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.promo_codes (
  code            text primary key,                    -- stored UPPERCASE
  kind            text not null default 'trial_days',  -- 'trial_days' | 'comp'
  trial_days      int  default 90,                     -- used when kind='trial_days'
  grant_tier      text,                                -- optional: also set this tier on redeem
  note            text,                                -- internal label (e.g. 'Launch beta')
  max_redemptions int,                                 -- null = unlimited
  redemptions     int  not null default 0,
  active          boolean not null default true,
  expires_at      timestamptz,                         -- code stops working after this
  created_at      timestamptz default now()
);

alter table public.organizations add column if not exists promo_code text;          -- which code this school redeemed (one per org)
alter table public.profiles      add column if not exists is_platform_owner boolean not null default false;

-- Only platform owners can SEE the code list (for the generator panel). All writes
-- happen via the SECURITY DEFINER RPCs below — no insert/update/delete policy.
grant select on public.promo_codes to anon, authenticated, service_role;
alter table public.promo_codes enable row level security;
drop policy if exists promo_sel on public.promo_codes;
create policy promo_sel on public.promo_codes for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_platform_owner));

-- Redeem: a school admin applies a code to their org. Raises on any invalid case.
create or replace function public.redeem_promo_code(p_code text, p_org_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c public.promo_codes; msg text;
begin
  if not public.is_school_admin(p_org_id) then raise exception 'Only a school admin can apply a code.'; end if;
  select * into c from public.promo_codes where code = upper(trim(p_code));
  if not found or not c.active then raise exception 'That code isn''t valid.'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'That code has expired.'; end if;
  if c.max_redemptions is not null and c.redemptions >= c.max_redemptions then raise exception 'That code has reached its redemption limit.'; end if;
  if exists (select 1 from public.organizations where id = p_org_id and promo_code is not null) then
    raise exception 'Your school has already applied a code.';
  end if;
  if c.kind = 'comp' then
    update public.organizations
       set subscription_status = 'active',
           subscription_tier   = coalesce(c.grant_tier, subscription_tier),
           promo_code          = c.code
     where id = p_org_id;
    msg := 'Applied! Full access unlocked.';
  else
    update public.organizations
       set subscription_status = 'trialing',
           trial_ends_at       = now() + make_interval(days => coalesce(c.trial_days, 90)),
           subscription_tier   = coalesce(c.grant_tier, subscription_tier),
           promo_code          = c.code
     where id = p_org_id;
    msg := 'Applied! ' || coalesce(c.trial_days, 90) || ' days of free access.';
  end if;
  update public.promo_codes set redemptions = redemptions + 1 where code = c.code;
  return msg;
end $$;

-- Generate / upsert a code (platform owner only).
create or replace function public.create_promo_code(
  p_code text, p_kind text default 'trial_days', p_trial_days int default 90,
  p_note text default null, p_max int default null, p_expires timestamptz default null,
  p_grant_tier text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_platform_owner) then
    raise exception 'Not authorized.';
  end if;
  insert into public.promo_codes (code, kind, trial_days, note, max_redemptions, expires_at, grant_tier)
  values (upper(trim(p_code)), coalesce(p_kind,'trial_days'), p_trial_days, p_note, p_max, p_expires, nullif(trim(coalesce(p_grant_tier,'')),''))
  on conflict (code) do update set
    kind = excluded.kind, trial_days = excluded.trial_days, note = excluded.note,
    max_redemptions = excluded.max_redemptions, expires_at = excluded.expires_at,
    grant_tier = excluded.grant_tier, active = true;
end $$;

-- Activate / deactivate a code (platform owner only).
create or replace function public.set_promo_active(p_code text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_platform_owner) then
    raise exception 'Not authorized.';
  end if;
  update public.promo_codes set active = p_active where code = upper(trim(p_code));
end $$;

-- List codes for the generator panel (returns rows only to platform owners).
create or replace function public.list_promo_codes()
returns setof public.promo_codes language sql stable security definer set search_path = public as $$
  select * from public.promo_codes
  where exists (select 1 from public.profiles where id = auth.uid() and is_platform_owner)
  order by created_at desc;
$$;

revoke all on function public.redeem_promo_code(text,uuid) from anon, public;
revoke all on function public.create_promo_code(text,text,int,text,int,timestamptz,text) from anon, public;
revoke all on function public.set_promo_active(text,boolean) from anon, public;
revoke all on function public.list_promo_codes() from anon, public;
grant execute on function public.redeem_promo_code(text,uuid) to authenticated;
grant execute on function public.create_promo_code(text,text,int,text,int,timestamptz,text) to authenticated;
grant execute on function public.set_promo_active(text,boolean) to authenticated;
grant execute on function public.list_promo_codes() to authenticated;

-- Make yourself the platform owner (edit emails as needed):
update public.profiles set is_platform_owner = true
where lower(email) in ('djhoch22@gmail.com', 'dhoch@denverchristian.org');

-- A starter launch code (or create codes from the in-app panel):
insert into public.promo_codes (code, kind, trial_days, grant_tier, note)
values ('BETA90', 'trial_days', 90, 'school_plus', 'Launch beta — 90 days of School+')
on conflict (code) do nothing;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v3.1 — Fix onboarding "Create your program" (RLS denial) + make the school's
-- creator its admin. Two root causes:
--   1) prog_ins checked org_members via a RAW subquery (subject to org_members'
--      own RLS), so a brand-new creator's just-inserted membership wasn't reliably
--      visible during the INSERT check → "new row violates row-level security
--      policy for table programs". It now uses the SECURITY DEFINER user_org_ids()
--      (like the original prog_all did) plus an org-creator bootstrap.
--   2) The creator was added as 'coach' (om_ins only allowed self-insert as coach),
--      so the AD who set up the school landed with no admin powers. om_ins now lets
--      the org's CREATOR add their own membership at ANY role; the client inserts
--      them as 'admin'.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.is_org_creator(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organizations o where o.id = p_org and o.created_by = auth.uid());
$$;
grant execute on function public.is_org_creator(uuid) to authenticated;

drop policy if exists prog_ins on public.programs;
create policy prog_ins on public.programs for insert
  with check (org_id in (select public.user_org_ids()) or public.is_org_creator(org_id));

drop policy if exists om_ins on public.org_members;
create policy om_ins on public.org_members for insert
  with check (
    (user_id = auth.uid() and (role = 'coach' or public.is_org_creator(org_id)))
    or public.is_school_admin(org_id)
  );

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v3.2 — Atomic onboarding. The client-side org→membership→program sequence was
-- intermittently leaving the new user without a usable membership (created_by null,
-- RLS denying the program insert). This does the WHOLE thing in one transaction as
-- the real signed-in user (auth.uid(), not a client-passed id), bypassing RLS via
-- SECURITY DEFINER. If anything fails it all rolls back — no half-made orgs.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.onboard_new_school(
  p_name text, p_city text, p_state text,
  p_address text, p_zip text, p_level text, p_ad_name text, p_ad_email text,
  p_sport text, p_mascot text, p_color text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_org  uuid;
  v_prog uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'Not signed in.'; end if;
  if coalesce(trim(p_name), '')   = '' then raise exception 'School name is required.'; end if;
  if coalesce(trim(p_mascot), '') = '' then raise exception 'Team name / mascot is required.'; end if;
  v_slug := regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g');

  insert into public.organizations (name, slug, city, state, address, zip, level, ad_name, ad_email, created_by)
  values (p_name, v_slug, nullif(trim(p_city), ''), nullif(trim(p_state), ''), nullif(trim(p_address), ''),
          nullif(trim(p_zip), ''), nullif(trim(p_level), ''), nullif(trim(p_ad_name), ''),
          nullif(trim(p_ad_email), ''), v_uid)
  returning id into v_org;

  insert into public.org_members (org_id, user_id, role)
  values (v_org, v_uid, 'admin')
  on conflict (org_id, user_id) do update set role = 'admin';

  insert into public.programs (org_id, name, mascot, sport, primary_color)
  values (v_org, p_name, p_mascot, coalesce(p_sport, 'basketball_boys'), p_color)
  returning id into v_prog;

  -- Invite the named AD as admin (best effort), unless it's the creator's own email.
  if p_ad_email is not null and length(trim(p_ad_email)) > 0 then
    insert into public.pending_invites (org_id, email, role)
    values (v_org, lower(trim(p_ad_email)), 'admin')
    on conflict (org_id, email) do nothing;
  end if;

  return jsonb_build_object('org_id', v_org, 'program_id', v_prog);
end $$;

revoke all on function public.onboard_new_school(text,text,text,text,text,text,text,text,text,text,text) from anon, public;
grant execute on function public.onboard_new_school(text,text,text,text,text,text,text,text,text,text,text) to authenticated;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v3.3 — Per-season player stats (powers the Athlete all-years view). One row per
-- player per season; `stats` jsonb uses the SAME stat-name keys as career stats
-- (e.g. {"Points":412,"Rebounds":88}) so per-season + career align per sport.
-- A player-season attaches to a player by (program_id, lower(player_name)) — the
-- same name-matching the app already uses. Visibility mirrors athletes.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.player_seasons (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete cascade,
  player_name text not null,
  season      text not null,                  -- e.g. '1976-77'
  grade       text,                           -- optional: Fr/So/Jr/Sr
  stats       jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_player_seasons_prog on public.player_seasons(program_id);
create unique index if not exists uq_player_seasons on public.player_seasons (program_id, lower(player_name), season);
grant all privileges on public.player_seasons to anon, authenticated, service_role;

alter table public.player_seasons enable row level security;
drop policy if exists ps_all on public.player_seasons;
create policy ps_all on public.player_seasons for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

NOTIFY pgrst, 'reload schema';

-- ── v3.4: awards (all-league / all-state for players, Coach of the Year for coaches) ──
-- Structured honors that feed HOF candidacy. One row per honor (a player can have many).
create table if not exists public.awards (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references public.programs(id) on delete cascade,
  scope       text not null,                  -- 'player' | 'coach'
  kind        text not null,                  -- 'all_league' | 'all_state' | 'coach_of_year'
  level       text,                           -- 'league' | 'state' (used for coach_of_year)
  holder_name text not null,                  -- the player or coach name
  season      text,                           -- e.g. '2024-2025' (optional)
  created_at  timestamptz default now()
);
create index if not exists idx_awards_prog on public.awards(program_id);
grant all privileges on public.awards to anon, authenticated, service_role;

alter table public.awards enable row level security;
drop policy if exists awards_all on public.awards;
create policy awards_all on public.awards for all
  using (program_id in (select public.user_program_ids()))
  with check (program_id in (select public.user_program_ids()));

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- v3.5 — PUBLIC RECORD BOOK (SEO). Each program gets a stable URL slug and an
-- is_public flag (PUBLIC BY DEFAULT — schools opt OUT). Anonymous visitors can
-- read ONLY record-book data (records, all-time players + Hall of Fame, season
-- history, honors, per-season stats) of programs where is_public = true, and only
-- via athletic columns — NO contact info (org ad_email/address are never exposed;
-- the public_teams view selects safe columns only). The Vercel SSR functions read
-- these with the public anon key to render crawlable /teams/<slug> pages.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Flags + slug column
alter table public.programs add column if not exists is_public boolean default true;
alter table public.programs add column if not exists slug text;

-- 2) Auto-generate a unique slug for every NEW program (school name + sport).
create or replace function public.set_program_slug()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; cand text; n int := 1; oname text;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then return new; end if;
  select name into oname from public.organizations where id = new.org_id;
  base := trim(both '-' from regexp_replace(
            lower(coalesce(oname,'team') || '-' || coalesce(nullif(new.sport,''),'team')),
            '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'team'; end if;
  cand := base;
  while exists (select 1 from public.programs where slug = cand) loop
    n := n + 1; cand := base || '-' || n;
  end loop;
  new.slug := cand;
  return new;
end $$;
drop trigger if exists set_program_slug_trg on public.programs;
create trigger set_program_slug_trg before insert on public.programs
  for each row execute function public.set_program_slug();

-- 3) Backfill slugs for EXISTING programs (dedupe collisions with -2, -3, …).
with ranked as (
  select p.id,
         trim(both '-' from regexp_replace(
           lower(coalesce(o.name,'team') || '-' || coalesce(nullif(p.sport,''),'team')),
           '[^a-z0-9]+','-','g')) as base,
         row_number() over (
           partition by trim(both '-' from regexp_replace(
             lower(coalesce(o.name,'team') || '-' || coalesce(nullif(p.sport,''),'team')),
             '[^a-z0-9]+','-','g'))
           order by p.created_at, p.id) as rn
  from public.programs p
  join public.organizations o on o.id = p.org_id
  where p.slug is null or length(trim(p.slug)) = 0
)
update public.programs p
   set slug = case when r.rn = 1 then r.base else r.base || '-' || r.rn end
  from ranked r
 where r.id = p.id and r.base <> '';
-- any still-null (e.g. base was empty) → fall back to a short id-based slug
update public.programs set slug = 'team-' || left(id::text, 8)
  where slug is null or length(trim(slug)) = 0;

create unique index if not exists uq_programs_slug on public.programs(slug);

-- 4) Helper: ids of public programs (SECURITY DEFINER → bypasses RLS, no recursion).
create or replace function public.public_program_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.programs where coalesce(is_public, true);
$$;
grant execute on function public.public_program_ids() to anon, authenticated, service_role;

-- 5) Safe public view: ONLY athletic / non-sensitive columns, ONLY public programs,
--    joined to the school's directory info. SSR reads this for the page header.
--    (A plain view runs as its owner → bypasses RLS; the WHERE is the public gate.)
create or replace view public.public_teams as
  select p.id, p.slug, p.name, p.mascot, p.sport, p.primary_color, p.logo_url, p.coach_hof,
         o.id as org_id, o.name as school_name, o.city, o.state, o.level
  from public.programs p
  join public.organizations o on o.id = p.org_id
  where coalesce(p.is_public, true);
grant select on public.public_teams to anon, authenticated, service_role;

-- 6) Anonymous READ policies on record-book child tables (athletic columns only;
--    none of these hold contact info). Authenticated users keep their existing
--    visible_program_ids policies; these ADD public read for the anon role only.
drop policy if exists atp_pub_sel on public.all_time_players;
create policy atp_pub_sel on public.all_time_players for select to anon
  using (program_id in (select public.public_program_ids()));

drop policy if exists rec_pub_sel on public.records;
create policy rec_pub_sel on public.records for select to anon
  using (program_id in (select public.public_program_ids()));

drop policy if exists seas_pub_sel on public.seasons;
create policy seas_pub_sel on public.seasons for select to anon
  using (program_id in (select public.public_program_ids()));

drop policy if exists awards_pub_sel on public.awards;
create policy awards_pub_sel on public.awards for select to anon
  using (program_id in (select public.public_program_ids()));

drop policy if exists ps_pub_sel on public.player_seasons;
create policy ps_pub_sel on public.player_seasons for select to anon
  using (program_id in (select public.public_program_ids()));

drop policy if exists ath_pub_sel on public.athletes;
create policy ath_pub_sel on public.athletes for select to anon
  using (program_id in (select public.public_program_ids()));

NOTIFY pgrst, 'reload schema';

-- Done (v3.5). Public record book: programs.slug + is_public, public_teams view,
-- anon read of record-book tables for opted-in (public-by-default) programs.

-- ════════════════════════════════════════════════════════════════════════════
-- v3.6 — Career totals from season uploads. Season-stat imports write player_seasons
-- but the career totals shown on Overview/Athletes/All-Time/Records/Milestones live in
-- all_time_players (+ athletes). This RPC recomputes a program's career = SUM of each
-- player's season rows (every numeric stat key), and mirrors it onto the active roster.
-- Called by the season importer after each upload, and runnable manually to backfill.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.recompute_career_from_seasons(p_program uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  with kv as (
    select lower(ps.player_name) lname, e.key, sum((e.value)::numeric) val
    from public.player_seasons ps, jsonb_each_text(ps.stats) e
    where ps.program_id = p_program and e.value ~ '^-?[0-9]+(\.[0-9]+)?$'
    group by lower(ps.player_name), e.key
  ),
  agg as (select lname, jsonb_object_agg(key, val) stats from kv group by lname),
  yrs as (select lower(player_name) lname, min(season) fy, max(season) ly
          from public.player_seasons where program_id = p_program group by lower(player_name))
  update public.all_time_players t
     set stats      = coalesce(agg.stats, t.stats),
         first_year = coalesce(yrs.fy, t.first_year),
         last_year  = coalesce(yrs.ly, t.last_year)
  from agg join yrs on yrs.lname = agg.lname
  where t.program_id = p_program and lower(t.name) = agg.lname;

  -- mirror career totals onto the active athletes roster (so Athletes/Overview match)
  update public.athletes ath
     set stats = t.stats
  from public.all_time_players t
  where ath.program_id = p_program and t.program_id = p_program
    and lower(ath.name) = lower(t.name);
end $$;
grant execute on function public.recompute_career_from_seasons(uuid) to anon, authenticated, service_role;

-- One-time backfill: fix the already-uploaded girls-soccer totals from its season rows.
do $$ declare pid uuid; begin
  select id into pid from public.programs where slug = 'denver-christian-soccer-girls';
  if pid is not null then perform public.recompute_career_from_seasons(pid); end if;
end $$;
NOTIFY pgrst, 'reload schema';
