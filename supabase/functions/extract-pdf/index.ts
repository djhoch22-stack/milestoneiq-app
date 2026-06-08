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
- SKIP "Season Totals"/team-total rows. SKIP every rate/average/percentage column (Y/G, C/G, Avg, C%, T/G, S/G, Int/G, TD/G, QB Rate, "100+", "In 20", "TB", "FC") — keep cumulative counting totals, PLUS the seven "Lng" (longest) values mapped below as "Longest …" (single-game records, not totals; keep ONLY those seven "Longest …" values).
- Numeric values only. "number" = jersey number (integer) if shown, else null. Unknown grad year → ${new Date().getFullYear() + 2}.
- ROSTER pages: some files are a team ROSTER (jersey #, FULL name, position, grade — NO game stats). Still return EVERY player on it: their FULL name exactly as written, their "number", "position", and an empty "stats":{}. The app uses these full names to replace abbreviated names ("T. Steeves") on the stat sheets — so ALWAYS extract a roster even though it has no stats.

FOOTBALL — use these EXACT stat names (the coach's set), mapping the column within each section:
- Games Played (GP). Wins: read the team's OVERALL win total from the "Overall W-L" line near the top of the stat sheet (e.g. "Overall 4-5" → 4) and set "Wins" to that number for EVERY athlete on the sheet — there is no per-player wins column, so never leave Wins blank or guess.
- Passing section: C→"Completetions", Att→"Passing Attempts", Yds→"Passing Yards", TD→"Passing TDs", Lng→"Longest Completion" (ignore the passing Int column)
- Rushing section: Car→"Rushes", Yds→"Rushing Yards", TD→"Rushing TDs", Lng→"Longest Rush"
- Receiving section: Rec→"Receptions", Yds→"Receiving Yards", TD→"Receiving TDs", Lng→"Longest Reception"
- Total Yards section: Total→"Total Yards"
- Tackles section: "Tot Tckls"→"Tackles" (ignore Solo, Asst, TFL)
- Sacks section: Sacks→"Sacks" (a decimal like 1.0/3.0; ignore Ydl/Hurs)
- Defensive section: Int→"Interceptions", PD→"Pass Break Ups", "Fmb Rec"→"Fumble Recoveries", Caus→"Forced Fumbles" (ignore Int Yds, FR Yds, Blk Pnts, Blk FGs)
- "PATs and Field Goals" section: PAT→"PAT Mades", the Att right after PAT→"PAT Attempts", FG→"Field Goals Made", the Att right after FG→"Field Goals Attempts", the FG Lng→"Longest Field Goal"
- "Punts" section: P→"Punts", Yds→"Punt Yards", Lng→"Longest Punt"
- "Kickoffs" section: KO→"Kick Offs", Yds→"Kick Off Yards"
- "Kickoff and Punt Returns" section: "KO Rets"→"Kick Off Returns", the Yds right after KO Rets→"Kick Off Return Yards", any TD there→"Kick Off Return TDs"; "P Rets"→"Punt Returns", the Yds right after P Rets→"Punt Return Yards", any TD there→"Punt Return TDs", the KO Ret Lng→"Longest Kick Return", the P Ret Lng→"Longest Punt Return" (ignore Avg/FC and the combined "KR Yds" total)
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
      let t = text.replace(/```json|```/g, "").trim();
      const a = t.indexOf("{"), b = t.lastIndexOf("}"); // tolerate any preamble/notes around the JSON
      if (a >= 0 && b > a) t = t.slice(a, b + 1);
      parsed = JSON.parse(t);
    } catch {
      return json({ error: "Could not parse the model's output as JSON" }, 502);
    }
    return json({ athletes: parsed.athletes || [] });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
