// ── extract-pdf ───────────────────────────────────────────────────────────────
// Server-side proxy for AI PDF stat extraction. A browser CANNOT call the Anthropic
// API directly (the key would be exposed + CORS blocks it), so this function holds
// the key and makes the call. Takes ONE base64 PDF and returns the athletes/stats
// it finds; the client loops over multiple files and merges (keeps each call short
// so the edge function never times out).
//
// Deploy:  supabase functions deploy extract-pdf --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate inside).
//   Secret required: ANTHROPIC_API_KEY (an Anthropic API key — console.anthropic.com).
//   Model: claude-opus-4-8. To cut cost, swap to "claude-haiku-4-5" or
//   "claude-sonnet-4-6" below (less accurate on messy stat sheets).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = `You are extracting per-athlete season stats from a sports stat sheet (often a MaxPreps printout). Return ONLY valid JSON, no markdown, no commentary:
{"athletes":[{"name":"Full Name","position":"Position or empty string","gradYear":2025,"number":12,"stats":{"Stat Name":numericValue}}]}

CRITICAL:
- A document may contain MANY stat tables (especially football: Passing, Rushing, Receiving, Total Yards, Tackles, Sacks, Defensive, Returns, Kicking). The SAME column header ("Yds","TD","Att","Int","Yards") means DIFFERENT stats in different tables — you MUST qualify each value by the section it came from. Never merge two different "Yds" columns into one stat.
- ONE object per athlete. A player appears in several tables; COMBINE all of their stats into that single object, matching the same athlete across tables by jersey number AND last name (e.g. "3 T. Steeves" in every table is the same player).
- SKIP "Season Totals"/team-total rows. SKIP every rate/average/percentage column (Y/G, C/G, Avg, C%, T/G, S/G, Int/G, TD/G, QB Rate, "100+", "Lng", "In 20", "TB", "FC") — keep only cumulative counting totals.
- Numeric values only. "number" = jersey number (integer) if shown, else null. Unknown grad year → ${new Date().getFullYear() + 2}.

FOOTBALL — use these EXACT stat names, mapping the column within each section:
- Games Played (GP)
- Passing section: Yds→"Passing Yards", C→"Pass Completions", Att→"Pass Attempts", TD→"Passing TDs", Int→"Interceptions Thrown"
- Rushing section: Yds→"Rushing Yards", Car→"Rushing Attempts", TD→"Rushing TDs"
- Receiving section: Yds→"Receiving Yards", Rec→"Receptions", TD→"Receiving TDs"
- Total Yards section: Total→"Total Yards"
- Tackles section: "Tot Tckls"→"Combined Tackles", Solo→"Solo Tackles", Asst→"Assisted Tackles", TFL→"Tackles for Loss"
- Sacks section: Sacks→"Sacks" (it is a decimal like 1.0/3.0; ignore Ydl/Hurs)
- Defensive section: Int→"Interceptions", PD→"Passes Defended", "Fmb Rec"→"Fumbles Recovered", Caus→"Forced Fumbles" (ignore Int Yds, FR Yds, Blk Pnts, Blk FGs)
- "Kickoff and Punt Returns" section: "KO Rets"→"Kick Returns", the Yds column right after KO Rets→"Kick Return Yards", "P Rets"→"Punt Returns", the Yds column right after P Rets→"Punt Return Yards" (ignore Avg/Lng/FC and the combined "KR Yds" total)
- Also include "Total TDs" = Rushing TDs + Receiving TDs (do NOT count passing TDs).

For non-football sports (basketball, soccer, etc.) there is usually one table — use the exact stat names shown.
Include every athlete and every stat you find. Omit zero/blank stats.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set on this function" }, 500);

    // Only logged-in users may call this (it spends the Anthropic key).
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "not authenticated" }, 401);

    const { pdf } = await req.json();
    if (!pdf) return json({ error: "no pdf provided" }, 400);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 32000,
        thinking: { type: "adaptive" }, // multi-table stat sheets need real reasoning to map columns correctly
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    const data = await r.json();
    if (data.error) return json({ error: data.error.message || "Anthropic API error" }, 502);
    const text = (data.content || []).map((c: { text?: string }) => c.text || "").join("");
    let parsed: { athletes?: unknown[] };
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Could not parse the model's output as JSON" }, 502);
    }
    return json({ athletes: parsed.athletes || [] });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
