/* =========================================================
   unread.js
   Shared unread-message state for public/staff channels and DMs.

   Mention pings remain owned by Mentions. This module tracks the
   broader "there are messages I have not read" state and keeps a
   small session cache in sync with the server read pointers.
   ========================================================= */

const Unread = {
  _keys: new Set(),
  _listeners: [],
  _storageKey: null,
  _watchSub: null,
  _watchToken: 0,
  _sessionToken: 0,

  init(userId){
    this.unsubscribe();
    this._sessionToken++;
    this._keys = new Set();
    this._listeners = [];
    this._storageKey = userId ? `blur-chat-unread-${userId}` : null;
    try {
      const raw = this._storageKey && sessionStorage.getItem(this._storageKey);
      if (raw) this._keys = new Set(JSON.parse(raw));
    } catch { /* a blocked/invalid session cache is harmless */ }
  },

  onChange(callback){
    if (typeof callback === "function") this._listeners.push(callback);
  },

  has(scope, id){ return !!id && this._keys.has(`${scope}:${id}`); },
  count(){ return this._keys.size; },

  mark(scope, id){
    if (!id) return;
    const key = `${scope}:${id}`;
    if (this._keys.has(key)) return;
    this._keys.add(key);
    this.persist();
    this.notify();
  },

  clear(scope, id){
    const key = `${scope}:${id}`;
    if (!this._keys.delete(key)) return;
    this.persist();
    this.notify();
  },

  clearAll(){
    if (!this._keys.size) return;
    this._keys.clear();
    this.persist();
    this.notify();
  },

  async recover(userId, channels = [], conversations = []){
    const sessionToken = this._sessionToken;
    const storageKey = this._storageKey;
    const isCurrent = () => sessionToken === this._sessionToken && storageKey === this._storageKey;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const channelIds = channels.map(channel => channel.id).filter(Boolean);
    if (channelIds.length) {
      try {
        const { data: reads, error: readsError } = await sb
          .from("channel_reads")
          .select("channel_id,last_read_at")
          .eq("user_id", userId)
          .in("channel_id", channelIds);
        if (!readsError) {
          if (!isCurrent()) return;
          const since = new Map((reads || []).map(row => [row.channel_id, row.last_read_at || cutoff]));
          const { data: messages, error } = await sb
            .from("messages")
            .select("channel_id,user_id,created_at")
            .in("channel_id", channelIds)
            .gt("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(500);
          if (!error) {
            for (const message of messages || []) {
              if (!isCurrent()) return;
              if (message.user_id !== userId && new Date(message.created_at) > new Date(since.get(message.channel_id) || cutoff)) {
                this.mark("channel", message.channel_id);
              }
            }
          }
        }
      } catch (error) { console.warn("Channel unread recovery skipped:", error?.message || error); }
    }

    const conversationIds = conversations.map(row => row.id).filter(Boolean);
    if (conversationIds.length) {
      try {
        const { data: messages, error } = await sb
          .from("dm_messages")
          .select("conversation_id,sender_id,created_at")
          .in("conversation_id", conversationIds)
          .neq("sender_id", userId)
          .gt("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!error) {
          for (const message of messages || []) {
            if (!isCurrent()) return;
            const conversation = conversations.find(row => row.id === message.conversation_id);
            const lastRead = conversation ? DirectMessages._myLastReadAt(conversation) : null;
            if (new Date(message.created_at) > new Date(lastRead || cutoff)) this.mark("dm", message.conversation_id);
          }
        }
      } catch (error) { console.warn("DM unread recovery skipped:", error?.message || error); }
    }

    // Session caches can outlive a deleted channel or a group the user left.
    // Remove keys that no longer refer to a conversation this account can
    // access; otherwise the global Chat dot would remain stuck after reload.
    const valid = new Set([
      ...channelIds.map(id => `channel:${id}`),
      ...conversationIds.map(id => `dm:${id}`)
    ]);
    if (!isCurrent()) return;
    let pruned = false;
    for (const key of [...this._keys]) {
      if (!valid.has(key)) { this._keys.delete(key); pruned = true; }
    }
    if (pruned) { this.persist(); this.notify(); }
  },

  watch(userId, isVisible, isAtBottom){
    this.unsubscribe();
    const watchToken = ++this._watchToken;
    this._watchSub = sb
      .channel(`unread:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        if (watchToken !== this._watchToken) return;
        const message = payload.new;
        if (!message?.channel_id || message.user_id === userId) return;
        if (!isVisible?.("channel", message.channel_id) || !isAtBottom?.()) this.mark("channel", message.channel_id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, payload => {
        if (watchToken !== this._watchToken) return;
        const message = payload.new;
        if (!message?.conversation_id || message.sender_id === userId) return;
        if (!isVisible?.("dm", message.conversation_id) || !isAtBottom?.()) this.mark("dm", message.conversation_id);
      })
      .subscribe();
  },

  unsubscribe(){
    this._watchToken++;
    if (this._watchSub) {
      sb.removeChannel(this._watchSub);
      this._watchSub = null;
    }
  },

  teardown(){
    this._sessionToken++;
    this.unsubscribe();
    this._keys = new Set();
    this._listeners = [];
    this._storageKey = null;
  },

  persist(){
    try { if (this._storageKey) sessionStorage.setItem(this._storageKey, JSON.stringify([...this._keys])); } catch { /* optional cache */ }
  },

  notify(){
    this._listeners.forEach(callback => {
      try { callback(); } catch (error) { console.error("Unread listener failed:", error); }
    });
  }
};
