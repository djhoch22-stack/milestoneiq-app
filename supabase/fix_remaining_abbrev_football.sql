-- ────────────────────────────────────────────────────────────────────────────
-- Football: fix the remaining initials-only names (self-contained — no RPC dependency)
-- ────────────────────────────────────────────────────────────────────────────
-- Full names from "13-14 fb roster.pdf" (10), "9-10 fb roster.pdf" (J. Anema = Justin Anema),
-- and the 2008-2009 roster (A. Kastens = Andrew "Drew" Kastens). For each: rename the season rows to the
-- full name (jsonb-merge if that season already exists), carry records/awards, drop the orphaned abbreviated
-- all-time/roster rows, then rebuild careers. ("J. Jay Lim" is intentionally left as-is.)

do $$
declare pid uuid; m record; s record;
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
    ('J. Anema','Justin Anema'),
    ('A. Kastens','Drew Kastens')
  ) as t(abbr, fullname) loop
    for s in select season, stats from public.player_seasons where program_id = pid and player_name = m.abbr loop
      if exists (select 1 from public.player_seasons where program_id = pid and lower(player_name) = lower(m.fullname) and season = s.season) then
        update public.player_seasons set stats = coalesce(stats, '{}'::jsonb) || coalesce(s.stats, '{}'::jsonb)
         where program_id = pid and lower(player_name) = lower(m.fullname) and season = s.season;
        delete from public.player_seasons where program_id = pid and player_name = m.abbr and season = s.season;
      else
        update public.player_seasons set player_name = m.fullname where program_id = pid and player_name = m.abbr and season = s.season;
      end if;
    end loop;
    update public.records set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
    update public.awards  set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
    delete from public.athletes         where program_id = pid and name = m.abbr;   -- orphaned roster row
    delete from public.all_time_players where program_id = pid and name = m.abbr;   -- orphaned all-time row (recompute rebuilds the full name)
    raise notice 'Fixed "%" -> "%"', m.abbr, m.fullname;
  end loop;

  perform public.recompute_career_from_seasons(pid);
end $$;

NOTIFY pgrst, 'reload schema';
