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
  "Games Played","Wins","Points","Assists",
  "Total Rebounds","Offensive Rebounds","Defensive Rebounds",
  "Steals","Blocks",
  "Field Goals Made","Field Goals Attempted",
  "Three Pointers Made","Three Pointers Attempted",
  "Free Throws Made","Free Throws Attempted",
  "Passing Yards","Pass Completions","Pass Attempts","Passing TDs","Longest Pass",
  "Passing Yards Per Game","Passing Yards Per Attempt","Passing Yards Per Season",
  "Passing Yards Per Completion","Completions Per Game","Completion %","Passing TD %",
  "Rushing Yards","Rushing Attempts","Rushing TDs","Longest Rush",
  "Yards Per Rush Attempt","Rushing Yards Per Game","Rushing Yards Per Season",
  "Receiving Yards","Receptions","Receiving TDs","Longest Reception","Targets",
  "Yards Per Reception","Yards Per Target","Receiving Yards Per Game","Receiving Yards Per Season",
  "Total TDs","2 Pt Conversions Made","Yards From Scrimmage","All-Purpose Yards",
  "Total Offense","Touches","Yards Per Touch",
  "Total Tackles","Combined Tackles","Solo Tackles","Tackles For Loss","Sacks",
  "Interceptions","Interception Return Yards","Interception Return TDs","Longest Interception Return",
  "Passes Defended","Fumbles Forced","Fumbles Recovered","Fumble Return Yards","Fumble Return TDs","Safeties",
  "Kick Returns","Kick Return Yards","Kick Return TDs","Longest Kick Return","Yards Per Kick Return",
  "Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return","Yards Per Punt Return",
  "Kick & Punt Returns","Kick & Punt Return Yards","Kick & Punt Return TDs",
  "Extra Points Made","Extra Points Attempted","Extra Point %",
  "Field Goals Made","Field Goals Attempted","Field Goal %","Longest Field Goal Made",
  "Punts","Punting Yards","Longest Punt","Yards Per Punt",
  "Coach Wins",
];
export function byStatOrder(a, b) {
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

// ── Shooting % (ported) ───────────────────────────────────────────────────────
export const PCT_DEFS = [
  { name: "Field Goal Percentage",  short: "FG%", made: "Field Goals Made",   att: "Field Goals Attempted",   minSeasonAtt: 30, minCareerAtt: 100 },
  { name: "Three Point Percentage", short: "3P%", made: "Three Pointers Made", att: "Three Pointers Attempted", minSeasonAtt: 15, minCareerAtt: 40 },
  { name: "Free Throw Percentage",  short: "FT%", made: "Free Throws Made",    att: "Free Throws Attempted",    minSeasonAtt: 20, minCareerAtt: 50 },
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
export const PERGAME_DEFS = [
  { name: "Points Per Game",             short: "PPG",  stat: "Points" },
  { name: "Assists Per Game",            short: "APG",  stat: "Assists" },
  { name: "Rebounds Per Game",           short: "RPG",  stat: "Total Rebounds" },
  { name: "Offensive Rebounds Per Game", short: "ORPG", stat: "Offensive Rebounds" },
  { name: "Defensive Rebounds Per Game", short: "DRPG", stat: "Defensive Rebounds" },
  { name: "Steals Per Game",             short: "SPG",  stat: "Steals" },
  { name: "Blocks Per Game",             short: "BPG",  stat: "Blocks" },
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
  for (const d of PERGAME_DEFS) {
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
  #t-records:checked~.p-records,#t-alltime:checked~.p-alltime,#t-seasons:checked~.p-seasons,#t-hof:checked~.p-hof{display:block}
  #t-records:checked~.tabbar label[for="t-records"],#t-alltime:checked~.tabbar label[for="t-alltime"],#t-seasons:checked~.tabbar label[for="t-seasons"],#t-hof:checked~.tabbar label[for="t-hof"]{color:#1a56db;font-weight:700;border-bottom-color:#1a56db}
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
