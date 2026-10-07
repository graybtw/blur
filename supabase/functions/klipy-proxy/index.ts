const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Klipy's public API is rooted at /api/v1 (the /v1-only path returns 404).
const upstreamBase = "https://api.klipy.com/api/v1";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: { message } }, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return errorResponse("Method not allowed", 405);

  const appKey = Deno.env.get("KLIPY_API_KEY");
  if (!appKey) return errorResponse("Klipy service is not configured", 503);

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/klipy-proxy(?=\/|$)/, "")
    .replace(/^\/klipy-proxy(?=\/|$)/, "") || "/gifs/trending";
  const match = path.match(/^\/gifs\/(search|trending)$/);
  if (!match) return errorResponse("Unsupported Klipy route", 404);

  const params = new URLSearchParams();
  const page = Math.max(1, Math.min(100, Number(url.searchParams.get("page")) || 1));
  const perPage = Math.max(1, Math.min(50, Number(url.searchParams.get("limit")) || 24));
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  params.set("locale", "en_US");
  params.set("content_filter", "high");
  params.set("format_filter", "gif");
  if (match[1] === "search") {
    const query = String(url.searchParams.get("q") || "").trim().slice(0, 80);
    if (!query) return errorResponse("A search query is required");
    params.set("q", query);
  }

  try {
    const upstream = await fetch(`${upstreamBase}/${encodeURIComponent(appKey)}/gifs/${match[1]}?${params}`, {
      headers: { Accept: "application/json" },
    });
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "application/json");
    responseHeaders.set("Cache-Control", "public, max-age=60");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("Klipy proxy error", error);
    return errorResponse("The GIF service is temporarily unavailable", 502);
  }
});
