// GET /teams/:slug  → server-rendered, READ-ONLY record book for one program.
// Mirrors the in-app dashboard: Overview / Athletes / Records / All-Time / Seasons / HOF.
// JS-free CSS tabs; a small vanilla-JS layer powers All-Time stat-sorting and the
// click-to-open player profile modal (career stats + all-time rank + seasons + records).
import {
  sb, esc, prettySport, fmtNum, htmlShell, SITE, STAT_ORDER, SPORT_ORDER,
  byStatOrder, allStatsFor, statsToDisplay, DISPLAY_STATS, pctRecordsFrom,
  RATE_FMT, fmtRateVal, rateDefsFor, rateValue, minsFor,
  PERGAME_DEFS, perGame, pergameRecordsFrom, longestRecordsFrom, autoStatRecords, coachWinsRecordsFrom,
  buildCoachStats, awardsForHolder, awardLabel, normName,
} from "./_lib.js";

export default async function handler(req, res) {
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!slug) { res.statusCode = 404; return res.end(notFound()); }

  const team = (await sb(`public_teams?slug=eq.${encodeURIComponent(slug)}&limit=1`))[0];
  if (!team) { res.statusCode = 404; return res.end(notFound()); }

  const pid = team.id;
  const [recordsRaw, atpRaw, seasonsRaw, awards, seasonRows, athletesRaw] = await Promise.all([
    sb(`records?program_id=eq.${pid}`),
    sb(`all_time_players?program_id=eq.${pid}`),
    sb(`seasons?program_id=eq.${pid}`),
    sb(`awards?program_id=eq.${pid}`),
    sb(`player_seasons?program_id=eq.${pid}&select=player_name,season,stats`),
    sb(`athletes?program_id=eq.${pid}&select=name,position,grad_year,jersey,is_active,stats`),
  ]);

  // ── Normalize ───────────────────────────────────────────────────────────────
  const careerPool = (atpRaw || []).map((p) => ({
    id: p.id, name: p.name, stats: p.stats || {},
    firstYear: p.first_year, lastYear: p.last_year, gradYear: p.grad_year,
    isCurrent: p.is_current, schoolHOF: p.school_hall_of_fame, stateHOF: p.state_hall_of_fame,
  }));
  const athletes = (athletesRaw || []).map((a) => ({
    name: a.name, position: a.position, gradYear: a.grad_year, isActive: a.is_active !== false, stats: a.stats || {},
  }));
  const storedRecords = (recordsRaw || []).map((r) => ({
    statName: r.stat_name, variant: r.variant, holderName: r.holder_name, holderYear: r.holder_year, value: r.value,
  }));
  const seasonsList = (seasonsRaw || []).map((s) => ({
    season: s.season, wins: s.wins, losses: s.losses, ties: s.ties, leagueWins: s.league_wins, leagueLosses: s.league_losses, leagueTies: s.league_ties,
    coach: s.coach, winPct: s.win_pct, notes: s.notes,
  }));

  const sport = prettySport(team.sport);
  const school = team.school_name || team.name || "Team";
  const place = [team.city, team.state].filter(Boolean).join(", ");
  const isFootball = String(team.sport || "").toLowerCase().includes("football");
  const yearsStr = (p) => p.firstYear && p.lastYear
    ? (String(p.firstYear) === String(p.lastYear) ? esc(String(p.firstYear)) : esc(String(p.firstYear)) + "–" + esc(String(p.lastYear)))
    : (p.gradYear ? "Class of " + esc(String(p.gradYear)) : "");
  const statTile = (k, v) => `<div class="scell"><div class="k">${esc(k)}</div><div class="sv"${v == null || v === "" ? ' style="color:#d1d5db"' : ""}>${v == null || v === "" ? "—" : (typeof v === "number" ? v.toLocaleString() : esc(v))}</div></div>`;

  // ── RECORDS (stored + auto %/per-game) ──────────────────────────────────────
  const PCT_PARENT = { "Field Goal Percentage": "Field Goals Made", "Three Point Percentage": "Three Pointers Made", "Free Throw Percentage": "Free Throws Made" };
  // "Longest …" records render INSIDE their parent stat's tile (Longest Completion under Completions, etc.).
  const LONGEST_PARENT = { "Longest Completion": "Completions", "Longest Rush": "Rushes", "Longest Reception": "Receptions", "Longest Field Goal": "Field Goals Made", "Longest Punt": "Punts", "Longest Punt Return": "Punt Returns", "Longest Kick Off Return": "Kick Off Returns", "Longest Kick Off": "Kick Offs" };
  const VARIANT_ORDER = ["Career total", "Single season", "Single game", "Per game avg (season)", "Per game avg (career)", "Longest"];
  const vIdx = (v) => { const i = VARIANT_ORDER.indexOf(v); return i === -1 ? 999 : i; };
  const autoRecs = [
    ...pctRecordsFrom(seasonRows, careerPool, team.sport, team.record_minimums),
    ...pergameRecordsFrom(seasonRows, careerPool, team.sport),
    ...longestRecordsFrom(seasonRows, team.sport),
    ...autoStatRecords(seasonRows, careerPool, statsToDisplay(careerPool, team.sport).filter(s => !/^Longest /.test(s)), team.sport),
    ...coachWinsRecordsFrom(seasonsList, team.sport, team.coach_prior || {}),
  ];
  // Manual records are authoritative — they override the auto-computed one for the same stat+variant.
  const manualKeys = new Set(storedRecords.map((r) => r.statName + "|" + r.variant));
  const allRecords = [
    ...storedRecords,
    ...autoRecs.filter((r) => !manualKeys.has(r.statName + "|" + r.variant)),
  ];
  const byStat = {};
  for (const r of allRecords) { const ts = PCT_PARENT[r.statName] || LONGEST_PARENT[r.statName] || r.statName; (byStat[ts] = byStat[ts] || []).push(r); }
  const recordsSection = !allRecords.length
    ? `<div class="empty">No school records published yet.</div>`
    : Object.keys(byStat).sort((a, b) => byStatOrder(a, b, team.sport)).map((sn) => {
        const recs = byStat[sn].slice().sort((a, b) => ((PCT_PARENT[a.statName] ? 100 : 0) + vIdx(a.variant)) - ((PCT_PARENT[b.statName] ? 100 : 0) + vIdx(b.variant)));
        const groups = []; const seen = {};
        for (const r of recs) { const k = r.statName + "|" + r.variant + "|" + r.value; if (seen[k] != null) groups[seen[k]].push(r); else { seen[k] = groups.length; groups.push([r]); } }
        const tiles = groups.map((g) => {
          const rec = g[0]; const isPct = !!RATE_FMT[rec.statName]; // any derived rate (FG%/3P%/FT% · AVG/OBP/SLG/OPS/FLD%)
          // Show ALL players tied at this record's value (team stats like Wins are shared), not just one.
          const seen = new Set(g.filter((r) => r.holderName).map((r) => r.holderName.toLowerCase().trim()));
          let tied = [];
          if (!isPct && rec.variant === "Career total") {
            tied = careerPool.filter((p) => (p.stats?.[rec.statName] ?? null) === rec.value && !seen.has((p.name || "").toLowerCase().trim()))
              .map((p) => ({ name: p.name, year: (p.firstYear && p.lastYear) ? (String(p.firstYear) === String(p.lastYear) ? p.firstYear : p.firstYear + "-" + p.lastYear) : (p.gradYear ? "Class of " + p.gradYear : "") }));
          } else if (!isPct && rec.variant === "Single season") {
            const ns = new Set();
            tied = (seasonRows || []).filter((r) => (r.stats?.[rec.statName] ?? null) === rec.value && r.player_name && !seen.has(r.player_name.toLowerCase().trim()) && !ns.has(r.player_name.toLowerCase().trim()) && (ns.add(r.player_name.toLowerCase().trim()) || true))
              .map((r) => ({ name: r.player_name, year: r.season }));
          }
          const holderList = [...g.filter((r) => r.holderName).map((r) => ({ name: r.holderName, year: r.holderYear })), ...tied];
          const holders = holderList.map((h) => `<div class="holder">🏅 ${esc(h.name)}${h.year ? ` · ${esc(String(h.year))}` : ""}</div>`).join("");
          const pctLabel = rec.variant === "Career total" ? "Career best" : rec.variant === "Single season" ? "Season best" : "Best (" + esc(rec.variant) + ")";
          return `<div class="tile"><div class="top"><span class="vlabel">${isPct ? pctLabel : esc(rec.variant)}</span><span class="val">${isPct ? esc(fmtRateVal(RATE_FMT[rec.statName], rec.value)) : fmtNum(rec.value)}</span></div>${holders}</div>`;
        }).join("");
        return `<div class="statcard"><div class="hd">${esc(sn)}</div><div class="tiles">${tiles}</div></div>`;
      }).join("");

  // ── Player profiles (powers click-to-open modal across tabs) ─────────────────
  const bySeasonName = {};
  for (const r of (seasonRows || [])) { const k = normName(r.player_name); (bySeasonName[k] = bySeasonName[k] || []).push({ season: r.season, s: r.stats || {} }); }
  const recByHolder = {};
  for (const r of allRecords) {
    if (!r.holderName) continue;
    const k = normName(r.holderName);
    const val = RATE_FMT[r.statName] ? fmtRateVal(RATE_FMT[r.statName], r.value) : (typeof r.value === "number" ? r.value.toLocaleString() : r.value);
    (recByHolder[k] = recByHolder[k] || []).push({ n: r.statName, v: r.variant, val });
  }
  const activeSet = new Set(athletes.filter((a) => a.isActive).map((a) => normName(a.name)));
  const athByName = {}; athletes.forEach((a) => { athByName[normName(a.name)] = a; });
  const profiles = {};
  careerPool.forEach((p) => {
    const k = normName(p.name); const ath = athByName[k];
    profiles[k] = { n: p.name, y: (p.firstYear && p.lastYear) ? (String(p.firstYear) === String(p.lastYear) ? String(p.firstYear) : String(p.firstYear) + "–" + String(p.lastYear)) : (p.gradYear ? "Class of " + p.gradYear : ""),
      pos: (ath && ath.position) ? ath.position : "", a: !!(p.isCurrent || activeSet.has(k)), sh: !!p.schoolHOF, st: !!p.stateHOF, at: 1, s: p.stats, ss: bySeasonName[k] || [], rec: recByHolder[k] || [] };
  });
  athletes.forEach((a) => {
    const k = normName(a.name); if (profiles[k]) return;
    profiles[k] = { n: a.name, y: a.gradYear ? "Class of " + a.gradYear : "", pos: a.position || "", a: a.isActive !== false, sh: 0, st: 0, at: 0, s: a.stats, ss: bySeasonName[k] || [], rec: recByHolder[k] || [] };
  });

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  const activeAth = athletes.filter((a) => a.isActive);
  const ovCards = [
    ["👤", activeAth.length, "Active athletes"], ["🏆", careerPool.length, "All-time players"],
    ["📋", storedRecords.length, "Records on file"], ["📅", seasonsList.length, "Seasons tracked"],
  ].map(([ic, v, l]) => `<div class="ovcard"><div class="ic">${ic}</div><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  let ovTable = `<div class="empty">No active roster stats yet.</div>`;
  if (activeAth.length) {
    const base = statsToDisplay(activeAth, team.sport);
    const cols = []; for (const c of base) { cols.push({ stat: c }); for (const d of rateDefsFor(team.sport).filter((p) => p.after === c)) cols.push({ pct: d }); }
    if (cols.length) {
      const rows = activeAth.slice().sort((a, b) => a.name.localeCompare(b.name));
      const head = `<th class="sticky">Athlete</th>` + cols.map((c) => `<th class="c">${esc(c.pct ? c.pct.short : c.stat)}</th>`).join("");
      const tb = rows.map((a, i) => {
        const rbg = i % 2 ? "#fafaf8" : "#fff";
        const cells = cols.map((c) => {
          const v = c.pct ? rateValue(c.pct, a.stats) : a.stats[c.stat];
          const has = v != null && v !== "";
          return `<td class="c" style="color:${has ? "#111" : "#d1d5db"}">${c.pct ? esc(fmtRateVal(c.pct.fmt, v)) : (has ? fmtNum(v) : "—")}</td>`;
        }).join("");
        return `<tr data-p="${esc(normName(a.name))}" style="background:${rbg}"><td class="sticky" style="background:${rbg}"><div style="font-weight:600;color:#111">${esc(a.name)}</div><div style="font-size:11px;color:#9ca3af">${esc(a.position || "")}${a.gradYear ? " · Class of " + esc(String(a.gradYear)) : ""}</div></td>${cells}</tr>`;
      }).join("");
      ovTable = `<div class="gridwrap"><table><thead><tr>${head}</tr></thead><tbody>${tb}</tbody></table></div>`;
    }
  }
  const overviewSection = `<div class="ovcards">${ovCards}</div><h3>Career stats · active roster</h3><p class="sub" style="margin-top:-2px">Tap any athlete for their full profile.</p>${ovTable}`;

  // ── ATHLETES (active roster cards, click → profile) ─────────────────────────
  const OFF = new Set(["Pass Completions","Pass Attempts","Passing Yards","Passing TDs","Longest Pass","Passing Yards Per Game","Completions Per Game","Completion %","Passing TD %","Rushing Attempts","Rushing Yards","Rushing TDs","Longest Rush","Rushing Yards Per Game","Yards Per Rush Attempt","Receptions","Receiving Yards","Receiving TDs","Longest Reception","Targets","Receiving Yards Per Game","Yards Per Reception","Total TDs","2 Pt Conversions Made","Yards From Scrimmage","All-Purpose Yards","Total Offense","Touches","Yards Per Touch"]);
  const DEF = new Set(["Solo Tackles","Combined Tackles","Total Tackles","Tackles For Loss","Sacks","Interceptions","Interception Return Yards","Interception Return TDs","Longest Interception Return","Passes Defended","Fumbles Forced","Fumbles Recovered","Fumble Return Yards","Fumble Return TDs","Safeties"]);
  const SPC = new Set(["Extra Points Made","Extra Points Attempted","Extra Point %","Field Goals Made","Field Goals Attempted","Field Goal %","Longest Field Goal Made","Punts","Punting Yards","Longest Punt","Yards Per Punt","Kick Returns","Kick Return Yards","Kick Return TDs","Longest Kick Return","Yards Per Kick Return","Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return","Yards Per Punt Return","Kick & Punt Returns","Kick & Punt Return Yards","Kick & Punt Return TDs"]);
  const grp = (label, bg, tc, entries) => !entries.length ? "" :
    `<div><span class="glabel" style="background:${bg};color:${tc}">${label}</span><div class="sgrid">${entries.map(([k, v]) => statTile(k, v)).join("")}</div></div>`;
  const athleteCard = (a) => {
    let inner;
    const off = isFootball ? Object.entries(a.stats).filter(([k]) => OFF.has(k) && k !== "Games Played") : [];
    const def = isFootball ? Object.entries(a.stats).filter(([k]) => DEF.has(k)) : [];
    const spc = isFootball ? Object.entries(a.stats).filter(([k]) => SPC.has(k)) : [];
    if (isFootball && ((off.length && def.length) || spc.length)) {
      inner = grp("Offense", "#dbeafe", "#1e40af", off) + grp("Defense", "#fee2e2", "#991b1b", def) + grp("Special Teams", "#ffedd5", "#c2410c", spc);
    } else {
      const tiles = statsToDisplay([a], team.sport).flatMap((k) => {
        const out = [statTile(k, a.stats[k])];
        for (const d of rateDefsFor(team.sport).filter((p) => p.after === k)) {
          const pv = rateValue(d, a.stats);
          if (pv != null) out.push(`<div class="scell"><div class="k">${esc(d.name)}</div><div class="sv">${esc(fmtRateVal(d.fmt, pv))}</div></div>`);
        }
        return out;
      }).join("");
      inner = `<div class="sgrid">${tiles}</div>`;
    }
    return `<div class="acard" data-p="${esc(normName(a.name))}"><div class="nm">${esc(a.name)}</div><div class="pos">${esc(a.position || "")}${a.gradYear ? " · Class of " + esc(String(a.gradYear)) : ""}</div>${inner}</div>`;
  };
  const athletesSection = activeAth.length
    ? `<p class="sub">${activeAth.length} active athletes · tap a card for the full profile</p><div class="acards">${activeAth.map(athleteCard).join("")}</div>`
    : `<div class="empty">No active athletes published yet.</div>`;

  // ── ALL-TIME (sortable leaderboard; SSR default, click → profile) ───────────
  const atPlayers = careerPool.filter((p) => Object.keys(p.stats || {}).length);
  let alltimeSection;
  if (!atPlayers.length) {
    alltimeSection = `<div class="empty">No all-time players published yet.</div>`;
  } else {
    const base = statsToDisplay(atPlayers, team.sport);
    const lead = base.includes("Points") ? "Points" : (base.includes("Rushing Yards") ? "Rushing Yards" : base[0]);
    const sorted = atPlayers.slice().filter((p) => (Number(p.stats[lead]) || 0) > 0).sort((a, b) => (Number(b.stats[lead]) || 0) - (Number(a.stats[lead]) || 0));
    const max = sorted.length ? (Number(sorted[0].stats[lead]) || 1) : 1;
    const ssrRows = sorted.map((p, i) => {
      const v = Number(p.stats[lead]) || 0; const bar = Math.round((v / max) * 100);
      const bd = (p.stateHOF ? "⭐ " : "") + (p.schoolHOF ? "🏛️ " : "");
      return `<tr data-p="${esc(normName(p.name))}"><td class="rank">${i + 1}</td><td><b>${esc(p.name)}</b> ${bd}${p.isCurrent ? '<span class="badge active">Active</span>' : ""}${yearsStr(p) ? `<div style="font-size:11px;color:#9ca3af">${yearsStr(p)}</div>` : ""}</td><td class="num"><b>${v.toLocaleString()}</b></td><td><div style="height:6px;background:#f0f0ee;border-radius:3px"><div style="width:${bar}%;height:100%;background:${p.isCurrent ? "#1a56db" : "#94a3b8"};border-radius:3px"></div></div></td></tr>`;
    }).join("");
    // Sort options: each derived rate (AVG/OBP/… · FG%/…) right after its anchor counting stat.
    const sortOpts = base.flatMap((s) => [s, ...rateDefsFor(team.sport).filter((d) => d.after === s).map((d) => d.name)]);
    const opts = sortOpts.map((s) => `<option value="${esc(s)}"${s === lead ? " selected" : ""}>${esc(s)}</option>`).join("");
    alltimeSection =
      `<div class="ctrls">
        <select id="atstat">${opts}</select>
        <div class="fbtns"><button class="fbtn on" data-filt="all">All players</button><button class="fbtn" data-filt="current">Active</button><button class="fbtn" data-filt="alumni">Alumni</button></div>
        <input id="atq" placeholder="Search player...">
        <span id="atinfo" style="font-size:13px;color:#9ca3af">${sorted.length} players</span>
      </div>
      <div class="gridwrap"><table><thead><tr><th class="rank">#</th><th>Player</th><th class="num" id="atstathd">${esc(lead)}</th><th style="width:30%"></th></tr></thead><tbody id="atbody">${ssrRows}</tbody></table></div>`;
  }

  // ── SEASONS (summary + cumulative coach records + table) ─────────────────────
  let seasonsSection;
  if (!seasonsList.length) {
    seasonsSection = `<div class="empty">No season history published yet.</div>`;
  } else {
    const swr = seasonsList.filter((s) => s.wins != null && s.losses != null);
    const tW = swr.reduce((a, s) => a + (s.wins || 0), 0);
    const tL = swr.reduce((a, s) => a + (s.losses || 0), 0);
    const tT = seasonsList.reduce((a, s) => a + (s.ties || 0), 0);
    const tPct = tW + tL + tT > 0 ? ((tW / (tW + tL + tT)) * 100).toFixed(1) : "—";
    const lW = seasonsList.reduce((a, s) => a + (s.leagueWins || 0), 0);
    const lL = seasonsList.reduce((a, s) => a + (s.leagueLosses || 0), 0);
    const lT = seasonsList.reduce((a, s) => a + (s.leagueTies || 0), 0);
    const lPct = lW + lL + lT > 0 ? ((lW / (lW + lL + lT)) * 100).toFixed(1) : "—";
    const rx = (s, re) => s.notes && re.test(s.notes);
    const champ = seasonsList.filter((s) => rx(s, /league champion|league champ/i)).length;
    const stChamp = seasonsList.filter((s) => rx(s, /state champ|state champion/i)).length;
    const stRU = seasonsList.filter((s) => rx(s, /runner.?up|runner up|2nd place/i)).length;
    const third = seasonsList.filter((s) => rx(s, /3rd place|3rd/i)).length;
    const ff0 = seasonsList.filter((s) => rx(s, /final.?4|final four/i)).length;
    const ee0 = seasonsList.filter((s) => rx(s, /elite.?8|elite eight/i)).length;
    const ss0 = seasonsList.filter((s) => rx(s, /sweet.?16|sweet sixteen/i)).length;
    const po0 = seasonsList.filter((s) => rx(s, /playoff|round of|first round|state first/i)).length;
    const finalFours = ff0 + stChamp + stRU + third;
    const eliteE = ee0 + finalFours; const sweet16 = ss0 + eliteE; const playoffs = po0 + sweet16;
    const card = (ic, v, l, bg, tc, bd) => `<div class="ovcard" style="${bg ? `background:${bg};border-color:${bd}` : ""}"><div class="ic">${ic}</div><div class="v"${tc ? ` style="color:${tc}"` : ""}>${v}</div><div class="l"${tc ? ` style="color:${tc};opacity:.85"` : ""}>${l}</div></div>`;
    const row1 = [["📊", `${tW}-${tL}${tT ? `-${tT}` : ""}`, "Program record"], ["📈", `${tPct}%`, "Win %"], ["🏅", `${lW}-${lL}${lT ? `-${lT}` : ""}`, "League record"], ["📉", `${lPct}%`, "League win %"], ["📅", swr.length, "Seasons"], ["🏆", champ, "League titles"]].map(([i, v, l]) => card(i, v, l)).join("");
    const row2 = [["🏟️", playoffs, "Playoff apps", "#eff6ff", "#1e40af", "#bfdbfe"], ["⭐", sweet16, "Sweet 16s", "#fdf4ff", "#7e22ce", "#e9d5ff"], ["🎖️", eliteE, "Elite 8s", "#f5f3ff", "#5b21b6", "#ddd6fe"], ["🎯", finalFours, "Final Fours", "#f0fdf4", "#166534", "#86efac"], ["🥈", stRU, "Runner-up", "#f8fafc", "#374151", "#e2e8f0"], ["🏅", stChamp, "State titles", "#fef3c7", "#92400e", "#fde68a"]].map(([i, v, l, bg, tc, bd]) => card(i, v, l, bg, tc, bd)).join("");

    const mostRecent = seasonsList.filter((s) => s.coach).slice().sort((a, b) => String(b.season).localeCompare(String(a.season)))[0]?.coach || null;
    const cmap = {};
    seasonsList.forEach((s) => {
      if (!s.coach) return;
      if (!cmap[s.coach]) cmap[s.coach] = { wins: 0, losses: 0, ties: 0, leagueWins: 0, leagueLosses: 0, leagueTies: 0, seasons: 0, titles: 0, firstYear: s.season, lastYear: s.season };
      const r = cmap[s.coach]; r.seasons++;
      if (s.wins != null) r.wins += s.wins; if (s.losses != null) r.losses += s.losses; if (s.ties != null) r.ties += s.ties;
      if (s.leagueWins != null) r.leagueWins += s.leagueWins; if (s.leagueLosses != null) r.leagueLosses += s.leagueLosses; if (s.leagueTies != null) r.leagueTies += s.leagueTies;
      if (s.notes && /champion/i.test(s.notes)) r.titles++;
      if (String(s.season) < String(r.firstYear)) r.firstYear = s.season;
      if (String(s.season) > String(r.lastYear)) r.lastYear = s.season;
    });
    const coachCards = Object.entries(cmap).sort((a, b) => b[1].wins - a[1].wins).map(([coach, rec]) => {
      const cur = coach === mostRecent;
      const pct = rec.wins + rec.losses + (rec.ties||0) > 0 ? ((rec.wins / (rec.wins + rec.losses + (rec.ties||0))) * 100).toFixed(1) : "—";
      const lpct = rec.leagueWins + rec.leagueLosses + (rec.leagueTies||0) > 0 ? ((rec.leagueWins / (rec.leagueWins + rec.leagueLosses + (rec.leagueTies||0))) * 100).toFixed(1) : "—";
      const yr = String(rec.firstYear) === String(rec.lastYear) ? esc(String(rec.firstYear)) : esc(String(rec.firstYear)) + " – " + esc(String(rec.lastYear));
      return `<div style="padding:16px 20px;border-bottom:1px solid #f3f0ea;${cur ? "background:#eff6ff;border-left:4px solid #1a56db" : "border-left:4px solid transparent"}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:700;font-size:15px;color:#111">${esc(coach)}</div>${cur ? '<span style="background:#1a56db;color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">Current</span>' : ""}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px">${yr} · ${rec.seasons} season${rec.seasons !== 1 ? "s" : ""}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:${cur ? "#dbeafe" : "#f9fafb"};border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:#9ca3af">Overall</div><div style="font-weight:700;font-size:16px;color:#111">${rec.wins}-${rec.losses}${rec.ties ? `-${rec.ties}` : ""}</div><div style="font-size:11px;color:#6b7280">${pct}%</div></div>
          <div style="background:${cur ? "#dbeafe" : "#f9fafb"};border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:#9ca3af">League</div><div style="font-weight:700;font-size:16px;color:#111">${rec.leagueWins}-${rec.leagueLosses}${rec.leagueTies ? `-${rec.leagueTies}` : ""}</div><div style="font-size:11px;color:#6b7280">${lpct}%</div></div>
        </div>
        ${rec.titles > 0 ? `<div style="font-size:11px;color:#92400e;margin-top:8px">🏆 ${rec.titles} league title${rec.titles !== 1 ? "s" : ""}</div>` : ""}
      </div>`;
    }).join("");

    const yr = (s) => (String(s.season || "").match(/\d{4}/) || ["0"])[0];
    const tableRows = seasonsList.slice().sort((a, b) => Number(yr(b)) - Number(yr(a))).map((s, i) => {
      const rec = (s.wins != null) ? `${s.wins}-${s.losses ?? "?"}${s.ties ? `-${s.ties}` : ""}` : "—";
      const lrec = (s.leagueWins != null) ? `${s.leagueWins}-${s.leagueLosses ?? "?"}${s.leagueTies ? `-${s.leagueTies}` : ""}` : "—";
      const wp = s.winPct != null ? s.winPct + "%" : "—";
      const isChamp = s.notes && /league champion/i.test(s.notes);
      const note = s.notes ? `<span style="background:${isChamp ? "#fef3c7" : "#eff6ff"};color:${isChamp ? "#92400e" : "#1e40af"};border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600">${isChamp ? "🏆 " : ""}${esc(s.notes)}</span>` : "";
      return `<tr style="background:${isChamp ? "#fffbeb" : i % 2 ? "#fafaf8" : "#fff"}"><td style="font-weight:700">${esc(s.season || "")}</td><td>${esc(s.coach || "—")}</td><td class="num" style="font-weight:600">${rec}</td><td class="num" style="color:#6b7280">${lrec}</td><td class="num">${wp}</td><td>${note}</td></tr>`;
    }).join("");

    seasonsSection =
      `<div class="ovcards" style="grid-template-columns:repeat(6,1fr)">${row1}</div>
       <div class="ovcards" style="grid-template-columns:repeat(6,1fr)">${row2}</div>
       <h3>Head coaches</h3>
       <div style="background:#fff;border:1px solid #e8e4dd;border-radius:12px;overflow:hidden"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${coachCards}</div></div>
       <h3>Season by season</h3>
       <div class="gridwrap"><table><thead><tr><th>Season</th><th>Coach</th><th class="num">Record</th><th class="num">League</th><th class="num">Win %</th><th>Postseason / Notes</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
  }

  // ── HALL OF FAME — INDUCTED ONLY (athletes ⇄ coaches) ───────────────────────
  const inductedAth = careerPool.filter((p) => p.schoolHOF || p.stateHOF)
    .sort((a, b) => (b.stateHOF ? 1 : 0) - (a.stateHOF ? 1 : 0) || a.name.localeCompare(b.name));
  const athCards = inductedAth.length ? inductedAth.map((p) => {
    const badges = (p.stateHOF ? `<span class="badge state">State HOF</span>` : "") + (p.schoolHOF ? `<span class="badge school">School HOF</span>` : "");
    const honors = awardsForHolder(p.name, "player", awards);
    const hs = honors.length ? `<div style="font-size:11px;color:#6b7280;margin-top:8px">${honors.map((h) => esc(awardLabel(h))).join(" · ")}</div>` : "";
    const pts = Number(p.stats?.["Points"]) || 0;
    return `<div class="hcard" data-p="${esc(normName(p.name))}"><div style="font-weight:700">${esc(p.name)}</div>${yearsStr(p) ? `<div style="font-size:12px;color:#6b7280">${yearsStr(p)}</div>` : ""}<div style="margin-top:6px">${badges}</div>${pts ? `<div style="font-size:12px;color:#9ca3af;margin-top:6px">${fmtNum(pts)} career points</div>` : ""}${hs}</div>`;
  }).join("") : `<div class="empty">No athletes have been inducted into the Hall of Fame yet.</div>`;

  // Combine each coach's record across EVERY public program in the school (cross-sport),
  // mirroring the app's "Combine all teams" — so e.g. a coach who led soccer + basketball
  // shows one aggregated HOF record. Falls back to this program if the org lookup is empty.
  const orgTeams = await sb(`public_teams?org_id=eq.${team.org_id}&select=id,coach_hof,sport`);
  const orgIds = orgTeams.map((p) => p.id).filter(Boolean);
  const sportById = {}; orgTeams.forEach((p) => { sportById[p.id] = prettySport(p.sport); });
  // A coach inducted in ANY program at the school counts as inducted everywhere (cross-sport).
  const inducted = new Set();
  orgTeams.forEach((p) => Object.keys(p.coach_hof || {}).forEach((n) => { if ((p.coach_hof || {})[n]) inducted.add(normName(n)); }));
  const orgSeasonsRaw = orgIds.length
    ? await sb(`seasons?program_id=in.(${orgIds.join(",")})&select=program_id,season,wins,losses,ties,league_wins,league_losses,league_ties,coach,notes`)
    : [];
  const orgSeasons = (orgSeasonsRaw.length ? orgSeasonsRaw : seasonsRaw).map((s) => ({
    season: s.season, wins: s.wins, losses: s.losses, ties: s.ties, leagueWins: s.league_wins, leagueLosses: s.league_losses, leagueTies: s.league_ties,
    coach: s.coach, notes: s.notes, _team: sportById[s.program_id] || prettySport(team.sport),
  }));
  // Coach awards across every program, grouped by coach + sport, for the per-sport breakdown.
  const orgAwardsRaw = orgIds.length ? await sb(`awards?program_id=in.(${orgIds.join(",")})&scope=eq.coach&select=program_id,kind,level,holder_name,season`) : [];
  const awBySport = {};
  orgAwardsRaw.forEach((a) => { const k = normName(a.holder_name) + "|" + (sportById[a.program_id] || ""); (awBySport[k] = awBySport[k] || []).push(a); });
  const coaches = buildCoachStats(orgSeasons);
  const inductedCoaches = coaches.filter((c) => inducted.has(normName(c.name))).sort((a, b) => b.wins - a.wins);
  const coachCards2 = inductedCoaches.length ? inductedCoaches.map((c) => {
    const tot = c.wins + c.losses + (c.ties || 0); const pct = tot > 0 ? Math.round((c.wins / tot) * 1000) / 10 : null;
    const yr = String(c.firstYear) === String(c.lastYear) ? esc(String(c.firstYear)) : esc(String(c.firstYear)) + "–" + esc(String(c.lastYear));
    const coy = awardsForHolder(c.name, "coach", awards);
    const ch = coy.length ? `<div style="font-size:11px;color:#6b7280;margin-top:6px">${coy.map((a) => esc(awardLabel(a))).join(" · ")}</div>` : "";
    // Per-sport breakdown (e.g. Boys Basketball vs Girls Soccer) when a coach led multiple teams.
    const byTeam = c.byTeam || {}; const teams = Object.keys(byTeam);
    const breakdown = teams.length > 1
      ? `<div style="margin-top:8px;border-top:1px solid #f3f0ea;padding-top:6px">${teams.sort().map((tm) => {
          const b = byTeam[tm];
          const aw = awBySport[normName(c.name) + "|" + tm] || [];
          const awStr = aw.length ? `<div style="font-size:10px;color:#7c3aed;margin-top:1px">🏅 ${aw.map((a) => esc(awardLabel(a))).join(" · ")}</div>` : "";
          return `<div style="padding:3px 0"><div style="font-size:11px;color:#6b7280;display:flex;justify-content:space-between;gap:8px"><span>${esc(tm)}</span><span style="color:#111;font-weight:600">${b.wins}-${b.losses}${b.ties ? `-${b.ties}` : ""}</span></div>${awStr}</div>`;
        }).join("")}</div>`
      : "";
    return `<div class="hcard"><div style="font-weight:700">${esc(c.name)} <span class="badge school">Inducted</span></div><div style="font-size:12px;color:#6b7280">${yr} · ${c.seasons} season${c.seasons !== 1 ? "s" : ""}</div><div style="font-size:14px;font-weight:600;color:#111;margin:6px 0 2px">${c.wins}–${c.losses}${c.ties ? `–${c.ties}` : ""}${pct != null ? ` (${pct}%)` : ""}</div>${c.titles ? `<div style="font-size:11px;color:#92400e">🏆 ${c.titles} league title${c.titles !== 1 ? "s" : ""}</div>` : ""}${breakdown}${ch}</div>`;
  }).join("") : `<div class="empty">No coaches have been inducted into the Hall of Fame yet.</div>`;

  const hofSection = `
    <input type="radio" name="hofview" id="hv-ath" class="hvin" checked>
    <input type="radio" name="hofview" id="hv-coach" class="hvin">
    <div class="hvbar"><label for="hv-ath">👤 Athletes</label><label for="hv-coach">🎓 Coaches</label></div>
    <div class="hvpanel hv-ath"><div class="hcards">${athCards}</div></div>
    <div class="hvpanel hv-coach"><div class="hcards">${coachCards2}</div></div>`;

  // ── Header + tabs ───────────────────────────────────────────────────────────
  const SPORT_EMOJI = /basket/i.test(team.sport) ? "🏀" : /foot/i.test(team.sport) ? "🏈" : /soccer/i.test(team.sport) ? "⚽" : /base/i.test(team.sport) ? "⚾" : /volley/i.test(team.sport) ? "🏐" : /track|cross/i.test(team.sport) ? "🏃" : "🏆";
  const logoColor = team.primary_color || "#1a3a6b";
  const logoBox = team.logo_url
    ? `<img class="logo" src="${esc(team.logo_url)}" alt="" style="object-fit:contain;background:${esc(logoColor)};padding:4px"/>`
    : `<div class="logo" style="background:${esc(logoColor)}">${SPORT_EMOJI}</div>`;
  const counts = [team.mascot ? esc(team.mascot) : "", esc(sport), `${careerPool.length} all-time players`, `${allRecords.length} records`, place ? esc(place) : ""].filter(Boolean).join(" · ");

  const title = `${school} ${sport} — Records & Hall of Fame | RaftersIQ`;
  const description = `All-time ${sport.toLowerCase()} records, Hall of Fame, athletes, season history and honors for ${school}${place ? ` (${place})` : ""}. Powered by RaftersIQ.`;
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

  // Embedded data + JS (leaderboard sort + click-to-open profile modal)
  const profJson = JSON.stringify(profiles).replace(/</g, "\\u003c");
  // Sport-canonical order FIRST, then the global order — mirrors byStatOrder (football/baseball).
  const soJson = JSON.stringify((SPORT_ORDER[team.sport] || []).concat(STAT_ORDER));
  const pgJson = JSON.stringify(PERGAME_DEFS.map((d) => ({ n: d.name, stat: d.stat })));
  // Derived-rate defs with their serializable formula specs — evaluated in-browser by rv().
  // `mc` carries the program's effective CAREER minimum (override or default) so the in-browser
  // leaderboard qualifies players with the same cutoff the records use.
  const rdJson = JSON.stringify(rateDefsFor(team.sport).map((d) => ({ n: d.name, s: d.short, after: d.after, fmt: d.fmt, q: d.qualStat, mc: minsFor(d, team.record_minimums).career, ab: d.noteAbbr, lo: !!d.lowerIsBetter, spec: d.spec })));
  const dsJson = JSON.stringify(DISPLAY_STATS[team.sport] || []);
  const pColor = JSON.stringify(logoColor);
  const script =
    `var PROF=${profJson};var PCOLOR=${pColor};var SO=${soJson};var PG=${pgJson};var RD=${rdJson};var DS=${dsJson};` +
    `(function(){function e(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}` +
    `function ord(ks){return ks.slice().sort(function(a,b){var i=SO.indexOf(a),j=SO.indexOf(b);if(i!==-1&&j!==-1)return i-j;if(i!==-1)return -1;if(j!==-1)return 1;return a<b?-1:a>b?1:0;});}` +
    `function pgv(s,k){var v=Number(s[k]),g=Number(s["Games Played"]);if(!g||g<=0||isNaN(v))return null;return Math.round(v/g*10)/10;}` +
    `function pcv(s,m,a){var mm=Number(s[m]),aa=Number(s[a]);if(!aa||aa<=0||isNaN(mm))return null;return Math.round(mm/aa*1000)/10;}` +
    `function gv(s,k){var v=Number(s[k]);return isNaN(v)?0:v;}` +
    `function rv(s,d){var sp=d.spec;if(sp.kind==="pct")return pcv(s,sp.made,sp.att);if(sp.kind==="ratio"){var n=0,m=0,i;for(i=0;i<sp.num.length;i++)n+=sp.num[i][1]*gv(s,sp.num[i][0]);for(i=0;i<sp.den.length;i++)m+=sp.den[i][1]*gv(s,sp.den[i][0]);return m>0?n/m:null;}if(sp.kind==="ops"){var ab=gv(s,"At Bats");if(ab<=0)return null;var od=ab+gv(s,"Walk (BB)")+gv(s,"Hit By Pitch")+gv(s,"Sacrifice Fly");var ob=od>0?(gv(s,"Hits")+gv(s,"Walk (BB)")+gv(s,"Hit By Pitch"))/od:0;var sl=(gv(s,"Hits")+gv(s,"Doubles")+2*gv(s,"Triples")+3*gv(s,"Home Runs"))/ab;return ob+sl;}if(sp.kind==="era"){var ipv=gv(s,"Innings Pitched");var ip=Math.floor(ipv)+Math.round((ipv-Math.floor(ipv))*10)/3;var er=gv(s,"Earned Runs");return (ip>0&&er>0)?7*er/ip:null;}return null;}` +
    `function fmtR(f,v){if(v==null||isNaN(v))return "—";if(f==="pct")return v+"%";if(f==="era2")return Number(v).toFixed(2);var s=Number(v).toFixed(3);return s.charAt(0)==="0"?s.slice(1):s;}` +
    `function rdOf(n){for(var i=0;i<RD.length;i++)if(RD[i].n===n)return RD[i];return null;}` +
    `var ATL=Object.keys(PROF).filter(function(k){return PROF[k].at;}).map(function(k){var p=PROF[k];return {k:k,n:p.n,y:p.y,a:p.a,sh:p.sh,st:p.st,s:p.s};});` +
    `function rankOf(stat,val){if(!(val>0))return null;var c=1;for(var i=0;i<ATL.length;i++){if((Number(ATL[i].s[stat])||0)>val)c++;}return c;}` +
    `var sel=document.getElementById("atstat"),q=document.getElementById("atq"),tb=document.getElementById("atbody"),info=document.getElementById("atinfo"),hd=document.getElementById("atstathd"),f="all";` +
    `function row(p,i,st,mx,d){var v=d?(rv(p.s,d)||0):(Number(p.s[st])||0),bd=(p.st?"⭐ ":"")+(p.sh?"🏛️ ":"");var b=(d&&d.lo)?(v>0?Math.round(mx/v*100):100):Math.round(v/(mx||1)*100);var vs=d?fmtR(d.fmt,v):v.toLocaleString();return '<tr data-p="'+e(p.k)+'"><td class="rank">'+(i+1)+'</td><td><b>'+e(p.n)+"</b> "+bd+(p.a?'<span class="badge active">Active</span>':"")+(p.y?'<div style="font-size:11px;color:#9ca3af">'+e(p.y)+"</div>":"")+'</td><td class="num"><b>'+vs+'</b></td><td><div style="height:6px;background:#f0f0ee;border-radius:3px"><div style="width:'+b+'%;height:100%;background:'+(p.a?"#1a56db":"#94a3b8")+';border-radius:3px"></div></div></td></tr>';}` +
    `function lb(){if(!sel)return;var st=sel.value,d=rdOf(st),t=(q.value||"").toLowerCase();var vof=function(p){if(!d)return Number(p.s[st])||0;if(gv(p.s,d.q)<d.mc)return null;return rv(p.s,d);};var rows=ATL.filter(function(p){if(f==="current"&&!p.a)return false;if(f==="alumni"&&p.a)return false;if(t&&p.n.toLowerCase().indexOf(t)<0)return false;var v=vof(p);return (d&&d.lo)?v!=null:(v||0)>0;}).sort(function(x,y){var a=vof(x),b=vof(y);if(d&&d.lo)return (a==null?1/0:a)-(b==null?1/0:b);return (b||0)-(a||0);});var mx=rows.length?vof(rows[0]):1;if(mx==null)mx=1;hd.textContent=st;tb.innerHTML=rows.map(function(p,i){return row(p,i,st,mx,d);}).join("");info.textContent=rows.length+" players"+(d?" · min "+d.mc+" "+d.q:"");}` +
    `if(sel){sel.onchange=lb;q.oninput=lb;var bs=document.querySelectorAll(".p-alltime .fbtn");for(var i=0;i<bs.length;i++){(function(btn){btn.onclick=function(){f=btn.getAttribute("data-filt");for(var j=0;j<bs.length;j++)bs[j].className=bs[j].getAttribute("data-filt")===f?"fbtn on":"fbtn";lb();};})(bs[i]);}lb();}` +
    `function tile(l,v,sub){return '<div class="ptile"><div class="pl">'+e(l)+'</div><div class="pv">'+e(String(v))+'</div><div class="psub">'+e(sub)+"</div></div>";}` +
    `function tiles(p){var pr=Object.keys(p.s).filter(function(k){return Number(p.s[k])>0;});var ks=ord(DS.concat(pr).filter(function(k,i,a){return a.indexOf(k)===i;}));var out="";ks.forEach(function(stat){var raw=p.s[stat];var has=raw!=null&&Number(raw)>0;var val=Number(raw)||0;var r=has?rankOf(stat,val):null;var rs=r===1?"🥇 All-time leader":r===2?"🥈 #2 all-time":r===3?"🥉 #3 all-time":(r?("#"+r+" all-time"):"");out+=tile(stat.toUpperCase(),has?val.toLocaleString():"—",rs);var i;for(i=0;i<RD.length;i++){var d=RD[i];if(d.after!==stat)continue;var dv=rv(p.s,d);if(dv==null)continue;var nt=d.spec.kind==="pct"?(gv(p.s,d.spec.made).toLocaleString()+"/"+gv(p.s,d.spec.att).toLocaleString()):(gv(p.s,d.q).toLocaleString()+" "+d.ab);out+=tile(d.n.toUpperCase(),fmtR(d.fmt,dv),nt);}});return out;}` +
    `function seas(p){if(!p.ss||!p.ss.length)return "";var cols=ord(Object.keys(p.s).filter(function(k){return Number(p.s[k])>0;}));var ents=[];cols.forEach(function(c){ents.push({c:c});for(var i=0;i<RD.length;i++)if(RD[i].after===c)ents.push({d:RD[i]});});var head="<th>Season</th>"+ents.map(function(en){return '<th class="num">'+e(en.d?en.d.s:en.c)+"</th>";}).join("");var rs=p.ss.slice().sort(function(a,b){return String(b.season)<String(a.season)?-1:1;}).map(function(r){return "<tr><td>"+e(r.season)+"</td>"+ents.map(function(en){if(en.d){var dv=rv(r.s,en.d);return '<td class="num">'+(dv!=null?fmtR(en.d.fmt,dv):"—")+"</td>";}var v=r.s[en.c];return '<td class="num">'+(v!=null&&v!==""?Number(v).toLocaleString():"—")+"</td>";}).join("")+"</tr>";}).join("");var tot='<tr style="font-weight:700;background:#fafaf8"><td>Career</td>'+ents.map(function(en){if(en.d){var dv=rv(p.s,en.d);return '<td class="num">'+(dv!=null?fmtR(en.d.fmt,dv):"—")+"</td>";}return '<td class="num">'+(Number(p.s[en.c])||0).toLocaleString()+"</td>";}).join("")+"</tr>";return '<h3 style="margin:18px 0 8px;font-size:14px">Season by season</h3><div style="overflow-x:auto"><table><thead><tr>'+head+"</tr></thead><tbody>"+rs+tot+"</tbody></table></div>";}` +
    `function recl(p){if(!p.rec||!p.rec.length)return "";return '<h3 style="margin:18px 0 8px;font-size:14px">School records held</h3><div>'+p.rec.map(function(r){return '<div style="font-size:13px;color:#374151;padding:3px 0">🏅 <b>'+e(r.n)+"</b> "+(r.v?'<span style="color:#9ca3af">('+e(r.v)+")</span> ":"")+"— "+e(String(r.val))+"</div>";}).join("")+"</div>";}` +
    `function openP(k){var p=PROF[k];if(!p)return;var ini=p.n.split(" ").map(function(w){return w?w.charAt(0):"";}).join("").slice(0,2).toUpperCase();var bdg=(p.a?'<span class="hbadge">Active</span> ':"")+(p.sh?"🏛️ ":"")+(p.st?"⭐":"");var chips="";if(p.sh)chips+='<div class="hofchip" style="background:#fef9c3;border-color:#fde68a;color:#92400e">🏛️ School Hall of Fame</div>';if(p.st)chips+='<div class="hofchip" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">⭐ State Hall of Fame</div>';var h='<div class="pmhd" style="background:'+PCOLOR+'"><button class="pmx" type="button">✕</button><div style="display:flex;align-items:center;gap:16px"><div class="pmav">'+e(ini)+'</div><div><div class="pmname">'+e(p.n)+" "+bdg+'</div><div class="pmsub">'+(p.y?e(p.y):"")+(p.pos?" · "+e(p.pos):"")+"</div></div></div></div>"+'<div class="pmbody">'+(chips?'<div class="hofchips">'+chips+"</div>":"")+'<h3 style="margin:0 0 10px;font-size:14px">Career statistics &amp; all-time rank</h3><div class="ptiles">'+tiles(p)+"</div>"+seas(p)+recl(p)+"</div>";document.getElementById("pmcard").innerHTML=h;document.getElementById("pmodal").style.display="flex";}` +
    `var ov=document.getElementById("pmodal");document.addEventListener("click",function(ev){var t=ev.target;if(!t)return;if(t.closest&&t.closest(".pmx")){if(ov)ov.style.display="none";return;}if(t===ov){ov.style.display="none";return;}var el=t.closest&&t.closest("[data-p]");if(el){openP(el.getAttribute("data-p"));}});})();`;

  const body = `
    <div class="phead">${logoBox}<div><h1 style="margin:0;font-size:26px">${esc(school)}</h1><div class="meta">${counts}</div></div></div>
    <div class="tabs">
      <input type="radio" name="tab" id="t-overview" class="tabin" checked>
      <input type="radio" name="tab" id="t-athletes" class="tabin">
      <input type="radio" name="tab" id="t-records" class="tabin">
      <input type="radio" name="tab" id="t-alltime" class="tabin">
      <input type="radio" name="tab" id="t-seasons" class="tabin">
      <input type="radio" name="tab" id="t-hof" class="tabin">
      <nav class="tabbar">
        <label for="t-overview">Overview</label>
        <label for="t-athletes">Athletes</label>
        <label for="t-records">Records</label>
        <label for="t-alltime">All-Time</label>
        <label for="t-seasons">Seasons</label>
        <label for="t-hof">🏛️ HOF</label>
      </nav>
      <section class="panel p-overview"><h2>${esc(school)} ${esc(sport)}</h2><p class="sub">Program at a glance.</p>${overviewSection}</section>
      <section class="panel p-athletes"><h2>Athletes</h2>${athletesSection}</section>
      <section class="panel p-records"><h2>School Records</h2><p class="sub">Every record by stat, variant, holder &amp; year.</p>${recordsSection}</section>
      <section class="panel p-alltime"><h2>All-Time Program History</h2><p class="sub">Pick a stat to rank every player — tap a name for their full profile.</p>${alltimeSection}</section>
      <section class="panel p-seasons"><h2>Season History</h2><p class="sub">Year-by-year results with cumulative coach records.</p>${seasonsSection}</section>
      <section class="panel p-hof"><h2>Hall of Fame</h2><p class="sub">Inducted athletes &amp; coaches — use the toggle to switch.</p>${hofSection}</section>
    </div>
    <div id="pmodal"><div id="pmcard"></div></div>
    <script>${script}</script>
  `;

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
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
