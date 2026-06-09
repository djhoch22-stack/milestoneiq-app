-- ────────────────────────────────────────────────────────────────────────────
-- Hard backstop: ONE player per program + name (case-insensitive) — all_time + athletes
-- ────────────────────────────────────────────────────────────────────────────
-- The app already prevents duplicate players in normal use (the Add form blocks an existing name, and the
-- save logic updates an existing same-name row instead of inserting a copy). This makes it impossible at
-- the DATABASE level too: any future code path that tried to create a second player with the same name in
-- the same program is rejected outright. "John Smith" and "john smith" count as the same (case-insensitive).
--
-- We dedupe first (so the unique index can be built), then add it. Safe + re-runnable.
-- NOTE: player_seasons already has its own unique index (program + name + season), so it's unaffected.
-- The recompute / merge / rename functions all insert with "where not exists" guards, so they never collide
-- with this index — normal imports and merges keep working.

-- 1) Remove any remaining exact/case duplicates (keep the lowest id per program + name).
delete from public.all_time_players a using public.all_time_players b
 where a.program_id = b.program_id and lower(a.name) = lower(b.name) and a.id > b.id;
delete from public.athletes a using public.athletes b
 where a.program_id = b.program_id and lower(a.name) = lower(b.name) and a.id > b.id;

-- 2) Enforce uniqueness from here on.
create unique index if not exists uq_all_time_prog_name on public.all_time_players (program_id, lower(name));
create unique index if not exists uq_athletes_prog_name on public.athletes (program_id, lower(name));

NOTIFY pgrst, 'reload schema';
