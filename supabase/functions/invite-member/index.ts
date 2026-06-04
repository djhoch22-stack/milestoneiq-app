// ── invite-member ─────────────────────────────────────────────────────────────
// Sends a Supabase invite email that, on signup, attaches the invitee to a school
// (organization) with a role (admin = AD/see-all, coach = see-own). The signup
// trigger handle_new_user reads invite_org_id / invite_role from user metadata.
//
// Deploy:  supabase functions deploy invite-member
// (Uses the SUPABASE_SERVICE_ROLE_KEY that Supabase injects automatically.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, org_id, role } = await req.json();
    if (!email || !org_id) return json({ error: "email and org_id are required" }, 400);
    const inviteRole = role === "admin" ? "admin" : "coach";

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller from their JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) return json({ error: "not authenticated" }, 401);

    const admin = createClient(url, serviceKey);

    // Authorize: admin invites require caller = school creator OR existing admin;
    // coach invites require an existing admin.
    const { data: org } = await admin
      .from("organizations").select("created_by").eq("id", org_id).single();
    const { data: membership } = await admin
      .from("org_members").select("role")
      .eq("org_id", org_id).eq("user_id", user.id).maybeSingle();
    const isCreator = org?.created_by === user.id;
    const isAdmin = membership?.role === "admin";
    const allowed = inviteRole === "admin" ? (isCreator || isAdmin) : isAdmin;
    if (!allowed) return json({ error: "not allowed to invite for this school" }, 403);

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invite_org_id: org_id, invite_role: inviteRole },
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, invited: data?.user?.email || email });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
