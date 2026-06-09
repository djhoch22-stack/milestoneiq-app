# Billing go‑live checklist — Stripe LIVE

## ✅ Done (in code)
- **Live price IDs wired** (replaced the test ids) in:
  - `src/Auth.jsx` → `PLANS` (`monthlyId` / `annualId` per tier)
  - `supabase/functions/stripe-webhook/index.ts` → `PRICE_TIER` (price → tier)
- All 4 tiers × monthly/annual = 8 distinct live ids, mapped to the correct tier:
  - Program `…Tg9sS` / `…Tg9su` · Program+ `…Tg9tF` / `…Tg9te` · School `…Tg9uV` / `…Tg9uq` · School+ `…Tg9vD` / `…Tg9ve`
- `src/AppWrapper.jsx` → `TIER_LIMITS` already covers all 4 tiers.

## ⚠️ CRITICAL ORDER — don't push the app until live keys are set
The app now sends **live** price IDs to Checkout. A live price ID + a **test** `STRIPE_SECRET_KEY` = "No such price" and checkout breaks for new signups. So do **Step 1 (live secrets + webhook) BEFORE or in the same window as pushing** `src/Auth.jsx`. (Denver Christian is grandfathered `active`, so it's unaffected during the swap.)

## Step 1 — live secrets & webhook (Supabase + Stripe dashboards)
1. Supabase → Project settings → Edge Functions → Secrets: set `STRIPE_SECRET_KEY` = your **`sk_live_…`** key.
2. Stripe (**Live mode**) → Developers → Webhooks → **Add endpoint**:
   `https://odirpbptemubzysrvajh.supabase.co/functions/v1/stripe-webhook`
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
3. Copy that endpoint's **Signing secret** → set Supabase secret `STRIPE_WEBHOOK_SECRET` = **`whsec_…`** (live).
4. Re‑deploy all three (Verify JWT OFF):
   `supabase functions deploy create-checkout --no-verify-jwt`
   `supabase functions deploy create-portal --no-verify-jwt`
   `supabase functions deploy stripe-webhook --no-verify-jwt`

## Step 2 — push the app
- Push `src/Auth.jsx` (+ anything else pending). Vercel rebuilds with the live price IDs.

## Step 3 — configure the Customer Portal (Live)
- Stripe (Live) → Settings → Billing → **Customer portal** → enable, allow cancel + plan switching → Save. (The "Manage billing" button opens this; it errors until configured.)

## Step 4 — live smoke test
- Settings → 💳 Billing → Upgrade → pick the **smallest** plan, **monthly** → pay with a **real card** → confirm the program unlocks and the tier limit changes.
- **Confirm the amounts** as they show on the live Checkout page — especially **School+ Annual = $2,990/yr**.
- Manage billing → portal → **cancel** → confirm it locks. Then **refund** the test charge in Stripe.

## Notes / gotchas
- Stripe prices are **immutable** — to change an amount, create a new price and swap its id in `PLANS` + `PRICE_TIER`.
- **Don't self‑lock:** DC's org is grandfathered `subscription_status='active'` — leave it.
- Verify‑JWT stays **OFF** on the Stripe functions (browser CORS preflight + Stripe's server‑to‑server webhook carry no JWT).
- % ‑off coupons work via `allow_promotion_codes` at Checkout — create them in the Stripe (Live) dashboard.
