-- Football stats migrated to the coachs exact names + order: rename the 86 historical players stat
-- keys, reload 2024-2025 with the full MaxPreps set incl kicking/punting/PAT, then recompute careers.
do $$
declare pid uuid; r record;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  delete from public.player_seasons where program_id=pid and season='2024-2025';
  for r in select o, n from (values
    ('Combined Tackles','Tackles'),
    ('Extra Points Made','PAT Mades'),
    ('Fumbles Forced','Forced Fumbles'),
    ('Fumbles Recovered','Fumble Recoveries'),
    ('Kick Return Yards','Kick Off Return Yards'),
    ('Kick Returns','Kick Off Returns'),
    ('Pass Attempts','Passing Attempts'),
    ('Pass Completions','Completetions'),
    ('Passes Defended','Pass Break Ups'),
    ('Punting Yards','Punt Yards'),
    ('Rushing Attempts','Rushes')) as t(o,n) loop
    update public.all_time_players set stats = (stats - r.o) || jsonb_build_object(r.n, stats->r.o)
      where program_id=pid and stats ? r.o;
    update public.player_seasons  set stats = (stats - r.o) || jsonb_build_object(r.n, stats->r.o)
      where program_id=pid and stats ? r.o;
  end loop;
  insert into public.player_seasons (program_id, player_name, season, stats) values
    (pid, 'Austin Fitzgerald', '2024-2025', '{"Games Played": 2, "Wins": 2, "Tackles": 4, "Pass Break Ups": 1}'::jsonb),
    (pid, 'Ben Pereira', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushes": 24, "Rushing Yards": 90, "Rushing TDs": 2, "Receptions": 10, "Receiving Yards": 137, "Total Yards": 227, "Total TDs": 2, "Tackles": 33, "Sacks": 3, "Forced Fumbles": 1}'::jsonb),
    (pid, 'Bill Tran', '2024-2025', '{"Games Played": 1, "Wins": 2, "Tackles": 2}'::jsonb),
    (pid, 'Carsyn Romero', '2024-2025', '{"Games Played": 5, "Wins": 2, "Tackles": 22, "Sacks": 1, "Interceptions": 1}'::jsonb),
    (pid, 'Cole McCabe', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushes": 1, "Rushing Yards": 3, "Receptions": 2, "Receiving Yards": 57, "Total Yards": 60, "Tackles": 10, "Interceptions": 1, "Punt Returns": 5, "Punt Return Yards": 38, "Kick Off Returns": 3, "Kick Off Return Yards": 18}'::jsonb),
    (pid, 'Diego Pellegrini', '2024-2025', '{"Games Played": 5, "Wins": 2, "Rushes": 55, "Rushing Yards": 367, "Rushing TDs": 1, "Receptions": 9, "Receiving Yards": 142, "Receiving TDs": 1, "Total Yards": 509, "Total TDs": 2, "Tackles": 26, "Pass Break Ups": 2, "PAT Mades": 2, "PAT Attempts": 2}'::jsonb),
    (pid, 'Driggs Silvernale', '2024-2025', '{"Games Played": 2, "Wins": 2, "Receptions": 2, "Receiving Yards": 14, "Total Yards": 14}'::jsonb),
    (pid, 'Elijah Moreno', '2024-2025', '{"Games Played": 1, "Wins": 2, "Tackles": 2}'::jsonb),
    (pid, 'George Smith', '2024-2025', '{"Games Played": 2, "Wins": 2, "Tackles": 4}'::jsonb),
    (pid, 'Hunter Sullivan', '2024-2025', '{"Games Played": 2, "Wins": 2, "Tackles": 3}'::jsonb),
    (pid, 'Javion Bushman', '2024-2025', '{"Games Played": 3, "Wins": 2, "Tackles": 8, "Sacks": 1}'::jsonb),
    (pid, 'Josiah Schott', '2024-2025', '{"Games Played": 5, "Wins": 2, "Tackles": 22, "Sacks": 2, "Fumble Recoveries": 1}'::jsonb),
    (pid, 'Kody Olson', '2024-2025', '{"Games Played": 1, "Wins": 2, "Tackles": 2}'::jsonb),
    (pid, 'Lukas Gonzales', '2024-2025', '{"Games Played": 3, "Wins": 2, "Rushes": 4, "Rushing Yards": 31, "Total Yards": 31, "Tackles": 14, "Pass Break Ups": 1, "Kick Off Returns": 4, "Kick Off Return Yards": 20}'::jsonb),
    (pid, 'Owen Whitney', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receptions": 1, "Receiving Yards": 21, "Total Yards": 21, "Tackles": 17, "Pass Break Ups": 1, "Fumble Recoveries": 1, "Kick Offs": 11, "Kick Off Yards": 258}'::jsonb),
    (pid, 'Patrick Elson', '2024-2025', '{"Games Played": 2, "Wins": 2, "Rushes": 1, "Rushing Yards": 4, "Rushing TDs": 1, "Receptions": 9, "Receiving Yards": 126, "Receiving TDs": 2, "Total Yards": 130, "Total TDs": 3, "Tackles": 8, "Pass Break Ups": 5}'::jsonb),
    (pid, 'Pete Smith', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receptions": 6, "Receiving Yards": 35, "Total Yards": 35, "Tackles": 12, "Pass Break Ups": 2, "Kick Off Returns": 8, "Kick Off Return Yards": 107}'::jsonb),
    (pid, 'Quinn Barkema', '2024-2025', '{"Games Played": 5, "Wins": 2, "Rushes": 3, "Rushing Yards": 36, "Receptions": 4, "Receiving Yards": 52, "Total Yards": 88, "Tackles": 42, "Sacks": 1, "Pass Break Ups": 1, "Forced Fumbles": 1}'::jsonb),
    (pid, 'Reece Miller', '2024-2025', '{"Games Played": 3, "Wins": 2, "Tackles": 6, "Fumble Recoveries": 1}'::jsonb),
    (pid, 'Roman Meister', '2024-2025', '{"Games Played": 1, "Wins": 2, "Tackles": 4}'::jsonb),
    (pid, 'Sam Pereira', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushes": 1, "Rushing Yards": -1, "Receptions": 2, "Receiving Yards": 5, "Total Yards": 4, "Tackles": 17, "Forced Fumbles": 1, "Punt Returns": 1, "Punt Return Yards": 9, "Kick Off Returns": 7, "Kick Off Return Yards": 85}'::jsonb),
    (pid, 'Soren Stromberg', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receptions": 4, "Receiving Yards": 35, "Total Yards": 35, "Tackles": 18, "Pass Break Ups": 6}'::jsonb),
    (pid, 'Trenton Steeves', '2024-2025', '{"Games Played": 5, "Wins": 2, "Completetions": 43, "Passing Attempts": 106, "Passing Yards": 574, "Passing TDs": 3, "Rushes": 14, "Rushing Yards": 52, "Rushing TDs": 3, "Total Yards": 626, "Total TDs": 3, "Tackles": 12, "Interceptions": 1, "Pass Break Ups": 4, "Forced Fumbles": 1, "Fumble Recoveries": 1, "Punts": 17, "Punt Yards": 508}'::jsonb);
  perform public.recompute_career_from_seasons(pid);
end $$;
NOTIFY pgrst, 'reload schema';
