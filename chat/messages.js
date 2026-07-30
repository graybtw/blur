/* =========================================================
   messages.js
   Loading history, sending, and live-subscribing to messages
   for whichever channel is currently open. Also renders each
   message's reaction row (data lives in reactions.js).
   ========================================================= */

function truncateText(text, maxLen){
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? flat.slice(0, maxLen - 1).trimEnd() + "…" : flat;
}

const Messages = {

  PAGE_SIZE: 50,
  realtimeSub: null,

  // Small in-memory lookup of {content, displayName, userId} keyed by
  // message id, filled in as messages get rendered. Lets reply quotes
  // and the "replying to" composer preview render instantly without
  // an extra round trip for messages we've already seen this session.
  _cache: new Map(),

  async loadInitial(channelId){
    // We deliberately don't try to embed the reply_to relation here
    // (messages.reply_to_id -> messages.id is a self-join, and
    // PostgREST has proven unreliable resolving it — wrong direction,
    // then a stale-schema-cache 400). resolveReplyPreview() below
    // fetches the parent message directly instead, which is slower
    // per-reply but always correct.
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(this.PAGE_SIZE);

    if (error) throw error;
    return data.reverse(); // oldest → newest for rendering top-to-bottom
  },

  async send(channelId, userId, content, replyToId = null){
    content = content.trim();
    if (!content) return;

    const payload = { channel_id: channelId, user_id: userId, content };
    if (replyToId) payload.reply_to_id = replyToId;

    const { error } = await sb
      .from("messages")
      .insert(payload);

    if (error) throw error;
  },

  /** Cached {content, displayName, userId} for a message rendered this session, or undefined. */
  getCached(messageId){
    return this._cache.get(String(messageId));
  },

  /**
   * Figures out what to show in a reply's quoted-snippet line.
   * Prefers the embedded `reply_to` relation from loadInitial;
   * falls back to our render cache (e.g. replying to a message
   * sent earlier this session via realtime); falls back further
   * to a direct fetch for anything neither of those caught.
   */
  async resolveReplyPreview(msg){
    if (!msg.reply_to_id) return null;

    // Defensive: depending on how PostgREST resolves the embed,
    // `reply_to` can come back as an array (or an empty array)
    // instead of a single object. Normalize before using it so a
    // malformed/empty embed can't throw and take down the whole
    // render loop.
    const embedded = Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to;

    if (embedded && embedded.id) {
      const author = await Profiles.getById(embedded.user_id);
      const displayName = author?.display_name || author?.username || "Unknown";
      return { id: embedded.id, content: embedded.content, displayName };
    }

    const cached = this._cache.get(String(msg.reply_to_id));
    if (cached) {
      return { id: msg.reply_to_id, content: cached.content, displayName: cached.displayName };
    }

    try {
      const { data, error } = await sb
        .from("messages")
        .select("id, content, user_id")
        .eq("id", msg.reply_to_id)
        .single();
      if (error || !data) return null;
      const author = await Profiles.getById(data.user_id);
      const displayName = author?.display_name || author?.username || "Unknown";
      return { id: data.id, content: data.content, displayName };
    } catch {
      // Parent message may have been deleted, or the fetch failed —
      // either way, just render without the quote rather than throw.
      return null;
    }
  },

  /**
   * Subscribes to new INSERTs for one channel. Always replaces
   * any previous subscription, so switching channels never
   * stacks up duplicate listeners.
   */
  subscribeToChannel(channelId, onInsert){
    this.unsubscribe();

    this.realtimeSub = sb
      .channel(`messages:${channelId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`
      }, (payload) => onInsert(payload.new))
      .subscribe();
  },

  unsubscribe(){
    if (this.realtimeSub) {
      sb.removeChannel(this.realtimeSub);
      this.realtimeSub = null;
    }
  },

  /**
   * `isCurrent()` lets the caller cancel a render that's been
   * superseded by a newer one (e.g. the user switched channels
   * again before this render finished). Without it, two
   * overlapping renderList calls for different channel-open
   * requests can both clear+refill the same container and leave
   * messages duplicated or interleaved.
   */
  async renderList(container, messages, isCurrent = () => true){
    if (!isCurrent()) return;
    container.innerHTML = "";
    for (const msg of messages) {
      if (!isCurrent()) return;
      // One malformed row (bad reply embed, missing profile, etc.)
      // should never take down every message after it — log and
      // keep going instead of letting the loop throw.
      try {
        container.appendChild(await this.renderOne(msg));
      } catch (err) {
        console.error("Failed to render message", msg.id, err);
      }
    }
    if (isCurrent()) container.scrollTop = container.scrollHeight;
  },

  async appendOne(container, msg){
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    try {
      container.appendChild(await this.renderOne(msg));
    } catch (err) {
      console.error("Failed to render message", msg.id, err);
      return;
    }
    if (atBottom) container.scrollTop = container.scrollHeight;
  },

  async renderOne(msg){
    const author = await Profiles.getById(msg.user_id);
    const el = document.createElement("div");
    el.className = "message-row";
    el.dataset.messageId = msg.id;

    const time = new Date(msg.created_at).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit"
    });

    const displayName = author?.display_name || author?.username || "Unknown";
    const replyPreview = await this.resolveReplyPreview(msg);

    this._cache.set(String(msg.id), { content: msg.content, displayName, userId: msg.user_id });

    el.innerHTML = `
      <img class="message-avatar" src="${author?.avatar_url ?? Profiles.defaultAvatar("?")}" alt="" data-user="${msg.user_id}">
      <div class="message-body">
        ${replyPreview ? `
        <div class="message-reply-quote" data-jump-to="${replyPreview.id}">
          <svg viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5M4 12h10a5 5 0 0 1 5 5v2"/></svg>
          <span class="reply-quote-author">${escapeHtml(replyPreview.displayName)}</span>
          <span class="reply-quote-text"></span>
        </div>` : ""}
        <div class="message-meta">
          <span class="message-author" data-user="${msg.user_id}">${escapeHtml(displayName)}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text"></div>
        <div class="message-reactions" data-message-id="${msg.id}"></div>
      </div>
      <button type="button" class="message-reply-btn" data-reply-msg="${msg.id}" title="Reply" aria-label="Reply">
        <svg viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5M4 12h10a5 5 0 0 1 5 5v2"/></svg>
      </button>
    `;
    // textContent (not innerHTML) for anything that's raw user
    // content, so it can never inject HTML/script.
    el.querySelector(".message-text").textContent = msg.content;
    if (replyPreview) {
      el.querySelector(".reply-quote-text").textContent = truncateText(replyPreview.content, 100);
    }
    el.querySelector(".message-reactions").innerHTML = Reactions.renderPills(msg.id, Chat.user?.id);
    return el;
  },

  /** Re-renders just one message's reaction row after a toggle/realtime event. */
  updateReactions(container, messageId){
    const wrap = container.querySelector(`.message-reactions[data-message-id="${messageId}"]`);
    if (wrap) wrap.innerHTML = Reactions.renderPills(messageId, Chat.user?.id);
  }
};