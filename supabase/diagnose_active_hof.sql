-- ────────────────────────────────────────────────────────────────────────────
-- READ-ONLY diagnostic — nothing is changed. Run all three, paste the results.
-- (1) what academic year the recompute treats as "active"
-- (2) who girls soccer actually has inducted in the DB right now
-- (3) why boys-basketball athletes are active/inactive (roster-only vs. season data)
-- ────────────────────────────────────────────────────────────────────────────

-- (1) the "current season" string the recompute compares against
select 'current_season' as label,
  case when extract(month from now()) >= 7
    then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int end as value;

-- (2) Girls soccer inducted players in the DB (expect Jen Tubergan, Missy Van Heukelem, Emily Vogelzang)
select pr.name as program, atp.name,
       atp.school_hall_of_fame as school_hof, atp.state_hall_of_fame as state_hof
from public.all_time_players atp
join public.programs pr on pr.id = atp.program_id
where pr.sport = 'soccer_girls'
  and (atp.school_hall_of_fame or atp.state_hall_of_fame)
order by atp.name;

-- (3) Boys basketball: each athlete's active flag vs. their season data.
--     season_rows = 0  → roster-only (manually added) → the recompute is wrongly deactivating them.
--     latest_season <> current_season → their newest stat year isn't the current one.
select ath.name, ath.is_active,
       (select count(*) from public.player_seasons ps
          where ps.program_id = ath.program_id and lower(ps.player_name) = lower(ath.name)) as season_rows,
       (select max(ps.season) from public.player_seasons ps
          where ps.program_id = ath.program_id and lower(ps.player_name) = lower(ath.name)) as latest_season
from public.athletes ath
join public.programs pr on pr.id = ath.program_id
where pr.sport = 'basketball_boys'
order by ath.is_active nulls first, ath.name;
