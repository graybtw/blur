/* =========================================================
   account.js
   GLOBAL Blur account service.

   Owns the Supabase auth lifecycle for the whole site — not
   just Chat. Restores the existing session on startup, loads
   the user's public.profiles row, and exposes a small API any
   module can consume (Games, Watch, Music, AI, Settings later):

     Account.user            — auth user or null
     Account.profile         — public.profiles row or null
     Account.ready           — Promise<{user, profile}> resolving
                               once after the startup restore
     Account.onAuthStateChange(cb) — subscribe to (user, profile)
                               changes; returns an unsubscribe fn
     Account.signOut()
     Account.setProfile(p)   — keep the layer in sync after the
                               profile row is created or edited

   Behavior notes:
   - The session is restored EXPLICITLY via getSession() on
     startup, then onAuthStateChange is subscribed with
     INITIAL_SESSION ignored — so listeners get exactly one
     startup callback (the old chat-only Auth.init relied on
     the same single-delivery contract; doing both would fire
     twice and race profile creation).
   - The username/profile creation flow is preserved: on sign-in
     with no profile row, we try the username stashed in the
     auth user's metadata (written by chat/auth.js at signup).
     If that can't produce a profile, profile stays null and
     Chat renders its "Choose a username" modal — the single
     other place that creates profile rows.
   ========================================================= */

// Capture the promise resolver outside the object literal. Referencing the
// `Account` const from its own `ready` initializer triggers the temporal
// dead-zone during page load and prevents the account service from existing.
let accountReadyResolve = null;

