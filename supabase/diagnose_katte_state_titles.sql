-- READ-ONLY. Why does Dick Katte show 6 of 8 state titles?
-- The public page counts a "state title" when a season's NOTES match /state champ/i AND the season's
-- coach matches. So a season counts only if its note says "State Champ…" and coach = "Dick Katte".
-- Run each block in the Supabase SQL editor.

-- (1) Every basketball season Katte coached — see the exact note + whether it counts as a state title.
select pr.name as program, s.season, s.coach, s.notes,
       (s.notes ~* 'state champ')  as counts_state_title,
       (s.notes ~* 'league champ') as counts_league_title
from public.seasons s
join public.programs pr on pr.id = s.program_id
where pr.sport like 'basketball%' and lower(btrim(s.coach)) = 'dick katte'
order by s.season desc;

-- (2) Per-coach state-title tally across all basketball seasons (confirms the 6 vs 8, and whether 2
--     state-title seasons are attributed to a DIFFERENT coach spelling, or have a non-matching note).
select btrim(s.coach) as coach,
       count(*) filter (where s.notes ~* 'state champ')  as state_titles,
       count(*) filter (where s.notes ~* 'league champ') as league_titles
from public.seasons s
join public.programs pr on pr.id = s.program_id
where pr.sport like 'basketball%'
group by btrim(s.coach)
order by state_titles desc nulls last;

-- (3) Any basketball season whose note mentions "state" but does NOT match /state champ/ — these are the
--     ones being missed (e.g. notes say "State Title" or "State Tournament Champions" instead of "State Champions").
select s.season, s.coach, s.notes
from public.seasons s
join public.programs pr on pr.id = s.program_id
where pr.sport like 'basketball%' and s.notes ~* 'state' and not (s.notes ~* 'state champ')
order by s.season desc;
