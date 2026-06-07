// Shared helpers for the public record-book SSR functions (Vercel serverless).
// These render crawlable, READ-ONLY HTML for raftersiq.com/teams/<slug> that mirrors
// the in-app dashboard (Records / All-Time / Seasons / HOF tabs), read with the
// PUBLIC anon key. Stat ordering + shooting-%/per-game logic is ported verbatim from
// src/MilestoneIQ.jsx so the public pages match the app exactly.

export const SITE = "https://raftersiq.com";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://odirpbptemubzysrvajh.supabase.co";

// The anon key is a PUBLIC key (already shipped in the browser bundle). Env wins;
// the literal is a zero-config fallback so the pages render without extra setup.
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXJwYnB0ZW11Ynp5c3J2YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwNzQsImV4cCI6MjA5NTkxNzA3NH0.Ikr03FPjiYcXdwr0ng5aNKA-cyHH2tnRpOieeCuy1JI";

// Query the Supabase REST API as the anon role (RLS limits this to public programs).
export async function sb(path) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// HTML-escape text/attribute values.
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : "");
const GENDERS = { boys: "Boys", girls: "Girls", mens: "Men's", womens: "Women's", coed: "Co-ed" };

// "basketball_boys" -> "Boys Basketball"; "football" -> "Football".
export function prettySport(s) {
  if (!s) return "Athletics";
  const parts = String(s).toLowerCase().split(/[_\s-]+/).filter(Boolean);
  let gender = "";
  if (parts.length && GENDERS[parts[parts.length - 1]]) gender = GENDERS[parts.pop()];
  const sport = parts.map(cap).join(" ") || "Athletics";
  return gender ? `${gender} ${sport}` : sport;
}

