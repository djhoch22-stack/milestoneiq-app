// GET /teams  → directory of every public record book (internal links for crawlers).
import { sb, esc, htmlShell, SITE, slugify } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const teams = await sb(`public_teams?select=slug,name,school_name,sport,city,state&order=school_name.asc&limit=5000`);

  // One row per SCHOOL (each school's sports live on its /school page). Dedupe by school slug —
  // the query is ordered by school_name, so the first row for each school wins.
  const seenSchools = new Set();
  const rows = teams
    .filter((t) => {
      const key = slugify(t.school_name || t.name || "Team");
      if (seenSchools.has(key)) return false;
      seenSchools.add(key);
      return true;
    })
    .map((t) => {
      const school = t.school_name || t.name || "Team";
      const place = [t.city, t.state].filter(Boolean).join(", ");
      return `<tr><td><a href="/school/${esc(slugify(school))}">${esc(school)}</a></td><td style="color:#6b7280">${esc(place)}</td></tr>`;
    })
    .join("");

  const title = "High School Programs & Record Books | RaftersIQ";
  const description =
    "Browse public high-school athletic record books on RaftersIQ — all-time records, Hall of Fame, and season history by school and sport.";
  const canonical = `${SITE}/teams`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "High School Programs on RaftersIQ",
    url: canonical,
  };

  const body = `
    <div class="hero">
      <span class="eyebrow">Directory</span>
      <h1>High School Programs &amp; Record Books</h1>
      <p class="sub">Public record books — all-time records, Hall of Fame, and season history by school and sport.</p>
    </div>
    ${
      teams.length
        ? `<table><thead><tr><th>School</th><th>Location</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<div class="empty">No public programs yet. <a href="/">Be the first — start a free trial.</a></div>`
    }
  `;

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  res.statusCode = 200;
  return res.end(htmlShell({ title, description, canonical, jsonld, body }));
}
