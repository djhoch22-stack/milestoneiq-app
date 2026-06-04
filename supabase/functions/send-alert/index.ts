// ── send-alert ────────────────────────────────────────────────────────────────
// Instant milestone/record email alerts. The app calls this right after a stat save
// with the program's CURRENT alerts. This function dedups against the sent_alerts
// ledger and, for any NEW crossing, emails the program's coaches + the school's
// admins (AD) via Resend, then records what it sent so each alert goes out once.
//
// Deploy:  supabase functions deploy send-alert --no-verify-jwt
//   Verify JWT MUST be OFF — the browser CORS preflight (OPTIONS) carries no JWT,
//   so leaving it on returns "Load failed" (same gotcha as delete/invite).
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  (required)
//   RESEND_FROM     (optional; defaults to Resend's shared onboarding sender, which
//                    only delivers to your own Resend account email until you verify
//                    a sending domain). Example once verified: "MilestoneIQ <alerts@yourdomain.com>"
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

type Alert = {
  athlete_id: string; athlete_name: string; stat_name: string;
  kind: string; current: number; target: number; holder_name?: string | null;
};

const n = (v: number) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));

function lineFor(a: Alert): string {
  const who = a.athlete_name || "An athlete";
  const stat = (a.stat_name || "").toLowerCase();
  switch (a.kind) {
    case "record_broken":
      return `🏆 <b>${who}</b> broke the ${stat} record — now at ${n(a.current)}${a.holder_name ? ` (past ${a.holder_name}'s ${n(a.target)})` : ` (was ${n(a.target)})`}.`;
    case "milestone_hit":
      return `🎉 <b>${who}</b> reached the ${n(a.target)} career ${stat} milestone (${n(a.current)}).`;
    case "near_record":
      return `📈 <b>${who}</b> is closing in on the ${stat} record — ${n(a.current)} of ${n(a.target)}${a.holder_name ? ` (${a.holder_name})` : ""}.`;
    case "near_milestone":
      return `📈 <b>${who}</b> is approaching ${n(a.target)} career ${stat} — now at ${n(a.current)}.`;
    default:
      return `<b>${who}</b>: ${stat} ${n(a.current)} / ${n(a.target)}.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { programId, alerts } = await req.json();
    if (!programId || !Array.isArray(alerts) || alerts.length === 0)
      return json({ error: "programId and a non-empty alerts array are required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") || "MilestoneIQ <onboarding@resend.dev>";
    if (!resendKey) return json({ error: "RESEND_API_KEY is not set" }, 500);

    // Identify the caller from their JWT (sent by the app even with Verify JWT off).
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) return json({ error: "not authenticated" }, 401);

    const admin = createClient(url, serviceKey);

    // Resolve the program + its school, and authorize: caller must belong to that school.
    const { data: prog } = await admin
      .from("programs").select("id, name, org_id").eq("id", programId).single();
    if (!prog) return json({ error: "program not found" }, 404);
    const { data: membership } = await admin
      .from("org_members").select("role").eq("org_id", prog.org_id).eq("user_id", user.id).maybeSingle();
    if (!membership) return json({ error: "not a member of this school" }, 403);

    // TEST MODE: if RESEND_TEST_TO is set, send ONLY to that address (your own inbox) and
    // skip dedup/recording. Lets you verify delivery in Resend's sandbox before a domain is
    // verified. Remove this secret (and set RESEND_FROM to a verified domain) to go live.
    const testTo = (Deno.env.get("RESEND_TEST_TO") || "").trim();
    const isTest = !!testTo;

    // Dedup: drop alerts already emailed for this program (kind is part of the key, so
    // "broke record" still sends after an earlier "approaching record"). Skipped in test
    // mode so you can re-send to yourself freely.
    let fresh: Alert[] = alerts as Alert[];
    if (!isTest) {
      const { data: seenRows } = await admin
        .from("sent_alerts").select("athlete_id, stat_name, kind, target").eq("program_id", programId);
      const seen = new Set(
        (seenRows || []).map((r: any) => `${r.athlete_id}|${r.stat_name}|${r.kind}|${Number(r.target)}`)
      );
      fresh = (alerts as Alert[]).filter(
        (a) => !seen.has(`${a.athlete_id}|${a.stat_name}|${a.kind}|${Number(a.target)}`)
      );
      if (fresh.length === 0) return json({ sent: 0, reason: "all alerts already sent" });
    }

    // Recipients: test mode → only your own address; production → program coaches + admins (AD).
    let emails: string[];
    if (isTest) {
      emails = [testTo];
    } else {
      const { data: coaches } = await admin
        .from("program_coaches").select("user_id").eq("program_id", programId);
      const { data: admins } = await admin
        .from("org_members").select("user_id").eq("org_id", prog.org_id).eq("role", "admin");
      const ids = [...new Set([...(coaches || []), ...(admins || [])].map((r: any) => r.user_id))];
      if (ids.length === 0) return json({ sent: 0, reason: "no recipients yet" });
      const { data: profs } = await admin.from("profiles").select("email").in("id", ids);
      emails = [...new Set((profs || []).map((p: any) => p.email).filter(Boolean))];
      if (emails.length === 0) return json({ sent: 0, reason: "no recipient emails" });
    }

    // Compose one digest email for all the new crossings.
    const anyBig = fresh.some((a) => a.kind === "record_broken" || a.kind === "milestone_hit");
    const subject = `${anyBig ? "🏆" : "📈"} ${prog.name}: ${fresh.length === 1 ? "1 alert" : fresh.length + " alerts"}`;
    const items = fresh.map((a) => `<li style="margin:6px 0;line-height:1.5">${lineFor(a)}</li>`).join("");
    const html = `<div style="font-family:Georgia,serif;color:#111;max-width:560px">
      <h2 style="margin:0 0 4px">${anyBig ? "🏆 Milestone reached!" : "📈 Heads up — a record is within reach"}</h2>
      <p style="margin:0 0 14px;color:#6b7280;font-size:14px">${prog.name}</p>
      <ul style="padding-left:18px;margin:0">${items}</ul>
      <p style="margin:18px 0 0;color:#9ca3af;font-size:12px">You're receiving this as a coach or athletic director on MilestoneIQ. Alerts also appear in-app on the Alerts tab.</p>
    </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: emails, subject, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return json({ error: "Resend send failed", detail }, 502);
    }

    // Record what we sent so it never re-emails (only after a successful real send; skipped
    // in test mode so going live later still emails the real recipients).
    if (!isTest) {
      const rows = fresh.map((a) => ({
        program_id: programId, athlete_id: String(a.athlete_id),
        stat_name: a.stat_name, kind: a.kind, target: a.target,
      }));
      await admin.from("sent_alerts").upsert(rows, {
        onConflict: "program_id,athlete_id,stat_name,kind,target", ignoreDuplicates: true,
      });
    }

    return json({ sent: fresh.length, recipients: emails.length, test: isTest || undefined });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
