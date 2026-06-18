// ── change-plan ───────────────────────────────────────────────────────────────
// Switches an ACTIVE org's existing subscription to a different price IN PLACE
// (stripe.subscriptions.update) instead of opening a fresh Checkout — which would
// create a SECOND subscription and double-bill the school. Stripe handles proration.
// If the org has no live subscription yet (e.g. a comp/trialing org), returns
// { needsCheckout: true } so the caller falls back to create-checkout (a real first sub).
//
// Deploy:  supabase functions deploy change-plan --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate the caller via getUser).
//   Secret: STRIPE_SECRET_KEY (already set).
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { orgId, priceId, tier } = await req.json();
    if (!orgId || !priceId) return json({ error: "orgId and priceId are required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const admin = createClient(url, serviceKey);

    // The caller must be this org's admin.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) return json({ error: "not authenticated", detail: uErr?.message || "no user" }, 401);
    const { data: mem } = await admin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
    if (mem?.role !== "admin") return json({ error: "only a school admin can manage billing" }, 403);

    const { data: org } = await admin
      .from("organizations").select("id, stripe_customer_id").eq("id", orgId).single();
    const customerId = (org?.stripe_customer_id as string | null) || null;
    if (!customerId) return json({ needsCheckout: true }); // no Stripe customer yet → start a real checkout

    // Find the live subscription to modify (after de-duping there is exactly one).
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
    const sub = subs.data[0];
    if (!sub) return json({ needsCheckout: true }); // active org but no Stripe sub (e.g. comp) → checkout

    const item = sub.items.data[0];
    if (item?.price?.id === priceId) return json({ ok: true, unchanged: true });

    // Swap the price on the existing item — NO new subscription is created.
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations", // difference settles on the next invoice
      metadata: { org_id: orgId, tier: tier || "" }, // keep tier in sync for the webhook's tierOf()
    });
    // Reflect the new tier immediately; the customer.subscription.updated webhook also syncs it.
    if (tier) await admin.from("organizations").update({ subscription_tier: tier }).eq("id", orgId);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
