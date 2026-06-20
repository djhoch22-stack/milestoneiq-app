// ── support-chat ────────────────────────────────────────────────────────────
// In-app AI help assistant for coaches & ADs. A browser can't call the Anthropic
// API directly (key exposure + CORS), so this function holds the key and answers
// grounded RaftersIQ "how do I…" questions. Logged-in users only (it spends the key).
//
// It also captures FEEDBACK: if the user shares a suggestion, bug, or idea, the model
// calls the record_feedback tool → we email the founder (Resend) + best-effort log to a
// `feedback` table → the model thanks the user. So product feedback flows straight to you.
//
// Deploy:  supabase functions deploy support-chat --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate inside via getUser).
//   Secrets: ANTHROPIC_API_KEY (required). RESEND_API_KEY + RESEND_FROM (for feedback email — already
//   set, shared with send-alert). Optional FEEDBACK_TO (where feedback emails go; defaults below).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// MODEL: a grounded support bot is simple + latency-sensitive, so Haiku 4.5 (fast + cheap) is the right
// fit. Switch to "claude-opus-4-8" or "claude-sonnet-4-6" here if you want more horsepower.
const MODEL = "claude-haiku-4-5";
const FEEDBACK_TO = Deno.env.get("FEEDBACK_TO") || "support@raftersiq.com";

const SYSTEM = `You are the in-app support assistant for **RaftersIQ**, record-book software for high-school athletic programs. You help coaches and athletic directors USE the app.

STYLE: warm, encouraging, and brief. Answer in a few sentences or short numbered steps — never an essay. Use the EXACT button and tab names below. Only answer questions about RaftersIQ; if asked something unrelated, politely steer back. If it's an account/billing problem you can't resolve, or you're unsure, tell them to email support@raftersiq.com.

FEEDBACK — IMPORTANT: if the user shares a suggestion, feature request, complaint, frustration, praise, or a bug report (even casually, e.g. "it'd be great if…", "X is broken", "I wish it could…"), call the record_feedback tool to send it to the RaftersIQ team, then thank them warmly and let them know it was passed along. Still answer any actual question in the same message. Don't call the tool for ordinary how-to questions.

WHAT RAFTERSIQ IS: it tracks every athlete's career & season stats, school records, milestones, and an auto-built Hall of Fame for athletes and coaches — across every sport. Each program also gets a shareable public record-book page.

IMPORTING STATS (the most common question) — always ONE season at a time, from the **All-Time** tab → **📥 Import season stats**:
- MaxPreps (any sport): open the season → Roster → Print → Save as PDF; then Stats → Print → Save as PDF; upload BOTH the roster and stats PDFs together (the roster supplies full names, so "J. Smith" becomes "John Smith").
- Hudl (basketball, soccer, volleyball): Reports → Stats → set Group By: Athlete and Stat Type: Totals (NOT Averages — averages are calculated for you) → pick the season → Export → upload the CSV. Note: Hudl player exports don't include goalie stats.
- GameChanger (baseball, softball): open the season → Stats → Export Stats → upload the CSV.
- Imports MERGE — re-uploading updates players and never erases anything. If a name shows as initials only, re-import that season WITH the roster PDF.
- Prefer typing by hand? Use "Download template" (Excel) on the import bar.

TEAM WINS: stat files don't include team W-L. Add each season's record on the **Seasons** tab and every player who played that season is automatically credited with the team's wins. Order doesn't matter — do it before or after importing.

RECORDS, AVERAGES & MILESTONES: school records compute automatically per stat (career and single-season), along with per-game averages, shooting % (basketball), and shot accuracy (soccer). Set custom milestones and the app emails alerts when an athlete nears or breaks one (Alerts and Milestones tabs; ⚙️ Notification settings control auto-email). The ⚙️ Record minimums editor on the Records tab tunes how many attempts qualify a rate record.

HALL OF FAME: auto-scored candidacy for athletes and coaches (cross-sport, factoring all-league/all-state and Coach of the Year honors). Induct people from the HOF tab and set the induction year. Included on the Program+ and School+ plans.

PLAYERS & SEASONS: use "+ Add player" (All-Time or Athletes tab). Open any player → Edit to rename, or "🔗 Merge players" to combine duplicates (you choose the name to keep). Add/edit season-by-season stats inside a player's profile.

PUBLIC PAGE: each program you mark public gets a clean, shareable record book and Hall of Fame at raftersiq.com (plus a school hub). You control which programs are public.

ADMIN — USERS, BILLING, REFERRALS: Settings → 👥 Users & access to invite coaches and set roles; Settings → 💳 Subscription & billing to change plans (switches happen in place — no double-charge) or update your card; Settings → 🎁 Refer a school (referrer gets a free month, the new school a 14-day trial). Plans: Program $15/mo, Program+ $39/mo, School $149/mo, School+ $299/mo (save ~17% annually), 7-day free trial.

Keep it short, specific, and friendly.`;

