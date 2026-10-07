/* Shared moderation helpers for Chat. Client checks improve UX; the
   Supabase migration contains the authoritative access/mutation rules. */
const Moderation = {
  PROFANITY_TERMS: Object.freeze(["fuck", "shit", "bitch", "asshole", "cunt", "dick", "piss"]),
  _logSub: null,

  containsProfanity(value){
    const tokens = String(value || "").toLowerCase().split(/\s+/).map(token => token.replace(/[^a-z0-9]/g, "").replace(/(.)\1{2,}/g, "$1$1")).filter(Boolean);
    return this.PROFANITY_TERMS.some(term => tokens.includes(term));
  },

  async loadLogs(){
    const { data, error } = await sb.from("moderation_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data || [];
  },

  renderLogs(container, rows){
    if (!rows.length) { container.innerHTML = `<div class="ui-empty messages-loading">No moderation events yet.</div>`; return; }
    const newestFirst = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = newestFirst.map(row => {
      const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      const event = row.event_type === "profanity" ? "PROFANITY DETECTED" : row.event_type === "message_deleted" ? "MESSAGE DELETED" : String(row.event_type || "MODERATION EVENT").replace(/_/g, " ").toUpperCase();
      const actor = meta.actor_username || meta.moderator_username || meta.author_username || "Unknown user";
      const target = meta.target_username || meta.author_username || "user";
      const channel = meta.channel_name ? `#${meta.channel_name}` : "shared channel";
      const content = row.content ? `<div class="moderation-log-content">“${escapeHtml(row.content)}”</div>` : "";
      const summary = row.event_type === "message_deleted"
        ? `deleted a message from <strong>@${escapeHtml(target)}</strong>`
        : row.event_type === "message_reported"
          ? `reported a message from <strong>@${escapeHtml(target)}</strong> in <strong>${escapeHtml(channel)}</strong>`
          : `in <strong>${escapeHtml(channel)}</strong>`;
      return `<article class="moderation-log-row"><div class="moderation-log-event">${escapeHtml(event)}</div><div class="moderation-log-summary"><strong>@${escapeHtml(actor)}</strong> ${summary}</div>${content}<time class="moderation-log-time">${escapeHtml(new Date(row.created_at).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}))}</time></article>`;
    }).join("");
  },

  subscribeLogs(channelId, onChange){
    this.unsubscribeLogs();
    this._logSub = sb.channel(`moderation-logs:${channelId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "moderation_logs" }, payload => {
      if (!payload?.new?.id || typeof onChange !== "function") return;
      try {
        const result = onChange(payload);
        if (result?.catch) result.catch(error => console.error("Moderation log handler failed:", error));
      } catch (error) { console.error("Moderation log handler failed:", error); }
    }).subscribe();
  },
  unsubscribeLogs(){ if (this._logSub) { sb.removeChannel(this._logSub); this._logSub = null; } }
};

/*
 * Names use a curated, slur-only filter. This is separate from
 * Chat's optional display profanity filter: it protects account identity
 * fields without blocking ordinary words or changing message rendering.
 */
const BlurNamePolicy = {
  MESSAGE: "Please choose a different name.",
  BLOCKED_TERMS: Object.freeze([
    "nigger", "nigga", "fag", "faggot", "tranny", "chink",
    "spic", "kike", "coon", "gook", "wetback", "retard", "dyke",
    "beaner", "jap", "paki", "sambo", "zipperhead", "spook",
    "wop", "dago", "kraut", "redskin", "abo", "heeb", "yid",
    "homo", "shemale", "tard", "mongoloid", "raghead", "towelhead",
    "sandnigger"
  ]),

  normalize(value){
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[@4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[$5]/g, "s")
      .replace(/[7]/g, "t");
  },

  isBlocked(value){
    const normalized = this.normalize(value);
    const tokens = normalized
      .split(/[^a-z0-9]+/)
      .map(token => token.replace(/(.)\1{2,}/g, "$1$1"))
      .filter(Boolean);
    const compact = normalized.replace(/[^a-z0-9]/g, "").replace(/(.)\1{2,}/g, "$1$1");
    return tokens.some(token => this.BLOCKED_TERMS.some(term => token.includes(term)))
      || this.BLOCKED_TERMS.some(term => compact.includes(term));
  },

  error(value){ return this.isBlocked(value) ? this.MESSAGE : ""; }
};

window.BlurNamePolicy = window.BlurNamePolicy || BlurNamePolicy;
