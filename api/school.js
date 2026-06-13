// GET /school/:slug  → server-rendered hub listing every PUBLIC program for one school, so a visitor
// lands on e.g. "Denver Christian" and picks which sport's record book to open.
import { sb, esc, prettySport, htmlShell, SITE, slugify, SPORT_ICON } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const slug = String((req.query && req.query.slug) || "").trim().toLowerCase();
  if (!slug) { res.statusCode = 404; return res.end(notFound()); }

  // No school_slug column yet, so match on slugified school_name (same transform the links use).
  const all = await sb(`public_teams?select=id,slug,name,school_name,sport,city,state,primary_color,logo_url,coach_hof&limit=5000`);
  const teams = all.filter((t) => slugify(t.school_name || t.name || "") === slug);
  if (!teams.length) { res.statusCode = 404; return res.end(notFound()); }

  const school = teams[0].school_name || teams[0].name || "School";
  const place = [teams[0].city, teams[0].state].filter(Boolean).join(", ");
  const logo = (teams.find((t) => t.logo_url) || {}).logo_url || "";

  // School-wide Hall of Fame — inducted athletes + coaches across every public program, by induction year.
  const ids = teams.map((t) => t.id).filter(Boolean);
  const meta = {}; teams.forEach((t) => { meta[t.id] = { sport: prettySport(t.sport), slug: t.slug }; });
  const inductees = [];
  if (ids.length) {
    const atp = await sb(`all_time_players?program_id=in.(${ids.join(",")})&or=(school_hall_of_fame.eq.true,state_hall_of_fame.eq.true)&select=program_id,name,hof_year`);
    (atp || []).forEach((p) => { const m = meta[p.program_id] || {}; inductees.push({ kind: "Athlete", name: p.name, sport: m.sport || "", slug: m.slug || "", year: p.hof_year || null }); });
  }
  teams.forEach((t) => { Object.entries(t.coach_hof || {}).forEach(([nm, v]) => { if (v) inductees.push({ kind: "Coach", name: nm, sport: prettySport(t.sport), slug: t.slug, year: typeof v === "number" ? v : null }); }); });
  inductees.sort((a, b) => (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name));
  const hofRows = inductees.length
    ? inductees.map((m) => `<a class="hofrow" href="/teams/${esc(m.slug)}"><span class="hofyr">${m.year ? esc(String(m.year)) : "—"}</span><span class="hofnm">${esc(m.name)}</span><span class="hofmeta">${esc(m.kind)} · ${esc(m.sport)}</span></a>`).join("")
    : `<div class="empty">No one has been inducted into the Hall of Fame yet.</div>`;

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
    <input type="radio" name="schooltab" id="st-prog" class="stin" checked>
    <input type="radio" name="schooltab" id="st-hof" class="stin">
    <div class="stbar"><label for="st-prog">Programs</label><label for="st-hof">🏛️ Hall of Fame</label></div>
    <div class="stpanel sp-prog"><div class="schoolgrid">${cards}</div></div>
    <div class="stpanel sp-hof"><div class="hoflist">${hofRows}</div></div>
    <p class="sub" style="margin-top:22px"><a href="/teams">← Browse all schools</a></p>
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
      .hofrow{display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:10px;text-decoration:none;color:#111;background:#fff;border:1px solid #f0eeea}
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
