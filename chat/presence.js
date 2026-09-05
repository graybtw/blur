/* =========================================================
   presence.js
   Tracks who's currently online using Supabase Realtime
   Presence. No table needed — presence state is ephemeral
   and lives only in the Realtime channel while people are
   connected.

   Load this file BEFORE chat.js (it defines the global
   `Presence` object chat.js wires into the UI).
   ========================================================= */

const Presence = {

  channel: null,
  users: new Map(),       // id -> { username, display_name, avatar_url }
  _listeners: new Set(),

  /**
   * Joins the shared "online-users" presence channel and starts
   * tracking this user under their own id. Call once after login,
   * once you have both the auth user id and their profile.
   */
  init(userId, profile){
    this.teardown();

    this.channel = sb.channel("online-users", {
      config: { presence: { key: userId } }
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        const state = this.channel.presenceState();
        const next = new Map();
        Object.entries(state).forEach(([id, metas]) => {
          const meta = metas[0];
          if (meta) next.set(id, meta);
        });
        this.users = next;
        this._emit();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.channel.track({
            username: profile.username,
            display_name: profile.display_name || null,
            avatar_url: profile.avatar_url
          });
        }
      });
  },

  /** Register a callback fired whenever the online set changes. */
  onChange(cb){
    this._listeners.add(cb);
  },

  count(){
    return this.users.size;
  },

  /** Returns online users as an array of { id, username, display_name, avatar_url }. */
  list(){
    return Array.from(this.users.entries())
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => (a.display_name || a.username || "").localeCompare(b.display_name || b.username || ""));
  },

  teardown(){
    if (this.channel) {
      sb.removeChannel(this.channel);
      this.channel = null;
    }
    this.users = new Map();
    this._listeners = new Set();
  },

  _emit(){
    this._listeners.forEach(cb => cb());
  }
};