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
  users: new Map(),       // id -> { username, display_name, avatar_url, activity }
  _listeners: new Set(),
  _generation: 0,
  userId: null,
  _profile: null,
  _subscribed: false,
  _activityUpdatedAt: 0,
  _activities: new Map(),
  _typing: null,
  _typingUpdatedAt: 0,
  shareActivity: false,

  /**
   * Joins the shared "online-users" presence channel and starts
   * tracking this user under their own id. Call once after login,
   * once you have both the auth user id and their profile.
   */
  init(userId, profile){
    this.teardown(true);
    const generation = ++this._generation;
    this.userId = userId;
    this._profile = profile;
    try {
      this.shareActivity = localStorage.getItem("blur-chat-activity-sharing") === "true";
    } catch {
      this.shareActivity = false;
    }

    const channel = sb.channel("online-users", {
      config: { presence: { key: userId } }
    });
    this.channel = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        if (generation !== this._generation || this.channel !== channel) return;
        const state = channel.presenceState();
        const next = new Map();
        Object.entries(state).forEach(([id, metas]) => {
          // A person may have Blur open in several tabs. Prefer the most
          // recently updated presence payload so the visible activity stays
          // in step with whichever tab they used most recently.
          const meta = (metas || []).reduce((latest, candidate) => {
            if (!latest) return candidate;
            const candidateUpdatedAt = Math.max(Number(candidate?.activityUpdatedAt || 0), Number(candidate?.typingUpdatedAt || 0));
            const latestUpdatedAt = Math.max(Number(latest?.activityUpdatedAt || 0), Number(latest?.typingUpdatedAt || 0));
            return candidateUpdatedAt >= latestUpdatedAt
              ? candidate
              : latest;
          }, null);
          if (meta) next.set(id, meta);
        });
        this.users = next;
        this._emit();
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED" || generation !== this._generation || this.channel !== channel) return;
        try {
          this._subscribed = true;
          await this._trackSelf(generation);
        } catch (error) {
          console.warn("Presence tracking unavailable:", error?.message || error);
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

  /** Returns online users with their shared activity, when they opted in. */
  list(){
    return Array.from(this.users.entries())
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => (a.display_name || a.username || "").localeCompare(b.display_name || b.username || ""));
  },

  activityFor(userId){
    if (!userId) return null;
    if (userId === this.userId) return this._currentActivity();
    return this.users.get(userId)?.activity || null;
  },

  setActivity(type, details){
    if (!["game", "movie", "music"].includes(type)) return;
    const title = String(details?.title || "").trim().slice(0, 120);
    if (!title) return this.clearActivity(type);
    const subtitle = String(details?.subtitle || "").trim().slice(0, 100);
    const previous = this._activities.get(type);
    if (previous?.title === title && previous?.subtitle === subtitle) return;
    this._activities.delete(type);
    this._activities.set(type, { type, title, subtitle, updatedAt: Date.now() });
    this._activityUpdatedAt = Date.now();
    this._trackSelf();
  },

  clearActivity(type){
    if (type) this._activities.delete(type);
    else this._activities.clear();
    this._activityUpdatedAt = Date.now();
    this._trackSelf();
  },

  setShareActivity(enabled, persist = false){
    this.shareActivity = Boolean(enabled);
    this._activityUpdatedAt = Date.now();
    if (persist) {
      try { localStorage.setItem("blur-chat-activity-sharing", String(this.shareActivity)); } catch {}
    }
    this._trackSelf();
  },

  /** Share the conversation this user is currently typing in via presence. */
  setTyping(scope, scopeId, active = true){
    const next = active && scope && scopeId ? { scope, scopeId } : null;
    const previous = this._typing;
    const same = previous?.scope === next?.scope && previous?.scopeId === next?.scopeId;
    const now = Date.now();
    // Keystrokes can arrive quickly; refresh the presence at a modest rate
    // while still sending an immediate first update and every state change.
    if (same && now - this._typingUpdatedAt < 1600) return;
    if (!next && !previous) return;
    this._typing = next;
    this._typingUpdatedAt = now;
    this._trackSelf();
  },

  _currentActivity(){
    return [...this._activities.values()].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  },

  async _trackSelf(generation = this._generation){
    const channel = this.channel;
    if (!channel || !this._subscribed || !this._profile || generation !== this._generation) return;
    const activity = this.shareActivity ? this._currentActivity() : null;
    try {
      await channel.track({
        username: this._profile.username,
        display_name: this._profile.display_name || null,
        avatar_url: this._profile.avatar_url,
        activity,
        activityUpdatedAt: this._activityUpdatedAt || Date.now(),
        typing: this._typing,
        typingUpdatedAt: this._typingUpdatedAt || Date.now()
      });
    } catch (error) {
      console.warn("Presence update unavailable:", error?.message || error);
    }
  },

  teardown(preserveActivities = false){
    this._generation++;
    this._subscribed = false;
    if (this.channel) {
      sb.removeChannel(this.channel);
      this.channel = null;
    }
    this._profile = null;
    this.userId = null;
    this.users = new Map();
    this._listeners = new Set();
    if (!preserveActivities) {
      this._activities.clear();
      this.shareActivity = false;
      this._activityUpdatedAt = 0;
    }
    this._typing = null;
    this._typingUpdatedAt = 0;
  },

  _emit(){
    this._listeners.forEach(cb => {
      try { cb(); } catch (error) { console.error("Presence listener failed:", error); }
    });
  }
};

window.BlurPresence = Presence;

function formatPresenceActivity(activity){
  const type = activity?.type;
  if (!["game", "movie", "music"].includes(type) || !activity?.title) return "";
  const verbs = { game: "Playing", movie: "Watching", music: "Listening to" };
  const title = String(activity.title).trim().slice(0, 120);
  const subtitle = String(activity.subtitle || "").trim().slice(0, 100);
  const main = type === "music" && subtitle ? `${title} · ${subtitle}` : title;
  return `${verbs[type]} ${main}${type === "movie" && subtitle ? ` · ${subtitle}` : ""}`;
}

function presenceActivityMarkup(activity, className = "chat-activity-line"){
  if (!["game", "movie", "music"].includes(activity?.type)) return "";
  const label = formatPresenceActivity(activity);
  if (!label) return "";
  const icons = {
    game: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9h11a4.5 4.5 0 0 1 4.3 5.8l-.6 2a2.5 2.5 0 0 1-4.1 1.1l-2.3-2H9.2l-2.3 2a2.5 2.5 0 0 1-4.1-1.1l-.6-2A4.5 4.5 0 0 1 6.5 9Z"/><path d="M7 12v4m-2-2h4m7-1h.01M18 15h.01"/></svg>',
    movie: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 5 4 5m2-5 4 5m-10 9 4-5m2 5 4-5"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  };
  return `<span class="${className} presence-activity-${activity.type}" title="${escapeAttr(label)}">${icons[activity.type] || ""}<span>${escapeHtml(label)}</span></span>`;
}

window.addEventListener("storage", event => {
  if (event.key === "blur-chat-activity-sharing") {
    Presence.setShareActivity(event.newValue === "true");
  }
});
