// ── track.js ────────────────────────────────────────────────────────────────
// Lightweight, privacy-friendly pageview logging into our own Supabase.
// Writes through the insert-only `log_pageview` RPC (no PII, no cookies — a
// random first-party visitor id in localStorage is used only to count uniques).
// Never throws, never blocks the app.
import { supabase } from "./supabase_client";

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
      /* private mode / storage blocked — fine, uniques just won't dedupe */
    }

    supabase.rpc("log_pageview", {
      p_path: window.location.pathname,
      p_referrer: document.referrer || null,
      p_utm_source: q.get("utm_source"),
      p_utm_medium: q.get("utm_medium"),
      p_utm_campaign: q.get("utm_campaign"),
      p_visitor_id: vid,
      p_user_agent: navigator.userAgent,
      p_surface: surface,
    });
  } catch (e) {
    /* analytics must never break the page */
  }
}
