/**
 * DeutschKurs – Cloudflare Worker
 * ─────────────────────────────────────────────────────────────
 * Proxies requests from the browser to the Anthropic API.
 * Supports both regular JSON and SSE streaming responses.
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

    // ── Read request body ────────────────────────────────────
    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid request body' }), 400);
    }

    // ── Detect streaming request ─────────────────────────────
    let isStream = false;
    try {
      const parsed = JSON.parse(body);
      isStream = parsed.stream === true;
    } catch { /* non-JSON body falls through to Anthropic error */ }

    // ── Forward request to Anthropic ─────────────────────────
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

    // ── Streaming: proxy the SSE stream with CORS headers ────
    if (isStream && anthropicResponse.ok && anthropicResponse.body) {
      return new Response(anthropicResponse.body, {
        status: anthropicResponse.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
        },
      });
    }

    // ── Non-streaming: return buffered JSON ──────────────────
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
