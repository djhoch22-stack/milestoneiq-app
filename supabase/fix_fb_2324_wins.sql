-- Sync the 2023-2024 football player wins to the corrected seasons record (now 4-5 → 4 wins),
-- then rebuild careers. Reads the value from the seasons table so it matches whatever you set.
do $$
declare pid uuid; w int;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  select wins into w from public.seasons where program_id=pid and season='2023-2024';
  if pid is not null and w is not null then
    update public.player_seasons set stats = jsonb_set(stats, '{Wins}', to_jsonb(w))
      where program_id=pid and season='2023-2024';
    perform public.recompute_career_from_seasons(pid);
  end if;
end $$;
NOTIFY pgrst, 'reload schema';
