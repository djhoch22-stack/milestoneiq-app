-- ────────────────────────────────────────────────────────────────────────────
-- Boys Soccer: merge "Braden Wheeler" (2024-2025) into "Brayden Wheeler" (2025-2026)
-- ────────────────────────────────────────────────────────────────────────────
-- Same player, spelled two ways across seasons. The 2025-2026 roster spells it "Brayden Wheeler", so that
-- is the name we keep. (Not an abbreviation and not just a case difference, so the auto-cleanup doesn't catch
-- it — it's an explicit, reviewed merge.) "Mike Wheeler" (1978-1979) is a different person and is NOT touched.

do $$
declare pid uuid; s record;
begin
  -- DC boys soccer = sport 'soccer' in the same org as the girls-soccer program.
  select id into pid from public.programs
   where sport = 'soccer'
     and org_id = (select org_id from public.programs where slug = 'denver-christian-soccer-girls' limit 1)
   limit 1;
  if pid is null then raise exception 'DC boys soccer program (sport=soccer) not found.'; end if;

  -- 1) Move Braden's season rows onto Brayden (jsonb-merge if a season overlaps, else rename).
  for s in select season, stats from public.player_seasons where program_id = pid and player_name = 'Braden Wheeler' loop
    if exists (select 1 from public.player_seasons where program_id = pid and lower(player_name) = lower('Brayden Wheeler') and season = s.season) then
      update public.player_seasons set stats = coalesce(stats, '{}'::jsonb) || coalesce(s.stats, '{}'::jsonb)
       where program_id = pid and lower(player_name) = lower('Brayden Wheeler') and season = s.season;
      delete from public.player_seasons where program_id = pid and player_name = 'Braden Wheeler' and season = s.season;
    else
      update public.player_seasons set player_name = 'Brayden Wheeler' where program_id = pid and player_name = 'Braden Wheeler' and season = s.season;
    end if;
  end loop;

  -- 2) Carry the name across records / awards / active roster.
  update public.records  set holder_name = 'Brayden Wheeler' where program_id = pid and holder_name = 'Braden Wheeler';
  update public.awards   set holder_name = 'Brayden Wheeler' where program_id = pid and holder_name = 'Braden Wheeler';
  update public.athletes set name = 'Brayden Wheeler' where program_id = pid and name = 'Braden Wheeler'
     and not exists (select 1 from public.athletes a2 where a2.program_id = pid and lower(a2.name) = lower('Brayden Wheeler'));
  delete from public.athletes where program_id = pid and name = 'Braden Wheeler';

  -- 3) Rebuild careers (sums 2024-2025 + 2025-2026 into one Brayden Wheeler).
  perform public.recompute_career_from_seasons(pid);

  -- 4) Remove the now-orphaned "Braden Wheeler" all-time row (recompute leaves non-abbreviated stale
  --    names alone, so delete it explicitly). Mike Wheeler is never referenced, so he is untouched.
  delete from public.all_time_players
   where program_id = pid and name = 'Braden Wheeler'
     and not exists (select 1 from public.player_seasons ps where ps.program_id = pid and ps.player_name = 'Braden Wheeler');
end $$;

NOTIFY pgrst, 'reload schema';
