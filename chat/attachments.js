/*
 * Chat attachments
 *
 * Files live in a private Supabase bucket. Messages store only a small
 * descriptor (path/name/type/size); the renderer creates short-lived signed
 * URLs when a message is shown. GIFs are intentionally kept as normal message
 * URLs so they work in existing messages and do not need a second table.
 */
const ChatAttachments = {
  BUCKET: "chat-files",
  MAX_SIZE: 10 * 1024 * 1024,
  // GIF search is routed through Blur's Supabase function so the Klipy key
  // never ships in the browser bundle.
  API_BASE: String(window.BLUR_GIF_CONFIG?.endpoint || "https://svvgovbyzirdsjdcznyn.supabase.co/functions/v1/klipy-proxy").replace(/\/$/, ""),

  _id(){
    try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  },

  formatSize(bytes){
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  },

  async upload(file, userId){
    if (!file || !userId) throw new Error("Choose a file first.");
    if (file.size > this.MAX_SIZE) throw new Error("Files must be 10 MB or smaller.");
    const originalName = String(file.name || "file");
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
    const path = `${userId}/${this._id()}-${safeName}`;
    const { error } = await sb.storage.from(this.BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });
    if (error) throw error;
    return {
      path,
      name: originalName,
      type: file.type || "application/octet-stream",
      size: Number(file.size) || 0
    };
  },

  async signedUrl(path){
    if (!path) return null;
    const { data, error } = await sb.storage.from(this.BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  },

  async searchGifs(query = ""){
    const q = String(query || "").trim();
    const params = new URLSearchParams({ page: "1", limit: "24" });
    const route = q ? "/gifs/search" : "/gifs/trending";
    if (q) params.set("q", q);
    const headers = new Headers({ Accept: "application/json" });
    if (window.SUPABASE_ANON_KEY) headers.set("apikey", window.SUPABASE_ANON_KEY);
    try {
      const session = await window.sb?.auth?.getSession?.();
      const token = session?.data?.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch { /* the proxy will return a clear auth error */ }
    const response = await fetch(`${this.API_BASE}${route}?${params}`, { headers, mode: "cors", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error("GIF search is unavailable right now.");
    // Klipy may use 204 when a query has no matches. Treat that as an empty
    // result so the picker can show its normal “no GIFs found” state.
    if (response.status === 204) return [];
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("json")) throw new Error("GIF search is unavailable right now.");
    const json = await response.json();
    const source = Array.isArray(json?.data?.data)
      ? json.data.data
      : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.results)
          ? json.results
          : [];
    return source.map(item => {
      const file = item?.file || item?.files || {};
      const formats = item?.media_formats || item?.media?.[0] || item?.images || {};
      const pick = (...values) => {
        const visit = (value, seen = new Set()) => {
          if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : "";
          if (!value || typeof value !== "object" || seen.has(value)) return "";
          seen.add(value);
          if (typeof value.url === "string" && /^https?:\/\//i.test(value.url)) return value.url;
          if (typeof value.src === "string" && /^https?:\/\//i.test(value.src)) return value.src;
          for (const key of ["gif", "webp", "mp4", "original", "fixed_height", "fixed_width", "hd", "md", "sm", "xs"]) {
            const found = visit(value[key], seen);
            if (found) return found;
          }
          return "";
        };
        for (const value of values) {
          const found = visit(value);
          if (found) return found;
        }
        return "";
      };
      // Klipy returns file.{hd|md|sm|xs}.{gif|webp|...}. Prefer a real GIF
      // for the message URL and a lighter WebP/GIF for the picker preview.
      const url = pick(file?.md?.gif, file?.hd?.gif, file?.sm?.gif, file?.xs?.gif, file.gif, formats.gif, formats.original, item?.media_url);
      const preview = pick(file?.sm?.webp, file?.xs?.webp, file?.md?.webp, file?.sm?.gif, file?.xs?.gif, formats.webp, formats.tinygif, formats.preview, url);
      return {
        url,
        preview_url: preview || url,
        title: String(item?.title || item?.content_description || item?.name || item?.slug || "GIF").trim() || "GIF"
      };
    }).filter(item => item.url || item.preview_url);
  },

  safeUrl(url){
    try {
      const parsed = new URL(String(url));
      return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
    } catch { return null; }
  },

  isGifUrl(url){
    const value = String(url || "");
    return /^https?:\/\//i.test(value)
      && (/\.gif(?:[?#]|$)/i.test(value) || /(?:gifsnap|klipy)\.com/i.test(value));
  }
};

window.ChatAttachments = ChatAttachments;
