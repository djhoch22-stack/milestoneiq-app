-- ────────────────────────────────────────────────────────────────────────────
-- Fix the misspelled stat "Completetions" → "Completions" in STORED data
-- ────────────────────────────────────────────────────────────────────────────
-- The app + extract-pdf now use the correct spelling "Completions", so the stored data
-- must match or the column would read blank. This renames the JSON key in every stats
-- column and the stat_name in records/milestones. It's football-only, so a global rename
-- is safe (no other sport uses that key). Run alongside pushing the app + redeploying the
-- extract-pdf function.

-- Per-player season, career, and active-roster stats (rename the JSONB key)
update public.player_seasons
  set stats = (stats - 'Completetions') || jsonb_build_object('Completions', stats->'Completetions')
  where stats ? 'Completetions';

update public.all_time_players
  set stats = (stats - 'Completetions') || jsonb_build_object('Completions', stats->'Completetions')
  where stats ? 'Completetions';

update public.athletes
  set stats = (stats - 'Completetions') || jsonb_build_object('Completions', stats->'Completetions')
  where stats ? 'Completetions';

-- Stored records + milestones that referenced the old spelling
update public.records    set stat_name = 'Completions' where stat_name = 'Completetions';
update public.milestones set stat_name = 'Completions' where stat_name = 'Completetions';

NOTIFY pgrst, 'reload schema';
