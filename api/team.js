// GET /teams/:slug  → server-rendered public record book for one program.
import { sb, esc, prettySport, fmtNum, htmlShell, SITE } from "./_lib.js";

export default async function handler(req, res) {
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!slug) {
    res.statusCode = 404;
    return res.end(notFound());
  }

  const team = (await sb(`public_teams?slug=eq.${encodeURIComponent(slug)}&limit=1`))[0];
  if (!team) {
    res.statusCode = 404;
    return res.end(notFound());
  }

  const pid = team.id;
  const [records, players, seasons, awards] = await Promise.all([
    sb(`records?program_id=eq.${pid}&order=stat_name.asc`),
    sb(`all_time_players?program_id=eq.${pid}`),
    sb(`seasons?program_id=eq.${pid}&order=season.desc`),
    sb(`awards?program_id=eq.${pid}`),
  ]);

  const sport = prettySport(team.sport);
  const school = team.school_name || team.name || "Team";
  const place = [team.city, team.state].filter(Boolean).join(", ");
  const title = `${school} ${sport} — Records & Hall of Fame | RaftersIQ`;
  const description =
    `All-time ${sport.toLowerCase()} records, Hall of Fame, season history and honors for ${school}` +
    (place ? ` (${place})` : "") + ". Powered by RaftersIQ.";
  const canonical = `${SITE}/teams/${esc(team.slug)}`;

  // ── Sections ──────────────────────────────────────────────────────────────
  const recordsHtml = records.length
    ? `<table><thead><tr><th>Record</th><th>Holder</th><th class="num">Value</th></tr></thead><tbody>${records
        .map(
          (r) =>
            `<tr><td>${esc(r.stat_name || "")}${r.variant ? ` <span style="color:#9ca3af">(${esc(r.variant)})</span>` : ""}</td><td>${esc(r.holder_name || "—")}${r.holder_year ? ` <span style="color:#9ca3af">'${esc(String(r.holder_year).slice(-2))}</span>` : ""}</td><td class="num">${fmtNum(r.value)}</td></tr>`
        )
        .join("")}</tbody></table>`
    : `<div class="empty">No school records published yet.</div>`;

  const hof = players.filter((p) => p.school_hall_of_fame || p.state_hall_of_fame);
  const hofHtml = hof.length
    ? `<div class="cards">${hof
        .map((p) => {
          const yrs = [p.first_year, p.last_year].filter(Boolean).join("–");
          const badges =
            (p.state_hall_of_fame ? `<span class="badge state">State HOF</span>` : "") +
            (p.school_hall_of_fame ? `<span class="badge school">School HOF</span>` : "");
          return `<div class="card"><div style="font-weight:700">${esc(p.name)}</div>${yrs ? `<div style="color:#6b7280;font-size:13px;margin:2px 0 6px">${esc(yrs)}</div>` : "<div style='height:6px'></div>"}${badges}</div>`;
        })
        .join("")}</div>`
    : `<div class="empty">No Hall of Fame members published yet.</div>`;

  const seasonsHtml = seasons.length
    ? `<table><thead><tr><th>Season</th><th>Coach</th><th class="num">W</th><th class="num">L</th></tr></thead><tbody>${seasons
        .map(
          (s) =>
            `<tr><td>${esc(s.season || "")}</td><td>${esc(s.coach || "—")}</td><td class="num">${s.wins ?? "—"}</td><td class="num">${s.losses ?? "—"}</td></tr>`
        )
        .join("")}</tbody></table>`
    : `<div class="empty">No season history published yet.</div>`;

  const awardLabel = (a) => {
    if (a.kind === "coach_of_year") return `${a.level === "state" ? "State" : "League"} Coach of the Year`;
    if (a.kind === "all_state") return "All-State";
    if (a.kind === "all_league") return "All-League";
    return esc(a.kind || "Honor");
  };
  const honorsHtml = awards.length
    ? `<table><thead><tr><th>Honoree</th><th>Honor</th><th>Season</th></tr></thead><tbody>${awards
        .map(
          (a) =>
            `<tr><td>${esc(a.holder_name || "")}</td><td>${awardLabel(a)}</td><td>${esc(a.season || "—")}</td></tr>`
        )
        .join("")}</tbody></table>`
    : "";

  const playerCount = players.length;

  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsTeam",
        name: `${school} ${sport}`,
        sport: sport,
        url: canonical,
        ...(place ? { location: { "@type": "Place", name: place } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "RaftersIQ", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Programs", item: SITE + "/teams" },
          { "@type": "ListItem", position: 3, name: `${school} ${sport}`, item: canonical },
        ],
      },
    ],
  };

  const body = `
    <div class="hero">
      <span class="eyebrow">${esc(sport)}${place ? ` · ${esc(place)}` : ""}</span>
      <h1>${esc(school)} ${esc(sport)} — Records &amp; Hall of Fame</h1>
      <p class="sub">All-time records, Hall of Fame, season history and honors${playerCount ? ` for ${playerCount} all-time ${playerCount === 1 ? "athlete" : "athletes"}` : ""}.</p>
    </div>

    <h2>School Records</h2>
    ${recordsHtml}

    <h2>Hall of Fame</h2>
    ${hofHtml}

    ${honorsHtml ? `<h2>Honors &amp; Awards</h2>${honorsHtml}` : ""}

    <h2>Season History</h2>
    ${seasonsHtml}
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
    body: `<div class="hero"><h1>Program not found</h1><p class="sub">This record book doesn't exist or isn't public. <a href="/teams">Browse all programs</a>.</p></div>`,
  });
}
