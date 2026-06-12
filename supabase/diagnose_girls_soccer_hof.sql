-- READ-ONLY. Girls soccer: every inducted row + every row for the 3 expected inductees.
-- Reveals (a) who actually carries the HOF flag, (b) duplicate rows from name variants,
-- and (c) which copy holds the season stats (so we know which the cleanup would keep).
select atp.id, atp.name,
       atp.school_hall_of_fame as school_hof,
       atp.state_hall_of_fame  as state_hof,
       (select count(*) from public.player_seasons ps
          where ps.program_id = atp.program_id and lower(ps.player_name) = lower(atp.name)) as season_rows
from public.all_time_players atp
join public.programs pr on pr.id = atp.program_id
where pr.sport = 'soccer_girls'
  and ( atp.school_hall_of_fame or atp.state_hall_of_fame
        or lower(atp.name) like '%tubergan%'
        or lower(atp.name) like '%heukelem%'
        or lower(atp.name) like '%vogelzang%' )
order by atp.name, season_rows desc;
