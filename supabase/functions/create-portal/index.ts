// ── create-portal ─────────────────────────────────────────────────────────────
// Opens the Stripe billing portal for a school (org) so its admin can update the
// card, change plan, or cancel. Only works once the org has a Stripe customer
// (i.e. has subscribed at least once via create-checkout).
//
// Deploy:  supabase functions deploy create-portal --no-verify-jwt
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
    const { orgId } = await req.json();
    if (!orgId) return json({ error: "orgId is required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    const admin = createClient(url, serviceKey);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) return json({ error: "not authenticated", detail: uErr?.message || "no user from token" }, 401);
    const { data: mem } = await admin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
    if (mem?.role !== "admin") return json({ error: "only a school admin can manage billing" }, 403);

    const { data: org } = await admin
      .from("organizations").select("stripe_customer_id").eq("id", orgId).single();
    if (!org?.stripe_customer_id) return json({ error: "no subscription to manage yet — choose a plan first" }, 400);

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${APP_URL}/`,
    });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
