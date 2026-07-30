/* =========================================================
   reactions.js
   Loading, toggling, live-subscribing to, and rendering emoji
   reactions on messages. Mirrors the pattern in messages.js —
   one realtime subscription per open channel, replaced on
   every channel switch.
   ========================================================= */

const Reactions = {

  EMOJIS: ["👍","❤️","😂","😮","😢","🔥","🎉","👀"],

  // messageId (string) -> Map(emoji -> Set(userId))
  byMessage: new Map(),
  realtimeSub: null,

  key(messageId){
    return String(messageId);
  },

  ingest(rows){
    this.byMessage.clear();
    for (const row of rows) this._add(row.message_id, row.emoji, row.user_id);
  },

  _add(messageId, emoji, userId){
    const mid = this.key(messageId);
    if (!this.byMessage.has(mid)) this.byMessage.set(mid, new Map());
    const emojiMap = this.byMessage.get(mid);
    if (!emojiMap.has(emoji)) emojiMap.set(emoji, new Set());
    emojiMap.get(emoji).add(userId);
  },

  _remove(messageId, emoji, userId){
    const mid = this.key(messageId);
    const emojiMap = this.byMessage.get(mid);
    if (!emojiMap) return;
    const set = emojiMap.get(emoji);
    if (!set) return;
    set.delete(userId);
    if (set.size === 0) emojiMap.delete(emoji);
  },

  async loadForChannel(channelId){
    const { data, error } = await sb
      .from("message_reactions")
      .select("*")
      .eq("channel_id", channelId);
    if (error) throw error;
    this.ingest(data); // fully replaces byMessage with this channel's current data
    return data;
  },

  /** Adds the reaction if the user hasn't used that emoji on this message yet, else removes it. */
  async toggle(messageId, channelId, userId, emoji){
    const already = this.byMessage.get(this.key(messageId))?.get(emoji)?.has(userId);

    if (already) {
      const { error } = await sb
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
      if (error) throw error;
      this._remove(messageId, emoji, userId); // optimistic; realtime DELETE is a harmless no-op re-apply
    } else {
      const { error } = await sb
        .from("message_reactions")
        .insert({ message_id: messageId, channel_id: channelId, user_id: userId, emoji });
      if (error) throw error;
      this._add(messageId, emoji, userId);
    }
  },

  /**
   * Subscribes to INSERT/DELETE for one channel's reactions.
   * `onChange(messageId)` fires so the caller can re-render just
   * that message's pill row. Does NOT touch byMessage — the
   * caller is expected to have already called loadForChannel()
   * (which resets+refills it) before subscribing.
   */
  subscribeToChannel(channelId, onChange){
    this.unsubscribe();

    this.realtimeSub = sb
      .channel(`reactions:${channelId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "message_reactions",
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        this._add(payload.new.message_id, payload.new.emoji, payload.new.user_id);
        onChange(payload.new.message_id);
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "message_reactions",
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        // Requires "replica identity full" on message_reactions
        // (see supabase-schema.sql) so payload.old has more than
        // just the primary key.
        this._remove(payload.old.message_id, payload.old.emoji, payload.old.user_id);
        onChange(payload.old.message_id);
      })
      .subscribe();
  },

  /** Just tears down the realtime channel — leaves byMessage alone. */
  unsubscribe(){
    if (this.realtimeSub) {
      sb.removeChannel(this.realtimeSub);
      this.realtimeSub = null;
    }
  },

  /** Full reset — call this on sign-out, not on every channel switch. */
  reset(){
    this.unsubscribe();
    this.byMessage.clear();
  },

  /** Builds the inner HTML for one message's reaction row: existing pills + a "+" add button. */
  renderPills(messageId, currentUserId){
    const emojiMap = this.byMessage.get(this.key(messageId));
    let html = "";

    if (emojiMap) {
      for (const [emoji, users] of emojiMap) {
        if (users.size === 0) continue;
        const mine = users.has(currentUserId);
        html += `<button type="button" class="reaction-pill ${mine ? "mine" : ""}" data-react-message="${messageId}" data-react-emoji="${emoji}">${emoji} <span>${users.size}</span></button>`;
      }
    }

    html += `<button type="button" class="reaction-add" data-react-add="${messageId}" aria-label="Add reaction">+</button>`;
    return html;
  }
};