const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const upstreamBase = "https://gpt.crax.lol/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: { message: "Method not allowed" } }, { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Supabase can expose the function request as either the full public path
  // (/functions/v1/crax-proxy/models) or with the function prefix already
  // stripped (/crax-proxy/models or /models). Normalize all of those forms so
  // the proxy does not reject valid model/completion requests with a 404.
  const path = (url.pathname
    .replace(/^\/functions\/v1\/crax-proxy(?=\/|$)/, "")
    .replace(/^\/crax-proxy(?=\/|$)/, "") || "/models");
  if (!/^\/(models|chat\/completions|images\/generations)(?:\/|$)/.test(path)) {
    return Response.json({ error: { message: "Unsupported Crax route" } }, { status: 404, headers: corsHeaders });
  }

  const key = Deno.env.get("CRAX_API_KEY");
  if (!key) return Response.json({ error: { message: "Crax service is not configured" } }, { status: 503, headers: corsHeaders });

  const headers = new Headers({
    Authorization: `Bearer ${key}`,
    Accept: path === "/images/generations" ? "application/json" : (req.headers.get("accept") || "application/json, text/event-stream"),
  });
  if (req.method === "POST") headers.set("Content-Type", req.headers.get("content-type") || "application/json");

  try {
    const upstream = await fetch(`${upstreamBase}${path}${url.search}`, {
      method: req.method,
      headers,
      body: req.method === "POST" ? await req.text() : undefined,
    });
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "application/json");
    responseHeaders.set("Cache-Control", "no-store");
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) responseHeaders.set("Retry-After", retryAfter);
    // Image generation returns a small JSON document. Buffer that response
    // instead of handing an edge stream across runtimes; chat completions keep
    // their stream so existing streaming replies are unaffected.
    if (path === "/images/generations") {
      return new Response(await upstream.text(), { status: upstream.status, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("Crax proxy error", error);
    const detail = error instanceof Error ? error.message : "upstream fetch failed";
    return Response.json({ error: { message: `Crax upstream request failed: ${detail}` } }, { status: 502, headers: corsHeaders });
  }
});
