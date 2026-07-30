/* =========================================================
   direct-messages.js
   Everything about 1:1 DMs: the `dm_conversations` +
   `dm_messages` tables. Mirrors two existing patterns at once —
   channels.js's "list + render into the sidebar" shape for the
   conversation list, and messages.js's "load/send/subscribe"
   shape for whichever conversation is currently open.

   DMs can only be started with an existing friend (also
   enforced server-side by RLS on dm_conversations' insert
   policy) — search/strangers never get a Message button.

   Depends on: sb, Profiles, Friends, escapeHtml — all already
   defined by profiles.js / friends.js.
   ========================================================= */

const DirectMessages = {

  _userId: null,
  _rows: [],          // dm_conversations rows, each with an attached _otherProfile
  _listeners: [],
  _listSub: null,
  _msgSub: null,

  activeId: null,
  PAGE_SIZE: 50,

  /** Load every conversation involving this user and start listening for live changes. */
  async init(userId){
    this._userId = userId;
    const { data, error } = await sb
      .from("dm_conversations")
      .select("*")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    if (error) throw error;
    this._rows = data || [];
    await Promise.all(this._rows.map(row => this._hydrate(row)));
    this._subscribeList();
  },

  /** Call on sign-out to stop listening and clear state. */
  teardown(){
    if (this._listSub) { sb.removeChannel(this._listSub); this._listSub = null; }
    this.unsubscribeConversation();
    this._rows = [];
    this._userId = null;
    this.activeId = null;
    this._listeners = [];
  },

  /** Register a callback fired whenever the conversation list changes (local or remote). */
  onChange(cb){
    this._listeners.push(cb);
  },

  _notify(){
    this._listeners.forEach(fn => {
      try { fn(); } catch (err) { console.error("DirectMessages listener failed:", err); }
    });
  },

  async _hydrate(row){
    row._otherProfile = await Profiles.getById(this.otherId(row));
  },

  _subscribeList(){
    this._listSub = sb
      .channel(`dm_conversations:${this._userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_conversations" }, async (payload) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!row || (row.user_a !== this._userId && row.user_b !== this._userId)) return;

        if (payload.eventType === "DELETE") {
          this._rows = this._rows.filter(r => r.id !== row.id);
        } else {
          const idx = this._rows.findIndex(r => r.id === row.id);
          if (idx >= 0) {
            row._otherProfile = this._rows[idx]._otherProfile;
            this._rows[idx] = row;
          } else {
            await this._hydrate(row);
            this._rows.push(row);
          }
        }
        this._notify();
      })
      .subscribe();
  },

  otherId(row){
    return row.user_a === this._userId ? row.user_b : row.user_a;
  },

  _myLastReadAt(row){
    return row.user_a === this._userId ? row.user_a_last_read_at : row.user_b_last_read_at;
  },

  isUnread(row){
    if (row.id === this.activeId) return false;
    return new Date(row.last_message_at) > new Date(this._myLastReadAt(row));
  },

  hasUnread(){
    return this._rows.some(r => this.isUnread(r));
  },

  sortedConversations(){
    return [...this._rows].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  },

  /**
   * Finds the conversation with this friend, creating one if it
   * doesn't exist yet. Checks the local cache first, then the
   * server (in case the other person DM'd us first this
   * session, or we're on a fresh page load), then creates.
   */
  async getOrCreateConversation(otherUserId){
    let row = this._rows.find(r => this.otherId(r) === otherUserId);
    if (row) return row;

    const { data: existing, error: findErr } = await sb
      .from("dm_conversations")
      .select("*")
      .or(`and(user_a.eq.${this._userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${this._userId})`)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      await this._hydrate(existing);
      this._rows.push(existing);
      this._notify();
      return existing;
    }

    const { data, error } = await sb
      .from("dm_conversations")
      .insert({ user_a: this._userId, user_b: otherUserId })
      .select()
      .single();
    if (error) throw error;
    await this._hydrate(data);
    this._rows.push(data);
    this._notify();
    return data;
  },

  /** Bumps our own "last read" pointer to now — call on open and on receiving a message while open. */
  async markRead(conversationId){
    const row = this._rows.find(r => r.id === conversationId);
    if (!row) return;
    const nowIso = new Date().toISOString();
    const field = row.user_a === this._userId ? "user_a_last_read_at" : "user_b_last_read_at";
    row[field] = nowIso; // optimistic, so the unread dot clears immediately
    this._notify();
    const { error } = await sb.from("dm_conversations").update({ [field]: nowIso }).eq("id", conversationId);
    if (error) console.error("Failed to mark DM read:", error);
  },

  // ---------------------------------------------------------
  // Sidebar list (renders into #dm-list, same shape as Channels.render)
  // ---------------------------------------------------------

  render(container, onSelect){
    const rows = this.sortedConversations();
    container.innerHTML = rows.length
      ? rows.map(row => this._rowHtml(row)).join("")
      : `<div class="dm-list-empty">No conversations yet.<br>Message a friend to start one.</div>`;

    container.querySelectorAll("[data-dm-conversation]").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = rows.find(r => r.id === btn.dataset.dmConversation);
        if (row) onSelect(row);
      });
    });
  },

  _rowHtml(row){
    const p = row._otherProfile;
    if (!p) return "";
    return `
      <button type="button" class="dm-item ${row.id === this.activeId ? "active" : ""}" data-dm-conversation="${row.id}">
        <img class="dm-item-avatar" src="${p.avatar_url}" alt="">
        <span class="dm-item-name">${escapeHtml(p.display_name || p.username)}</span>
        ${this.isUnread(row) ? `<span class="dm-item-dot"></span>` : ``}
      </button>
    `;
  },

  setActive(container, id){
    this.activeId = id;
    container.querySelectorAll(".dm-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.dmConversation === id);
    });
  },

  // ---------------------------------------------------------
  // Messages within whichever conversation is open (mirrors messages.js)
  // ---------------------------------------------------------

  async loadInitial(conversationId){
    const { data, error } = await sb
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(this.PAGE_SIZE);
    if (error) throw error;
    return data.reverse();
  },

  async send(conversationId, senderId, content){
    content = content.trim();
    if (!content) return;
    const { error } = await sb
      .from("dm_messages")
      .insert({ conversation_id: conversationId, sender_id: senderId, content });
    if (error) throw error;
    // So sending doesn't leave your own conversation looking unread.
    this.markRead(conversationId);
  },

  subscribeToConversation(conversationId, onInsert){
    this.unsubscribeConversation();
    this._msgSub = sb
      .channel(`dm_messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => onInsert(payload.new))
      .subscribe();
  },

  unsubscribeConversation(){
    if (this._msgSub) {
      sb.removeChannel(this._msgSub);
      this._msgSub = null;
    }
  },

  async renderList(container, messages){
    container.innerHTML = "";
    for (const msg of messages) {
      try {
        container.appendChild(await this.renderOne(msg));
      } catch (err) {
        console.error("Failed to render DM", msg.id, err);
      }
    }
    container.scrollTop = container.scrollHeight;
  },

  async appendOne(container, msg){
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    try {
      container.appendChild(await this.renderOne(msg));
    } catch (err) {
      console.error("Failed to render DM", msg.id, err);
      return;
    }
    if (atBottom) container.scrollTop = container.scrollHeight;
  },

  async renderOne(msg){
    const author = await Profiles.getById(msg.sender_id);
    const el = document.createElement("div");
    el.className = "message-row";
    el.dataset.messageId = msg.id;

    const time = new Date(msg.created_at).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit"
    });
    const displayName = author?.display_name || author?.username || "Unknown";

    // No reply-quote or reaction row here — DMs don't support
    // either yet (both are channel-message-only features today).
    el.innerHTML = `
      <img class="message-avatar" src="${author?.avatar_url ?? Profiles.defaultAvatar("?")}" alt="" data-user="${msg.sender_id}">
      <div class="message-body">
        <div class="message-meta">
          <span class="message-author" data-user="${msg.sender_id}">${escapeHtml(displayName)}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text"></div>
      </div>
    `;
    el.querySelector(".message-text").textContent = msg.content;
    return el;
  }
};