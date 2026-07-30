/* =========================================================
   chat.js
   Entry point. Builds the chat DOM inside #chat-root and
   wires auth → username setup → channels → messages together.
   ========================================================= */

function truncateForPreview(text, maxLen){
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? flat.slice(0, maxLen - 1).trimEnd() + "…" : flat;
}

const Chat = {

  els: {},

  async init(){
    const root = document.getElementById("chat-root");
    if (!root) return;

    root.innerHTML = `
      <div class="chat-app" id="chat-app" hidden>

        <aside class="chat-sidebar">
          <div class="sidebar-tabs" id="sidebar-tabs">
            <button type="button" class="sidebar-tab active" data-sidebar-tab="channels">Channels</button>
            <button type="button" class="sidebar-tab" data-sidebar-tab="friends">
              Friends
              <span class="friends-badge" id="friends-badge" hidden></span>
              <span class="dm-unread-dot" id="dm-unread-dot" hidden></span>
            </button>
          </div>

          <div class="chat-sidebar-header" id="channel-list-header">Text Channels</div>
          <div class="channel-list" id="channel-list"></div>

          <div class="chat-sidebar-header" id="dm-list-header" hidden>Direct Messages</div>
          <div class="dm-list" id="dm-list" hidden></div>

          <div class="chat-user-bar" id="chat-user-bar"></div>
        </aside>

        <div class="chat-main">
          <div class="chat-topbar">
            <span class="chat-topbar-hash" id="chat-topbar-hash">#</span>
            <img class="chat-topbar-avatar" id="chat-topbar-avatar" alt="" hidden>
            <span class="chat-topbar-name" id="chat-topbar-name">global</span>
            <div class="friends-tabs" id="friends-tabs" hidden>
              <button type="button" class="friends-tab active" data-friends-tab="all">All Friends</button>
              <button type="button" class="friends-tab" data-friends-tab="requests">Requests<span class="friends-tab-badge" id="requests-tab-badge" hidden></span></button>
              <button type="button" class="friends-tab friends-tab-add" data-friends-tab="add">Add Friend</button>
            </div>
          </div>

          <div class="chat-messages" id="chat-messages"></div>

          <div class="reply-preview" id="reply-preview" hidden></div>

          <form class="chat-composer" id="chat-composer">
            <input type="text" id="chat-input" maxlength="2000" autocomplete="off" placeholder="Message #global">
            <button type="submit" aria-label="Send">
              <svg viewBox="0 0 24 24"><path d="M4 12l16-8-8 16-2-6-6-2z"/></svg>
            </button>
          </form>

          <div class="friends-view" id="friends-view" hidden></div>
        </div>

      </div>

      <div class="chat-overlay" id="chat-overlay"></div>
      <div class="auth-root" id="auth-root"></div>
    `;

    this.els = {
      app: root.querySelector("#chat-app"),
      sidebarTabs: root.querySelector("#sidebar-tabs"),
      channelListHeader: root.querySelector("#channel-list-header"),
      channelList: root.querySelector("#channel-list"),
      dmListHeader: root.querySelector("#dm-list-header"),
      dmList: root.querySelector("#dm-list"),
      userBar: root.querySelector("#chat-user-bar"),
      topbarHash: root.querySelector("#chat-topbar-hash"),
      topbarAvatar: root.querySelector("#chat-topbar-avatar"),
      topbarName: root.querySelector("#chat-topbar-name"),
      messages: root.querySelector("#chat-messages"),
      replyPreview: root.querySelector("#reply-preview"),
      composer: root.querySelector("#chat-composer"),
      input: root.querySelector("#chat-input"),
      overlay: root.querySelector("#chat-overlay"),
      authRoot: root.querySelector("#auth-root"),
      friendsBadge: root.querySelector("#friends-badge"),
      dmUnreadDot: root.querySelector("#dm-unread-dot"),
      friendsTabs: root.querySelector("#friends-tabs"),
      requestsTabBadge: root.querySelector("#requests-tab-badge"),
      friendsView: root.querySelector("#friends-view"),
    };

    this._friendsTab = "all";
    this._sidebarTab = "channels";
    this.viewMode = "channel"; // "channel" | "dm"

    this.els.composer.addEventListener("submit", (e) => this.handleSend(e));

    this.els.sidebarTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sidebar-tab]");
      if (!btn) return;
      this.showSidebarTab(btn.dataset.sidebarTab);
    });

    this.els.friendsTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-friends-tab]");
      if (!btn) return;
      this._friendsTab = btn.dataset.friendsTab;
      this.renderFriendsTabs();
      Friends.renderBody(this.els.friendsView, this._friendsTab);
    });

    // Clicking a username/avatar opens a profile popup; clicking a
    // reaction pill toggles it; clicking "+" opens the emoji picker.
    this.els.messages.addEventListener("click", (e) => {
      const userTarget = e.target.closest("[data-user]");
      if (userTarget) {
        Profiles.renderProfilePopup(this.els.overlay, userTarget.dataset.user, {
          isSelf: userTarget.dataset.user === this.user?.id
        });
        return;
      }

      const pill = e.target.closest("[data-react-message]");
      if (pill) {
        const messageId = pill.dataset.reactMessage;
        const emoji = pill.dataset.reactEmoji;
        Reactions.toggle(messageId, this.currentChannel.id, this.user.id, emoji)
          .then(() => Messages.updateReactions(this.els.messages, messageId))
          .catch(err => console.error("Reaction failed:", err));
        return;
      }

      const addBtn = e.target.closest("[data-react-add]");
      if (addBtn) {
        this.openReactionPicker(addBtn, addBtn.dataset.reactAdd);
        return;
      }

      const replyBtn = e.target.closest("[data-reply-msg]");
      if (replyBtn) {
        this.setReplyTarget(replyBtn.dataset.replyMsg);
        return;
      }

      const quote = e.target.closest("[data-jump-to]");
      if (quote) {
        this.jumpToMessage(quote.dataset.jumpTo);
      }
    });

    await Auth.init((user) => this.handleAuthChange(user));
  },

  async handleAuthChange(user){
    if (!user) {
      this.user = null;
      this.els.app.hidden = true;
      this.closeReactionPicker();
      Messages.unsubscribe();
      Reactions.unsubscribe();
      Friends.teardown();
      DirectMessages.teardown();
      Auth.renderAuthScreen(this.els.authRoot);
      return;
    }

    this.els.authRoot.innerHTML = "";

    let profile = await Profiles.getById(user.id);

    if (!profile) {
      // Normally the profile is created right at signup (see
      // auth.js). This only runs if that somehow didn't happen —
      // try the username stashed on the auth user first, and
      // only prompt if that's missing or already taken.
      const fallbackUsername = user.user_metadata?.username;
      if (fallbackUsername) {
        try {
          profile = await Profiles.createProfile({ id: user.id, username: fallbackUsername });
        } catch (err) {
          console.error("Fallback profile creation failed:", err);
        }
      }
    }

    if (!profile) {
      Profiles.renderUsernameSetup(this.els.overlay, user, async (createdProfile) => {
        this.els.overlay.innerHTML = "";
        await this.startChat(user, createdProfile);
      });
      return;
    }

    await this.startChat(user, profile);
  },

  async startChat(user, profile){
    this.user = user;
    this.profile = profile;
    this.els.app.hidden = false;

    this.renderUserBar();

    await Friends.init(user.id);
    Friends.onChange(() => {
      this.updateFriendsBadge();
      if (this.els.friendsView.hidden) return;
      this.renderFriendsTabs();
      if (this._friendsTab !== "add") {
        Friends.renderBody(this.els.friendsView, this._friendsTab);
      }
    });
    this.updateFriendsBadge();

    await DirectMessages.init(user.id);
    DirectMessages.onChange(() => {
      this.updateDMBadge();
      if (this._sidebarTab === "friends" && !this.els.dmList.hidden) {
        DirectMessages.render(this.els.dmList, (row) => this.openDM(DirectMessages.otherId(row)));
      }
    });
    this.updateDMBadge();

    await Channels.fetchAll();
    Channels.render(this.els.channelList, (channel) => this.openChannel(channel));

    const initial = Channels.list.find(c => c.name === "global") || Channels.list[0];
    if (initial) {
      Channels.setActive(this.els.channelList, initial.id);
      await this.openChannel(initial);
    }
  },

  renderUserBar(){
    const displayName = this.profile.display_name || this.profile.username;
    this.els.userBar.innerHTML = `
      <img class="user-bar-avatar" src="${this.profile.avatar_url}" alt="" data-user="${this.user.id}">
      <span class="user-bar-name" data-user="${this.user.id}">${escapeHtml(displayName)}</span>
      <button type="button" class="user-bar-signout" title="Sign out">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      </button>
    `;

    this.els.userBar.querySelectorAll("[data-user]").forEach(el => {
      el.addEventListener("click", () => {
        Profiles.renderProfilePopup(this.els.overlay, this.user.id, { isSelf: true });
      });
    });
    this.els.userBar.querySelector(".user-bar-signout").addEventListener("click", () => Auth.signOut());
  },

  // Called by profiles.js after a successful profile edit.
  onProfileUpdated(updated){
    this.profile = updated;
    this.renderUserBar();
  },

  /** Just swaps which list (channels vs DMs) shows in the sidebar — doesn't touch the main column. */
  _setSidebarTabUI(tab){
    this._sidebarTab = tab;
    this.els.sidebarTabs.querySelectorAll(".sidebar-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.sidebarTab === tab);
    });

    const onChannels = tab === "channels";
    this.els.channelListHeader.hidden = !onChannels;
    this.els.channelList.hidden = !onChannels;
    this.els.dmListHeader.hidden = onChannels;
    this.els.dmList.hidden = onChannels;

    if (!onChannels) {
      DirectMessages.render(this.els.dmList, (row) => this.openDM(DirectMessages.otherId(row)));
    }
  },

  /** Handles an explicit click on the Channels/Friends sidebar tab — also drives the main column. */
  showSidebarTab(tab){
    this._setSidebarTabUI(tab);

    if (tab === "channels") {
      if (this.currentChannel) {
        this.openChannel(this.currentChannel);
      } else if (Channels.list[0]) {
        Channels.setActive(this.els.channelList, Channels.list[0].id);
        this.openChannel(Channels.list[0]);
      }
    } else {
      this.showFriendsView(this._friendsTab);
    }
  },

  async openChannel(channel){
    this.showMessagesView();
    this.closeReactionPicker();
    this.clearReplyTarget();
    DirectMessages.unsubscribeConversation();

    this.viewMode = "channel";
    this.currentChannel = channel;
    this.currentDM = null;

    this.els.topbarHash.hidden = false;
    this.els.topbarAvatar.hidden = true;
    this.els.topbarName.textContent = channel.name;
    this.els.input.placeholder = `Message #${channel.name}`;
    this.els.messages.innerHTML = `<div class="messages-loading">Loading…</div>`;

    const [history] = await Promise.all([
      Messages.loadInitial(channel.id),
      Reactions.loadForChannel(channel.id)
    ]);
    await Messages.renderList(this.els.messages, history);

    Messages.subscribeToChannel(channel.id, (msg) => {
      Messages.appendOne(this.els.messages, msg);
    });
    Reactions.subscribeToChannel(channel.id, (messageId) => {
      Messages.updateReactions(this.els.messages, messageId);
    });
  },

  /** Opens (creating if needed) a DM conversation with a friend and shows it in the main column. */
  async openDM(otherUserId){
    this.showMessagesView();
    this.closeReactionPicker();
    this.clearReplyTarget();
    Messages.unsubscribe();
    Reactions.unsubscribe();

    this.viewMode = "dm";
    this.currentChannel = null;
    this.els.messages.innerHTML = `<div class="messages-loading">Loading…</div>`;

    const conv = await DirectMessages.getOrCreateConversation(otherUserId);
    this.currentDM = conv;
    DirectMessages.activeId = conv.id;
    const other = conv._otherProfile || await Profiles.getById(otherUserId);

    if (this._sidebarTab !== "friends") this._setSidebarTabUI("friends");
    else DirectMessages.render(this.els.dmList, (row) => this.openDM(DirectMessages.otherId(row)));
    DirectMessages.setActive(this.els.dmList, conv.id);

    this.els.topbarHash.hidden = true;
    this.els.topbarAvatar.hidden = false;
    this.els.topbarAvatar.src = other?.avatar_url || Profiles.defaultAvatar("?");
    this.els.topbarName.textContent = other?.display_name || other?.username || "Unknown";
    this.els.input.placeholder = `Message @${other?.username || ""}`;

    const history = await DirectMessages.loadInitial(conv.id);
    await DirectMessages.renderList(this.els.messages, history);
    DirectMessages.markRead(conv.id);
    this.updateDMBadge();

    DirectMessages.subscribeToConversation(conv.id, (msg) => {
      DirectMessages.appendOne(this.els.messages, msg);
      if (msg.sender_id !== this.user.id) {
        DirectMessages.markRead(conv.id);
        this.updateDMBadge();
      }
    });
  },

  /** Swaps the main column into the Friends tab (All / Requests / Add Friend). */
  showFriendsView(tab = "all"){
    this.closeReactionPicker();
    this.clearReplyTarget();
    Messages.unsubscribe();
    Reactions.unsubscribe();
    DirectMessages.unsubscribeConversation();
    this.currentDM = null;

    this.els.topbarHash.hidden = true;
    this.els.topbarAvatar.hidden = true;
    this.els.topbarName.textContent = "Friends";
    this.els.friendsTabs.hidden = false;

    this.els.messages.hidden = true;
    this.els.replyPreview.hidden = true;
    this.els.composer.hidden = true;
    this.els.friendsView.hidden = false;

    this._friendsTab = tab;
    this.renderFriendsTabs();
    Friends.renderBody(this.els.friendsView, tab);
  },

  /** Restores the shared messages/composer view used by both channels and DMs. */
  showMessagesView(){
    this.els.friendsTabs.hidden = true;
    this.els.messages.hidden = false;
    this.els.composer.hidden = false;
    this.els.friendsView.hidden = true;
  },

  renderFriendsTabs(){
    this.els.friendsTabs.querySelectorAll(".friends-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.friendsTab === this._friendsTab);
    });
    const count = Friends.incoming().length;
    this.els.requestsTabBadge.hidden = count === 0;
    this.els.requestsTabBadge.textContent = count;
  },

  updateFriendsBadge(){
    const count = Friends.incoming().length;
    this.els.friendsBadge.hidden = count === 0;
    this.els.friendsBadge.textContent = count;
  },

  updateDMBadge(){
    this.els.dmUnreadDot.hidden = !DirectMessages.hasUnread();
  },

  async handleSend(e){
    e.preventDefault();
    const content = this.els.input.value;
    if (!content.trim()) return;

    if (this.viewMode === "dm") {
      if (!this.currentDM) return;
      this.els.input.value = "";
      try {
        await DirectMessages.send(this.currentDM.id, this.user.id, content);
      } catch (err) {
        console.error("Failed to send DM:", err);
      }
      return;
    }

    if (!this.currentChannel) return;
    const replyToId = this.replyTarget?.id ?? null;
    this.els.input.value = "";
    this.clearReplyTarget();
    try {
      await Messages.send(this.currentChannel.id, this.user.id, content, replyToId);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  },

  /** Shows the "Replying to…" bar above the composer for the given message id. */
  setReplyTarget(messageId){
    const info = Messages.getCached(messageId);
    this.replyTarget = { id: messageId, ...(info || {}) };

    const name = info?.displayName || "message";
    const snippet = info?.content ? truncateForPreview(info.content, 80) : "";

    this.els.replyPreview.hidden = false;
    this.els.replyPreview.innerHTML = `
      <div class="reply-preview-inner">
        <svg viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5M4 12h10a5 5 0 0 1 5 5v2"/></svg>
        <span class="reply-preview-text">Replying to <strong></strong></span>
      </div>
      <button type="button" class="reply-preview-cancel" aria-label="Cancel reply">&times;</button>
    `;
    this.els.replyPreview.querySelector("strong").textContent = name;
    if (snippet) {
      this.els.replyPreview.querySelector(".reply-preview-text")
        .append(document.createTextNode(`: ${snippet}`));
    }
    this.els.replyPreview.querySelector(".reply-preview-cancel")
      .addEventListener("click", () => this.clearReplyTarget());

    this.els.input.focus();
  },

  clearReplyTarget(){
    this.replyTarget = null;
    if (this.els.replyPreview) {
      this.els.replyPreview.hidden = true;
      this.els.replyPreview.innerHTML = "";
    }
  },

  /** Scrolls a quoted message into view and briefly highlights it, if it's currently loaded. */
  jumpToMessage(messageId){
    const target = this.els.messages.querySelector(`.message-row[data-message-id="${messageId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("message-flash");
    setTimeout(() => target.classList.remove("message-flash"), 1200);
  },

  /** Small floating emoji picker, positioned under the "+" button that opened it. */
  openReactionPicker(anchorEl, messageId){
    this.closeReactionPicker();

    const rect = anchorEl.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.className = "reaction-popover";
    pop.style.top = `${rect.bottom + 6}px`;
    pop.style.left = `${rect.left}px`;
    pop.innerHTML = Reactions.EMOJIS.map(e => `<button type="button" data-pick-emoji="${e}">${e}</button>`).join("");

    document.body.appendChild(pop);
    this._reactionPopover = pop;

    pop.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pick-emoji]");
      if (!btn) return;
      Reactions.toggle(messageId, this.currentChannel.id, this.user.id, btn.dataset.pickEmoji)
        .then(() => Messages.updateReactions(this.els.messages, messageId))
        .catch(err => console.error("Reaction failed:", err));
      this.closeReactionPicker();
    });

    // Deferred so the click that opened the popover doesn't
    // immediately bubble up and close it again.
    setTimeout(() => {
      this._outsideReactionListener = (ev) => {
        if (!pop.contains(ev.target)) this.closeReactionPicker();
      };
      document.addEventListener("click", this._outsideReactionListener);
    }, 0);
  },

  closeReactionPicker(){
    if (this._reactionPopover) {
      this._reactionPopover.remove();
      this._reactionPopover = null;
    }
    if (this._outsideReactionListener) {
      document.removeEventListener("click", this._outsideReactionListener);
      this._outsideReactionListener = null;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => Chat.init());