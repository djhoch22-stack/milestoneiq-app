-- Editable per-coach "prior schools" stats (wins/losses + accomplishments earned elsewhere),
-- edited from the Seasons tab. Folds into Coach Wins records + the coach Hall of Fame.
alter table public.programs add column if not exists coach_prior jsonb default '{}'::jsonb;

-- Expose coach_prior on the public record book (added at the END so create-or-replace is allowed)
-- so the public Coach Wins record also includes wins from prior schools.
create or replace view public.public_teams as
  select p.id, p.slug, p.name, p.mascot, p.sport, p.primary_color, p.logo_url, p.coach_hof,
         o.id as org_id, o.name as school_name, o.city, o.state, o.level, p.coach_prior
  from public.programs p
  join public.organizations o on o.id = p.org_id
  where coalesce(p.is_public, true);

NOTIFY pgrst, 'reload schema';
