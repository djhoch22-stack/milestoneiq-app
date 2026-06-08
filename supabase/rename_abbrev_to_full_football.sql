-- ────────────────────────────────────────────────────────────────────────────
-- Rename abbreviated football names → full names (from the 2009–2013 rosters)
-- ────────────────────────────────────────────────────────────────────────────
-- PURE RENAME — nothing is deleted. "A. Terpstra" simply becomes "Alex Terpstra" everywhere it
-- appears: season rows, all-time career, active roster, records, and awards. Stats are untouched.
-- Names matched to the attached 09-10 / 10-11 / 11-12 / 12-13 roster PDFs by last name + initial.
-- (Players who only appear in 2013-2014 aren't included — there was no 2013-2014 roster. Upload that
--  roster, or send the names, to finish those: A. Davis, D. Kiley, J. Gottschalk, J. Peters, K. Piper,
--  K. Van Roekel, L. Geels, M. Adams, M. Stallings, N. Hayes.)

do $$
declare pid uuid; m record;
begin
  select id into pid from public.programs where slug = 'denver-christian-football';
  if pid is null then raise exception 'football program not found'; end if;
  for m in select * from (values
    ('A. Marquez','Alex Marquez'),
    ('A. Terpstra','Alex Terpstra'),
    ('A. Van Denend','Andrew Van Denend'),
    ('A. Vandenend','Andrew Vandenend'),
    ('B. Dodgen','Brooks Dodgen'),
    ('C. Adams','Caden Adams'),
    ('C. Davis','Cody Davis'),
    ('C. Natelborg','Colton Natelborg'),
    ('C. Pecot','Carson Pecot'),
    ('C. Viss','Chase Viss'),
    ('D. Herder','Dean Herder'),
    ('D. Kastens','Drew Kastens'),
    ('D. Offutt','Dillan Offutt'),
    ('D. Peterson','Darren Peterson'),
    ('E. Anema','Ethan Anema'),
    ('E. Piper','Eli Piper'),
    ('F. Sanderson','Forrest Sanderson'),
    ('H. Langerak','Hayden Langerak'),
    ('J. Bjorgum','Josh Bjorgum'),
    ('J. Carter','Josh Carter'),
    ('J. Evensen','Josh Evensen'),
    ('J. Kortenhoeven','Jacob Kortenhoeven'),
    ('J. Monsma','Jacob Monsma'),
    ('J. Sackey','Jonathan Sackey'),
    ('J. Van eps','Josh Van Eps'),
    ('K. Kortenhoeven','Kyle Kortenhoeven'),
    ('K. Schmitt','Kyler Schmitt'),
    ('L. Dominguez','Lazarith Dominguez'),
    ('M. Connolly','Mac Connolly'),
    ('M. Parras','Mike Parras'),
    ('R. Herren','Riley Herren'),
    ('R. Hickman','Ron Hickman'),
    ('R. Parker','Robert Parker'),
    ('S. Becker','Simon Becker'),
    ('S. Gallagher','Solomon Gallagher'),
    ('S. Luna','Sean Luna'),
    ('T. Lee','Travis Lee'),
    ('T. Menachof','Tristan Menachof'),
    ('T. Shiffer','Tyler Shiffer')
  ) as t(abbr, fullname) loop
    update public.player_seasons   set player_name = m.fullname where program_id = pid and player_name = m.abbr;
    update public.all_time_players set name        = m.fullname where program_id = pid and name        = m.abbr;
    update public.athletes         set name        = m.fullname where program_id = pid and name        = m.abbr;
    update public.records          set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
    update public.awards           set holder_name = m.fullname where program_id = pid and holder_name = m.abbr;
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';
