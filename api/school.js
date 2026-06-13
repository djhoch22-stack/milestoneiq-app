// GET /school/:slug  → server-rendered hub listing every PUBLIC program for one school, with a Hall of
// Fame tab. Clicking an inductee opens a rich card in a modal (no navigation): per-sport career stats +
// all-time rank + honors + school records, with an emoji sport toggle for multi-sport athletes — full
// parity with the in-app profile. All cards are pre-rendered server-side; the client is a tab-switcher.
import {
  sb, esc, prettySport, htmlShell, SITE, slugify, SPORT_ICON, sportsLinkable,
  statsToDisplay, rateDefsFor, rateValue, fmtRateVal, RATE_FMT,
  pctRecordsFrom, pergameRecordsFrom, longestRecordsFrom, autoStatRecords,
  awardsForHolder, awardLabel, buildCoachStats, normName,
  seasonSuccessScore, activeYears, seasonEndYear,
} from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  if (!slug) { res.statusCode = 404; return res.end(notFound()); }

  // No school_slug column yet, so match on slugified school_name (same transform the links use).
  const all = await sb(`public_teams?select=id,slug,name,school_name,sport,city,state,primary_color,logo_url,coach_hof,record_minimums&limit=5000`);
  const teams = all.filter((t) => slugify(t.school_name || t.name || "") === slug);
  if (!teams.length) { res.statusCode = 404; return res.end(notFound()); }

  const school = teams[0].school_name || teams[0].name || "School";
  const place = [teams[0].city, teams[0].state].filter(Boolean).join(", ");
  const logo = (teams.find((t) => t.logo_url) || {}).logo_url || "";

  const ids = teams.map((t) => t.id).filter(Boolean);
  const teamById = {}; teams.forEach((t) => { teamById[t.id] = t; });
  const meta = {}; teams.forEach((t) => { meta[t.id] = { sportKey: t.sport, sport: prettySport(t.sport), slug: t.slug, col: t.primary_color || "#1a3a6b", ic: SPORT_ICON[t.sport] || "🏅" }; });

  // Load per-program (keeps each query under PostgREST row caps): full all-time roster (for ranking pools +
  // multi-sport stats + years), player_seasons + records (for the per-program record book). Seasons + awards
  // are small enough to fetch across all programs at once.
  let orgSeasons = [], awards = [], allAtp = [];
  const poolByProg = {}, pssByProg = {}, recsByProg = {}, atpByKey = {}, seasonsByProg = {};
  if (ids.length) {
    const [progData, s, aw] = await Promise.all([
      Promise.all(ids.map((pid) => Promise.all([
        sb(`all_time_players?program_id=eq.${pid}&select=name,hof_year,stats,first_year,last_year,grad_year,school_hall_of_fame,state_hall_of_fame`),
        sb(`player_seasons?program_id=eq.${pid}&select=player_name,season,stats`),
        sb(`records?program_id=eq.${pid}`),
      ]).then(([atp, pss, recs]) => ({ pid, atp: atp || [], pss: pss || [], recs: recs || [] })))),
      sb(`seasons?program_id=in.(${ids.join(",")})&select=program_id,season,wins,losses,ties,league_wins,league_losses,league_ties,coach,notes`),
      sb(`awards?program_id=in.(${ids.join(",")})&select=program_id,scope,kind,level,holder_name,season`),
    ]);
    progData.forEach(({ pid, atp, pss, recs }) => {
      atp.forEach((p) => { p.program_id = pid; atpByKey[pid + "|" + normName(p.name)] = p; });
      poolByProg[pid] = atp; pssByProg[pid] = pss; recsByProg[pid] = recs; allAtp.push(...atp);
    });
    orgSeasons = (s || []).map((x) => ({ season: x.season, wins: x.wins, losses: x.losses, ties: x.ties, leagueWins: x.league_wins, leagueLosses: x.league_losses, leagueTies: x.league_ties, coach: x.coach, notes: x.notes, _team: (meta[x.program_id] || {}).sport || "" }));
    (s || []).forEach((x) => { (seasonsByProg[x.program_id] = seasonsByProg[x.program_id] || []).push({ season: x.season, notes: x.notes }); });
    awards = aw || [];
  }
  const awardsByProg = {}; awards.forEach((a) => { (awardsByProg[a.program_id] = awardsByProg[a.program_id] || []).push(a); });

  // Each program's full record book → which records each player holds (mirrors api/team.js).
  const recByHolderByProg = {};
  ids.forEach((pid) => {
    const t = teamById[pid]; if (!t) return;
    const sport = t.sport;
    const cp = (poolByProg[pid] || []).map((p) => ({ name: p.name, stats: p.stats || {}, firstYear: p.first_year, lastYear: p.last_year, gradYear: p.grad_year }));
    const sr = pssByProg[pid] || [];
    const auto = [
      ...pctRecordsFrom(sr, cp, sport, t.record_minimums),
      ...pergameRecordsFrom(sr, cp, sport),
      ...longestRecordsFrom(sr, sport),
      ...autoStatRecords(sr, cp, statsToDisplay(cp, sport).filter((x) => !/^Longest /.test(x)), sport),
    ];
    const stored = (recsByProg[pid] || []).map((r) => ({ statName: r.stat_name, variant: r.variant, holderName: r.holder_name, value: r.value }));
    const mk = new Set(stored.map((r) => r.statName + "|" + r.variant));
    const rbh = {};
    for (const r of [...stored, ...auto.filter((x) => !mk.has(x.statName + "|" + x.variant))]) {
      if (!r.holderName) continue;
      const k = normName(r.holderName);
      const val = RATE_FMT[r.statName] ? fmtRateVal(RATE_FMT[r.statName], r.value) : (typeof r.value === "number" ? r.value.toLocaleString() : r.value);
      (rbh[k] = rbh[k] || []).push({ n: r.statName, v: r.variant, val });
    }
    recByHolderByProg[pid] = rbh;
  });

  // ── Card renderers (reuse the shared .pmhd/.pmbody/.ptile modal styling) ──────
  const yearsOf = (p) => (p.first_year && p.last_year) ? (String(p.first_year) === String(p.last_year) ? String(p.first_year) : String(p.first_year) + "–" + String(p.last_year)) : (p.grad_year ? "Class of " + p.grad_year : "");
  const rankOf = (pool, stat, val) => { if (!(val > 0)) return null; let r = 1, tot = 0; for (const q of pool) { const qv = Number((q.stats || {})[stat]) || 0; if (qv > 0) tot++; if (qv > val) r++; } return { r, tot }; };
  const tilesRanked = (stats, sportKey, pool) => {
    let h = "";
    for (const stat of statsToDisplay([{ stats }], sportKey)) {
      const raw = stats[stat], has = raw != null && Number(raw) > 0, val = Number(raw) || 0;
      const rk = has ? rankOf(pool, stat, val) : null;
      const rs = rk ? ((rk.r === 1 ? "🥇 " : rk.r === 2 ? "🥈 " : rk.r === 3 ? "🥉 " : "") + "#" + rk.r + " of " + rk.tot) : "";
      h += `<div class="ptile"><div class="pl">${esc(stat.toUpperCase())}</div><div class="pv">${has ? val.toLocaleString() : "—"}</div><div class="psub">${esc(rs)}</div></div>`;
      for (const d of rateDefsFor(sportKey).filter((q) => q.after === stat)) { const dv = rateValue(d, stats); if (dv != null) h += `<div class="ptile"><div class="pl">${esc(d.name.toUpperCase())}</div><div class="pv">${esc(fmtRateVal(d.fmt, dv))}</div><div class="psub"></div></div>`; }
    }
    return h;
  };
  const honRows = (label, list, emoji) => list.length ? `<h3 style="margin:16px 0 8px;font-size:14px">${label}</h3><div>${list.map((a) => `<div style="font-size:13px;color:#374151;padding:3px 0">${emoji} ${esc(awardLabel(a) + (a.season ? " (" + a.season + ")" : ""))}</div>`).join("")}</div>` : "";
  const recRows = (recs, emoji) => recs.length ? `<h3 style="margin:18px 0 8px;font-size:14px">School records held</h3><div>${recs.map((r) => `<div style="font-size:13px;color:#374151;padding:3px 0">${emoji} <b>${esc(r.n)}</b> ${r.v ? `<span style="color:#9ca3af">(${esc(r.v)})</span> ` : ""}— ${esc(String(r.val))}</div>`).join("")}</div>` : "";
  const tsRows = (seasons, row, emoji) => {
    const yrs = activeYears(row.first_year, row.last_year, row.grad_year);
    const secs = (seasons || []).filter((se) => yrs.includes(seasonEndYear(se.season)) && seasonSuccessScore(se.notes) > 0);
    if (!secs.length) return "";
    return `<h3 style="margin:18px 0 8px;font-size:14px">Team success during career</h3><div style="display:flex;flex-direction:column;gap:5px">${secs.map((se) => `<div style="display:flex;justify-content:space-between;gap:10px;background:#f9fafb;border-radius:8px;padding:7px 12px;font-size:13px"><span style="font-weight:600;color:#111;white-space:nowrap">${emoji} ${esc(se.season)}</span><span style="color:#6b7280;flex:1">${esc(se.notes)}</span><span style="font-weight:700;color:#92400e;white-space:nowrap">+${seasonSuccessScore(se.notes)}</span></div>`).join("")}</div>`;
  };
  const head = (name, badge, m, sub) => `<div class="pmhd" style="background:${esc(m.col)}"><button class="pmx" type="button">✕</button><div style="display:flex;align-items:center;gap:16px"><div class="pmav">${esc(name.split(" ").map((w) => w ? w[0] : "").join("").slice(0, 2).toUpperCase())}</div><div><div class="pmname">${esc(name)} ${badge}</div><div class="pmsub">${esc(sub)}</div></div></div></div>`;
  const shortLbl = (s) => s.replace(/^(Boys|Girls) /, "");

  const athleteProfile = (p) => {
    const homeM = meta[p.program_id]; if (!homeM) return null;
    const nk = normName(p.name);
    // Home sport first, then every gender-compatible program where this athlete also appears (multi-sport).
    const srcs = [{ prog: p.program_id, row: p }].concat(
      teams.filter((t) => t.id !== p.program_id && sportsLinkable(homeM.sportKey, t.sport) && atpByKey[t.id + "|" + nk])
        .map((t) => ({ prog: t.id, row: atpByKey[t.id + "|" + nk] })));
    const tabs = srcs.map(({ prog, row }) => {
      const m = meta[prog], yrs = yearsOf(row);
      const body = `<h3 style="margin:0 0 10px;font-size:14px">Career statistics &amp; all-time rank — ${esc(m.sport)}${yrs ? " · " + esc(yrs) : ""}</h3><div class="ptiles">${tilesRanked(row.stats || {}, m.sportKey, poolByProg[prog] || [])}</div>${honRows("Honors", awardsForHolder(row.name, "player", awardsByProg[prog] || []), m.ic)}${recRows((recByHolderByProg[prog] || {})[nk] || [], m.ic)}${tsRows(seasonsByProg[prog] || [], row, m.ic)}`;
      return { ic: m.ic, lbl: shortLbl(m.sport), body };
    });
    const hy = yearsOf(p);
    const sub = homeM.sport + (hy ? " · " + hy : "") + (p.hof_year ? " · Inducted " + p.hof_year : "");
    return { hd: head(p.name, "🏛️", homeM, sub), tabs };
  };
  const coachProfile = (c, m, year, coy) => {
    const tot = c.wins + c.losses + (c.ties || 0), pct = tot > 0 ? Math.round(c.wins / tot * 1000) / 10 : null;
    const yrs = String(c.firstYear) === String(c.lastYear) ? String(c.firstYear) : String(c.firstYear) + "–" + String(c.lastYear);
    const tile = (l, v, s) => `<div class="ptile"><div class="pl">${esc(l)}</div><div class="pv">${esc(String(v))}</div><div class="psub">${esc(s || "")}</div></div>`;
    const lt = (c.leagueWins || 0) + (c.leagueLosses || 0) + (c.leagueTies || 0);
    const tiles = tile("Record", c.wins + "–" + c.losses + (c.ties ? "–" + c.ties : ""), pct != null ? pct + "% win" : "")
      + (lt > 0 ? tile("League", (c.leagueWins || 0) + "–" + (c.leagueLosses || 0) + (c.leagueTies ? "–" + c.leagueTies : ""), "") : "")
      + tile("Seasons", c.seasons, yrs) + (c.titles ? tile("League titles", "🏆 " + c.titles, "") : "");
    const body = `<h3 style="margin:0 0 10px;font-size:14px">Coaching record</h3><div class="ptiles">${tiles}</div>${honRows("Coach of the Year", coy, m.ic)}<p style="margin-top:16px"><a href="/teams/${esc(m.slug)}">View team →</a></p>`;
    return { hd: head(c.name, "🎓", m, "Head coach" + (year ? " · Inducted " + year : "")), tabs: [{ ic: m.ic, lbl: shortLbl(m.sport), body }] };
  };

  // ── Build the inductee list + a card per inductee (keyed for click-to-open) ───
  const prof = {};
  const inductees = [];
  const indByName = {};
  allAtp.filter((p) => p.school_hall_of_fame || p.state_hall_of_fame).forEach((p) => {
    const k = normName(p.name);
    if (!indByName[k] || (p.hof_year && !indByName[k].hof_year)) indByName[k] = p; // dedupe; prefer one with a year
  });
  Object.values(indByName).forEach((p) => {
    const pr = athleteProfile(p); if (!pr) return;
    const key = "p-" + p.program_id + "-" + normName(p.name);
    prof[key] = pr;
    inductees.push({ key, kind: "Athlete", name: p.name, sport: (meta[p.program_id] || {}).sport || "", year: p.hof_year || null });
  });
  const coachByName = {}; buildCoachStats(orgSeasons).forEach((c) => { coachByName[normName(c.name)] = c; });
  const seenCoach = new Set();
  teams.forEach((t) => { Object.entries(t.coach_hof || {}).forEach(([nm, v]) => {
    if (!v) return; const k2 = normName(nm); if (seenCoach.has(k2)) return; seenCoach.add(k2);
    const c = coachByName[k2]; if (!c) return; const m = meta[t.id];
    const key = "c-" + k2;
    prof[key] = coachProfile(c, m, typeof v === "number" ? v : null, awardsForHolder(nm, "coach", awards));
    inductees.push({ key, kind: "Coach", name: c.name, sport: (m || {}).sport || "", year: typeof v === "number" ? v : null });
  }); });
  inductees.sort((a, b) => (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name));
  const hofRows = inductees.length
    ? inductees.map((m) => `<div class="hofrow" data-hk="${esc(m.key)}" style="cursor:pointer"><span class="hofyr">${m.year ? esc(String(m.year)) : "—"}</span><span class="hofnm">${esc(m.name)}</span><span class="hofmeta">${esc(m.kind)} · ${esc(m.sport)}</span></div>`).join("")
    : `<div class="empty">No one has been inducted into the Hall of Fame yet.</div>`;

  const cards = teams.slice().sort((a, b) => prettySport(a.sport).localeCompare(prettySport(b.sport))).map((t) => {
    const ic = SPORT_ICON[t.sport] || "🏅"; const col = t.primary_color || "#1a3a6b";
    return `<a class="schoolcard" href="/teams/${esc(t.slug)}" style="border-top:4px solid ${esc(col)}"><div class="sc-ic">${ic}</div><div class="sc-name">${esc(prettySport(t.sport))}</div><div class="sc-cta">View records →</div></a>`;
  }).join("");

  const title = `${school} Athletics — Records & Hall of Fame | RaftersIQ`;
  const description = `Every public ${school} athletic program on RaftersIQ — all-time records, Hall of Fame, and season history. Pick a sport to explore.`;
  const canonical = `${SITE}/school/${esc(slug)}`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: `${school} Athletics`, url: canonical };

  const script = `var PROF=${JSON.stringify(prof).replace(/</g, "\\u003c")};(function(){var ov=document.getElementById("pmodal");if(!ov)return;var CUR=null;function bar(p,si){if(p.tabs.length<2)return "";var o='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';for(var i=0;i<p.tabs.length;i++){var on=i===si;o+='<button type="button" class="psptab" data-si="'+i+'" style="display:flex;align-items:center;gap:5px;border:none;border-radius:8px;padding:5px 11px;font-size:13px;font-weight:700;cursor:pointer;background:'+(on?"#111":"#f0f0ee")+';color:'+(on?"#fff":"#374151")+'">'+p.tabs[i].ic+" "+p.tabs[i].lbl+"</button>";}return o+"</div>";}function render(p,si){document.getElementById("pmcard").innerHTML=p.hd+'<div class="pmbody">'+bar(p,si)+'<div id="psbody">'+p.tabs[si].body+"</div></div>";}function openX(k){var p=PROF[k];if(!p)return;CUR=p;render(p,0);ov.style.display="flex";}document.addEventListener("click",function(ev){var t=ev.target;if(!t)return;if(t.closest&&t.closest(".pmx")){ov.style.display="none";return;}if(t===ov){ov.style.display="none";return;}var tb=t.closest&&t.closest(".psptab");if(tb&&CUR){render(CUR,+tb.getAttribute("data-si"));return;}var el=t.closest&&t.closest("[data-hk]");if(el){openX(el.getAttribute("data-hk"));}});})();`;

  const body = `
    <div class="hero">
      ${logo ? `<img src="${esc(logo)}" alt="${esc(school)}" style="height:64px;width:auto;margin-bottom:12px"/>` : ""}
      <span class="eyebrow">Athletics</span>
      <h1>${esc(school)}</h1>
      <p class="sub">${esc(place ? place + " · " : "")}${teams.length} public program${teams.length !== 1 ? "s" : ""} — all-time records, Hall of Fame &amp; season history. Pick a sport.</p>
    </div>
    <input type="radio" name="schooltab" id="st-prog" class="stin" checked>
    <input type="radio" name="schooltab" id="st-hof" class="stin">
    <div class="stbar"><label for="st-prog">Programs</label><label for="st-hof">🏛️ Hall of Fame</label></div>
    <div class="stpanel sp-prog"><div class="schoolgrid">${cards}</div></div>
    <div class="stpanel sp-hof"><div class="hoflist">${hofRows}</div></div>
    <p class="sub" style="margin-top:22px"><a href="/teams">← Browse all schools</a></p>
    <div id="pmodal"><div id="pmcard"></div></div>
    <script>${script}</script>
    <style>
      .schoolgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:8px}
      .schoolcard{display:block;background:#fff;border:1px solid #e8e4dd;border-radius:14px;padding:20px 18px;text-decoration:none;color:#111;transition:box-shadow .15s,transform .15s}
      .schoolcard:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}
      .sc-ic{font-size:34px;line-height:1}.sc-name{font-weight:700;font-size:16px;margin-top:10px}.sc-cta{color:#1a56db;font-size:13px;font-weight:600;margin-top:6px}
      .stin{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
      .stbar{display:flex;gap:4px;margin:4px 0 18px;border-bottom:1px solid #e8e4dd}
      .stbar label{padding:8px 16px;font-weight:600;font-size:14px;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
      #st-prog:checked~.stbar label[for="st-prog"],#st-hof:checked~.stbar label[for="st-hof"]{color:#1a56db;border-bottom-color:#1a56db}
      .stpanel{display:none}
      #st-prog:checked~.sp-prog,#st-hof:checked~.sp-hof{display:block}
      .hoflist{display:flex;flex-direction:column;gap:3px}
      .hofrow{display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:10px;color:#111;background:#fff;border:1px solid #f0eeea}
      .hofrow:hover{background:#f9fafb}
      .hofyr{font-weight:700;color:#7c3aed;min-width:48px}.hofnm{font-weight:600;flex:1}.hofmeta{font-size:12px;color:#9ca3af;white-space:nowrap}
    </style>`;

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  res.statusCode = 200;
  return res.end(htmlShell({ title, description, canonical, jsonld, body }));
}

function notFound() {
  return htmlShell({
    title: "School not found | RaftersIQ",
    description: "",
    canonical: `${SITE}/teams`,
    noindex: true,
    body: `<h1>School not found</h1><p class="sub">This school has no public programs yet. <a href="/teams">Browse all programs</a>.</p>`,
  });
}