// Format a stat value (whole numbers get thousands separators; decimals keep 1 place).
export function fmtNum(v) {
  const n = Number(v);
  if (!isFinite(n)) return esc(v);
  return n % 1 === 0 ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// ── Stat ordering (ported from MilestoneIQ.jsx STAT_ORDER / byStatOrder) ──────
export const STAT_ORDER = [
  "Games Played","Wins","Points","Goals","Assists","Shots","Saves","Shutouts","Goals Against","Shots on Goal",
  "Total Rebounds","Offensive Rebounds","Defensive Rebounds",
  "Steals","Blocks",
  "Field Goals Made","Field Goals Attempted",
  "Three Pointers Made","Three Pointers Attempted",
  "Free Throws Made","Free Throws Attempted",
  // Football (canonical order; "Field Goals Made" is shared with basketball above, not repeated)
  "Completetions","Passing Attempts","Passing Yards","Passing TDs",
  "Rushes","Rushing Yards","Rushing TDs",
  "Receptions","Receiving Yards","Receiving TDs",
  "Total Yards","Total TDs",
  "Tackles","Sacks","Interceptions","Pass Break Ups","Forced Fumbles","Fumble Recoveries",
  "Field Goals Attempts","PAT Mades","PAT Attempts",
  "Punts","Punt Yards","Punt Returns","Punt Return Yards","Punt Return TDs",
  "Kick Offs","Kick Off Yards","Kick Off Returns","Kick Off Return Yards","Kick Off Return TDs",
  "All-Purpose Yards",
  "Coach Wins",
];

// Football: exact stat set + order to surface on every tab (always shown, even with no data).
const FOOTBALL_DISPLAY = ["Games Played","Wins","Completetions","Passing Attempts","Passing Yards","Passing TDs","Rushes","Rushing Yards","Rushing TDs","Receptions","Receiving Yards","Receiving TDs","Total Yards","Total TDs","Tackles","Sacks","Interceptions","Pass Break Ups","Forced Fumbles","Fumble Recoveries","Field Goals Made","Field Goals Attempts","PAT Mades","PAT Attempts","Punts","Punt Yards","Punt Returns","Punt Return Yards","Punt Return TDs","Kick Offs","Kick Off Yards","Kick Off Returns","Kick Off Return Yards","Kick Off Return TDs","All-Purpose Yards"];
const SPORT_ORDER = { football: FOOTBALL_DISPLAY };
export function byStatOrder(a, b, sport) {
  const so = SPORT_ORDER[sport];
  if (so) {
    const fa = so.indexOf(a), fb = so.indexOf(b);
    if (fa !== -1 || fb !== -1) return (fa === -1 ? 1e9 : fa) - (fb === -1 ? 1e9 : fb);
  }
  const ai = STAT_ORDER.indexOf(a), bi = STAT_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}
// Stat list for a roster — every stat name with any value > 0, in canonical order.
export function allStatsFor(roster) {
  return [...new Set(roster.flatMap((p) => Object.keys(p.stats || {})))]
    .filter((s) => roster.some((p) => (p.stats[s] || 0) > 0))
    .sort(byStatOrder);
}
// Stats a program should ALWAYS surface (even before data exists). Mirrors MilestoneIQ.jsx.
// Sports not listed fall back to "stats present in the data" (no behavior change).
const BBALL_DISPLAY = ["Games Played", "Wins", "Points", "Assists", "Total Rebounds", "Offensive Rebounds", "Defensive Rebounds", "Steals", "Blocks", "Field Goals Made", "Field Goals Attempted", "Three Pointers Made", "Three Pointers Attempted", "Free Throws Made", "Free Throws Attempted"];
const SOCCER_DISPLAY = ["Games Played", "Wins", "Points", "Goals", "Assists", "Shots", "Saves", "Shutouts"];
export const DISPLAY_STATS = {
  soccer: SOCCER_DISPLAY, soccer_girls: SOCCER_DISPLAY,
  basketball: BBALL_DISPLAY, basketball_boys: BBALL_DISPLAY, basketball_girls: BBALL_DISPLAY,
  football: FOOTBALL_DISPLAY,
};
// Canonical display stats UNION any stat with data, in canonical order.
export function statsToDisplay(roster, sport) {
  const base = DISPLAY_STATS[sport] || [];
  const present = [...new Set((roster || []).flatMap((p) => Object.keys(p.stats || {})))]
    .filter((s) => (roster || []).some((p) => (p.stats?.[s] || 0) > 0));
  return [...new Set([...base, ...present])].sort((a, b) => byStatOrder(a, b, sport));
}

// ── Shooting % (ported) ───────────────────────────────────────────────────────
export const PCT_DEFS = [
  { name: "Field Goal Percentage",  short: "FG%", made: "Field Goals Made",   att: "Field Goals Attempted",   minSeasonAtt: 25, minCareerAtt: 100 },
  { name: "Three Point Percentage", short: "3P%", made: "Three Pointers Made", att: "Three Pointers Attempted", minSeasonAtt: 25, minCareerAtt: 100 },
  { name: "Free Throw Percentage",  short: "FT%", made: "Free Throws Made",    att: "Free Throws Attempted",    minSeasonAtt: 25, minCareerAtt: 100 },
];
export function shootingPct(stats, made, att) {
  const m = Number(stats?.[made]); const a = Number(stats?.[att]);
  if (!a || a <= 0 || isNaN(m) || isNaN(a)) return null;
  return Math.round((m / a) * 1000) / 10;
}
export function pctRecordsFrom(seasonRows, careerPlayers, sport) {
  const out = [];
  for (const d of PCT_DEFS) {
    let ss = null;
    for (const r of (seasonRows || [])) {
      if (Number(r.stats?.[d.att]) < d.minSeasonAtt) continue;
      const p = shootingPct(r.stats, d.made, d.att);
      if (p != null && (!ss || p > ss.value)) ss = { value: p, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-ss-${d.name}`, statName: d.name, variant: "Single season", sport, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if (Number(pl.stats?.[d.att]) < d.minCareerAtt) continue;
      const p = shootingPct(pl.stats, d.made, d.att);
      if (p != null && (!car || p > car.value)) car = { value: p, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-c-${d.name}`, statName: d.name, variant: "Career total", sport, ...car });
  }
  return out;
}

// ── Per-game averages (ported) ────────────────────────────────────────────────
// Per-game DISPLAY (PPG/APG/etc.) stays OFF on public profiles (matches the app — no per-game tiles).
export const PERGAME_DEFS = [];
// Per-game RECORDS appear on the Records tab (nested in each stat's tile). Stats we compute them for:
const PERGAME_RECORD_DEFS = [
  { stat: "Points" }, { stat: "Assists" }, { stat: "Goals" }, { stat: "Shots" }, { stat: "Saves" },
  { stat: "Total Rebounds" }, { stat: "Offensive Rebounds" }, { stat: "Defensive Rebounds" }, { stat: "Steals" }, { stat: "Blocks" },
  { stat: "Field Goals Made" }, { stat: "Field Goals Attempted" }, { stat: "Three Pointers Made" }, { stat: "Three Pointers Attempted" }, { stat: "Free Throws Made" }, { stat: "Free Throws Attempted" },
];
const PERGAME_MIN_SEASON_GP = 5;
const PERGAME_MIN_CAREER_GP = 20;
export function perGame(stats, statKey) {
  const v = Number(stats?.[statKey]); const g = Number(stats?.["Games Played"]);
  if (!g || g <= 0 || isNaN(v) || isNaN(g)) return null;
  return Math.round((v / g) * 10) / 10;
}
export function pergameRecordsFrom(seasonRows, careerPlayers, sport) {
  const out = [];
  for (const d of PERGAME_RECORD_DEFS) {
    let ss = null;
    for (const r of (seasonRows || [])) {
      if (Number(r.stats?.["Games Played"]) < PERGAME_MIN_SEASON_GP) continue;
      const v = perGame(r.stats, d.stat);
      if (v != null && (!ss || v > ss.value)) ss = { value: v, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-pg-ss-${d.stat}`, statName: d.stat, variant: "Per game avg (season)", sport, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if (Number(pl.stats?.["Games Played"]) < PERGAME_MIN_CAREER_GP) continue;
      const v = perGame(pl.stats, d.stat);
      if (v != null && (!car || v > car.value)) car = { value: v, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-pg-c-${d.stat}`, statName: d.stat, variant: "Per game avg (career)", sport, ...car });
  }
  return out;
}
// Auto-compute records from data so they always match the all-time roster (Wins, Goals,
// Assists, Saves, Points, …). career = most over the roster; single-season = best season row.
// One row per tied holder so the tile lists everyone sharing the value.
export function autoStatRecords(seasonRows, careerPlayers, statNames, sport) {
  const out = [];
  for (const stat of (statNames || [])) {
    let mc = 0;
    for (const p of (careerPlayers || [])) { const v = Number(p.stats?.[stat]); if (v > mc) mc = v; }
    if (mc > 0) {
      const seen = new Set();
      for (const p of (careerPlayers || [])) {
        if (Number(p.stats?.[stat]) !== mc) continue;
        const k = (p.name || "").toLowerCase().trim(); if (seen.has(k)) continue; seen.add(k);
        out.push({ id: `auto-c-${stat}-${k}`, statName: stat, variant: "Career total", value: mc, holderName: p.name, holderYear: p.firstYear ? String(p.firstYear) : (p.gradYear ? String(p.gradYear) : ""), sport });
      }
    }
    let ms = 0;
    for (const r of (seasonRows || [])) { const v = Number(r.stats?.[stat]); if (v > ms) ms = v; }
    if (ms > 0) {
      const seen = new Set();
      for (const r of (seasonRows || [])) {
        if (Number(r.stats?.[stat]) !== ms) continue;
        const k = (r.player_name || "").toLowerCase().trim(); if (seen.has(k)) continue; seen.add(k);
        out.push({ id: `auto-ss-${stat}-${k}`, statName: stat, variant: "Single season", value: ms, holderName: r.player_name, holderYear: r.season || "", sport });
      }
    }
  }
  return out;
}
// Coach Wins records: career total (a coach's total wins in this program) + single season
// (most wins by a coach in one season). All tied holders included. Per program.
export function coachWinsRecordsFrom(seasons, sport, prior = {}) {
  const out = [];
  const byCoach = {};
  let ssMax = 0;
  for (const s of (seasons || [])) {
    if (!s.coach || s.wins == null) continue;
    const w = Number(s.wins) || 0;
    byCoach[s.coach] = (byCoach[s.coach] || 0) + w;
    if (w > ssMax) ssMax = w;
  }
  // wins a coach brought from PRIOR schools count toward their career total
  Object.entries(prior || {}).forEach(([coach, pr]) => { if (pr && pr.wins) byCoach[coach] = (byCoach[coach] || 0) + Number(pr.wins || 0); });
  const careerMax = Object.keys(byCoach).length ? Math.max(...Object.values(byCoach)) : 0;
  if (careerMax > 0)
    for (const coach in byCoach) if (byCoach[coach] === careerMax)
      out.push({ id: `auto-cw-c-${coach.replace(/\s+/g, "")}`, statName: "Coach Wins", variant: "Career total", value: careerMax, holderName: coach, holderYear: "", sport });
  if (ssMax > 0)
    for (const s of (seasons || [])) if (s.coach && (Number(s.wins) || 0) === ssMax)
      out.push({ id: `auto-cw-ss-${(s.coach || "").replace(/\s+/g, "")}-${s.season}`, statName: "Coach Wins", variant: "Single season", value: ssMax, holderName: s.coach, holderYear: s.season || "", sport });
  return out;
}

// ── HOF + coach scoring (ported verbatim from MilestoneIQ.jsx → scores match) ──
const HOF_STAT_WEIGHTS = {
  "Points": 10, "Assists": 7, "Total Rebounds": 6, "Steals": 6, "Blocks": 5, "Wins": 8, "Games Played": 3,
  "Field Goals Made": 4, "Field Goals Attempted": 2, "Three Pointers Made": 4, "Three Pointers Attempted": 2,
  "Free Throws Made": 3, "Free Throws Attempted": 2, "Offensive Rebounds": 4, "Defensive Rebounds": 4,
  "Passing Yards": 10, "Passing TDs": 9, "Rushing Yards": 10, "Rushing TDs": 9, "Receiving Yards": 10, "Receiving TDs": 9,
  "Total Tackles": 8, "Sacks": 8, "Interceptions": 7, "Total TDs": 9,
  "Goals": 10, "Saves": 8, "Shutouts": 7, "Coach Wins": 0,
};
function getSeasonSuccessScore(notes) {
  if (!notes) return 0;
  const n = notes.toLowerCase(); let score = 0;
  if (/state champ/.test(n)) score += 30; else if (/state runner.?up/.test(n)) score += 22;
  else if (/final.?four|final 4/.test(n)) score += 16; else if (/elite.?8/.test(n)) score += 12;
  else if (/sweet.?16/.test(n)) score += 8; else if (/round of|first round|playoff/.test(n)) score += 4;
  if (/league champ/.test(n)) score += 10;
  return score;
}
function playerYears(player) {
  if (player.firstYear && player.lastYear) {
    const a = parseInt(String(player.firstYear).split("-")[1]); const b = parseInt(String(player.lastYear).split("-")[1]);
    const yrs = []; for (let y = a; y <= b; y++) yrs.push(y); return yrs;
  }
  if (player.gradYear) { const g = Number(player.gradYear); return [g - 3, g - 2, g - 1, g]; }
  return [];
}
function playerSeasonOverlap(player, season) {
  const ys = playerYears(player); if (!ys.length) return false;
  return ys.includes(parseInt(String(season.season || "").split("-")[1]));
}
export function calcProgramHofScore(player, school) {
  if (!player || !school) return 0;
  const roster = school.allTimeRoster || []; if (!roster.length) return 0;
  const stats = player.stats || {}; let statScore = 0, totalWeight = 0;
  Object.entries(stats).forEach(([stat, val]) => {
    const weight = HOF_STAT_WEIGHTS[stat]; if (!weight || !val) return; totalWeight += weight;
    const sorted = roster.filter((p) => (p.stats[stat] || 0) > 0).sort((a, b) => (b.stats[stat] || 0) - (a.stats[stat] || 0));
    const rank = sorted.findIndex((p) => p.id === player.id) + 1; const total = sorted.length; if (!rank || !total) return;
    let rankPct;
    if (rank === 1) rankPct = 1.00; else if (rank === 2) rankPct = 0.85; else if (rank === 3) rankPct = 0.70;
    else if (rank / total <= 0.10) rankPct = 0.50; else if (rank / total <= 0.25) rankPct = 0.35;
    else if (rank / total <= 0.50) rankPct = 0.20; else rankPct = 0.05;
    statScore += weight * rankPct;
  });
  const statNorm = totalWeight > 0 ? (statScore / totalWeight) * 70 : 0;
  let teamScore = 0;
  (school.seasons || []).forEach((s) => { if (playerSeasonOverlap(player, s)) teamScore += getSeasonSuccessScore(s.notes); });
  const teamNorm = Math.min(teamScore / 3, 30);
  const pn = (player.name || "").toLowerCase().trim(); let recordBonus = 0;
  (school.records || []).forEach((rec) => {
    const h = (rec.holderName || "").toLowerCase().trim();
    if (!h || h === "multiple players") return;
    if (h === pn) recordBonus += (rec.variant || "").toLowerCase().includes("career") ? 5 : 3;
  });
  return Math.min(Math.round(statNorm + teamNorm + Math.min(recordBonus, 20)), 100);
}
// Coach aggregation (public: no prior-school fold). Adds firstYear/lastYear/titles like the Seasons tab.
export function buildCoachStats(seasons) {
  const coaches = {};
  (seasons || []).forEach((s) => {
    const name = (s.coach || "").trim(); if (!name) return;
    if (!coaches[name]) coaches[name] = { name, wins: 0, losses: 0, ties: 0, leagueWins: 0, leagueLosses: 0, leagueTies: 0, seasons: 0,
      stateChamps: 0, stateRunnerUp: 0, finalFours: 0, eliteEights: 0, sweetSixteens: 0, playoffs: 0, leagueChamps: 0,
      titles: 0, firstYear: s.season, lastYear: s.season, byTeam: {} };
    const co = coaches[name];
    co.seasons += 1; co.wins += (s.wins || 0); co.losses += (s.losses || 0); co.ties += (s.ties || 0);
    co.leagueWins += (s.leagueWins || 0); co.leagueLosses += (s.leagueLosses || 0); co.leagueTies += (s.leagueTies || 0);
    // per-sport/team breakdown (e.g. Boys Basketball vs Girls Soccer)
    const tm = s._team || "Team";
    if (!co.byTeam[tm]) co.byTeam[tm] = { wins: 0, losses: 0, ties: 0, seasons: 0 };
    const bt = co.byTeam[tm]; bt.wins += (s.wins || 0); bt.losses += (s.losses || 0); bt.ties += (s.ties || 0); bt.seasons += 1;
    const notes = (s.notes || "").toLowerCase();
    if (/state champ/.test(notes)) co.stateChamps += 1;
    if (/runner.?up|runner-up/.test(notes)) co.stateRunnerUp += 1;
    if (/final.?four|final 4/.test(notes)) co.finalFours += 1;
    if (/elite.?8/.test(notes)) co.eliteEights += 1;
    if (/sweet.?16/.test(notes)) co.sweetSixteens += 1;
    if (/round of|first round|playoff|sweet|elite|final four|state/.test(notes)) co.playoffs += 1;
    if (/league champ/.test(notes)) co.leagueChamps += 1;
    if (/champion/i.test(s.notes || "")) co.titles += 1;
    if (String(s.season) < String(co.firstYear)) co.firstYear = s.season;
    if (String(s.season) > String(co.lastYear)) co.lastYear = s.season;
  });
  return Object.values(coaches);
}
export function calcCoachHofScore(coach, all) {
  const total = all.length; if (!total) return 0;
  const winRank = [...all].sort((a, b) => b.wins - a.wins).findIndex((c) => c.name === coach.name) + 1;
  const winScore = winRank === 1 ? 25 : winRank === 2 ? 20 : winRank === 3 ? 15 : (winRank / total) <= 0.25 ? 10 : 5;
  const games = coach.wins + coach.losses; const pct = games >= 20 ? coach.wins / games : 0;
  const pctScore = pct >= 0.75 ? 15 : pct >= 0.65 ? 12 : pct >= 0.55 ? 8 : pct >= 0.45 ? 4 : 0;
  const seasRank = [...all].sort((a, b) => b.seasons - a.seasons).findIndex((c) => c.name === coach.name) + 1;
  const seasScore = seasRank === 1 ? 10 : seasRank === 2 ? 8 : seasRank === 3 ? 6 : (coach.seasons >= 5 ? 4 : 2);
  const postScore = Math.min(coach.stateChamps * 10 + coach.stateRunnerUp * 6 + coach.finalFours * 5 + coach.eliteEights * 3 + coach.sweetSixteens * 2 + coach.leagueChamps * 2, 35);
  const lgRank = [...all].sort((a, b) => b.leagueChamps - a.leagueChamps).findIndex((c) => c.name === coach.name) + 1;
  const lgScore = lgRank === 1 && coach.leagueChamps > 0 ? 15 : lgRank === 2 && coach.leagueChamps > 0 ? 10 : coach.leagueChamps > 0 ? 5 : 0;
  return Math.min(Math.round(winScore + pctScore + seasScore + postScore + lgScore), 100);
}
export function hofTier(score) {
  if (score >= 90) return { label: "Legend", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" };
  if (score >= 75) return { label: "Elite", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" };
  if (score >= 60) return { label: "Strong", color: "#065f46", bg: "#f0fdf4", border: "#6ee7b7" };
  if (score >= 45) return { label: "Contender", color: "#92400e", bg: "#fffbeb", border: "#fcd34d" };
  if (score >= 30) return { label: "Honorable", color: "#374151", bg: "#f9fafb", border: "#d1d5db" };
  return { label: "Developing", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
}
// Awards → HOF bonuses (ported)
const PLAYER_HONORS = [
  { kind: "league_poy", label: "League Player of the Year", points: 8 },
  { kind: "all_league_1st", label: "First Team All-League", points: 5 },
  { kind: "all_league_2nd", label: "Second Team All-League", points: 3 },
  { kind: "all_league_hm", label: "Honorable Mention All-League", points: 2 },
  { kind: "state_poy", label: "State Player of the Year", points: 12 },
  { kind: "all_state_1st", label: "First Team All-State", points: 9 },
  { kind: "all_state_2nd", label: "Second Team All-State", points: 6 },
  { kind: "all_state_hm", label: "Honorable Mention All-State", points: 4 },
];
const AWARD_POINTS = { all_league: 3, all_state: 6 };
PLAYER_HONORS.forEach((h) => { AWARD_POINTS[h.kind] = h.points; });
const PLAYER_AWARD_LABELS = { all_league: "All-League", all_state: "All-State" };
PLAYER_HONORS.forEach((h) => { PLAYER_AWARD_LABELS[h.kind] = h.label; });
const COACH_AWARD_POINTS = { league: 5, state: 10 };
export function normName(n) { return String(n || "").toLowerCase().replace(/\s+/g, " ").trim(); }
export function playerAwardBonus(name, awards) {
  const n = normName(name); let b = 0;
  for (const a of (awards || [])) { if (a.scope !== "player" || normName(a.holder_name) !== n) continue; b += AWARD_POINTS[a.kind] || 2; }
  return Math.min(b, 20);
}
export function coachAwardBonus(name, awards) {
  const n = normName(name); let b = 0;
  for (const a of (awards || [])) { if (a.scope !== "coach" || normName(a.holder_name) !== n) continue; b += COACH_AWARD_POINTS[a.level] || COACH_AWARD_POINTS.league; }
  return Math.min(b, 20);
}
export function awardsForHolder(name, scope, awards) {
  const n = normName(name);
  return (awards || []).filter((a) => a.scope === scope && normName(a.holder_name) === n);
}
export function awardLabel(a) {
  if (a.kind === "coach_of_year") return (a.level === "state" ? "State" : "League") + " Coach of the Year";
  return PLAYER_AWARD_LABELS[a.kind] || a.kind;
}

// Full HTML document shell with SEO meta + JSON-LD + app-matching styles +
// JS-free CSS tabs. `body` is the page content (may include the .tabs markup).
export function htmlShell({ title, description, canonical, image, jsonld, body, noindex }) {
  const img = image || `${SITE}/raftersiq-logo.png`;
  // Hide the redundant "Browse all programs" self-link when we're already on /teams.
  const onDir = String(canonical || "").replace(/\/+$/, "") === SITE + "/teams";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
${noindex ? '<meta name="robots" content="noindex, follow"/>' : '<meta name="robots" content="index, follow"/>'}
<link rel="canonical" href="${esc(canonical)}"/>
<link rel="icon" type="image/png" href="/raftersiq-logo.png"/>
<meta name="theme-color" content="#1a3a6b"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="RaftersIQ"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Georgia,"Times New Roman",serif;color:#1f2937;background:#f8f7f4;line-height:1.5}
  a{color:#1a56db;text-decoration:none}
  a:hover{text-decoration:underline}
  .nav{display:flex;align-items:center;gap:10px;max-width:1040px;margin:0 auto;padding:16px 20px}
  .nav img{width:32px;height:32px;object-fit:contain}
  .nav b{font-size:19px;color:#1a3a6b}
  .wrap{max-width:1040px;margin:0 auto;padding:8px 20px 56px}
  .eyebrow{display:inline-block;background:#eff6ff;color:#1e40af;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;margin-bottom:10px}
  h1{font-size:30px;line-height:1.15;margin:6px 0 4px;color:#111}
  h2{font-size:18px;margin:0 0 4px;color:#111;font-weight:700}
  h3{font-size:14px;margin:22px 0 10px;color:#334155;font-weight:700;display:flex;align-items:center;gap:8px}
  h3:after{content:"";flex:1;height:1px;background:#e8e4dd}
  p.sub{color:#6b7280;font-size:13px;margin:0 0 14px}
  /* header */
  .phead{display:flex;align-items:center;gap:14px;margin:6px 0 4px}
  .phead .logo{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;flex-shrink:0}
  .meta{color:#6b7280;font-size:13px}
  /* tables */
  table{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #e8e4dd;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #f1efea}
  th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#6b7280;font-weight:700}
  tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  td.rank{color:#9ca3af;font-weight:700;font-size:12px;width:36px}
  /* horizontal scroll grid (all-time) with sticky name col */
  .gridwrap{overflow-x:auto;background:#fff;border:1px solid #e8e4dd;border-radius:12px}
  .gridwrap table{border:none;border-radius:0}
  .gridwrap th.sticky,.gridwrap td.sticky{position:sticky;left:0;z-index:1;border-right:1px solid #f0eeea;min-width:180px}
  .gridwrap th.sticky{z-index:2}
  .gridwrap td.c,.gridwrap th.c{text-align:center;white-space:nowrap}
  /* record stat cards */
  .statcard{background:#fff;border:1px solid #e8e4dd;border-radius:12px;margin-bottom:8px;overflow:hidden}
  .statcard .hd{padding:10px 16px;border-bottom:1px solid #f3f0ea;font-weight:700;font-size:14px;color:#111}
  .tiles{padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
  .tile{background:#f9fafb;border-radius:8px;padding:12px}
  .tile .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:8px}
  .tile .vlabel{background:#eff6ff;color:#1e3a5f;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .tile .val{font-size:17px;font-weight:700;color:#111;font-variant-numeric:tabular-nums}
  .tile .holder{font-size:12px;color:#6b7280}
  /* cards (HOF) */
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #ececec;border-radius:12px;padding:14px 16px}
  .badge{display:inline-block;font-size:11px;font-weight:700;border-radius:20px;padding:2px 9px;margin-right:6px;margin-top:4px}
  .badge.state{background:#fef3c7;color:#92400e}
  .badge.school{background:#dbeafe;color:#1e40af}
  .badge.active{background:#dbeafe;color:#1e40af}
  .empty{color:#9ca3af;font-size:14px;padding:18px 0}
  /* JS-free CSS tabs */
  .tabin{position:absolute;width:0;height:0;opacity:0;pointer-events:none}
  .tabbar{display:flex;gap:0;border-bottom:1px solid #e8e4dd;overflow-x:auto;margin:14px 0 18px;-webkit-overflow-scrolling:touch}
  .tabbar label{padding:10px 16px;font-size:14px;font-weight:400;color:#6b7280;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px;flex-shrink:0}
  .tabbar label:hover{color:#374151}
  .panel{display:none}
  #t-overview:checked~.p-overview,#t-athletes:checked~.p-athletes,#t-records:checked~.p-records,#t-alltime:checked~.p-alltime,#t-seasons:checked~.p-seasons,#t-hof:checked~.p-hof{display:block}
  #t-overview:checked~.tabbar label[for="t-overview"],#t-athletes:checked~.tabbar label[for="t-athletes"],#t-records:checked~.tabbar label[for="t-records"],#t-alltime:checked~.tabbar label[for="t-alltime"],#t-seasons:checked~.tabbar label[for="t-seasons"],#t-hof:checked~.tabbar label[for="t-hof"]{color:#1a56db;font-weight:700;border-bottom-color:#1a56db}
  /* overview stat cards */
  .ovcards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .ovcard{background:#fff;border:1px solid #e8e4dd;border-radius:12px;padding:16px 20px}
  .ovcard .ic{font-size:22px;margin-bottom:4px}
  .ovcard .v{font-size:26px;font-weight:700;color:#111}
  .ovcard .l{font-size:12px;color:#6b7280}
  @media(max-width:560px){.ovcards{grid-template-columns:repeat(2,1fr)}}
  /* athlete cards */
  .acards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
  @media(max-width:560px){.acards{grid-template-columns:1fr}}
  .acard{background:#fff;border:1px solid #e8e4dd;border-radius:12px;padding:16px}
  .acard .nm{font-weight:700;font-size:15px;color:#111}
  .acard .pos{font-size:12px;color:#6b7280;margin-bottom:10px}
  .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
  .scell{background:#f9fafb;border-radius:6px;padding:5px 8px}
  .scell .k{font-size:10px;color:#9ca3af;line-height:1.2}
  .scell .sv{font-size:13px;font-weight:600;color:#111}
  .glabel{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-radius:4px;padding:2px 6px;display:inline-block;margin:6px 0 5px}
  /* all-time controls + leaderboard */
  .ctrls{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
  .ctrls select,.ctrls input{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;background:#fff}
  .ctrls input{flex:1;min-width:160px}
  .fbtns{display:flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
  .fbtn{padding:8px 14px;font-size:13px;border:none;cursor:pointer;background:#fff;color:#6b7280;font-family:inherit}
  .fbtn.on{background:#1a56db;color:#fff;font-weight:700}
  /* hof view toggle */
  .hvin{position:absolute;width:0;height:0;opacity:0;pointer-events:none}
  .hvbar{display:inline-flex;border:1px solid #e5e7eb;border-radius:9px;overflow:hidden;margin-bottom:16px}
  .hvbar label{padding:8px 18px;font-size:13px;color:#6b7280;cursor:pointer}
  .hvpanel{display:none}
  #hv-ath:checked~.hv-ath,#hv-coach:checked~.hv-coach{display:block}
  #hv-ath:checked~.hvbar label[for="hv-ath"],#hv-coach:checked~.hvbar label[for="hv-coach"]{background:#1a3a6b;color:#fff;font-weight:700}
  /* hof cards */
  .hcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
  .hcard{background:#fff;border:1px solid #e8e4dd;border-radius:12px;padding:14px 16px}
  .hcard .top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .hcard .sc{font-size:22px;font-weight:800;line-height:1}
  .tier{display:inline-block;font-size:11px;font-weight:700;border-radius:20px;padding:2px 10px;margin-top:6px}
  /* clickable rows/cards → open profile */
  [data-p]{cursor:pointer}
  tr[data-p]:hover{background:#f0f7ff!important}
  .acard[data-p]:hover,.hcard[data-p]:hover{border-color:#1a56db}
  /* player profile modal */
  #pmodal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;align-items:center;justify-content:center;padding:20px}
  #pmcard{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.18)}
  .pmhd{padding:24px;border-radius:16px 16px 0 0;position:relative}
  .pmx{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.15);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#fff;font-size:18px}
  .pmav{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0}
  .pmname{color:#fff;font-weight:700;font-size:20px}
  .pmsub{color:rgba(255,255,255,.8);font-size:13px;margin-top:3px}
  .pmbody{padding:24px}
  .hbadge{background:rgba(255,255,255,.25);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700}
  .hofchips{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
  .hofchip{border:1px solid;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600}
  .ptiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
  .ptile{background:#f9fafb;border:1px solid #f0eeea;border-radius:10px;padding:10px 14px}
  .ptile .pl{font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px}
  .ptile .pv{font-size:22px;font-weight:700;color:#111}
  .ptile .psub{font-size:11px;color:#6b7280}
  /* cta + footer */
  .cta{background:#1a3a6b;color:#fff;border-radius:14px;padding:24px;text-align:center;margin-top:40px}
  .cta a.btn{display:inline-block;background:#fff;color:#1a3a6b;font-weight:700;border-radius:9px;padding:11px 22px;margin-top:10px}
  .foot{color:#9ca3af;font-size:13px;text-align:center;padding:24px 0}
  @media(max-width:560px){h1{font-size:24px}.wrap{padding:8px 14px 48px}}
</style>
</head>
<body>
  <div class="nav"><a href="/" style="display:flex;align-items:center;gap:10px"><img src="/raftersiq-logo.png" alt="RaftersIQ"/><b>RaftersIQ</b></a></div>
  <div class="wrap">
    ${body}
    <div class="cta">
      <div style="font-size:20px;font-weight:800;margin-bottom:4px">Is this your program?</div>
      <div style="color:rgba(255,255,255,.82);font-size:15px">Claim it to manage stats, records, milestones &amp; your Hall of Fame.</div>
      <a class="btn" href="/">Start your free trial →</a>
    </div>
    <div class="foot">Powered by <a href="/">RaftersIQ</a> · the record book for high-school athletic programs${onDir ? "" : ` · <a href="/teams">Browse all programs</a>`}</div>
  </div>
</body>
</html>`;
}
