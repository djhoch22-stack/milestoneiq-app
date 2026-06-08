-- ────────────────────────────────────────────────────────────────────────────
-- Load DC Boys Soccer season history (1966–2025) into the Seasons tab
-- ────────────────────────────────────────────────────────────────────────────
-- From "DC Boy's Soccer Stats.xlsx - Seasons.csv". Per-season overall + league W-L-T,
-- coach, and accomplishments (notes). Empty rows in the sheet are skipped. Upserts by
-- season (replaces just these seasons; any other stored season is left alone).

alter table public.seasons add column if not exists ties int;
alter table public.seasons add column if not exists league_ties int;

do $$
declare pid uuid;
begin
  -- DC boys soccer = sport 'soccer' in the same org as the girls-soccer program.
  select id into pid from public.programs
   where sport = 'soccer'
     and org_id = (select org_id from public.programs where slug = 'denver-christian-soccer-girls' limit 1)
   limit 1;
  if pid is null then
    raise exception 'DC boys soccer program (sport=soccer) not found — create the Boys Soccer program first, then re-run.';
  end if;

  delete from public.seasons where program_id = pid and season = any (array[
    '2025','2024','2023','2022','2021','2020','2019','2018','2017','2016','2015','2014','2013','2012','2011',
    '2010','2009','2008','2006','1998','1993','1992','1991','1987','1986','1985','1984','1983','1982','1981',
    '1980','1979','1978','1977','1976','1966']);

  insert into public.seasons (program_id, season, wins, losses, ties, league_wins, league_losses, league_ties, coach, notes, win_pct)
  select pid, v.season, v.w, v.l, v.t, v.lw, v.ll, v.lt, v.coach, v.notes,
         case when coalesce(v.w,0)+coalesce(v.l,0)+coalesce(v.t,0) > 0
              then round(v.w::numeric / (coalesce(v.w,0)+coalesce(v.l,0)+coalesce(v.t,0)) * 100, 1)
              else null end
  from (values
    ('2025'::text, 8::int, 8::int, 0::int, 3::int, 6::int, 0::int, 'Braden Homan'::text, null::text),
    ('2024', 12, 2, 4, 4, 1, 4, 'Brad Lanser', 'Final 4'),
    ('2023', 13, 4, 1, 7, 0, 0, 'Brad Lanser', 'Final 4/League Champs'),
    ('2022', 13, 4, 0, 7, 1, 0, 'Brad Lanser', 'Elite 8'),
    ('2021', 11, 6, 0, 5, 0, 0, 'Brad Lanser', 'Elite 8'),
    ('2020', 6, 2, 0, 2, 0, 0, 'Brad Lanser', 'Final 4'),
    ('2019', 10, 7, 1, 4, 1, 1, 'Brad Lanser', 'Final 4'),
    ('2018', 11, 5, 1, 4, 1, 0, 'Brad Lanser', 'Final 4'),
    ('2017', 7, 8, 0, 6, 1, 0, 'Brad Lanser', 'League Champs'),
    ('2016', 9, 6, 1, 5, 0, 0, 'Brad Homan', null),
    ('2015', 11, 5, 0, 7, 1, 0, 'Brad Homan', 'League Champs'),
    ('2014', 14, 2, 3, 6, 0, 0, 'Brad Homan', null),
    ('2013', 10, 7, 0, 6, 1, 0, 'Brad Homan', 'League Champs'),
    ('2012', 10, 5, 2, 7, 0, 0, 'Brad Homan', 'League Champs'),
    ('2011', 13, 5, 0, 7, 0, 0, 'Brad Homan', null),
    ('2010', 9, 6, 1, 1, 1, 0, 'Ed Buteyn', 'League Champs'),
    ('2009', 15, 3, 2, 7, 0, 1, 'Ed Buteyn', 'League Champs'),
    ('2008', null, null, null, null, null, null, null, 'State Champs'),
    ('2006', 13, 4, 2, null, null, null, null, 'State Runner Up'),
    ('1998', null, null, null, null, null, null, null, 'State Champs'),
    ('1993', null, null, null, null, null, null, null, 'League Champs'),
    ('1992', null, null, null, null, null, null, null, 'League Champs'),
    ('1991', null, null, null, null, null, null, null, 'League Champs'),
    ('1987', 12, 5, null, null, null, null, 'Roger Posthumus', null),
    ('1986', 5, 9, null, null, null, null, 'Roger Posthumus', null),
    ('1985', 7, 6, 3, null, null, null, 'Roger Posthumus', null),
    ('1984', 7, 4, 3, null, null, null, 'Roger Posthumus', null),
    ('1983', null, null, null, null, null, null, 'Roger Posthumus', null),
    ('1982', null, null, null, null, null, null, 'Roger Posthumus', null),
    ('1981', 3, 9, 2, null, null, null, 'Roger Posthumus', null),
    ('1980', null, null, null, null, null, null, 'Roger Posthumus', null),
    ('1979', 8, 5, null, 6, 4, null, 'Roger Posthumus', null),
    ('1978', 6, 8, 1, 6, 5, null, 'Roger Posthumus', null),
    ('1977', 5, 9, 1, 5, 6, 1, 'Roger Posthumus', 'League Champs'),
    ('1976', 12, null, null, null, null, null, null, null),
    ('1966', 8, 0, null, null, null, null, null, null)
  ) as v(season, w, l, t, lw, ll, lt, coach, notes);
end $$;

NOTIFY pgrst, 'reload schema';
