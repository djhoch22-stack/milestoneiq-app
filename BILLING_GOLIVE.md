# Billing go‑live checklist — Stripe TEST → LIVE

The code is wired and **verified correct in TEST mode**. Going live is Stripe‑dashboard work plus swapping the 8 test price IDs for 8 live ones. Do the steps in order.

## What the code does today (verified)
- **4 tiers × monthly/annual = 8 distinct price IDs**, wired in three places:
  - `src/Auth.jsx` → `PLANS` (`monthlyId` / `annualId` per tier) — used to start Checkout.
  - `supabase/functions/stripe-webhook/index.ts` → `PRICE_TIER` (price ID → tier) — sets the org's tier after payment.
  - `src/AppWrapper.jsx` → `TIER_LIMITS` — gates program / user counts per tier.
- The subscription **gate is org‑level**: `organizations.subscription_status` / `subscription_tier` / `trial_ends_at`. The webhook is the source of truth.
- Prices (intended): **Program $15/$149 · Program+ $39/$389 · School $149/$1,490 · School+ $299/$2,990** (mo/yr).

## Step 0 — verify the TEST flow first (catch the School+ annual question)
1. Settings → 💳 Billing → Upgrade → for **each** plan, try **monthly AND annual** → Stripe Checkout → pay with test card `4242 4242 4242 4242`.
2. On the Checkout page, confirm the amount matches the intended price — **especially School+ Annual = $2,990/yr** (its annual id `price_1Tdd1r…` was *assumed* annual). If it shows the monthly amount, the monthly/annual ids are swapped — flip them in BOTH `PLANS` and `PRICE_TIER`.
3. After paying, confirm the org flips to `active` with the right `subscription_tier` (the program limit changes).
4. Manage billing → portal → cancel → confirm org goes `canceled` and the LockedScreen appears.

## Step 1 — create LIVE products & prices (Stripe dashboard, **Live mode**)
- Toggle the dashboard to **Live mode** (top‑right).
- Create 4 products, each with a **monthly** and an **annual** price (8 prices total) at the amounts above.
- Copy the 8 new **live** price IDs (they're different from the test ones).

## Step 2 — swap the IDs into the code
- `src/Auth.jsx` → `PLANS`: replace each tier's `monthlyId` / `annualId` with the live ids.
- `supabase/functions/stripe-webhook/index.ts` → `PRICE_TIER`: replace the 8 keys with the live ids (keep the tier values: `program` / `program_plus` / `school` / `school_plus`).
- Push the app (Vercel rebuilds). Re‑deploy the webhook (Step 3).

## Step 3 — live keys & webhook
- Set Supabase secrets to **live** values: `STRIPE_SECRET_KEY` = `sk_live_…`.
- Stripe (Live) → Developers → Webhooks → **Add endpoint**:
  `https://odirpbptemubzysrvajh.supabase.co/functions/v1/stripe-webhook`
  Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- Copy the endpoint's **Signing secret** → set Supabase secret `STRIPE_WEBHOOK_SECRET` = `whsec_…`.
- Re‑deploy all three with Verify JWT OFF:
  `supabase functions deploy create-checkout --no-verify-jwt`
  `supabase functions deploy create-portal --no-verify-jwt`
  `supabase functions deploy stripe-webhook --no-verify-jwt`

## Step 4 — configure the Customer Portal (Live)
- Stripe (Live) → Settings → Billing → **Customer portal** → enable, allow cancel + plan switching → Save. (The "Manage billing" button opens this; it errors until configured.)

## Step 5 — live smoke test
- Real card, smallest plan, monthly → confirm the charge + that the program unlocks → cancel via the portal → confirm it locks. Refund the charge in Stripe afterward.

## Notes / gotchas
- Stripe prices are **immutable** — to change an amount, create a new price and swap its id.
- **Don't self‑lock:** Denver Christian's org is grandfathered `subscription_status='active'` — leave it.
- Verify‑JWT must stay **OFF** on the Stripe functions (browser CORS preflight + Stripe's server‑to‑server webhook carry no JWT).
- After any DDL, run `NOTIFY pgrst, 'reload schema';`.
