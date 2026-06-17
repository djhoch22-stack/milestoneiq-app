// GET /terms → server-rendered Terms of Service page (self-contained, no deps). Linked from the signup
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
  .foot { border-top:1px solid #e5e7eb; margin-top:40px; padding-top:18px; font-size:13px; color:#6b7280; }
  .foot a { margin-right:16px; }
`;

const BODY = `
  <h1>Terms of Service</h1>
  <p class="updated">Last updated: ${UPDATED}</p>

  <div class="note">These Terms are a binding agreement between you and RaftersIQ. Please read them carefully. If you are accepting on behalf of a school, district, or organization, you represent that you are authorized to bind that organization.</div>

  <h2>1. Who we are</h2>
  <p>RaftersIQ ("RaftersIQ," "we," "us," or "our") provides a web-based platform for high school athletic programs to track statistics, records, milestones, and Halls of Fame, and to publish record books (the "Service"), available at raftersiq.com. By creating an account or using the Service, you agree to these Terms of Service and to our <a href="/privacy">Privacy Policy</a>.</p>

  <h2>2. Eligibility &amp; accounts</h2>
  <ul>
    <li>You must be at least 18 years old and an authorized representative of a school or athletic program to create an account. The Service is intended for use by schools, athletic directors, and coaches — not by children.</li>
    <li>You are responsible for the security of your account credentials and for all activity under your account. Notify us promptly of any unauthorized use.</li>
    <li>Accounts and roles (such as administrator/athletic director and coach) are managed at the organization (school) level. Administrators control who has access to their organization's data.</li>
  </ul>

  <h2>3. Subscriptions, billing &amp; trials</h2>
  <ul>
    <li>The Service is offered on paid subscription plans, with limits (such as the number of programs, users, and coaches) that depend on the plan. Some features may be limited to specific plans.</li>
    <li>Free trials and promotional codes, where offered, convert to a paid subscription or expire as described at sign-up. One free trial is permitted per organization unless we state otherwise.</li>
    <li>Paid subscriptions are billed through our payment processor, Stripe, and <strong>renew automatically</strong> (monthly or annually) until cancelled. You can cancel or change your plan at any time from your billing settings; cancellation takes effect at the end of the current billing period.</li>
    <li>Except where required by law, payments are non-refundable and we do not provide refunds or credits for partial periods. Prices may change on a prospective basis with notice.</li>
  </ul>

  <h2>4. Your data and content</h2>
  <ul>
    <li>You and your organization retain ownership of the data you upload (rosters, statistics, records, awards, logos, and similar content, "Your Content").</li>
    <li>You grant RaftersIQ a worldwide, non-exclusive license to host, store, process, reproduce, and display Your Content solely to operate and provide the Service — including displaying public record books where you have not opted out (see Section 6).</li>
    <li>You are responsible for the accuracy of Your Content and for having all rights and permissions necessary to upload it and to use it with the Service.</li>
  </ul>

  <h2>5. Student-athlete and minor data</h2>
  <p>Programs you manage may include information about student-athletes, some of whom are minors. By uploading or publishing such information, you represent and warrant that:</p>
  <ul>
    <li>you are authorized to provide that information to RaftersIQ and to display it through the Service, including on public record books;</li>
    <li>your organization has obtained, or otherwise has a lawful basis for, any consents or notices required under applicable laws (including FERPA, COPPA, and state student-privacy and publicity laws) for the collection, use, and public display of that information; and</li>
    <li>your organization, not RaftersIQ, is responsible for determining what student information is appropriate to upload and make public.</li>
  </ul>
  <p>For student data, RaftersIQ acts as a service provider acting on your organization's instructions. You agree to indemnify RaftersIQ for claims arising from your failure to obtain required consents or to comply with applicable student-privacy laws.</p>

  <h2>6. Public record books</h2>
  <p>By default, a program's record book — which may include student-athlete names, graduation years, and statistics — can be made publicly viewable and indexed by search engines to promote the program. An administrator can mark any program private (opt out of public display) at any time in the program's settings. You are responsible for choosing the appropriate visibility for each program.</p>

  <h2>7. Acceptable use</h2>
  <p>You agree not to: (a) use the Service unlawfully or to upload content you lack the rights to; (b) upload sensitive personal data beyond what the Service is designed for (e.g., government ID numbers, health records, financial account numbers); (c) attempt to access another organization's data, probe or breach security, or disrupt the Service; (d) scrape, resell, or reverse-engineer the Service; or (e) use the Service to harass or harm any individual.</p>

  <h2>8. Intellectual property</h2>
  <p>The Service, including its software, design, and the RaftersIQ name and logo, is owned by RaftersIQ and protected by intellectual-property laws. These Terms grant you a limited, revocable, non-transferable right to use the Service; they do not transfer any ownership in the Service to you.</p>

  <h2>9. Third-party services</h2>
  <p>The Service relies on third-party providers (for example, for hosting, database, payments, and email). Your use of the Service may be subject to those providers' terms, and we are not responsible for third-party services. See our <a href="/privacy">Privacy Policy</a> for the providers we use.</p>

  <h2>10. Disclaimers</h2>
  <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant that the Service will be uninterrupted, error-free, or that statistics, records, or other outputs will be accurate. You are responsible for verifying important data.</p>

  <h2>11. Limitation of liability</h2>
  <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, RAFTERSIQ WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.</p>

  <h2>12. Indemnification</h2>
  <p>You agree to indemnify and hold harmless RaftersIQ from claims, damages, and expenses (including reasonable attorneys' fees) arising from Your Content, your use of the Service, your violation of these Terms, or your violation of any law or the rights of any third party.</p>

  <h2>13. Termination</h2>
  <p>You may stop using the Service and delete your account at any time. We may suspend or terminate access if you violate these Terms or to protect the Service or other users. Upon termination, your right to use the Service ends; sections that by their nature should survive (such as ownership, disclaimers, limitations of liability, and indemnification) will survive.</p>

  <h2>14. Changes</h2>
  <p>We may modify the Service or these Terms from time to time. If we make material changes, we will update the "Last updated" date and, where appropriate, provide notice. Your continued use of the Service after changes take effect constitutes acceptance.</p>

  <h2>15. Governing law</h2>
  <p>These Terms are governed by the laws of the State of Colorado, without regard to its conflict-of-laws rules. The exclusive venue for any dispute will be the state or federal courts located in Colorado, and you consent to their jurisdiction.</p>

  <h2>16. Contact</h2>
  <p>Questions about these Terms? Contact us at <a href="mailto:support@raftersiq.com">support@raftersiq.com</a>.</p>

  <div class="foot">
    <a href="/privacy">Privacy Policy</a>
    <a href="https://raftersiq.com">RaftersIQ</a>
  </div>
`;

const PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terms of Service · RaftersIQ</title>
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
