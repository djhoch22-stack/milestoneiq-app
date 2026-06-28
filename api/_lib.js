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
  // Suffix-less legacy keys that have a gendered counterpart → spell out the boys side (matches the app's
  // labels). "soccer" = Boys Soccer (its girls program is "soccer_girls"); same for the legacy "basketball".
  const OVERRIDE = { soccer: "Boys Soccer", basketball: "Boys Basketball", volleyball: "Boys Volleyball" };
  if (OVERRIDE[String(s).toLowerCase()]) return OVERRIDE[String(s).toLowerCase()];
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
  "Completions","Passing Attempts","Passing Yards","Passing TDs",
  "Rushes","Rushing Yards","Rushing TDs",
  "Receptions","Receiving Yards","Receiving TDs",
  "Total Yards","Total TDs",
  "Total Tackles","Solo Tackles","Assisted Tackles","Sacks","Sack Yards Lost","Hurries","Interceptions","Interception Return Yards","Pass Break Ups","Forced Fumbles","Fumble Recoveries","Blocked Punts","Blocked Field Goals","Safeties",
  "Field Goals Attempts","Longest Field Goal","PAT Mades","PAT Attempts",
  "Punts","Punt Yards","Longest Punt","Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return",
  "Kick Offs","Kick Off Yards","Longest Kick Off","Kick Off Returns","Kick Off Return Yards","Kick Off Return TDs","Longest Kick Off Return",
  "All-Purpose Yards",
  "Coach Wins",
  // Derived rate stats — ordered after the counting stats when they appear as standalone record cards
  "Batting Average","On Base Percentage","Slugging Percentage","OPS","Fielding Percentage","ERA",
];

