/* =========================================================
   account-ui.js
   Global account EXPERIENCE, built on the Account service.

   - Sidebar account area (avatar/name when signed in, a
     sign-in entry when not) that reacts to auth/profile
     changes immediately.
   - Global Account panel (profile view + sign-in entry).
   - The shared profile editor modal (also used by Chat's
     profile popup via Profiles.renderEditProfile).
   - The auth overlay so users can sign in from anywhere —
     reusing chat/auth.js's existing form, NOT a new auth
     system.

   Auth state comes exclusively from the Account service
   (Account.user / Account.profile / Account.ready /
   Account.onAuthStateChange / Account.onProfileChange /
   Account.signOut / Account.setProfile). No direct
   sb.auth listeners are created here.
   ========================================================= */

const AccountUI = {

  els: {},
  _authOverlay: null,
  _authOverlayUnsub: null,
  _outsideClickHandler: null,
  _escHandler: null,

  init(){
    this.mountSidebar();
    this.els.panel = document.querySelector('[data-panel="account"]');

    // Any account avatar that fails to load (dead URL, offline)
    // degrades to an initial instead of a broken image.
    document.addEventListener("error", (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-acct-avatar")) return;
      const fallback = document.createElement("div");
      fallback.className = img.className + " acct-avatar-fallback";
      fallback.textContent = img.getAttribute("data-initial") || "?";
      if (img.dataset.userId) fallback.dataset.userId = img.dataset.userId;
      fallback.dataset.acctAvatar = "";
      img.replaceWith(fallback);
    }, true);

    // Single source of truth: re-render on any auth or profile change.
    Account.onAuthStateChange(() => this.refresh());
    Account.onProfileChange(() => this.refresh());
    this.refresh();
  },

  /** Re-renders every piece of account UI from current Account state. */
  refresh(){
    this.renderSidebarAccount(Account.user, Account.profile);
    this.renderPanel(Account.user, Account.profile);
    // Settings is loaded before the account service. When auth/profile state
    // arrives later, hydrate the dedicated Profile settings view as well.
    window.renderProfileSettingsEditor?.();
  },

  /* =========================================================
     SIDEBAR ACCOUNT AREA
     ========================================================= */

  mountSidebar(){
    const nav = document.getElementById("acct-nav");
    if (!nav) return;

    this.els.nav = nav;
    this.els.navAvatar = nav.querySelector(".acct-nav-avatar");
    this.els.navGuestIcon = nav.querySelector(".acct-nav-icon");
    this.els.navName = nav.querySelector(".acct-nav-name");
    this.els.navSub = nav.querySelector(".acct-nav-sub");

    // Keyboard support for the entry (native <a> has no href)
    nav.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.handleNavActivation();
      }
    });

    // Logged out, the entry opens the auth flow instead of
    // navigating. Capture phase so this wins over main.js's
    // generic [data-tab] click handler.
    this._outsideClickHandler = (e) => {
      if (!e.target.closest("#acct-nav")) return;
      if (Account.user) return; // logged in: navigate to the panel normally
      e.preventDefault();
      e.stopPropagation();
      this.openAuthOverlay("signin");
    };
    document.addEventListener("click", this._outsideClickHandler, true);
  },

  handleNavActivation(){
    if (Account.user) {
      if (typeof window.openProfileSettings === "function") window.openProfileSettings();
      else if (typeof goToTab === "function") {
        goToTab("settings");
        window.activateSettingsTab?.("profile");
      }
      return;
    }
    this.openAuthOverlay("signin");
  },

  renderSidebarAccount(user, profile){
    const nav = this.els.nav;
    if (!nav) return;

    if (!user) {
      nav.title = "Sign in to Blur";
      // toggleAttribute (not .hidden=) — SVG elements don't
      // implement the hidden property
      this.els.navAvatar.toggleAttribute("hidden", true);
      delete this.els.navAvatar.dataset.userId;
      this.els.navGuestIcon.toggleAttribute("hidden", false);
      this.els.navName.textContent = "Sign in";
      this.els.navSub.textContent = "Create account";
      return;
    }

    const displayName = profile?.display_name || profile?.username || "Account";
    const username = profile?.username ? `@${profile.username}` : "";

    nav.title = username ? `${displayName} · ${username}` : displayName;
    this.els.navGuestIcon.toggleAttribute("hidden", true);

    if (profile?.avatar_url) {
      this.els.navAvatar.toggleAttribute("hidden", false);
      this.els.navAvatar.src = profile.avatar_url;
      this.els.navAvatar.dataset.userId = profile.id || "";
    } else {
      this.els.navAvatar.toggleAttribute("hidden", true);
      delete this.els.navAvatar.dataset.userId;
    }

    this.els.navName.textContent = displayName;
    this.els.navSub.textContent = username || " ";
  },

  /* =========================================================
     ACCOUNT PANEL
     ========================================================= */

  renderPanel(user, profile){
    const panel = this.els.panel;
    if (!panel) return;

    if (!user) {
      this.view = 'profile';
      panel.innerHTML = `
        <div class="acct-eyebrow-row">
          <span class="acct-eyebrow-rule"></span>
          <span class="acct-eyebrow">Account</span>
        </div>
        <div class="acct-card">
          <div class="acct-signedout">
            <div class="acct-mark"><span></span></div>
            <h2>Your Blur account</h2>
            <p>Sign in to keep your profile with you — and, coming soon, your favorites and history across Games, Watch, Music and AI.</p>
            <div class="acct-signedout-actions">
              <button type="button" class="acct-btn acct-btn-primary ui-button ui-button--primary" data-acct-signin>Sign in</button>
              <button type="button" class="acct-btn acct-btn-ghost ui-button ui-button--quiet" data-acct-signup>Create account</button>
            </div>
          </div>
        </div>
      `;
      panel.querySelector("[data-acct-signin]").addEventListener("click", () => this.openAuthOverlay("signin"));
      panel.querySelector("[data-acct-signup]").addEventListener("click", () => this.openAuthOverlay("signup"));
      return;
    }

    if (!profile) {
      // Extremely rare: signed in but the profile row is still
      // being set up. Chat owns the username-setup fallback.
      panel.innerHTML = `
        <div class="acct-eyebrow-row">
          <span class="acct-eyebrow-rule"></span>
          <span class="acct-eyebrow">Account</span>
        </div>
        <div class="acct-card">
          <div class="acct-signedout">
            <div class="acct-mark"><span></span></div>
            ${Account.profileError
              ? `<h2>Couldn't load your profile</h2>
                 <p>${escapeHtml(Account.profileError)}. Check your connection and try again.</p>
                 <div class="acct-signedout-actions">
                   <button type="button" class="acct-btn acct-btn-primary ui-button ui-button--primary" data-acct-retry-profile>Retry</button>
                 </div>`
              : `<h2>Finishing setup…</h2>
                 <p>Your account is ready, but your profile still needs a username. Open the Chat tab to finish setting it up.</p>`}
          </div>
        </div>
      `;
      if (Account.profileError) {
        panel.querySelector('[data-acct-retry-profile]').addEventListener('click', async function() {
          this.disabled = true;
          this.textContent = 'Retrying…';
          await Account.retryProfile();
        });
      }
      return;
    }

    const accent = profile.accent_color || "#c9c39a";
    profile.roles = Permissions.profileRoles(profile);
    profile.role = Permissions.primaryRole(profile);
    const profileRoles = profile.roles;
    const rolesMarkup = profileRoles.map(role => `<span class="profile-role-chip role-${escapeAttr(role)}">${escapeHtml(Permissions.label(role))}</span>`).join("");
    const badgesMarkup = typeof Profiles !== "undefined" && typeof Profiles.badgeMarkup === "function"
      ? Profiles.badgeMarkup(profile) : "";
    const displayName = profile.display_name || profile.username;
    const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    });

    // Internal navigation: Profile | Edit Profile (underline sub-tabs,
    // same treatment as Settings). The editor itself is unchanged — it
    // renders inline in the panel instead of as a floating modal.
    const view = this.view === "edit" ? "edit" : "profile";
    const subtabs = `
      <div class="acct-subtabs" role="tablist" aria-label="Account views">
        <button type="button" class="acct-subtab ${view === "profile" ? "active" : ""}" data-acct-view="profile" role="tab" aria-selected="${view === "profile"}">Profile</button>
        <button type="button" class="acct-subtab ${view === "edit" ? "active" : ""}" data-acct-view="edit" role="tab" aria-selected="${view === "edit"}">Edit Profile</button>
      </div>
    `;

    if (view === "edit") {
      panel.innerHTML = `
        <div class="acct-eyebrow-row">
          <span class="acct-eyebrow-rule"></span>
          <span class="acct-eyebrow">Account</span>
        </div>
        ${subtabs}
        <div data-acct-editor-host></div>
      `;
      this.renderProfileEditor(panel.querySelector("[data-acct-editor-host]"), profile, {
        inline: true,
        onSaved: (updated) => {
          this.view = "profile";
          setTimeout(() => Account.setProfile(updated), 750);
        },
        onCancel: () => {
          this.view = "profile";
          this.renderPanel(Account.user, Account.profile);
        }
      });

      // the editor sub-view needs its own sub-tab wiring — the profile
      // branch below binds its own, and this branch returns before that
      panel.querySelectorAll(".acct-subtab").forEach(btn => {
        btn.addEventListener("click", () => {
          const target = btn.dataset.acctView;
          if (target === this.view) return;
          if (this.activeEditor) {
            const closed = this.activeEditor.attemptClose();
            if (!closed) return;
          }
          this.view = target;
          this.renderPanel(Account.user, Account.profile);
        });
      });
      return;
    }

    // Visual flow: identity → profile information → account actions.
    panel.innerHTML = `
      <div class="acct-eyebrow-row">
        <span class="acct-eyebrow-rule"></span>
        <span class="acct-eyebrow">Account</span>
      </div>
      ${subtabs}

      <div class="acct-profile-banner" style="${this.bannerStyle(profile)}" aria-hidden="true"></div>
      <div class="acct-profile-head">
        <div class="acct-avatar-wrap">
          ${this.avatarHtml(profile, "acct-avatar")}
        </div>
        <div class="acct-identity">
          <div class="acct-display-name">${escapeHtml(displayName)}${profile.status_message ? `<span class="acct-status-bubble" title="${escapeAttr(profile.status_message)}">${escapeHtml(profile.status_message)}</span>` : ""}</div>
          <div class="acct-username">@${escapeHtml(profile.username)}${profile.pronouns ? ` <span class="acct-pronouns">· ${escapeHtml(profile.pronouns)}</span>` : ""}${badgesMarkup ? ` <span class="profile-badges" aria-label="Badges">${badgesMarkup}</span>` : ""}</div>
        </div>
      </div>

      <div class="acct-info-list">
        <div class="acct-info-row acct-info-row-roles">
          <span class="acct-meta-label">Roles</span>
          <span class="acct-info-value"><span class="profile-roles-list">${rolesMarkup}</span></span>
        </div>
        <div class="acct-info-row">
          <span class="acct-meta-label">About</span>
          ${profile.bio
            ? `<span class="acct-info-value acct-bio">${escapeHtml(profile.bio)}</span>`
            : `<span class="acct-info-value acct-empty-note">No bio yet — add one under Edit Profile.</span>`}
        </div>
        <div class="acct-info-row">
          <span class="acct-meta-label">Accent</span>
          <span class="acct-info-value"><span class="acct-accent-chip"><span class="acct-accent-dot" style="background:${escapeAttr(accent)}"></span>${escapeHtml(accent)}</span></span>
        </div>
        <div class="acct-info-row">
          <span class="acct-meta-label">Joined</span>
          <span class="acct-info-value">${escapeHtml(joined)}</span>
        </div>
      </div>

      <div class="acct-actions">
        <button type="button" class="acct-btn acct-btn-danger ui-button ui-button--danger" data-acct-signout>
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
          Sign out
        </button>
      </div>
    `;

    panel.querySelectorAll(".acct-subtab").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.acctView;
        if (target === this.view) return;

        // Profile customization now lives in Settings → Profile. Keep this
        // legacy account view as a clean redirect instead of maintaining a
        // second editor surface.
        if (target === "edit" && typeof window.openProfileSettings === "function") {
          window.openProfileSettings();
          return;
        }

        // leaving the editor while it has unsaved changes runs its
        // discard protection — stay on Edit until it actually closes
        if (target === "profile" && this.view === "edit" && this.activeEditor) {
          const closed = this.activeEditor.attemptClose();
          if (!closed) return;
        }

        this.view = target;
        this.renderPanel(Account.user, Account.profile);
      });
    });
    panel.querySelector("[data-acct-signout]").addEventListener("click", () => Account.signOut());
  },

  /** Avatar <img> with a graceful fallback to an initial. */
  avatarHtml(profile, classes = "acct-avatar"){
    const url = profile?.avatar_url;
    const name = profile?.display_name || profile?.username || "?";
    const initial = name.charAt(0).toUpperCase();
    if (url) {
      const safeUrl = typeof Profiles !== "undefined"
        ? Profiles.safeImageUrl(url, profile?.username || name)
        : url;
      return `<img class="${classes}" src="${escapeAttr(safeUrl)}" alt="" data-acct-avatar data-user-id="${escapeAttr(profile?.id || "")}" data-initial="${escapeAttr(initial)}">`;
    }
    return `<div class="${classes} acct-avatar-fallback" data-acct-avatar data-user-id="${escapeAttr(profile?.id || "")}">${escapeHtml(initial)}</div>`;
  },

  /** Uploads optional profile media to the public, user-scoped bucket. */
  async uploadProfileMedia(userId, file, kind){
    if (!userId || !file) throw new Error("Choose an image first.");
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || "")) throw new Error("Profile images must be PNG, JPG, WEBP, or GIF files.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Profile images must be 5 MB or smaller.");
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[file.type] || "jpg";
    const path = `${userId}/${kind}.${extension}`;
    const { error } = await sb.storage.from("profile-media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });
    if (error) throw error;
    const { data } = sb.storage.from("profile-media").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("The image uploaded, but its public URL could not be created.");
    return `${data.publicUrl}?v=${Date.now()}`;
  },

  bannerStyle(profile){
    const accent = profile?.accent_color || "#c9c39a";
    const url = profile?.banner_url;
    let safeUrl = "";
    if (url) {
      try {
        const parsed = new URL(String(url), document.baseURI);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") safeUrl = parsed.href;
      } catch { /* invalid banner URLs fall back to the accent surface */ }
    }
    return safeUrl
      ? `background-color:${escapeAttr(accent)};background-image:url(&quot;${escapeAttr(safeUrl)}&quot;);`
      : `background:${escapeAttr(accent)};`;
  },


  /* =========================================================
     AUTH OVERLAY — the existing sign-in form, from anywhere
     ========================================================= */

  openAuthOverlay(mode = "signin"){
    if (this._authOverlay) return;

    const backdrop = document.createElement("div");
    backdrop.className = "acct-auth-overlay ui-overlay is-open";
    backdrop.innerHTML = `
      <button type="button" class="acct-auth-close" aria-label="Close">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="acct-auth-host"></div>
    `;
    document.body.appendChild(backdrop);
    this._authOverlay = backdrop;

    // Reuse the existing auth form (chat/auth.js) — same
    // username-only flow, no second auth system.
    const host = backdrop.querySelector(".acct-auth-host");
    Auth.renderAuthScreen(host);
    if (mode === "signup") {
      host.querySelector(".auth-switch")?.click();
    }
    setTimeout(() => host.querySelector("input[name='username']")?.focus(), 60);

    backdrop.querySelector(".acct-auth-close").addEventListener("click", () => this.closeAuthOverlay());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this.closeAuthOverlay();
    });

    this._escHandler = (e) => {
      if (e.key === "Escape") this.closeAuthOverlay();
    };
    document.addEventListener("keydown", this._escHandler);

    // Close as soon as the account exists (sign-in or sign-up),
    // and land the user in the single profile customization surface.
    this._authOverlayUnsub = Account.onAuthStateChange((user) => {
      if (!user) return;
      this.closeAuthOverlay();
      if (typeof window.openProfileSettings === "function") window.openProfileSettings();
      else if (typeof goToTab === "function") goToTab("settings");
    });
  },

  closeAuthOverlay(){
    if (!this._authOverlay) return;
    this._authOverlay.remove();
    this._authOverlay = null;
    if (this._escHandler) {
      document.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }
    if (this._authOverlayUnsub) {
      this._authOverlayUnsub();
      this._authOverlayUnsub = null;
    }
  },

  /* =========================================================
     PROFILE EDITOR — shared by the account panel and Chat's
     profile popup. Same fields and update path as before
     (Profiles.updateProfile), substantially better UX.
     ========================================================= */

  FIELDS: [
    { key: "display_name",   max: 32,  label: "Display name",     optional: true },
    { key: "bio",            max: 160, label: "Bio",              optional: true, textarea: true },
    { key: "pronouns",       max: 40,  label: "Pronouns",         optional: true },
    { key: "status_message", max: 60,  label: "Status",           optional: true },
  ],

  USERNAME_RE: /^[a-zA-Z0-9_]{3,24}$/,

  renderProfileEditor(container, profile, { onSaved, onCancel, inline = false } = {}){
    if (!container || !profile) return;

    const initial = {
      username: profile.username || "",
      display_name: profile.display_name || "",
      avatar_url: profile.avatar_url || "",
      banner_url: profile.banner_url || "",
      bio: profile.bio || "",
      pronouns: profile.pronouns || "",
      status_message: profile.status_message || "",
      accent_color: profile.accent_color || Profiles.ACCENT_COLORS[0],
    };
    const state = { ...initial };
    state.avatar_file = null;
    state.banner_file = null;
    state.avatar_preview_url = "";
    state.banner_preview_url = "";

    let dirty = false;
    let discardArmed = false;
    let saving = false;
    let closed = false;
    let saved = false;
    let saveTimer = null;

    // username availability: 'idle' | 'invalid' | 'checking' | 'taken' | 'ok'
    let usernameStatus = "ok";

    const prevFocus = document.activeElement;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="acct-backdrop ui-overlay is-open">
        <div class="acct-modal acct-editor ui-dialog" role="dialog" aria-modal="true" aria-labelledby="acct-editor-title">
          <button type="button" class="acct-modal-close" aria-label="Close" data-editor-close>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div class="acct-editor-head">
            <span class="acct-eyebrow">Account</span>
            <h2 id="acct-editor-title">Edit profile</h2>
          </div>

          <div class="acct-preview" aria-hidden="true">
            <div class="acct-preview-banner" data-preview-banner></div>
            ${this.avatarHtml({ ...profile, ...state })}
          <div class="acct-preview-info">
              <div class="acct-preview-name" data-preview-name></div>
              <div class="acct-preview-meta">
                <span class="acct-preview-username" data-preview-username></span>
                <span class="acct-preview-pronouns" data-preview-pronouns></span>
                <span class="profile-badges acct-preview-badges" aria-label="Badges">${typeof Profiles !== "undefined" && typeof Profiles.badgeMarkup === "function" ? Profiles.badgeMarkup(profile) : ""}</span>
              </div>
              <div class="acct-preview-status" data-preview-status></div>
              <div class="acct-preview-bio" data-preview-bio></div>
          </div>
          </div>

          <form class="acct-editor-form" novalidate>
            <div class="acct-editor-grid">
              <section class="acct-editor-section acct-editor-section-media">
                <div class="acct-section-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8" cy="10" r="1.5"></circle><path d="m5 17 4-4 3 3 2-2 5 3"></path></svg></span>Profile</span><span class="acct-section-note">Your public profile</span></div>
                <div class="acct-profile-photo-row">
                  <div class="acct-profile-row-copy"><span class="acct-label">Photo</span><span class="acct-hint">PNG, JPEG or WebP. Cropped to a square.</span></div>
                  <label class="acct-profile-upload-button ui-button ui-button--primary ui-button--sm" for="acct-f-avatar-file">Upload photo</label>
                </div>
                <div class="acct-profile-banner-row">
                  <div class="acct-profile-row-copy"><span class="acct-label">Banner</span><span class="acct-hint">Shown at the top of your profile.</span></div>
                  <label class="acct-profile-upload-button ui-button ui-button--primary ui-button--sm" for="acct-f-banner-file">Upload banner</label>
                </div>
                <div class="acct-profile-hero" data-editor-hero>
                  <div class="acct-profile-hero-banner" data-editor-hero-banner>
                    <label class="acct-profile-hero-banner-upload" for="acct-f-banner-file" aria-label="Upload profile banner">
                      <span class="acct-media-upload-hitbox" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"></path><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"></path></svg><span>Upload image</span></span>
                    </label>
                    <input class="acct-file-input" id="acct-f-banner-file" name="banner_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                  </div>
                  <div class="acct-profile-hero-body">
                    <label class="acct-profile-hero-avatar" for="acct-f-avatar-file" aria-label="Upload profile picture">
                      ${this.avatarHtml({ ...profile, ...state })}
                      <span class="acct-media-upload-hitbox" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"></path><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"></path></svg><span>Upload</span></span>
                    </label>
                    <input class="acct-file-input" id="acct-f-avatar-file" name="avatar_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                    <div class="acct-profile-hero-meta">
                      <strong data-editor-hero-name></strong>
                      <span data-editor-hero-username></span>
                    </div>
                  </div>
                </div>
                <div class="acct-hidden-image-fields" aria-hidden="true">
                  <input id="acct-f-banner" name="banner_url" type="url" value="${escapeAttr(state.banner_url)}" tabindex="-1">
                  <span class="acct-error" data-error-banner_url hidden></span>
                </div>
                <div class="acct-banner-color-row">
                  <div class="acct-label-row"><span class="acct-label">Banner color</span><span class="acct-hint">Used when no image is set</span></div>
                  <div class="acct-banner-color-controls">
                    <div class="acct-swatches" role="group" aria-label="Preset banner colors">
                      ${Profiles.ACCENT_COLORS.map(c => `<button type="button" class="acct-swatch ${c === state.accent_color ? "selected" : ""}" data-color="${c}" style="background:${c}" aria-label="Banner color ${c}" aria-pressed="${c === state.accent_color}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>`).join("")}
                    </div>
                    <label class="acct-custom-color" title="Choose a custom banner color">
                      <input class="acct-color-picker" type="color" value="${escapeAttr(state.accent_color)}" data-banner-color-picker aria-label="Custom banner color">
                      <span>Custom</span>
                    </label>
                  </div>
                </div>
              </section>

              <section class="acct-editor-section">
                <div class="acct-section-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"></circle><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"></path></svg></span>Identity</span><span class="acct-section-note">How people see you</span></div>
                <div class="acct-field">
                  <div class="acct-label-row"><label class="acct-label" for="acct-f-display">Display name</label><span class="acct-counter" data-counter-display_name>0/32</span></div>
                  <input class="acct-input ui-input" id="acct-f-display" name="display_name" type="text" maxlength="32" value="${escapeAttr(state.display_name)}" placeholder="${escapeAttr(profile.username)}" autocomplete="nickname">
                  <span class="acct-error" data-error-display_name hidden></span>
                </div>
                <div class="acct-field">
                  <div class="acct-label-row"><label class="acct-label" for="acct-f-username">Username</label><span class="acct-counter" data-counter-username>0/24</span></div>
                  <input class="acct-input ui-input" id="acct-f-username" name="username" type="text" maxlength="24" value="${escapeAttr(state.username)}" autocomplete="username" spellcheck="false" aria-describedby="acct-username-hint" title="Username changes are coming soon." disabled>
                  <span class="acct-hint" id="acct-username-hint" hidden>Username changes are coming soon.</span>
                   <span class="acct-error" data-error-username hidden></span>
                   <span class="acct-ok" data-ok-username hidden></span>
                 </div>
                 <div class="acct-field">
                   <div class="acct-label-row"><label class="acct-label" for="acct-f-pronouns">Pronouns</label><span class="acct-counter" data-counter-pronouns>0/40</span></div>
                   <input class="acct-input ui-input" id="acct-f-pronouns" name="pronouns" type="text" maxlength="40" value="${escapeAttr(state.pronouns)}" placeholder="e.g. she/her" autocomplete="off">
                 </div>
               </section>

              <section class="acct-editor-section acct-editor-section-about">
                <div class="acct-section-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"></path><path d="M8 9h8M8 13h8M8 17h5"></path></svg></span>About</span><span class="acct-section-note">A little context</span></div>
                <div class="acct-field">
                  <div class="acct-label-row"><label class="acct-label" for="acct-f-bio">Bio</label><span class="acct-counter" data-counter-bio>0/160</span></div>
                  <textarea class="acct-input acct-textarea ui-textarea" id="acct-f-bio" name="bio" maxlength="160" rows="3" placeholder="A few words about you">${escapeHtml(state.bio)}</textarea>
                </div>
                <div class="acct-field">
                  <div class="acct-label-row"><label class="acct-label" for="acct-f-status">Status</label><span class="acct-counter" data-counter-status_message>0/60</span></div>
                  <input class="acct-input ui-input" id="acct-f-status" name="status_message" type="text" maxlength="60" value="${escapeAttr(state.status_message)}" placeholder="What's on your mind?" autocomplete="off">
                </div>
              </section>

            </div>

            <div class="acct-hidden-image-fields" aria-hidden="true">
              <input id="acct-f-avatar" name="avatar_url" type="url" value="${escapeAttr(state.avatar_url)}" tabindex="-1">
              <span class="acct-error" data-error-avatar_url hidden></span>
            </div>

            <div class="acct-error" data-form-error hidden></div>

            <div class="acct-editor-foot">
              <span class="acct-dirty-note" data-dirty-note role="status"></span>
              <button type="button" class="acct-btn acct-btn-ghost ui-button ui-button--quiet" data-editor-cancel>Cancel</button>
              <button type="submit" class="acct-btn acct-btn-primary ui-button ui-button--primary" data-editor-save disabled>
                <span data-save-label>Save changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Scope all lookups to the node we just created — the
    // container may already hold another backdrop (e.g. the chat
    // profile popup) and container.querySelector would find that
    // one first.
    const backdrop = wrap.firstElementChild;
    const root = backdrop.querySelector(".acct-editor");

    // Modal mode wraps the editor in a scrim; inline mode (Account
    // panel sub-tab) mounts the bare card so it reads as a view.
    if (inline) {
      root.classList.add("acct-editor-inline", "acct-editor-v2");
      container.appendChild(root);
    } else {
      container.appendChild(backdrop);
    }
    const form = root.querySelector(".acct-editor-form");
    const saveBtn = root.querySelector("[data-editor-save]");
    const saveLabel = root.querySelector("[data-save-label]");
    const cancelBtn = root.querySelector("[data-editor-cancel]");
    const closeBtn = root.querySelector("[data-editor-close]");
    const dirtyNote = root.querySelector("[data-dirty-note]");
    const formError = root.querySelector("[data-form-error]");

    /* ---- helpers ---- */

    const fieldEl = (key) => form.querySelector(`[name="${key}"]`);
    const counterEl = (key) => root.querySelector(`[data-counter-${key}]`);
    const errorEl = (key) => root.querySelector(`[data-error-${key}]`);

    const setAvatarPreviews = () => {
      root.querySelectorAll("[data-acct-avatar]").forEach(el => {
        const initial = escapeAttr((state.display_name || state.username || "?").charAt(0).toUpperCase());
        const previewUrl = state.avatar_preview_url || state.avatar_url;
        if (!previewUrl) {
          el.outerHTML = `<div class="${el.className} acct-avatar-fallback" data-acct-avatar data-user-id="${escapeAttr(profile?.id || "")}">${escapeHtml(initial)}</div>`;
        } else if (el.tagName === "IMG") {
          el.src = previewUrl;
        } else {
          el.outerHTML = `<img class="${el.className}" src="${escapeAttr(previewUrl)}" alt="" data-acct-avatar data-user-id="${escapeAttr(profile?.id || "")}" data-initial="${initial}">`;
        }
      });
    };

    const setBannerPreview = () => {
      const url = state.banner_preview_url || state.banner_url;
      root.querySelectorAll("[data-preview-banner], [data-editor-hero-banner]").forEach(banner => {
        banner.style.backgroundColor = state.accent_color || "#c9c39a";
        banner.style.backgroundImage = url ? `url("${url.replace(/(["\\])/g, "\\$1")}")` : "none";
        banner.classList.toggle("has-image", !!url);
      });
    };

    const updatePreview = () => {
      const displayName = state.display_name || state.username || " ";
      const username = `@${state.username || " "}`;
      root.querySelector("[data-preview-name]").textContent = displayName;
      root.querySelector("[data-preview-username]").textContent = username;
      root.querySelector("[data-preview-pronouns]").textContent = state.pronouns || "";
      root.querySelector("[data-preview-status]").textContent = state.status_message || "";
      root.querySelector("[data-preview-bio]").textContent = state.bio || "";
      root.querySelector("[data-editor-hero-name]").textContent = displayName;
      root.querySelector("[data-editor-hero-username]").textContent = username;
      setAvatarPreviews();
      setBannerPreview();
    };

    const updateCounters = () => {
      this.FIELDS.forEach(f => {
        const el = counterEl(f.key);
        if (!el) return;
        const len = (state[f.key] || "").length;
        el.textContent = `${len}/${f.max}`;
        el.classList.toggle("limit", len >= f.max);
      });
      const uEl = counterEl("username");
      uEl.textContent = `${state.username.length}/24`;
      uEl.classList.toggle("limit", state.username.length >= 24);
    };

    const isDirty = () => this.FIELDS.some(f => (state[f.key] || "") !== (initial[f.key] || ""))
      || state.username !== initial.username
      || (state.avatar_url || "") !== (initial.avatar_url || "")
      || (state.banner_url || "") !== (initial.banner_url || "")
      || !!state.avatar_file
      || !!state.banner_file
      || state.accent_color !== initial.accent_color;

    const usernameError = () => {
      if (!state.username.trim()) return "Username is required.";
      const policyError = window.BlurNamePolicy?.error(state.username);
      if (policyError) return policyError;
      if (!this.USERNAME_RE.test(state.username)) {
        if (state.username.length < 3) return "Username must be at least 3 characters.";
        if (state.username.length > 24) return "Username must be at most 24 characters.";
        return "Only letters, numbers and underscores are allowed.";
      }
      if (usernameStatus === "checking") return null;
      if (usernameStatus === "taken") return "That username is already taken.";
      return null;
    };

    const avatarError = () => {
      if (state.avatar_file) return imageFileError(state.avatar_file, "Avatar");
      const v = state.avatar_url.trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) return "Avatar URL must start with http:// or https://";
      return null;
    };

    const displayNameError = () => {
      const value = state.display_name.trim();
      return value ? (window.BlurNamePolicy?.error(value) || null) : null;
    };

    const bannerError = () => {
      if (state.banner_file) return imageFileError(state.banner_file, "Banner");
      const v = state.banner_url.trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) return "Banner URL must start with http:// or https://";
      return null;
    };

    const imageFileError = (file, label) => {
      if (!file) return null;
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || "")) return `${label} must be a PNG, JPG, WEBP, or GIF image.`;
      if (file.size > 5 * 1024 * 1024) return `${label} image must be 5 MB or smaller.`;
      return null;
    };

    const refreshValidationUi = () => {
      const uErr = usernameError();
      const dErr = displayNameError();
      const aErr = avatarError();
      const bErr = bannerError();

      const uInput = fieldEl("username");
      uInput.setAttribute("aria-invalid", uErr ? "true" : "false");
      errorEl("username").hidden = !uErr;
      errorEl("username").textContent = uErr || "";

      errorEl("display_name").hidden = !dErr;
      errorEl("display_name").textContent = dErr || "";
      fieldEl("display_name").setAttribute("aria-invalid", dErr ? "true" : "false");

      const okEl = root.querySelector("[data-ok-username]");
      const changed = state.username.trim().toLowerCase() !== initial.username.toLowerCase();
      okEl.hidden = !(changed && usernameStatus === "ok" && !uErr);
      okEl.textContent = okEl.hidden ? "" : "Username available";

      // the auth identity (username@accounts.blur.invalid) is fixed at
      // signup, so the sign-in name never follows a profile rename
      const hintEl = root.querySelector("#acct-username-hint");
      hintEl.textContent = "Username changes are coming soon.";

      const aInput = fieldEl("avatar_url");
      aInput.setAttribute("aria-invalid", aErr ? "true" : "false");
      errorEl("avatar_url").hidden = !aErr;
      errorEl("avatar_url").textContent = aErr || "";

      const bInput = fieldEl("banner_url");
      bInput.setAttribute("aria-invalid", bErr ? "true" : "false");
      errorEl("banner_url").hidden = !bErr;
      errorEl("banner_url").textContent = bErr || "";

      updateCounters();

      const invalid = !!uErr || !!dErr || !!aErr || !!bErr || usernameStatus === "checking";
      saveBtn.disabled = !dirty || saving || invalid;
    };

    const markDirty = () => {
      dirty = isDirty();
      discardArmed = false;
      dirtyNote.textContent = dirty ? "Unsaved changes" : "";
      cancelBtn.textContent = "Cancel";
      refreshValidationUi();
    };

    let usernameTimer = null;
    const checkUsername = () => {
      const value = state.username.trim();
      const changed = value.toLowerCase() !== initial.username.toLowerCase();

      if (!changed || !this.USERNAME_RE.test(value)) {
        usernameStatus = this.USERNAME_RE.test(value) ? "ok" : "invalid";
        refreshValidationUi();
        return;
      }

      usernameStatus = "checking";
      refreshValidationUi();

      clearTimeout(usernameTimer);
      usernameTimer = setTimeout(async () => {
        if (closed || state.username.trim() !== value) return;
        try {
          const taken = await Profiles.usernameTaken(value);
          usernameStatus = taken ? "taken" : "ok";
        } catch {
          usernameStatus = "ok"; // let the server-side unique constraint be the backstop
        }
        refreshValidationUi();
      }, 450);
    };

    /* ---- wiring ---- */

    this.FIELDS.forEach(f => {
      const el = fieldEl(f.key);
      el.addEventListener("input", () => {
        state[f.key] = el.value;
        markDirty();
        updatePreview();
      });
    });

    fieldEl("username").addEventListener("input", (e) => {
      state.username = e.target.value;
      markDirty();
      updatePreview();
      checkUsername();
    });

    fieldEl("avatar_url").addEventListener("input", (e) => {
      state.avatar_url = e.target.value;
      if (state.avatar_file) {
        if (state.avatar_preview_url) URL.revokeObjectURL(state.avatar_preview_url);
        state.avatar_file = null;
        state.avatar_preview_url = "";
        const fileInput = fieldEl("avatar_file");
        if (fileInput) fileInput.value = "";
        root.querySelector("[data-file-name-avatar]")?.replaceChildren(document.createTextNode("No file selected · max 5 MB"));
      }
      markDirty();
      updatePreview();
    });

    fieldEl("banner_url").addEventListener("input", (e) => {
      state.banner_url = e.target.value;
      if (state.banner_file) {
        if (state.banner_preview_url) URL.revokeObjectURL(state.banner_preview_url);
        state.banner_file = null;
        state.banner_preview_url = "";
        const fileInput = fieldEl("banner_file");
        if (fileInput) fileInput.value = "";
        root.querySelector("[data-file-name-banner]")?.replaceChildren(document.createTextNode("No file selected · max 5 MB"));
      }
      markDirty();
      updatePreview();
    });

    const bindImageUpload = (kind) => {
      const input = fieldEl(`${kind}_file`);
      input?.addEventListener("change", () => {
        const file = input.files?.[0] || null;
        const previewKey = `${kind}_preview_url`;
        if (state[previewKey]) URL.revokeObjectURL(state[previewKey]);
        state[`${kind}_file`] = file;
        state[previewKey] = file ? URL.createObjectURL(file) : "";
        const nameEl = root.querySelector(`[data-file-name-${kind}]`);
        if (nameEl) nameEl.textContent = file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB` : "No file selected · max 5 MB";
        markDirty();
        updatePreview();
      });
    };
    bindImageUpload("avatar");
    bindImageUpload("banner");

    const syncBannerColor = (color) => {
      if (!/^#[0-9a-f]{6}$/i.test(color || "")) return;
      state.accent_color = color.toUpperCase();
      root.querySelectorAll(".acct-swatch").forEach(s => {
        const sel = s.dataset.color.toUpperCase() === state.accent_color;
        s.classList.toggle("selected", sel);
        s.setAttribute("aria-pressed", String(sel));
      });
      root.querySelector("[data-banner-color-picker]")?.setAttribute("value", state.accent_color);
      const picker = root.querySelector("[data-banner-color-picker]");
      if (picker) picker.value = state.accent_color;
      root.querySelector(".acct-preview .acct-avatar")?.style.setProperty("border-color", state.accent_color);
      root.querySelector(".acct-avatar-field .acct-avatar")?.style.setProperty("border-color", state.accent_color);
      setBannerPreview();
      markDirty();
    };

    root.querySelectorAll(".acct-swatch").forEach(swatch => {
      swatch.addEventListener("click", () => {
        syncBannerColor(swatch.dataset.color);
      });
    });

    root.querySelector("[data-banner-color-picker]")?.addEventListener("input", event => {
      syncBannerColor(event.target.value);
    });

    /* ---- open/close with unsaved-change protection ---- */

    const attemptClose = () => {
      if (saving) return false;
      if (dirty && !discardArmed) {
        discardArmed = true;
        dirtyNote.textContent = "You have unsaved changes — close again to discard.";
        cancelBtn.textContent = "Discard changes";
        return false;
      }
      close();
      return true;
    };

    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(usernameTimer);
      clearTimeout(saveTimer);
      if (state.avatar_preview_url) URL.revokeObjectURL(state.avatar_preview_url);
      if (state.banner_preview_url) URL.revokeObjectURL(state.banner_preview_url);
      document.removeEventListener("keydown", onKeydown);
      if (inline) {
        root.remove();
      } else {
        backdrop.remove();
      }
      AccountUI.activeEditor = null;
      if (prevFocus && prevFocus.isConnected) prevFocus.focus?.();
      if (!dirty && !saved) onCancel?.();
    };

    // expose the editor handle for sub-tab coordination (defined here
    // so it closes over attemptClose/dirty, which live above)
    if (inline) {
      AccountUI.activeEditor = {
        root,
        attemptClose,
        isDirty: () => dirty && !closed
      };
    }

    const onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }
      // minimal focus trap
      if (e.key === "Tab") {
        const focusables = root.querySelectorAll(
          "button, input, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusables.length) return;
        const list = Array.from(focusables).filter(el => !el.disabled);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeydown);

    closeBtn.addEventListener("click", attemptClose);
    cancelBtn.addEventListener("click", attemptClose);
    if (!inline) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) attemptClose();
      });
    }

    /* ---- save ---- */

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (saving) return;

      refreshValidationUi();
      if (usernameError() || displayNameError() || avatarError() || bannerError()) {
        formError.hidden = false;
        formError.textContent = "Fix the highlighted fields before saving.";
        return;
      }

      const updates = {};
      if (state.username.trim() !== initial.username) updates.username = state.username.trim();
      this.FIELDS.forEach(f => {
        const value = state[f.key].trim();
        if (value !== (initial[f.key] || "").trim()) {
          updates[f.key] = value || null;
        }
      });
      // preserve the existing convention: an empty avatar falls
      // back to the generated default (Chat renders avatar_url directly)
      if (updates.avatar_url === null) {
        updates.avatar_url = Profiles.defaultAvatar(profile.username);
      }
      if (state.avatar_url.trim() !== (initial.avatar_url || "").trim()) {
        updates.avatar_url = state.avatar_url.trim() || Profiles.defaultAvatar(profile.username);
      }
      if (state.banner_url.trim() !== (initial.banner_url || "").trim()) {
        updates.banner_url = state.banner_url.trim() || null;
      }
      if (updates.bio === null) {
        updates.bio = "";
      }
      if (state.accent_color !== initial.accent_color) {
        updates.accent_color = state.accent_color;
      }

      if (!Object.keys(updates).length && !state.avatar_file && !state.banner_file) {
        close();
        return;
      }

      saving = true;
      discardArmed = false;
      dirtyNote.textContent = "";
      formError.hidden = true;
      saveBtn.disabled = true;
      saveBtn.classList.add("acct-btn-primary");
      saveLabel.innerHTML = `<span class="ui-spinner ui-spinner--sm acct-save-spinner"></span> Saving…`;

      try {
        if (state.avatar_file) updates.avatar_url = await this.uploadProfileMedia(profile.id, state.avatar_file, "avatar");
        if (state.banner_file) updates.banner_url = await this.uploadProfileMedia(profile.id, state.banner_file, "banner");
        const updated = await Profiles.updateProfile(profile.id, updates);
        saved = true;

        saveLabel.textContent = "Saved ✓";
        saveBtn.classList.remove("acct-btn-primary");
        saveBtn.classList.add("acct-btn-success");

        onSaved?.(updated);

        saveTimer = setTimeout(() => {
          dirty = false;
          close();
        }, 700);
      } catch (err) {
        saving = false;
        saveLabel.textContent = "Save changes";
        saveBtn.disabled = false;

        let msg = err?.message || "Couldn't save changes.";
        if (/duplicate key|unique/i.test(msg)) msg = "That username is already taken.";
        formError.hidden = false;
        formError.textContent = msg;
      }
    });

    // initial paint
    updatePreview();
    refreshValidationUi();
    setTimeout(() => fieldEl("display_name").focus(), 60);
  }
};

document.addEventListener("DOMContentLoaded", () => AccountUI.init());
