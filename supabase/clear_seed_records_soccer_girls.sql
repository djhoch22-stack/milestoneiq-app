-- ────────────────────────────────────────────────────────────────────────────
-- Let the All-Time data drive the girls-soccer records (remove stale seed records)
-- ────────────────────────────────────────────────────────────────────────────
-- Stored records take precedence over the auto-computed ones, so an old seeded record (e.g. a stale
-- career-assists or saves leader) overrides what the all-time data actually says. The app auto-computes
-- Career total / Single season / per-game records straight from the all-time + season data, so these
-- stored copies are redundant — deleting them lets the real leaders show.
--
-- KEEPS "Single game" records: the app CANNOT auto-compute single-game highs (no game-by-game data),
-- so those are the only manually-entered records worth preserving. If any single-game record is also a
-- stale seed, delete it by hand on the Records tab (or tell me and I'll clear those too).

do $$ declare pid uuid; begin
  select id into pid from public.programs where slug = 'denver-christian-soccer-girls';
  if pid is null then return; end if;
  delete from public.records
    where program_id = pid
      and coalesce(variant, '') <> 'Single game';
end $$;

NOTIFY pgrst, 'reload schema';
