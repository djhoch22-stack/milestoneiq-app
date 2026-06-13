-- Hall of Fame induction year. Athletes: a new column on all_time_players. Coaches: stored in the
-- existing programs.coach_hof jsonb — the value per coach becomes the induction YEAR (a number) instead
-- of just `true` (legacy `true` = inducted, no year recorded; both are truthy so existing checks hold).
alter table public.all_time_players add column if not exists hof_year int;

NOTIFY pgrst, 'reload schema';
