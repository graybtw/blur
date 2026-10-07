/* =========================================================
   mentions.js
   Per-conversation mention/ping state for the logged-in user.

   Tracks "someone @mentioned me and I haven't opened that
   conversation yet" for channels AND DMs, and drives the small
   dot indicators (Chat nav item, channel list, DM list).

   Sources of truth, per the existing architecture:
   - DMs: the persisted last-read pointers on dm_conversations —
     so DM mention state RECOVERS after reload via one query.
   - Channels: last-read timestamps are persisted in channel_reads;
     sessionStorage remains a fast local cache for the indicators.

   Live mentions arrive through ONE realtime channel listening
   to unfiltered INSERTs on messages + dm_messages. Realtime
   enforces RLS on postgres_changes, so dm_messages only ever
   delivers rows from your own conversations; channel messages
   are already readable by all authenticated users.
   ========================================================= */

const Mentions = {

  EVERYONE_RE: /(^|[^a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])/i,

  _keys: new Set(),     // "channel:<id>" / "dm:<id>"
  _listeners: [],
  _storageKey: null,
  _watchSub: null,
  _watchToken: 0,
  _sessionToken: 0,

  init(userId){
    // Reset per-login state and discard the previous user's realtime
    // subscription. Keeping that channel alive during an account switch
    // would let events for the old user populate the new session's keys.
    this.unsubscribeWatch();
    this._sessionToken++;
    this._keys = new Set();
    this._listeners = [];
    this._storageKey = `blur-chat-mentions-${userId}`;
    try {
      const raw = sessionStorage.getItem(this._storageKey);
      if (raw) this._keys = new Set(JSON.parse(raw));
    } catch { /* fresh state */ }
  },

  /** Marks + clears feed the indicators through here. */
  onChange(cb){
    this._listeners.push(cb);
  },

  has(scope, id){
    return this._keys.has(`${scope}:${id}`);
  },

  count(){
    return this._keys.size;
  },

  prune(channels = [], conversations = []){
    const valid = new Set([
      ...(channels || []).map(channel => `channel:${channel.id}`),
      ...(conversations || []).map(conversation => `dm:${conversation.id}`)
    ]);
    let changed = false;
    for (const key of [...this._keys]) {
      if (!valid.has(key)) { this._keys.delete(key); changed = true; }
    }
    if (changed) { this._persist(); this._notify(); }
  },

  mark(scope, id){
    const key = `${scope}:${id}`;
    if (this._keys.has(key)) return;
    this._keys.add(key);
    this._persist();
    this._notify();
  },

  clear(scope, id){
    const key = `${scope}:${id}`;
    if (!this._keys.has(key)) return;
    this._keys.delete(key);
    this._persist();
    this._notify();
  },

  clearAll(){
    if (!this._keys.size) return;
    this._keys.clear();
    this._persist();
    this._notify();
  },

  teardown(){
    this._sessionToken++;
    this.unsubscribeWatch();
    this._keys = new Set();
    this._listeners = [];
    if (this._storageKey) {
      try { sessionStorage.removeItem(this._storageKey); } catch { /* ignore */ }
      this._storageKey = null;
    }
  },

  /**
   * Recovers DM mention state after a reload using the existing
   * persisted unread architecture: any dm_message in one of my
   * conversations that mentions me and is newer than my last-read
   * pointer for that conversation counts as an unread mention.
   * Channel state has no persisted read pointers (see header).
   */
  async recoverDmMentions(userId){
    const sessionToken = this._sessionToken;
    const storageKey = this._storageKey;
    try {
      const convs = DirectMessages._rows;
      if (!convs.length) return;

      const { data, error } = await sb
        .from("dm_messages")
        .select("conversation_id, sender_id, content, created_at")
        .in("conversation_id", convs.map(c => c.id))
        .ilike("content", `%<@${userId}>%`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      if (sessionToken !== this._sessionToken || storageKey !== this._storageKey) return;

      for (const m of data || []) {
        if (sessionToken !== this._sessionToken || storageKey !== this._storageKey) return;
        if (m.sender_id === userId) continue;
        const conv = convs.find(c => c.id === m.conversation_id);
        if (!conv) continue;
        // don't mark the conversation the user already has open
        if (DirectMessages.activeId === m.conversation_id) continue;
        if (new Date(m.created_at) > new Date(DirectMessages._myLastReadAt(conv))) {
          this.mark("dm", m.conversation_id);
        }
      }
    } catch (err) {
      console.error("DM mention recovery failed:", err);
    }
  },

  async recoverChannelMentions(userId, channels){
    const sessionToken = this._sessionToken;
    const storageKey = this._storageKey;
    try {
      const ids = (channels || []).map(c => c.id);
      if (!ids.length) return;
      const { data: reads, error: readError } = await sb.from("channel_reads")
        .select("channel_id,last_read_at").eq("user_id", userId).in("channel_id", ids);
      if (readError) return; // migration not applied yet
      if (sessionToken !== this._sessionToken || storageKey !== this._storageKey) return;
      const since = new Map((reads || []).map(r => [r.channel_id, r.last_read_at]));
      const everyoneRoleCache = new Map();
      const { data, error } = await sb.from("messages")
        .select("channel_id,user_id,content,created_at").in("channel_id", ids)
        .gt("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      for (const m of data || []) {
        if (sessionToken !== this._sessionToken || storageKey !== this._storageKey) return;
        if (m.is_ai === true) continue;
        if (m.user_id === userId || (since.get(m.channel_id) && new Date(m.created_at) <= new Date(since.get(m.channel_id)))) continue;
        const direct = String(m.content).includes(`<@${userId}>`);
        let everyone = false;
        if (this.EVERYONE_RE.test(String(m.content))) {
          if (!everyoneRoleCache.has(m.user_id)) everyoneRoleCache.set(m.user_id, ChatPermissions.canUseEveryoneId(m.user_id));
          everyone = await everyoneRoleCache.get(m.user_id);
        }
        if ((direct || everyone) && !this.has("channel", m.channel_id)) this.mark("channel", m.channel_id);
      }
    } catch (err) { console.error("Channel mention recovery failed:", err); }
  },

  async markChannelRead(userId, channelId){
    if (!userId || !channelId) return;
    try {
      await sb.from("channel_reads").upsert({ user_id:userId, channel_id:channelId, last_read_at:new Date().toISOString() }, { onConflict:"user_id,channel_id" });
    } catch { /* optional migration */ }
  },

  /**
   * Live watch: one realtime channel, unfiltered INSERTs on both
   * message tables. Realtime enforces RLS, so dm_messages only
   * delivers rows from this user's conversations. `isVisible(scope, id)`
   * lets the caller skip conversations currently on screen (those
   * are read live).
   */
  watch(userId, isVisible){
    this.unsubscribeWatch();
    const watchToken = ++this._watchToken;

    this._watchSub = sb
      .channel(`mentions:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages"
      }, async (payload) => {
        if (watchToken !== this._watchToken) return;
        const m = payload.new;
        if (!m?.channel_id) return;
        // AI replies use the current user's message path, but should never
        // become direct or @everyone notifications for other users.
        if (m.is_ai === true) return;
        if (m.user_id === userId) return;
        const content = String(m.content);
        const direct = content.includes(`<@${userId}>`);
        const everyone = this.EVERYONE_RE.test(content);
        if (!direct && !everyone) return;

        // @everyone is privileged independently of autocomplete. Verify
        // the sender's server-protected role before treating it as a ping.
        if (everyone && !(await ChatPermissions.canUseEveryoneId(m.user_id))) {
          if (!direct) return;
        }
        if (watchToken !== this._watchToken) return;
        if (isVisible?.("channel", m.channel_id)) return;
        this.mark("channel", m.channel_id);
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dm_messages"
      }, (payload) => {
        if (watchToken !== this._watchToken) return;
        const m = payload.new;
        if (!m?.conversation_id) return;
        if (m.sender_id === userId) return;
        if (!String(m.content).includes(`<@${userId}>`)) return;
        if (isVisible?.("dm", m.conversation_id)) return;
        this.mark("dm", m.conversation_id);
      })
      .subscribe();
  },

  unsubscribeWatch(){
    this._watchToken++;
    if (this._watchSub) {
      sb.removeChannel(this._watchSub);
      this._watchSub = null;
    }
  },

  _persist(){
    try {
      sessionStorage.setItem(this._storageKey, JSON.stringify([...this._keys]));
    } catch { /* storage full/blocked — state stays in memory */ }
  },

  _notify(){
    this._listeners.forEach(cb => {
      try { cb(); } catch (err) { console.error("Mentions listener failed:", err); }
    });
  }
};