// Football: exact stat set + order to surface on every tab (always shown, even with no data).
const FOOTBALL_DISPLAY = ["Games Played","Wins","Completions","Passing Attempts","Passing Yards","Passing TDs","Longest Completion","Rushes","Rushing Yards","Rushing TDs","Longest Rush","Receptions","Receiving Yards","Receiving TDs","Longest Reception","Total Yards","Total TDs","Total Tackles","Solo Tackles","Assisted Tackles","Sacks","Sack Yards Lost","Hurries","Interceptions","Interception Return Yards","Pass Break Ups","Forced Fumbles","Fumble Recoveries","Blocked Punts","Blocked Field Goals","Safeties","Field Goals Made","Field Goals Attempts","Longest Field Goal","PAT Mades","PAT Attempts","Punts","Punt Yards","Longest Punt","Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return","Kick Offs","Kick Off Yards","Longest Kick Off","Kick Off Returns","Kick Off Return Yards","Kick Off Return TDs","Longest Kick Off Return","All-Purpose Yards"];
// Girls flag football — football minus kickoffs/kick-returns + contact-only defense; tackles → flag pulls.
const FLAG_FOOTBALL_DISPLAY = ["Games Played","Wins","Completions","Passing Attempts","Passing Yards","Passing TDs","Longest Completion","Rushes","Rushing Yards","Rushing TDs","Longest Rush","Receptions","Receiving Yards","Receiving TDs","Longest Reception","Total TDs","Total Flag Pulls","Solo Flag Pulls","Assisted Flag Pulls","Flag Pull Yards Lost","Sacks","Try Points","Punts","Punt Yards","Longest Punt","Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return"];
// Baseball: raw counting stats in canonical order (ported from MilestoneIQ.jsx BASEBALL_DISPLAY).
const BASEBALL_DISPLAY = ["Games Played", "Wins", "Plate Appearances", "At Bats", "Hits", "Singles", "Doubles", "Triples", "Home Runs", "Total Bases", "Runs", "RBIs", "Stolen Base", "Sacrifice Fly", "Sacrifice Bunt", "Walk (BB)", "Hit By Pitch", "Reached on Error", "Total Chances", "Put Outs", "Assists", "Double Plays", "Triple Plays", "Pitcher Wins", "Pitcher Appearances", "Pitcher Games Started", "Pitcher Complete Games", "Pitcher Shut Outs", "Pitcher Saves", "No Hitters", "Perfect Games", "Innings Pitched", "Earned Runs", "Pitcher Strikeouts", "Batters Faced", "At Bats Pitcher", "# of Pitches"];
// Girls Volleyball: raw counting stats in canonical order (mirrors MilestoneIQ.jsx VBALL_GIRLS_DISPLAY).
const VBALL_GIRLS_DISPLAY = ["Matches Played", "Sets Played", "Wins", "Kills", "Attack Attempts", "Assists", "Ball Handling Attempts", "Aces", "Total Serves", "Service Points", "Receptions", "Digs", "Solo Blocks", "Assisted Blocks", "Total Blocks"];
export const SPORT_ORDER = { football: FOOTBALL_DISPLAY, flag_football_girls: FLAG_FOOTBALL_DISPLAY, baseball: BASEBALL_DISPLAY, softball: BASEBALL_DISPLAY, volleyball_girls: VBALL_GIRLS_DISPLAY, volleyball: VBALL_GIRLS_DISPLAY };
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
const SOCCER_DISPLAY = ["Games Played", "Wins", "Points", "Goals", "Assists", "Shots", "Shots on Goal", "Saves", "Shutouts"];
export const DISPLAY_STATS = {
  soccer: SOCCER_DISPLAY, soccer_girls: SOCCER_DISPLAY,
  basketball: BBALL_DISPLAY, basketball_boys: BBALL_DISPLAY, basketball_girls: BBALL_DISPLAY,
  football: FOOTBALL_DISPLAY, flag_football_girls: FLAG_FOOTBALL_DISPLAY, baseball: BASEBALL_DISPLAY, softball: BASEBALL_DISPLAY,
  volleyball_girls: VBALL_GIRLS_DISPLAY, volleyball: VBALL_GIRLS_DISPLAY,
};
// URL slug from a school name — shared by the public school hub (/school/:slug) and per-program links.
export function slugify(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
// Sport emoji for the multi-sport profile toggle (mirrors the app's SPORTS icons).
export const SPORT_ICON = { football: "🏈", flag_football_girls: "🏈", basketball: "🏀", basketball_boys: "🏀", basketball_girls: "🏀", soccer: "⚽", soccer_girls: "⚽", baseball: "⚾", softball: "🥎", volleyball: "🏐", volleyball_girls: "🏐", wrestling: "🤼", track: "🏃" };
// Gender of a sport for cross-sport linking: "F" girls, "M" boys, "X" football (links across all genders).
export function sportGender(sport) {
  const s = String(sport || "").toLowerCase();
  // Gender suffix wins FIRST so girls flag football siloes with girls sports (not the football bridge).
  if (s.endsWith("_girls") || s.includes("girls") || s.includes("women") || s === "softball") return "F";
  if (s.endsWith("_boys") || s.includes("boys")) return "M";
  if (s.includes("football")) return "X";
  return "M";
}
// A kid's two sports link only when same gender — or either is football (matches the app's rule).
export function sportsLinkable(a, b) {
  if (a === b) return true;
  const ga = sportGender(a), gb = sportGender(b);
  return ga === "X" || gb === "X" || ga === gb;
}
// Stats imported only to feed a derived rate (e.g. Serve Errors → Serve %); never shown as a column.
const HIDDEN_INPUT_STATS = new Set(["Serve Errors"]);
// Canonical display stats UNION any stat with data, in canonical order.
export function statsToDisplay(roster, sport) {
  const base = DISPLAY_STATS[sport] || [];
  const present = [...new Set((roster || []).flatMap((p) => Object.keys(p.stats || {})))]
    .filter((s) => (roster || []).some((p) => (p.stats?.[s] || 0) > 0));
  // "Longest …": show only the ones we add to DISPLAY_STATS (career = max via the SQL rollup); any
  // other "Longest …" merely present in the data stays records-only and is dropped from the columns.
  return [...new Set([...base, ...present])].filter((s) => (!/^Longest /.test(s) || base.includes(s)) && !HIDDEN_INPUT_STATS.has(s)).sort((a, b) => byStatOrder(a, b, sport));
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

// ── Derived RATE stats (ported from MilestoneIQ.jsx — computed, never stored) ─
// Basketball shooting %s ("47.3%") and baseball AVG/OBP/SLG/OPS/Fielding % (".305").
// Each def carries a serializable `spec` so the SAME formula runs server-side here
// AND inside the page's inline JS (leaderboard re-sort + profile modal).
export const RATE_FMT = {
  "Field Goal Percentage": "pct", "Three Point Percentage": "pct", "Free Throw Percentage": "pct",
  "Batting Average": "avg3", "On Base Percentage": "avg3", "Slugging Percentage": "avg3", "OPS": "avg3", "Fielding Percentage": "avg3",
  "ERA": "era2",
  "Completion Percentage": "pct",
  "Yards per Rush": "per1", "Yards per Pass": "per1", "Yards per Reception": "per1",
  "Kill Percentage": "pct",
  "Kills Per Set": "perSet", "Assists Per Set": "perSet", "Aces Per Set": "perSet", "Digs Per Set": "perSet", "Blocks Per Set": "perSet", "Receptions Per Set": "perSet",
  "Serve Percentage": "pct",
  "Ace Percentage": "pct",
};
export function fmtRateVal(fmt, v) {
  if (v == null || isNaN(v)) return "—";
  if (fmt === "pct") return v + "%";
  if (fmt === "era2") return Number(v).toFixed(2); // 4.20 / 0.62 — ERA keeps its leading digit
  if (fmt === "perSet") return Number(v).toFixed(2); // 3.52 kills/set
  if (fmt === "per1") return Number(v).toFixed(1); // 5.2 yards per carry/attempt/reception
  const s = Number(v).toFixed(3);
  return s.charAt(0) === "0" ? s.slice(1) : s; // .305 (1.000+ keeps its leading digit)
}
// Innings Pitched notation (36.2 = 36⅔): tenths digit counts THIRDS of an inning. Numeric season
// sums keep that property (every .1 = one out), so this converts season AND career totals.
function ipInnings(v) {
  const n = Number(v); if (isNaN(n) || n < 0) return 0;
  return Math.floor(n) + Math.round((n - Math.floor(n)) * 10) / 3;
}
const statG = (stats) => (k) => { const v = Number(stats?.[k]); return isNaN(v) ? 0 : v; };
// spec kinds: pct (made÷att → 47.3) · ratio (Σnum ÷ Σden, weighted) · ops (OBP + SLG)
export function evalRateSpec(spec, stats) {
  const g = statG(stats);
  if (spec.kind === "pct") return shootingPct(stats, spec.made, spec.att);
  if (spec.kind === "pctIn") { const a = g(spec.att); return a > 0 ? Math.round(((a - g(spec.errs)) / a) * 1000) / 10 : null; } // (att - errs)/att × 100, e.g. Serve %
  if (spec.kind === "ratio") {
    let n = 0, d = 0;
    for (const [k, w] of spec.num) n += w * g(k);
    for (const [k, w] of spec.den) d += w * g(k);
    return d > 0 ? n / d : null;
  }
  if (spec.kind === "ops") {
    const ab = g("At Bats"); if (ab <= 0) return null;
    const od = ab + g("Walk (BB)") + g("Hit By Pitch") + g("Sacrifice Fly");
    const obp = od > 0 ? (g("Hits") + g("Walk (BB)") + g("Hit By Pitch")) / od : 0;
    const slg = (g("Hits") + g("Doubles") + 2 * g("Triples") + 3 * g("Home Runs")) / ab;
    return obp + slg;
  }
  if (spec.kind === "era") {
    const ip = ipInnings(g("Innings Pitched"));
    const er = g("Earned Runs");
    return (ip > 0 && er > 0) ? (7 * er) / ip : null; // 7-inning HS games (matches MaxPreps); no earned runs = no data (not a real 0.00)
  }
  return null;
}
const BBALL_RATE_DEFS = PCT_DEFS.map((d) => ({
  name: d.name, short: d.short, after: d.att, fmt: "pct", qualStat: d.att,
  minSeason: d.minSeasonAtt, minCareer: d.minCareerAtt, noteAbbr: "att",
  spec: { kind: "pct", made: d.made, att: d.att },
}));
const BASEBALL_RATE_DEFS = [
  { name: "Batting Average", short: "AVG", after: "At Bats", fmt: "avg3", qualStat: "At Bats", minSeason: 20, minCareer: 60, noteAbbr: "AB",
    spec: { kind: "ratio", num: [["Hits", 1]], den: [["At Bats", 1]] } },
  { name: "On Base Percentage", short: "OBP", after: "At Bats", fmt: "avg3", qualStat: "At Bats", minSeason: 20, minCareer: 60, noteAbbr: "AB",
    spec: { kind: "ratio", num: [["Hits", 1], ["Walk (BB)", 1], ["Hit By Pitch", 1]], den: [["At Bats", 1], ["Walk (BB)", 1], ["Hit By Pitch", 1], ["Sacrifice Fly", 1]] } },
  { name: "Slugging Percentage", short: "SLG", after: "At Bats", fmt: "avg3", qualStat: "At Bats", minSeason: 20, minCareer: 60, noteAbbr: "AB",
    spec: { kind: "ratio", num: [["Hits", 1], ["Doubles", 1], ["Triples", 2], ["Home Runs", 3]], den: [["At Bats", 1]] } },
  { name: "OPS", short: "OPS", after: "At Bats", fmt: "avg3", qualStat: "At Bats", minSeason: 20, minCareer: 60, noteAbbr: "AB",
    spec: { kind: "ops" } },
  { name: "Fielding Percentage", short: "FLD%", after: "Total Chances", fmt: "avg3", qualStat: "Total Chances", minSeason: 15, minCareer: 40, noteAbbr: "TC",
    spec: { kind: "ratio", num: [["Put Outs", 1], ["Assists", 1]], den: [["Total Chances", 1]] } },
  { name: "ERA", short: "ERA", after: "Innings Pitched", fmt: "era2", qualStat: "Innings Pitched", minSeason: 15, minCareer: 40, noteAbbr: "IP", lowerIsBetter: true,
    spec: { kind: "era" } },
];
const SOCCER_RATE_DEFS = [
  { name: "Shot Accuracy", short: "SOT%", after: "Shots on Goal", fmt: "pct", qualStat: "Shots on Goal", minSeason: 10, minCareer: 25, noteAbbr: "SOG",
    spec: { kind: "ratio", num: [["Shots on Goal", 1]], den: [["Shots", 1]] } },
];
const VBALL_RATE_DEFS = [
  { name: "Kill Percentage", short: "KILL%", after: "Attack Attempts", fmt: "pct", qualStat: "Attack Attempts", minSeason: 100, minCareer: 300, noteAbbr: "att",
    spec: { kind: "pct", made: "Kills", att: "Attack Attempts" } },
  { name: "Serve Percentage", short: "SERVE%", after: "Total Serves", fmt: "pct", qualStat: "Total Serves", minSeason: 100, minCareer: 300, noteAbbr: "serves",
    spec: { kind: "pctIn", att: "Total Serves", errs: "Serve Errors" } },
  { name: "Ace Percentage", short: "ACE%", after: "Aces", fmt: "pct", qualStat: "Total Serves", minSeason: 100, minCareer: 300, noteAbbr: "serves",
    spec: { kind: "pct", made: "Aces", att: "Total Serves" } },
  { name: "Kills Per Set", short: "K/S", after: "Kills", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Kills", 1]], den: [["Sets Played", 1]] } },
  { name: "Assists Per Set", short: "A/S", after: "Assists", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Assists", 1]], den: [["Sets Played", 1]] } },
  { name: "Aces Per Set", short: "AC/S", after: "Aces", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Aces", 1]], den: [["Sets Played", 1]] } },
  { name: "Digs Per Set", short: "D/S", after: "Digs", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Digs", 1]], den: [["Sets Played", 1]] } },
  { name: "Blocks Per Set", short: "B/S", after: "Total Blocks", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Total Blocks", 1]], den: [["Sets Played", 1]] } },
  { name: "Receptions Per Set", short: "R/S", after: "Receptions", fmt: "perSet", qualStat: "Sets Played", minSeason: 30, minCareer: 100, noteAbbr: "sets",
    spec: { kind: "ratio", num: [["Receptions", 1]], den: [["Sets Played", 1]] } },
];
const FOOTBALL_RATE_DEFS = [
  { name: "Completion Percentage", short: "COMP%", after: "Passing Attempts", fmt: "pct", qualStat: "Passing Attempts", minSeason: 75, minCareer: 200, noteAbbr: "att",
    spec: { kind: "pct", made: "Completions", att: "Passing Attempts" } },
  { name: "Yards per Rush", short: "YPC", after: "Rushing Yards", fmt: "per1", qualStat: "Rushes", minSeason: 40, minCareer: 100, noteAbbr: "rush",
    spec: { kind: "ratio", num: [["Rushing Yards", 1]], den: [["Rushes", 1]] } },
  { name: "Yards per Pass", short: "YPA", after: "Passing Yards", fmt: "per1", qualStat: "Passing Attempts", minSeason: 40, minCareer: 100, noteAbbr: "att",
    spec: { kind: "ratio", num: [["Passing Yards", 1]], den: [["Passing Attempts", 1]] } },
  { name: "Yards per Reception", short: "YPR", after: "Receiving Yards", fmt: "per1", qualStat: "Receptions", minSeason: 12, minCareer: 30, noteAbbr: "rec",
    spec: { kind: "ratio", num: [["Receiving Yards", 1]], den: [["Receptions", 1]] } },
];
// ── Record categorization (mirrors the in-app sport.groups; names only) ──────
// Lets the public Records section group by category (Passing/Rushing/…) like the app.
const G_FOOTBALL = [
  { g: "General", s: ["Games Played","Wins"] },
  { g: "Passing", s: ["Completions","Passing Attempts","Passing Yards","Passing TDs","Longest Completion"] },
  { g: "Rushing", s: ["Rushes","Rushing Yards","Rushing TDs","Longest Rush"] },
  { g: "Receiving", s: ["Receptions","Receiving Yards","Receiving TDs","Longest Reception"] },
  { g: "Offense", s: ["Total Yards","Total TDs"] },
  { g: "Defense", s: ["Total Tackles","Solo Tackles","Assisted Tackles","Sacks","Sack Yards Lost","Hurries","Interceptions","Interception Return Yards","Pass Break Ups","Forced Fumbles","Fumble Recoveries","Blocked Punts","Blocked Field Goals","Safeties"] },
  { g: "Kicking", s: ["Field Goals Made","Field Goals Attempts","PAT Mades","PAT Attempts","Longest Field Goal"] },
  { g: "Punting", s: ["Punts","Punt Yards","Longest Punt"] },
  { g: "Punt Returns", s: ["Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return"] },
  { g: "Kickoffs", s: ["Kick Offs","Kick Off Yards","Longest Kick Off"] },
  { g: "Kickoff Returns", s: ["Kick Off Returns","Kick Off Return Yards","Kick Off Return TDs","Longest Kick Off Return"] },
  { g: "Coaching", s: ["Coach Wins"] },
];
const G_FLAG_FOOTBALL = [
  { g: "General", s: ["Games Played","Wins"] },
  { g: "Passing", s: ["Completions","Passing Attempts","Passing Yards","Passing TDs","Longest Completion"] },
  { g: "Rushing", s: ["Rushes","Rushing Yards","Rushing TDs","Longest Rush"] },
  { g: "Receiving", s: ["Receptions","Receiving Yards","Receiving TDs","Longest Reception"] },
  { g: "Offense", s: ["Total TDs"] },
  { g: "Defense", s: ["Total Flag Pulls","Solo Flag Pulls","Assisted Flag Pulls","Flag Pull Yards Lost","Sacks"] },
  { g: "Scoring", s: ["Try Points"] },
  { g: "Punting", s: ["Punts","Punt Yards","Longest Punt"] },
  { g: "Punt Returns", s: ["Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return"] },
  { g: "Coaching", s: ["Coach Wins"] },
];
const G_BASEBALL = [
  { g: "General", s: ["Games Played","Wins"] },
  { g: "Batting", s: ["Plate Appearances","At Bats","Hits","Singles","Doubles","Triples","Home Runs","Total Bases","Runs","RBIs","Stolen Base","Sacrifice Fly","Sacrifice Bunt","Walk (BB)","Hit By Pitch","Reached on Error"] },
  { g: "Fielding", s: ["Total Chances","Put Outs","Assists","Double Plays","Triple Plays"] },
  { g: "Pitching", s: ["Pitcher Wins","Pitcher Appearances","Pitcher Games Started","Pitcher Complete Games","Pitcher Shut Outs","Pitcher Saves","No Hitters","Perfect Games","Innings Pitched","Earned Runs","Pitcher Strikeouts","Batters Faced","At Bats Pitcher","# of Pitches"] },
  { g: "Coaching", s: ["Coach Wins"] },
];
const G_VBALL = [
  { g: "General", s: ["Matches Played","Sets Played","Wins"] },
  { g: "Attacking", s: ["Kills","Attack Attempts"] },
  { g: "Setting", s: ["Assists","Ball Handling Attempts"] },
  { g: "Serving", s: ["Aces","Total Serves","Service Points"] },
  { g: "Defense", s: ["Receptions","Digs","Solo Blocks","Assisted Blocks","Total Blocks"] },
  { g: "Coaching", s: ["Coach Wins"] },
];
export function groupsFor(sport) {
  if (sport === "football") return G_FOOTBALL;
  if (sport === "flag_football_girls") return G_FLAG_FOOTBALL;
  if (sport === "baseball" || sport === "softball") return G_BASEBALL;
  if (sport === "volleyball_girls" || sport === "volleyball") return G_VBALL;
  return null; // no groups → everything falls under "Other" (matches the in-app)
}
// Baseball/softball: Singles + Total Bases are COMPUTED from the batting line (never stored, so they
// always reflect current Hits/2B/3B/HR). Applied to every stats object as it loads. Mirrors the app.
export function withDerivedStats(stats, sport) {
  if (!stats) return {};
  if (sport === "baseball" || sport === "softball") {
    if (stats["Hits"] == null) return stats;
    const h = Number(stats["Hits"]) || 0, d = Number(stats["Doubles"]) || 0, t = Number(stats["Triples"]) || 0, hr = Number(stats["Home Runs"]) || 0;
    return { ...stats, "Singles": Math.max(0, h - d - t - hr), "Total Bases": h + d + 2 * t + 3 * hr };
  }
  if (sport === "football") {
    // Total Yards = yards from scrimmage (Rushing + Receiving); passing is tracked separately and excluded.
    // Derived so it never goes stale when a component (e.g. Rushing Yards) is edited.
    if (stats["Rushing Yards"] == null && stats["Receiving Yards"] == null) return stats;
    const rush = Number(stats["Rushing Yards"]) || 0, rec = Number(stats["Receiving Yards"]) || 0;
    return { ...stats, "Total Yards": rush + rec };
  }
  return stats;
}
export function rateDefsFor(sport) {
  if (sport === "baseball" || sport === "softball") return BASEBALL_RATE_DEFS;
  if (sport === "football" || sport === "flag_football_girls") return FOOTBALL_RATE_DEFS;
  if (sport === "volleyball_girls" || sport === "volleyball") return VBALL_RATE_DEFS;
  if (sport === "basketball" || sport === "basketball_boys" || sport === "basketball_girls") return BBALL_RATE_DEFS;
  if (sport === "soccer" || sport === "soccer_girls") return SOCCER_RATE_DEFS;
  return [];
}
export function rateValue(d, stats) { return evalRateSpec(d.spec, stats); }
// Per-program qualifying minimums: programs.record_minimums (keyed by stat name → {season, career})
// overrides the def's defaults; anything unset falls back. Mirrors MilestoneIQ.jsx minsFor.
export function minsFor(d, recordMins) {
  const o = (recordMins || {})[d.name] || {};
  const s = Number(o.season), c = Number(o.career);
  return { season: s > 0 ? s : d.minSeason, career: c > 0 ? c : d.minCareer };
}
// Counting stats whose RECORD is the FEWEST (lower is better, golf-style), qualified by a volume stat so a
// tiny sample can't "win" with 0. Mirrors MilestoneIQ.jsx LOW_RECORD_DEFS / lowCountingRecordsFrom.
export const LOW_RECORD_DEFS = {
  baseball: [{ stat: "Earned Runs", qualStat: "Innings Pitched", minSeason: 15, minCareer: 40 }],
  softball: [{ stat: "Earned Runs", qualStat: "Innings Pitched", minSeason: 15, minCareer: 40 }],
};
export function isLowRecordStat(sport, stat) { return (LOW_RECORD_DEFS[sport] || []).some(d => d.stat === stat); }
// Fewest-value records (career + single-season) for the lower-is-better counting stats, gated by volume.
export function lowCountingRecordsFrom(seasonRows, careerPlayers, sport, recordMins) {
  const out = [];
  for (const d of (LOW_RECORD_DEFS[sport] || [])) {
    const mn = minsFor({ name: d.stat, minSeason: d.minSeason, minCareer: d.minCareer }, recordMins);
    let ss = null;
    for (const r of (seasonRows || [])) {
      if ((Number(r.stats?.[d.qualStat]) || 0) < mn.season) continue;
      const v = Number(r.stats?.[d.stat]); if (isNaN(v)) continue;
      if (!ss || v < ss.value) ss = { value: v, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-low-ss-${d.stat}`, statName: d.stat, variant: "Single season", sport, auto: true, lowerBetter: true, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if ((Number(pl.stats?.[d.qualStat]) || 0) < mn.career) continue;
      const v = Number(pl.stats?.[d.stat]); if (isNaN(v)) continue;
      if (!car || v < car.value) car = { value: v, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-low-c-${d.stat}`, statName: d.stat, variant: "Career total", sport, auto: true, lowerBetter: true, ...car });
  }
  return out;
}
// Auto record-holders for the rate stats (career + single-season), gated by minimum volume.
export function pctRecordsFrom(seasonRows, careerPlayers, sport, recordMins) {
  const out = [];
  for (const d of rateDefsFor(sport)) {
    const beats = (a, b) => d.lowerIsBetter ? a < b : a > b; // ERA: the record is the LOWEST qualified
    const mn = minsFor(d, recordMins);
    let ss = null;
    for (const r of (seasonRows || [])) {
      if ((Number(r.stats?.[d.qualStat]) || 0) < mn.season) continue; // missing/NaN volume → 0 → never qualifies
      const p = rateValue(d, r.stats);
      if (p != null && (!ss || beats(p, ss.value))) ss = { value: p, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-ss-${d.name}`, statName: d.name, variant: "Single season", sport, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if ((Number(pl.stats?.[d.qualStat]) || 0) < mn.career) continue; // missing/NaN volume → 0 → never qualifies
      const p = rateValue(d, pl.stats);
      if (p != null && (!car || beats(p, car.value))) car = { value: p, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
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
  // Football — per-game over a season AND over a career
  { stat: "Completions" }, { stat: "Passing Attempts" }, { stat: "Passing Yards" }, { stat: "Passing TDs" },
  { stat: "Rushes" }, { stat: "Rushing Yards" }, { stat: "Rushing TDs" },
  { stat: "Receptions" }, { stat: "Receiving Yards" }, { stat: "Receiving TDs" },
  { stat: "Total Yards" }, { stat: "Total TDs" },
  { stat: "Total Tackles" }, { stat: "Sacks" }, { stat: "Interceptions" }, { stat: "Pass Break Ups" },
  { stat: "Punts" }, { stat: "Punt Yards" }, { stat: "Punt Returns" }, { stat: "Punt Return Yards" }, { stat: "Punt Return TDs" }, { stat: "Kick Returns" },
  // Volleyball (per-match)
  { stat: "Kills" }, { stat: "Attack Attempts" }, { stat: "Aces" }, { stat: "Total Serves" }, { stat: "Service Points" }, { stat: "Ball Handling Attempts" }, { stat: "Digs" }, { stat: "Solo Blocks" }, { stat: "Assisted Blocks" }, { stat: "Total Blocks" },
  // Flag football
  { stat: "Total Flag Pulls" }, { stat: "Solo Flag Pulls" }, { stat: "Assisted Flag Pulls" }, { stat: "Flag Pull Yards Lost" }, { stat: "Try Points" },
];
const PERGAME_MIN_SEASON_GP = 5;
const PERGAME_MIN_CAREER_GP = 20;
export function perGame(stats, statKey) {
  const v = Number(stats?.[statKey]); const g = Number(stats?.["Games Played"] ?? stats?.["Matches Played"]);
  if (!g || g <= 0 || isNaN(v) || isNaN(g)) return null;
  return Math.round((v / g) * 10) / 10;
}
export function pergameRecordsFrom(seasonRows, careerPlayers, sport) {
  const out = [];
  const perLbl = (sport === "volleyball_girls" || sport === "volleyball") ? "Per match avg" : "Per game avg";
  const minSeasonGP = (sport === "football" || sport === "flag_football_girls") ? 4 : PERGAME_MIN_SEASON_GP;
  const minCareerGP = (sport === "football" || sport === "flag_football_girls") ? 10 : PERGAME_MIN_CAREER_GP;
  for (const d of PERGAME_RECORD_DEFS) {
    let ss = null;
    for (const r of (seasonRows || [])) {
      if (Number(r.stats?.["Games Played"] ?? r.stats?.["Matches Played"]) < minSeasonGP) continue;
      const v = perGame(r.stats, d.stat);
      if (v != null && (!ss || v > ss.value)) ss = { value: v, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-pg-ss-${d.stat}`, statName: d.stat, variant: `${perLbl} (season)`, sport, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if (Number(pl.stats?.["Games Played"] ?? pl.stats?.["Matches Played"]) < minCareerGP) continue;
      const v = perGame(pl.stats, d.stat);
      if (v != null && (!car || v > car.value)) car = { value: v, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-pg-c-${d.stat}`, statName: d.stat, variant: `${perLbl} (career)`, sport, ...car });
  }
  return out;
}
// Football "Longest …" records (longest rush/reception/FG/punt/punt-return/kick-return) —
// single-PLAY maxes, so the program record = MAX over every player-season (never summed).
const LONGEST_STATS = ["Longest Completion","Longest Rush","Longest Reception","Longest Field Goal","Longest Punt","Longest Punt Return","Longest Kick Off","Longest Kick Off Return"];
export function longestRecordsFrom(seasonRows, sport) {
  if (sport !== "football") return [];
  const out = [];
  for (const stat of LONGEST_STATS) {
    let best = null;
    for (const r of (seasonRows || [])) {
      const v = Number(r.stats?.[stat]);
      if (!isNaN(v) && v > 0 && (!best || v > best.value)) best = { value: v, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (best) out.push({ id: `auto-long-${stat}`, statName: stat, variant: "Longest", sport, ...best });
  }
  return out;
}
// Auto-compute records from data so they always match the all-time roster (Wins, Goals,
// Assists, Saves, Points, …). career = most over the roster; single-season = best season row.
// One row per tied holder so the tile lists everyone sharing the value.
export function autoStatRecords(seasonRows, careerPlayers, statNames, sport) {
  const out = [];
  for (const stat of (statNames || [])) {
    if (isLowRecordStat(sport, stat)) continue; // shown as a "fewest" record by lowCountingRecordsFrom instead
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
  "Points": 10, "Assists": 7, "Total Rebounds": 6, "Steals": 5, "Blocks": 5, "Wins": 0, "Games Played": 3, "Matches Played": 3,
  "Field Goals Made": 4, "Field Goals Attempted": 2, "Three Pointers Made": 4, "Three Pointers Attempted": 2,
  "Free Throws Made": 3, "Free Throws Attempted": 2, "Offensive Rebounds": 4, "Defensive Rebounds": 4,
  "Passing Yards": 10, "Passing TDs": 9, "Rushing Yards": 10, "Rushing TDs": 9, "Receiving Yards": 10, "Receiving TDs": 9,
  "Total Tackles": 8, "Solo Tackles": 4, "Assisted Tackles": 2, "Sacks": 8, "Sack Yards Lost": 2,
  "Hurries": 3, "Interceptions": 7, "Interception Return Yards": 3, "Blocked Punts": 5, "Blocked Field Goals": 5, "Safeties": 6, "Total TDs": 9,
  "Goals": 10, "Saves": 8, "Shutouts": 7, "Shots": 4, "Coach Wins": 0,
  "Hits": 9, "Home Runs": 9, "RBIs": 9, "Runs": 6, "Doubles": 4, "Triples": 4, "Stolen Base": 5, "Walk (BB)": 3,
  "Pitcher Wins": 9, "Pitcher Strikeouts": 9, "No Hitters": 8, "Perfect Games": 8, "Innings Pitched": 7,
  "Pitcher Saves": 6, "Pitcher Shut Outs": 6, "Pitcher Complete Games": 4, "Put Outs": 3,
};
// TEAM / participation stats — given to every roster player, so NOT individual achievements
// (excluded from impact scoring AND the record bonus).
const TEAM_STATS = new Set(["Wins", "Coach Wins"]);
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
  const impact = totalWeight > 0 ? statScore / totalWeight : 0; // individual-impact factor 0–1 (team Wins excluded)
  const statNorm = impact * 70;
  let teamScore = 0;
  (school.seasons || []).forEach((s) => { if (playerSeasonOverlap(player, s)) teamScore += getSeasonSuccessScore(s.notes); });
  const teamNorm = Math.min(teamScore / 3, 30) * (0.2 + 0.8 * impact); // team success scaled by the player's impact
  const pn = (player.name || "").toLowerCase().trim(); let recordBonus = 0;
  const now = new Date().getFullYear(); const t2Cache = {};
  const top2For = (stat) => t2Cache[stat] || (t2Cache[stat] = (() => {
    const s = roster.filter((p) => (p.stats[stat] || 0) > 0).sort((a, b) => (b.stats[stat] || 0) - (a.stats[stat] || 0));
    return { v1: (s[0] ? (s[0].stats[stat] || 0) : 0), v2: (s[1] ? (s[1].stats[stat] || 0) : 0) };
  })());
  (school.records || []).forEach((rec) => {
    const h = (rec.holderName || "").toLowerCase().trim();
    if (!h || h === "multiple players" || h !== pn) return;
    if (TEAM_STATS.has(rec.statName)) return; // team records (Wins) aren't individual achievements
    // importance (Points 1.0 … FT made 0.3) × variant (career 5 / season-or-avg 3 / game 2) × margin over #2 × longevity
    const v = (rec.variant || "").toLowerCase();
    const imp = (HOF_STAT_WEIGHTS[rec.statName] || 3) / 10;
    const variantBase = v.includes("career") ? 5 : v.includes("game") ? 2 : 3;
    let marginMult = 1;
    if (v.includes("career")) { const t2 = top2For(rec.statName); if (t2.v1 > 0 && t2.v2 > 0) { const m = (t2.v1 - t2.v2) / t2.v2; marginMult = m < 0.05 ? 1 : m < 0.15 ? 1.15 : m < 0.30 ? 1.3 : m < 0.50 ? 1.5 : 1.7; } }
    const endYear = parseInt(String(rec.holderYear || "").slice(-4), 10);
    const yrs = endYear ? now - endYear : 0;
    const longMult = yrs >= 40 ? 1.3 : yrs >= 25 ? 1.2 : yrs >= 15 ? 1.1 : 1;
    recordBonus += imp * variantBase * marginMult * longMult;
  });
  return Math.min(Math.round(statNorm + teamNorm + Math.min(recordBonus, 20)), 100);
}
// Legacy hardcoded prior (predates the DB coach_prior; DB entries override by key). Mirrors the app so
// public + in-app coach totals match exactly.
const COACH_PRIOR_STATS = {
  "Steve Schimpeler": { wins:308, losses:145, seasons:19, leagueChamps:9, eliteEights:3, finalFours:1 },
};
// Coach aggregation. Adds firstYear/lastYear/titles like the Seasons tab, and folds in each coach's
// prior-school record (wins/losses/ties + postseason) from `prior` when includePrior — parity with the app.
export function buildCoachStats(seasons, opts = {}) {
  const { includePrior = true, prior = {} } = opts;
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
    if (/elite.?8|final 8\b/.test(notes)) co.eliteEights += 1;
    if (/sweet.?16/.test(notes)) co.sweetSixteens += 1;
    if (/round of|first round|playoff|sweet|elite|final four|state/.test(notes)) co.playoffs += 1;
    if (/league champ/.test(notes)) co.leagueChamps += 1;
    if (/champion/i.test(s.notes || "")) co.titles += 1;
    if (String(s.season) < String(co.firstYear)) co.firstYear = s.season;
    if (String(s.season) > String(co.lastYear)) co.lastYear = s.season;
  });
  // Fold in each coach's prior-school record — only into coaches who actually have seasons here
  // (keyed by exact name), mirroring the in-app buildCoachStats so public + app totals match.
  if (includePrior) Object.entries({ ...COACH_PRIOR_STATS, ...prior }).forEach(([name, pr]) => {
    if (!coaches[name] || !pr) return;
    const co = coaches[name];
    Object.keys(pr).forEach((k) => { if (typeof co[k] === "number" && typeof pr[k] === "number") co[k] += pr[k]; });
  });
  return Object.values(coaches);
}
// Absolute, peer-independent HOF résumé score (0–90; Coach-of-the-Year adds up to 10 via coachAwardBonus → 100).
// Mirrors the in-app calcCoachHofScore exactly. Era/state/sport-neutral: win % (ties = ½) + per-season longevity.
export function calcCoachHofScore(coach) {
  const w = coach.wins || 0, l = coach.losses || 0, t = coach.ties || 0, games = w + l + t, s = coach.seasons || 0;
  const pct = games >= 20 ? (w + t / 2) / games : 0;
  const winScore = pct >= 0.70 ? 30 : pct >= 0.65 ? 25 : pct >= 0.60 ? 20 : pct >= 0.55 ? 14 : pct >= 0.50 ? 9 : pct >= 0.45 ? 4 : 0;
  const longScore = s >= 25 ? 24 : s >= 20 ? 21 : s >= 15 ? 17 : s >= 12 ? 14 : s >= 10 ? 11 : s >= 7 ? 7 : s >= 5 ? 4 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
  const lg = coach.leagueChamps || 0;
  const lgScore = lg >= 10 ? 18 : lg >= 7 ? 15 : lg >= 5 ? 13 : lg >= 3 ? 9 : lg >= 2 ? 5 : lg >= 1 ? 3 : 0;
  const postScore = Math.min((coach.stateChamps||0) * 8 + (coach.stateRunnerUp||0) * 4 + (coach.finalFours||0) * 3 + (coach.eliteEights||0) * 2 + (coach.sweetSixteens||0) * 1, 18);
  return Math.min(winScore + longScore + lgScore + postScore, 90);
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
  { kind: "team_mvp", label: "Team MVP", points: 5 },
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
  const n = normName(name); let coy = 0;
  for (const a of (awards || [])) { if (a.scope === "coach" && normName(a.holder_name) === n) coy += 1; }
  return coy >= 6 ? 10 : coy >= 4 ? 8 : coy >= 3 ? 6 : coy >= 2 ? 4 : coy >= 1 ? 2 : 0;
}
export function awardsForHolder(name, scope, awards) {
  const n = normName(name);
  return (awards || []).filter((a) => a.scope === scope && normName(a.holder_name) === n)
    .sort((a, b) => String(b.season || "").localeCompare(String(a.season || ""))); // newest-first (chronological), matches season/title lists
}
export function awardLabel(a) {
  if (a.kind === "coach_of_year") return (a.level === "state" ? "State" : "League") + " Coach of the Year";
  return PLAYER_AWARD_LABELS[a.kind] || a.kind;
}

// ── Team success ("during career") — ported from MilestoneIQ.jsx so public cards match the app ──
// Postseason / league weight per season from its free-text notes.
export function seasonSuccessScore(notes) {
  if (!notes) return 0;
  const n = String(notes).toLowerCase(); let s = 0;
  if (/state champ/.test(n)) s += 30;
  else if (/state runner.?up/.test(n)) s += 22;
  else if (/final.?four|final 4/.test(n)) s += 16;
  else if (/elite.?8|final 8\b/.test(n)) s += 12;
  else if (/sweet.?16/.test(n)) s += 8;
  else if (/round of|first round|playoff/.test(n)) s += 4;
  if (/league champ/.test(n)) s += 10;
  return s;
}
// Years a player was active: from "YYYY-YYYY" range strings (uses each range's END year) or a 4-yr gradYear span.
export function activeYears(firstYear, lastYear, gradYear) {
  if (firstYear && lastYear) {
    const a = parseInt(String(firstYear).split("-")[1] || String(firstYear), 10);
    const b = parseInt(String(lastYear).split("-")[1] || String(lastYear), 10);
    if (!isNaN(a) && !isNaN(b)) { const ys = []; for (let y = a; y <= b; y++) ys.push(y); return ys; }
  }
  const g = parseInt(gradYear, 10);
  return isNaN(g) ? [] : [g - 3, g - 2, g - 1, g];
}
export function seasonEndYear(seasonStr) {
  return parseInt(String(seasonStr || "").split("-")[1] || String(seasonStr || ""), 10);
}
// Cumulative postseason tallies for a coach across the seasons they coached — mirrors the program-overview
// "team success" rollup (a state title also counts as a final four / playoff appearance, etc.).
export function coachPostseason(coachName, seasons) {
  const n = normName(coachName);
  const mine = (seasons || []).filter((s) => normName(s.coach) === n && s.notes);
  const cnt = (re) => mine.filter((s) => re.test(s.notes)).length;
  const stateChamps = cnt(/state champ|state champion/i);
  const runnerUp = cnt(/runner.?up|runner up|2nd place/i);
  const third = cnt(/3rd place|3rd/i);
  const finalFours = cnt(/final.?4|final four/i) + stateChamps + runnerUp + third;
  const eliteEights = cnt(/elite.?8|elite eight|final 8\b/i) + finalFours;
  const sweetSixteens = cnt(/sweet.?16|sweet sixteen/i) + eliteEights;
  const playoffs = cnt(/playoff|round of|first round|state first/i) + sweetSixteens;
  const leagueTitles = cnt(/league champion|league champ/i);
  return { stateChamps, runnerUp, finalFours, eliteEights, sweetSixteens, playoffs, leagueTitles };
}
// Every league/state title season for a coach, each tagged with its season + sport label (`_team`) — powers
// the "by year and by sport" championship breakdown on coach cards (a coach may win across multiple sports).
export function coachTitleSeasons(coachName, seasons) {
  const n = normName(coachName);
  return (seasons || [])
    .filter((s) => normName(s.coach) === n && s.notes && (/league champ/i.test(s.notes) || /state champ/i.test(s.notes)))
    .map((s) => ({ season: s.season, team: s._team || "", league: /league champ/i.test(s.notes), state: /state champ/i.test(s.notes) }))
    .sort((a, b) => String(b.season).localeCompare(String(a.season)));
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
  body{margin:0;font-family:Georgia,"Times New Roman",serif;color:#1f2937;background:#f8f7f4;line-height:1.5;overflow-x:hidden}
  .tabbar::-webkit-scrollbar{display:none} .tabbar{scrollbar-width:none}
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
  /* Mobile: fit all tabs in one clean line — no horizontal scroll/clipping */
  @media(max-width:560px){.tabbar{overflow-x:visible}.tabbar label{flex:1 1 0;min-width:0;padding:9px 2px;font-size:11px;text-align:center;letter-spacing:-.2px}}
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
