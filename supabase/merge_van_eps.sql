-- ────────────────────────────────────────────────────────────────────────────
-- Merge "J. Van Eps" (2011-2013, abbreviated) into "Josh Van Eps" (2013-2014, full)
-- ────────────────────────────────────────────────────────────────────────────
-- Same player, split across uploads: the abbreviated form was imported BEFORE the
-- full name existed in the program, so the importer couldn't link them. We rename
-- the abbreviated SEASON rows to the full name, rebuild careers (folding all three
-- seasons into one Josh Van Eps = 25 GP, 2011-12 – 2013-14), then delete the leftover
-- abbreviated all-time / athlete row. No data is deleted — only merged.

do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug = 'denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;

  -- 1) Rename the abbreviated season / active / record / award rows to the full name.
  update public.player_seasons set player_name = 'Josh Van Eps' where program_id = pid and player_name = 'J. Van Eps';
  update public.athletes       set name        = 'Josh Van Eps' where program_id = pid and name        = 'J. Van Eps';
  update public.records        set holder_name = 'Josh Van Eps' where program_id = pid and holder_name = 'J. Van Eps';
  update public.awards         set holder_name = 'Josh Van Eps' where program_id = pid and holder_name = 'J. Van Eps';

  -- 2) Rebuild careers so the renamed seasons fold into one Josh Van Eps.
  perform public.recompute_career_from_seasons(pid);

  -- 3) Remove the now-orphaned abbreviated all-time / athlete row (no season rows left).
  delete from public.all_time_players a
   where a.program_id = pid and a.name = 'J. Van Eps'
     and not exists (select 1 from public.player_seasons ps where ps.program_id = pid and ps.player_name = 'J. Van Eps');
  delete from public.athletes ath
   where ath.program_id = pid and ath.name = 'J. Van Eps'
     and not exists (select 1 from public.player_seasons ps where ps.program_id = pid and ps.player_name = 'J. Van Eps');
end $$;

NOTIFY pgrst, 'reload schema';
