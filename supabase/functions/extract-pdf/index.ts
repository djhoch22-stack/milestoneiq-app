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

FLAG FOOTBALL (girls flag football) — read Passing/Rushing/Receiving exactly like FOOTBALL above, PLUS:
- The "Flag Pulls" table IS the tackles table: Solo→"Solo Tackles", Asst→"Assist Tackles", "Tot FPs"→"Tackles", "FP Loss"→"Flag Pull Yards Lost" (the yards lost, a decimal column — NOT a count) (the app renames tackles→flag pulls). Keep the Sacks table's Sacks→"Sacks".
- The "Scoring" table: "Try Pts"→"Try Points" (flag football's extra-point conversion). IGNORE that table's other columns (Tot Pts, PAT, XP Att, FG, FG Att, S, and any TD/P-G).
- There are NO kickoffs, kickoff returns, or field goals to keep — skip them.

BASEBALL — a MaxPreps printout has SEVERAL sections in this order: Batting (two tables), Baserunning, Fielding, Pitching (three tables). The SAME player (match by jersey # + last name) appears in many tables — COMBINE every table into that one player object. Map ONLY the columns below to these EXACT stat names; IGNORE all rate/derived columns (Avg, OBP, SLG, OPS, FP, ERA, W%, OBA, CS%) and any counting column not listed here (GS in batting, K in batting, FC, LOB, SBA, E, PB, CS, L, WP, BK):
- Games Played (GP). Wins: read the team's OVERALL win total from the "Overall W-L" line near the top of the sheet (e.g. "Overall 20-10" → 20) and set "Wins" to that number for EVERY athlete — there is no per-player team-wins column, so never leave it blank or guess.
- BATTING tables: PA→"Plate Appearances", AB→"At Bats", R→"Runs", H→"Hits", RBI→"RBIs", 2B→"Doubles", 3B→"Triples", HR→"Home Runs", SF→"Sacrifice Fly", "SH/B"→"Sacrifice Bunt", BB→"Walk (BB)", HBP→"Hit By Pitch", ROE→"Reached on Error"
- BASERUNNING table: SB→"Stolen Base" (take SB from the BASERUNNING table ONLY — the SB columns in the Fielding/Pitching tables are stolen-bases-ALLOWED; ignore those)
- FIELDING table: TC→"Total Chances", PO→"Put Outs", A→"Assists", DP→"Double Plays", TP→"Triple Plays"
- PITCHING tables: W→"Pitcher Wins", APP→"Pitcher Appearances", GS→"Pitcher Games Started", CG→"Pitcher Complete Games", "SO"→"Pitcher Shut Outs", SV→"Pitcher Saves", NH→"No Hitters", PG→"Perfect Games", IP→"Innings Pitched" (keep the decimal exactly as printed — 36.2 means 36⅔ innings), ER→"Earned Runs", "K"→"Pitcher Strikeouts", BF→"Batters Faced", AB→"At Bats Pitcher", "#P"→"# of Pitches"
- SAME-HEADER WARNING — qualify every value by the table it came from: "AB" in a Batting table = "At Bats", but "AB" in a Pitching table = "At Bats Pitcher". In a PITCHING table the H, R, BB, 2B, 3B, HR, HBP, SF, SH/B columns are what the pitcher ALLOWED — IGNORE them (only the Batting versions are kept) — EXCEPT ER, which you DO keep as "Earned Runs" (it computes ERA). In pitching, "SO" means shutouts (→"Pitcher Shut Outs"), NOT strikeouts — pitcher strikeouts are the "K" column. Take "PO" only from the Fielding table (the pitching "PO" is pickoffs — ignore it).
- A player's name may carry a grade like "G. Gunnett (So)" — use the name WITHOUT the grade ("G. Gunnett"); if a season year is shown (e.g. "2025-26") set gradYear from the grade (Sr = the season's ending year, Jr +1, So +2, Fr +3).

BASKETBALL — a MaxPreps printout has SEVERAL sections in this order: "Game Stats", "Shooting", a 3PT/Free-Throw table, "Totals", and "Misc Totals". The SAME player (match by jersey # + last name) appears in every section — COMBINE them into one object. Read TOTALS only — never per-game or rate columns.
- ⛔ IGNORE the ENTIRE "Game Stats" section. Every column in it (MPG, PPG, DEFR, OFFR, RPG, APG, SPG, BPG, TPG, PFPG) is a PER-GAME AVERAGE, not a total — using it produces wrong decimals like 0.6. Pull stats ONLY from the "Shooting", 3PT/FT, and "Totals" sections.
- Games Played (GP). Wins: read the team's OVERALL win total from the "Overall W-L" line near the top (e.g. "Overall 17-8" → 17) and set "Wins" to that number for EVERY athlete.
- "Totals" section (header GP Min Pts OReb DReb Reb Ast Stl Blk TO PF): Pts→"Points", OReb→"Offensive Rebounds", DReb→"Defensive Rebounds", Reb→"Total Rebounds", Ast→"Assists", Stl→"Steals", Blk→"Blocks" (ignore Min, TO, PF).
- "Shooting" section (header GP Min Pts FGM FGA FG% PPS AFG%): FGM→"Field Goals Made", FGA→"Field Goals Attempted" (ignore FG%, PPS, AFG%, Min).
- 3PT/Free-Throw table (header GP Min Pts 3PM 3PA 3P% FTM FTA FT% 2FGM 2FGA 2FG%): 3PM→"Three Pointers Made", 3PA→"Three Pointers Attempted", FTM→"Free Throws Made", FTA→"Free Throws Attempted". IGNORE 2FGM/2FGA/2FG% (those are 2-pointers only — TOTAL field goals are the FGM/FGA from the Shooting section, NOT 2FGM+3PM).
- IGNORE every percentage, per-game, and ratio column anywhere (FG%, 3P%, FT%, 2FG%, PPS, AFG%, MPG, PPG, RPG, APG, SPG, BPG, and the Misc-Totals ratios like Ast:TO). Counting TOTALS only — a "Made" total can NEVER exceed its "Attempted" total.
- SKIP the "Season Totals" team row at the top of each section. A name may carry a grade like "J. Beijer (Jr)" — use the name without the grade; if a season year is shown set gradYear from the grade (Sr = season's ending year, Jr +1, So +2, Fr +3).

For other sports (soccer, volleyball, etc.) there is usually one table — use the exact stat names shown.
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

    const { pdf, image, mediaType } = await req.json();
    if (!pdf && !image) return json({ error: "no file provided" }, 400);
    // A photo of a (often old / handwritten) stat sheet arrives as an image; a digital export as a PDF.
    const fileBlock = image
      ? { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } };

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
            fileBlock,
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
