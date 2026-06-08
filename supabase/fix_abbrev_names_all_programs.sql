-- ────────────────────────────────────────────────────────────────────────────
-- Merge abbreviated names ("J. Lastname") into their full name — ALL programs, ALL sports
-- ────────────────────────────────────────────────────────────────────────────
-- For every player stored with an initials-only first name, if EXACTLY ONE full-name player in the
-- same program shares the last name + first initial, that abbreviated entry is the same person — so we
-- fold its season rows into the full name and rebuild careers. The "exactly one" guard is what keeps it
-- safe: if two full names share a last+initial (e.g. "Jake Johnson" AND "Jordan Johnson" vs "J. Johnson"),
-- it's ambiguous and we leave it alone (no wrong merge, no data loss).
--
-- Same-season collisions (the roster's full row + the stat sheet's abbreviated row for the same year) are
-- MERGED at the jsonb level (real stats win over the empty roster row), because player_seasons is unique
-- on (program_id, lower(player_name), season). Re-runnable: once names are full, it does nothing.

do $$
declare
  r record;            -- a distinct abbreviated (program, name)
  s record;            -- one season row of that abbreviated player
  full_name text;      -- the resolved full name
  n_full int;          -- # of distinct full-name siblings (must be 1 to act)
  affected uuid[] := '{}';
  pid uuid;
  merges int := 0;
begin
  for r in
    select distinct program_id, player_name
    from public.player_seasons
    where player_name ~ '^[A-Za-z][.]? '          -- single-letter first name + optional dot + space
  loop
    -- Count distinct FULL-name siblings (case-insensitive) sharing last token + first initial, from both
    -- the all-time roster and the season rows. Act only when there is exactly one.
    select count(distinct lower(c.nm)), min(c.nm) into n_full, full_name
    from (
      select atp.name as nm from public.all_time_players atp
       where atp.program_id = r.program_id and atp.name !~ '^[A-Za-z][.]? '
         and lower(split_part(atp.name, ' ', -1)) = lower(split_part(r.player_name, ' ', -1))
         and lower(left(atp.name, 1)) = lower(left(r.player_name, 1))
      union all
      select ps.player_name as nm from public.player_seasons ps
       where ps.program_id = r.program_id and ps.player_name !~ '^[A-Za-z][.]? '
         and lower(split_part(ps.player_name, ' ', -1)) = lower(split_part(r.player_name, ' ', -1))
         and lower(left(ps.player_name, 1)) = lower(left(r.player_name, 1))
    ) c;
    if n_full <> 1 or full_name is null then continue; end if;

    -- Fold each abbreviated season row into the full name (jsonb-merge if that season already exists).
    for s in
      select season, stats from public.player_seasons
       where program_id = r.program_id and player_name = r.player_name
    loop
      if exists (select 1 from public.player_seasons
                  where program_id = r.program_id and lower(player_name) = lower(full_name) and season = s.season) then
        update public.player_seasons
           set stats = coalesce(stats, '{}'::jsonb) || coalesce(s.stats, '{}'::jsonb)   -- real stats win
         where program_id = r.program_id and lower(player_name) = lower(full_name) and season = s.season;
        delete from public.player_seasons
         where program_id = r.program_id and player_name = r.player_name and season = s.season;
      else
        update public.player_seasons set player_name = full_name
         where program_id = r.program_id and player_name = r.player_name and season = s.season;
      end if;
    end loop;

    -- Carry the name across records / awards / active roster.
    update public.records set holder_name = full_name where program_id = r.program_id and holder_name = r.player_name;
    update public.awards  set holder_name = full_name where program_id = r.program_id and holder_name = r.player_name;
    update public.athletes set name = full_name
     where program_id = r.program_id and name = r.player_name
       and not exists (select 1 from public.athletes a2 where a2.program_id = r.program_id and lower(a2.name) = lower(full_name));
    delete from public.athletes where program_id = r.program_id and name = r.player_name;  -- drop any leftover abbreviated active row

    raise notice 'Merged "%" -> "%"', r.player_name, full_name;
    merges := merges + 1;
    affected := array_append(affected, r.program_id);
  end loop;

  -- Rebuild careers for every touched program (recompute also clears orphaned abbreviated all-time rows).
  for pid in select distinct u from unnest(affected) as u loop
    perform public.recompute_career_from_seasons(pid);
  end loop;
  raise notice 'Done: % name(s) merged across % program(s).', merges, (select count(distinct u) from unnest(affected) as u);
end $$;

NOTIFY pgrst, 'reload schema';
