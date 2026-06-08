-- ────────────────────────────────────────────────────────────────────────────
-- 2008-2009 football: fix abbreviated names + remove the bogus "Josh VanEps"
-- ────────────────────────────────────────────────────────────────────────────
-- Names matched to the attached 08-09 roster. To avoid duplicating players who also played later
-- seasons (already renamed), we rename the SEASON rows to the full name, rebuild careers (which folds
-- 2008-2009 into the existing full-name player), then remove the now-orphaned abbreviated all-time rows.
-- "A. Kastens" → "Drew Kastens" (same #50 OL/DL as the 09-11 Drew Kastens — Andrew "Drew").

do $$
declare pid uuid; m record;
begin
  select id into pid from public.programs where slug = 'denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;

  -- 1) Delete the bogus seed "Josh VanEps" (8 GP but 2,001 rush yds, 2001-2018) — a stray duplicate of
  --    the real "Josh Van Eps". (Explicitly requested.)
  delete from public.player_seasons   where program_id = pid and player_name = 'Josh VanEps';
  delete from public.records          where program_id = pid and holder_name = 'Josh VanEps';
  delete from public.awards           where program_id = pid and holder_name = 'Josh VanEps';
  delete from public.athletes         where program_id = pid and name        = 'Josh VanEps';
  delete from public.all_time_players where program_id = pid and name        = 'Josh VanEps';

  -- 2) Rename 2008-2009 abbreviated names → full on the SEASON rows (+ records/awards/active rows).
  for m in select * from (values
    ('B. Cassidy','Beau Cassidy'), ('S. Marsh','Sam Marsh'), ('C. Kroshus','Connor Kroshus'),
    ('A. Ortolf','Adam Ortolf'), ('M. Pippins','Marcus Pippins'), ('R. Herren','Riley Herren'),
    ('T. Lenderink','Tom Lenderink'), ('J. Pursell','Jacob Pursell'), ('B. Dodgen','Brooks Dodgen'),
    ('D. Miller','Daniel Miller'), ('Z. Van Wyke','Zach Van Wyke'), ('C. Caro','CJ Caro'),
    ('A. Kastens','Drew Kastens'), ('M. Wiggers','Mason Wiggers'), ('D. Herder','Dean Herder'),
    ('J. Hill','Jake Hill'), ('L. Williams','Luke Williams'), ('S. Lee','Sam Lee'),
    ('J. Evensen','Josh Evensen'), ('S. Fenwick','Seth Fenwick'), ('J. Tesema','Jonathan Tesema'),
    ('M. Newton','Matt Newton'), ('D. Williamson','David Williamson'), ('B. Baird','Brian Baird'),
    ('E. Anema','Ethan Anema'), ('B. Katte','Brett Katte'), ('J. Vander Hoek','Jon Vander Hoek'),
    ('D. Peterson','Darren Peterson'), ('C. Viss','Chase Viss')
  ) as t(abbr, fullname) loop
    update public.player_seasons set player_name = m.fullname where program_id = pid and player_name = m.abbr;
    update public.athletes       set name        = m.fullname where program_id = pid and name        = m.abbr;
    update public.records        set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
    update public.awards         set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
  end loop;

  -- 3) Rebuild careers so the renamed 2008-2009 season rows fold into the full-name players.
  perform public.recompute_career_from_seasons(pid);

  -- 4) Remove abbreviated all-time / athlete entries now orphaned (no season rows) that have a full-name
  --    sibling (same last name + first initial) — i.e. the leftovers a rename creates. No real data lost.
  delete from public.all_time_players a
  where a.program_id = pid and a.name ~ '^[A-Za-z]\.? '
    and not exists (select 1 from public.player_seasons ps where ps.program_id = pid and lower(ps.player_name) = lower(a.name))
    and exists (select 1 from public.all_time_players f where f.program_id = pid and f.id <> a.id and f.name !~ '^[A-Za-z]\.? '
                and lower(split_part(f.name,' ',-1)) = lower(split_part(a.name,' ',-1))
                and lower(left(f.name,1)) = lower(left(a.name,1)));
  delete from public.athletes ath
  where ath.program_id = pid and ath.name ~ '^[A-Za-z]\.? '
    and not exists (select 1 from public.player_seasons ps where ps.program_id = pid and lower(ps.player_name) = lower(ath.name))
    and exists (select 1 from public.all_time_players f where f.program_id = pid and f.name !~ '^[A-Za-z]\.? '
                and lower(split_part(f.name,' ',-1)) = lower(split_part(ath.name,' ',-1))
                and lower(left(f.name,1)) = lower(left(ath.name,1)));
end $$;

NOTIFY pgrst, 'reload schema';
