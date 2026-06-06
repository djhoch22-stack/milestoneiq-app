// Shared helpers for the public record-book SSR functions (Vercel serverless).
// These render crawlable HTML for raftersiq.com/teams/<slug> from Supabase data,
// read with the PUBLIC anon key (same key the browser client uses).

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

// Format a stat value (numbers get thousands separators; pcts stay as-is).
export function fmtNum(v) {
  const n = Number(v);
  if (!isFinite(n)) return esc(v);
  return n % 1 === 0 ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// Full HTML document shell with SEO meta + JSON-LD + a consistent header/footer.
export function htmlShell({ title, description, canonical, image, jsonld, body, noindex }) {
  const img = image || `${SITE}/raftersiq-logo.png`;
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
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Georgia,serif;color:#1f2937;background:#f8f7f4;line-height:1.5}
  a{color:#1a56db;text-decoration:none}
  a:hover{text-decoration:underline}
  .nav{display:flex;align-items:center;gap:10px;max-width:980px;margin:0 auto;padding:16px 20px}
  .nav img{width:32px;height:32px;object-fit:contain}
  .nav b{font-size:19px;color:#1a3a6b}
  .wrap{max-width:980px;margin:0 auto;padding:8px 20px 56px}
  .hero{padding:18px 0 8px}
  .eyebrow{display:inline-block;background:#eff6ff;color:#1e40af;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;margin-bottom:10px}
  h1{font-size:30px;line-height:1.15;margin:6px 0 8px;color:#111}
  h2{font-size:21px;margin:34px 0 12px;color:#1a3a6b;border-bottom:2px solid #e8e4dd;padding-bottom:6px}
  p.sub{color:#4b5563;font-size:16px;margin:0 0 6px}
  table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid #ececec;border-radius:10px;overflow:hidden}
  th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #f1efea}
  th{background:#fafaf8;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#6b7280}
  tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #ececec;border-radius:12px;padding:14px 16px}
  .badge{display:inline-block;font-size:11px;font-weight:700;border-radius:20px;padding:2px 9px;margin-right:6px}
  .badge.state{background:#fef3c7;color:#92400e}
  .badge.school{background:#dbeafe;color:#1e40af}
  .empty{color:#9ca3af;font-size:14px;padding:8px 0}
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
    <div class="foot">Powered by <a href="/">RaftersIQ</a> · the record book for high-school athletic programs · <a href="/teams">Browse all programs</a></div>
  </div>
</body>
</html>`;
}
