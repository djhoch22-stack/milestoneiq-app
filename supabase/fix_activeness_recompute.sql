-- Activeness fix: a player is "active"/"current" ONLY if their latest season is the CURRENT
-- academic year. Uploading a PAST season no longer marks its players active (they're alumni).
-- Career-import programs (no season rows) are guarded and never touched.
-- Run this FIRST, then load_fb_2024_25.sql.

create or replace function public.recompute_career_from_seasons(p_program uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur_season text;
begin
  -- the CURRENT academic year (rolls over in July), e.g. '2025-2026'. A player is "active"/"current"
  -- ONLY if their latest season is this year — so uploading a PAST season never marks players active.
  cur_season := case when extract(month from now()) >= 7
    then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int end;

  -- per-player career = SUM of every numeric stat across their season rows
  drop table if exists _pc;
  create temp table _pc as
  with kv as (
    select lower(ps.player_name) lname, e.key, sum((e.value)::numeric) val
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

  -- 1) update existing all-time players (and refresh their current-season flag)
  update public.all_time_players t
     set stats = p.stats, first_year = p.fy, last_year = p.ly, is_current = (p.ly = cur_season)
  from _pc p where t.program_id = p_program and lower(t.name) = p.lname;

  -- 2) INSERT all-time players new from a season upload (e.g. a fresh roster)
  insert into public.all_time_players (program_id, name, first_year, last_year, is_current, school_hall_of_fame, state_hall_of_fame, stats)
  select p_program, p.disp, p.fy, p.ly, (p.ly = cur_season), false, false, p.stats
  from _pc p
  where not exists (select 1 from public.all_time_players t where t.program_id = p_program and lower(t.name) = p.lname);

  -- 3) update existing active athletes' stats to match career
  update public.athletes ath set stats = t.stats
  from public.all_time_players t
  where ath.program_id = p_program and t.program_id = p_program and lower(ath.name) = lower(t.name);

  -- 4) add players from the CURRENT academic season to the active roster if they aren't there yet
  insert into public.athletes (program_id, name, is_active, stats)
  select p_program, p.disp, true, p.stats
  from _pc p
  where p.ly = cur_season
    and not exists (select 1 from public.athletes ath where ath.program_id = p_program and lower(ath.name) = p.lname);

  -- 4b) activeness is CURRENT-season-only: an athlete is active IFF they have a season row in the
  --     current academic year. So uploading a past season leaves its players inactive (alumni).
  --     Guarded on the program having season rows so career-import programs are never touched.
  if exists (select 1 from public.player_seasons where program_id = p_program) then
    update public.athletes ath
       set is_active = exists (
         select 1 from public.player_seasons ps
         where ps.program_id = p_program and lower(ps.player_name) = lower(ath.name) and ps.season = cur_season)
     where ath.program_id = p_program;
  end if;

  -- 5) collapse case-variant duplicates (e.g. "Van andel" vs "Van Andel"): keep the row whose
  --    exact name matches player_seasons, delete the mis-cased sibling. Prevents split careers.
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

-- Re-run for football now so its 47 wrongly-"active" players drop to 0 (no 2025-2026 data yet).
do $$ declare pid uuid; begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is not null then perform public.recompute_career_from_seasons(pid); end if;
end $$;
NOTIFY pgrst, 'reload schema';