const Account = {

  user: null,
  profile: null,

  _listeners: new Set(),
  _profileListeners: new Set(),
  _initialized: false,
  _initialDelivered: false,
  _readyResolve: null,
  _applySeq: 0,

  ready: new Promise((resolve) => {
    accountReadyResolve = resolve;
  }),

  /**
   * Boots the auth lifecycle. Idempotent. Deferred to
   * DOMContentLoaded so every script on the page (the Supabase
   * client, Profiles, feature modules) is guaranteed to have
   * executed before any await inside resumes — parser tasks can
   * otherwise drain microtasks between script files, which raced
   * profile loading ahead of profiles.js.
   */
  async init(){
    if (this._initialized) return;
    this._initialized = true;

    if (!window.sb) {
      console.error("Account: Supabase client (window.sb) not found — is chat/supabaseClient.js loaded first?");
      this._deliver(null, null);
      return;
    }

    // 1. Explicitly restore the persisted session on startup.
    //    supabase-js rehydrates it from its localStorage key;
    //    this just makes the restore an explicit, awaited step.
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.error("Account: session restore failed:", error);
      }
      await this._applyUser(data?.session?.user ?? null);
    } catch (err) {
      console.error("Account: session restore threw:", err);
      await this._applyUser(null);
    }

    // 2. Subscribe to subsequent changes. INITIAL_SESSION is
    //    skipped because the restore above already delivered the
    //    startup state exactly once. TOKEN_REFRESHED is skipped
    //    because the user didn't change — re-delivering it would
    //    make consumers (Chat) re-run their whole init flow.
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      this._applyUser(session?.user ?? null);
    });
  },

  /**
   * Applies a new auth user: loads (or attempts to create) the
   * profile row, updates state, and notifies listeners.
   */
  async _applyUser(user){
    const applySeq = ++this._applySeq;
    this.user = user;
    this.profile = null;

    let profile = null;
    if (user) {
      profile = await this._loadOrCreateProfile(user);
    }

    // A slow profile request from a previous account/session must never
    // overwrite the state for the newer auth event.
    if (applySeq !== this._applySeq) return;
    this.profile = profile;

    this._deliver(user, this.profile);
  },

  /**
   * Loads the user's public.profiles row. If it doesn't exist,
   * tries the username stashed on the auth user at signup — the
   * same fallback chat.js used to own. On failure (e.g. the
   * username is taken) profile stays null so the caller (Chat)
   * can run the username-setup modal.
   */
  async _loadOrCreateProfile(user){
    this.profileError = null;
    try {
      // Always refresh the signed-in profile on auth initialization so
      // Supabase role changes are reflected without stale cache data.
      let profile = await Profiles.getById(user.id, { force: true });

      if (!profile) {
        const fallbackUsername = user.user_metadata?.username;
        if (fallbackUsername) {
          profile = await Profiles.createProfile({ id: user.id, username: fallbackUsername });
        }
      }

      return profile ?? null;
    } catch (err) {
      console.error("Account: profile load/creation failed:", err);
      this.profileError = err?.message || "Couldn't load your profile.";
      return null;
    }
  },

  /**
   * Re-attempts the profile load after a failure. Notifies listeners
   * so the UI can move from the error state back to normal content.
   */
  async retryProfile(){
    if (!this.user) return null;
    const retryUser = this.user;
    const retryUserId = retryUser.id;
    const applySeq = ++this._applySeq;
    this.profileError = null;
    const profile = await this._loadOrCreateProfile(retryUser);
    // A sign-out or account switch can happen while the retry request is in
    // flight. Never let the old response repopulate the new session.
    if (applySeq !== this._applySeq || this.user?.id !== retryUserId) return null;
    this.profile = profile;
    this._notifyProfileListeners();
    return this.profile;
  },

  /**
   * Registers an auth-state listener. `cb(user, profile)` fires
   * on every change, and ONCE with the current state right after
   * subscribing if startup has already completed — so callers
   * don't need to care whether they subscribed before or after
   * the session restore finished. Returns an unsubscribe fn.
   */
  onAuthStateChange(cb){
    this._listeners.add(cb);

    if (this._initialDelivered) {
      // Late subscriber: replay current state once (deferred so
      // the subscription itself stays synchronous).
      setTimeout(() => {
        try {
          const result = cb(this.user, this.profile);
          if (result?.catch) result.catch(err => console.error("Account listener failed:", err));
        } catch (err) { console.error("Account listener failed:", err); }
      }, 0);
    }

    return () => this._listeners.delete(cb);
  },

  /**
   * Registers a profile-only listener: `cb(user, profile)` fires
   * when the profile row is created or edited for the CURRENT
   * user (via setProfile) — without re-delivering an auth event,
   * so consumers can refresh UI without re-running init flows.
   * Returns an unsubscribe fn.
   */
  onProfileChange(cb){
    this._profileListeners.add(cb);
    return () => this._profileListeners.delete(cb);
  },

  _notifyProfileListeners(){
    this._profileListeners.forEach((cb) => {
      try {
        cb(this.user, this.profile);
      } catch (err) {
        console.error("Account profile listener failed:", err);
      }
    });
  },

  _deliver(user, profile){
    this._initialDelivered = true;
    this._readyResolve?.({ user, profile });

    this._listeners.forEach((cb) => {
      try {
        const result = cb(user, profile);
        if (result?.catch) result.catch(err => console.error("Account listener failed:", err));
      } catch (err) {
        console.error("Account listener failed:", err);
      }
    });
  },

  /**
   * Signs out. State clearing happens through the SIGNED_OUT
   * auth event so the session and our listeners never disagree.
   */
  async signOut(){
    await sb.auth.signOut();
  },

  /**
   * Keeps the layer's profile in sync when the row is created
   * through the username-setup modal or edited via profile UI.
   * Updates state and notifies profile-only listeners; auth
   * listeners are NOT re-delivered (consumers shouldn't re-run
   * their init flows for a profile edit).
   */
  setProfile(profile){
    this.profile = profile ? { ...profile, roles: Permissions.profileRoles(profile), role: Permissions.primaryRole(profile) } : null;
    this._notifyProfileListeners();
  }
};

Account._readyResolve = accountReadyResolve;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Account.init());
} else {
  Account.init();
}
