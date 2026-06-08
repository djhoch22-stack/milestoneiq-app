-- ────────────────────────────────────────────────────────────────────────────
-- Auto-clean abbreviated-name orphans on every career rollup
-- ────────────────────────────────────────────────────────────────────────────
-- When a roster upload renames a season's "A. Terpstra" rows to "Alex Terpstra", the old
-- abbreviated ALL-TIME entry no longer matches any season row, so it lingers as a stale
-- orphan (looks like the name "didn't update"). This adds step 6 to the rollup: it deletes
-- abbreviated all-time entries (single-letter first name) that have NO season rows AND a
-- full-name sibling sharing the last name + first initial — i.e. exactly the leftovers a
-- roster rename creates. Re-running it for football clears the current orphans, and it runs
-- on every future import automatically.

create or replace function public.recompute_career_from_seasons(p_program uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur_season text;
begin
  cur_season := case when extract(month from now()) >= 7
    then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int end;

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

  update public.all_time_players t
     set stats = p.stats, first_year = p.fy, last_year = p.ly, is_current = (p.ly = cur_season)
  from _pc p where t.program_id = p_program and lower(t.name) = p.lname;

  insert into public.all_time_players (program_id, name, first_year, last_year, is_current, school_hall_of_fame, state_hall_of_fame, stats)
  select p_program, p.disp, p.fy, p.ly, (p.ly = cur_season), false, false, p.stats
  from _pc p
  where not exists (select 1 from public.all_time_players t where t.program_id = p_program and lower(t.name) = p.lname);

  update public.athletes ath set stats = t.stats
  from public.all_time_players t
  where ath.program_id = p_program and t.program_id = p_program and lower(ath.name) = lower(t.name);

  insert into public.athletes (program_id, name, is_active, stats)
  select p_program, p.disp, true, p.stats
  from _pc p
  where p.ly = cur_season
    and not exists (select 1 from public.athletes ath where ath.program_id = p_program and lower(ath.name) = p.lname);

  if exists (select 1 from public.player_seasons where program_id = p_program) then
    update public.athletes ath
       set is_active = exists (
         select 1 from public.player_seasons ps
         where ps.program_id = p_program and lower(ps.player_name) = lower(ath.name) and ps.season = cur_season)
     where ath.program_id = p_program;
  end if;

  -- collapse case-variant duplicates
  delete from public.all_time_players a
  where a.program_id = p_program
    and not exists (select 1 from public.player_seasons ps
                    where ps.program_id = p_program and ps.player_name = a.name)
    and exists (select 1 from public.all_time_players b
                where b.program_id = p_program and b.id <> a.id and lower(b.name) = lower(a.name)
                  and exists (select 1 from public.player_seasons ps
                              where ps.program_id = p_program and ps.player_name = b.name));

  -- remove abbreviated all-time entries orphaned by a roster rename (full-name sibling now owns the data)
  delete from public.all_time_players a
  where a.program_id = p_program
    and a.name ~ '^[A-Za-z]\.? '
    and not exists (select 1 from public.player_seasons ps
                    where ps.program_id = p_program and lower(ps.player_name) = lower(a.name))
    and exists (select 1 from public.all_time_players f
                where f.program_id = p_program and f.id <> a.id and f.name !~ '^[A-Za-z]\.? '
                  and lower(split_part(f.name, ' ', -1)) = lower(split_part(a.name, ' ', -1))
                  and lower(left(f.name, 1)) = lower(left(a.name, 1)));

  drop table if exists _pc;
end $$;
grant execute on function public.recompute_career_from_seasons(uuid) to anon, authenticated, service_role;

-- Rebuild DC football now to clear the current orphans.
do $$ declare pid uuid; begin
  select id into pid from public.programs where slug = 'denver-christian-football';
  if pid is not null then perform public.recompute_career_from_seasons(pid); end if;
end $$;

NOTIFY pgrst, 'reload schema';
