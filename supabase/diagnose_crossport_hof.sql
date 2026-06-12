-- READ-ONLY. Every program these three athletes appear in, and whether they're inducted there.
-- Confirms the cross-sport theory: if Missy/Jen show school_hof = true under girls basketball
-- (a gender-compatible sport), the home tile just needs to count cross-sport inductions like the HOF tab does.
select atp.name, pr.sport, pr.name as program,
       atp.school_hall_of_fame as school_hof,
       atp.state_hall_of_fame  as state_hof
from public.all_time_players atp
join public.programs pr on pr.id = atp.program_id
where lower(atp.name) like '%tuberg%'       -- catches Tubergan / Tubergen
   or lower(atp.name) like '%vogelzang%'
   or lower(atp.name) like '%van heukelem%'  -- shows all three sisters; I'll pick out Missy
order by atp.name, pr.sport;
