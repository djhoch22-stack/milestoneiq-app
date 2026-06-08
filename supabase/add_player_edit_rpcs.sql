-- ════════════════════════════════════════════════════════════════════════════
-- Player self-service editing: rename_player + delete_player (all sports/programs)
-- ════════════════════════════════════════════════════════════════════════════
-- Powers the "Edit player" controls in the player profile modal. SECURITY INVOKER so each call runs under
-- the caller's RLS — a coach can only touch their own program's data (same access the app already uses for
-- savePlayerSeason / deleteAthlete / etc.). The final recompute is SECURITY DEFINER (unchanged) and rebuilds
-- the all-time + active rosters from the season rows. Works for season-based AND career-import programs.

-- Sum two stat maps: ADD numeric values, MAX the "Longest …" single-play maxes (same rule as recompute).
-- Used to combine two distinct CAREERS (career-import programs with no season rows).
create or replace function public._merge_stats(a jsonb, b jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key, val), '{}'::jsonb)
  from (
    select key, case when key like 'Longest %' then max(v) else sum(v) end as val
    from (
      select key, (value)::numeric v from jsonb_each_text(coalesce(a, '{}'::jsonb)) where value ~ '^-?[0-9]+(\.[0-9]+)?$'
      union all
      select key, (value)::numeric v from jsonb_each_text(coalesce(b, '{}'::jsonb)) where value ~ '^-?[0-9]+(\.[0-9]+)?$'
    ) u group by key
  ) m;
$$;

-- Combine two stat maps for the SAME season (a merge/duplicate, never additive): take the MAX of each
-- stat, so re-uploading the same player under two names never DOUBLES their numbers, and an empty roster
-- row (0) just yields the real value. Career totals across DIFFERENT seasons are still summed by recompute.
create or replace function public._max_stats(a jsonb, b jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key, val), '{}'::jsonb)
  from (
    select key, max(v) as val
    from (
      select key, (value)::numeric v from jsonb_each_text(coalesce(a, '{}'::jsonb)) where value ~ '^-?[0-9]+(\.[0-9]+)?$'
      union all
      select key, (value)::numeric v from jsonb_each_text(coalesce(b, '{}'::jsonb)) where value ~ '^-?[0-9]+(\.[0-9]+)?$'
    ) u group by key
  ) m;
$$;

-- Rename a player. If the new name already exists, the two are MERGED into one (season rows combined,
-- careers summed). Case-only changes just fix the spelling. Matching is case-insensitive on the old name.
create or replace function public.rename_player(p_program uuid, p_old text, p_new text)
returns void language plpgsql set search_path = public as $$
declare s record;
begin
  p_new := btrim(p_new);
  if p_old is null or p_new is null or p_new = '' then return; end if;

  -- A) Season rows: per season, merge into the new name if it already has that season, else rename.
  for s in select season, stats from public.player_seasons where program_id = p_program and lower(player_name) = lower(p_old) loop
    if exists (select 1 from public.player_seasons where program_id = p_program and lower(player_name) = lower(p_new) and season = s.season) then
      update public.player_seasons set stats = public._max_stats(stats, s.stats)  -- same season = merge, never double
       where program_id = p_program and lower(player_name) = lower(p_new) and season = s.season;
      delete from public.player_seasons where program_id = p_program and lower(player_name) = lower(p_old) and season = s.season;
    else
      update public.player_seasons set player_name = p_new where program_id = p_program and lower(player_name) = lower(p_old) and season = s.season;
    end if;
  end loop;

  -- B) Records / awards holder name.
  update public.records set holder_name = p_new where program_id = p_program and lower(holder_name) = lower(p_old);
  update public.awards  set holder_name = p_new where program_id = p_program and lower(holder_name) = lower(p_old);

  -- C) Active roster + all-time: merge (sum) into the new name if it exists, else rename. For season-based
  --    programs step D overwrites these with the accurate season totals; for career-import programs (no
  --    season rows) this is the final state.
  if exists (select 1 from public.athletes where program_id = p_program and lower(name) = lower(p_new)) then
    update public.athletes t set stats = public._merge_stats(t.stats, o.stats)
      from public.athletes o
     where t.program_id = p_program and o.program_id = p_program and lower(t.name) = lower(p_new) and lower(o.name) = lower(p_old);
    delete from public.athletes where program_id = p_program and lower(name) = lower(p_old);
  else
    update public.athletes set name = p_new where program_id = p_program and lower(name) = lower(p_old);
  end if;

  if exists (select 1 from public.all_time_players where program_id = p_program and lower(name) = lower(p_new)) then
    update public.all_time_players t set stats = public._merge_stats(t.stats, o.stats)
      from public.all_time_players o
     where t.program_id = p_program and o.program_id = p_program and lower(t.name) = lower(p_new) and lower(o.name) = lower(p_old);
    delete from public.all_time_players where program_id = p_program and lower(name) = lower(p_old);
  else
    update public.all_time_players set name = p_new where program_id = p_program and lower(name) = lower(p_old);
  end if;

  -- D) Rebuild careers from the season rows (no-op for career-import programs with no season rows).
  perform public.recompute_career_from_seasons(p_program);
end $$;

-- Permanently delete a player from a program: their season rows, active-roster entry, all-time entry, and
-- any records/awards they hold. Case-insensitive on the name. Rebuilds the remaining careers afterward.
create or replace function public.delete_player(p_program uuid, p_name text)
returns void language plpgsql set search_path = public as $$
begin
  if p_name is null then return; end if;
  delete from public.player_seasons   where program_id = p_program and lower(player_name) = lower(p_name);
  delete from public.athletes         where program_id = p_program and lower(name)        = lower(p_name);
  delete from public.all_time_players where program_id = p_program and lower(name)        = lower(p_name);
  delete from public.records          where program_id = p_program and lower(holder_name) = lower(p_name);
  delete from public.awards           where program_id = p_program and lower(holder_name) = lower(p_name);
  perform public.recompute_career_from_seasons(p_program);
end $$;

grant execute on function public._merge_stats(jsonb, jsonb)        to anon, authenticated, service_role;
grant execute on function public._max_stats(jsonb, jsonb)          to anon, authenticated, service_role;
grant execute on function public.rename_player(uuid, text, text)   to anon, authenticated, service_role;
grant execute on function public.delete_player(uuid, text)         to anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
