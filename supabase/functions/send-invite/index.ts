// ── send-invite ───────────────────────────────────────────────────────────────
// Emails a person an admin just invited to RaftersIQ, telling them to sign up /
// log in. The actual authorization is the pending_invite row (created by
// inviteMember); this is only the notification.
//
// Deploy:  supabase functions deploy send-invite --no-verify-jwt
//   Secrets: RESEND_API_KEY + RESEND_FROM (same as send-alert). APP_URL optional.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const APP_URL = Deno.env.get("APP_URL") || "https://raftersiq.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, orgId, role } = await req.json();
    if (!email || !orgId) return json({ error: "email and orgId are required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") || "RaftersIQ <onboarding@resend.dev>";
    if (!resendKey) return json({ error: "RESEND_API_KEY is not set" }, 500);

    const admin = createClient(url, serviceKey);
    // Identify the caller from their JWT — the service-role client validates the
    // token directly, so this doesn't depend on the (deprecated) anon key.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) return json({ error: "not authenticated", detail: uErr?.message || "no user from token" }, 401);
    const { data: mem } = await admin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
    if (mem?.role !== "admin") return json({ error: "only a school admin can invite" }, 403);

    const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).single();
    const school = org?.name || "your school";
    const roleLabel = role === "admin" ? "an administrator" : "a coach";
    const subject = `You're invited to RaftersIQ — ${school}`;
    const html = `<div style="font-family:Georgia,serif;color:#111;max-width:520px">
      <h2 style="margin:0 0 8px">🏆 You've been invited to RaftersIQ</h2>
      <p style="font-size:14px;line-height:1.6">You've been added as <b>${roleLabel}</b> for <b>${school}</b> on RaftersIQ — the home for your program's stats, records, and Hall of Fame.</p>
      <p style="font-size:14px;line-height:1.6">Get started by creating your account with <b>this email</b> (${email}):</p>
      <p style="margin:18px 0"><a href="${APP_URL}" style="background:#1a3a6b;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700;font-size:14px">Set up your account →</a></p>
      <p style="font-size:12px;color:#9ca3af">Or visit ${APP_URL} and sign up. Already have an account? Just log in — you'll be added automatically.</p>
    </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return json({ error: "Resend send failed", detail }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
