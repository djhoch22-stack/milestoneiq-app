# RaftersIQ — codebase guide

RaftersIQ (formerly MilestoneIQ) is a high-school athletics records / Hall-of-Fame SaaS,
live at https://raftersiq.com. This file orients a fresh session on the architecture and the
non-obvious conventions. (Operational notes — outreach, data loads, business — live outside
this repo.)

## Stack
- **App**: React single-page app — `src/MilestoneIQ.jsx` (most of the UI), `src/supabase_client.js`
  (data layer), `src/Auth.jsx`, `src/SchoolOnboarding.jsx`.
- **Public SSR**: Vercel serverless functions render the public pages server-side —
  `api/school.js` (school hub), `api/team.js` (per-program records page), sharing `api/_lib.js`.
  These emit HTML + inline JS; there is no React on the public side.
- **Shared logic**: `shared/scoring.js` — single source of truth for HOF scoring + derived
  stats, imported by both the app and the public SSR.
- **Backend**: Supabase (project ref `odirpbptemubzysrvajh`) — Postgres + RLS, Edge Functions
  (`supabase/functions/*`), Auth.
- **Deploy**: push to `main` → Vercel auto-deploys the app + `api/*`. Edge Functions deploy
  SEPARATELY (not via Vercel) through the Supabase tooling; keep `verify_jwt: false` on
  browser-facing functions or the CORS preflight (OPTIONS, no JWT) fails with "Load failed".

## App ↔ public duplication (important)
The app and the public SSR each keep their OWN copy of several config maps, in different shapes:
- Rate defs: the app (`MilestoneIQ.jsx`) uses `calc`-based definitions; the public (`_lib.js`)
  uses serializable `spec` objects (`{kind:"ratio", num, den}`) evaluated by `evalRateSpec`,
  because the public ships them to the browser.
- Stat groups differ in shape: app groups are `{group, stats:[{name,variants}]}`; public
  `G_<SPORT>` groups are `{g, s:[names]}`. Mixing the shapes crashes the public page (`groupOf`).
When you change one side, check whether the other needs the mirror change.

## Adding a sport = touch ALL of these (missing one = a silent bug)
- `MilestoneIQ.jsx`: `SPORTS`, `SPORT_ORDER`, **`DISPLAY_STATS`** (drives columns AND
  milestones — a sport missing here makes `defaultMilestonesFor` fall back to FOOTBALL
  milestones), a `<SPORT>_THRESHOLDS` map + its branch in `defaultMilestonesFor`, `rateDefsFor`,
  `GROUP_STYLE`, `AVAILABLE_SPORTS`, `STAT_ALIASES_BY_SPORT` (import-header → canonical),
  `POINTS_AUTO_SPORTS` if Points is derived.
- `api/_lib.js`: mirror `DISPLAY_STATS`, `SPORT_ORDER`, `SPORT_ICON`, rate defs (spec form),
  the `G_<SPORT>` groups, `prettySport`.
- `src/SchoolOnboarding.jsx` `SPORTS_AVAILABLE`; `src/Auth.jsx` FAQ list.
- `supabase/functions/extract-pdf/index.ts`: a per-sport section in the AI prompt — without it
  the model reads only the FIRST table of a multi-table MaxPreps PDF.
- `shared/scoring.js`: `withDerivedStats`, HOF weights, `sportGroup`.

## Conventions & gotchas
- **Derived stats** (football Total/All-Purpose Yards, soccer Points) are computed on read via
  `withDerivedStats` (single-sourced in `shared/scoring.js`) or DB triggers — set the
  COMPONENTS, never the composite.
- **Hidden / season-only stats**: `HIDDEN_INPUT_STATS` (imported + used by rate calcs, never
  shown) and `SEASON_ONLY_STATS` (shown only in the season-by-season table). `statsToDisplay`
  filters both — and it UNIONs "present stats > 0", so removing a stat from config does NOT hide
  already-stored values; add it to a hide set.
- **Program creation** goes through the `create_program` SECURITY DEFINER RPC — do not revert to
  a direct insert (RLS / org_id bug).
- **Plan changes** for active subscribers use the `change-plan` edge function (in-place), never
  `create-checkout` (double-billing).
- **Coach records** aggregate across programs and fold `coach_prior`; the app and public have
  SEPARATE `buildCoachStats` — both must fold prior.
- **Public program ordering**: `api/school.js` orders cards by `programs.sort_order`, which a DB
  trigger syncs from `profiles.program_order` (the AD's dashboard order); nulls fall back to
  alphabetical. The denormalized column exists because the anon key can't read `profiles`.
- **Pageview analytics**: `page_views` table + `log_pageview` RPC (own-your-data; Vercel
  Analytics was rejected on cost). An aggregate-only `traffic_digest` RPC plus a `daily-digest`
  edge function and a `pg_cron` job email a daily traffic summary. Tokens/keys for these are NOT
  in this repo.

## Edge functions
`create-checkout`, `stripe-webhook`, `change-plan`, `create-portal` (Stripe billing);
`send-alert`, `send-invite` (Resend email); `delete-account`, `invite-member`; `extract-pdf`
(Claude AI stat extraction from MaxPreps PDFs); `support-chat`; `daily-digest`. All secrets live
in Supabase → Edge Functions → Secrets (RESEND_API_KEY, Stripe keys, etc.), never in code.
