-- ────────────────────────────────────────────────────────────────────────────
-- Remove exact-duplicate players (same program + name) — the "13 Randy DeBoers" bug
-- ────────────────────────────────────────────────────────────────────────────
-- A hand-added player kept a temporary id until reload, so every save re-inserted it, piling up
-- identical copies (13 Randy DeBoer, 16 Tim Bliek, etc.). The duplicates are identical (career totals
-- are kept in sync across same-name rows), so we keep ONE row per program + name and delete the rest.
-- Safe + re-runnable. The matching app fix (handleUpdateSchool) stops new duplicates from forming.
-- NOTE: player_seasons can't duplicate (it has a unique index on program+name+season), so only the
-- all-time roster and the active roster need cleaning.

-- All-time roster: keep the lowest id per program + name, delete the rest.
delete from public.all_time_players a
using public.all_time_players b
where a.program_id = b.program_id
  and lower(a.name) = lower(b.name)
  and a.id > b.id;

-- Active roster: same.
delete from public.athletes a
using public.athletes b
where a.program_id = b.program_id
  and lower(a.name) = lower(b.name)
  and a.id > b.id;

NOTIFY pgrst, 'reload schema';
