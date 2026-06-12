-- ────────────────────────────────────────────────────────────────────────────
-- FIX: the career recompute was force-DEACTIVATING players on every run.
-- ────────────────────────────────────────────────────────────────────────────
-- Old step "4b" set is_active = (player has a CURRENT-season stat row) for EVERY athlete. A player you
-- added manually (current roster, no per-season stats yet) has zero season rows → got wrongly marked
-- inactive, and every import re-ran it → your reactivations never stuck.
--
-- This redefinition keeps everything else verbatim — career stat SUMs, Longest→MAX, HOF-flag
-- preservation (flags are never touched on update), and the helpful auto-ADD of current-season players —
-- but REMOVES the auto-deactivation. Active status is now owned by the app (grad-year on add + your
-- manual toggles); the recompute only rebuilds stats and adds new current-season players. Safe to re-run.

create or replace function public.recompute_career_from_seasons(p_program uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur_season text;
begin
  -- the CURRENT academic year (rolls over in July), e.g. '2025-2026'.
  cur_season := case when extract(month from now()) >= 7
    then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int end;

  -- per-player career: SUM each numeric stat across their season rows, EXCEPT "Longest …" → MAX
  drop table if exists _pc;
  create temp table _pc as
  with kv as (
    select lower(ps.player_name) lname, e.key,
           case when e.key like 'Longest %' then max((e.value)::numeric) else sum((e.value)::numeric) end val
    from public.player_seasons ps, jsonb_each_text(ps.stats) e
    where ps.program_id = p_program and e.value ~ '^-?[0-9]+(\.[0-9]+)?$'
    group by lower(ps.player_name), e.key
  ),
  agg as (select lname, jsonb_object_agg(key, val) stats from kv group by lname),
  yrs as (select lower(player_name) lname,
                 (array_agg(player_name order by season desc))[1] disp,
                 min(season) fy, max(season) ly
          from public.player_seasons where program_id = p_program group by lower(player_name))
  select y.lname, y.disp, y.fy, y.ly, a.stats from agg a join yrs y on y.lname = a.lname;

  -- 1) update existing all-time players (refresh stats + current-season flag; HOF flags untouched)
  update public.all_time_players t
     set stats = p.stats, first_year = p.fy, last_year = p.ly, is_current = (p.ly = cur_season)
  from _pc p where t.program_id = p_program and lower(t.name) = p.lname;

  -- 2) INSERT all-time players new from a season upload (e.g. a fresh roster)
  insert into public.all_time_players (program_id, name, first_year, last_year, is_current, school_hall_of_fame, state_hall_of_fame, stats)
  select p_program, p.disp, p.fy, p.ly, (p.ly = cur_season), false, false, p.stats
  from _pc p
  where not exists (select 1 from public.all_time_players t where t.program_id = p_program and lower(t.name) = p.lname);

  -- 3) update existing athletes' stats to match career (is_active untouched)
  update public.athletes ath set stats = t.stats
  from public.all_time_players t
  where ath.program_id = p_program and t.program_id = p_program and lower(ath.name) = lower(t.name);

  -- 4) ADD players from the CURRENT academic season to the active roster if they aren't there yet
  insert into public.athletes (program_id, name, is_active, stats)
  select p_program, p.disp, true, p.stats
  from _pc p
  where p.ly = cur_season
    and not exists (select 1 from public.athletes ath where ath.program_id = p_program and lower(ath.name) = p.lname);

  -- (step 4b REMOVED — the recompute no longer auto-deactivates. Active status is managed by the app.)

  -- 5) collapse case-variant duplicates (e.g. "Van andel" vs "Van Andel") to prevent split careers
  delete from public.all_time_players a
  where a.program_id = p_program
    and not exists (select 1 from public.player_seasons ps
                    where ps.program_id = p_program and ps.player_name = a.name)
    and exists (select 1 from public.all_time_players b
                where b.program_id = p_program and b.id <> a.id and lower(b.name) = lower(a.name)
                  and exists (select 1 from public.player_seasons ps
                              where ps.program_id = p_program and ps.player_name = b.name));

  drop table if exists _pc;
end $$;
grant execute on function public.recompute_career_from_seasons(uuid) to anon, authenticated, service_role;

-- One-time restore: the boys-basketball roster the old recompute wrongly deactivated. (The athletes
-- table holds only your managed roster — alumni live in all_time_players — so this just turns your
-- current bench back on. Deactivate any individual later if needed; it will now stick.)
update public.athletes ath
   set is_active = true
  from public.programs pr
 where pr.id = ath.program_id and pr.sport = 'basketball_boys';

NOTIFY pgrst, 'reload schema';
