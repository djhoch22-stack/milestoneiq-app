-- ────────────────────────────────────────────────────────────────────────────
-- CLEANUP — remove the corrupted basketball season rows, then rebuild career totals
-- ────────────────────────────────────────────────────────────────────────────
-- Deletes exactly the rows the diagnostic listed (a Made > its Attempted, or non-integer
-- makes/points = the old per-game misread), then recomputes every basketball program's career so
-- the >100% percentages disappear. AFTERWARD: re-upload the corrected season PDFs — the new
-- extractor reads totals correctly, and the per-season import refills each season cleanly.
-- (Idempotent + safe to re-run. Recompute rebuilds careers from whatever season rows remain.)

do $$
declare n int; p uuid;
begin
  delete from public.player_seasons ps
   using public.programs pr
   where pr.id = ps.program_id and pr.sport like 'basketball%'
     and (
          (jsonb_typeof(ps.stats->'Field Goals Made')='number' and jsonb_typeof(ps.stats->'Field Goals Attempted')='number'
             and (ps.stats->>'Field Goals Made')::numeric > (ps.stats->>'Field Goals Attempted')::numeric)
       or (jsonb_typeof(ps.stats->'Three Pointers Made')='number' and jsonb_typeof(ps.stats->'Three Pointers Attempted')='number'
             and (ps.stats->>'Three Pointers Made')::numeric > (ps.stats->>'Three Pointers Attempted')::numeric)
       or (jsonb_typeof(ps.stats->'Free Throws Made')='number' and jsonb_typeof(ps.stats->'Free Throws Attempted')='number'
             and (ps.stats->>'Free Throws Made')::numeric > (ps.stats->>'Free Throws Attempted')::numeric)
       or (jsonb_typeof(ps.stats->'Field Goals Made')='number'    and (ps.stats->>'Field Goals Made')::numeric    <> floor((ps.stats->>'Field Goals Made')::numeric))
       or (jsonb_typeof(ps.stats->'Three Pointers Made')='number' and (ps.stats->>'Three Pointers Made')::numeric <> floor((ps.stats->>'Three Pointers Made')::numeric))
       or (jsonb_typeof(ps.stats->'Free Throws Made')='number'    and (ps.stats->>'Free Throws Made')::numeric    <> floor((ps.stats->>'Free Throws Made')::numeric))
       or (jsonb_typeof(ps.stats->'Points')='number'             and (ps.stats->>'Points')::numeric              <> floor((ps.stats->>'Points')::numeric))
     );
  get diagnostics n = row_count;
  raise notice 'Deleted % corrupted basketball season row(s).', n;

  for p in select id from public.programs where sport like 'basketball%' loop
    perform public.recompute_career_from_seasons(p);
  end loop;
  raise notice 'Recomputed career totals for all basketball programs.';
end $$;

NOTIFY pgrst, 'reload schema';
