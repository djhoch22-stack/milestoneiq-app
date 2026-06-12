-- ────────────────────────────────────────────────────────────────────────────
-- Soccer "Points" is DERIVED: Points = (Goals × 2) + Assists — computed in the DB so every reader
-- (app + public pages, records, leaderboard, HOF) gets it right with no client logic.
-- ────────────────────────────────────────────────────────────────────────────
-- A BEFORE trigger on player_seasons AND all_time_players recomputes Points on every write for soccer
-- programs only (other sports are a no-op). Covers imports, manual season edits, the +Add-player form,
-- and the career recompute. Existing rows are backfilled + careers rebuilt at the bottom.

create or replace function public.compute_soccer_points()
returns trigger language plpgsql as $$
declare g numeric; a numeric;
begin
  if exists (select 1 from public.programs p
             where p.id = new.program_id and p.sport in ('soccer','soccer_girls')) then
    g := case when jsonb_typeof(new.stats->'Goals')   = 'number' then (new.stats->>'Goals')::numeric   else 0 end;
    a := case when jsonb_typeof(new.stats->'Assists') = 'number' then (new.stats->>'Assists')::numeric else 0 end;
    new.stats := jsonb_set(coalesce(new.stats, '{}'::jsonb), '{Points}', to_jsonb(2 * g + a));
  end if;
  return new;
end $$;

drop trigger if exists trg_soccer_points_ps on public.player_seasons;
create trigger trg_soccer_points_ps before insert or update on public.player_seasons
  for each row execute function public.compute_soccer_points();

drop trigger if exists trg_soccer_points_at on public.all_time_players;
create trigger trg_soccer_points_at before insert or update on public.all_time_players
  for each row execute function public.compute_soccer_points();

-- Backfill existing data: re-touch every soccer season row (fires the trigger → Points computed),
-- then rebuild each soccer program's career (career Goals/Assists summed, career Points recomputed).
update public.player_seasons ps set stats = ps.stats
 where ps.program_id in (select id from public.programs where sport in ('soccer','soccer_girls'));

do $$ declare p uuid;
begin
  for p in select id from public.programs where sport in ('soccer','soccer_girls') loop
    perform public.recompute_career_from_seasons(p);
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';
