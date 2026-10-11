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
  if (sport === "football") {
    // Total Yards = yards from scrimmage (Rushing + Receiving); passing is tracked separately and excluded.
    // All-Purpose Yards = scrimmage + return yards (Rushing + Receiving + Kick Off Return + Punt Return).
    // Both are DERIVED so they never go stale: a prior static APY backfill drifted after later re-imports
    // re-summed the career (career APY could fall below a player's own rushing yards). Recomputing here
    // overrides whatever APY/Total Yards is stored.
    const rush = Number(stats["Rushing Yards"]) || 0, rec = Number(stats["Receiving Yards"]) || 0;
    const kr = Number(stats["Kick Off Return Yards"]) || 0, pr = Number(stats["Punt Return Yards"]) || 0;
    const out = { ...stats };
    if (stats["Rushing Yards"] != null || stats["Receiving Yards"] != null) out["Total Yards"] = rush + rec;
    const apy = rush + rec + kr + pr;
    if (apy > 0) out["All-Purpose Yards"] = apy; else delete out["All-Purpose Yards"]; // >0 only → non-skill players stay blank
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
