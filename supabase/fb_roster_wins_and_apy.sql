-- 1) Give every 2024-25 roster player the team's 2 wins. The 23 with stats already have it;
--    this adds the 10 roster-only players (no recorded stats). 2) Compute All-Purpose Yards
--    (rush+rec+kick-return+punt-return) for the All-Purpose Yards column. Safe to re-run.
do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;

  insert into public.player_seasons (program_id, player_name, season, stats)
  select pid, v.name, '2024-2025', '{"Wins":2}'::jsonb
  from (values

    ('Josiah Correa'),
    ('Brayden Adams'),
    ('Tobin Delle donne'),
    ('David Dean'),
    ('Malachi Torrez'),
    ('Wallace Sabell'),
    ('Jace Navarro'),
    ('Tanner Mccoy'),
    ('Judah Ellis'),
    ('Mason Rhineheimer')
  ) v(name)
  where not exists (select 1 from public.player_seasons ps where ps.program_id=pid and ps.player_name=v.name and ps.season='2024-2025');

  insert into public.athletes (program_id, name, position, grad_year, is_active, stats)
  select pid, v.name, v.pos, v.gy, false, '{"Wins":2}'::jsonb
  from (values

    ('Josiah Correa', 'RB, CB, FS', 2028),
    ('Brayden Adams', 'QB, WR, DB', 2027),
    ('Tobin Delle donne', 'TE, QB, DE', 2028),
    ('David Dean', 'LB, RB', 2028),
    ('Malachi Torrez', 'OG, MLB, DE', 2026),
    ('Wallace Sabell', 'DL, OL', 2028),
    ('Jace Navarro', 'OLB, SS, WR', 2028),
    ('Tanner Mccoy', null, null),
    ('Judah Ellis', 'RB, OLB', null),
    ('Mason Rhineheimer', 'WR, CB', 2027)
  ) v(name, pos, gy)
  where not exists (select 1 from public.athletes a where a.program_id=pid and lower(a.name)=lower(v.name));

  perform public.recompute_career_from_seasons(pid);

  -- All-Purpose Yards (only where > 0, so non-skill players stay blank)
  update public.all_time_players t set stats = jsonb_set(t.stats, '{All-Purpose Yards}', to_jsonb(ap.v))
  from (select id, (coalesce((stats->>'Rushing Yards')::numeric,0)+coalesce((stats->>'Receiving Yards')::numeric,0)+coalesce((stats->>'Kick Off Return Yards')::numeric,0)+coalesce((stats->>'Punt Return Yards')::numeric,0)) v from public.all_time_players where program_id=pid) ap
  where t.id=ap.id and ap.v>0;

  update public.athletes a set stats = jsonb_set(a.stats, '{All-Purpose Yards}', to_jsonb(ap.v))
  from (select id, (coalesce((stats->>'Rushing Yards')::numeric,0)+coalesce((stats->>'Receiving Yards')::numeric,0)+coalesce((stats->>'Kick Off Return Yards')::numeric,0)+coalesce((stats->>'Punt Return Yards')::numeric,0)) v from public.athletes where program_id=pid) ap
  where a.id=ap.id and ap.v>0;
end $$;
NOTIFY pgrst, 'reload schema';
