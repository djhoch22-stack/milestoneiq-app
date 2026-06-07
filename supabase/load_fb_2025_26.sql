-- Denver Christian Football 2025-2026 — parsed directly from the MaxPreps PDF (the AI import only
-- read player names, not the multi-table stats). Replaces the empty 2025-26 rows, then recomputes
-- (players become active since 2025-26 is the current season).
do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  delete from public.player_seasons where program_id=pid and season='2025-2026';
  insert into public.player_seasons (program_id, player_name, season, stats) values
    (pid, 'Austin Fitzgerald', '2025-2026', '{"Games Played": 9, "Wins": 4, "Receptions": 14, "Receiving Yards": 327, "Receiving TDs": 3, "Total Yards": 327, "Total TDs": 3, "Tackles": 31, "Interceptions": 2, "Fumble Recoveries": 1, "All-Purpose Yards": 327}'::jsonb),
    (pid, 'Bret McGatlin', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Brody Wardenburg', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 3}'::jsonb),
    (pid, 'Camden Epperhart', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 5, "Rushing Yards": 11, "Total Yards": 11, "Tackles": 6, "Fumble Recoveries": 1, "Punts": 14, "Punt Yards": 412, "All-Purpose Yards": 11}'::jsonb),
    (pid, 'Cole McCabe', '2025-2026', '{"Games Played": 9, "Wins": 4, "Completetions": 37, "Passing Attempts": 77, "Passing Yards": 481, "Passing TDs": 6, "Rushes": 60, "Rushing Yards": 263, "Rushing TDs": 2, "Total Yards": 744, "Total TDs": 2, "Tackles": 55, "Interceptions": 3, "Pass Break Ups": 1, "Punt Returns": 2, "Punt Return Yards": 60, "All-Purpose Yards": 323}'::jsonb),
    (pid, 'Daniel Copeland', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 24, "Rushing Yards": 266, "Rushing TDs": 3, "Receptions": 1, "Total Yards": 266, "Total TDs": 3, "Tackles": 22, "Interceptions": 1, "Pass Break Ups": 2, "Forced Fumbles": 1, "Kick Off Returns": 10, "Kick Off Return Yards": 241, "All-Purpose Yards": 507}'::jsonb),
    (pid, 'Deven Lord', '2025-2026', '{"Games Played": 9, "Wins": 4, "Field Goals Made": 1, "Field Goals Attempts": 1, "PAT Mades": 17, "PAT Attempts": 17, "Kick Offs": 21, "Kick Off Yards": 834}'::jsonb),
    (pid, 'Dominic Khadiwala', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 1}'::jsonb),
    (pid, 'Driggs Silvernale', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 15, "Rushing Yards": 101, "Rushing TDs": 3, "Total Yards": 101, "Total TDs": 3, "Tackles": 20, "Pass Break Ups": 4, "Punt Returns": 1, "Punt Return Yards": 6, "Kick Off Returns": 8, "Kick Off Return Yards": 90, "All-Purpose Yards": 197}'::jsonb),
    (pid, 'Elijah Moreno', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 1, "Rushing Yards": 3, "Total Yards": 3, "Tackles": 36, "Pass Break Ups": 1, "Forced Fumbles": 1, "Kick Off Returns": 1, "All-Purpose Yards": 3}'::jsonb),
    (pid, 'Elijah Whitfield', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Ethan Bond', '2025-2026', '{"Games Played": 9, "Wins": 4}'::jsonb),
    (pid, 'George Smith', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 3}'::jsonb),
    (pid, 'Hunter Sullivan', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 1, "Rushing Yards": 3, "Total Yards": 3, "Tackles": 9, "Sacks": 1.0, "All-Purpose Yards": 3}'::jsonb),
    (pid, 'Jace Navarro', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 1, "Rushing Yards": 4, "Total Yards": 4, "Tackles": 7, "Interceptions": 1, "All-Purpose Yards": 4}'::jsonb),
    (pid, 'Josiah Correa', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Josiah Schott', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 30, "Sacks": 1.5}'::jsonb),
    (pid, 'Judah Ellis', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Kaleb Elmore', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Kody Olson', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 2}'::jsonb),
    (pid, 'Landon Sullivan', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Levi Hawes', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Malachi Torrez', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 1, "Rushing Yards": 9, "Total Yards": 9, "Tackles": 16, "Sacks": 1.0, "Forced Fumbles": 1, "Kick Off Returns": 1, "Kick Off Return Yards": 6, "All-Purpose Yards": 15}'::jsonb),
    (pid, 'Mason Priebe', '2025-2026', '{"Games Played": 9, "Wins": 4, "Receptions": 3, "Receiving Yards": 36, "Receiving TDs": 1, "Total Yards": 36, "Total TDs": 1, "Tackles": 25, "Sacks": 1.5, "Pass Break Ups": 2, "Kick Off Returns": 1, "Kick Off Return Yards": 2, "All-Purpose Yards": 38}'::jsonb),
    (pid, 'Maura O''neill', '2025-2026', '{"Games Played": 8, "Wins": 4, "PAT Mades": 9, "PAT Attempts": 10}'::jsonb),
    (pid, 'Max Slaughter', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Noah Smith', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Owen Esmond', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 1}'::jsonb),
    (pid, 'Pete Smith', '2025-2026', '{"Games Played": 9, "Wins": 4, "Passing Attempts": 1, "Rushes": 31, "Rushing Yards": 172, "Rushing TDs": 2, "Receptions": 10, "Receiving Yards": 112, "Total Yards": 284, "Total TDs": 2, "Tackles": 14, "Interceptions": 1, "Pass Break Ups": 3, "Forced Fumbles": 1, "Fumble Recoveries": 1, "Punts": 1, "Punt Yards": 28, "Kick Offs": 24, "Kick Off Yards": 1143, "Kick Off Returns": 6, "Kick Off Return Yards": 47, "All-Purpose Yards": 331}'::jsonb),
    (pid, 'Quinn Barkema', '2025-2026', '{"Games Played": 9, "Wins": 4, "Completetions": 2, "Passing Attempts": 2, "Passing Yards": 79, "Rushes": 117, "Rushing Yards": 857, "Rushing TDs": 14, "Receptions": 9, "Receiving Yards": 67, "Receiving TDs": 1, "Total Yards": 1003, "Total TDs": 15, "Tackles": 73, "Forced Fumbles": 1, "Punts": 4, "Punt Yards": 93, "Punt Returns": 1, "Kick Off Returns": 1, "Kick Off Return Yards": 17, "All-Purpose Yards": 941}'::jsonb),
    (pid, 'Reece Miller', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 14, "Forced Fumbles": 1, "Fumble Recoveries": 1}'::jsonb),
    (pid, 'Robert Burns', '2025-2026', '{"Games Played": 9, "Wins": 4, "Rushes": 13, "Rushing Yards": 73, "Rushing TDs": 1, "Total Yards": 73, "Total TDs": 1, "Tackles": 19, "Punt Returns": 1, "Punt Return Yards": -1, "All-Purpose Yards": 72}'::jsonb),
    (pid, 'Ryan Krajewski', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 1}'::jsonb),
    (pid, 'Silas Flinn', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Tobin Delle Donne', '2025-2026', '{"Games Played": 9, "Wins": 4, "Receptions": 2, "Receiving Yards": 18, "Receiving TDs": 1, "Total Yards": 18, "Total TDs": 1, "Tackles": 28, "Sacks": 2.0, "Pass Break Ups": 1, "Fumble Recoveries": 1, "All-Purpose Yards": 18}'::jsonb),
    (pid, 'Vinny DeLeo', '2025-2026', '{"Wins": 4}'::jsonb),
    (pid, 'Wallace Sabell', '2025-2026', '{"Games Played": 9, "Wins": 4, "Tackles": 2, "Sacks": 1.0}'::jsonb);
  perform public.recompute_career_from_seasons(pid);
end $$;
NOTIFY pgrst, 'reload schema';
