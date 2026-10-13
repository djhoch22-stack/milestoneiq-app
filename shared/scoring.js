// ── shared/scoring.js ─────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for pure stat-derivation + scoring logic shared by BOTH
// the React app (src/) and the public SSR pages (api/). These functions were
// historically hand-copied into src/supabase_client.js + src/MilestoneIQ.jsx AND
// api/_lib.js and had to be kept in sync by hand (and had drifted). This module
// ends that. Pure functions only — no DOM, no Node/browser-only APIs — so Vite and
// Vercel can both import it (`../shared/scoring.js` from src/ and from api/).

// Baseball/softball: Singles + Total Bases are COMPUTED from the batting line (never stored, so they
// always reflect the current Hits/2B/3B/HR). Applied to every stats object as it loads — works on a
// season line or a career total since the formula is linear. Other sports pass through unchanged.
export function withDerivedStats(stats, sport) {
  if (!stats) return {};
  if (sport === "baseball" || sport === "softball") {
    if (stats["Hits"] == null) return stats; // no batting line (e.g. a pitcher-only row) → nothing to derive
    const h = Number(stats["Hits"]) || 0, d = Number(stats["Doubles"]) || 0, t = Number(stats["Triples"]) || 0, hr = Number(stats["Home Runs"]) || 0;
    return { ...stats, "Singles": Math.max(0, h - d - t - hr), "Total Bases": h + d + 2 * t + 3 * hr };
  }
  if (sport === "football" || sport === "flag_football_girls") {
    const n = (k) => Number(stats[k]) || 0;
    const out = { ...stats };
    // Points (MaxPreps "Tot Pts"): 6 × scored TDs + conversions + kicking. "Scored TDs" = the stored
    // Total TDs (the authoritative count — it includes defensive/return TDs and EXCLUDES passing TDs,
    // since the passer doesn't score), falling back to the component TD sum for rows where Total TDs
    // wasn't entered. DERIVED so it auto-covers every historical season/career and never goes stale.
    const compTD = n("Rushing TDs") + n("Receiving TDs") + n("Punt Return TDs") + n("Kick Off Return TDs");
    const scoredTD = Math.max(n("Total TDs"), compTD);
    let pts;
    if (sport === "football") {
      // 6×TD + 3×FG + 1×PAT + 2×2-pt conversion + 2×safety
      pts = 6 * scoredTD + 3 * n("Field Goals Made") + n("PAT Mades") + 2 * n("2 Point Conversions") + 2 * n("Safeties");
      // Total Yards = yards from scrimmage (Rushing + Receiving); passing is tracked separately and excluded.
      // All-Purpose Yards = scrimmage + return yards (Rushing + Receiving + Kick Off Return + Punt Return).
      // Both are DERIVED so they never go stale: a prior static APY backfill drifted after later re-imports
      // re-summed the career (career APY could fall below a player's own rushing yards). Recomputing here
      // overrides whatever APY/Total Yards is stored.
      const rush = n("Rushing Yards"), rec = n("Receiving Yards");
      if (stats["Rushing Yards"] != null || stats["Receiving Yards"] != null) out["Total Yards"] = rush + rec;
      const apy = rush + rec + n("Kick Off Return Yards") + n("Punt Return Yards");
      if (apy > 0) out["All-Purpose Yards"] = apy; else delete out["All-Purpose Yards"]; // >0 only → non-skill players stay blank
    } else {
      // Flag football: no kicking; the post-TD "try" (1 or 2 pts) is already stored AS POINTS in "Try Points".
      pts = 6 * scoredTD + n("Try Points");
    }
    if (pts > 0) out["Points"] = pts; else delete out["Points"]; // >0 only → non-scorers stay blank (like APY)
    return out;
  }
  return stats;
}

// Absolute, peer-independent coach HOF résumé score (0–90; Coach-of-the-Year adds up to 10 via
// coachAwardBonus → 100). Every part is era/state/sport-neutral: win % (ties = ½ win) and per-season
// longevity — never raw game/win volume, since games-per-season drifts by era and differs by state.
// Not rank-based, so a coach's score never moves because of another coach's record or the prior toggle.
export function calcCoachHofScore(coach) {
  const w = coach.wins || 0, l = coach.losses || 0, t = coach.ties || 0, games = w + l + t, s = coach.seasons || 0;
  // Win % — ties count as a half win (0–30); needs a real sample (20+ games) to count
  const pct = games >= 20 ? (w + t / 2) / games : 0;
  const winScore = pct >= 0.70 ? 30 : pct >= 0.65 ? 25 : pct >= 0.60 ? 20 : pct >= 0.55 ? 14 : pct >= 0.50 ? 9 : pct >= 0.45 ? 4 : 0;
  // Longevity — seasons coached, incl. prior schools (0–24)
  const longScore = s >= 25 ? 24 : s >= 20 ? 21 : s >= 15 ? 17 : s >= 12 ? 14 : s >= 10 ? 11 : s >= 7 ? 7 : s >= 5 ? 4 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
  // League titles (0–18)
  const lg = coach.leagueChamps || 0;
  const lgScore = lg >= 10 ? 18 : lg >= 7 ? 15 : lg >= 5 ? 13 : lg >= 3 ? 9 : lg >= 2 ? 5 : lg >= 1 ? 3 : 0;
  // Postseason / state-level success (0–18) — titles weighted above deep runs, capped so a couple of
  // strong runs can't outweigh a sustained career
  const postScore = Math.min((coach.stateChamps || 0) * 8 + (coach.stateRunnerUp || 0) * 4 + (coach.finalFours || 0) * 3 + (coach.eliteEights || 0) * 2 + (coach.sweetSixteens || 0) * 1, 18);
  return Math.min(winScore + longScore + lgScore + postScore, 90);
}

