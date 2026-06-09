-- ────────────────────────────────────────────────────────────────────────────
-- Football: fix the remaining initials-only names (from the 2013-2014 + 2008-2009 rosters)
-- ────────────────────────────────────────────────────────────────────────────
-- Full names from "13-14 fb roster.pdf" (10) and the 2008-2009 roster (A. Kastens = Andrew "Drew" Kastens).
-- Uses rename_player(), so each abbreviated player's season rows are renamed, careers rebuilt, and any
-- existing full-name match is merged in (the uniqueness index prevents duplicates). Re-runnable: once a
-- name is full, there's nothing left matching the abbreviated form. (J. Anema still pending its roster;
-- "J. Jay Lim" is intentionally left as-is — that's how he was listed.)

do $$
declare pid uuid; m record;
begin
  select id into pid from public.programs
   where sport = 'football'
     and org_id = (select org_id from public.programs where slug = 'denver-christian-soccer-girls' limit 1)
   limit 1;
  if pid is null then raise exception 'DC football program not found'; end if;

  for m in select * from (values
    ('A. Davis','Alex Davis'),
    ('D. Kiley','Dillon Kiley'),
    ('J. Gottschalk','Johann Gottschalk'),
    ('J. Peters','Jordan Peters'),
    ('K. Piper','Kieren Piper'),
    ('K. Van Roekel','Kyle Van Roekel'),
    ('L. Geels','Landon Geels'),
    ('M. Adams','Myles Adams'),
    ('M. Stallings','Myles Stallings'),
    ('N. Hayes','Nate Hayes'),
    ('A. Kastens','Drew Kastens')
  ) as t(abbr, fullname) loop
    perform public.rename_player(pid, m.abbr, m.fullname);
    raise notice 'Renamed "%" -> "%"', m.abbr, m.fullname;
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';
