// GET /teams/:slug  → server-rendered, READ-ONLY record book for one program.
// Mirrors the in-app dashboard: Overview / Athletes / Records / All-Time / Seasons / HOF
// (JS-free CSS tabs; All-Time gets a sprinkle of vanilla JS for live stat-sorting).
import {
  sb, esc, prettySport, fmtNum, htmlShell, SITE,
  byStatOrder, allStatsFor, PCT_DEFS, shootingPct, pctRecordsFrom,
  PERGAME_DEFS, perGame, pergameRecordsFrom,
  calcProgramHofScore, buildCoachStats, calcCoachHofScore, hofTier,
  playerAwardBonus, coachAwardBonus, awardsForHolder, awardLabel,
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
    season: s.season, wins: s.wins, losses: s.losses, leagueWins: s.league_wins, leagueLosses: s.league_losses,
    coach: s.coach, winPct: s.win_pct, notes: s.notes,
  }));

  const sport = prettySport(team.sport);
  const school = team.school_name || team.name || "Team";
  const place = [team.city, team.state].filter(Boolean).join(", ");
  const isFootball = String(team.sport || "").toLowerCase().includes("football");
  const yearsStr = (p) => p.firstYear && p.lastYear
    ? (String(p.firstYear) === String(p.lastYear) ? esc(String(p.firstYear)) : esc(String(p.firstYear)) + "–" + esc(String(p.lastYear)))
    : (p.gradYear ? "Class of " + esc(String(p.gradYear)) : "");
  const statTile = (k, v) => `<div class="scell"><div class="k">${esc(k)}</div><div class="sv">${typeof v === "number" ? v.toLocaleString() : esc(v)}</div></div>`;

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  const activeAth = athletes.filter((a) => a.isActive);
  const ovCards = [
    ["👤", activeAth.length, "Active athletes"],
    ["🏆", careerPool.length, "All-time players"],
    ["📋", storedRecords.length, "Records on file"],
    ["📅", seasonsList.length, "Seasons tracked"],
  ].map(([ic, v, l]) => `<div class="ovcard"><div class="ic">${ic}</div><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  let ovTable = `<div class="empty">No active roster stats yet.</div>`;
  if (activeAth.length) {
    const base = allStatsFor(activeAth);
    const cols = []; for (const c of base) { cols.push({ stat: c }); const d = PCT_DEFS.find((p) => p.att === c); if (d) cols.push({ pct: d }); }
    if (cols.length) {
      const rows = activeAth.slice().sort((a, b) => a.name.localeCompare(b.name));
      const head = `<th class="sticky">Athlete</th>` + cols.map((c) => `<th class="c">${esc(c.pct ? c.pct.short : c.stat)}</th>`).join("");
      const tb = rows.map((a, i) => {
        const rbg = i % 2 ? "#fafaf8" : "#fff";
        const cells = cols.map((c) => {
          const v = c.pct ? shootingPct(a.stats, c.pct.made, c.pct.att) : a.stats[c.stat];
          const has = v != null && v !== "";
          return `<td class="c" style="color:${has ? "#111" : "#d1d5db"}">${c.pct ? (v != null ? v + "%" : "—") : (has ? fmtNum(v) : "—")}</td>`;
        }).join("");
        return `<tr style="background:${rbg}"><td class="sticky" style="background:${rbg}"><div style="font-weight:600;color:#111">${esc(a.name)}</div><div style="font-size:11px;color:#9ca3af">${esc(a.position || "")}${a.gradYear ? " · Class of " + esc(String(a.gradYear)) : ""}</div></td>${cells}</tr>`;
      }).join("");
      ovTable = `<div class="gridwrap"><table><thead><tr>${head}</tr></thead><tbody>${tb}</tbody></table></div>`;
    }
  }
  const overviewSection = `<div class="ovcards">${ovCards}</div><h3>Career stats · active roster</h3>${ovTable}`;

  // ── ATHLETES (active roster cards) ──────────────────────────────────────────
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
    const twoWay = isFootball && ((off.length && def.length) || spc.length);
    if (twoWay) {
      inner = grp("Offense", "#dbeafe", "#1e40af", off) + grp("Defense", "#fee2e2", "#991b1b", def) + grp("Special Teams", "#ffedd5", "#c2410c", spc);
    } else {
      const tiles = Object.entries(a.stats).sort(([x], [y]) => byStatOrder(x, y)).flatMap(([k, v]) => {
        const out = [statTile(k, v)];
        const pg = PERGAME_DEFS.find((p) => p.stat === k); const pgv = pg ? perGame(a.stats, pg.stat) : null;
        if (pg && pgv != null) out.push(`<div class="scell"><div class="k">${esc(pg.name)}</div><div class="sv">${pgv}</div></div>`);
        const d = PCT_DEFS.find((p) => p.att === k); const pv = d ? shootingPct(a.stats, d.made, d.att) : null;
        if (d && pv != null) out.push(`<div class="scell"><div class="k">${esc(d.name)}</div><div class="sv">${pv}%</div></div>`);
        return out;
      }).join("");
      inner = `<div class="sgrid">${tiles}</div>`;
    }
    return `<div class="acard"><div class="nm">${esc(a.name)}</div><div class="pos">${esc(a.position || "")}${a.gradYear ? " · Class of " + esc(String(a.gradYear)) : ""}</div>${inner}</div>`;
  };
  const athletesSection = activeAth.length
    ? `<p class="sub">${activeAth.length} active athletes</p><div class="acards">${activeAth.map(athleteCard).join("")}</div>`
    : `<div class="empty">No active athletes published yet.</div>`;

  // ── RECORDS (stored + auto %/per-game) ──────────────────────────────────────
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
  const recordsSection = !allRecords.length
    ? `<div class="empty">No school records published yet.</div>`
    : Object.keys(byStat).sort(byStatOrder).map((sn) => {
        const recs = byStat[sn].slice().sort((a, b) => ((PCT_PARENT[a.statName] ? 100 : 0) + vIdx(a.variant)) - ((PCT_PARENT[b.statName] ? 100 : 0) + vIdx(b.variant)));
        const groups = []; const seen = {};
        for (const r of recs) { const k = r.statName + "|" + r.variant + "|" + r.value; if (seen[k] != null) groups[seen[k]].push(r); else { seen[k] = groups.length; groups.push([r]); } }
        const tiles = groups.map((g) => {
          const rec = g[0]; const isPct = !!PCT_PARENT[rec.statName];
          const holders = g.filter((r) => r.holderName).map((r) => `<div class="holder">🏅 ${esc(r.holderName)}${r.holderYear ? ` · ${esc(String(r.holderYear))}` : ""}</div>`).join("");
          return `<div class="tile"><div class="top"><span class="vlabel">${isPct ? "Best %" : esc(rec.variant)}</span><span class="val">${isPct ? esc(String(rec.value)) + "%" : fmtNum(rec.value)}</span></div>${holders}</div>`;
        }).join("");
        return `<div class="statcard"><div class="hd">${esc(sn)}</div><div class="tiles">${tiles}</div></div>`;
      }).join("");

  // ── ALL-TIME (sortable leaderboard; SSR default + vanilla-JS re-sort) ────────
  const atPlayers = careerPool.filter((p) => Object.keys(p.stats || {}).length);
  let alltimeSection;
  if (!atPlayers.length) {
    alltimeSection = `<div class="empty">No all-time players published yet.</div>`;
  } else {
    const base = allStatsFor(atPlayers);
    const lead = base.includes("Points") ? "Points" : (base.includes("Rushing Yards") ? "Rushing Yards" : base[0]);
    const data = atPlayers.map((p) => ({ n: p.name, y: yearsStr(p), a: !!p.isCurrent, sh: !!p.schoolHOF, st: !!p.stateHOF, s: p.stats }));
    const sorted = data.slice().filter((p) => (Number(p.s[lead]) || 0) > 0).sort((a, b) => (Number(b.s[lead]) || 0) - (Number(a.s[lead]) || 0));
    const max = sorted.length ? (Number(sorted[0].s[lead]) || 1) : 1;
    const ssrRows = sorted.map((p, i) => {
      const v = Number(p.s[lead]) || 0; const bar = Math.round((v / max) * 100);
      const bd = (p.st ? "⭐ " : "") + (p.sh ? "🏛️ " : "");
      return `<tr><td class="rank">${i + 1}</td><td><b>${esc(p.n)}</b> ${bd}${p.a ? '<span class="badge active">Active</span>' : ""}${p.y ? `<div style="font-size:11px;color:#9ca3af">${p.y}</div>` : ""}</td><td class="num"><b>${v.toLocaleString()}</b></td><td><div style="height:6px;background:#f0f0ee;border-radius:3px"><div style="width:${bar}%;height:100%;background:${p.a ? "#1a56db" : "#94a3b8"};border-radius:3px"></div></div></td></tr>`;
    }).join("");
    const opts = base.map((s) => `<option value="${esc(s)}"${s === lead ? " selected" : ""}>${esc(s)}</option>`).join("");
    const atJson = JSON.stringify(data).replace(/</g, "\\u003c");
    alltimeSection =
      `<div class="ctrls">
        <select id="atstat">${opts}</select>
        <div class="fbtns"><button class="fbtn on" data-filt="all">All players</button><button class="fbtn" data-filt="current">Active</button><button class="fbtn" data-filt="alumni">Alumni</button></div>
        <input id="atq" placeholder="Search player...">
        <span id="atinfo" style="font-size:13px;color:#9ca3af">${sorted.length} players</span>
      </div>
      <div class="gridwrap"><table><thead><tr><th class="rank">#</th><th>Player</th><th class="num" id="atstathd">${esc(lead)}</th><th style="width:30%"></th></tr></thead><tbody id="atbody">${ssrRows}</tbody></table></div>
      <script>var ATP=${atJson};(function(){var d=ATP,sel=document.getElementById("atstat"),q=document.getElementById("atq"),body=document.getElementById("atbody"),info=document.getElementById("atinfo"),hd=document.getElementById("atstathd"),f="all";function e(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}function r(){var st=sel.value,t=(q.value||"").toLowerCase();var rows=d.filter(function(p){if(f==="current"&&!p.a)return false;if(f==="alumni"&&p.a)return false;if(t&&p.n.toLowerCase().indexOf(t)<0)return false;return (Number(p.s[st])||0)>0;}).sort(function(x,y){return (Number(y.s[st])||0)-(Number(x.s[st])||0);});var mx=rows.length?Number(rows[0].s[st])||1:1;hd.textContent=st;body.innerHTML=rows.map(function(p,i){var v=Number(p.s[st])||0,b=Math.round(v/mx*100),bd=(p.st?"⭐ ":"")+(p.sh?"🏛️ ":"");return '<tr><td class="rank">'+(i+1)+'</td><td><b>'+e(p.n)+"</b> "+bd+(p.a?'<span class="badge active">Active</span>':"")+(p.y?'<div style="font-size:11px;color:#9ca3af">'+e(p.y)+"</div>":"")+'</td><td class="num"><b>'+v.toLocaleString()+"</b></td><td><div style=\\"height:6px;background:#f0f0ee;border-radius:3px\\"><div style=\\"width:"+b+"%;height:100%;background:"+(p.a?"#1a56db":"#94a3b8")+';border-radius:3px"></div></div></td></tr>';}).join("");info.textContent=rows.length+" players";}sel.onchange=r;q.oninput=r;var bs=document.querySelectorAll(".p-alltime .fbtn");for(var i=0;i<bs.length;i++){(function(btn){btn.onclick=function(){f=btn.getAttribute("data-filt");for(var j=0;j<bs.length;j++)bs[j].className=bs[j].getAttribute("data-filt")===f?"fbtn on":"fbtn";r();};})(bs[i]);}r();})();</script>`;
  }

  // ── SEASONS (summary + cumulative coach records + table) ─────────────────────
  let seasonsSection;
  if (!seasonsList.length) {
    seasonsSection = `<div class="empty">No season history published yet.</div>`;
  } else {
    const swr = seasonsList.filter((s) => s.wins != null && s.losses != null);
    const tW = swr.reduce((a, s) => a + (s.wins || 0), 0);
    const tL = swr.reduce((a, s) => a + (s.losses || 0), 0);
    const tPct = tW + tL > 0 ? ((tW / (tW + tL)) * 100).toFixed(1) : "—";
    const lW = seasonsList.reduce((a, s) => a + (s.leagueWins || 0), 0);
    const lL = seasonsList.reduce((a, s) => a + (s.leagueLosses || 0), 0);
    const lPct = lW + lL > 0 ? ((lW / (lW + lL)) * 100).toFixed(1) : "—";
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
    const row1 = [["📊", `${tW}-${tL}`, "Program record"], ["📈", `${tPct}%`, "Win %"], ["🏅", `${lW}-${lL}`, "League record"], ["📉", `${lPct}%`, "League win %"], ["📅", swr.length, "Seasons"], ["🏆", champ, "League titles"]].map(([i, v, l]) => card(i, v, l)).join("");
    const row2 = [["🏟️", playoffs, "Playoff apps", "#eff6ff", "#1e40af", "#bfdbfe"], ["⭐", sweet16, "Sweet 16s", "#fdf4ff", "#7e22ce", "#e9d5ff"], ["🎖️", eliteE, "Elite 8s", "#f5f3ff", "#5b21b6", "#ddd6fe"], ["🎯", finalFours, "Final Fours", "#f0fdf4", "#166534", "#86efac"], ["🥈", stRU, "Runner-up", "#f8fafc", "#374151", "#e2e8f0"], ["🏅", stChamp, "State titles", "#fef3c7", "#92400e", "#fde68a"]].map(([i, v, l, bg, tc, bd]) => card(i, v, l, bg, tc, bd)).join("");

    const mostRecent = seasonsList.filter((s) => s.coach).slice().sort((a, b) => String(b.season).localeCompare(String(a.season)))[0]?.coach || null;
    const cmap = {};
    seasonsList.forEach((s) => {
      if (!s.coach) return;
      if (!cmap[s.coach]) cmap[s.coach] = { wins: 0, losses: 0, leagueWins: 0, leagueLosses: 0, seasons: 0, titles: 0, firstYear: s.season, lastYear: s.season };
      const r = cmap[s.coach]; r.seasons++;
      if (s.wins != null) r.wins += s.wins; if (s.losses != null) r.losses += s.losses;
      if (s.leagueWins != null) r.leagueWins += s.leagueWins; if (s.leagueLosses != null) r.leagueLosses += s.leagueLosses;
      if (s.notes && /champion/i.test(s.notes)) r.titles++;
      if (String(s.season) < String(r.firstYear)) r.firstYear = s.season;
      if (String(s.season) > String(r.lastYear)) r.lastYear = s.season;
    });
    const coachCards = Object.entries(cmap).sort((a, b) => b[1].wins - a[1].wins).map(([coach, rec]) => {
      const cur = coach === mostRecent;
      const pct = rec.wins + rec.losses > 0 ? ((rec.wins / (rec.wins + rec.losses)) * 100).toFixed(1) : "—";
      const lpct = rec.leagueWins + rec.leagueLosses > 0 ? ((rec.leagueWins / (rec.leagueWins + rec.leagueLosses)) * 100).toFixed(1) : "—";
      const yr = String(rec.firstYear) === String(rec.lastYear) ? esc(String(rec.firstYear)) : esc(String(rec.firstYear)) + " – " + esc(String(rec.lastYear));
      return `<div style="padding:16px 20px;border-bottom:1px solid #f3f0ea;${cur ? "background:#eff6ff;border-left:4px solid #1a56db" : "border-left:4px solid transparent"}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:700;font-size:15px;color:#111">${esc(coach)}</div>${cur ? '<span style="background:#1a56db;color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">Current</span>' : ""}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px">${yr} · ${rec.seasons} season${rec.seasons !== 1 ? "s" : ""}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:${cur ? "#dbeafe" : "#f9fafb"};border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:#9ca3af">Overall</div><div style="font-weight:700;font-size:16px;color:#111">${rec.wins}-${rec.losses}</div><div style="font-size:11px;color:#6b7280">${pct}%</div></div>
          <div style="background:${cur ? "#dbeafe" : "#f9fafb"};border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:#9ca3af">League</div><div style="font-weight:700;font-size:16px;color:#111">${rec.leagueWins}-${rec.leagueLosses}</div><div style="font-size:11px;color:#6b7280">${lpct}%</div></div>
        </div>
        ${rec.titles > 0 ? `<div style="font-size:11px;color:#92400e;margin-top:8px">🏆 ${rec.titles} league title${rec.titles !== 1 ? "s" : ""}</div>` : ""}
      </div>`;
    }).join("");

    const yr = (s) => (String(s.season || "").match(/\d{4}/) || ["0"])[0];
    const tableRows = seasonsList.slice().sort((a, b) => Number(yr(b)) - Number(yr(a))).map((s, i) => {
      const rec = (s.wins != null) ? `${s.wins}-${s.losses ?? "?"}` : "—";
      const lrec = (s.leagueWins != null) ? `${s.leagueWins}-${s.leagueLosses ?? "?"}` : "—";
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

  // ── HALL OF FAME (athletes ⇄ coaches toggle) ────────────────────────────────
  const schoolObj = { allTimeRoster: careerPool, seasons: seasonsList, records: storedRecords };
  const scoredAth = careerPool.map((p) => {
    const score = Math.min(calcProgramHofScore(p, schoolObj) + playerAwardBonus(p.name, awards), 100);
    return { p, score, confirmed: !!(p.schoolHOF || p.stateHOF), honors: awardsForHolder(p.name, "player", awards) };
  }).filter((x) => x.score > 0 || x.confirmed).sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  const athCards = scoredAth.length ? scoredAth.map((s) => {
    const t = hofTier(s.score);
    const badges = (s.p.stateHOF ? `<span class="badge state">State HOF</span>` : "") + (s.p.schoolHOF ? `<span class="badge school">School HOF</span>` : "");
    const honors = s.honors.length ? `<div style="font-size:11px;color:#6b7280;margin-top:8px">${s.honors.map((h) => esc(awardLabel(h))).join(" · ")}</div>` : "";
    return `<div class="hcard"><div class="top"><div><div style="font-weight:700">${esc(s.p.name)}</div>${yearsStr(s.p) ? `<div style="font-size:12px;color:#6b7280">${yearsStr(s.p)}</div>` : ""}</div><div class="sc" style="color:${t.color}">${s.score}</div></div><div style="margin-top:4px"><span class="tier" style="background:${t.bg};color:${t.color}">${t.label}</span> ${badges}</div>${honors}</div>`;
  }).join("") : `<div class="empty">No rated athletes yet.</div>`;

  const coaches = buildCoachStats(seasonsList);
  const scoredCoach = coaches.map((c) => {
    const score = Math.min(calcCoachHofScore(c, coaches) + coachAwardBonus(c.name, awards), 100);
    return { c, score, confirmed: !!(team.coach_hof && team.coach_hof[c.name]), coy: awardsForHolder(c.name, "coach", awards) };
  }).sort((a, b) => b.score - a.score || b.c.wins - a.c.wins);
  const coachHofCards = scoredCoach.length ? scoredCoach.map((s) => {
    const c = s.c; const t = hofTier(s.score);
    const games = c.wins + c.losses; const pct = games > 0 ? Math.round((c.wins / games) * 1000) / 10 : null;
    const yr = String(c.firstYear) === String(c.lastYear) ? esc(String(c.firstYear)) : esc(String(c.firstYear)) + "–" + esc(String(c.lastYear));
    const coy = s.coy.length ? `<div style="font-size:11px;color:#6b7280;margin-top:6px">${s.coy.map((a) => esc(awardLabel(a))).join(" · ")}</div>` : "";
    return `<div class="hcard"><div class="top"><div><div style="font-weight:700">${esc(c.name)}</div><div style="font-size:12px;color:#6b7280">${yr} · ${c.seasons} season${c.seasons !== 1 ? "s" : ""}</div></div><div class="sc" style="color:${t.color}">${s.score}</div></div><div style="font-size:14px;color:#111;margin:6px 0 2px;font-weight:600">${c.wins}–${c.losses}${pct != null ? ` (${pct}%)` : ""}</div><div><span class="tier" style="background:${t.bg};color:${t.color}">${t.label}</span>${s.confirmed ? ' <span class="badge school">Inducted</span>' : ""}</div>${c.titles ? `<div style="font-size:11px;color:#92400e;margin-top:6px">🏆 ${c.titles} league title${c.titles !== 1 ? "s" : ""}</div>` : ""}${coy}</div>`;
  }).join("") : `<div class="empty">No coach data yet — add seasons with coaches.</div>`;

  const hofSection = `
    <input type="radio" name="hofview" id="hv-ath" class="hvin" checked>
    <input type="radio" name="hofview" id="hv-coach" class="hvin">
    <div class="hvbar"><label for="hv-ath">👤 Athletes</label><label for="hv-coach">🎓 Coaches</label></div>
    <div class="hvpanel hv-ath"><div class="hcards">${athCards}</div></div>
    <div class="hvpanel hv-coach"><div class="hcards">${coachHofCards}</div></div>`;

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
      <section class="panel p-alltime"><h2>All-Time Program History</h2><p class="sub">Pick a stat to rank every player who's ever suited up.</p>${alltimeSection}</section>
      <section class="panel p-seasons"><h2>Season History</h2><p class="sub">Year-by-year results with cumulative coach records.</p>${seasonsSection}</section>
      <section class="panel p-hof"><h2>Hall of Fame</h2><p class="sub">Candidacy &amp; inductees — toggle athletes and coaches.</p>${hofSection}</section>
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
