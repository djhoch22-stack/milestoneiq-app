// GET /privacy → server-rendered Privacy Policy page (self-contained, no deps). Linked from the signup
// screen + the footer. Plain static legal content; cached hard at the CDN.
const UPDATED = "June 16, 2026";

const CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f8f7f4; color:#1f2937; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
  .topbar { background:#111; color:#fff; padding:14px 24px; display:flex; align-items:center; gap:12px; }
  .topbar a { color:#fff; text-decoration:none; font-weight:600; }
  .brand { font-family:Georgia,"Times New Roman",serif; font-weight:700; font-size:18px; }
  .wrap { max-width:820px; margin:0 auto; padding:40px 22px 80px; }
  h1 { font-family:Georgia,serif; font-size:30px; margin:0 0 4px; color:#111; }
  .updated { color:#6b7280; font-size:13px; margin:0 0 26px; }
  h2 { font-family:Georgia,serif; font-size:19px; margin:30px 0 8px; color:#111; }
  p, li { font-size:15px; color:#374151; }
  ul { padding-left:22px; }
  a { color:#1a56db; }
  .note { background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px 16px; font-size:14px; color:#1e3a5f; margin:0 0 24px; }
  table { border-collapse:collapse; width:100%; font-size:14px; margin:6px 0 8px; }
  td, th { border:1px solid #e5e7eb; padding:7px 10px; text-align:left; vertical-align:top; }
  th { background:#f3f4f6; }
  .foot { border-top:1px solid #e5e7eb; margin-top:40px; padding-top:18px; font-size:13px; color:#6b7280; }
  .foot a { margin-right:16px; }
`;

const BODY = `
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: ${UPDATED}</p>

  <div class="note">This policy explains what information RaftersIQ collects, how we use it, and the choices you have. RaftersIQ is designed for use by schools and athletic programs. For information that schools upload about student-athletes, the school directs how that information is used and we act on the school's behalf.</div>

  <h2>1. Our role</h2>
  <p>RaftersIQ ("we," "us," "our") provides athletic stat-tracking and record-book software to schools and athletic programs. For account and billing data, we are the controller. For student-athlete information that a school uploads, the <strong>school is the controller</strong> and RaftersIQ is a service provider/processor acting on the school's documented instructions.</p>

  <h2>2. Information we collect</h2>
  <table>
    <tr><th>Category</th><th>Examples</th></tr>
    <tr><td>Account information</td><td>Name, email address, phone number (optional), password (stored hashed), role, and the school/organization you belong to.</td></tr>
    <tr><td>Program &amp; student-athlete information (uploaded by schools)</td><td>Athlete names, graduation years, jersey numbers, statistics, awards/honors, season records, coach names, and program logos.</td></tr>
    <tr><td>Uploaded files</td><td>Stat sheets and rosters you import (CSV, spreadsheet, or PDF). PDFs may be processed by an AI service to extract stats (see Section 4).</td></tr>
    <tr><td>Payment information</td><td>Subscription and billing details processed by Stripe. We do <strong>not</strong> store full payment-card numbers.</td></tr>
    <tr><td>Usage &amp; technical data</td><td>Log data, device/browser information, and authentication session data needed to operate the Service.</td></tr>
  </table>

  <h2>3. How we use information</h2>
  <ul>
    <li>To provide, maintain, and improve the Service (tracking stats, records, milestones, Halls of Fame, and record books).</li>
    <li>To manage accounts, subscriptions, billing, and trials.</li>
    <li>To send service communications and, where enabled, milestone/record alert emails and invitations.</li>
    <li>To provide support, ensure security, prevent abuse, and comply with legal obligations.</li>
  </ul>

  <h2>4. Service providers we share with</h2>
  <p>We do <strong>not</strong> sell personal information. We share data only with providers that help us run the Service, under agreements that limit their use of the data:</p>
  <ul>
    <li><strong>Supabase</strong> — database, authentication, and backend hosting.</li>
    <li><strong>Vercel</strong> — website and application hosting.</li>
    <li><strong>Stripe</strong> — subscription payments and billing.</li>
    <li><strong>Resend</strong> — transactional and alert email delivery.</li>
    <li><strong>Anthropic</strong> — AI processing of uploaded stat-sheet PDFs to extract statistics. PDFs are sent to extract data and are not used to train models.</li>
  </ul>
  <p>We may also disclose information if required by law, to protect rights and safety, or in connection with a merger, acquisition, or sale of assets (with notice as required).</p>

  <h2>5. Public record books</h2>
  <p>By default, a program's record book — which may include student-athlete names, graduation years, and statistics — can be publicly viewable and indexed by search engines to promote the program. A school administrator can make any program private at any time in its settings. Schools are responsible for choosing the right visibility and for any consents required to display student information publicly.</p>

  <h2>6. Children's &amp; student privacy</h2>
  <p>The Service is directed to schools and adults (athletic directors and coaches), not to children, and children do not create accounts. Schools may upload information about student-athletes, including minors. Schools represent that they have the authority and any required consents (for example, under FERPA, COPPA, and applicable state student-privacy laws) to provide that information and to choose whether to display it publicly. Where applicable, RaftersIQ acts as a "school official" with a legitimate educational interest under FERPA, using student data only to provide the Service and under the school's control. A school, parent, or guardian may request correction or removal of a student's information by contacting the school or us at the address below; we will work with the controlling school to honor valid requests.</p>

  <h2>7. Data retention</h2>
  <p>We retain information for as long as your account or your organization's account is active, and as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. You can delete your account, and administrators can delete programs and players, which removes the associated data (subject to routine backups that expire over time).</p>

  <h2>8. Security</h2>
  <p>We use technical and organizational measures to protect information, including encryption in transit, hashed passwords, and row-level access controls that isolate each organization's data. No method of transmission or storage is 100% secure, but we work to protect your information and continually improve our safeguards.</p>

  <h2>9. Your choices &amp; rights</h2>
  <ul>
    <li><strong>Access/update:</strong> view and edit your account and program data within the app.</li>
    <li><strong>Delete:</strong> delete your account from Settings; administrators can delete programs and players.</li>
    <li><strong>Public visibility:</strong> mark any program private to remove it from public record books.</li>
    <li><strong>Email:</strong> alert emails are controlled per program in notification settings.</li>
    <li>Depending on your location, you may have additional rights (such as access, correction, or deletion). Contact us to exercise them; for student data, we will coordinate with the controlling school.</li>
  </ul>

  <h2>10. Cookies</h2>
  <p>We use only the cookies and local storage necessary to keep you signed in and to remember basic preferences. We do not use third-party advertising or cross-site tracking cookies.</p>

  <h2>11. Where data is processed</h2>
  <p>RaftersIQ is operated in the United States, and information is processed and stored in the United States. If you use the Service from outside the U.S., you understand that your information will be processed in the U.S.</p>

  <h2>12. Changes to this policy</h2>
  <p>We may update this Privacy Policy from time to time. We will revise the "Last updated" date and, for material changes, provide additional notice where appropriate.</p>

  <h2>13. Contact</h2>
  <p>Questions or requests about privacy? Contact us at <a href="mailto:support@raftersiq.com">support@raftersiq.com</a>.</p>

  <div class="foot">
    <a href="/terms">Terms of Service</a>
    <a href="https://raftersiq.com">RaftersIQ</a>
  </div>
`;

const PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy · RaftersIQ</title>
<meta name="robots" content="index,follow">
<style>${CSS}</style>
</head><body>
<div class="topbar"><a href="https://raftersiq.com" class="brand">RaftersIQ</a><span style="flex:1"></span><a href="https://raftersiq.com">← Back to app</a></div>
<div class="wrap">${BODY}</div>
</body></html>`;

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.statusCode = 200;
  res.end(PAGE);
}
