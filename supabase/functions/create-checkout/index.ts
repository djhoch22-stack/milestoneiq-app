// ── create-checkout ───────────────────────────────────────────────────────────
// Creates a Stripe Checkout Session (subscription mode) for a school (org). The
// org's admin picks a plan in the app; on success Stripe redirects back and the
// stripe-webhook flips the org to active at the chosen tier.
//
// Deploy:  supabase functions deploy create-checkout --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate the caller
//   inside via getUser). Secrets: STRIPE_SECRET_KEY (set). Optional APP_URL.
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const APP_URL = Deno.env.get("APP_URL") || "https://milestoneiq-app-y3gb-theta.vercel.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { orgId, priceId, tier, billing } = await req.json();
    if (!orgId || !priceId) return json({ error: "orgId and priceId are required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    // Identify + authorize the caller — must be an admin of this school.
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: "not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: mem } = await admin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
    if (mem?.role !== "admin") return json({ error: "only a school admin can manage billing" }, 403);

    const { data: org } = await admin
      .from("organizations").select("id, name, stripe_customer_id").eq("id", orgId).single();
    if (!org) return json({ error: "org not found" }, 404);

    // Reuse or create the org's Stripe customer.
    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name || undefined,
        email: user.email || undefined,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { org_id: orgId, tier: tier || "", billing: billing || "" },
      subscription_data: { metadata: { org_id: orgId, tier: tier || "" } },
    });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
