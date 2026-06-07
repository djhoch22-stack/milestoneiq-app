-- RaftersIQ — RESTORE Denver Christian Girls Soccer SEASONS (45) after accidental wipe.
-- Safe: touches ONLY the seasons table for this program. Player/all-time/athlete data is untouched.
-- Run once in the Supabase SQL editor.
do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug='denver-christian-soccer-girls';
  if pid is null then raise exception 'Girls Soccer program not found'; end if;

  delete from public.seasons where program_id=pid;

  insert into public.seasons (program_id,season,wins,losses,league_wins,league_losses,coach,win_pct,notes) values
    (pid,'2025-2026',10,5,5,4,'Brad Homan',66.7,'Final 4 (1 tie)'),
    (pid,'2024-2025',10,6,5,4,'Brad Homan',62.5,'Elite 8 (1 tie)'),
    (pid,'2023-2024',12,2,7,0,'Brad Homan',85.7,'League Champs/Elite 8 (1 tie)'),
    (pid,'2022-2023',14,3,5,2,'Brad Homan',82.4,'Final 4 (1 tie)'),
    (pid,'2021-2022',12,5,6,0,'Brad Homan',70.6,'League Champs/Final 4'),
    (pid,'2020-2021',10,2,5,0,'Brad Homan',83.3,'Final 4'),
    (pid,'2019-2020',0,0,0,0,'Brad Homan',null,'Covid'),
    (pid,'2018-2019',16,2,2,1,'Brad Homan',88.9,'State Champs'),
    (pid,'2017-2018',12,6,1,1,'Brad Homan',66.7,'State Runner Up'),
    (pid,'2016-2017',16,2,4,0,'Brad Homan',88.9,'State Champs/League Champs'),
    (pid,'2015-2016',6,6,1,2,'Brad Homan',50.0,'Elite 8 (1 tie)'),
    (pid,'2014-2015',10,6,2,2,'Brad Homan',62.5,'Final 4 (1 tie)'),
    (pid,'2013-2014',9,7,6,3,'Brad Homan',56.2,'Round of 32'),
    (pid,'2012-2013',4,9,2,5,'Brad Homan',30.8,''),
    (pid,'2011-2012',7,7,4,4,'Brad Homan',50.0,'Sweet 16 (3 ties)'),
    (pid,'2010-2011',null,1,null,null,'Brad Homan',null,''),
    (pid,'2009-2010',4,9,1,5,'Brad Homan',30.8,'(1 tie)'),
    (pid,'2008-2009',10,6,4,2,'Brad Homan',62.5,'Elite 8 (2 ties)'),
    (pid,'2007-2008',13,5,4,5,'Brad Homan',72.2,'Elite 8'),
    (pid,'2006-2007',null,null,null,null,'Brad Homan',null,'Final 4'),
    (pid,'2005-2006',null,null,null,null,'Brad Homan',null,'Final 4'),
    (pid,'2004-2005',null,null,null,null,'Brad Homan',null,'State Runner Up'),
    (pid,'2003-2004',10,4,6,3,'Brad Homan',71.4,'State Champs'),
    (pid,'2002-2003',13,2,6,1,'Brad Homan',86.7,'League Champs/Final 4 (2 ties)'),
    (pid,'2001-2002',null,null,null,null,'Brad Homan',null,'State Runner Up'),
    (pid,'2000-2001',17,0,null,null,'Brad Homan',100.0,'State Champs/League Champs (1 tie)'),
    (pid,'1999-2000',null,null,null,null,'Brad Homan',null,'State Runner Up'),
    (pid,'1998-1999',null,null,null,null,'Brad Homan',null,'State Runner Up'),
    (pid,'1997-1998',null,null,null,null,'Brad Homan',null,''),
    (pid,'1996-1997',null,null,null,null,'Brad Homan',null,'League Champs/Final 4'),
    (pid,'1995-1996',null,null,null,null,'Ray Van Heukelem',null,'League Champs/Final 4'),
    (pid,'1994-1995',null,null,null,null,'Ray Van Heukelem',null,'League Champs/State Runner Up'),
    (pid,'1993-1994',null,null,null,null,'Ray Van Heukelem',null,'League Champs/Elite 8'),
    (pid,'1992-1993',null,null,null,null,'Ray Van Heukelem',null,'League Champs/State Runner Up'),
    (pid,'1991-1992',16,2,null,null,'Ray Van Heukelem',88.9,'State Champs'),
    (pid,'1990-1991',null,null,null,null,'Ray Van Heukelem',null,''),
    (pid,'1989-1990',null,null,null,null,'Ray Van Heukelem',null,''),
    (pid,'1988-1989',null,null,null,null,'Ray Van Heukelem',null,''),
    (pid,'1987-1988',11,3,null,null,'Ray Van Heukelem',78.6,''),
    (pid,'1986-1987',9,4,7,3,'Ray Van Heukelem',69.2,''),
    (pid,'1985-1986',9,4,null,null,'Ray Van Heukelem',69.2,'(1 tie)'),
    (pid,'1984-1985',10,3,7,2,'Ray Van Heukelem',76.9,'(1 tie)'),
    (pid,'1983-1984',6,7,4,5,'Ray Van Heukelem',46.2,'(1 tie)'),
    (pid,'1982-1983',4,7,null,null,'Ray Van Heukelem',36.4,'(2 ties)'),
    (pid,'1981-1982',0,10,null,null,'Ray Van Heukelem',0.0,'(1 tie)');

  -- ties + league ties + tie-inclusive win % (from the Seasons CSV / v3.8)
  update public.seasons set ties=1, league_ties=1, win_pct=62.5 where program_id=pid and season='2025-2026';
  update public.seasons set ties=1, league_ties=1, win_pct=58.8 where program_id=pid and season='2024-2025';
  update public.seasons set ties=1, league_ties=0, win_pct=80.0 where program_id=pid and season='2023-2024';
  update public.seasons set ties=1, league_ties=0, win_pct=77.8 where program_id=pid and season='2022-2023';
  update public.seasons set ties=0, league_ties=0, win_pct=70.6 where program_id=pid and season='2021-2022';
  update public.seasons set ties=0, league_ties=0, win_pct=83.3 where program_id=pid and season='2020-2021';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2019-2020';
  update public.seasons set ties=0, league_ties=0, win_pct=88.9 where program_id=pid and season='2018-2019';
  update public.seasons set ties=0, league_ties=0, win_pct=66.7 where program_id=pid and season='2017-2018';
  update public.seasons set ties=0, league_ties=0, win_pct=88.9 where program_id=pid and season='2016-2017';
  update public.seasons set ties=1, league_ties=0, win_pct=46.2 where program_id=pid and season='2015-2016';
  update public.seasons set ties=1, league_ties=0, win_pct=58.8 where program_id=pid and season='2014-2015';
  update public.seasons set ties=0, league_ties=0, win_pct=56.2 where program_id=pid and season='2013-2014';
  update public.seasons set ties=0, league_ties=0, win_pct=30.8 where program_id=pid and season='2012-2013';
  update public.seasons set ties=3, league_ties=2, win_pct=41.2 where program_id=pid and season='2011-2012';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2010-2011';
  update public.seasons set ties=1, league_ties=1, win_pct=28.6 where program_id=pid and season='2009-2010';
  update public.seasons set ties=2, league_ties=2, win_pct=55.6 where program_id=pid and season='2008-2009';
  update public.seasons set ties=0, league_ties=0, win_pct=72.2 where program_id=pid and season='2007-2008';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2006-2007';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2005-2006';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2004-2005';
  update public.seasons set ties=0, league_ties=0, win_pct=71.4 where program_id=pid and season='2003-2004';
  update public.seasons set ties=2, league_ties=2, win_pct=76.5 where program_id=pid and season='2002-2003';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='2001-2002';
  update public.seasons set ties=1, league_ties=0, win_pct=94.4 where program_id=pid and season='2000-2001';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1999-2000';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1998-1999';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1997-1998';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1996-1997';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1995-1996';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1994-1995';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1993-1994';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1992-1993';
  update public.seasons set ties=0, league_ties=0, win_pct=88.9 where program_id=pid and season='1991-1992';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1990-1991';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1989-1990';
  update public.seasons set ties=0, league_ties=0, win_pct=null where program_id=pid and season='1988-1989';
  update public.seasons set ties=0, league_ties=0, win_pct=78.6 where program_id=pid and season='1987-1988';
  update public.seasons set ties=0, league_ties=0, win_pct=69.2 where program_id=pid and season='1986-1987';
  update public.seasons set ties=1, league_ties=0, win_pct=64.3 where program_id=pid and season='1985-1986';
  update public.seasons set ties=1, league_ties=1, win_pct=71.4 where program_id=pid and season='1984-1985';
  update public.seasons set ties=1, league_ties=0, win_pct=42.9 where program_id=pid and season='1983-1984';
  update public.seasons set ties=2, league_ties=0, win_pct=30.8 where program_id=pid and season='1982-1983';
  update public.seasons set ties=1, league_ties=0, win_pct=0.0 where program_id=pid and season='1981-1982';

  -- strip the legacy "(N tie)" text out of the notes (the tie now lives in its own column)
  update public.seasons set notes = nullif(trim(regexp_replace(notes, '\s*\(\d+\s*ties?\)', '', 'g')), '')
    where program_id=pid and notes ~ '\(\d+\s*ties?\)';
end $$;
NOTIFY pgrst, 'reload schema';
