-- Denver Christian Football — accurate 2024-2025 per-player stats parsed from the MaxPreps PDF
-- (the AI import only captured 'Total Yards'; this replaces that season with the full stat set).
do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  -- replace ONLY the 2024-2025 season (every other season untouched)
  delete from public.player_seasons where program_id=pid and season='2024-2025';
  insert into public.player_seasons (program_id, player_name, season, stats) values
    (pid, 'Austin Fitzgerald', '2024-2025', '{"Games Played": 2, "Wins": 2, "Combined Tackles": 4}'::jsonb),
    (pid, 'Ben Pereira', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushing Yards": 90, "Rushing Attempts": 24, "Rushing TDs": 2, "Receiving Yards": 137, "Receptions": 10, "Total Yards": 227, "Total TDs": 2, "Combined Tackles": 33, "Sacks": 3}'::jsonb),
    (pid, 'Bill Tran', '2024-2025', '{"Games Played": 1, "Wins": 2, "Combined Tackles": 2}'::jsonb),
    (pid, 'Carsyn Romero', '2024-2025', '{"Games Played": 5, "Wins": 2, "Combined Tackles": 22, "Sacks": 1}'::jsonb),
    (pid, 'Cole McCabe', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushing Yards": 3, "Rushing Attempts": 1, "Receiving Yards": 57, "Receptions": 2, "Total Yards": 60, "Combined Tackles": 10}'::jsonb),
    (pid, 'Diego Pellegrini', '2024-2025', '{"Games Played": 5, "Wins": 2, "Rushing Yards": 367, "Rushing Attempts": 55, "Rushing TDs": 1, "Receiving Yards": 142, "Receptions": 9, "Receiving TDs": 1, "Total Yards": 509, "Total TDs": 2, "Combined Tackles": 26}'::jsonb),
    (pid, 'Driggs Silvernale', '2024-2025', '{"Games Played": 2, "Wins": 2, "Receiving Yards": 14, "Receptions": 2, "Total Yards": 14}'::jsonb),
    (pid, 'Elijah Moreno', '2024-2025', '{"Games Played": 1, "Wins": 2, "Combined Tackles": 2}'::jsonb),
    (pid, 'George Smith', '2024-2025', '{"Games Played": 2, "Wins": 2, "Combined Tackles": 4}'::jsonb),
    (pid, 'Hunter Sullivan', '2024-2025', '{"Games Played": 2, "Wins": 2, "Combined Tackles": 1.5}'::jsonb),
    (pid, 'Javion Bushman', '2024-2025', '{"Games Played": 3, "Wins": 2, "Combined Tackles": 8, "Sacks": 1}'::jsonb),
    (pid, 'Josiah Schott', '2024-2025', '{"Games Played": 5, "Wins": 2, "Combined Tackles": 22, "Sacks": 2}'::jsonb),
    (pid, 'Kody Olson', '2024-2025', '{"Games Played": 1, "Wins": 2, "Combined Tackles": 2}'::jsonb),
    (pid, 'Lukas Gonzales', '2024-2025', '{"Games Played": 3, "Wins": 2, "Rushing Yards": 31, "Rushing Attempts": 4, "Total Yards": 31, "Combined Tackles": 14}'::jsonb),
    (pid, 'Owen Whitney', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receiving Yards": 21, "Receptions": 1, "Total Yards": 21, "Combined Tackles": 17}'::jsonb),
    (pid, 'Patrick Elson', '2024-2025', '{"Games Played": 2, "Wins": 2, "Rushing Yards": 4, "Rushing Attempts": 1, "Rushing TDs": 1, "Receiving Yards": 126, "Receptions": 9, "Receiving TDs": 2, "Total Yards": 130, "Total TDs": 3, "Combined Tackles": 8}'::jsonb),
    (pid, 'Pete Smith', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receiving Yards": 35, "Receptions": 6, "Total Yards": 35, "Combined Tackles": 12}'::jsonb),
    (pid, 'Quinn Barkema', '2024-2025', '{"Games Played": 5, "Wins": 2, "Rushing Yards": 36, "Rushing Attempts": 3, "Receiving Yards": 52, "Receptions": 4, "Total Yards": 88, "Combined Tackles": 42, "Sacks": 1}'::jsonb),
    (pid, 'Reece Miller', '2024-2025', '{"Games Played": 3, "Wins": 2, "Combined Tackles": 6}'::jsonb),
    (pid, 'Roman Meister', '2024-2025', '{"Games Played": 1, "Wins": 2, "Combined Tackles": 4}'::jsonb),
    (pid, 'Sam Pereira', '2024-2025', '{"Games Played": 4, "Wins": 2, "Rushing Yards": -1, "Rushing Attempts": 1, "Receiving Yards": 5, "Receptions": 2, "Total Yards": 4, "Combined Tackles": 17}'::jsonb),
    (pid, 'Soren Stromberg', '2024-2025', '{"Games Played": 5, "Wins": 2, "Receiving Yards": 35, "Receptions": 4, "Total Yards": 35, "Combined Tackles": 18}'::jsonb),
    (pid, 'Trenton Steeves', '2024-2025', '{"Games Played": 5, "Wins": 2, "Passing Yards": 574, "Pass Completions": 43, "Pass Attempts": 106, "Passing TDs": 3, "Rushing Yards": 52, "Rushing Attempts": 14, "Rushing TDs": 3, "Total Yards": 626, "Total TDs": 3, "Combined Tackles": 12}'::jsonb);
  -- roll the season up into career totals (adds these players to the All-Time tab)
  perform public.recompute_career_from_seasons(pid);
end $$;
NOTIFY pgrst, 'reload schema';
