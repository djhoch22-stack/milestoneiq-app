// GET /school/:slug  → server-rendered hub listing every PUBLIC program for one school, so a visitor
// lands on e.g. "Denver Christian" and picks which sport's record book to open.
import { sb, esc, prettySport, htmlShell, SITE, slugify, SPORT_ICON } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  if (!slug) { res.statusCode = 404; return res.end(notFound()); }

  // No school_slug column yet, so match on slugified school_name (same transform the links use).
  const all = await sb(`public_teams?select=slug,name,school_name,sport,city,state,primary_color,logo_url&limit=5000`);
  const teams = all.filter((t) => slugify(t.school_name || t.name || "") === slug);
  if (!teams.length) { res.statusCode = 404; return res.end(notFound()); }

  const school = teams[0].school_name || teams[0].name || "School";
  const place = [teams[0].city, teams[0].state].filter(Boolean).join(", ");
  const logo = (teams.find((t) => t.logo_url) || {}).logo_url || "";

  const cards = teams
    .slice()
    .sort((a, b) => prettySport(a.sport).localeCompare(prettySport(b.sport)))
    .map((t) => {
      const ic = SPORT_ICON[t.sport] || "🏅";
      const col = t.primary_color || "#1a3a6b";
      return `<a class="schoolcard" href="/teams/${esc(t.slug)}" style="border-top:4px solid ${esc(col)}"><div class="sc-ic">${ic}</div><div class="sc-name">${esc(prettySport(t.sport))}</div><div class="sc-cta">View records →</div></a>`;
    })
    .join("");

  const title = `${school} Athletics — Records & Hall of Fame | RaftersIQ`;
  const description = `Every public ${school} athletic program on RaftersIQ — all-time records, Hall of Fame, and season history. Pick a sport to explore.`;
  const canonical = `${SITE}/school/${esc(slug)}`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: `${school} Athletics`, url: canonical };

  const body = `
    <div class="hero">
      ${logo ? `<img src="${esc(logo)}" alt="${esc(school)}" style="height:64px;width:auto;margin-bottom:12px"/>` : ""}
      <span class="eyebrow">Athletics</span>
      <h1>${esc(school)}</h1>
      <p class="sub">${esc(place ? place + " · " : "")}${teams.length} public program${teams.length !== 1 ? "s" : ""} — all-time records, Hall of Fame &amp; season history. Pick a sport.</p>
    </div>
    <div class="schoolgrid">${cards}</div>
    <p class="sub" style="margin-top:22px"><a href="/teams">← Browse all schools</a></p>
    <style>
      .schoolgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:8px}
      .schoolcard{display:block;background:#fff;border:1px solid #e8e4dd;border-radius:14px;padding:20px 18px;text-decoration:none;color:#111;transition:box-shadow .15s,transform .15s}
      .schoolcard:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}
      .sc-ic{font-size:34px;line-height:1}.sc-name{font-weight:700;font-size:16px;margin-top:10px}.sc-cta{color:#1a56db;font-size:13px;font-weight:600;margin-top:6px}
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
