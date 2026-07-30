/* =========================================================
   profiles.js
   Everything about the `profiles` table: fetching/creating/
   editing rows, plus the first-run username modal and the
   profile popup shown when clicking a username or avatar.
   ========================================================= */

const Profiles = {

  cache: new Map(),

  ACCENT_COLORS: ["#6C5CE7","#00B894","#0984E3","#E17055","#D63031","#00CEC9","#FDCB6E","#E84393"],

  defaultAvatar(seed){
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
  },

  randomAccent(){
    return this.ACCENT_COLORS[Math.floor(Math.random() * this.ACCENT_COLORS.length)];
  },

  async getById(id){
    if (this.cache.has(id)) return this.cache.get(id);

    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (data) this.cache.set(id, data);
    return data;
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
    const avatar_url = this.defaultAvatar(username);
    const accent_color = this.randomAccent();
    const { data, error } = await sb
      .from("profiles")
      .insert({ id, username, avatar_url, bio, accent_color })
      .select()
      .single();
    if (error) throw error;
    this.cache.set(id, data);
    return data;
  },

  async updateProfile(id, updates){
    const { data, error } = await sb
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    this.cache.set(id, data);
    return data;
  },

  /**
   * Fallback modal — only shown if a signed-in user somehow has
   * no profile row and no username stashed on their auth user
   * metadata (normally the profile is created right at signup).
   */
  renderUsernameSetup(container, user, onDone){
    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card">
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
   */
  async renderProfilePopup(container, userId, { isSelf = false } = {}){
    const profile = await this.getById(userId);
    if (!profile) return;

    const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    });

    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card profile-card">
          <div class="profile-banner" style="background:${escapeAttr(profile.accent_color || "#333")}"></div>
          <button type="button" class="modal-close" aria-label="Close">&times;</button>
          <div class="profile-card-body">
            <img class="profile-avatar" src="${profile.avatar_url}" alt="">
            <div class="profile-namerow">
              <h2>${escapeHtml(profile.display_name || profile.username)}</h2>
              ${profile.pronouns ? `<span class="profile-pronouns">${escapeHtml(profile.pronouns)}</span>` : ``}
            </div>
            <p class="profile-username">@${escapeHtml(profile.username)}</p>
            ${profile.status_message ? `<div class="profile-status-pill">${escapeHtml(profile.status_message)}</div>` : ``}
            ${!isSelf ? this._friendSectionHtml(userId) : ``}

            <div class="profile-divider"></div>

            <div class="profile-section">
              <span class="profile-section-label">About me</span>
              <p class="profile-bio">${escapeHtml(profile.bio || (isSelf ? "Add a bio about yourself." : "No bio yet."))}</p>
            </div>

            <div class="profile-section">
              <span class="profile-section-label">Member since</span>
              <p class="profile-joined">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                ${joined}
              </p>
            </div>

            ${isSelf ? `<button type="button" class="edit-profile-btn">Edit profile</button>` : ``}
          </div>
        </div>
      </div>
    `;

    container.querySelector(".modal-close").addEventListener("click", () => container.innerHTML = "");
    container.querySelector(".modal-backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) container.innerHTML = "";
    });

    if (isSelf) {
      container.querySelector(".edit-profile-btn").addEventListener("click", () => {
        this.renderEditProfile(container, profile);
      });
    } else {
      const messageBtn = container.querySelector("[data-profile-friend-message]");
      if (messageBtn) messageBtn.addEventListener("click", () => {
        container.innerHTML = "";
        Chat.openDM?.(messageBtn.dataset.profileFriendMessage);
      });

      const addBtn = container.querySelector("[data-profile-friend-add]");
      if (addBtn) addBtn.addEventListener("click", async () => {
        addBtn.disabled = true;
        addBtn.textContent = "Sending…";
        try {
          await Friends.sendRequest(addBtn.dataset.profileFriendAdd);
          this.renderProfilePopup(container, userId, { isSelf });
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
          this.renderProfilePopup(container, userId, { isSelf });
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
          this.renderProfilePopup(container, userId, { isSelf });
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

  renderEditProfile(container, profile){
    const startAccent = profile.accent_color || Profiles.randomAccent();

    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card edit-profile-card">
          <button type="button" class="modal-close" aria-label="Close">&times;</button>
          <h2>Edit profile</h2>

          <div class="edit-preview">
            <div class="edit-preview-banner" style="background:${escapeAttr(startAccent)}"></div>
            <img class="edit-preview-avatar" src="${escapeAttr(profile.avatar_url || "")}" alt="">
            <div class="edit-preview-name">${escapeHtml(profile.display_name || profile.username)}</div>
          </div>

          <form class="edit-profile-form" novalidate>
            <div class="form-row">
              <label>
                Display name
                <input type="text" name="display_name" maxlength="32"
                  value="${escapeAttr(profile.display_name || "")}" placeholder="${escapeAttr(profile.username)}">
              </label>
              <label>
                Pronouns
                <input type="text" name="pronouns" maxlength="40"
                  value="${escapeAttr(profile.pronouns || "")}" placeholder="e.g. she/her">
              </label>
            </div>

            <label>
              Status
              <input type="text" name="status_message" maxlength="60"
                value="${escapeAttr(profile.status_message || "")}" placeholder="What's on your mind?">
            </label>
            <label>
              Avatar URL
              <input type="url" name="avatar_url" value="${escapeAttr(profile.avatar_url || "")}">
            </label>
            <label>
              Bio
              <textarea name="bio" maxlength="160" rows="3">${escapeHtml(profile.bio || "")}</textarea>
            </label>

            <div class="field-label">Accent color</div>
            <div class="accent-picker" role="group">
              ${Profiles.ACCENT_COLORS.map(c => `
                <button type="button" class="accent-swatch ${c === startAccent ? "selected" : ""}"
                  data-color="${c}" style="background:${c}" aria-label="${c}">
                  <svg viewBox="0 0 24 24" class="accent-check" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                </button>
              `).join("")}
            </div>
            <input type="hidden" name="accent_color" value="${escapeAttr(startAccent)}">

            <div class="auth-error" hidden></div>
            <button type="submit" class="auth-submit">Save changes</button>
          </form>
        </div>
      </div>
    `;

    container.querySelector(".modal-close").addEventListener("click", () => container.innerHTML = "");

    const form = container.querySelector(".edit-profile-form");
    const preview = {
      banner: container.querySelector(".edit-preview-banner"),
      avatar: container.querySelector(".edit-preview-avatar"),
      name: container.querySelector(".edit-preview-name")
    };

    form.querySelectorAll(".accent-swatch").forEach(swatch => {
      swatch.addEventListener("click", () => {
        form.querySelectorAll(".accent-swatch").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
        form.accent_color.value = swatch.dataset.color;
        preview.banner.style.background = swatch.dataset.color;
      });
    });

    // Live-update the preview card as the person types, so
    // avatar/name/status changes are visible before saving.
    form.display_name.addEventListener("input", () => {
      preview.name.textContent = form.display_name.value.trim() || profile.username;
    });
    form.avatar_url.addEventListener("change", () => {
      preview.avatar.src = form.avatar_url.value.trim() || Profiles.defaultAvatar(profile.username);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = form.querySelector(".auth-error");
      try {
        const updated = await Profiles.updateProfile(profile.id, {
          display_name: form.display_name.value.trim() || null,
          pronouns: form.pronouns.value.trim() || null,
          status_message: form.status_message.value.trim() || null,
          avatar_url: form.avatar_url.value.trim() || Profiles.defaultAvatar(profile.username),
          bio: form.bio.value.trim(),
          accent_color: form.accent_color.value || Profiles.randomAccent()
        });
        Chat.onProfileUpdated?.(updated);
        container.innerHTML = "";
      } catch (err) {
        errorBox.hidden = false;
        errorBox.textContent = err.message || "Couldn't save changes.";
      }
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