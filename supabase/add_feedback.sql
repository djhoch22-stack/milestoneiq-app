-- Feedback captured by the in-app AI helper (support-chat → record_feedback tool).
-- OPTIONAL: the helper EMAILS you regardless; this table just gives a durable log + a future
-- in-app admin list. The edge function inserts via the service role (bypasses RLS); the only
-- policy needed is so a platform owner can READ them.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizations(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  user_email  text,
  kind        text not null default 'other',   -- bug | suggestion | praise | other
  summary     text,
  detail      text,
  status      text not null default 'new',      -- new | reviewed | done | wontfix
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists feedback_owner_read on public.feedback;
create policy feedback_owner_read on public.feedback for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_platform_owner = true));

notify pgrst, 'reload schema';
