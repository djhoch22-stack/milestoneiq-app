// GET /sitemap.xml  → dynamic sitemap: homepage, the directory, and every public team.
import { sb, esc, SITE } from "./_lib.js";

export default async function handler(req, res) {
  const teams = await sb(`public_teams?select=slug&order=slug.asc&limit=50000`);

  const urls = [
    { loc: `${SITE}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${SITE}/teams`, priority: "0.8", changefreq: "daily" },
    ...teams
      .filter((t) => t.slug)
      .map((t) => ({ loc: `${SITE}/teams/${esc(t.slug)}`, priority: "0.7", changefreq: "weekly" })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.statusCode = 200;
  return res.end(xml);
}
