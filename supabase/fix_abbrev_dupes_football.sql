-- ────────────────────────────────────────────────────────────────────────────
-- Clean up abbreviated-name DUPLICATES (DC football)
-- ────────────────────────────────────────────────────────────────────────────
-- A stats-only upload created players like "T. Kastens" alongside the real "Tate Kastens".
-- The app fix (resolveNamesAgainstProgram) now maps abbreviated stat-sheet names onto the
-- existing full-name player, so re-uploading the affected season RENAMES those season rows to
-- the full name — which leaves the old abbreviated all-time / athlete entries with NO season
-- rows. This removes those orphans.
--
-- ORDER: (1) push the app fix, (2) re-upload the affected season(s), (3) run THIS.
-- SAFE: only deletes rows whose FIRST name token is a single letter (e.g. "T. Kastens" / "T Kastens")
-- AND that have zero player_seasons rows. Full names, and any abbreviated name that still owns a
-- season, are left untouched.

do $$ declare pid uuid; begin
  select id into pid from public.programs where slug = 'denver-christian-football';
  if pid is null then return; end if;

  delete from public.all_time_players a
  where a.program_id = pid
    and a.name ~ '^[A-Za-z]\.? '
    and not exists (select 1 from public.player_seasons ps
                    where ps.program_id = pid and lower(ps.player_name) = lower(a.name));

  delete from public.athletes ath
  where ath.program_id = pid
    and ath.name ~ '^[A-Za-z]\.? '
    and not exists (select 1 from public.player_seasons ps
                    where ps.program_id = pid and lower(ps.player_name) = lower(ath.name));
end $$;

NOTIFY pgrst, 'reload schema';
