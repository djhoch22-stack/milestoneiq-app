// ── extract-pdf ───────────────────────────────────────────────────────────────
// Server-side proxy for AI PDF stat extraction. A browser CANNOT call the Anthropic
// API directly (the key would be exposed + CORS blocks it), so this function holds
// the key and makes the call. Takes ONE base64 PDF and returns the athletes/stats
// it finds; the client loops over multiple files and merges (keeps each call short
// so the edge function never times out).
//
// Deploy:  supabase functions deploy extract-pdf --no-verify-jwt
//   Verify JWT OFF (browser CORS preflight carries no JWT; we validate inside).
//   Secret required: ANTHROPIC_API_KEY (an Anthropic API key — console.anthropic.com).
//   Model: claude-opus-4-8. To cut cost, swap to "claude-haiku-4-5" or
//   "claude-sonnet-4-6" below (less accurate on messy stat sheets).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = `Extract all athlete stats from this document. Return ONLY valid JSON, no markdown, no commentary:
{"athletes":[{"name":"Full Name","position":"Position or empty string","gradYear":2025,"number":12,"stats":{"Stat Name":numericValue}}]}
Rules: numeric stat values only; use the exact stat names shown in the document; if a grad year is unknown use ${new Date().getFullYear() + 2}; "number" is the player's jersey/uniform number if shown (as an integer), otherwise null; include every athlete and every stat you find.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set on this function" }, 500);

    // Only logged-in users may call this (it spends the Anthropic key).
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "not authenticated" }, 401);

    const { pdf } = await req.json();
    if (!pdf) return json({ error: "no pdf provided" }, 400);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 16000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    const data = await r.json();
    if (data.error) return json({ error: data.error.message || "Anthropic API error" }, 502);
    const text = (data.content || []).map((c: { text?: string }) => c.text || "").join("");
    let parsed: { athletes?: unknown[] };
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "Could not parse the model's output as JSON" }, 502);
    }
    return json({ athletes: parsed.athletes || [] });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
