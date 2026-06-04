// ── stripe-webhook ────────────────────────────────────────────────────────────
// Source of truth for subscription state. Verifies Stripe's signature, then keeps
// organizations.subscription_status/tier (the app's gate) + the subscriptions table
// in sync. AppWrapper unlocks a school only when status is 'active' (or a valid trial).
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
//   Verify JWT OFF (Stripe calls server-to-server, no JWT; we verify the signature).
//   Secret: STRIPE_WEBHOOK_SECRET (set). Then add this function's URL as a webhook
//   endpoint in the Stripe dashboard (events: checkout.session.completed,
//   customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed).
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fallback price → tier map (primary source is checkout/subscription metadata.tier).
const PRICE_TIER: Record<string, string> = {
  "price_1TdcrABzAEImpxa62G24Ul20": "program",
  "price_1TdczrBzAEImpxa6dKJ8R8gp": "program",
  "price_1TdcrXBzAEImpxa6WMZtfSY0": "school",
  "price_1Tdd0bBzAEImpxa6voXKjkUm": "school",
  "price_1Tdd1XBzAEImpxa6dlaquzPO": "school_plus",
  "price_1Tdd1rBzAEImpxa6NjhJBxV6": "school_plus",
};

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    return new Response(`bad signature: ${String((e as Error)?.message || e)}`, { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const setOrg = async (orgId: string, fields: Record<string, unknown>) => {
    if (orgId) await admin.from("organizations").update(fields).eq("id", orgId);
  };
  const upsertSub = async (row: Record<string, unknown>) =>
    admin.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
  const priceOf = (sub: any) => sub?.items?.data?.[0]?.price?.id || null;
  const tierOf = (sub: any) => sub?.metadata?.tier || PRICE_TIER[priceOf(sub) || ""] || "program";
  const orgOf = (sub: any) => sub?.metadata?.org_id || "";
  const periodEnd = (sub: any) => (sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.org_id || "";
        const tier = session.metadata?.tier || "program";
        const sub = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null;
        await setOrg(orgId, { subscription_status: "active", subscription_tier: tier, stripe_customer_id: session.customer });
        if (sub) await upsertSub({
          org_id: orgId, status: "active", stripe_customer_id: session.customer,
          stripe_subscription_id: sub.id, price_id: priceOf(sub), current_period_end: periodEnd(sub),
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const orgId = orgOf(sub);
        await setOrg(orgId, { subscription_status: sub.status, subscription_tier: tierOf(sub) });
        await upsertSub({
          org_id: orgId, status: sub.status, stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id, price_id: priceOf(sub), current_period_end: periodEnd(sub),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await setOrg(orgOf(sub), { subscription_status: "canceled" });
        await upsertSub({ org_id: orgOf(sub), status: "canceled", stripe_subscription_id: sub.id });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object;
        let orgId = "";
        if (inv.subscription) { const sub = await stripe.subscriptions.retrieve(inv.subscription); orgId = orgOf(sub); }
        await setOrg(orgId, { subscription_status: "past_due" });
        break;
      }
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(`handler error: ${String((e as Error)?.message || e)}`, { status: 500 });
  }
});
