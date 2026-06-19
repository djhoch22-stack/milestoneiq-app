// ── support-chat ────────────────────────────────────────────────────────────
// In-app AI help assistant for coaches & ADs. A browser can't call the Anthropic
// API directly (key exposure + CORS), so this function holds the key and answers
// grounded RaftersIQ "how do I…" questions. Logged-in users only (it spends the key).
//
// Deploy:  supabase functions deploy support-chat --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate inside via getUser).
//   Secret required: ANTHROPIC_API_KEY (the same key extract-pdf uses).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// MODEL: project default is Opus 4.8. A grounded support bot is simple + latency-sensitive —
// for a high-volume help bot, "claude-haiku-4-5" is ~5x cheaper/faster. Change this one line to switch.
const MODEL = "claude-opus-4-8";

// The assistant's knowledge of RaftersIQ. Keep this ACCURATE to how the app actually works —
// it's the only thing keeping answers from drifting. Update it when features change.
const SYSTEM = `You are the in-app support assistant for **RaftersIQ**, record-book software for high-school athletic programs. You help coaches and athletic directors USE the app.

STYLE: warm, encouraging, and brief. Answer in a few sentences or short numbered steps — never an essay. Use the EXACT button and tab names shown below. Only answer questions about RaftersIQ and using it; if asked anything unrelated, politely steer back. If it's an account/billing problem you can't resolve, or you're unsure, tell them to email support@raftersiq.com.

WHAT RAFTERSIQ IS: it tracks every athlete's career & season stats, school records, milestones, and an auto-built Hall of Fame for athletes and coaches — across every sport. Each program also gets a shareable public record-book page.

IMPORTING STATS (the most common question) — always ONE season at a time, from the **All-Time** tab → **📥 Import season stats**:
- MaxPreps (any sport): open the season → Roster → Print → Save as PDF; then Stats → Print → Save as PDF; upload BOTH the roster and stats PDFs together (the roster supplies full names, so "J. Smith" becomes "John Smith").
- Hudl (basketball, soccer, volleyball): Reports → Stats → set Group By: Athlete and Stat Type: Totals (NOT Averages — averages are calculated for you) → pick the season → Export → upload the CSV. Note: Hudl player exports don't include goalie stats.
- GameChanger (baseball, softball): open the season → Stats → Export Stats → upload the CSV.
- Imports MERGE — re-uploading updates players and never erases anything. If a name shows as initials only, re-import that season WITH the roster PDF.
- Prefer typing by hand? Use "Download template" (Excel) on the import bar.

TEAM WINS: stat files don't include team W-L. Add each season's record on the **Seasons** tab and every player who played that season is automatically credited with the team's wins. Order doesn't matter — do it before or after importing.

RECORDS, AVERAGES & MILESTONES: school records compute automatically per stat (career and single-season), along with per-game averages, shooting % (basketball), and shot accuracy (soccer). Set custom milestones and the app emails alerts when an athlete nears or breaks a record or milestone (see the Alerts and Milestones tabs; the ⚙️ Notification settings control auto-email). The ⚙️ Record minimums editor on the Records tab tunes how many attempts qualify a rate record.

HALL OF FAME: auto-scored candidacy for athletes and coaches (cross-sport, factoring all-league/all-state and Coach of the Year honors). Induct people from the HOF tab and set the induction year. The Hall of Fame is included on the Program+ and School+ plans.

PLAYERS & SEASONS: use "+ Add player" (on the All-Time or Athletes tab). Open any player → Edit to rename, or "🔗 Merge players" to combine duplicates (you choose the name to keep). Add or edit a player's season-by-season stats inside their profile.

PUBLIC PAGE: each program you mark public gets a clean, shareable record book and Hall of Fame at raftersiq.com (plus a school hub). You control which programs are public.

ADMIN — USERS, BILLING, REFERRALS (athletic directors / admins): Settings → 👥 Users & access to invite coaches and set roles; Settings → 💳 Subscription & billing to change plans (switches happen in place — no second charge, no double-billing) or update your card. Settings → 🎁 Refer a school — the referrer gets a free month and the new school a 14-day trial. Plans: Program $15/mo, Program+ $39/mo, School $149/mo, School+ $299/mo (save ~17% annually), 7-day free trial.

Keep it short, specific, and friendly.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set on this function" }, 500);

    // Logged-in users only — this spends the Anthropic key.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Please sign in to use chat." }, 401);

    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return json({ error: "no messages" }, 400);
    // Sanitize + bound: keep the last 12 turns, cap each message, only valid roles/strings.
    const clean = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!clean.length || clean[clean.length - 1].role !== "user")
      return json({ error: "the last message must be from the user" }, 400);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: "disabled" }, // snappy help replies; the system prompt enforces concise answers
        system: SYSTEM,
        messages: clean,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      let msg = "AI service error";
      try { msg = JSON.parse(t)?.error?.message || msg; } catch { if (t) msg = t.slice(0, 300); }
      return json({ error: msg }, 502);
    }
    const data = await r.json();
    const reply = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    return json({ reply: reply || "Sorry, I didn't catch that — could you rephrase?" });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
