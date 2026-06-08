-- ────────────────────────────────────────────────────────────────────────────
-- Boys Soccer 2025-2026: replace initials-only names with full names (from the roster)
-- ────────────────────────────────────────────────────────────────────────────
-- The uploaded stat sheet used "C. Danielson" form and the roster's full names never made it into the
-- database, so there was nothing to merge into. Full names taken from "25-26 bsoc roster.pdf" (MaxPreps).
-- Matches BOTH "B Wheeler" and "B. Wheeler" (with/without the period), case-insensitively. Renames the
-- season rows (jsonb-merging if a full row already exists for that season), carries the name across
-- records/awards/active roster, then rebuilds careers. Re-runnable: full names don't match the pattern,
-- so once a name is fixed it's left alone. No data lost — only renamed.

do $$
declare pid uuid; m record; pat text;
begin
  -- DC boys soccer = sport 'soccer' in the same org as the girls-soccer program.
  select id into pid from public.programs
   where sport = 'soccer'
     and org_id = (select org_id from public.programs where slug = 'denver-christian-soccer-girls' limit 1)
   limit 1;
  if pid is null then raise exception 'DC boys soccer program (sport=soccer) not found.'; end if;

  for m in select * from (values
    ('C','Danielson','Cal Danielson'),
    ('E','Alcorn','Everett Alcorn'),
    ('F','Kleager','Finn Kleager'),
    ('G','Erskine','Guthrie Erskine'),
    ('L','DeBoer','Luke DeBoer'),
    ('M','Genc','Marcos Genc'),
    ('N','Politte','Nash Politte'),
    ('T','Genc','Thomas Genc'),
    ('X','Lidstone','Xavier Lidstone'),
    ('B','Wheeler','Brayden Wheeler')
  ) as t(ini, lname, fullname) loop
    pat := '^' || m.ini || '\.? ' || m.lname || '$';   -- "X Lastname" or "X. Lastname"; NOT the full first name

    -- 1) merge the abbreviated season's stats into the full-name row if that season already exists (real stats win)
    update public.player_seasons fz
       set stats = coalesce(fz.stats, '{}'::jsonb) || coalesce(ab.stats, '{}'::jsonb)
      from public.player_seasons ab
     where fz.program_id = pid and ab.program_id = pid
       and ab.player_name ~* pat and lower(fz.player_name) = lower(m.fullname) and fz.season = ab.season;
    delete from public.player_seasons ab
     where ab.program_id = pid and ab.player_name ~* pat
       and exists (select 1 from public.player_seasons fz
                   where fz.program_id = pid and lower(fz.player_name) = lower(m.fullname) and fz.season = ab.season);
    -- 2) rename the remaining abbreviated rows (no collision) to the full name
    update public.player_seasons set player_name = m.fullname where program_id = pid and player_name ~* pat;

    -- 3) carry the name across records / awards / active roster
    update public.records set holder_name = m.fullname where program_id = pid and holder_name ~* pat;
    update public.awards  set holder_name = m.fullname where program_id = pid and holder_name ~* pat;
    update public.athletes set name = m.fullname where program_id = pid and name ~* pat
       and not exists (select 1 from public.athletes a2 where a2.program_id = pid and lower(a2.name) = lower(m.fullname));
    delete from public.athletes where program_id = pid and name ~* pat;  -- drop any leftover abbreviated active row

    raise notice 'Fixed "% %" -> "%"', m.ini, m.lname, m.fullname;
  end loop;

  perform public.recompute_career_from_seasons(pid);
end $$;

NOTIFY pgrst, 'reload schema';
