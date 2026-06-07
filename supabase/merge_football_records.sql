-- Merge old-named stored football records into the coach's matching categories.
-- (All-Purpose Yards and Coach Wins are intentionally left as their own categories.)
-- "Completetions" matches the coach's category spelling exactly so the record merges in.
do $$
declare pid uuid; r record;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  for r in select o, n from (values
    ('Combined Tackles','Tackles'),
    ('Extra Points Made','PAT Mades'),
    ('Pass Completions','Completetions'),
    ('Punting Yards','Punt Yards'),
    ('Rushing Attempts','Rushes')
  ) as t(o,n) loop
    update public.records set stat_name = r.n where program_id = pid and stat_name = r.o;
  end loop;
end $$;
NOTIFY pgrst, 'reload schema';
