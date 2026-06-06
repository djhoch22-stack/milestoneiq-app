// GET /teams/:slug  → server-rendered, READ-ONLY record book for one program.
// Mirrors the in-app dashboard: Records / All-Time / Seasons / HOF tabs (JS-free CSS tabs).
import {
  sb, esc, prettySport, fmtNum, htmlShell, SITE,
  STAT_ORDER, byStatOrder, allStatsFor,
  PCT_DEFS, shootingPct, pctRecordsFrom,
  perGame, pergameRecordsFrom,
} from "./_lib.js";

export default async function handler(req, res) {
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!slug) { res.statusCode = 404; return res.end(notFound()); }

  const team = (await sb(`public_teams?slug=eq.${encodeURIComponent(slug)}&limit=1`))[0];
  if (!team) { res.statusCode = 404; return res.end(notFound()); }

  const pid = team.id;
  const [recordsRaw, atpRaw, seasonsRaw, awards, seasonRows] = await Promise.all([
    sb(`records?program_id=eq.${pid}`),
    sb(`all_time_players?program_id=eq.${pid}`),
    sb(`seasons?program_id=eq.${pid}`),
    sb(`awards?program_id=eq.${pid}`),
    sb(`player_seasons?program_id=eq.${pid}&select=player_name,season,stats`),
  ]);

  // ── Normalize DB rows → app-shaped objects ──────────────────────────────────
  const careerPool = (atpRaw || []).map((p) => ({
    name: p.name, stats: p.stats || {},
    firstYear: p.first_year, lastYear: p.last_year, gradYear: p.grad_year,
    isCurrent: p.is_current, schoolHOF: p.school_hall_of_fame, stateHOF: p.state_hall_of_fame,
  }));
  const storedRecords = (recordsRaw || []).map((r) => ({
    statName: r.stat_name, variant: r.variant, holderName: r.holder_name, holderYear: r.holder_year, value: r.value,
  }));
  const seasonsList = (seasonsRaw || []).map((s) => ({
    season: s.season, wins: s.wins, losses: s.losses, leagueWins: s.league_wins, leagueLosses: s.league_losses,
    coach: s.coach, winPct: s.win_pct, notes: s.notes,
  }));

  const sport = prettySport(team.sport);
  const school = team.school_name || team.name || "Team";
  const place = [team.city, team.state].filter(Boolean).join(", ");

  // ── RECORDS (stored + auto-computed %/per-game), grouped like the app ────────
  const PCT_PARENT = { "Field Goal Percentage": "Field Goals Made", "Three Point Percentage": "Three Pointers Made", "Free Throw Percentage": "Free Throws Made" };
  const VARIANT_ORDER = ["Career total", "Single season", "Single game", "Per game avg (season)", "Per game avg (career)"];
  const vIdx = (v) => { const i = VARIANT_ORDER.indexOf(v); return i === -1 ? 999 : i; };
  const allRecords = [
    ...storedRecords.filter((r) => !PCT_PARENT[r.statName] && !String(r.variant || "").startsWith("Per game avg")),
    ...pctRecordsFrom(seasonRows, careerPool, team.sport),
    ...pergameRecordsFrom(seasonRows, careerPool, team.sport),
  ];
  const byStat = {};
  for (const r of allRecords) { const ts = PCT_PARENT[r.statName] || r.statName; (byStat[ts] = byStat[ts] || []).push(r); }
  const statNames = Object.keys(byStat).sort(byStatOrder);
  const recordsSection = !allRecords.length
    ? `<div class="empty">No school records published yet.</div>`
    : statNames.map((sn) => {
        const recs = byStat[sn].slice().sort((a, b) =>
          ((PCT_PARENT[a.statName] ? 100 : 0) + vIdx(a.variant)) - ((PCT_PARENT[b.statName] ? 100 : 0) + vIdx(b.variant)));
        const groups = []; const seen = {};
        for (const r of recs) { const k = r.statName + "|" + r.variant + "|" + r.value; if (seen[k] != null) groups[seen[k]].push(r); else { seen[k] = groups.length; groups.push([r]); } }
        const tiles = groups.map((g) => {
          const rec = g[0]; const isPct = !!PCT_PARENT[rec.statName];
          const holders = g.filter((r) => r.holderName).map((r) => `<div class="holder">🏅 ${esc(r.holderName)}${r.holderYear ? ` · ${esc(String(r.holderYear))}` : ""}</div>`).join("");
          return `<div class="tile"><div class="top"><span class="vlabel">${isPct ? "Best %" : esc(rec.variant)}</span><span class="val">${isPct ? esc(String(rec.value)) + "%" : fmtNum(rec.value)}</span></div>${holders}</div>`;
        }).join("");
        return `<div class="statcard"><div class="hd">${esc(sn)}</div><div class="tiles">${tiles}</div></div>`;
      }).join("");

  // ── ALL-TIME (full career grid, byStatOrder, % after attempts) ───────────────
  const players = careerPool.filter((p) => Object.keys(p.stats || {}).length);
  let alltimeSection;
  if (!players.length) {
    alltimeSection = `<div class="empty">No all-time players published yet.</div>`;
  } else {
    const baseCols = allStatsFor(players);
    const cols = [];
    for (const c of baseCols) { cols.push({ stat: c }); const d = PCT_DEFS.find((p) => p.att === c); if (d) cols.push({ pct: d }); }
    const lead = baseCols.includes("Points") ? "Points" : (baseCols.includes("Rushing Yards") ? "Rushing Yards" : baseCols[0]);
    const rows = players.slice().sort((a, b) => (Number(b.stats[lead]) || 0) - (Number(a.stats[lead]) || 0));
    const head = `<th class="sticky">Player</th>` + cols.map((c) => `<th class="c">${esc(c.pct ? c.pct.short : c.stat)}</th>`).join("");
    const bodyRows = rows.map((p, i) => {
      const rbg = i % 2 ? "#fafaf8" : "#fff";
      const yrs = p.firstYear && p.lastYear
        ? (String(p.firstYear) === String(p.lastYear) ? esc(String(p.firstYear)) : esc(String(p.firstYear)) + "–" + esc(String(p.lastYear)))
        : (p.gradYear ? "Class of " + esc(String(p.gradYear)) : "");
      const badges = (p.stateHOF ? '<span title="State Hall of Fame">⭐</span> ' : "") + (p.schoolHOF ? '<span title="School Hall of Fame">🏛️</span>' : "");
      const nameCell = `<div style="font-weight:600;color:#111"><span style="color:#9ca3af;font-weight:700">${i + 1}.</span> ${esc(p.name)} ${badges}</div>${yrs ? `<div style="font-size:11px;color:#9ca3af">${yrs}</div>` : ""}`;
      const cells = cols.map((c) => {
        const v = c.pct ? shootingPct(p.stats, c.pct.made, c.pct.att) : p.stats[c.stat];
        const has = v != null && v !== "";
        const disp = c.pct ? (v != null ? v + "%" : "—") : (has ? fmtNum(v) : "—");
        return `<td class="c" style="color:${has ? "#111" : "#d1d5db"}">${disp}</td>`;
      }).join("");
      return `<tr style="background:${rbg}"><td class="sticky" style="background:${rbg}">${nameCell}</td>${cells}</tr>`;
    }).join("");
    alltimeSection = `<div class="gridwrap"><table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  }

  // ── SEASONS ─────────────────────────────────────────────────────────────────
  let seasonsSection;
  if (!seasonsList.length) {
    seasonsSection = `<div class="empty">No season history published yet.</div>`;
  } else {
    const yr = (s) => (String(s.season || "").match(/\d{4}/) || ["0"])[0];
    const rows = seasonsList.slice().sort((a, b) => Number(yr(b)) - Number(yr(a)));
    let tw = 0, tl = 0;
    for (const s of seasonsList) { if (typeof s.wins === "number") tw += s.wins; if (typeof s.losses === "number") tl += s.losses; }
    const pct = (tw + tl) > 0 ? Math.round((tw / (tw + tl)) * 1000) / 10 : null;
    const bodyRows = rows.map((s) => {
      const rec = (s.wins != null || s.losses != null) ? `${s.wins ?? "—"}–${s.losses ?? "—"}` : "—";
      const wp = s.winPct != null ? s.winPct + "%"
        : (s.wins != null && s.losses != null && (s.wins + s.losses) > 0 ? (Math.round((s.wins / (s.wins + s.losses)) * 1000) / 10) + "%" : "—");
      return `<tr><td>${esc(s.season || "")}</td><td>${esc(s.coach || "—")}</td><td class="num">${rec}</td><td class="num">${wp}</td><td style="color:#6b7280">${esc(s.notes || "")}</td></tr>`;
    }).join("");
    seasonsSection = `<div style="margin-bottom:12px;color:#6b7280;font-size:13px">All-time: <strong style="color:#111">${tw}–${tl}</strong>${pct != null ? ` (${pct}%)` : ""} · ${seasonsList.length} seasons</div>` +
      `<table><thead><tr><th>Season</th><th>Coach</th><th class="num">Record</th><th class="num">Win %</th><th>Notes</th></tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  // ── HALL OF FAME ────────────────────────────────────────────────────────────
  const inducted = careerPool.filter((p) => p.schoolHOF || p.stateHOF);
  const hofCards = inducted.length
    ? `<div class="cards">` + inducted.map((p) => {
        const yrs = p.firstYear && p.lastYear
          ? (String(p.firstYear) === String(p.lastYear) ? esc(String(p.firstYear)) : esc(String(p.firstYear)) + "–" + esc(String(p.lastYear)))
          : (p.gradYear ? "Class of " + esc(String(p.gradYear)) : "");
        const badges = (p.stateHOF ? `<span class="badge state">State HOF</span>` : "") + (p.schoolHOF ? `<span class="badge school">School HOF</span>` : "");
        const pts = Number(p.stats?.["Points"]) || 0;
        return `<div class="card"><div style="font-weight:700">${esc(p.name)}</div>${yrs ? `<div style="color:#6b7280;font-size:13px;margin:2px 0">${yrs}</div>` : ""}<div>${badges}</div>${pts ? `<div style="font-size:12px;color:#9ca3af;margin-top:6px">${fmtNum(pts)} career points</div>` : ""}</div>`;
      }).join("") + `</div>`
    : `<div class="empty">No Hall of Fame members published yet.</div>`;
  const aLabel = (a) => a.kind === "coach_of_year" ? `${a.level === "state" ? "State" : "League"} Coach of the Year` : a.kind === "all_state" ? "All-State" : a.kind === "all_league" ? "All-League" : esc(a.kind || "Honor");
  const honorsTable = (awards && awards.length)
    ? `<h3>Honors &amp; Awards</h3><table><thead><tr><th>Honoree</th><th>Honor</th><th>Season</th></tr></thead><tbody>` +
      awards.map((a) => `<tr><td>${esc(a.holder_name || "")}</td><td>${aLabel(a)}</td><td>${esc(a.season || "—")}</td></tr>`).join("") + `</tbody></table>`
    : "";
  const hofSection = hofCards + honorsTable;

  // ── Header + tabs ───────────────────────────────────────────────────────────
  const SPORT_EMOJI = /basket/i.test(team.sport) ? "🏀" : /foot/i.test(team.sport) ? "🏈" : /soccer/i.test(team.sport) ? "⚽" : /base/i.test(team.sport) ? "⚾" : /volley/i.test(team.sport) ? "🏐" : /track|cross/i.test(team.sport) ? "🏃" : "🏆";
  const logoColor = team.primary_color || "#1a3a6b";
  const logoBox = team.logo_url
    ? `<img class="logo" src="${esc(team.logo_url)}" alt="" style="object-fit:contain;background:${esc(logoColor)};padding:4px"/>`
    : `<div class="logo" style="background:${esc(logoColor)}">${SPORT_EMOJI}</div>`;
  const counts = [team.mascot ? esc(team.mascot) : "", esc(sport), `${careerPool.length} all-time players`, `${allRecords.length} records`, place ? esc(place) : ""].filter(Boolean).join(" · ");

  const title = `${school} ${sport} — Records & Hall of Fame | RaftersIQ`;
  const description = `All-time ${sport.toLowerCase()} records, Hall of Fame, season history and honors for ${school}${place ? ` (${place})` : ""}. Powered by RaftersIQ.`;
  const canonical = `${SITE}/teams/${esc(team.slug)}`;
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SportsTeam", name: `${school} ${sport}`, sport, url: canonical, ...(place ? { location: { "@type": "Place", name: place } } : {}) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "RaftersIQ", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Programs", item: SITE + "/teams" },
        { "@type": "ListItem", position: 3, name: `${school} ${sport}`, item: canonical },
      ] },
    ],
  };

  const body = `
    <div class="phead">${logoBox}<div><h1 style="margin:0;font-size:26px">${esc(school)}</h1><div class="meta">${counts}</div></div></div>
    <div class="tabs">
      <input type="radio" name="tab" id="t-records" class="tabin" checked>
      <input type="radio" name="tab" id="t-alltime" class="tabin">
      <input type="radio" name="tab" id="t-seasons" class="tabin">
      <input type="radio" name="tab" id="t-hof" class="tabin">
      <nav class="tabbar">
        <label for="t-records">Records</label>
        <label for="t-alltime">All-Time</label>
        <label for="t-seasons">Seasons</label>
        <label for="t-hof">🏛️ HOF</label>
      </nav>
      <section class="panel p-records"><h2>School Records</h2><p class="sub">Every record by stat, variant, holder &amp; year.</p>${recordsSection}</section>
      <section class="panel p-alltime"><h2>All-Time Program History</h2><p class="sub">${careerPool.length} players · career totals, ranked.</p>${alltimeSection}</section>
      <section class="panel p-seasons"><h2>Season History</h2><p class="sub">Year-by-year results.</p>${seasonsSection}</section>
      <section class="panel p-hof"><h2>Hall of Fame</h2><p class="sub">Inducted athletes &amp; program honors.</p>${hofSection}</section>
    </div>
  `;

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.statusCode = 200;
  return res.end(htmlShell({ title, description, canonical, jsonld, body }));
}

function notFound() {
  return htmlShell({
    title: "Program not found | RaftersIQ",
    description: "This public record book could not be found.",
    canonical: `${SITE}/teams`,
    noindex: true,
    body: `<h1>Program not found</h1><p class="sub">This record book doesn't exist or isn't public. <a href="/teams">Browse all programs</a>.</p>`,
  });
}