// ── HOF scoring config (single source of truth; imported by src/MilestoneIQ.jsx + api/_lib.js) ──
// Per-stat importance for the player HOF impact score + record bonus, tuned per sport. TEAM/participation
// stats (Wins, Coach Wins) are 0 — given to every roster player, never an individual achievement.
// SPORT_STAT_OVERRIDES win over these when a stat name means something different by sport.
export const HOF_STAT_WEIGHTS = {
  // Basketball
  "Points": 10, "Assists": 7, "Total Rebounds": 6, "Steals": 5, "Blocks": 5,
  "Wins": 0, "Games Played": 3, "Matches Played": 3,
  "Field Goals Made": 4, "Field Goals Attempted": 2, "Three Pointers Made": 4, "Three Pointers Attempted": 2,
  "Free Throws Made": 3, "Free Throws Attempted": 2, "Offensive Rebounds": 4, "Defensive Rebounds": 4,
  // Football / flag football
  "Passing Yards": 10, "Passing TDs": 9, "Rushing Yards": 10, "Rushing TDs": 9, "Receiving Yards": 10, "Receiving TDs": 9,
  "Total Tackles": 8, "Solo Tackles": 4, "Assisted Tackles": 2,
  "Total Flag Pulls": 8, "Solo Flag Pulls": 4, "Assisted Flag Pulls": 2,
  "Sacks": 8, "Sack Yards Lost": 2, "Hurries": 3, "Interceptions": 7, "Interception Return Yards": 3,
  "Blocked Punts": 5, "Blocked Field Goals": 5, "Safeties": 6, "Total TDs": 9,
  "Total Yards": 7, "All-Purpose Yards": 8, "Forced Fumbles": 6, "Fumble Recoveries": 5,
  "Pass Break Ups": 4, "Punt Return TDs": 6, "Kick Off Return TDs": 6, "Flag Pull Yards Lost": 4,
  // Soccer ("Points" = goals+assists, discounted below the Goals marquee via the override)
  "Goals": 10, "Shutouts": 7, "Saves": 6, "Shots on Goal": 5, "Shots": 4,
  // Baseball / softball
  "Hits": 9, "Home Runs": 9, "RBIs": 9, "Total Bases": 7, "Runs": 6, "Doubles": 4, "Triples": 4, "Stolen Base": 5, "Walk (BB)": 3,
  "Pitcher Wins": 9, "Pitcher Strikeouts": 9, "No Hitters": 8, "Perfect Games": 8, "Innings Pitched": 7,
  "Pitcher Saves": 6, "Pitcher Shut Outs": 6, "Pitcher Complete Games": 4, "Put Outs": 3,
  // Girls volleyball
  "Kills": 10, "Digs": 7, "Aces": 7, "Total Blocks": 8,
  // Generic
  "Coach Wins": 0,
};
// Per-sport overrides — same stat name, different meaning across sports → these WIN over the flat weights.
export const SPORT_STAT_OVERRIDES = {
  soccer:     { "Points": 8 },                                        // Points (goals+assists) overlaps Goals
  baseball:   { "Assists": 4 },                                       // fielding assists (minor), not setting
  volleyball: { "Assists": 9, "Receptions": 5, "Solo Blocks": 5 },    // setting / serve-receive / solo stuffs
  football:   { "Field Goals Made": 6, "Points": 0 },                 // kicker FGs; Points is a derived composite — kept out of HOF
};
// Rate-stat records that COUNT toward HOF (importance ÷ 10); the qualified leader holds the "title".
export const HOF_RATE_WEIGHTS = { "Batting Average": 9, "ERA": 9, "Kill Percentage": 8 };
// TEAM / participation stats — assigned to every roster player, so excluded from impact + record bonus.
export const TEAM_STATS = new Set(["Wins", "Coach Wins"]);
export function sportGroup(sport) {
  const s = String(sport || "");
  if (s.indexOf("basketball") === 0) return "basketball";
  if (s.indexOf("soccer") === 0) return "soccer";
  if (s.indexOf("volleyball") === 0) return "volleyball";
  if (s === "baseball" || s === "softball") return "baseball";
  if (s === "football" || s === "flag_football_girls") return "football";
  return s;
}
export function weightFor(sport, stat) {
  const o = SPORT_STAT_OVERRIDES[sportGroup(sport)];
  return (o && o[stat] != null) ? o[stat] : HOF_STAT_WEIGHTS[stat];
}
// Postseason / team-success weight from a season's notes (used by player teamNorm + displays).
export function getSeasonSuccessScore(notes) {
  if (!notes) return 0;
  const n = notes.toLowerCase();
  let score = 0;
  if (/state champ/.test(n))              score += 30;
  else if (/state runner.?up/.test(n))    score += 22;
  else if (/final.?four|final 4/.test(n)) score += 16;
  else if (/elite.?8/.test(n))            score += 12;
  else if (/sweet.?16/.test(n))           score +=  8;
  else if (/round of|first round|playoff/.test(n)) score += 4;
  if (/league champ/.test(n))             score += 10;
  return score;
}
