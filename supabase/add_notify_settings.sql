-- Per-program notification settings: { auto: bool, recordPct: number, milestonePct: number }
--   auto         — email automatically when a player crosses a threshold (else manual 📧 Send alerts)
--   recordPct    — % of a school record that triggers an "approaching" alert (default 85)
--   milestonePct — % of a milestone that triggers an "approaching" alert (default 90)
-- Private (not surfaced on public pages), so no view change needed.
alter table public.programs add column if not exists notify_settings jsonb not null default '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
