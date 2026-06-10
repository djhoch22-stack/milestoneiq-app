-- ────────────────────────────────────────────────────────────────────────────
-- Create a PRIVATE baseball program for Denver Christian (to build out — not public)
-- ────────────────────────────────────────────────────────────────────────────
-- is_public = false → it does NOT appear on the public record book while you work on it.
-- Baseball is intentionally left OUT of AVAILABLE_SPORTS in the app, so other/new schools can't pick it
-- yet ("Coming soon"); this inserts the program directly so DC can start entering data. Copies DC's
-- name / mascot / color / owner from an existing DC program. Idempotent — won't create a second one.

do $$
declare org uuid; nm text; msc text; clr text; cby uuid;
begin
  select org_id, name, mascot, primary_color, created_by into org, nm, msc, clr, cby
   from public.programs where slug = 'denver-christian-soccer-girls' limit 1;
  if org is null then raise exception 'DC org not found'; end if;

  if exists (select 1 from public.programs where org_id = org and sport = 'baseball') then
    raise notice 'Baseball program already exists for % — nothing created.', nm;
  else
    insert into public.programs (org_id, name, mascot, sport, primary_color, is_public, created_by)
    values (org, nm, msc, 'baseball', clr, false, cby);
    raise notice 'Created PRIVATE baseball program for "%".', nm;
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
