// ── track.js ────────────────────────────────────────────────────────────────
// Lightweight, privacy-friendly pageview logging into our own Supabase.
// Uses a direct fetch() to the insert-only `log_pageview` RPC. (NOTE: do not use
// supabase.rpc() here — the postgrest builder is lazy and only sends the request
// when awaited/.then()'d, so a fire-and-forget rpc() call never actually fires.)
// No PII, no cookies — a random first-party visitor id in localStorage is used
// only to count uniques. Never throws, never blocks the app.
const SUPABASE_URL = "https://odirpbptemubzysrvajh.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXJwYnB0ZW11Ynp5c3J2YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwNzQsImV4cCI6MjA5NTkxNzA3NH0.Ikr03FPjiYcXdwr0ng5aNKA-cyHH2tnRpOieeCuy1JI";

export function trackPageview(surface = "app") {
  try {
    const q = new URLSearchParams(window.location.search);

    let vid = null;
    try {
      vid = localStorage.getItem("riq_vid");
      if (!vid) {
        vid =
          window.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(36).slice(2);
        localStorage.setItem("riq_vid", vid);
      }
    } catch (e) {
      /* private mode / storage blocked — fine */
    }

    fetch(SUPABASE_URL + "/rest/v1/rpc/log_pageview", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON,
      },
      body: JSON.stringify({
        p_path: window.location.pathname,
        p_referrer: document.referrer || null,
        p_utm_source: q.get("utm_source"),
        p_utm_medium: q.get("utm_medium"),
        p_utm_campaign: q.get("utm_campaign"),
        p_visitor_id: vid,
        p_user_agent: navigator.userAgent,
        p_surface: surface,
      }),
    }).catch(() => {
      /* analytics must never break the page */
    });
  } catch (e) {
    /* analytics must never break the page */
  }
}
