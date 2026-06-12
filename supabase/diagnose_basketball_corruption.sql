-- ────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC (READ-ONLY) — corrupted basketball season rows from the bad MaxPreps imports
-- ────────────────────────────────────────────────────────────────────────────
-- The old extractor read the per-game "Game Stats" section as if it were totals. Tell-tale signs of
-- a bad row: a "Made" total exceeds its "Attempted" total (impossible), or makes/points are
-- NON-INTEGERS (per-game averages like 0.6 / 141.64). This lists every affected row so you can see
-- the scope across "many players" BEFORE anything is deleted. Nothing is changed.

with bb as (
  select ps.id, pr.name as program, ps.program_id, ps.player_name, ps.season, ps.stats
  from public.player_seasons ps
  join public.programs pr on pr.id = ps.program_id
  where pr.sport like 'basketball%'
),
num as (
  select *,
    case when jsonb_typeof(stats->'Field Goals Made')='number'        then (stats->>'Field Goals Made')::numeric end        as fgm,
    case when jsonb_typeof(stats->'Field Goals Attempted')='number'   then (stats->>'Field Goals Attempted')::numeric end   as fga,
    case when jsonb_typeof(stats->'Three Pointers Made')='number'     then (stats->>'Three Pointers Made')::numeric end     as tpm,
    case when jsonb_typeof(stats->'Three Pointers Attempted')='number' then (stats->>'Three Pointers Attempted')::numeric end as tpa,
    case when jsonb_typeof(stats->'Free Throws Made')='number'        then (stats->>'Free Throws Made')::numeric end        as ftm,
    case when jsonb_typeof(stats->'Free Throws Attempted')='number'   then (stats->>'Free Throws Attempted')::numeric end   as fta,
    case when jsonb_typeof(stats->'Points')='number'                 then (stats->>'Points')::numeric end                 as pts
  from bb
)
select program, player_name, season, pts, fgm, fga, tpm, tpa, ftm, fta
from num
where (fgm is not null and fga is not null and fgm > fga)          -- FG made > attempted
   or (tpm is not null and tpa is not null and tpm > tpa)          -- 3PT made > attempted
   or (ftm is not null and fta is not null and ftm > fta)          -- FT made > attempted
   or (fgm is not null and fgm <> floor(fgm))                      -- non-integer makes (per-game leak)
   or (tpm is not null and tpm <> floor(tpm))
   or (ftm is not null and ftm <> floor(ftm))
   or (pts is not null and pts <> floor(pts))                      -- non-integer points
order by program, player_name, season;

-- Summary count (run on its own to see totals): how many bad rows + players per program.
-- select program, count(*) as bad_rows, count(distinct player_name) as players
-- from ( <paste the num CTE query above> ) x  ... (or just read the row count of the list above).
