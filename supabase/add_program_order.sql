-- ────────────────────────────────────────────────────────────────────────────
-- Per-user home-page program order — stored DURABLY in the user's profile.
-- ────────────────────────────────────────────────────────────────────────────
-- The drag-to-reorder on the home page was localStorage-only, which doesn't survive a cache clear,
-- PRIVATE/incognito browsing (Safari private wipes localStorage on close), or a different device.
-- This adds a per-user column so the order saves for good. It stays PER-USER (each admin keeps their
-- own order — one user's reorder never changes another's). Array of program ids in preferred order.
-- profiles already allows each user to select/update ONLY their own row (prof_sel / prof_upd), so no
-- new policy is needed.

alter table public.profiles
  add column if not exists program_order jsonb not null default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
