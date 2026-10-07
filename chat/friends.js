/* =========================================================
   friends.js
   Everything about the `friendships` table: fetching your
   friends/requests, sending/accepting/removing, live updates
   via realtime, and rendering the Friends tab UI (All Friends /
   Requests / Add Friend). Also used by profiles.js to render
   the friend button on a profile popup.

   Depends on: sb (supabase client), Profiles, escapeHtml —
   all already defined by profiles.js.
   ========================================================= */

const Friends = {

  _userId: null,
  _rows: [],
  _channel: null,
  _listeners: [],
  _generation: 0,

  /** Load all friendships involving this user and start listening for live changes. */
  async init(userId){
    // Auth can switch accounts without a reload. Remove the previous
    // subscription/state before loading the new user's friendships so rows
    // and realtime callbacks cannot leak across sessions.
    this.teardown();
    const generation = ++this._generation;
    this._userId = userId;
    const { data, error } = await sb
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw error;
    if (generation !== this._generation) return;
    this._rows = data || [];
    this._subscribe(generation);
  },

  /** Call on sign-out to stop listening and clear state. */
  teardown(){
    this._generation++;
    if (this._channel) {
      sb.removeChannel(this._channel);
      this._channel = null;
    }
    this._rows = [];
    this._userId = null;
    this._listeners = [];
  },

  /** Register a callback fired whenever the friendship rows change (local or remote). */
  onChange(cb){
    this._listeners.push(cb);
  },

  offChange(cb){
    this._listeners = this._listeners.filter(listener => listener !== cb);
  },

  _notify(){
    this._listeners.forEach(fn => {
      try { fn(); } catch (err) { console.error("Friends listener failed:", err); }
    });
  },

  _subscribe(generation = this._generation){
    this._channel = sb
      .channel(`friendships:${this._userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, (payload) => {
        if (generation !== this._generation) return;
        if (!payload?.eventType) return;
        const raw = payload.eventType === "DELETE" ? payload.old : payload.new;
        // DELETE/UPDATE payloads can contain only the primary key when the
        // table does not use REPLICA IDENTITY FULL. Merge the event with the
        // row we already have so a remote unfriend still removes immediately.
        const existing = raw?.id ? this._rows.find(item => item.id === raw.id) : null;
        const row = existing ? { ...existing, ...raw } : raw;
        if (!row || (row.requester_id !== this._userId && row.addressee_id !== this._userId)) return;

        if (payload.eventType === "DELETE") {
          this._rows = this._rows.filter(r => r.id !== row.id);
        } else {
          const idx = this._rows.findIndex(r => r.id === row.id);
          if (idx >= 0) this._rows[idx] = row; else this._rows.push(row);
        }
        this._notify();
      })
      .subscribe();
  },

  otherId(row){
    return row.requester_id === this._userId ? row.addressee_id : row.requester_id;
  },

  friends(){
    return this._rows.filter(r => r.status === "accepted");
  },

  incoming(){
    return this._rows.filter(r => r.status === "pending" && r.addressee_id === this._userId);
  },

  outgoing(){
    return this._rows.filter(r => r.status === "pending" && r.requester_id === this._userId);
  },

  /** The friendship row (if any) between the current user and someone else. */
  rowWith(otherUserId){
    return this._rows.find(r =>
      (r.requester_id === this._userId && r.addressee_id === otherUserId) ||
      (r.requester_id === otherUserId && r.addressee_id === this._userId)
    );
  },

  /** Returns { status: "none"|"friends"|"outgoing"|"incoming", row? } relative to the current user. */
  relation(otherUserId){
    const row = this.rowWith(otherUserId);
    if (!row) return { status: "none" };
    if (row.status === "accepted") return { status: "friends", row };
    return { status: row.requester_id === this._userId ? "outgoing" : "incoming", row };
  },

  async sendRequest(otherUserId){
    const { data, error } = await sb
      .from("friendships")
      .insert({ requester_id: this._userId, addressee_id: otherUserId })
      .select()
      .single();
    if (error) throw error;
    // The INSERT is also delivered by the friendships realtime channel.
    // Upsert locally so the optimistic result and the realtime echo cannot
    // create duplicate rows in Friends/Requests after sending a request.
    const existingIndex = this._rows.findIndex(row => row.id === data?.id);
    if (existingIndex >= 0) this._rows[existingIndex] = data;
    else this._rows.push(data);
    this._notify();
    return data;
  },

  async accept(friendshipId){
    const { data, error } = await sb
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .select()
      .single();
    if (error) throw error;
    const idx = this._rows.findIndex(r => r.id === friendshipId);
    if (idx >= 0) this._rows[idx] = data; else this._rows.push(data);
    this._notify();
    return data;
  },

  /** Declining, cancelling, and unfriending are all the same operation: delete the row. */
  async remove(friendshipId){
    const { error } = await sb.from("friendships").delete().eq("id", friendshipId);
    if (error) throw error;
    this._rows = this._rows.filter(r => r.id !== friendshipId);
    this._notify();
  },

  async search(query){
    const q = query.trim();
    if (!q) return [];
    const like = q.replace(/[\\%_]/g, ch => "\\" + ch);
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .ilike("username", `%${like}%`)
      .neq("id", this._userId)
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  // ---------------------------------------------------------
  // UI: renders into the #friends-view container in chat.js
  // ---------------------------------------------------------

  async renderBody(container, tab, isCurrent = () => true){
    this._renderToken = (this._renderToken || 0) + 1;
    const token = this._renderToken;
    if (!isCurrent()) return;
    container.innerHTML = `<div class="friends-loading">Loading…</div>`;

    if (tab === "all") {
      const items = await this._withProfiles(this.friends());
      if (token !== this._renderToken || !isCurrent()) return;
      container.innerHTML = items.length
        ? `<div class="friends-list">${items.map(({ row, other }) => this._friendRowHtml(row, other)).join("")}</div>`
        : `<div class="friends-empty">No friends yet — try the Add Friend tab.</div>`;

    } else if (tab === "requests") {
      const [incomingItems, outgoingItems] = await Promise.all([
        this._withProfiles(this.incoming()),
        this._withProfiles(this.outgoing())
      ]);
      if (token !== this._renderToken || !isCurrent()) return;
      const nothing = !incomingItems.length && !outgoingItems.length;
      container.innerHTML = `
        ${incomingItems.length ? `
          <div class="friends-section-label">Incoming</div>
          <div class="friends-list">${incomingItems.map(({ row, other }) => this._requestRowHtml(row, other, "incoming")).join("")}</div>
        ` : ``}
        ${outgoingItems.length ? `
          <div class="friends-section-label">Sent</div>
          <div class="friends-list">${outgoingItems.map(({ row, other }) => this._requestRowHtml(row, other, "outgoing")).join("")}</div>
        ` : ``}
        ${nothing ? `<div class="friends-empty">No pending requests.</div>` : ``}
      `;

    } else if (tab === "add") {
      if (!isCurrent()) return;
      container.innerHTML = `
        <div class="friends-search-wrap ui-field">
          <input type="text" class="friends-search-input" placeholder="Search by username…" autocomplete="off">
        </div>
        <div class="friends-search-results"></div>
      `;
      const input = container.querySelector(".friends-search-input");
      const results = container.querySelector(".friends-search-results");
      let debounceTimer;
      let searchToken = 0;
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const searchSeq = ++searchToken;
        const q = input.value.trim();
        if (!q) { results.innerHTML = ""; return; }
        debounceTimer = setTimeout(async () => {
          try {
            const found = await this.search(q);
            if (searchSeq !== searchToken || input.value.trim() !== q || this._renderToken !== token || !isCurrent()) return;
            results.innerHTML = found.length
              ? found.map(p => this._searchRowHtml(p)).join("")
              : `<div class="friends-empty">No users found.</div>`;
          } catch (err) {
            if (searchSeq !== searchToken || this._renderToken !== token || !isCurrent()) return;
            console.error("Friend search failed:", err);
          }
        }, 250);
      });
      input.focus();
    }

    if (!container._friendsDelegated) {
      container.addEventListener("click", (e) => this._handleClick(e));
      container._friendsDelegated = true;
    }
  },

  async _withProfiles(rows){
    const list = Array.isArray(rows) ? rows : [];
    await Profiles.prefetch(list.map(row => this.otherId(row)));
    const hydrated = await Promise.all(list.map(async row => {
      try {
        const id = this.otherId(row);
        return { row, other: Profiles.cache.get(id) || await Profiles.getById(id) };
      } catch (error) {
        // One deleted/temporarily unavailable profile should not blank the
        // entire Friends view. Keep the row so the UI can simply omit it.
        console.warn("Friend profile unavailable:", error?.message || error);
        return { row, other: null };
      }
    }));
    return hydrated.filter(item => item.other);
  },

  _friendRowHtml(row, other){
    if (!other) return "";
    return `
      <div class="friend-row">
        <img class="friend-row-avatar" src="${escapeAttr(Profiles.safeImageUrl(other.avatar_url, other.username || "?"))}" alt="" data-user="${other.id}">
        <div class="friend-row-info" data-user="${other.id}">
          <div class="friend-row-name">${escapeHtml(other.display_name || other.username)}</div>
          <div class="friend-row-username">@${escapeHtml(other.username)}</div>
        </div>
        <div class="friend-row-actions">
          <button type="button" class="friend-row-action friend-row-message" data-friend-message="${other.id}">Message</button>
          <button type="button" class="friend-row-action friend-row-remove" data-friend-remove="${row.id}">Remove</button>
        </div>
      </div>
    `;
  },

  _requestRowHtml(row, other, direction){
    if (!other) return "";
    const actions = direction === "incoming"
      ? `
        <button type="button" class="friend-row-action friend-row-accept" data-friend-accept="${row.id}">Accept</button>
        <button type="button" class="friend-row-action friend-row-decline" data-friend-remove="${row.id}">Decline</button>
      `
      : `<button type="button" class="friend-row-action friend-row-cancel" data-friend-remove="${row.id}">Cancel</button>`;
    return `
      <div class="friend-row">
        <img class="friend-row-avatar" src="${escapeAttr(Profiles.safeImageUrl(other.avatar_url, other.username || "?"))}" alt="" data-user="${other.id}">
        <div class="friend-row-info" data-user="${other.id}">
          <div class="friend-row-name">${escapeHtml(other.display_name || other.username)}</div>
          <div class="friend-row-username">@${escapeHtml(other.username)}</div>
        </div>
        <div class="friend-row-actions">${actions}</div>
      </div>
    `;
  },

  _searchRowHtml(profile){
    const rel = this.relation(profile.id);
    let action;
    if (rel.status === "friends") action = `<span class="friend-row-status">Friends</span>`;
    else if (rel.status === "outgoing") action = `<span class="friend-row-status">Pending</span>`;
    else if (rel.status === "incoming") action = `<button type="button" class="friend-row-action friend-row-accept" data-friend-accept="${rel.row.id}">Accept</button>`;
    else action = `<button type="button" class="friend-row-action friend-row-add" data-friend-add="${profile.id}">Add Friend</button>`;

    return `
      <div class="friend-row">
        <img class="friend-row-avatar" src="${escapeAttr(Profiles.safeImageUrl(profile.avatar_url, profile.username || "?"))}" alt="" data-user="${profile.id}">
        <div class="friend-row-info" data-user="${profile.id}">
          <div class="friend-row-name">${escapeHtml(profile.display_name || profile.username)}</div>
          <div class="friend-row-username">@${escapeHtml(profile.username)}</div>
        </div>
        <div class="friend-row-actions">${action}</div>
      </div>
    `;
  },

  async _handleClick(e){
    const messageBtn = e.target.closest("[data-friend-message]");
    const addBtn = e.target.closest("[data-friend-add]");
    const acceptBtn = e.target.closest("[data-friend-accept]");
    const removeBtn = e.target.closest("[data-friend-remove]");
    const userTarget = e.target.closest("[data-user]");
    const row = e.target.closest(".friend-row");

    if (messageBtn) {
      Chat.openDM?.(messageBtn.dataset.friendMessage);
      return;
    }

    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = "Sending…";
      try {
        await this.sendRequest(addBtn.dataset.friendAdd);
        addBtn.outerHTML = `<span class="friend-row-status">Pending</span>`;
      } catch (err) {
        console.error("Send friend request failed:", err);
        addBtn.disabled = false;
        addBtn.textContent = "Add Friend";
      }
      return;
    }

    if (acceptBtn) {
      acceptBtn.disabled = true;
      const original = acceptBtn.textContent;
      acceptBtn.textContent = "Accepting…";
      try {
        await this.accept(acceptBtn.dataset.friendAccept);
        if (acceptBtn.closest(".friend-row-actions")?.querySelector(".friend-row-decline")) {
          // Requests-tab row: it belongs in "All Friends" now, not here.
          row?.remove();
        } else {
          const status = document.createElement("span");
          status.className = "friend-row-status";
          status.textContent = "Friends";
          acceptBtn.replaceWith(status);
        }
      } catch (err) {
        console.error("Accept friend request failed:", err);
        acceptBtn.disabled = false;
        acceptBtn.textContent = original;
      }
      return;
    }

    if (removeBtn) {
      removeBtn.disabled = true;
      try {
        await this.remove(removeBtn.dataset.friendRemove);
        row?.remove();
      } catch (err) {
        console.error("Remove friendship failed:", err);
        removeBtn.disabled = false;
      }
      return;
    }

    if (userTarget) {
      Profiles.renderProfilePopup(document.getElementById("chat-overlay"), userTarget.dataset.user, {
        isSelf: userTarget.dataset.user === this._userId
      }).catch(error => console.error("Profile popup failed:", error));
    }
  }
};