const TOOLS = [{
  name: "record_feedback",
  description: "Send the user's product feedback to the RaftersIQ team. Call this whenever the user expresses a feature request, suggestion, complaint, frustration, praise, or bug report — even casually. Summarize it clearly in their voice.",
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["bug", "suggestion", "praise", "other"], description: "Category of the feedback" },
      summary: { type: "string", description: "A one-line summary (max ~12 words)" },
      detail: { type: "string", description: "The user's full point, paraphrased or quoted" },
    },
    required: ["kind", "summary"],
  },
}];

const callClaude = (apiKey: string, body: unknown) =>
  fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const textOf = (data: any) => (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();

async function recordFeedback(admin: any, fb: any, user: any, orgId: string | null) {
  const kind = String(fb?.kind || "other"); const summary = String(fb?.summary || "").slice(0, 200);
  const detail = String(fb?.detail || summary).slice(0, 4000);
  console.log("record_feedback fired:", kind, "-", summary);
  // Best-effort log (table optional — see supabase/add_feedback.sql). Never blocks the email.
  try { await admin.from("feedback").insert({ org_id: orgId || null, user_id: user?.id || null, user_email: user?.email || null, kind, summary, detail, status: "new" }); }
  catch (e) { console.error("feedback insert skipped (table may not exist):", String(e)); }
  // Email the founder via Resend — mirrors the working send-alert call: `to` is an ARRAY, errors are logged.
  const key = Deno.env.get("RESEND_API_KEY"); const from = Deno.env.get("RESEND_FROM");
  if (!key || !from) { console.error("feedback email NOT sent — RESEND_API_KEY or RESEND_FROM missing on this project"); return; }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [FEEDBACK_TO],
        subject: `RaftersIQ ${kind}: ${summary}`.slice(0, 150),
        text: `New ${kind} via the in-app helper\n\nSummary: ${summary}\n\nDetail:\n${detail}\n\n— ${user?.email || "a user"}${orgId ? ` · org ${orgId}` : ""}`,
      }),
    });
    if (!resp.ok) { const d = await resp.text().catch(() => ""); console.error("feedback email FAILED:", resp.status, d.slice(0, 400)); }
    else console.log("feedback email sent to", FEEDBACK_TO);
  } catch (e) { console.error("feedback email threw:", String(e)); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set on this function" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Please sign in to use chat." }, 401);

    const { messages, orgId } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return json({ error: "no messages" }, 400);
    const clean = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!clean.length || clean[clean.length - 1].role !== "user")
      return json({ error: "the last message must be from the user" }, 400);

    const base = { model: MODEL, max_tokens: 1024, system: SYSTEM, tools: TOOLS };
    let convo: any[] = clean;
    const errReturn = async (r: Response) => {
      const t = await r.text().catch(() => ""); let msg = "AI service error";
      try { msg = JSON.parse(t)?.error?.message || msg; } catch { if (t) msg = t.slice(0, 300); }
      return json({ error: msg }, 502);
    };

    let r = await callClaude(apiKey, { ...base, messages: convo });
    if (!r.ok) return errReturn(r);
    let data = await r.json();

    // Tool-use loop: if the model files feedback, execute it and let the model reply. (Max 2 rounds.)
    for (let i = 0; i < 2; i++) {
      const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
      if (!toolUses.length) break;
      convo = [...convo, { role: "assistant", content: data.content }];
      const results = [];
      for (const tu of toolUses) {
        if (tu.name === "record_feedback") await recordFeedback(admin, tu.input, user, orgId || null);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "Sent to the RaftersIQ team. Thanks!" });
      }
      convo = [...convo, { role: "user", content: results }];
      r = await callClaude(apiKey, { ...base, messages: convo });
      if (!r.ok) return errReturn(r);
      data = await r.json();
    }

    return json({ reply: textOf(data) || "Sorry, I didn't catch that — could you rephrase?" });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
