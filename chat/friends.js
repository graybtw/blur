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

  /** Load all friendships involving this user and start listening for live changes. */
  async init(userId){
    this._userId = userId;
    const { data, error } = await sb
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw error;
    this._rows = data || [];
    this._subscribe();
  },

  /** Call on sign-out to stop listening and clear state. */
  teardown(){
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

  _notify(){
    this._listeners.forEach(fn => {
      try { fn(); } catch (err) { console.error("Friends listener failed:", err); }
    });
  },

  _subscribe(){
    this._channel = sb
      .channel(`friendships:${this._userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, (payload) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
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
    this._rows.push(data);
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
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .ilike("username", `%${q}%`)
      .neq("id", this._userId)
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  // ---------------------------------------------------------
  // UI: renders into the #friends-view container in chat.js
  // ---------------------------------------------------------

  async renderBody(container, tab){
    this._renderToken = (this._renderToken || 0) + 1;
    const token = this._renderToken;
    container.innerHTML = `<div class="friends-loading">Loading…</div>`;

    if (tab === "all") {
      const items = await this._withProfiles(this.friends());
      if (token !== this._renderToken) return;
      container.innerHTML = items.length
        ? `<div class="friends-list">${items.map(({ row, other }) => this._friendRowHtml(row, other)).join("")}</div>`
        : `<div class="friends-empty">No friends yet — try the Add Friend tab.</div>`;

    } else if (tab === "requests") {
      const [incomingItems, outgoingItems] = await Promise.all([
        this._withProfiles(this.incoming()),
        this._withProfiles(this.outgoing())
      ]);
      if (token !== this._renderToken) return;
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
      container.innerHTML = `
        <div class="friends-search-wrap">
          <input type="text" class="friends-search-input" placeholder="Search by username…" autocomplete="off">
        </div>
        <div class="friends-search-results"></div>
      `;
      const input = container.querySelector(".friends-search-input");
      const results = container.querySelector(".friends-search-results");
      let debounceTimer;
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (!q) { results.innerHTML = ""; return; }
        debounceTimer = setTimeout(async () => {
          try {
            const found = await this.search(q);
            results.innerHTML = found.length
              ? found.map(p => this._searchRowHtml(p)).join("")
              : `<div class="friends-empty">No users found.</div>`;
          } catch (err) {
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
    return Promise.all(rows.map(async row => ({ row, other: await Profiles.getById(this.otherId(row)) })));
  },

  _friendRowHtml(row, other){
    if (!other) return "";
    return `
      <div class="friend-row">
        <img class="friend-row-avatar" src="${other.avatar_url}" alt="" data-user="${other.id}">
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
        <img class="friend-row-avatar" src="${other.avatar_url}" alt="" data-user="${other.id}">
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
        <img class="friend-row-avatar" src="${profile.avatar_url}" alt="" data-user="${profile.id}">
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
      });
    }
  }
};