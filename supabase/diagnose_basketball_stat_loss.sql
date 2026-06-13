-- READ-ONLY diagnosis of the basketball stat loss. Nothing is modified.
-- Run each block; in the Supabase editor you may see only the LAST result, so run them one at a time.

-- (1) SCOPE: per basketball program, how many season rows are "stripped" (≤2 stat keys, i.e. ~Points only)
--     vs. how many still carry a full stat line, and the average number of stat keys per row.
select pr.name as program, pr.sport,
       count(*)                                                                              as season_rows,
       count(*) filter (where (select count(*) from jsonb_object_keys(ps.stats)) <= 2)       as stripped_rows,
       count(*) filter (where (select count(*) from jsonb_object_keys(ps.stats)) >= 5)       as full_rows,
       round(avg((select count(*) from jsonb_object_keys(ps.stats)))::numeric, 1)            as avg_stat_keys
from public.player_seasons ps
join public.programs pr on pr.id = ps.program_id
where pr.sport like 'basketball%'
group by pr.name, pr.sport;

-- (2) Are the CAREER totals still intact? Count stat keys on each basketball all-time player.
--     If these are still rich (10+ keys) the careers are your recovery source — do NOT recompute.
select pr.name as program, atp.name as player,
       (select count(*) from jsonb_object_keys(atp.stats)) as career_stat_keys,
       (atp.stats->>'Points') as career_points, (atp.stats->>'Field Goals Made') as career_fgm
from public.all_time_players atp
join public.programs pr on pr.id = atp.program_id
where pr.sport like 'basketball%'
order by (atp.stats->>'Points')::numeric desc nulls last
limit 20;

-- (3) Sample player: Alex Terpstra's season rows (what survived) — to see the exact shape of the loss.
select ps.season, ps.stats
from public.player_seasons ps
join public.programs pr on pr.id = ps.program_id
where pr.sport like 'basketball%' and lower(ps.player_name) = 'alex terpstra'
order by ps.season;
