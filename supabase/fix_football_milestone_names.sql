-- Rename any STORED football milestones from old stat names to the coach's names (mirrors the
-- all-time / player-seasons migration). Safe no-op if your milestones already use the new names.
do $$
declare pid uuid; r record;
begin
  select id into pid from public.programs where slug='denver-christian-football';
  if pid is null then return; end if;
  for r in select o, n from (values
    ('Combined Tackles','Tackles'),
    ('Extra Points Made','PAT Mades'),
    ('Fumbles Forced','Forced Fumbles'),
    ('Fumbles Recovered','Fumble Recoveries'),
    ('Kick Return Yards','Kick Off Return Yards'),
    ('Kick Returns','Kick Off Returns'),
    ('Pass Attempts','Passing Attempts'),
    ('Pass Completions','Completetions'),
    ('Passes Defended','Pass Break Ups'),
    ('Punting Yards','Punt Yards'),
    ('Rushing Attempts','Rushes')
  ) as t(o,n) loop
    update public.milestones set stat_name = r.n where program_id = pid and stat_name = r.o;
  end loop;
end $$;
NOTIFY pgrst, 'reload schema';
