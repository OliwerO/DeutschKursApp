/**
 * DeutschKurs – Cloudflare Worker
 * ─────────────────────────────────────────────────────────────
 * Proxies requests from the browser to the Anthropic API.
 * The API key is stored securely as a Worker environment secret.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   ANTHROPIC_API_KEY  – your Anthropic API key (required)
 *   APP_TOKEN          – optional secret token for extra protection
 *                        If set, callers must send header: x-app-token: <value>
 */

export default {
  async fetch(request, env) {

    // ── CORS preflight ───────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // ── DEBUG endpoint (GET ?debug) – remove after testing ───
    const url = new URL(request.url);
    if (request.method === 'GET' && url.searchParams.has('debug')) {
      const key = env.ANTHROPIC_API_KEY;
      const info = key
        ? `SET ✓ — length: ${key.length}, starts with: ${key.substring(0, 14)}...`
        : 'NOT SET ✗ — env.ANTHROPIC_API_KEY is undefined';
      return corsResponse(JSON.stringify({ key_status: info }), 200);
    }

    // ── Only allow POST ──────────────────────────────────────
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    // ── Optional app token check ─────────────────────────────
    if (env.APP_TOKEN) {
      const token = request.headers.get('x-app-token') || '';
      if (token !== env.APP_TOKEN) {
        return corsResponse(JSON.stringify({ error: 'Unauthorized' }), 401);
      }
    }

    // ── Forward request to Anthropic ─────────────────────────
    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid request body' }), 400);
    }

    let anthropicResponse;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body,
      });
    } catch (err) {
      return corsResponse(
        JSON.stringify({ error: { type: 'proxy_error', message: String(err) } }),
        502
      );
    }

    const responseText = await anthropicResponse.text();
    return corsResponse(responseText, anthropicResponse.status);
  },
};

// ── Helper: add CORS headers to every response ───────────────
function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
    },
  });
}
