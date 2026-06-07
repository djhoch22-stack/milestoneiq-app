-- Fix 2023-2024 football names: replace stat-sheet abbreviations with the roster's full names,
-- then rebuild careers (merges with the same players' other seasons).
do $$
declare pid uuid;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  update public.player_seasons set player_name='Brayden Adams' where program_id=pid and season='2023-2024' and player_name='B. Adams';
  update public.player_seasons set player_name='Ben Pereira' where program_id=pid and season='2023-2024' and player_name='B. Pereira';
  update public.player_seasons set player_name='Brodie Wolff' where program_id=pid and season='2023-2024' and player_name='B. Wolff';
  update public.player_seasons set player_name='Carsyn Romero' where program_id=pid and season='2023-2024' and player_name='C. Romero';
  update public.player_seasons set player_name='Diego Pellegrini' where program_id=pid and season='2023-2024' and player_name='D. Pellegrini';
  update public.player_seasons set player_name='George Smith' where program_id=pid and season='2023-2024' and player_name='G. Smith';
  update public.player_seasons set player_name='Hunter Sullivan' where program_id=pid and season='2023-2024' and player_name='H. Sullivan';
  update public.player_seasons set player_name='James Fiss' where program_id=pid and season='2023-2024' and player_name='J. Fiss';
  update public.player_seasons set player_name='Josiah Schott' where program_id=pid and season='2023-2024' and player_name='J. Schott';
  update public.player_seasons set player_name='Joseph Spallone' where program_id=pid and season='2023-2024' and player_name='J. Spallone';
  update public.player_seasons set player_name='Kody Olson' where program_id=pid and season='2023-2024' and player_name='K. Olson';
  update public.player_seasons set player_name='Luke Booysen' where program_id=pid and season='2023-2024' and player_name='L. Booysen';
  update public.player_seasons set player_name='Malachi Torrez' where program_id=pid and season='2023-2024' and player_name='M. Torrez';
  update public.player_seasons set player_name='Nathan Buehrer' where program_id=pid and season='2023-2024' and player_name='N. Buehrer';
  update public.player_seasons set player_name='Owen Whitney' where program_id=pid and season='2023-2024' and player_name='O. Whitney';
  update public.player_seasons set player_name='Patrick Elson' where program_id=pid and season='2023-2024' and player_name='P. Elson';
  update public.player_seasons set player_name='Pete Smith' where program_id=pid and season='2023-2024' and player_name='P. Smith';
  update public.player_seasons set player_name='Quinn Barkema' where program_id=pid and season='2023-2024' and player_name='Q. Barkema';
  update public.player_seasons set player_name='Roman Meister' where program_id=pid and season='2023-2024' and player_name='R. Meister';
  update public.player_seasons set player_name='Reece Miller' where program_id=pid and season='2023-2024' and player_name='R. Miller';
  update public.player_seasons set player_name='Soren Stromberg' where program_id=pid and season='2023-2024' and player_name='S. Stromberg';
  update public.player_seasons set player_name='Trenton Steeves' where program_id=pid and season='2023-2024' and player_name='T. Steeves';
  delete from public.all_time_players where program_id=pid and name in ('B. Adams','B. Pereira','B. Wolff','C. Romero','D. Pellegrini','G. Smith','H. Sullivan','J. Fiss','J. Schott','J. Spallone','K. Olson','L. Booysen','M. Torrez','N. Buehrer','O. Whitney','P. Elson','P. Smith','Q. Barkema','R. Meister','R. Miller','S. Stromberg','T. Steeves');
  delete from public.athletes        where program_id=pid and name in ('B. Adams','B. Pereira','B. Wolff','C. Romero','D. Pellegrini','G. Smith','H. Sullivan','J. Fiss','J. Schott','J. Spallone','K. Olson','L. Booysen','M. Torrez','N. Buehrer','O. Whitney','P. Elson','P. Smith','Q. Barkema','R. Meister','R. Miller','S. Stromberg','T. Steeves');
  perform public.recompute_career_from_seasons(pid);
end $$;
NOTIFY pgrst, 'reload schema';
