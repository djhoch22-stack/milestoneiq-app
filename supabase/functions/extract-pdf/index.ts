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
//   Model: claude-sonnet-4-6 (fast — fits the edge-function time limit on big multi-table sheets).
//   For max accuracy on messy sheets, switch to "claude-opus-4-8" + thinking:{type:"adaptive"} below.
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
- SKIP "Season Totals"/team-total rows. SKIP every rate/average/percentage column (Y/G, C/G, Avg, C%, T/G, S/G, Int/G, TD/G, QB Rate, "100+", "In 20", "TB", "FC") — keep cumulative counting totals, PLUS the eight "Lng" (longest) values mapped below as "Longest …" (single-game records, not totals; keep ONLY those eight "Longest …" values).
- Numeric values only. "number" = jersey number (integer) if shown, else null. Unknown grad year → ${new Date().getFullYear() + 2}.
- ROSTER pages: some files are a team ROSTER (jersey #, FULL name, position, grade — NO game stats). Still return EVERY player on it: their FULL name exactly as written, their "number", "position", and an empty "stats":{}. The app uses these full names to replace abbreviated names ("T. Steeves") on the stat sheets — so ALWAYS extract a roster even though it has no stats.

FOOTBALL — use these EXACT stat names (the coach's set), mapping the column within each section:
- Games Played (GP). Wins: read the team's OVERALL win total from the "Overall W-L" line near the top of the stat sheet (e.g. "Overall 4-5" → 4) and set "Wins" to that number for EVERY athlete on the sheet — there is no per-player wins column, so never leave Wins blank or guess.
- Passing section: the COMPLETIONS column (header is "C", "Cmp", or "Comp"; if completions are shown combined as "Comp/Att" or "C-A" like 18/30, take the FIRST number as completions and the second as Passing Attempts)→"Completions", Att→"Passing Attempts", Yds→"Passing Yards", TD→"Passing TDs", Lng→"Longest Completion" (ignore the passing Int column)
- Rushing section: Car→"Rushes", Yds→"Rushing Yards", TD→"Rushing TDs", Lng→"Longest Rush"
- Receiving section: Rec→"Receptions", Yds→"Receiving Yards", TD→"Receiving TDs", Lng→"Longest Reception"
- Total Yards section: Total→"Total Yards"
- Tackles section: "Tot Tckls"→"Tackles", Solo→"Solo Tackles", Asst→"Assist Tackles" (ignore TFL)
- Sacks section: Sacks→"Sacks" (a decimal like 1.0/3.0), the sack yards-lost column Ydl→"Sack Yards Lost", Hurs→"Hurries"
- Defensive section: Int→"Interceptions", the interception-return-yards column ("IR" or "Int Yds")→"Interception Return Yards", PD→"Pass Break Ups", "Fmb Rec"→"Fumble Recoveries", Caus→"Forced Fumbles", "Blk Pnts"→"Blocked Punts", "Blk FGs"→"Blocked Field Goals", the safeties column ("Sfty"/"Saf"/"Safety")→"Safeties" (ignore FR Yds)
- "PATs and Field Goals" section: PAT→"PAT Mades", the Att right after PAT→"PAT Attempts", FG→"Field Goals Made", the Att right after FG→"Field Goals Attempts", the FG Lng→"Longest Field Goal"
- "Punts" section: P→"Punts", Yds→"Punt Yards", Lng→"Longest Punt"
- "Kickoffs" section: KO→"Kick Offs", Yds→"Kick Off Yards", Lng→"Longest Kick Off"
- "Kickoff and Punt Returns" section: "KO Rets"→"Kick Off Returns", the Yds right after KO Rets→"Kick Off Return Yards", any TD there→"Kick Off Return TDs"; "P Rets"→"Punt Returns", the Yds right after P Rets→"Punt Return Yards", any TD there→"Punt Return TDs", the KO Ret Lng→"Longest Kick Off Return", the P Ret Lng→"Longest Punt Return" (ignore Avg/FC and the combined "KR Yds" total)
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
        model: "claude-sonnet-4-6", // FAST — a big multi-table sheet finishes well within the edge-function
                                     // time limit. Opus timed out, then (with streaming) over-thought until
                                     // the JSON answer got truncated and stats came back empty.
        max_tokens: 32000,
        // Thinking OFF: the per-column mapping below is fully explicit, so no reasoning phase is needed —
        // the whole budget + time goes to the JSON answer. Re-enable adaptive thinking (prefer opus) only
        // if column mapping ever regresses.
        thinking: { type: "disabled" },
        stream: true, // STREAM: keeps the upstream connection alive so a long read can't hit a response
                      // timeout (which had surfaced as "extract failed" and let a roster-only import slip in).
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    if (!r.ok || !r.body) {
      const errTxt = await r.text().catch(() => "");
      let errMsg = "Anthropic API error";
      try { errMsg = JSON.parse(errTxt)?.error?.message || errMsg; } catch { if (errTxt) errMsg = errTxt.slice(0, 300); }
      return json({ error: errMsg }, 502);
    }
    // Accumulate the streamed text deltas (Anthropic server-sent events). We only keep "text_delta"
    // (the JSON answer) — thinking deltas are ignored. Buffering by line tolerates chunk splits.
    let text = "", stopReason = "";
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") text += evt.delta.text;
          else if (evt.type === "message_delta" && evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
          else if (evt.type === "error") return json({ error: evt.error?.message || "stream error" }, 502);
        } catch { /* ignore keep-alive / non-JSON lines */ }
      }
    }
    let parsed: { athletes?: any[] };
    try {
      let t = text.replace(/```json|```/g, "").trim();
      const a = t.indexOf("{"), b = t.lastIndexOf("}"); // tolerate any preamble/notes around the JSON
      if (a >= 0 && b > a) t = t.slice(a, b + 1);
      parsed = JSON.parse(t);
    } catch {
      return json({ error: `Could not parse the model's output as JSON (stop_reason: ${stopReason || "?"}). Output started: ${text.slice(0, 300)}` }, 502);
    }
    const athletes = parsed.athletes || [];
    // A clean finish with players but no stats is a ROSTER (jersey #, full name, no game stats) — those full
    // names are what de-abbreviate the stat sheets, so we MUST return them, not reject them. Only error when
    // the model ran OUT OF TOKENS mid-output (truncated), which is a real failure that would drop real stats.
    const withStats = athletes.filter((a: any) => a && a.stats && Object.keys(a.stats).length > 0).length;
    if (athletes.length > 0 && withStats === 0 && stopReason === "max_tokens")
      return json({ error: `output was truncated (ran out of tokens) before any stats were read — try again. Output started: ${text.slice(0, 300)}` }, 502);
    return json({ athletes, noStats: withStats === 0 });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
