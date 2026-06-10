-- ────────────────────────────────────────────────────────────────────────────
-- Per-program "minimum to qualify" settings for rate-stat records (v4.0)
-- ────────────────────────────────────────────────────────────────────────────
-- Coaches can set how many At Bats / Innings Pitched / FG attempts etc. a player
-- needs before a rate stat (AVG, OBP, SLG, OPS, Fielding %, ERA, FG%, 3P%, FT%)
-- counts for records and leaderboards. Stored as overrides keyed by stat name:
--   {"Batting Average": {"season": 25, "career": 80}, "ERA": {"career": 50}}
-- Anything not set falls back to the app's built-in defaults.

alter table public.programs
  add column if not exists record_minimums jsonb not null default '{}'::jsonb;

-- Public record book reads the same minimums so raftersiq.com/teams/<slug>
-- shows the identical qualified record holders + leaderboards.
create or replace view public.public_teams as
  select p.id, p.slug, p.name, p.mascot, p.sport, p.primary_color, p.logo_url, p.coach_hof,
         p.record_minimums,
         o.id as org_id, o.name as school_name, o.city, o.state, o.level
  from public.programs p
  join public.organizations o on o.id = p.org_id
  where coalesce(p.is_public, true);
grant select on public.public_teams to anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
