/* =========================================================
   profiles.js
   Everything about the `profiles` table: fetching/creating/
   editing rows, plus the first-run username modal and the
   profile popup shown when clicking a username or avatar.
   ========================================================= */

const Profiles = {

  cache: new Map(),
  _pending: new Map(),
  _cacheEpoch: 0,

  // Badges are intentionally a small, curated vocabulary.  Profiles store
  // the stable ids in `profiles.badges`; labels and icons stay in the client
  // so user-provided text can never become markup.
  BADGE_DEFINITIONS: Object.freeze({
    developer: Object.freeze({
      label: "Active developer",
      description: "Actively building and maintaining Blur.",
      icon: "code"
    }),
    travelersdomain: Object.freeze({
      label: "Traveler's Domain",
      description: "Redeemed from the Traveler's Domain code.",
      icon: "travelers",
      image: "assets/icons/travelers-domain.png"
    }),
    thememaker: Object.freeze({
      label: "Theme Maker",
      description: "Published a community theme for Blur.",
      icon: "theme"
    })
  }),

  // BlurGPT is a first-class chat identity even though its replies are stored
  // on the requesting user's message row for database compatibility.
  AI_PROFILE_ID: "blur-ai",
  aiProfile(){
    return {
      id: this.AI_PROFILE_ID,
      username: "blur-ai",
      display_name: "BlurGPT",
      bio: "Official AI for Blur\nMade by blur studios",
      pronouns: "",
      status_message: "Here to help",
      avatar_url: "assets/icons/ai.png",
      banner_url: null,
      accent_color: "#c9c39a",
      role: "ai",
      roles: ["ai"],
      created_at: "2024-01-01T00:00:00.000Z"
    };
  },

  clearCache(){
    this._cacheEpoch++;
    this.cache.clear();
    this._pending.clear();
  },

  // Invalidate and clear a profile popup when Chat changes scope or the
  // global session ends.  renderProfilePopup() uses the same token map to
  // prevent a delayed profile request from resurrecting stale UI.
  closePopup(container){
    if (!container) return;
    if (!this._popupTokens) this._popupTokens = new WeakMap();
    // A loaded profile card owns a document-level Escape listener.  Remove
    // that listener whenever Chat closes/replaces the overlay so repeated
    // profile opens cannot accumulate stale handlers.
    const cleanup = this._popupCleanups?.get(container);
    if (cleanup) {
      this._popupCleanups.delete(container);
      try { cleanup(); } catch (error) { console.error("Profile popup cleanup failed:", error); }
    }
    this._popupTokens.set(container, (this._popupTokens.get(container) || 0) + 1);
    container.innerHTML = "";
  },

  ACCENT_COLORS: ["#6C5CE7","#00B894","#0984E3","#E17055","#D63031","#00CEC9","#FDCB6E","#E84393"],

  defaultAvatar(seed){
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
  },

  safeImageUrl(value, seed = "?"){
    const fallback = this.defaultAvatar(seed);
    try {
      const parsed = new URL(String(value || ""), document.baseURI);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : fallback;
    } catch {
      return fallback;
    }
  },

  randomAccent(){
    return this.ACCENT_COLORS[Math.floor(Math.random() * this.ACCENT_COLORS.length)];
  },

  badgeIds(profile){
    const stored = Array.isArray(profile?.badges)
      ? profile.badges
        .map(value => typeof value === "string" ? value : value?.id)
        .filter(id => Object.prototype.hasOwnProperty.call(this.BADGE_DEFINITIONS, id))
      : [];
    // Owners are the maintainers of the app. Keep this fallback so existing
    // owner rows show the developer badge immediately; the migration also
    // persists it for existing rows.
    const isOwner = String(profile?.role || "").trim().toLowerCase() === "owner"
      || (typeof Permissions !== "undefined" && Permissions.hasExactRole(profile, "owner"));
    if (isOwner && !stored.includes("developer")) stored.push("developer");
    return [...new Set(stored)];
  },

  badgeIcon(icon){
    if (icon === "travelers") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.3-5.1-3.3-8.5S9.8 5.8 12 3.5Z"></path><path d="M5.4 7.2h13.2M5.4 16.8h13.2"></path></svg>`;
    }
    if (icon === "theme") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.4a1.9 1.9 0 0 0 0-3.8H12a1.7 1.7 0 0 1 0-3.4h4.2A4.3 4.3 0 0 0 20.5 9c0-3-3.8-5.5-8.5-5.5Z"></path><circle cx="7.5" cy="9" r=".8" fill="currentColor" stroke="none"></circle><circle cx="11" cy="6.9" r=".8" fill="currentColor" stroke="none"></circle><circle cx="15" cy="7.2" r=".8" fill="currentColor" stroke="none"></circle></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"></path></svg>`;
  },

  badgeMarkup(profile){
    return this.badgeIds(profile).map(id => {
      const badge = this.BADGE_DEFINITIONS[id];
      const label = escapeAttr(badge.label);
      const description = escapeAttr(badge.description);
      const iconMarkup = badge.image
        ? `<img class="profile-badge-image" src="${badge.image}" alt="" aria-hidden="true" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${this.badgeIcon(badge.icon).replace("<svg", '<svg hidden')}`
        : this.badgeIcon(badge.icon);
      return `<span class="profile-badge profile-badge-${escapeAttr(id)}" data-profile-badge data-tooltip="${label}" data-tooltip-detail="${description}" tabindex="0" aria-label="${label}">${iconMarkup}</span>`;
    }).join("");
  },

  async getById(id, options = {}){
    if (!id) return null;
    if (String(id) === this.AI_PROFILE_ID) {
      const profile = this.aiProfile();
      this.cache.set(this.AI_PROFILE_ID, profile);
      return profile;
    }
    if (!options.force && this.cache.has(id)) return this.cache.get(id);
    if (!options.force && this._pending.has(id)) return this._pending.get(id);

    const requestEpoch = this._cacheEpoch;
    const request = (async () => {
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        data.roles = Permissions.profileRoles(data);
        data.role = Permissions.primaryRole(data);
        if (requestEpoch === this._cacheEpoch) this.cache.set(id, data);
      } else {
        // Do not keep returning a deleted profile from the in-memory cache.
        // This matters for Friends/DM lists and profile popups after an
        // account is removed or a row is temporarily no longer visible.
        if (requestEpoch === this._cacheEpoch) this.cache.delete(id);
      }
      return data;
    })();
    if (!options.force) this._pending.set(id, request);
    try { return await request; }
    finally {
      if (this._pending.get(id) === request) this._pending.delete(id);
    }
  },

  /**
   * Warm the profile cache in one request. Message lists used to fetch each
   * author one at a time, turning a 50-message history into a long serial
   * waterfall. Missing/deleted profiles are simply skipped so callers can
   * continue rendering with their normal "Unknown" fallback.
   */
  async prefetch(ids){
    const unique = [...new Set((ids || []).filter(Boolean))];
    const missing = unique.filter(id => !this.cache.has(id));
    if (!missing.length) return;
    const requestEpoch = this._cacheEpoch;
    try {
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .in("id", missing);
      if (error) throw error;
      const found = new Set();
      for (const profile of data || []) {
        if (!profile?.id) continue;
        profile.roles = Permissions.profileRoles(profile);
        profile.role = Permissions.primaryRole(profile);
        if (requestEpoch === this._cacheEpoch) this.cache.set(profile.id, profile);
        found.add(profile.id);
      }
      // Mark missing rows as unavailable for this render, but do not cache a
      // fake profile object that could mask a later legitimate row.
      if (requestEpoch === this._cacheEpoch) {
        for (const id of missing) if (!found.has(id)) this.cache.delete(id);
      }
    } catch (error) {
      // A batch query is an optimization, never a reason to make Chat fail.
      // renderOne() will fall back to its existing per-profile request path.
      console.warn("Profile prefetch unavailable:", error?.message || error);
    }
  },

  async usernameTaken(username){
    const { data, error } = await sb
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  async createProfile({ id, username, bio = "" }){
    username = String(username || "").trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      throw new Error("Usernames must be 3–24 characters using letters, numbers, or underscores.");
    }
    const nameError = window.BlurNamePolicy?.error(username);
    if (nameError) throw new Error(nameError);
    const avatar_url = this.defaultAvatar(username);
    const accent_color = this.randomAccent();
    const { data, error } = await sb
      .from("profiles")
      .insert({ id, username, avatar_url, bio, accent_color, badges: [] })
      .select()
      .single();
    if (error) throw error;
    data.roles = Permissions.profileRoles(data);
    data.role = Permissions.primaryRole(data);
    this.cache.set(id, data);
    return data;
  },

  async updateProfile(id, updates){
    // Keep the client-side update shape intentionally narrow. Supabase RLS
    // and the role-protection trigger remain authoritative, but an allowlist
    // prevents stale/forged fields (especially `role`) from being sent by a
    // normal profile-editor call in the first place.
    const editable = new Set(["username", "display_name", "bio", "pronouns", "status_message", "accent_color", "avatar_url", "banner_url", "badges"]);
    const payload = Object.fromEntries(Object.entries(updates || {}).filter(([key]) => editable.has(key)));
    for (const key of ["username", "display_name"]) {
      const nameError = window.BlurNamePolicy?.error(payload?.[key]);
      if (nameError) throw new Error(nameError);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "username")
        && !/^[a-zA-Z0-9_]{3,24}$/.test(String(payload.username || "").trim())) {
      throw new Error("Usernames must be 3–24 characters using letters, numbers, or underscores.");
    }
    if (!Object.keys(payload).length) return this.getById(id, { force: true });
    const { data, error } = await sb
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    data.roles = Permissions.profileRoles(data);
    data.role = Permissions.primaryRole(data);
    this.cache.set(id, data);
    return data;
  },

  async grantBadge(id, badgeId){
    const badge = this.BADGE_DEFINITIONS[badgeId];
    if (!badge) throw new Error("That badge is not available.");
    if (typeof Account !== "undefined" && Account.user?.id && String(Account.user.id) !== String(id)) {
      throw new Error("Badges can only be redeemed for your own profile.");
    }
    const profile = await this.getById(id, { force: true });
    if (!profile) throw new Error("Your profile is not ready yet.");
    const badges = [...new Set([...this.badgeIds(profile), badgeId])];
    const updated = await this.updateProfile(id, { badges });
    return updated;
  },

  /**
   * Fallback modal — only shown if a signed-in user somehow has
   * no profile row and no username stashed on their auth user
   * metadata (normally the profile is created right at signup).
   */
  renderUsernameSetup(container, user, onDone){
    container.innerHTML = `
      <div class="modal-backdrop ui-overlay is-open">
        <div class="modal-card ui-dialog ui-dialog--compact">
          <h2>Choose a username</h2>
          <p class="modal-sub">This is how other people on Blur will see you.</p>
          <form class="username-form" novalidate>
            <label>
              Username
              <input type="text" name="username" minlength="3" maxlength="24"
                pattern="[a-zA-Z0-9_]+" required autocomplete="off" placeholder="e.g. nightowl">
            </label>
            <div class="auth-error" hidden></div>
            <button type="submit" class="auth-submit">Continue</button>
          </form>
        </div>
      </div>
    `;

    const form = container.querySelector(".username-form");
    const errorBox = container.querySelector(".auth-error");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = form.username.value.trim();
      errorBox.hidden = true;

      try {
        const nameError = window.BlurNamePolicy?.error(username);
        if (nameError) {
          errorBox.hidden = false;
          errorBox.textContent = nameError;
          return;
        }
        if (await Profiles.usernameTaken(username)) {
          errorBox.hidden = false;
          errorBox.textContent = "That username is already taken.";
          return;
        }
        const profile = await Profiles.createProfile({ id: user.id, username });
        onDone(profile);
      } catch (err) {
        errorBox.hidden = false;
        errorBox.textContent = err.message || "Something went wrong.";
      }
    });
  },

  /**
   * Popup shown when clicking a username / avatar anywhere in chat.
   * Identity-first layout (accent banner, overlapping avatar, clear
   * name hierarchy) using the same data and social actions as
   * before. Own profile gets Edit / Sign out; other profiles get
   * the existing friend/DM actions only.
   */
  async renderProfilePopup(container, userId, { isSelf = false } = {}){
    if (!this._popupTokens) this._popupTokens = new WeakMap();
    if (!this._popupCleanups) this._popupCleanups = new WeakMap();
    // Replacing an already-open card should also release its old keyboard
    // listener before the new async profile load begins.
    const previousCleanup = this._popupCleanups.get(container);
    if (previousCleanup) {
      this._popupCleanups.delete(container);
      try { previousCleanup(); } catch (error) { console.error("Profile popup cleanup failed:", error); }
    }
    const popupToken = (this._popupTokens.get(container) || 0) + 1;
    this._popupTokens.set(container, popupToken);
    // Roles can be changed manually in Supabase; refresh this visible
    // profile so the badge never lags behind the database indefinitely.
    let profile;
    try {
      profile = await this.getById(userId, { force: true });
    } catch (error) {
      // A transient profile request should not create an unhandled promise
      // rejection (profile popups are opened from click handlers). Keep the
      // overlay usable and let the caller try again later.
      console.error("Profile popup load failed:", error);
      if (this._popupTokens.get(container) !== popupToken) return;
      container.innerHTML = `<div class="modal-backdrop ui-overlay is-open"><section class="modal-card profile-load-error ui-dialog ui-dialog--compact" role="dialog" aria-modal="true" aria-label="Profile unavailable"><h2>Profile unavailable</h2><p class="modal-sub">Couldn’t load this profile right now.</p><button type="button" class="auth-submit profile-load-close">Close</button></section></div>`;
      container.querySelector(".profile-load-close")?.addEventListener("click", () => this.closePopup(container));
      return;
    }
    if (this._popupTokens.get(container) !== popupToken) return;
    if (!profile) {
      // A deleted profile should not leave the previously opened person's
      // card visible over the new click target.
      container.innerHTML = `<div class="modal-backdrop ui-overlay is-open"><section class="modal-card profile-load-error ui-dialog ui-dialog--compact" role="dialog" aria-modal="true" aria-label="Profile unavailable"><h2>Profile unavailable</h2><p class="modal-sub">This profile is no longer available.</p><button type="button" class="auth-submit profile-load-close">Close</button></section></div>`;
      container.querySelector(".profile-load-close")?.addEventListener("click", () => this.closePopup(container));
      return;
    }

    const accent = profile.accent_color || "#c9c39a";
    const currentActivity = Presence.activityFor(userId);
    const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    });
    const isAiProfile = profile.id === this.AI_PROFILE_ID;
    const profileRoles = Permissions.profileRoles(profile);
    const rolesMarkup = profileRoles.map(role => `<span class="profile-role-chip role-${escapeAttr(role)}">${escapeHtml(Permissions.label(role))}</span>`).join("");
    const badgesMarkup = this.badgeMarkup(profile);
    const avatarMarkup = isAiProfile
      ? `<span class="acct-avatar acct-ai-avatar" aria-hidden="true">✦</span>`
      : AccountUI.avatarHtml(profile);

    container.innerHTML = `
      <div class="acct-backdrop ui-overlay is-open">
        <div class="acct-pcard ui-dialog" role="dialog" aria-modal="true" aria-label="Profile" data-profile-user="${escapeAttr(userId)}">
          <div class="acct-pcard-accent${profile.banner_url ? " has-image" : ""}" style="${AccountUI.bannerStyle(profile)}"></div>
          <button type="button" class="acct-modal-close" aria-label="Close">&times;</button>
          <div class="acct-pcard-body">
            <div class="acct-avatar-wrap">
              ${avatarMarkup}
              ${profile.status_message ? `<div class="acct-status-bubble" title="${escapeAttr(profile.status_message)}">${escapeHtml(profile.status_message)}</div>` : ``}
            </div>

            <div class="acct-pcard-identity">
              <div class="acct-display-name">${escapeHtml(profile.display_name || profile.username)}</div>
              <div class="acct-username">@${escapeHtml(profile.username)}${profile.pronouns ? ` <span class="acct-pronouns">· ${escapeHtml(profile.pronouns)}</span>` : ``}${badgesMarkup ? ` <span class="profile-badges" aria-label="Badges">${badgesMarkup}</span>` : ``}</div>
              ${currentActivity ? `<div class="acct-current-activity">${presenceActivityMarkup(currentActivity, "acct-activity-line")}</div>` : ``}
            </div>

            ${!isSelf && !isAiProfile ? this._friendSectionHtml(userId) : ``}

            <div class="acct-pcard-section acct-pcard-roles">
              <span class="acct-meta-label">Roles</span>
              <div class="profile-roles-list">${rolesMarkup}</div>
            </div>

            <div class="acct-pcard-section">
              <span class="acct-meta-label">About</span>
              ${profile.bio
                ? `<p class="acct-info-value acct-bio">${escapeHtml(profile.bio)}</p>`
                : `<p class="acct-info-value acct-empty-note">${isSelf ? "Add a bio about yourself." : "No bio yet."}</p>`}
            </div>

            <div class="acct-pcard-section">
              <span class="acct-meta-label">Joined</span>
              <span class="acct-info-value">${escapeHtml(joined)}</span>
            </div>

            ${isSelf ? `
            <div class="acct-actions">
              <button type="button" class="acct-btn acct-btn-primary ui-button ui-button--primary" data-acct-popup-edit>
                <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                Edit profile
              </button>
              <button type="button" class="acct-btn acct-btn-danger ui-button ui-button--danger" data-acct-popup-signout>
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
                Sign out
              </button>
            </div>` : ``}
          </div>
        </div>
      </div>
    `;

    const onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePopup();
      }
    };
    // Keep an open profile's friend action current when the other person
    // accepts, cancels, or removes the relationship in another tab.
    const friendRefresh = (!isSelf && !isAiProfile && typeof Friends !== "undefined")
      ? () => {
          if (this._popupTokens.get(container) !== popupToken) return;
          this.renderProfilePopup(container, userId, { isSelf }).catch(error => console.error("Profile friendship refresh failed:", error));
        }
      : null;
    if (friendRefresh) Friends.onChange(friendRefresh);
    const cleanup = () => {
      document.removeEventListener("keydown", onKeydown);
      if (friendRefresh) Friends.offChange?.(friendRefresh);
    };
    this._popupCleanups.set(container, cleanup);
    const closePopup = () => {
      if (this._popupCleanups.get(container) === cleanup) this._popupCleanups.delete(container);
      cleanup();
      this.closePopup(container);
    };
    document.addEventListener("keydown", onKeydown);

    container.querySelector(".acct-modal-close").addEventListener("click", closePopup);
    container.querySelector(".acct-backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("acct-backdrop")) closePopup();
    });

    if (isSelf) {
      container.querySelector("[data-acct-popup-edit]").addEventListener("click", () => {
        closePopup();
        if (typeof window.openProfileSettings === "function") window.openProfileSettings();
        else this.renderEditProfile(container, profile);
      });
      container.querySelector("[data-acct-popup-signout]").addEventListener("click", () => Account.signOut());
    } else {
      const messageBtn = container.querySelector("[data-profile-friend-message]");
      if (messageBtn) messageBtn.addEventListener("click", () => {
        this.closePopup(container);
        Chat.openDM?.(messageBtn.dataset.profileFriendMessage);
      });

      const addBtn = container.querySelector("[data-profile-friend-add]");
      if (addBtn) addBtn.addEventListener("click", async () => {
        addBtn.disabled = true;
        addBtn.textContent = "Sending…";
        try {
          await Friends.sendRequest(addBtn.dataset.profileFriendAdd);
          this.renderProfilePopup(container, userId, { isSelf }).catch(error => console.error("Profile popup refresh failed:", error));
        } catch (err) {
          addBtn.disabled = false;
          addBtn.textContent = "Add Friend";
          console.error("Send friend request failed:", err);
        }
      });

      const acceptBtn = container.querySelector("[data-profile-friend-accept]");
      if (acceptBtn) acceptBtn.addEventListener("click", async () => {
        acceptBtn.disabled = true;
        try {
          await Friends.accept(acceptBtn.dataset.profileFriendAccept);
          this.renderProfilePopup(container, userId, { isSelf }).catch(error => console.error("Profile popup refresh failed:", error));
        } catch (err) {
          acceptBtn.disabled = false;
          console.error("Accept friend request failed:", err);
        }
      });

      const removeBtn = container.querySelector("[data-profile-friend-remove]");
      if (removeBtn) removeBtn.addEventListener("click", async () => {
        removeBtn.disabled = true;
        try {
          await Friends.remove(removeBtn.dataset.profileFriendRemove);
          this.renderProfilePopup(container, userId, { isSelf }).catch(error => console.error("Profile popup refresh failed:", error));
        } catch (err) {
          removeBtn.disabled = false;
          console.error("Remove friendship failed:", err);
        }
      });
    }
  },

  /** Builds the friend-action row shown on someone else's profile popup. */
  _friendSectionHtml(userId){
    const rel = Friends.relation(userId);

    if (rel.status === "friends") {
      return `
        <div class="profile-friend-section">
          <span class="profile-friend-status">✓ Friends</span>
          <button type="button" class="friend-action-btn friend-action-message" data-profile-friend-message="${userId}">Message</button>
          <button type="button" class="friend-action-btn friend-action-remove" data-profile-friend-remove="${rel.row.id}">Remove</button>
        </div>
      `;
    }
    if (rel.status === "outgoing") {
      return `
        <div class="profile-friend-section">
          <span class="profile-friend-status">Request sent</span>
          <button type="button" class="friend-action-btn friend-action-cancel" data-profile-friend-remove="${rel.row.id}">Cancel</button>
        </div>
      `;
    }
    if (rel.status === "incoming") {
      return `
        <div class="profile-friend-section">
          <button type="button" class="friend-action-btn friend-action-accept" data-profile-friend-accept="${rel.row.id}">Accept Request</button>
          <button type="button" class="friend-action-btn friend-action-decline" data-profile-friend-remove="${rel.row.id}">Decline</button>
        </div>
      `;
    }
    return `
      <div class="profile-friend-section">
        <button type="button" class="friend-action-btn friend-action-add" data-profile-friend-add="${userId}">Add Friend</button>
      </div>
    `;
  },

  /**
   * Edit-profile UI. Delegates to the shared global profile
   * editor (account-ui.js) so Chat and the Account panel use
   * the exact same editing experience. The old signature —
   * (container, profile) rendering into a chat overlay — is
   * preserved.
   */
  renderEditProfile(container, profile){
    AccountUI.renderProfileEditor(container, profile, {
      onSaved: (updated) => {
        Chat.onProfileUpdated?.(updated);
      },
      onCancel: () => {}
    });
  }
};

// Shared string-escaping helpers — used by profiles.js,
// channels.js and messages.js whenever untrusted text (a
// username, bio, or message) is dropped into innerHTML.
function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(str){
  return escapeHtml(str);
}
