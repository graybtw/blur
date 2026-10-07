/* =========================================================
   chat.js
   Entry point. Builds the chat DOM inside #chat-root and
   wires auth → username setup → channels → messages together.
   ========================================================= */

function truncateForPreview(text, maxLen){
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? flat.slice(0, maxLen - 1).trimEnd() + "…" : flat;
}

function chatChannelDisplayName(channel){
  return window.blurChannelDisplayName?.(channel) || String(channel?.name || "");
}

const Chat = {

  els: {},
  async init(){
    const root = document.getElementById("chat-root");
    if (!root) return;

    root.innerHTML = `
      <div class="chat-app" id="chat-app" hidden>

        <aside class="chat-sidebar">
          <div class="sidebar-tabs" id="sidebar-tabs" aria-label="Chat destinations">
            <button type="button" class="sidebar-tab active" data-sidebar-tab="channels"><span class="sidebar-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4V5Z"/></svg></span><span>Global</span></button>
            <button type="button" class="sidebar-tab" data-sidebar-tab="friends" aria-label="Direct messages and friends" title="DMs & Friends">
              <span class="sidebar-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.5"/><circle cx="16.5" cy="10" r="2.7"/><path d="M3.5 18c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14 14.4c2.8-.5 5.1.8 6 3.6"/></svg></span><span>DMs</span>
              <span class="friends-badge" id="friends-badge" hidden></span>
              <span class="dm-unread-dot" id="dm-unread-dot" hidden></span>
            </button>
          </div>

          <div class="chat-channel-sections" id="chat-channel-sections">
            <div class="channel-divider chat-sidebar-header" id="important-list-header" data-category="important" role="button" tabindex="0" aria-expanded="true"><span>Important</span><span class="channel-divider-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></div>
            <div class="channel-list important-channel-list" id="important-channel-list"></div>
            <div class="channel-divider chat-sidebar-header" id="channel-list-header" data-category="main" role="button" tabindex="0" aria-expanded="true"><span>Main</span><span class="channel-divider-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></div>
            <div class="channel-list" id="channel-list"></div>
            <div class="channel-divider chat-sidebar-header staff-channel-header" id="staff-list-header" data-category="staff" role="button" tabindex="0" aria-expanded="true" hidden><span>Staff</span><span class="channel-divider-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></div>
            <div class="channel-list staff-channel-list" id="staff-channel-list" hidden></div>
          </div>

          <div class="channel-divider chat-sidebar-header" id="dm-list-header" data-category="dms" role="button" tabindex="0" aria-expanded="true" hidden><span>Direct Messages</span><span class="channel-divider-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></div>
          <div class="dm-list" id="dm-list" hidden></div>
          <div class="channel-divider chat-sidebar-header group-list-header" id="group-list-header" data-category="groups" role="button" tabindex="0" aria-expanded="true" hidden><span>Group Chats</span><span class="channel-divider-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span><button type="button" class="dm-create-group" id="dm-create-group" aria-label="Create group chat" title="Create group chat" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button></div>
          <div class="dm-list group-list" id="group-list" hidden></div>

          <div class="chat-user-bar" id="chat-user-bar"></div>
        </aside>

        <div class="chat-main">
          <div class="chat-topbar">
            <span class="chat-topbar-hash" id="chat-topbar-hash">#</span>
            <img class="chat-topbar-avatar" id="chat-topbar-avatar" alt="" hidden>
            <span class="chat-topbar-name" id="chat-topbar-name">global</span>
            <span class="chat-topbar-topic" id="chat-topbar-topic"></span>
            <button type="button" class="chat-forum-back" id="chat-forum-back" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg><span>All posts</span></button>
            <div class="friends-tabs" id="friends-tabs" hidden>
              <button type="button" class="friends-tab active" data-friends-tab="all">All Friends</button>
              <button type="button" class="friends-tab" data-friends-tab="requests">Requests<span class="friends-tab-badge" id="requests-tab-badge" hidden></span></button>
              <button type="button" class="friends-tab friends-tab-add" data-friends-tab="add">Add Friend</button>
            </div>
            <button type="button" class="chat-actions-button chat-forum-layout-toggle" id="chat-forum-layout-toggle" aria-label="Use list layout" title="Use list layout" aria-pressed="false" hidden></button>
            <button type="button" class="chat-actions-button ui-icon-button ui-icon-button--sm" id="chat-actions-toggle" aria-label="Open Chat actions" title="Online users and pinned messages">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="17" r="2"/></svg>
              <span id="online-count">0</span>
            </button>
          </div>
          <div class="chat-context-panel" id="chat-context-panel" hidden></div>
          <div class="chat-alerts-overlay" id="chat-alerts-overlay" hidden></div>
          <div class="chat-group-members" id="chat-group-members" hidden></div>

          <div class="chat-messages" id="chat-messages"></div>
          <div class="chat-scroll-controls" id="chat-scroll-controls" hidden>
            <button type="button" class="chat-new-messages" id="chat-new-messages" aria-live="polite" hidden>New messages</button>
            <button type="button" class="chat-jump-latest" id="chat-jump-latest" aria-label="Jump to latest messages" title="Jump to latest messages" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          </div>

          <div class="reply-preview" id="reply-preview" hidden></div>

          <div class="chat-pending-attachment" id="chat-pending-attachment" hidden></div>
          <div class="chat-typing-indicator" id="chat-typing-indicator" role="status" aria-live="polite" hidden></div>
          <form class="chat-composer ui-field" id="chat-composer">
            <input type="text" id="chat-forum-title" name="forum_title" class="chat-forum-title" maxlength="120" placeholder="Title (required)" hidden>
            <div class="chat-composer-tools">
              <button type="button" class="chat-composer-plus" id="chat-attach-toggle" aria-label="Add to message" title="Add to message">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <input type="file" id="chat-file-input" hidden>
              <div class="chat-attachment-popover message-more-popover ui-menu" id="chat-attachment-menu" hidden></div>
            </div>
            <textarea id="chat-input" maxlength="500" rows="1" autocomplete="off" placeholder="Message #global"></textarea>
            <button class="ui-icon-button" type="submit" aria-label="Send">
              <svg viewBox="0 0 24 24"><path d="M4 12l16-8-8 16-2-6-6-2z"/></svg>
            </button>
          </form>
          <div class="chat-dm-restriction" id="chat-dm-restriction" role="status" aria-live="polite" hidden></div>
          <div class="chat-send-feedback" id="chat-send-feedback" role="status" aria-live="polite"></div>

          <div class="friends-view" id="friends-view" hidden></div>
        </div>

      </div>

      <div class="chat-overlay" id="chat-overlay"></div>
      <div class="auth-root" id="auth-root"></div>
    `;

    this.els = {
      app: root.querySelector("#chat-app"),
      sidebarTabs: root.querySelector("#sidebar-tabs"),
      onlineIndicator: root.querySelector("#chat-actions-toggle"),
      onlineCount: root.querySelector("#online-count"),
      channelListHeader: root.querySelector("#channel-list-header"),
      channelList: root.querySelector("#channel-list"),
      channelSections: root.querySelector("#chat-channel-sections"),
      importantListHeader: root.querySelector("#important-list-header"),
      importantChannelList: root.querySelector("#important-channel-list"),
      staffListHeader: root.querySelector("#staff-list-header"),
      staffChannelList: root.querySelector("#staff-channel-list"),
      dmListHeader: root.querySelector("#dm-list-header"),
      dmList: root.querySelector("#dm-list"),
      groupListHeader: root.querySelector("#group-list-header"),
      groupList: root.querySelector("#group-list"),
      groupCreate: root.querySelector("#dm-create-group"),
      userBar: root.querySelector("#chat-user-bar"),
      topbarHash: root.querySelector("#chat-topbar-hash"),
      topbarAvatar: root.querySelector("#chat-topbar-avatar"),
      topbarName: root.querySelector("#chat-topbar-name"),
      topbarTopic: root.querySelector("#chat-topbar-topic"),
      pinsToggle: root.querySelector("#chat-actions-toggle"),
      contextPanel: root.querySelector("#chat-context-panel"),
      alertsOverlay: root.querySelector("#chat-alerts-overlay"),
      forumBack: root.querySelector("#chat-forum-back"),
      forumLayoutToggle: root.querySelector("#chat-forum-layout-toggle"),
      groupMembers: root.querySelector("#chat-group-members"),
      messages: root.querySelector("#chat-messages"),
      scrollControls: root.querySelector("#chat-scroll-controls"),
      newMessages: root.querySelector("#chat-new-messages"),
      jumpLatest: root.querySelector("#chat-jump-latest"),
      replyPreview: root.querySelector("#reply-preview"),
      composer: root.querySelector("#chat-composer"),
      dmRestriction: root.querySelector("#chat-dm-restriction"),
      sendFeedback: root.querySelector("#chat-send-feedback"),
      input: root.querySelector("#chat-input"),
      forumTitle: root.querySelector("#chat-forum-title"),
      attachToggle: root.querySelector("#chat-attach-toggle"),
      attachMenu: root.querySelector("#chat-attachment-menu"),
      fileInput: root.querySelector("#chat-file-input"),
      pendingAttachment: root.querySelector("#chat-pending-attachment"),
      typingIndicator: root.querySelector("#chat-typing-indicator"),
      overlay: root.querySelector("#chat-overlay"),
      authRoot: root.querySelector("#auth-root"),
      friendsBadge: root.querySelector("#friends-badge"),
      dmUnreadDot: root.querySelector("#dm-unread-dot"),
      friendsTabs: root.querySelector("#friends-tabs"),
      requestsTabBadge: root.querySelector("#requests-tab-badge"),
      friendsView: root.querySelector("#friends-view"),
      mentionsBadge: root.querySelector("#mentions-badge"),
      alertsToggle: root.querySelector("#chat-alerts-toggle"),
      accountTrigger: root.querySelector("#chat-account-trigger"),
      accountPopover: root.querySelector("#chat-account-popover"),
    };

    this._friendsTab = "all";
    this._sidebarTab = "channels";
    this.viewMode = "channel"; // "channel" | "dm"
    this.forumPostId = null;
    this._forumIndexRows = null;
    this._forumRenderToken = 0;
    this._forumLayout = "grid";
    try {
      const savedForumLayout = localStorage.getItem("blur-forum-layout");
      if (savedForumLayout === "list" || savedForumLayout === "grid") this._forumLayout = savedForumLayout;
    } catch { /* optional preference */ }

    // @mention autocomplete state + username→id resolutions made
    // by the picker (reused by resolveMentions at send time)
    this._mention = { open: false, items: [], index: 0, start: -1, end: -1, el: null };
    this._mentionIds = {};
    this._moderationLogRows = [];
    this._contextMode = null;
    this._sidebarCategories = { main: false, important: false, staff: false, dms: false, groups: false };
    this._pendingAttachment = null;
    this._gifResults = [];
    this._gifSearchTimer = null;
    this._history = { scope: null, id: null, oldestAt: null, hasMore: false, loading: false };
    this._newMessages = { scope: null, id: null, count: 0 };
    this._quickDeleteRow = null;
    this._messageMoreSuppressClickUntil = 0;
    this._messageMenuToken = 0;
    this._reactionListenerToken = 0;
    this._attachmentListenerToken = 0;
    this._onlineListenerToken = 0;
    this._contextToken = 0;
    this._authToken = 0;
    this._typingTimer = null;
    this._typingIndicatorTimer = null;
    this.els.composer.addEventListener("submit", (e) => this.handleSend(e));

    this.els.input.addEventListener("input", () => {
      this.updateMentionAutocomplete();
      this.els.input.style.height = "auto";
      this.els.input.style.height = `${Math.min(this.els.input.scrollHeight, 120)}px`;
      this.setLocalTyping(true);
    });
    this.els.input.addEventListener("keydown", (e) => this.handleComposerKeydown(e));
    this.els.messages.addEventListener("scroll", () => this.handleMessageScroll());
    this.els.newMessages?.addEventListener("click", () => this.scrollToLatest());
    this.els.jumpLatest?.addEventListener("click", () => this.scrollToLatest());
    // Open message actions on pointer down so mouse, touch, and clicks on an
    // icon's nested SVG nodes all take the same reliable path. The following
    // click is suppressed because pointerdown already handled it.
    this.els.messages.addEventListener("pointerdown", (e) => {
      const moreBtn = e.target.closest?.("[data-more-msg]");
      if (!moreBtn || (e.button !== undefined && e.button !== 0)) return;
      e.preventDefault();
      e.stopPropagation();
      this._messageMoreSuppressClickUntil = Date.now() + 500;
      moreBtn.focus({ preventScroll: true });
      this.openMessageMenu(moreBtn, moreBtn.dataset.moreMsg);
    });
    this.els.input.addEventListener("blur", () => {
      this.setLocalTyping(false);
      // let click selection on the popover win over blur
      setTimeout(() => this.closeMentionPopover(), 120);
    });
    this.els.attachToggle?.addEventListener("click", () => this.toggleAttachmentMenu());
    this.els.attachMenu?.addEventListener("click", (e) => this.handleAttachmentMenuClick(e));
    this.els.fileInput?.addEventListener("change", () => {
      const file = this.els.fileInput.files?.[0];
      this.els.fileInput.value = "";
      if (file) this.uploadAttachment(file);
    });
    this.els.pendingAttachment?.addEventListener("click", (e) => {
      if (e.target.closest("[data-remove-attachment]")) this.clearPendingAttachment();
    });
    document.addEventListener("blur-profanity-change", () => {
      this.refreshVisibleMessageCensoring().catch(error => console.error("Message censor refresh failed:", error));
    });
    document.addEventListener("pointerdown", (event) => {
      if (!this.els.userBar?.contains(event.target)) this.closeAccountPopover();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.closeAccountPopover();
    });
    this.els.sidebarTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sidebar-tab]");
      if (!btn) return;
      this.showSidebarTab(btn.dataset.sidebarTab);
    });
    this.els.onlineIndicator.addEventListener("click", () => this.toggleContextPanel("actions"));
    this.els.forumLayoutToggle?.addEventListener("click", () => this.toggleForumLayout());
    this.els.groupCreate?.addEventListener("click", () => { this._friendsTab = "group-create"; this.showFriendsView("group-create"); });
    for (const [key, header] of [["important", this.els.importantListHeader], ["main", this.els.channelListHeader], ["staff", this.els.staffListHeader], ["dms", this.els.dmListHeader], ["groups", this.els.groupListHeader]]) {
      header?.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        if (key === "staff" && !this.isStaff()) return;
        this.toggleSidebarCategory(key);
      });
      header?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (key === "staff" && !this.isStaff()) return;
        event.preventDefault();
        this.toggleSidebarCategory(key);
      });
    }
    this.els.forumBack.addEventListener("click", () => {
      if (this.currentChannel && ChatPermissions.isForum(this.currentChannel)) {
        this.forumPostId = null;
        this._forumRenderToken++;
        this.els.forumBack.hidden = true;
        this.els.topbarName.textContent = chatChannelDisplayName(this.currentChannel);
        this.els.forumTitle.hidden = false;
        this.updateForumLayoutControl();
        this.refreshForumView();
      }
    });
    this.els.friendsTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-friends-tab]");
      if (!btn) return;
      this._friendsTab = btn.dataset.friendsTab;
      this.renderFriendsTabs();
      if (this._friendsTab === "group-create") this.renderGroupCreate().catch(error => console.error("Group create view failed:", error));
      else {
        const viewToken = this._viewToken;
        const activeTab = this._friendsTab;
        Friends.renderBody(this.els.friendsView, activeTab, () => this._viewToken === viewToken && this._sidebarTab === "friends" && !this.els.friendsView.hidden && this._friendsTab === activeTab).catch(error => console.error("Friends view failed:", error));
      }
    });

    // Clicking a username/avatar opens a profile popup; clicking a
    // reaction pill toggles it; clicking "+" opens the emoji picker.
    this.els.messages.addEventListener("click", (e) => {
      const media = e.target.closest("[data-media-preview]");
      if (media) {
        e.preventDefault();
        this.openMediaLightbox(media.dataset.mediaUrl, media.dataset.mediaName || "Attachment", media.dataset.mediaType || "");
        return;
      }
      const userTarget = e.target.closest("[data-user]");
      if (userTarget) {
        Profiles.renderProfilePopup(this.els.overlay, userTarget.dataset.user, {
          isSelf: userTarget.dataset.user === this.user?.id
        }).catch(error => console.error("Profile popup failed:", error));
        return;
      }

      const pill = e.target.closest("[data-react-message]");
      if (pill) {
        const messageId = pill.dataset.reactMessage;
        const emoji = pill.dataset.reactEmoji;
        const { scope, scopeId } = this.msgScope();
        const viewToken = this._viewToken;
        Reactions.toggle(scope, scopeId, messageId, this.user.id, emoji)
          .then(() => {
            Reactions.recordUsage(this.user?.id, emoji);
            if (this._viewToken === viewToken) Messages.updateReactions(this.els.messages, messageId, scope);
          })
          .catch(err => this.showSendFeedback(err?.message || "Couldn’t update that reaction."));
        return;
      }

      const addBtn = e.target.closest("[data-react-add]");
      if (addBtn) {
        this.openReactionPicker(addBtn, addBtn.dataset.reactAdd);
        return;
      }

      const replyBtn = e.target.closest("[data-reply-msg]");
      if (replyBtn) {
        if (this.viewMode === "channel" && !Permissions.canPostChannel(this.profile, this.currentChannel)) return;
        this.setReplyTarget(replyBtn.dataset.replyMsg, this.msgScope().scope);
        return;
      }

      const forumAction = e.target.closest("[data-forum-pin], [data-forum-delete]");
      if (forumAction && ChatPermissions.isForum(this.currentChannel)) {
        const postId = forumAction.dataset.forumPostAction || forumAction.dataset.forumDelete;
        if (forumAction.dataset.forumPin) {
          if (Permissions.canManageForumPins(this.profile)) Messages.pin(postId, forumAction.dataset.forumPin === "pin").catch(() => this.showSendFeedback("Couldn’t update that pin."));
        } else this.deleteForumPost(postId);
        return;
      }
      const forumCard = e.target.closest("[data-forum-post]");
      if (forumCard && ChatPermissions.isForum(this.currentChannel)) {
        this.openForumPost(forumCard.dataset.forumPost);
        return;
      }

      const moreBtn = e.target.closest("[data-more-msg]");
      if (moreBtn) {
        if (Date.now() < this._messageMoreSuppressClickUntil) return;
        e.preventDefault();
        e.stopPropagation();
        this.openMessageMenu(moreBtn, moreBtn.dataset.moreMsg);
        return;
      }

      const editBtn = e.target.closest("[data-edit-msg]");
      if (editBtn) { this.startMessageEdit(editBtn.dataset.editMsg); return; }
      const deleteBtn = e.target.closest("[data-delete-msg]");
      if (deleteBtn) { this.deleteMessage(deleteBtn.dataset.deleteMsg); return; }
      const pinBtn = e.target.closest("[data-pin-msg]");
      if (pinBtn) {
        if (this.viewMode !== "channel" || !this.currentChannel || this.currentChannel.is_log || !Permissions.canModerate(this.profile)) return;
        const cached = Messages.getCached(pinBtn.dataset.pinMsg, "channel");
        Messages.setPinned(pinBtn.dataset.pinMsg, !cached?.message?.is_pinned).then(() => {
          if (this._contextMode === "actions") this.renderChatActionsPanel();
        }).catch(err => {
          console.error("Pin failed:", err);
          this.showSendFeedback("Couldn’t update that pin.");
        });
        return;
      }

      const quote = e.target.closest("[data-jump-to]");
      if (quote) {
        this.jumpToMessage(quote.dataset.jumpTo);
      }
    });

    this.els.messages.addEventListener("mouseover", (e) => {
      const row = e.target.closest(".message-row");
      if (row) this.setQuickDeleteState(row, e.shiftKey);
      const pill = e.target.closest("[data-reaction-users]");
      if (pill && !pill.title) {
        try {
          const ids = JSON.parse(pill.dataset.reactionUsers);
          Promise.all(ids.map(id => Profiles.getById(id))).then(rows => {
            pill.title = rows.map(p => p?.display_name || p?.username || "Unknown").join(", ");
          }).catch(error => {
            // A deleted/temporarily unavailable profile should not create an
            // unhandled rejection just because a reaction was hovered.
            console.warn("Reaction profile lookup failed:", error?.message || error);
          });
        } catch { /* malformed data cannot affect reactions */ }
      }
    });
    this.els.messages.addEventListener("mouseout", (e) => {
      const row = e.target.closest(".message-row");
      if (!row || row.contains(e.relatedTarget)) return;
      if (this._quickDeleteRow === row) {
        this.setQuickDeleteState(row, false);
        this._quickDeleteRow = null;
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Shift" && this._quickDeleteRow) this.setQuickDeleteState(this._quickDeleteRow, true);
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift" && this._quickDeleteRow) this.setQuickDeleteState(this._quickDeleteRow, false);
    });
    window.addEventListener("blur", () => {
      if (this._quickDeleteRow) this.setQuickDeleteState(this._quickDeleteRow, false);
    });

    // Auth lifecycle is owned by the global Account service —
    // Chat just consumes (user, profile) changes like any other
    // module. See account.js at the project root.
    Account.onAuthStateChange((user, profile) => this.handleAuthChange(user, profile));
  },

  async handleAuthChange(user, profile){
    const authToken = ++this._authToken;
    if (!user) {
      this.user = null;
      this.profile = null;
      this.viewMode = "channel";
      this.els.app.hidden = true;
      // Dismiss every body-level menu (including message actions and the
      // context panel) when signing out; otherwise a stale menu can remain
      // clickable over the auth screen.
      this.closeTransientUI?.();
      this.closeReactionPicker();
      this.closeAttachmentMenu();
      this.closeMediaLightbox();
      this.closeMentionPopover();
      Mentions.teardown();
      Unread.teardown();
      this.updateMentionIndicators();
      // the profile popup now hosts Edit/Sign out actions, so it
      // must go with the session
      Profiles.closePopup?.(this.els.overlay);
      Messages.unsubscribe();
      Reactions.unsubscribe();
      Moderation.unsubscribeLogs();
      Friends.teardown();
      DirectMessages.teardown();
      Presence.teardown();
      clearTimeout(this._typingTimer);
      clearInterval(this._typingIndicatorTimer);
      this._typingTimer = null;
      this._typingIndicatorTimer = null;
      this.updateTypingIndicator();
      if (typeof Messages !== "undefined") Messages._cache?.clear();
      if (typeof Reactions !== "undefined") Reactions.reset?.();
      if (typeof Profiles !== "undefined") Profiles.clearCache?.();
      Auth.renderAuthScreen(this.els.authRoot);
      return;
    }

    this.els.authRoot.innerHTML = "";

    if (!profile) {
      // Rare fallback: Account already tried creating the profile
      // from the username stashed on the auth user at signup and
      // couldn't (e.g. the username is taken). Ask for one here,
      // then reload so auth/profile state is fully synced.
const setupAuthToken = authToken;
Profiles.renderUsernameSetup(this.els.overlay, user, async (createdProfile) => {
  if (setupAuthToken !== this._authToken || !this.user || this.user.id !== user.id) return;
  Profiles.closePopup?.(this.els.overlay);
  Account.setProfile(createdProfile);
  try {
    await this.startChat(user, createdProfile);
    // Reload so auth/profile state is fully synced
    window.location.reload();
  } catch (error) {
    console.error("Chat startup after profile setup failed:", error);
    this.showSendFeedback("Chat couldn’t load right now. Try refreshing.");
  }
});
      return;
    }

    try {
      await this.startChat(user, profile, authToken);
    } catch (error) {
      if (authToken !== this._authToken || !this.user) return;
      console.error("Chat startup failed:", error);
      this.showMessagesView();
      this.els.composer.hidden = true;
      this.els.replyPreview.hidden = true;
      this.els.messages.innerHTML = `<div class="ui-error chat-load-error"><span>Chat couldn’t load right now. Check your connection and try again.</span><button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-chat>Retry</button></div>`;
      this.els.messages.querySelector("[data-retry-chat]")?.addEventListener("click", () => {
        this.startChat(user, profile, authToken).catch(err => {
          console.error("Chat retry failed:", err);
          this.showSendFeedback("Chat is still unavailable. Try again in a moment.");
        });
      });
    }
  },

  async startChat(user, profile, authToken = this._authToken){
    if (authToken !== this._authToken) return;

    // Close any overlay/menu that belonged to the previous session before
    // the new account becomes interactive.
    this.closeTransientUI?.();
    Profiles.closePopup?.(this.els.overlay);

    // A session can change without a full page reload. Clear message-scoped
    // caches before booting the new account so stale reply previews,
    // reactions, and mention resolutions cannot cross account boundaries.
    if (typeof Messages !== "undefined") Messages._cache?.clear();
    if (typeof Reactions !== "undefined") Reactions.reset?.();
    if (typeof Profiles !== "undefined") Profiles.clearCache?.();
    this._mentionIds = {};
    this.currentChannel = null;
    this.currentDM = null;

    this.user = user;
    this.profile = profile;
    this.viewMode = "channel";
    this.els.app.hidden = false;

    this.renderUserBar();
    this.maybePromptCensorPreference();

    // mention/ping indicators (channels session-scoped, DMs recovered
    // from the persisted last-read pointers)
    Mentions.init(user.id);
    Mentions.onChange(() => this.updateMentionIndicators());
    Unread.init(user.id);
    Unread.onChange(() => this.updateMentionIndicators());

    // Friends and DMs are independent account-scoped loads. Start them
    // together with the channel query so Chat does not wait on multiple
    // sequential network waterfalls before opening the first conversation.
    const channelsReady = Channels.fetchAll();
    const friendsReady = Friends.init(user.id);
    const directMessagesReady = DirectMessages.init(user.id);
    await Promise.all([channelsReady, friendsReady, directMessagesReady]);
    if (authToken !== this._authToken) return;
    Friends.onChange(() => {
      this.updateFriendsBadge();
      // A friendship can change while an existing DM is open. Keep the
      // composer in sync even when the Friends view is not visible.
      this.syncDMFriendshipState();
      if (this.els.friendsView.hidden || this._sidebarTab !== "friends") return;
      this.renderFriendsTabs();
      if (this._friendsTab === "group-create") {
        this.renderGroupCreate().catch(error => console.error("Group create view refresh failed:", error));
      } else if (this._friendsTab !== "add") {
        const viewToken = this._viewToken;
        const activeTab = this._friendsTab;
        Friends.renderBody(this.els.friendsView, activeTab, () => this._viewToken === viewToken && this._sidebarTab === "friends" && !this.els.friendsView.hidden && this._friendsTab === activeTab).catch(error => console.error("Friends view refresh failed:", error));
      }
    });
    this.updateFriendsBadge();

    if (authToken !== this._authToken) return;
    DirectMessages.onChange(() => {
      this.updateDMBadge();
      if (this.viewMode === "dm" && this.currentDM?.is_group
          && !DirectMessages._rows.some(row => row.id === this.currentDM.id)) {
        this.showFriendsView("all");
        return;
      }
      if (this._sidebarTab === "friends" && !this.els.dmList.hidden) {
        this.renderDMLists();
      }
      this.updateMentionIndicators();
    });
    this.updateDMBadge();

    Mentions.watch(user.id, (scope, id) =>
      scope === "channel"
        ? (this.viewMode === "channel" && this.currentChannel?.id === id && this.isMessagesAtBottom())
        : (this.viewMode === "dm" && this.currentDM?.id === id && this.isMessagesAtBottom())
    );
    // DM mention recovery is independent of the channel query. Start it now
    // and await it alongside the channel/unread recovery below so startup is
    // not needlessly serialized.
    const dmMentionRecovery = Mentions.recoverDmMentions(user.id);

    Presence.init(user.id, profile);
    Presence.onChange(() => {
      this.updateOnlineIndicator();
      this.updateTypingIndicator();
    });
    clearInterval(this._typingIndicatorTimer);
    this._typingIndicatorTimer = setInterval(() => this.updateTypingIndicator(), 2000);
    this.updateOnlineIndicator();
    this.updateTypingIndicator();

    Mentions.prune(Channels.list, DirectMessages._rows);
    await Promise.all([
      dmMentionRecovery,
      Mentions.recoverChannelMentions(user.id, Channels.list),
      Unread.recover(user.id, Channels.list, DirectMessages._rows)
    ]);
    Unread.watch(user.id, (scope, id) =>
      scope === "channel"
        ? (this.viewMode === "channel" && this.currentChannel?.id === id)
        : (this.viewMode === "dm" && this.currentDM?.id === id),
      () => this.isMessagesAtBottom()
    );
    Channels.render(this.els.channelList, (channel) => this.openChannel(channel), this.els.staffChannelList, this.els.importantChannelList);
    this.els.staffListHeader.hidden = !this.isStaff() || !this.els.staffChannelList?.children.length;
    this.applySidebarCategory("main");
    this.applySidebarCategory("important");
    this.applySidebarCategory("staff");
    this.updateMentionIndicators();

    const initial = Channels.list.find(c => c.name === "global") || Channels.list[0];
    if (initial) {
      Channels.setActive(this.els.channelList, initial.id);
      await this.openChannel(initial);
    }
  },

  renderUserBar(){
    const displayName = this.profile.display_name || this.profile.username;
    this.els.userBar.innerHTML = `
      <button type="button" class="user-bar-profile-trigger" id="chat-account-trigger" aria-expanded="false" aria-controls="chat-account-popover">
        <img class="user-bar-avatar" src="${escapeAttr(Profiles.safeImageUrl(this.profile.avatar_url, this.profile.username || "?"))}" alt="">
        <span class="user-bar-name">${escapeHtml(displayName)}</span>
        <svg class="user-bar-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
      </button>
      <div class="chat-account-popover ui-menu" id="chat-account-popover" hidden>
        <button type="button" class="account-popover-identity ui-menu__item" data-account-action="profile" aria-label="Open your full profile">
          <img src="${escapeAttr(Profiles.safeImageUrl(this.profile.avatar_url, this.profile.username || "?"))}" alt="">
          <div><strong>${escapeHtml(displayName)}</strong><span>@${escapeHtml(this.profile.username || "user")}</span></div>
          <svg class="account-popover-identity-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>
        </button>
        <div class="account-popover-divider ui-menu__divider"></div>
        <div class="account-popover-actions">
          <button type="button" class="ui-menu__item" data-account-action="alerts">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
            <span>Alerts</span><span class="mentions-badge" id="mentions-badge" hidden></span>
          </button>
          <button type="button" class="ui-menu__item" data-account-action="edit">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            <span>Edit profile</span>
          </button>
          <button type="button" class="ui-menu__item" data-account-action="copy-id">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
            <span>Copy user ID</span>
          </button>
          <div class="account-popover-divider ui-menu__divider"></div>
          <button type="button" class="account-popover-danger ui-menu__item ui-menu__item--danger" data-account-action="signout">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    `;
    this.els.accountTrigger = this.els.userBar.querySelector("#chat-account-trigger");
    this.els.accountPopover = this.els.userBar.querySelector("#chat-account-popover");
    this.els.alertsToggle = this.els.userBar.querySelector('[data-account-action="alerts"]');
    this.els.mentionsBadge = this.els.userBar.querySelector("#mentions-badge");
    this.els.accountTrigger.addEventListener("click", () => this.toggleAccountPopover());
    this.els.accountPopover.addEventListener("click", (event) => this.handleAccountPopoverAction(event));
    this.updateMentionIndicators();
  },

  toggleAccountPopover(){
    const popover = this.els.accountPopover;
    const trigger = this.els.accountTrigger;
    if (!popover || !trigger) return;
    const open = popover.hidden;
    popover.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.classList.toggle("is-open", open);
  },

  closeAccountPopover(){
    const popover = this.els?.accountPopover;
    const trigger = this.els?.accountTrigger;
    if (!popover || popover.hidden) return;
    popover.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.classList.remove("is-open");
  },

  async handleAccountPopoverAction(event){
    const button = event.target.closest("[data-account-action]");
    if (!button) return;
    const action = button.dataset.accountAction;
    this.closeAccountPopover();
    if (action === "alerts") {
      if (!this.els.alertsOverlay?.hidden) {
        this.closeAlertsOverlay();
      } else {
        this.showMentionsView({ overlay: true }).catch(error => console.error("Alerts overlay failed:", error));
      }
      return;
    }
    if (action === "profile") {
      Profiles.renderProfilePopup(this.els.overlay, this.user.id, { isSelf: true }).catch(error => console.error("Profile popup failed:", error));
      return;
    }
    if (action === "edit") {
      if (typeof window.openProfileSettings === "function") window.openProfileSettings();
      else Profiles.renderEditProfile(this.els.overlay, this.profile);
      return;
    }
    if (action === "copy-id") {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(String(this.user.id));
        this.showSendFeedback("User ID copied.");
      } catch {
        this.showSendFeedback("Couldn’t copy the user ID.");
      }
      return;
    }
    if (action === "signout") Account.signOut();
  },

  // Called by profiles.js after a successful profile edit.
  onProfileUpdated(updated){
    this.profile = updated;
    Account.setProfile(updated);
    this.renderUserBar();
    this.setChannelComposerState(this.viewMode === "channel" ? this.currentChannel : null);
  },

  renderDMLists(){
    DirectMessages.renderSeparated(this.els.dmList, this.els.groupList, (row) => this.openDM(row.is_group ? row.id : DirectMessages.otherId(row)));
    this.applySidebarCategory("dms");
    this.applySidebarCategory("groups");
  },

  /** Keep every sidebar section on the same small disclosure interaction. */
  sidebarCategoryElements(key){
    const map = {
      main: [this.els.channelListHeader, this.els.channelList],
      important: [this.els.importantListHeader, this.els.importantChannelList],
      staff: [this.els.staffListHeader, this.els.staffChannelList],
      dms: [this.els.dmListHeader, this.els.dmList],
      groups: [this.els.groupListHeader, this.els.groupList]
    };
    return map[key] || [];
  },

  applySidebarCategory(key){
    const [header, content] = this.sidebarCategoryElements(key);
    if (!header) return;
    // A hidden header means its whole view is currently inactive (or the
    // category has no rows). Keep that structural visibility separate from
    // the user's remembered collapsed state.
    if (header.hidden) return;
    const collapsed = !!this._sidebarCategories?.[key];
    header.classList.toggle("is-collapsed", collapsed);
    header.setAttribute("aria-expanded", String(!collapsed));
    if (content && typeof content.forEach === "function" && !("hidden" in content)) {
      content.forEach(row => { row.hidden = collapsed; });
    } else if (content) {
      content.hidden = collapsed;
    }
    if (key === "groups" && this.els.groupCreate) {
      this.els.groupCreate.hidden = collapsed || this._sidebarTab !== "friends";
    }
  },

  toggleSidebarCategory(key){
    if (!this._sidebarCategories || !(key in this._sidebarCategories)) return;
    this._sidebarCategories[key] = !this._sidebarCategories[key];
    this.applySidebarCategory(key);
  },

  // Keep the small leading mark in the chat header contextual. Channels use
  // their familiar hash, while social views and DMs get a real visual anchor.
  setTopbarIcon(kind, profile = null, fallback = "#"){
    const hash = this.els.topbarHash;
    const avatar = this.els.topbarAvatar;
    if (!hash || !avatar) return;
    avatar.hidden = true;
    hash.hidden = false;
    hash.classList.toggle("is-context-icon", kind !== "channel" && kind !== "forum");
    hash.classList.toggle("is-forum-icon", kind === "forum");
    if (kind === "dm" && profile) {
      const name = profile.display_name || profile.username || "Contact";
      avatar.src = Profiles.safeImageUrl(profile.avatar_url, profile.username || "contact");
      avatar.alt = name;
      avatar.title = name;
      avatar.hidden = false;
      hash.hidden = true;
      return;
    }
    if (kind === "friends") {
      hash.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3.2"></circle><circle cx="16.5" cy="10" r="2.4"></circle><path d="M3.5 18c.7-2.7 2.5-4.2 5.5-4.2s4.8 1.5 5.5 4.2M14 14.7c2.4-.3 4.5.8 5.4 3.3"></path></svg>';
    } else if (kind === "forum") {
      hash.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 16H11l-5.5 4v-4.25a2.5 2.5 0 0 1-1-2.25v-8Z"></path><path d="M8 8h8M8 11h6"></path></svg>';
    } else if (kind === "alerts") {
      hash.textContent = "!";
    } else if (kind === "group") {
      hash.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3.2"></circle><circle cx="16.5" cy="10" r="2.4"></circle><path d="M3.5 18c.7-2.7 2.5-4.2 5.5-4.2s4.8 1.5 5.5 4.2M14 14.7c2.4-.3 4.5.8 5.4 3.3"></path></svg>';
    } else {
      hash.textContent = fallback;
    }
  },


  /** Just swaps which list (channels vs DMs) shows in the sidebar — doesn't touch the main column. */
  _setSidebarTabUI(tab){
    this._sidebarTab = tab;
    this.els.sidebarTabs.querySelectorAll(".sidebar-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.sidebarTab === tab);
    });
    this.els.alertsToggle?.classList.toggle("active", tab === "alerts");

    const onChannels = tab === "channels";
    const onFriends = tab === "friends";
    this.els.channelSections.hidden = !onChannels;
    this.els.importantListHeader.hidden = !onChannels;
    this.els.channelListHeader.hidden = !onChannels;
    this.els.staffListHeader.hidden = !onChannels || !this.isStaff() || !this.els.staffChannelList?.children.length;
    this.els.channelList.hidden = !onChannels;
    this.els.importantChannelList.hidden = !onChannels;
    this.els.dmListHeader.hidden = !onFriends;
    this.els.groupListHeader.hidden = !onFriends;
    this.els.staffChannelList.hidden = !onChannels || !this.isStaff();
    this.els.dmList.hidden = !onFriends;
    this.els.groupList.hidden = !onFriends;
    this.els.groupCreate.hidden = !onFriends || !!this._sidebarCategories?.groups;

    this.applySidebarCategory("main");
    this.applySidebarCategory("important");
    this.applySidebarCategory("staff");
    this.applySidebarCategory("dms");
    this.applySidebarCategory("groups");

    if (onFriends) {
      this.renderDMLists();
      this.updateMentionIndicators();
    }
  },

  /** Handles an explicit click on the Channels/Friends sidebar tab — also drives the main column. */
  showSidebarTab(tab){
    if (tab !== "alerts") this.closeAlertsOverlay();
    this._setSidebarTabUI(tab);

    if (tab === "channels") {
      if (this.currentChannel) {
        this.openChannel(this.currentChannel);
      } else if (Channels.list[0]) {
        Channels.setActive(this.els.channelList, Channels.list[0].id);
        this.openChannel(Channels.list[0]);
      }
    } else if (tab === "alerts") {
      this.showMentionsView().catch(error => console.error("Alerts view failed:", error));
    } else {
      this.showFriendsView(this._friendsTab);
    }
  },

  /** Which message table (+ key) the open view renders into. */
  msgScope(){
    return this.viewMode === "dm"
      ? { scope: "dm", scopeId: this.currentDM?.id }
      : { scope: "channel", scopeId: this.currentChannel?.id };
  },

  setLocalTyping(active = true){
    clearTimeout(this._typingTimer);
    this._typingTimer = null;
    const scope = this.msgScope();
    if (!active || !this.user || this.els.composer?.hidden || !scope.scopeId) {
      Presence?.setTyping?.(null, null, false);
      this.updateTypingIndicator();
      return;
    }
    Presence?.setTyping?.(scope.scope, scope.scopeId, true);
    this._typingTimer = setTimeout(() => this.setLocalTyping(false), 4500);
  },

  updateTypingIndicator(){
    const indicator = this.els.typingIndicator;
    if (!indicator) return;
    const scope = this.msgScope();
    const now = Date.now();
    const people = (Presence?.list?.() || [])
      .filter(person => person.id !== this.user?.id
        && person.typing?.scope === scope.scope
        && person.typing?.scopeId === scope.scopeId
        && now - Number(person.typingUpdatedAt || 0) < 7000)
      .sort((a, b) => String(a.display_name || a.username || "").localeCompare(String(b.display_name || b.username || "")));
    if (!people.length || this.els.composer?.hidden) {
      indicator.hidden = true;
      indicator.textContent = "";
      return;
    }
    const names = people.map(person => person.display_name || person.username || "Someone");
    let label;
    if (names.length === 1) label = `${names[0]} is typing`;
    else if (names.length <= 4) label = `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are typing`;
    else label = `${names.slice(0, 4).join(", ")} +${names.length - 4} other${names.length - 5 === 0 ? "" : "s"} are typing`;
    indicator.textContent = label;
    indicator.hidden = false;
  },

  /** Snapshot/validate the open conversation around async actions. */
  isViewContext(context){
    if (!context || context.token !== this._viewToken) return false;
    const current = this.msgScope();
    return current.scope === context.scope && current.scopeId === context.scopeId;
  },

  setQuickDeleteState(row){
    const button = row?.querySelector(".message-more-btn");
    if (!button) return;
    // Keep this legacy hook harmless: the three-dot control is always the
    // message-options trigger, never an implicit delete shortcut.
    this._quickDeleteRow = null;
    if (button.dataset.quickDelete !== "1" && !button.classList.contains("message-quick-delete")) return;
    button.dataset.quickDelete = "0";
    button.classList.remove("message-quick-delete");
    button.title = "More message actions";
    button.setAttribute("aria-label", "More message actions");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
  },

  messageLoadingMarkup(label = "Loading messages…"){
    return `<div class="ui-empty chat-loading-state"><span class="ui-spinner" aria-hidden="true"></span><p>${escapeHtml(label)}</p></div>`;
  },

  setHistoryLoader(visible){
    const existing = this.els.messages.querySelector(".chat-history-loader");
    if (visible && !existing) {
      const loader = document.createElement("div");
      loader.className = "chat-history-loader";
      loader.innerHTML = '<span class="ui-spinner ui-spinner--sm" aria-hidden="true"></span><span>Loading older messages…</span>';
      this.els.messages.prepend(loader);
    } else if (!visible) existing?.remove();
  },

  isMessagesAtBottom(threshold = 80){
    const messages = this.els.messages;
    if (!messages || messages.hidden) return true;
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight <= threshold;
  },

  resetNewMessages(){
    this._newMessages = { scope: null, id: null, count: 0 };
    this.updateScrollControls();
  },

  queueNewMessage(scope, id){
    if (!id) return;
    if (this._newMessages.scope !== scope || this._newMessages.id !== id) {
      this._newMessages = { scope, id, count: 0 };
    }
    this._newMessages.count += 1;
    if (typeof Unread !== "undefined") Unread.mark(scope, id);
    this.updateScrollControls();
  },

  clearActiveUnread(){
    const scope = this.viewMode === "dm" ? "dm" : this.viewMode === "channel" ? "channel" : null;
    const id = scope === "dm" ? this.currentDM?.id : scope === "channel" ? this.currentChannel?.id : null;
    if (!scope || !id || !this.isMessagesAtBottom()) return;
    const hadUnread = (typeof Unread !== "undefined" && Unread.has(scope, id))
      || Mentions.has(scope, id)
      || (scope === "dm" && this.currentDM && DirectMessages.isUnread(this.currentDM));
    const hasQueued = this._newMessages.scope === scope && this._newMessages.id === id && this._newMessages.count > 0;
    if (!hadUnread && !hasQueued) return;
    if (typeof Unread !== "undefined") Unread.clear(scope, id);
    if (scope === "channel") Mentions.markChannelRead(this.user?.id, id);
    else DirectMessages.markRead(id);
    if (this._newMessages.scope === scope && this._newMessages.id === id) this._newMessages.count = 0;
    this.updateScrollControls();
  },

  scrollToLatest(){
    const messages = this.els.messages;
    if (!messages || messages.hidden) return;
    const token = this._viewToken;
    messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
    window.setTimeout(() => { if (token === this._viewToken) this.clearActiveUnread(); }, 220);
  },

  updateScrollControls(){
    const controls = this.els.scrollControls;
    const messages = this.els.messages;
    if (!controls || !messages || messages.hidden || (this.viewMode !== "channel" && this.viewMode !== "dm")) {
      if (controls) controls.hidden = true;
      return;
    }
    const farFromBottom = !this.isMessagesAtBottom();
    const current = this._newMessages.scope === (this.viewMode === "dm" ? "dm" : "channel")
      && this._newMessages.id === (this.viewMode === "dm" ? this.currentDM?.id : this.currentChannel?.id);
    const count = current ? this._newMessages.count : 0;
    controls.hidden = !farFromBottom && count === 0;
    this.els.newMessages.hidden = !(farFromBottom && count > 0);
    this.els.newMessages.textContent = `${count} new message${count === 1 ? "" : "s"}`;
    this.els.jumpLatest.hidden = !farFromBottom;
  },

  handleMessageScroll(){
    const messages = this.els.messages;
    this.updateScrollControls();
    if (!messages || messages.hidden) return;
    if (this.isMessagesAtBottom()) this.clearActiveUnread();
    if (messages.scrollTop > 72) return;
    const state = this._history;
    if (!state?.hasMore || state.loading) return;
    // Forum indexes/posts and moderation logs have their own loading model.
    if (state.scope === "channel" && (ChatPermissions.isForum(this.currentChannel) || this.currentChannel?.is_log)) return;
    this.loadOlderMessages();
  },

  async loadOlderMessages(){
    const state = this._history;
    if (!state?.hasMore || state.loading || !state.oldestAt) return;
    state.loading = true;
    const token = this._viewToken;
    const beforeHeight = this.els.messages.scrollHeight;
    const beforeTop = this.els.messages.scrollTop;
    this.setHistoryLoader(true);
    try {
      const older = state.scope === "dm"
        ? await DirectMessages.loadOlder(state.id, state.oldestAt)
        : await Messages.loadOlder(state.id, state.oldestAt);
      if (token !== this._viewToken || !older?.length) {
        if (!older?.length) state.hasMore = false;
        return;
      }
      const isCurrent = () => token === this._viewToken && ((state.scope === "dm" && this.viewMode === "dm" && this.currentDM?.id === state.id) || (state.scope === "channel" && this.viewMode === "channel" && this.currentChannel?.id === state.id));
      if (state.scope === "dm") await DirectMessages.prependList(this.els.messages, older, isCurrent);
      else await Messages.prependList(this.els.messages, older, isCurrent, "channel");
      state.oldestAt = older[0]?.created_at || state.oldestAt;
      state.hasMore = older.length >= (state.scope === "dm" ? DirectMessages.PAGE_SIZE : Messages.PAGE_SIZE);
      // Remove the temporary top loader before restoring the offset so its
      // height is not mistaken for message content and the viewport stays
      // anchored to the same message.
      if (isCurrent()) {
        this.setHistoryLoader(false);
        this.els.messages.scrollTop = this.els.messages.scrollHeight - beforeHeight + beforeTop;
      }
    } catch (err) {
      console.warn("Could not load older messages", err?.message || err);
    } finally {
      state.loading = false;
      if (token === this._viewToken) this.setHistoryLoader(false);
    }
  },

  async openChannel(channel){
    if (!channel?.id) return;
    this.setLocalTyping(false);
    this.closeAlertsOverlay();
    // Channels can remain in memory while an account's role changes in
    // another tab. Do not let a stale staff-channel object reopen after the
    // user has been downgraded; route them back to the first public channel.
    if (String(channel.visibility || "public").toLowerCase() === "staff" && !this.isStaff()) {
      const fallback = Channels.list.find(item => String(item.visibility || "public").toLowerCase() !== "staff");
      if (fallback && fallback.id !== channel.id) return this.openChannel(fallback);
      this.showSendFeedback("You no longer have access to this channel.");
      return;
    }
    if (this._sidebarTab !== "channels") this._setSidebarTabUI("channels");
    const viewToken = (this._viewToken || 0) + 1;
    this._viewToken = viewToken;
    this.showMessagesView();
    this.closeReactionPicker();
    this.closeAttachmentMenu();
    this.closeOnlinePopover();
    this.clearPendingAttachment();
    this.closeMediaLightbox();
    this.closeMentionPopover();
    this.closeContextPanel();
    Profiles.closePopup?.(this.els.overlay);
    this.clearReplyTarget();
    DirectMessages.unsubscribeConversation();
    Moderation.unsubscribeLogs();
    Messages.unsubscribe();
    Reactions.unsubscribe();

    this.viewMode = "channel";
    this.currentChannel = channel;
    this._history = { scope: "channel", id: channel.id, oldestAt: null, hasMore: false, loading: false };
    this.resetNewMessages();
    if (typeof Unread !== "undefined") Unread.clear("channel", channel.id);
    Channels.setActive(channel.visibility === "staff" ? this.els.staffChannelList : this.els.channelList, channel.id);
    this.forumPostId = null;
    this._forumIndexRows = null;
    this._forumRenderToken++;
    this.currentDM = null;
    DirectMessages.activeId = null;
    Mentions.clear("channel", channel.id);
    Mentions.markChannelRead(this.user?.id, channel.id);

    this.viewMode = "channel";

    const channelIconKind = ChatPermissions.isAnnouncement(channel) ? "channel" : (ChatPermissions.isForum(channel) ? "forum" : "channel");
    this.setTopbarIcon(channelIconKind, null, ChatPermissions.isAnnouncement(channel) ? "!" : "#");
    this.els.topbarName.textContent = chatChannelDisplayName(channel);
    this.els.topbarName.title = "";
    this.els.pinsToggle.hidden = false;
    if (this.els.topbarTopic) { this.els.topbarTopic.textContent = channel.topic || (ChatPermissions.isForum(channel) ? "Community forum" : ChatPermissions.isAnnouncement(channel) ? "Important updates" : ""); this.els.topbarTopic.hidden = !this.els.topbarTopic.textContent; }
    this.els.forumBack.hidden = true;
    this.els.groupMembers.hidden = true;
    this.els.groupMembers.innerHTML = "";
    this.els.input.placeholder = `Message #${chatChannelDisplayName(channel)}`;
    this.els.forumTitle.hidden = !ChatPermissions.isForum(channel) || !!this.replyTarget;
    this.els.forumTitle.value = "";
    this.setChannelComposerState(channel);
    this.updateForumLayoutControl();
    this.els.messages.innerHTML = this.messageLoadingMarkup();

    try {
      if (channel.is_log) {
        if (!this.isStaff()) throw new Error("You do not have access to this channel.");
        this._moderationLogRows = await Moderation.loadLogs();
        if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
        Moderation.renderLogs(this.els.messages, this._moderationLogRows);
        Moderation.subscribeLogs(channel.id, (payload) => {
          if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
          if (!payload?.new) return;
          try {
            this._moderationLogRows.unshift(payload.new);
            Moderation.renderLogs(this.els.messages, this._moderationLogRows);
          } catch (error) { console.error("Failed to render live moderation log:", error); }
        });
        return;
      }
      const history = await Messages.loadInitial(channel.id, { forum: ChatPermissions.isForum(channel) });
      this._history.oldestAt = history[0]?.created_at || null;
      this._history.hasMore = !ChatPermissions.isForum(channel) && history.length >= Messages.PAGE_SIZE;
      let reactionsReady = false;
      try {
        await Reactions.load("channel", channel.id, () => this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id);
        reactionsReady = true;
      } catch (reactionError) {
        // A missing or temporarily unavailable reactions table should not
        // make the entire channel unreadable.
        console.warn("Channel reactions unavailable; continuing without them.", reactionError?.message || reactionError);
      }
      if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
      if (ChatPermissions.isForum(channel)) {
        // Wait for author/profile hydration before subscribing. Starting the
        // async index render without awaiting it allowed a fast realtime
        // insert (or a profile-fetch failure) to race the initial paint and
        // leave forum cards duplicated or an unhandled rejection behind.
        this._forumIndexRows = history;
        await this.renderForumIndex(history, viewToken);
      } else {
        await Messages.renderList(this.els.messages, history, () => this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id, "channel");
      }
      if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;

      Messages.subscribeToChannel(channel.id, {
        insert: async (msg) => {
          if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
          try {
            const atBottom = this.isMessagesAtBottom();
            if (ChatPermissions.isForum(channel)) await this.refreshForumView(viewToken, channel.id);
            else await Messages.appendOne(this.els.messages, msg, "channel", () => this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id);
            if (msg.user_id !== this.user?.id) {
              if (atBottom) this.clearActiveUnread();
              else this.queueNewMessage("channel", channel.id);
            }
          } catch (error) {
            console.error("Failed to render live channel message:", error);
          }
        },
        update: async (msg) => {
          if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
          try {
            if (ChatPermissions.isForum(channel)) await this.refreshForumView(viewToken, channel.id);
            else await Messages.applyUpdate(this.els.messages, msg, "channel", () => this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id);
            if (this._contextMode === "actions") this.renderChatActionsPanel();
          } catch (error) { console.error("Failed to render live channel update:", error); }
        },
        delete: async (msg) => {
          if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
          try {
            if (ChatPermissions.isForum(channel)) await this.refreshForumView(viewToken, channel.id);
            else await Messages.applyDelete(this.els.messages, msg, "channel", () => this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id);
          } catch (error) { console.error("Failed to render live channel deletion:", error); }
        }
      });
      if (reactionsReady) {
        Reactions.subscribe("channel", channel.id, (messageId) => {
          if (this._viewToken === viewToken && this.viewMode === "channel" && this.currentChannel?.id === channel.id) Messages.updateReactions(this.els.messages, messageId, "channel");
        });
      }
    } catch (err) {
      console.error("Failed to open channel:", err);
      this.renderChannelLoadError(channel, viewToken);
    }
  },

  updateForumLayoutControl(){
    const toggle = this.els.forumLayoutToggle;
    if (!toggle) return;
    const visible = this.viewMode === "channel"
      && !!this.currentChannel
      && ChatPermissions.isForum(this.currentChannel)
      && !this.forumPostId
      && !this.els.messages.hidden;
    toggle.hidden = !visible;
    if (!visible) return;
    const list = this._forumLayout === "list";
    toggle.setAttribute("aria-label", list ? "Use grid layout" : "Use list layout");
    toggle.title = list ? "Use grid layout" : "Use list layout";
    toggle.setAttribute("aria-pressed", String(list));
    toggle.innerHTML = list
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"></path><circle cx="3" cy="6" r=".8" fill="currentColor" stroke="none"></circle><circle cx="3" cy="12" r=".8" fill="currentColor" stroke="none"></circle><circle cx="3" cy="18" r=".8" fill="currentColor" stroke="none"></circle></svg>';
  },

  async toggleForumLayout(){
    if (this.viewMode !== "channel" || !this.currentChannel || !ChatPermissions.isForum(this.currentChannel) || this.forumPostId) return;
    this._forumLayout = this._forumLayout === "list" ? "grid" : "list";
    try { localStorage.setItem("blur-forum-layout", this._forumLayout); } catch { /* optional preference */ }
    this.updateForumLayoutControl();
    const rows = this._forumIndexRows;
    if (Array.isArray(rows)) await this.renderForumIndex(rows, this._viewToken);
    else await this.refreshForumView(this._viewToken, this.currentChannel.id);
  },

  async refreshForumView(expectedToken = this._viewToken, expectedChannelId = this.currentChannel?.id){
    if (!this.currentChannel || !ChatPermissions.isForum(this.currentChannel)
        || expectedToken !== this._viewToken || this.currentChannel.id !== expectedChannelId) return;
    const viewToken = expectedToken;
    try {
      if (this.forumPostId) {
        await this.openForumPost(this.forumPostId, viewToken, expectedChannelId);
        return;
      }
      const rows = await Messages.loadInitial(expectedChannelId, { forum: true });
      this._forumIndexRows = rows;
      await this.renderForumIndex(rows, viewToken);
    } catch (error) {
      console.error("Failed to refresh forum:", error);
      if (viewToken === this._viewToken && this.viewMode === "channel" && this.currentChannel?.id === expectedChannelId && ChatPermissions.isForum(this.currentChannel)) {
        this.els.messages.innerHTML = '<div class="ui-error">Couldn’t refresh forum posts. Check your connection and try again.</div>';
      }
    }
  },

  async renderForumIndex(messages, viewToken = this._viewToken){
    // Only titled root messages are forum cards. A reply whose parent was
    // removed must never be promoted into a brand-new forum post.
    const rows = Array.isArray(messages) ? messages : [];
    const posts = [...new Map(rows
      .filter(msg => msg?.id && !msg.reply_to_id && String(msg.forum_title || "").trim())
      .map(msg => [String(msg.id), msg])).values()];
    const renderToken = ++this._forumRenderToken;
    const isCurrent = () => renderToken === this._forumRenderToken
      && viewToken === this._viewToken
      && this.viewMode === "channel"
      && !this.forumPostId
      && ChatPermissions.isForum(this.currentChannel);
    this.els.messages.classList.add("forum-index");
    await Profiles.prefetch(posts.map(post => post.user_id));
    if (!isCurrent()) return;
    const cards = await Promise.all(posts.map(async post => {
      let author = null;
      try { author = Profiles.cache.get(post.user_id) || await Profiles.getById(post.user_id); } catch (error) { console.warn("Forum author profile unavailable:", error?.message || error); }
      const canDelete = Permissions.canDeleteMessage(this.profile, author, this.user?.id, post);
      const canPinForum = Permissions.canManageForumPins(this.profile);
      const controls = (canPinForum || canDelete)
        ? `<span class="forum-card-actions">${canPinForum ? `<button type="button" data-forum-pin="${post.is_pinned ? "unpin" : "pin"}" data-forum-post-action="${post.id}">${post.is_pinned ? "Unpin" : "Pin"}</button>` : ""}${canDelete ? `<button type="button" data-forum-delete="${post.id}" data-forum-post-action="${post.id}">Delete</button>` : ""}</span>` : "";
      const title = String(post.forum_title || "Untitled post");
      const body = Messages.plainText(post.content);
      const authorName = author?.display_name || author?.username || "Unknown";
      return `<article class="forum-card ${post.is_pinned ? "is-pinned" : ""}" role="button" tabindex="0" data-forum-post="${post.id}">
        <span class="forum-card-top"><span class="forum-card-pin">${post.is_pinned ? "Pinned" : "Discussion"}</span>${controls}</span>
        <strong class="forum-card-title">${escapeHtml(title)}</strong>
        <span class="forum-card-body">${escapeHtml(truncateText(body, 150))}</span>
        <span class="forum-card-meta"><span>${escapeHtml(authorName)}</span><span>${escapeHtml(new Date(post.created_at).toLocaleDateString())}</span></span>
      </article>`;
    }));
    if (!isCurrent()) return;
    this._forumIndexRows = rows;
    const layoutClass = this._forumLayout === "list" ? "forum-list" : "forum-grid";
    this.els.messages.innerHTML = `<div class="${layoutClass}">${cards.join("")}</div>`;
    this.updateForumLayoutControl();
    this.els.messages.querySelectorAll("[data-forum-post]").forEach(card => card.addEventListener("keydown", e => {
      // Action buttons inside a forum card have their own keyboard behavior;
      // do not also open the thread when Enter/Space bubbles to the card.
      if (e.target !== card) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.openForumPost(card.dataset.forumPost); }
    }));
  },

  async openForumPost(postId, expectedToken = this._viewToken, expectedChannelId = this.currentChannel?.id){
    if (!this.currentChannel || !ChatPermissions.isForum(this.currentChannel)
        || !postId || expectedToken !== this._viewToken || this.currentChannel.id !== expectedChannelId) return;
    const token = expectedToken;
    this.forumPostId = postId;
    const forumRenderToken = ++this._forumRenderToken;
    this._forumIndexRows = null;
    this.updateForumLayoutControl();
    this.els.forumTitle.hidden = true;
    this.els.forumTitle.value = "";
    this.els.forumBack.hidden = false;
    this.els.messages.classList.remove("forum-index");
    this.els.messages.innerHTML = this.messageLoadingMarkup("Loading post…");
    let thread;
    try {
      thread = await Messages.loadForumThread(expectedChannelId, postId);
    } catch (error) {
      console.error("Failed to load forum post:", error);
      if (this._viewToken === token && forumRenderToken === this._forumRenderToken) this.els.messages.innerHTML = '<div class="ui-error">Couldn’t load this forum post. Check your connection and try again.</div>';
      return;
    }
    const post = thread[0];
    if (!post || this._viewToken !== token || this.currentChannel?.id !== expectedChannelId || forumRenderToken !== this._forumRenderToken) {
      if (this._viewToken === token) this.els.messages.innerHTML = '<div class="ui-empty">That forum post is no longer available.</div>';
      return;
    }
    this.els.topbarName.textContent = post.forum_title || "Forum post";
    // Forum roots must always anchor the thread. The forum index query is
    // intentionally newest-first, but rendering that order directly puts
    // newer replies above the title/root message. Keep the root first, then
    // show replies in normal chronological order.
    await Messages.renderList(this.els.messages, thread, () => this._viewToken === token && forumRenderToken === this._forumRenderToken && this.forumPostId === postId, "channel");
  },

  /** Error state when a channel's history/reactions fail to load. */
  renderChannelLoadError(channel, viewToken = this._viewToken) {
    if (this._viewToken !== viewToken || this.viewMode !== "channel" || this.currentChannel?.id !== channel.id) return;
    const grid = this.els.messages;
    grid.innerHTML = `
      <div class="ui-error chat-load-error">
        <span>Couldn't load messages for #${escapeHtml(chatChannelDisplayName(channel))}. Check your connection.</span>
        <button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-channel="${channel.id}">Retry</button>
      </div>
    `;
    grid.querySelector('[data-retry-channel]').addEventListener('click', () => {
      grid.innerHTML = this.messageLoadingMarkup();
      this.openChannel(channel);
    });
  },

  /** Opens (creating if needed) a DM conversation with a friend and shows it in the main column. */
  async openDM(otherUserId){
    if (!otherUserId) return;
    this.setLocalTyping(false);
    this.closeAlertsOverlay();
    const viewToken = (this._viewToken || 0) + 1;
    this._viewToken = viewToken;
    this.showMessagesView();
    this.closeReactionPicker();
    this.closeAttachmentMenu();
    this.closeOnlinePopover();
    this.clearPendingAttachment();
    this.closeMediaLightbox();
    this.closeMentionPopover();
    this.closeContextPanel();
    Profiles.closePopup?.(this.els.overlay);
    this.clearReplyTarget();
    Messages.unsubscribe();
    Reactions.unsubscribe();
    Moderation.unsubscribeLogs();

    this.viewMode = "dm";
    this.currentChannel = null;
    this.forumPostId = null;
    this._forumIndexRows = null;
    this._forumRenderToken++;
    // A forum thread/index uses special message markup and styling. Clear it
    // before entering a DM so the previous forum view cannot bleed through
    // while the conversation is loading.
    this.els.messages.classList.remove("forum-index");
    this.els.forumTitle.value = "";
    this._history = { scope: "dm", id: null, oldestAt: null, hasMore: false, loading: false };
    this.resetNewMessages();
    this.setChannelComposerState(null);
    this.updateForumLayoutControl();
    this.els.messages.innerHTML = this.messageLoadingMarkup();

    const groupRow = DirectMessages._rows.find(row => row.is_group && row.id === otherUserId);
    let conv;
    try {
      conv = groupRow || await DirectMessages.getOrCreateConversation(otherUserId);
    } catch (error) {
      console.error("Failed to open DM:", error);
      if (this._viewToken === viewToken && this.viewMode === "dm") {
        this.els.messages.innerHTML = '<div class="ui-error chat-load-error"><span>Couldn’t open this conversation. Check your connection and try again.</span><button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-dm-open>Retry</button></div>';
        this.els.messages.querySelector("[data-retry-dm-open]")?.addEventListener("click", () => this.openDM(otherUserId));
      }
      return;
    }
    if (this._viewToken !== viewToken) return;
    this.currentDM = conv;
    this._history.id = conv.id;
    if (typeof Unread !== "undefined") Unread.clear("dm", conv.id);
    DirectMessages.activeId = conv.id;
    Mentions.clear("dm", conv.id);
    let other = null;
    if (!conv.is_group) {
      try { other = conv._otherProfile || await Profiles.getById(otherUserId); }
      catch (error) { console.warn("DM participant profile unavailable:", error?.message || error); }
    }

    if (this._sidebarTab !== "friends") this._setSidebarTabUI("friends");
    else {
      this.renderDMLists();
      this.updateMentionIndicators();
    }
    DirectMessages.setActive(conv.is_group ? this.els.groupList : this.els.dmList, conv.id);

    this.els.forumBack.hidden = true;
    this.setTopbarIcon(conv.is_group ? "group" : "dm", other, conv.is_group ? "◎" : "");
    this.els.topbarName.textContent = conv.is_group ? (conv.name || "Group chat") : (other?.display_name || other?.username || "Unknown");
    this.els.topbarName.title = conv.is_group ? (conv.bio || "Group chat") : "";
    this.els.pinsToggle.hidden = false;
    if (this.els.topbarTopic) { this.els.topbarTopic.textContent = conv.is_group ? (conv.bio || "Group conversation") : (other?.status_message || ""); this.els.topbarTopic.hidden = !this.els.topbarTopic.textContent; }
    this.els.groupMembers.hidden = !conv.is_group;
    this.els.groupMembers.innerHTML = conv.is_group
      ? (conv._members || []).map(member => {
          const name = member?.display_name || member?.username || "Member";
          const avatar = Profiles.safeImageUrl(member?.avatar_url, member?.username || "member");
          return `<span class="chat-group-member" title="${escapeHtml(name)}"><img src="${escapeAttr(Profiles.safeImageUrl(avatar, member?.username || "member"))}" alt=""><span>${escapeHtml(name)}</span></span>`;
        }).join("")
      : "";
    this.els.input.placeholder = conv.is_group ? `Message ${conv.name || "group chat"}` : `Message @${other?.username || ""}`;
    this.setDMComposerState(conv);

    const history = await DirectMessages.loadInitial(conv.id).catch(err => {
      console.error("Failed to load DM history:", err);
      return null;
    });

    // DM reactions live in their own mirror table — if the messaging
    // migration hasn't been applied yet, DMs still work (minus reactions)
    // instead of breaking the conversation.
    let dmReactionsReady = false;
    try {
      await Reactions.load("dm", conv.id, () => this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id);
      dmReactionsReady = true;
    } catch (err) {
      console.warn("DM reactions need chat/supabase-messaging-migration.sql — continuing without them.", err.message);
    }

    if (history === null) {
      if (this._viewToken !== viewToken) return;
      this.els.messages.innerHTML = `
        <div class="ui-error chat-load-error">
          <span>Couldn't load this conversation. Check your connection.</span>
          <button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-dm="${conv.id}">Retry</button>
        </div>
      `;
      this.els.messages.querySelector('[data-retry-dm]').addEventListener('click', () => {
        this.els.messages.innerHTML = this.messageLoadingMarkup();
        this.openDM(otherUserId);
      });
      return;
    }

    this._history.oldestAt = history[0]?.created_at || null;
    this._history.hasMore = history.length >= DirectMessages.PAGE_SIZE;

    await DirectMessages.renderList(this.els.messages, history, () => this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id);
    if (this._viewToken !== viewToken || this.viewMode !== "dm" || this.currentDM?.id !== conv.id) return;
    DirectMessages.markRead(conv.id);
    this.updateDMBadge();

    if (dmReactionsReady) {
      Reactions.subscribe("dm", conv.id, (messageId) => {
        if (this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id) Messages.updateReactions(this.els.messages, messageId, "dm");
      });
    }

    DirectMessages.subscribeToConversation(conv.id, {
      insert: async (msg) => {
        if (this._viewToken !== viewToken || this.viewMode !== "dm" || this.currentDM?.id !== conv.id) return;
        try {
          const atBottom = this.isMessagesAtBottom();
          await DirectMessages.appendOne(this.els.messages, msg, () => this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id);
          if (msg.sender_id !== this.user.id) {
            if (atBottom) this.clearActiveUnread();
            else this.queueNewMessage("dm", conv.id);
            this.updateDMBadge();
          }
        } catch (error) {
          console.error("Failed to render live DM message:", error);
        }
      },
      update: async (msg) => {
        if (this._viewToken !== viewToken || this.viewMode !== "dm" || this.currentDM?.id !== conv.id) return;
        try { await Messages.applyUpdate(this.els.messages, msg, "dm", () => this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id); }
        catch (error) { console.error("Failed to render live DM update:", error); }
      },
      delete: async (msg) => {
        if (this._viewToken !== viewToken || this.viewMode !== "dm" || this.currentDM?.id !== conv.id) return;
        try { await Messages.applyDelete(this.els.messages, msg, "dm", () => this._viewToken === viewToken && this.viewMode === "dm" && this.currentDM?.id === conv.id); }
        catch (error) { console.error("Failed to render live DM deletion:", error); }
      }
    });
  },

  /** Swaps the main column into the Friends tab (All / Requests / Add Friend). */
  showFriendsView(tab = "all"){
    this.setLocalTyping(false);
    this._viewToken = (this._viewToken || 0) + 1;
    // Friends is a navigation view, not an open message scope. Clearing the
    // previous DM mode prevents stale group actions/reply targets from being
    // interpreted against a conversation that is no longer visible.
    this.viewMode = "channel";
    this.resetNewMessages();
    this.closeReactionPicker();
    this.closeOnlinePopover();
    this.closeMentionPopover();
    this.closeContextPanel();
    Profiles.closePopup?.(this.els.overlay);
    this.clearReplyTarget();
    this.clearPendingAttachment();
    Messages.unsubscribe();
    Reactions.unsubscribe();
    DirectMessages.unsubscribeConversation();
    Moderation.unsubscribeLogs();
    this.currentDM = null;
    this.currentChannel = null;
    DirectMessages.activeId = null;
    this.els.app.classList.remove("dm-no-longer-friends");
    if (this.els.dmRestriction) {
      this.els.dmRestriction.hidden = true;
      this.els.dmRestriction.textContent = "";
    }
    this.forumPostId = null;
    this._forumIndexRows = null;
    this._forumRenderToken++;
    // Friends/DMs are not message views. Remove any forum-only markup and
    // state left by the previously selected forum channel or thread.
    this.els.messages.classList.remove("forum-index");
    this.els.messages.innerHTML = "";
    this.els.forumTitle.value = "";

    this.els.forumBack.hidden = true;
    this.updateForumLayoutControl();
    this.setTopbarIcon("friends");
    this.els.topbarName.textContent = "Friends";
    this.els.topbarName.title = "";
    this.els.pinsToggle.hidden = false;
    if (this.els.topbarTopic) { this.els.topbarTopic.textContent = "Your people on Blur"; this.els.topbarTopic.hidden = false; }
    this.els.groupMembers.hidden = true;
    this.els.groupMembers.innerHTML = "";
    this.els.friendsTabs.hidden = false;

    this.els.messages.hidden = true;
    this.updateForumLayoutControl();
    this.els.replyPreview.hidden = true;
    this.els.composer.hidden = true;
    this.els.friendsView.hidden = false;

    this._friendsTab = tab;
    this.renderFriendsTabs();
    if (tab === "group-create") this.renderGroupCreate().catch(error => console.error("Group create view failed:", error));
    else {
      const viewToken = this._viewToken;
      Friends.renderBody(this.els.friendsView, tab, () => this._viewToken === viewToken && this._sidebarTab === "friends" && !this.els.friendsView.hidden && this._friendsTab === tab).catch(error => console.error("Friends view failed:", error));
    }
  },

  async renderGroupCreate(){
    const renderToken = (this._groupCreateToken || 0) + 1;
    this._groupCreateToken = renderToken;
    const viewToken = this._viewToken;
    let friends;
    try {
      friends = await Friends._withProfiles(Friends.friends());
    } catch (error) {
      console.error("Group friend list failed:", error);
      if (renderToken === this._groupCreateToken && viewToken === this._viewToken && this._friendsTab === "group-create" && !this.els.friendsView.hidden) this.els.friendsView.innerHTML = '<div class="ui-error">Couldn’t load your friends right now. Try again.</div>';
      return;
    }
    if (renderToken !== this._groupCreateToken || viewToken !== this._viewToken || this._sidebarTab !== "friends" || this._friendsTab !== "group-create" || this.els.friendsView.hidden) return;
    this.els.messages.hidden = true; this.els.replyPreview.hidden = true; this.els.composer.hidden = true; this.els.friendsView.hidden = false;
    this.setTopbarIcon("friends"); this.els.topbarName.textContent = "Create group chat"; this.els.groupMembers.hidden = true;
    this.els.friendsView.innerHTML = `<form class="group-create-form"><div class="group-create-heading"><span>GROUP CHAT</span><h2>Create a group</h2></div><div class="group-create-fields"><label><span>Group name</span><input class="ui-input" name="name" maxlength="60" required placeholder="e.g. Movie night"></label><label><span>About <small>Optional</small></span><textarea class="ui-textarea" name="bio" maxlength="160" rows="2" placeholder="A short description"></textarea></label></div><div class="group-create-members"><div class="group-member-label">Members</div><input class="group-member-search ui-input" type="search" placeholder="Search friends…" autocomplete="off"><div class="group-selected-list" aria-live="polite"></div><div class="group-member-list">${friends.map(({other}) => `<label class="group-member-option" data-member-name="${escapeHtml(`${other.display_name || ""} ${other.username || ""}`.toLowerCase())}"><input type="checkbox" name="member" value="${other.id}"><img src="${escapeAttr(Profiles.safeImageUrl(other.avatar_url, other.username || "?"))}" alt=""><span><strong>${escapeHtml(other.display_name || other.username)}</strong><small>@${escapeHtml(other.username || "")}</small></span></label>`).join("") || `<div class="friends-empty">No friends yet.</div>`}</div></div><div class="group-create-footer"><button class="friend-row-action friend-row-message ui-button ui-button--primary" type="submit">Create group</button></div><div class="friends-empty" data-group-error hidden></div></form>`;
    const form = this.els.friendsView.querySelector("form");
    const search = form?.querySelector(".group-member-search");
    const selectedList = form?.querySelector(".group-selected-list");
    const options = [...(form?.querySelectorAll(".group-member-option") || [])];
    const searchHint = document.createElement("div");
    searchHint.className = "group-member-search-hint";
    form?.querySelector(".group-member-list")?.after(searchHint);
    const syncMembers = () => {
      const selected = options.filter(option => option.querySelector("input")?.checked);
      options.forEach(option => {
        const query = search?.value.trim().toLowerCase() || "";
        option.hidden = !query || !option.dataset.memberName.includes(query);
        option.classList.toggle("selected", !!option.querySelector("input")?.checked);
      });
      const query = search?.value.trim() || "";
      const visible = options.some(option => !option.hidden);
      searchHint.hidden = !!query && visible;
      searchHint.textContent = query ? "No matching friends." : "Search for a friend to add.";
      if (selectedList) selectedList.innerHTML = selected.map(option => `<span class="group-selected-chip">${escapeHtml(option.querySelector("strong")?.textContent || "Member")}<button type="button" aria-label="Remove ${escapeHtml(option.querySelector("strong")?.textContent || "member")}">×</button></span>`).join("");
      selectedList?.querySelectorAll("button").forEach((button, index) => button.addEventListener("click", () => { selected[index]?.querySelector("input").click(); syncMembers(); }));
    };
    search?.addEventListener("input", syncMembers);
    options.forEach(option => option.querySelector("input")?.addEventListener("change", syncMembers));
    syncMembers();
    let creating = false;
    form?.addEventListener("submit", async e => {
      e.preventDefault();
      if (creating) return;
      creating = true;
      const submit = form.querySelector("[type=submit]");
      if (submit) { submit.disabled = true; submit.textContent = "Creating…"; }
      const fd = new FormData(form);
      const ids = fd.getAll("member");
      const error = form.querySelector("[data-group-error]");
      try {
        const group = await DirectMessages.createGroup(fd.get("name"), fd.get("bio"), ids);
        // Creating a group is allowed to finish in the background, but do
        // not pull the user back into it if they navigated away while the
        // membership rows were being written.
        if (renderToken !== this._groupCreateToken || viewToken !== this._viewToken || this._sidebarTab !== "friends" || this._friendsTab !== "group-create" || this.els.friendsView.hidden) return;
        this._setSidebarTabUI("friends");
        this.renderDMLists();
        await this.openDM(group.id);
      } catch (err) {
        creating = false;
        if (submit) { submit.disabled = false; submit.textContent = "Create group"; }
        error.hidden = false;
        error.textContent = err.message || "Could not create group chat.";
      }
    });
  },

  async openGroupSettings(){
    const group = this.currentDM;
    if (!group?.is_group) return;
    if (group.created_by !== this.user?.id) {
      this.showSendFeedback("Only the group creator can edit group settings.");
      return;
    }
    const context = { token: this._viewToken, scope: "dm", scopeId: group.id };
    const overlay = this.els.overlay;
    Profiles.closePopup?.(overlay);
    overlay.innerHTML = `<div class="modal-backdrop group-modal-backdrop ui-overlay is-open" data-group-modal-cancel><section class="modal-card group-settings-card ui-dialog" role="dialog" aria-modal="true" aria-labelledby="group-settings-title"><button type="button" class="acct-modal-close" data-group-modal-cancel aria-label="Close">&times;</button><h2 id="group-settings-title">Group settings</h2><p class="modal-sub">Update the name and short description for everyone in this group.</p><form class="group-settings-form"><label>Group name<input name="name" maxlength="60" required value="${escapeAttr(group.name || "Group chat")}"></label><label>Bio<textarea name="bio" maxlength="160" rows="3" placeholder="What is this group about?">${escapeHtml(group.bio || "")}</textarea></label><div class="group-modal-error" data-group-modal-error hidden></div><div class="chat-confirm-actions"><button type="button" class="chat-confirm-cancel" data-group-modal-cancel>Cancel</button><button type="submit" class="chat-confirm-submit">Save changes</button></div></form></section></div>`;
    const close = () => { Profiles.closePopup?.(overlay); };
    overlay.querySelectorAll("[data-group-modal-cancel]").forEach(el => el.addEventListener("click", event => {
      if (el.classList.contains("modal-backdrop") && event.target !== el) return;
      close();
    }));
    overlay.querySelector(".group-settings-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = form.querySelector("[data-group-modal-error]");
      error.hidden = true;
      try {
        const updated = await DirectMessages.updateGroupSettings(
          group.id,
          form.elements.namedItem("name")?.value,
          form.elements.namedItem("bio")?.value
        );
        if (!this.isViewContext(context) || overlay.querySelector(".group-settings-form") !== form) return;
        this.currentDM = updated || group;
        this.els.topbarName.textContent = this.currentDM.name || "Group chat";
        if (this.els.topbarTopic) { this.els.topbarTopic.textContent = this.currentDM.bio || "Group conversation"; this.els.topbarTopic.hidden = false; }
        this.renderDMLists();
        close();
        this.showSendFeedback("Group settings saved.");
      } catch (err) { error.hidden = false; error.textContent = err.message || "Couldn’t save group settings."; }
    });
    overlay.querySelector("input[name=name]")?.focus();
  },

  async openGroupMembers(){
    const group = this.currentDM;
    if (!group?.is_group) return;
    const token = (this._groupModalToken || 0) + 1;
    this._groupModalToken = token;
    const overlay = this.els.overlay;
    Profiles.closePopup?.(overlay);
    overlay.innerHTML = `<div class="modal-backdrop group-modal-backdrop ui-overlay is-open"><section class="modal-card group-members-card ui-dialog" role="dialog" aria-modal="true" aria-labelledby="group-members-title"><button type="button" class="acct-modal-close" data-group-members-close aria-label="Close">&times;</button><h2 id="group-members-title">Group members</h2><p class="modal-sub">Loading members…</p><div class="group-manage-body"><div class="ui-empty">Loading…</div></div></section></div>`;
    let hydrated = group;
    try { hydrated = await DirectMessages.refreshGroupMembers(group.id) || group; } catch { /* keep the cached member list */ }
    if (token !== this._groupModalToken || this.currentDM?.id !== group.id) return;
    const creator = hydrated.created_by === this.user?.id;
    const friends = creator ? await Friends._withProfiles(Friends.friends()) : [];
    if (token !== this._groupModalToken || this.currentDM?.id !== group.id) return;
    const memberIds = new Set((hydrated._members || []).map(member => member?.id));
    const memberRows = (hydrated._members || []).map(member => {
      const name = member?.display_name || member?.username || "Member";
      const avatar = Profiles.safeImageUrl(member?.avatar_url, member?.username || "member");
      const remove = creator && member?.id !== this.user?.id ? `<button type="button" class="group-member-remove" data-remove-group-member="${member.id}">Remove</button>` : "";
      return `<div class="group-manage-member"><img src="${escapeAttr(avatar)}" alt=""><span><strong>${escapeHtml(name)}</strong><small>@${escapeHtml(member?.username || "")}${member?.id === hydrated.created_by ? " · Creator" : ""}</small></span>${remove}</div>`;
    }).join("");
    const addable = friends.filter(({ other }) => other && !memberIds.has(other.id));
    const addSection = creator ? `<div class="group-manage-add"><label class="group-member-label" for="group-member-search-manage">Add someone</label><input id="group-member-search-manage" class="group-member-search ui-input" type="search" placeholder="Search friends…" autocomplete="off"><div class="group-manage-add-list">${addable.map(({ other }) => `<button type="button" class="group-manage-add-row" data-add-group-member="${other.id}" data-member-name="${escapeAttr(`${other.display_name || ""} ${other.username || ""}`.toLowerCase())}"><img src="${escapeAttr(Profiles.safeImageUrl(other.avatar_url, other.username || "member"))}" alt=""><span><strong>${escapeHtml(other.display_name || other.username || "Member")}</strong><small>@${escapeHtml(other.username || "")}</small></span><span class="group-manage-add-icon">+</span></button>`).join("") || `<div class="ui-empty">All of your friends are already in this group.</div>`}</div></div>` : "";
    overlay.querySelector(".modal-sub").textContent = `${(hydrated._members || []).length} member${(hydrated._members || []).length === 1 ? "" : "s"}${creator ? " · You can add or remove people" : ""}`;
    overlay.querySelector(".group-manage-body").innerHTML = `<div class="group-manage-list">${memberRows || `<div class="ui-empty">No members found.</div>`}</div>${addSection}`;
    const close = () => { this._groupModalToken++; Profiles.closePopup?.(overlay); };
    overlay.querySelector("[data-group-members-close]")?.addEventListener("click", close);
    overlay.querySelector(".group-modal-backdrop")?.addEventListener("click", event => { if (event.target === event.currentTarget) close(); });
    overlay.querySelector(".group-member-search")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      overlay.querySelectorAll("[data-add-group-member]").forEach(row => { row.hidden = !!query && !row.dataset.memberName.includes(query); });
    });
    overlay.querySelectorAll("[data-add-group-member]").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      try { await DirectMessages.addGroupMember(hydrated.id, button.dataset.addGroupMember); await this.openGroupMembers(); }
      catch (err) { button.disabled = false; this.showSendFeedback(err.message || "Couldn’t add that member."); }
    }));
    overlay.querySelectorAll("[data-remove-group-member]").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      try { await DirectMessages.removeGroupMember(hydrated.id, button.dataset.removeGroupMember); await this.openGroupMembers(); }
      catch (err) { button.disabled = false; this.showSendFeedback(err.message || "Couldn’t remove that member."); }
    }));
  },

  /** Restores the shared messages/composer view used by both channels and DMs. */
  showMessagesView(){
    this.els.friendsTabs.hidden = true;
    this.els.messages.hidden = false;
    this.els.composer.hidden = false;
    this.els.friendsView.hidden = true;
    this.updateScrollControls();
  },

  // Body-level menus/lightboxes are intentionally outside the Chat panel so
  // they can escape overflow clipping. Close them when the global SPA moves
  // to another tab; otherwise a reaction/menu overlay can linger over the
  // next page and intercept clicks.
  closeTransientUI(){
    this.closeReactionPicker();
    this.closeAttachmentMenu();
    this.closeMediaLightbox();
    this.closeOnlinePopover();
    this.closeMentionPopover();
    this.closeMessageMenu();
    this.closeContextPanel();
    Profiles.closePopup?.(this.els.overlay);
  },

  closeContextPanel(){
    this._contextToken++;
    this._contextMode = null;
    if (this.els.contextPanel) { this.els.contextPanel.hidden = true; this.els.contextPanel.innerHTML = ""; }
  },

  positionContextPanel(anchorEl){
    const panel = this.els.contextPanel;
    if (!panel || panel.hidden || !anchorEl) return;
    const anchor = anchorEl.getBoundingClientRect();
    const size = panel.getBoundingClientRect();
    let left = anchor.left - size.width - 8;
    if (left < 8) left = anchor.right + 8;
    let top = anchor.bottom + 8;
    if (top + size.height > window.innerHeight - 8) top = anchor.top - size.height - 8;
    panel.style.left = `${Math.max(8, left)}px`;
    panel.style.right = "auto";
    panel.style.top = `${Math.max(8, top)}px`;
  },

  toggleContextPanel(mode){
    if (!this.els.contextPanel) return;
    if (this._contextMode === mode && !this.els.contextPanel.hidden) { this.closeContextPanel(); return; }
    this.closeOnlinePopover();
    const contextToken = ++this._contextToken;
    this._contextMode = mode;
    this.els.contextPanel.classList.toggle("chat-actions-panel", mode === "actions");
    this.els.contextPanel.classList.toggle("chat-pins-panel", mode === "pins");
    this.els.contextPanel.hidden = false;
    const render = mode === "actions" ? this.renderChatActionsPanel(contextToken) : this.renderPinsPanel(contextToken);
    render?.catch?.(error => {
      console.error("Chat context panel failed:", error);
      if (contextToken === this._contextToken && this.els.contextPanel && !this.els.contextPanel.hidden) this.els.contextPanel.innerHTML = '<div class="ui-error">Chat actions are unavailable right now.</div>';
    });
  },

  async leaveCurrentGroup(){
    if (!this.currentDM?.is_group) return;
    const context = { token: this._viewToken, scope: "dm", scopeId: this.currentDM.id };
    const confirmed = await this.confirmDialog("Leave group chat?", "You’ll leave this conversation and won’t receive new messages unless someone adds you again.", "Leave group");
    if (!confirmed || !this.isViewContext(context)) return;
    try {
      await DirectMessages.leaveGroup(context.scopeId);
      if (this.currentDM?.id === context.scopeId) this.showFriendsView("all");
    } catch (err) {
      console.error("Leave group failed:", err);
      this.showSendFeedback("Couldn’t leave this group right now.");
    }
  },

  async deleteCurrentGroup(){
    if (!this.currentDM?.is_group || this.currentDM.created_by !== this.user?.id) return;
    const context = { token: this._viewToken, scope: "dm", scopeId: this.currentDM.id };
    const confirmed = await this.confirmDialog("Delete group chat?", "This permanently removes the group and its messages for everyone.", "Delete group", true);
    if (!confirmed || !this.isViewContext(context)) return;
    try {
      await DirectMessages.deleteGroup(context.scopeId);
      if (this.currentDM?.id === context.scopeId) this.showFriendsView("all");
    } catch (err) {
      console.error("Delete group failed:", err);
      this.showSendFeedback("Couldn’t delete this group right now.");
    }
  },

  async renderChatActionsPanel(contextToken = this._contextToken){
    const panel = this.els.contextPanel;
    if (!panel) return;
    if (contextToken !== this._contextToken || this._contextMode !== "actions" || panel.hidden) return;
    const users = Presence.list().filter(user => user.id !== this.user?.id);
    const group = this.viewMode === "dm" && this.currentDM?.is_group ? this.currentDM : null;
    const groupTools = group ? `<section class="chat-actions-section chat-group-tools"><div class="chat-actions-section-head"><span>Group chat</span><span>${(group._members || []).length} members</span></div><div class="chat-actions-group-list">${this.user?.id === group.created_by ? `<button type="button" class="chat-context-action" data-group-action="settings"><span>Group settings</span><small>Edit name and bio</small></button>` : ""}<button type="button" class="chat-context-action" data-group-action="members"><span>${this.user?.id === group.created_by ? "Manage members" : "View members"}</span><small>${this.user?.id === group.created_by ? "Add or remove people" : "See who is here"}</small></button><button type="button" class="chat-context-action chat-context-action-muted" data-group-action="leave"><span>Leave group</span><small>Remove this conversation from your DMs</small></button>${this.user?.id === group.created_by ? `<button type="button" class="chat-context-action chat-context-action-danger" data-group-action="delete"><span>Delete group</span><small>Permanently remove it for everyone</small></button>` : ""}</div></section>` : "";
    panel.innerHTML = `<div class="chat-context-head"><div><span class="chat-context-kicker">CONVERSATION</span><strong>Chat actions</strong></div><button type="button" class="chat-context-close" aria-label="Close"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button></div>${groupTools}<section class="chat-actions-section chat-actions-online-section"><div class="chat-actions-section-head"><span>People online</span><span>${users.length}</span></div><div class="chat-actions-online">${users.length ? users.map(u => `<button type="button" class="chat-actions-person" data-online-user="${u.id}"><img src="${escapeAttr(Profiles.safeImageUrl(u.avatar_url, u.username || "?"))}" alt=""><span>${escapeHtml(u.display_name || u.username || "Unknown")}</span><i></i></button>`).join("") : '<div class="online-popover-empty">No one else is online</div>'}</div></section><section class="chat-actions-section chat-actions-pins"><div class="chat-actions-section-head"><span>Pinned messages</span><span class="chat-actions-pin-count">…</span></div><div class="chat-actions-pin-list"><div class="ui-empty">Loading…</div></div></section>`;
    panel.querySelectorAll(".chat-actions-person[data-online-user]").forEach(row => {
      const user = users.find(item => item.id === row.dataset.onlineUser);
      const name = row.querySelector("span");
      if (!user || !name || !user.activity) return;
      name.className = "chat-actions-person-copy";
      name.innerHTML = `<span class="chat-actions-person-name">${escapeHtml(user.display_name || user.username || "Unknown")}</span>${presenceActivityMarkup(user.activity)}`;
      row.title = formatPresenceActivity(user.activity);
    });
    panel.querySelector(".chat-context-close")?.addEventListener("click", () => this.closeContextPanel());
    panel.querySelectorAll("[data-online-user]").forEach(row => row.addEventListener("click", () => { const id = row.dataset.onlineUser; this.closeContextPanel(); Profiles.renderProfilePopup(this.els.overlay, id, { isSelf: id === this.user?.id }).catch(error => console.error("Profile popup failed:", error)); }));
    panel.querySelector('[data-group-action="settings"]')?.addEventListener("click", () => { this.closeContextPanel(); this.openGroupSettings(); });
    panel.querySelector('[data-group-action="members"]')?.addEventListener("click", () => { this.closeContextPanel(); this.openGroupMembers(); });
    panel.querySelector('[data-group-action="leave"]')?.addEventListener("click", () => { this.closeContextPanel(); this.leaveCurrentGroup(); });
    panel.querySelector('[data-group-action="delete"]')?.addEventListener("click", () => { this.closeContextPanel(); this.deleteCurrentGroup(); });
    const pinList = panel.querySelector(".chat-actions-pin-list");
    if (this._sidebarTab !== "channels" || this.viewMode !== "channel" || !this.currentChannel || this.currentChannel.is_log) { pinList.innerHTML = '<div class="ui-empty">Pins are available in shared channels.</div>'; panel.querySelector(".chat-actions-pin-count").textContent = "—"; this.positionContextPanel(this.els.pinsToggle); return; }
    try {
      const { data, error } = await sb.from("messages").select("*").eq("channel_id", this.currentChannel.id).eq("is_pinned", true).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      if (contextToken !== this._contextToken || this._contextMode !== "actions" || panel.hidden) return;
      panel.querySelector(".chat-actions-pin-count").textContent = String(data?.length || 0);
      if (!data?.length) pinList.innerHTML = '<div class="ui-empty">No pinned messages yet.</div>';
      else {
        if (contextToken !== this._contextToken || this._contextMode !== "actions" || panel.hidden) return;
        await Profiles.prefetch(data.map(row => row.user_id));
        if (contextToken !== this._contextToken || this._contextMode !== "actions" || panel.hidden) return;
        const html = await Promise.all(data.map(async row => {
          let p = null;
          try { p = Profiles.cache.get(row.user_id) || await Profiles.getById(row.user_id); } catch (error) { console.warn("Pinned message profile unavailable:", error?.message || error); }
          return `<button type="button" class="chat-pin-result" data-pin-jump="${row.id}"><strong>${escapeHtml(p?.display_name || p?.username || "Unknown")}</strong><span>${escapeHtml(truncateForPreview(Messages.plainText(row.content), 150))}</span><time>${new Date(row.created_at).toLocaleString()}</time></button>`;
        }));
        if (contextToken !== this._contextToken || this._contextMode !== "actions" || panel.hidden) return;
        pinList.innerHTML = html.join("");
        pinList.querySelectorAll("[data-pin-jump]").forEach(btn => btn.addEventListener("click", () => { this.closeContextPanel(); this.jumpToMessage(btn.dataset.pinJump); }));
      }
    } catch (err) {
      console.error("Chat actions pins failed", err);
      if (contextToken === this._contextToken && this._contextMode === "actions" && !panel.hidden) pinList.innerHTML = '<div class="ui-error">Pins are unavailable right now.</div>';
    }
    if (contextToken === this._contextToken && this._contextMode === "actions" && !panel.hidden) this.positionContextPanel(this.els.pinsToggle);
  },

  async renderPinsPanel(contextToken = this._contextToken){
    const panel = this.els.contextPanel;
    if (!panel || contextToken !== this._contextToken || this._contextMode !== "pins" || panel.hidden) return;
    panel.innerHTML = '<div class="chat-context-head"><div><span class="chat-context-kicker">SAVED HERE</span><strong>Pinned messages</strong></div><button type="button" class="chat-context-close" aria-label="Close">×</button></div><div class="chat-pins-list"><div class="ui-empty">Loading…</div></div>';
    this.positionContextPanel(this.els.pinsToggle);
    panel.querySelector(".chat-context-close")?.addEventListener("click", () => this.closeContextPanel());
    const list = panel.querySelector(".chat-pins-list");
    if (this._sidebarTab !== "channels" || this.viewMode !== "channel" || !this.currentChannel || this.currentChannel.is_log) { list.innerHTML = '<div class="ui-empty">Pins are available in shared channels.</div>'; return; }
    try {
      const { data, error } = await sb.from("messages").select("*").eq("channel_id", this.currentChannel.id).eq("is_pinned", true).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      if (contextToken !== this._contextToken || this._contextMode !== "pins" || panel.hidden) return;
      if (!data?.length) { list.innerHTML = '<div class="ui-empty">No pinned messages yet.</div>'; return; }
      if (contextToken !== this._contextToken || this._contextMode !== "pins" || panel.hidden) return;
      await Profiles.prefetch(data.map(row => row.user_id));
      if (contextToken !== this._contextToken || this._contextMode !== "pins" || panel.hidden) return;
      const html = await Promise.all(data.map(async row => {
        let p = null;
        try { p = Profiles.cache.get(row.user_id) || await Profiles.getById(row.user_id); } catch (error) { console.warn("Pinned message profile unavailable:", error?.message || error); }
        return '<button type="button" class="chat-pin-result" data-pin-jump="' + row.id + '"><strong>' + escapeHtml(p?.display_name || p?.username || "Unknown") + '</strong><span>' + escapeHtml(truncateForPreview(Messages.plainText(row.content), 150)) + '</span><time>' + new Date(row.created_at).toLocaleString() + '</time></button>';
      }));
      if (contextToken !== this._contextToken || this._contextMode !== "pins" || panel.hidden) return;
      list.innerHTML = html.join("");
      list.querySelectorAll("[data-pin-jump]").forEach(btn => btn.addEventListener("click", () => { this.closeContextPanel(); this.jumpToMessage(btn.dataset.pinJump); }));
    } catch (err) {
      console.error("Pinned messages failed", err);
      if (contextToken === this._contextToken && this._contextMode === "pins" && !panel.hidden) list.innerHTML = '<div class="ui-error">Pins are unavailable right now.</div>';
    }
  },

  closeAlertsOverlay(){
    if (!this.els.alertsOverlay) return;
    this.els.alertsOverlay.hidden = true;
    this.els.alertsOverlay.innerHTML = "";
    this.els.alertsToggle?.classList.remove("active");
    this._viewToken = (this._viewToken || 0) + 1;
  },

  // Alerts can be shown as a full view for legacy callers or as a workspace
  // overlay from the account bar without disrupting the open conversation.
  async showMentionsView(options = {}){
    const asOverlay = options.overlay === true;
    this._viewToken = (this._viewToken || 0) + 1;
    const viewToken = this._viewToken;
    this.els.alertsToggle?.classList.add("active");
    // Alerts is also outside a conversation. Drop the previous channel/DM
    // references so the header actions cannot resurrect group controls or
    // target a hidden conversation.
    if (!asOverlay) {
      this.viewMode = "channel";
      this.currentChannel = null;
      this.currentDM = null;
      DirectMessages.activeId = null;
      this.resetNewMessages();
      Messages.unsubscribe(); Reactions.unsubscribe(); DirectMessages.unsubscribeConversation(); Moderation.unsubscribeLogs();
      this.closeContextPanel();
      Profiles.closePopup?.(this.els.overlay);
      this.forumPostId = null;
      this.els.forumBack.hidden = true;
      this.els.friendsTabs.hidden = true; this.els.messages.hidden = true; this.els.replyPreview.hidden = true; this.els.composer.hidden = true; this.els.friendsView.hidden = false;
      this.setTopbarIcon("alerts"); this.els.topbarName.textContent = "Alerts"; this.els.topbarName.title = "";
      this.els.pinsToggle.hidden = false;
      this.els.groupMembers.hidden = true;
      this.els.groupMembers.innerHTML = "";
      this.clearPendingAttachment();
      if (this.els.topbarTopic) { this.els.topbarTopic.textContent = "Recent mention pings from your conversations"; this.els.topbarTopic.hidden = false; }
    }
    const target = asOverlay ? this.els.alertsOverlay : this.els.friendsView;
    if (!target) return;
    target.hidden = false;
    target.innerHTML = '<section class="chat-mentions-view chat-alerts-view"><div class="chat-view-intro"><div><span class="chat-context-kicker">YOUR INBOX</span><h2>Alerts</h2><p>Direct mentions and valid @everyone pings only.</p></div><div class="chat-alerts-view-actions"><button type="button" class="chat-alerts-clear" data-clear-alerts>Clear alerts</button>' + (asOverlay ? '<button type="button" class="chat-alerts-close" data-close-alerts aria-label="Close alerts" title="Close alerts">×</button>' : '') + '</div></div><div class="chat-mentions-list"><div class="ui-empty">Loading alerts…</div></div></section>';
    const list = target.querySelector(".chat-mentions-list");
    target.querySelector("[data-close-alerts]")?.addEventListener("click", () => this.closeAlertsOverlay());
    const alertStorageKey = `blur-chat-alerts-cleared-${this.user.id}`;
    const clearButton = target.querySelector("[data-clear-alerts]");
    clearButton?.addEventListener("click", () => {
      clearButton.disabled = true;
      Mentions.clearAll();
      try { sessionStorage.setItem(alertStorageKey, new Date().toISOString()); } catch { /* optional cache */ }
      list.innerHTML = '<div class="ui-empty">Alerts cleared.</div>';
    });
    try {
      const ids = (Channels.list || []).filter(c => !c.is_log).map(c => c.id);
      const token = "<@" + this.user.id + ">";
      let clearedAt = "";
      try { clearedAt = sessionStorage.getItem(alertStorageKey) || ""; } catch { /* optional cache */ }
      const clearedMs = Date.parse(clearedAt);
      const cutoff = new Date(Math.max(Date.now() - 30 * 86400000, Number.isFinite(clearedMs) ? clearedMs : 0)).toISOString();
      const conversations = DirectMessages._rows || [];
      const channelQuery = ids.length
        ? sb.from("messages").select("*").in("channel_id", ids).or("content.ilike.%" + token + "%,content.ilike.%@everyone%").gt("created_at", cutoff).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [], error: null });
      const dmQuery = conversations.length
        ? sb.from("dm_messages").select("*").in("conversation_id", conversations.map(row => row.id)).ilike("content", `%${token}%`).gt("created_at", cutoff).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [], error: null });
      const [channelResult, dmResult] = await Promise.all([channelQuery, dmQuery]);
      if (this._viewToken !== viewToken) return;
      if (channelResult.error) throw channelResult.error;
      if (dmResult.error) throw dmResult.error;
      const everyoneRoleCache = new Map();
      const channelRows = (await Promise.all((channelResult.data || []).map(async row => {
        if (this._viewToken !== viewToken || row.user_id === this.user.id || row.is_ai === true) return null;
        const content = String(row.content);
        const direct = content.includes(token);
        const everyone = /(?<![a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])/i.test(content);
        let everyoneAllowed = false;
        if (everyone) {
          if (!everyoneRoleCache.has(row.user_id)) everyoneRoleCache.set(row.user_id, ChatPermissions.canUseEveryoneId(row.user_id));
          everyoneAllowed = await everyoneRoleCache.get(row.user_id);
        }
        return direct || everyoneAllowed ? { ...row, _alertScope: "channel", _alertId: row.channel_id } : null;
      }))).filter(Boolean);
      const dmRows = (dmResult.data || []).filter(row => row.sender_id !== this.user.id).map(row => ({ ...row, user_id: row.sender_id, _alertScope: "dm", _alertId: row.conversation_id }));
      const rows = [...channelRows, ...dmRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
      if (this._viewToken !== viewToken) return;
        if (!rows.length) { list.innerHTML = '<div class="ui-empty">No recent alerts.</div>'; return; }
      await Profiles.prefetch(rows.map(row => row.user_id));
      if (this._viewToken !== viewToken) return;
      const html = await Promise.all(rows.map(async row => {
        if (row.is_ai === true) return null;
        let p = null;
        try { p = Profiles.cache.get(row.user_id) || await Profiles.getById(row.user_id); } catch (error) { console.warn("Alert profile unavailable:", error?.message || error); }
        const channel = row._alertScope === "channel" ? Channels.list.find(c => String(c.id) === String(row.channel_id)) : null;
        const conversation = row._alertScope === "dm" ? conversations.find(c => String(c.id) === String(row.conversation_id)) : null;
        const destination = channel ? `#${chatChannelDisplayName(channel)}` : conversation?.is_group ? (conversation.name || "Group chat") : `@${conversation?._otherProfile?.username || "DM"}`;
        return `<button type="button" class="chat-mention-result" data-alert-scope="${row._alertScope}" data-alert-id="${escapeAttr(row._alertId)}" data-alert-message="${escapeAttr(row.id)}"><span class="chat-mention-result-top"><strong>${escapeHtml(p?.display_name || p?.username || "Unknown")}</strong><span>${escapeHtml(destination)}</span><time>${new Date(row.created_at).toLocaleString()}</time></span><span>${escapeHtml(truncateForPreview(Messages.plainText(row.content), 180))}</span></button>`;
      }));
      if (this._viewToken !== viewToken) return;
        list.innerHTML = html.filter(Boolean).join("") || '<div class="ui-empty">No recent alerts.</div>';
      list.querySelectorAll("[data-alert-scope]").forEach(btn => btn.addEventListener("click", async () => {
        try {
          if (btn.dataset.alertScope === "channel") {
            const channel = Channels.list.find(c => String(c.id) === String(btn.dataset.alertId));
            if (channel) { await this.openChannel(channel); this.jumpToMessage(btn.dataset.alertMessage); }
          } else {
            const conversation = conversations.find(c => String(c.id) === String(btn.dataset.alertId));
            if (conversation) { await this.openDM(conversation.is_group ? conversation.id : DirectMessages.otherId(conversation)); this.jumpToMessage(btn.dataset.alertMessage); }
          }
        } catch (error) {
          console.error("Could not open alert destination:", error);
          this.showSendFeedback("Couldn’t open that conversation right now.");
        }
      }));
    } catch (err) {
      console.error("Alerts view failed", err);
      if (this._viewToken === viewToken) list.innerHTML = '<div class="ui-error">Alerts are unavailable right now.</div>';
    }
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
    const unreadDM = typeof Unread !== "undefined" && DirectMessages._rows.some(row => Unread.has("dm", row.id));
    this.els.dmUnreadDot.hidden = !(DirectMessages.hasUnread() || unreadDM);
  },

  isStaff(){
    return ChatPermissions.isStaff(this.user, this.profile);
  },

  setChannelComposerState(channel){
    this.els.app.classList.remove("dm-no-longer-friends");
    if (this.els.dmRestriction) {
      this.els.dmRestriction.hidden = true;
      this.els.dmRestriction.textContent = "";
    }
    if (this.els.forumTitle) this.els.forumTitle.hidden = !ChatPermissions.isForum(channel) || !!this.replyTarget;
    const readonly = !!channel && !Permissions.canPostChannel(this.profile, channel);
    this.els.composer.classList.toggle("announcement-readonly", readonly);
    this.els.app.classList.toggle("announcement-readonly", readonly);
    if (Permissions.canBypassMessageLimit(this.profile)) {
      this.els.input.removeAttribute("maxlength");
    } else {
      this.els.input.maxLength = 500;
    }
    this.els.input.disabled = readonly;
    if (this.els.attachToggle) this.els.attachToggle.disabled = readonly;
    const submit = this.els.composer.querySelector('button[type="submit"]');
    if (submit) submit.disabled = readonly;
    if (readonly) {
      this.els.input.placeholder = channel?.is_log ? "Moderation logs are read-only." : (ChatPermissions.isAnnouncement(channel) ? "Only Owners and Community Managers can post announcements." : "This staff channel is read-only for your role.");
    } else if (channel) {
      this.els.input.placeholder = `Message #${chatChannelDisplayName(channel)}`;
    }
    this.updateForumLayoutControl();
  },

  /** Disable one-to-one DM sending as soon as the friendship is removed. */
  setDMComposerState(conversation){
    const otherId = conversation && !conversation.is_group ? DirectMessages.otherId(conversation) : null;
    const restricted = Boolean(otherId && Friends.relation(otherId).status !== "friends");
    this.els.composer.classList.toggle("announcement-readonly", restricted);
    this.els.app.classList.toggle("dm-no-longer-friends", restricted);
    this.els.input.disabled = restricted;
    if (this.els.attachToggle) this.els.attachToggle.disabled = restricted;
    const submit = this.els.composer.querySelector('button[type="submit"]');
    if (submit) submit.disabled = restricted;
    if (this.els.dmRestriction) {
      this.els.dmRestriction.hidden = !restricted;
      this.els.dmRestriction.textContent = restricted ? "You are no longer friends with this user." : "";
    }
    if (restricted) {
      this.els.input.placeholder = "You are no longer friends with this user.";
      this.closeMentionPopover();
      this.closeAttachmentMenu();
      this.clearPendingAttachment();
      this.clearReplyTarget();
    } else if (conversation) {
      this.els.input.placeholder = conversation.is_group
        ? `Message ${conversation.name || "group chat"}`
        : this.els.input.placeholder;
    }
    return !restricted;
  },

  syncDMFriendshipState(){
    if (this.viewMode !== "dm" || !this.currentDM || this.currentDM.is_group) {
      if (this.viewMode !== "dm") {
        this.els.app.classList.remove("dm-no-longer-friends");
        if (this.els.dmRestriction) {
          this.els.dmRestriction.hidden = true;
          this.els.dmRestriction.textContent = "";
        }
      }
      return true;
    }
    return this.setDMComposerState(this.currentDM);
  },

  /**
   * Mention/ping dots: the Chat nav item in the main sidebar, each
   * channel in the channel list, and each DM conversation. Mentions
   * remain the danger-colored ping state; Unread adds a quieter
   * read-state highlight without replacing the existing dots.
   */
  updateMentionIndicators(){
    const navDot = document.getElementById("chat-nav-mention");
    if (navDot) navDot.hidden = Mentions.count() === 0 && (typeof Unread === "undefined" || Unread.count() === 0);
    const alertCount = Mentions.count();
    const badge = this.els.mentionsBadge;
    if (badge) {
      badge.hidden = alertCount === 0;
      badge.textContent = alertCount > 9 ? "9+" : alertCount;
    }

    this.els.channelList?.querySelectorAll(".channel-item").forEach(btn => {
      btn.classList.toggle("has-mention", Mentions.has("channel", btn.dataset.id));
      btn.classList.toggle("has-unread", typeof Unread !== "undefined" && Unread.has("channel", btn.dataset.id));
    });
    this.els.staffChannelList?.querySelectorAll(".channel-item").forEach(btn => {
      btn.classList.toggle("has-mention", Mentions.has("channel", btn.dataset.id));
      btn.classList.toggle("has-unread", typeof Unread !== "undefined" && Unread.has("channel", btn.dataset.id));
    });
    this.els.dmList?.querySelectorAll(".dm-item").forEach(btn => {
      btn.classList.toggle("has-mention", Mentions.has("dm", btn.dataset.dmConversation));
      const row = DirectMessages._rows.find(item => item.id === btn.dataset.dmConversation);
      btn.classList.toggle("has-unread", !!row && ((typeof Unread !== "undefined" && Unread.has("dm", row.id)) || DirectMessages.isUnread(row)));
    });
    this.els.groupList?.querySelectorAll(".dm-item").forEach(btn => {
      btn.classList.toggle("has-mention", Mentions.has("dm", btn.dataset.dmConversation));
      const row = DirectMessages._rows.find(item => item.id === btn.dataset.dmConversation);
      btn.classList.toggle("has-unread", !!row && ((typeof Unread !== "undefined" && Unread.has("dm", row.id)) || DirectMessages.isUnread(row)));
    });
    if (this._sidebarTab === "friends" && !this.els.dmList.hidden) this.renderDMLists();
  },

  async refreshVisibleMessageCensoring(){
    if (this.viewMode !== "channel" && this.viewMode !== "dm") return;
    const viewToken = this._viewToken;
    const scope = this.viewMode === "dm" ? "dm" : "channel";
    const rows = [...this.els.messages.querySelectorAll(".message-row[data-message-id]")];
    await Promise.all(rows.map(async row => {
      if (viewToken !== this._viewToken) return;
      const cached = Messages.getCached(row.dataset.messageId, scope);
      const text = row.querySelector(".message-text");
      if (!cached || !text || text.querySelector(".message-edit-input")) return;
      text.replaceChildren();
      const authorId = scope === "dm" ? cached.message?.sender_id : cached.message?.user_id;
      const everyoneAllowed = scope === "channel"
        && /(?<![a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])/i.test(String(cached.content))
        && await ChatPermissions.canUseEveryoneId(authorId);
      await Messages.renderContent(text, cached.content, { allowEveryone: everyoneAllowed });
      if (viewToken !== this._viewToken) return;
      const quote = row.querySelector(".reply-quote-text");
      const reply = cached.replyPreview;
      if (quote && reply) quote.textContent = truncateText(Messages.censorText(Messages.plainText(reply.content)), 100);
    }));
  },

  /** Keeps the sidebar "N online" pill in sync with Presence, and refreshes the popover list if it's open. */
  updateOnlineIndicator(){
    if (!this.els.onlineCount) return;
    this.els.onlineCount.textContent = Presence.count();
    if (this._onlinePopover) this.renderOnlinePopoverList();
    if (this._contextMode === "actions" && this.els.contextPanel && !this.els.contextPanel.hidden) {
      const token = ++this._contextToken;
      this.renderChatActionsPanel(token).catch(error => console.error("Chat actions refresh failed:", error));
    }
  },

  toggleOnlinePopover(){
    if (this._onlinePopover) this.closeOnlinePopover();
    else this.openOnlinePopover();
  },

  /** Compact popover beside the online indicator listing everyone currently online. */
  openOnlinePopover(){
    this.closeReactionPicker();
    this.closeContextPanel();
    const anchor = this.els.onlineIndicator;
    const rect = anchor.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.className = "online-popover ui-menu";
    pop.style.top = `${rect.bottom + 6}px`;
    pop.style.left = `${rect.left}px`;
    document.body.appendChild(pop);
    this._onlinePopover = pop;
    this.renderOnlinePopoverList();
    const popRect = pop.getBoundingClientRect();
    let left = rect.left - popRect.width - 8;
    if (left < 8) left = rect.right + 8;
    let top = rect.bottom + 6;
    if (top + popRect.height > window.innerHeight - 8) top = rect.top - popRect.height - 6;
    pop.style.left = `${Math.max(8, left)}px`;
    pop.style.top = `${Math.max(8, top)}px`;
    pop.addEventListener("click", (e) => {
      const row = e.target.closest("[data-online-user]");
      if (!row) return;
      const userId = row.dataset.onlineUser;
      this.closeOnlinePopover();
      Profiles.renderProfilePopup(this.els.overlay, userId, { isSelf: userId === this.user?.id }).catch(error => console.error("Profile popup failed:", error));
    });
    const listenerToken = ++this._onlineListenerToken;
    setTimeout(() => {
      if (listenerToken !== this._onlineListenerToken || this._onlinePopover !== pop) return;
      this._outsideOnlineListener = (ev) => {
        if (!pop.contains(ev.target) && !anchor.contains(ev.target)) this.closeOnlinePopover();
      };
      document.addEventListener("click", this._outsideOnlineListener);
    }, 0);
  },

  renderOnlinePopoverList(){
    if (!this._onlinePopover) return;
    const users = Presence.list().filter(user => user.id !== this.user?.id);
    if (!users.length) {
      this._onlinePopover.innerHTML = `<div class="online-popover-head ui-menu__header"><span>Online now</span><span>0</span></div><div class="online-popover-empty">No one else is online</div>`;
      return;
    }
    this._onlinePopover.innerHTML = `<div class="online-popover-head ui-menu__header"><span>Online now</span><span>${users.length}</span></div>` + users.map(u => `
      <div class="online-popover-row ui-menu__item" data-online-user="${u.id}">
        <img class="online-popover-avatar" src="${escapeAttr(Profiles.safeImageUrl(u.avatar_url, u.username || "?"))}" alt="">
        <span class="online-popover-name">${escapeHtml(u.display_name || u.username || "Unknown")}</span>
      </div>
    `).join("");
    this._onlinePopover.querySelectorAll(".online-popover-row").forEach(row => {
      const user = users.find(item => item.id === row.dataset.onlineUser);
      const name = row.querySelector(".online-popover-name");
      if (!user || !name || !user.activity) return;
      const copy = document.createElement("span");
      copy.className = "online-popover-copy";
      name.replaceWith(copy);
      copy.appendChild(name);
      copy.insertAdjacentHTML("beforeend", presenceActivityMarkup(user.activity, "online-popover-activity"));
      row.title = formatPresenceActivity(user.activity);
    });
  },

  closeOnlinePopover(){
    this._onlineListenerToken++;
    if (this._onlinePopover) { this._onlinePopover.remove(); this._onlinePopover = null; }
    if (this._outsideOnlineListener) {
      document.removeEventListener("click", this._outsideOnlineListener);
      this._outsideOnlineListener = null;
    }
  },

  attachmentMenuPosition(){
    const menu = this.els.attachMenu;
    const anchor = this.els.attachToggle;
    if (!menu || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    let top = rect.top - menuRect.height - 8;
    if (top < 8) top = rect.bottom + 8;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  },

  renderAttachmentMenu(){
    const menu = this.els.attachMenu;
    if (!menu) return;
    menu.classList.remove("is-gif-picker");
    menu.innerHTML = `
      <div class="message-more-title ui-menu__header">Add to message</div>
      <button type="button" class="ui-menu__item" data-attachment-action="upload">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
        <span>Upload a file</span>
      </button>
      <button type="button" class="ui-menu__item" data-attachment-action="gif">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h3v4H7zM13 10h4M13 14h3"/></svg>
        <span>Search GIFs</span>
      </button>
      <button type="button" class="ui-menu__item" data-attachment-action="emoji">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M8.7 9.5h.1M15.2 9.5h.1"/></svg>
        <span>Add emoji</span>
      </button>
    `;
  },

  toggleAttachmentMenu(){
    const menu = this.els.attachMenu;
    if (!menu || this.els.attachToggle?.disabled) return;
    if (!menu.hidden) { this.closeAttachmentMenu(); return; }
    this.closeReactionPicker();
    this.closeMessageMenu();
    this.renderAttachmentMenu();
    menu.hidden = false;
    this.attachmentMenuPosition();
    const listenerToken = ++this._attachmentListenerToken;
    setTimeout(() => {
      if (listenerToken !== this._attachmentListenerToken || menu.hidden) return;
      this._attachmentOutside = (event) => {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        if (!menu.contains(event.target) && !path.includes(menu) && !this.els.attachToggle.contains(event.target)) this.closeAttachmentMenu();
      };
      document.addEventListener("click", this._attachmentOutside);
    }, 0);
  },

  closeAttachmentMenu(){
    this._attachmentListenerToken++;
    if (this.els.attachMenu) {
      this.els.attachMenu.hidden = true;
      this.els.attachMenu.classList.remove("is-gif-picker");
      this.els.attachMenu.innerHTML = "";
    }
    if (this._attachmentOutside) {
      document.removeEventListener("click", this._attachmentOutside);
      this._attachmentOutside = null;
    }
    clearTimeout(this._gifSearchTimer);
  },

  async handleAttachmentMenuClick(event){
    const action = event.target.closest("[data-attachment-action]")?.dataset.attachmentAction;
    if (action === "upload") {
      this.closeAttachmentMenu();
      this.els.fileInput?.click();
    } else if (action === "gif") {
      await this.renderGifPicker();
    } else if (action === "emoji") {
      this.closeAttachmentMenu();
      this.openReactionPicker(this.els.attachToggle, null, {
        mode: "composer",
        onPick: (emoji) => this.insertComposerEmoji(emoji)
      });
    } else if (event.target.closest("[data-attachment-back]")) {
      this.renderAttachmentMenu();
      this.attachmentMenuPosition();
    } else {
      const result = event.target.closest("[data-gif-index]");
      if (result) this.selectGif(Number(result.dataset.gifIndex));
      if (event.target.closest("[data-remove-pending]")) this.clearPendingAttachment();
    }
  },

  insertComposerEmoji(emoji){
    const input = this.els.input;
    if (!input || !emoji) return;
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    input.setRangeText(emoji, start, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  },

  async renderGifPicker(query = ""){
    const menu = this.els.attachMenu;
    if (!menu) return;
    this.closeMessageMenu();
    menu.hidden = false;
    menu.classList.add("is-gif-picker");
    menu.innerHTML = `
      <div class="chat-gif-search-head">
        <div class="chat-gif-title">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h3v4H7zM13 10h4M13 14h3"/></svg>
          <strong>GIFs</strong>
        </div>
        <button type="button" data-attachment-back aria-label="Back to attachment options" title="Back to attachment options">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
        </button>
      </div>
      <div class="reaction-picker-search chat-gif-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
        <input class="chat-gif-input" type="search" placeholder="Search GIFs" value="${escapeHtml(query)}" aria-label="Search GIFs" autocomplete="off">
      </div>
      <div class="chat-gif-grid"><div class="ui-empty">Loading GIFs…</div></div>
    `;
    this.attachmentMenuPosition();
    const input = menu.querySelector(".chat-gif-input");
    input?.addEventListener("input", () => {
      clearTimeout(this._gifSearchTimer);
      this._gifSearchTimer = setTimeout(() => this.loadGifResults(input.value), 300);
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); this.closeAttachmentMenu(); }
      if (event.key === "Enter") { event.preventDefault(); this.loadGifResults(input.value); }
    });
    input?.focus();
    await this.loadGifResults(query);
  },

  async loadGifResults(query = ""){
    const menu = this.els.attachMenu;
    const grid = menu?.querySelector(".chat-gif-grid");
    if (!grid) return;
    const token = (this._gifQueryToken || 0) + 1;
    this._gifQueryToken = token;
    grid.innerHTML = `<div class="ui-empty">Loading GIFs…</div>`;
    try {
      const results = await ChatAttachments.searchGifs(query);
      if (this._gifQueryToken !== token || !menu.querySelector(".chat-gif-grid")) return;
      this._gifResults = results;
      grid.replaceChildren();
      if (!results.length) {
        grid.innerHTML = `<div class="ui-empty">No GIFs found.</div>`;
      } else {
        results.forEach((gif, index) => {
          const src = ChatAttachments.safeUrl(gif.preview_url || gif.url);
          const full = ChatAttachments.safeUrl(gif.url || gif.preview_url);
          if (!src || !full) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "chat-gif-result";
          button.dataset.gifIndex = String(index);
          button.title = gif.title || "GIF";
          const image = document.createElement("img");
          image.src = src; image.alt = gif.title || "GIF"; image.loading = "lazy";
          button.appendChild(image); grid.appendChild(button);
        });
      }
      this.attachmentMenuPosition();
    } catch (error) {
      if (this._gifQueryToken !== token) return;
      grid.innerHTML = `<div class="ui-error">GIF search is unavailable right now.</div>`;
    }
  },

  selectGif(index){
    const gif = this._gifResults?.[index];
    const url = ChatAttachments.safeUrl(gif?.url || gif?.preview_url);
    if (!url) return;
    this.closeAttachmentMenu();
    this._pendingAttachment = {
      url,
      name: gif?.title || "GIF",
      type: "image/gif",
      size: 0
    };
    this.renderPendingAttachment();
    this.els.input.focus();
  },

  async uploadAttachment(file){
    if (!file || !this.user || (this.viewMode === "channel" && !Permissions.canPostChannel(this.profile, this.currentChannel))) {
      this.showSendFeedback("You can’t upload files in this conversation.");
      return;
    }
    try {
      this.showSendFeedback("Uploading file…");
      this._pendingAttachment = await ChatAttachments.upload(file, this.user.id);
      this.renderPendingAttachment();
      this.els.input.focus();
      this.showSendFeedback("File ready to send.");
    } catch (error) {
      console.error("File upload failed:", error);
      this.showSendFeedback(error?.message || "Couldn’t upload that file.");
    }
  },

  renderPendingAttachment(){
    const wrap = this.els.pendingAttachment;
    const attachment = this._pendingAttachment;
    if (!wrap) return;
    if (!attachment) { wrap.hidden = true; wrap.innerHTML = ""; return; }
    wrap.hidden = false;
    wrap.innerHTML = `
      <div class="chat-pending-attachment-info">
        ${attachment.url ? `<img class="chat-pending-attachment-thumb" alt="">` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/></svg>`}
        <span><strong></strong><small></small></span>
      </div>
      <button type="button" data-remove-attachment aria-label="Remove attachment">×</button>
    `;
    if (attachment.url) {
      const thumb = wrap.querySelector(".chat-pending-attachment-thumb");
      thumb.src = attachment.url;
    }
    wrap.querySelector("strong").textContent = attachment.name;
    wrap.querySelector("small").textContent = attachment.url ? "GIF · ready to send" : `${ChatAttachments.formatSize(attachment.size)} · ready to send`;
  },

  clearPendingAttachment(){
    this._pendingAttachment = null;
    this.renderPendingAttachment();
  },

  openMediaLightbox(url, name = "Attachment", type = ""){
    const safe = ChatAttachments.safeUrl(url);
    if (!safe) return;
    this.closeMediaLightbox();
    const modal = document.createElement("div");
    modal.className = "chat-media-lightbox ui-overlay is-open";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", `Preview ${name}`);
    modal.innerHTML = `
      <div class="chat-media-lightbox-card ui-dialog ui-dialog--wide">
        <div class="chat-media-lightbox-stage"></div>
        <div class="chat-media-lightbox-media-controls" data-media-controls hidden aria-label="Media controls">
          <button type="button" data-media-play aria-label="Play" title="Play">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>
          </button>
          <input type="range" data-media-progress min="0" max="100" value="0" step="0.1" aria-label="Seek">
          <span class="chat-media-lightbox-media-time" data-media-time>0:00 / 0:00</span>
          <button type="button" data-media-mute aria-label="Mute" title="Mute">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4ZM17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10"/></svg>
          </button>
          <input type="range" class="chat-media-lightbox-volume" data-media-volume min="0" max="1" value="1" step="0.05" aria-label="Volume">
        </div>
        <div class="chat-media-lightbox-actions" aria-label="Preview controls">
          <button type="button" data-lightbox-zoom-out aria-label="Zoom out" title="Zoom out">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M6.8 10.5h7.4M15.5 15.5 21 21"/></svg>
          </button>
          <button type="button" data-lightbox-zoom-in aria-label="Zoom in" title="Zoom in">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M6.8 10.5h7.4M10.5 6.8v7.4M15.5 15.5 21 21"/></svg>
          </button>
          <button type="button" data-lightbox-zoom-reset aria-label="Reset zoom" title="Reset zoom">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8a7.5 7.5 0 1 1 1.2 8.6"/><path d="M5 4v4h4"/></svg>
          </button>
          <span class="chat-media-lightbox-zoom" data-lightbox-zoom-level aria-live="polite">100%</span>
          <a data-lightbox-download download aria-label="Download" title="Download">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>
          </a>
          <a data-lightbox-open target="_blank" rel="noopener noreferrer" aria-label="Open original" title="Open original">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>
          </a>
          <button type="button" data-lightbox-close aria-label="Close preview" title="Close preview">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._mediaLightbox = modal;
    const stage = modal.querySelector(".chat-media-lightbox-stage");
    const lowerType = String(type).toLowerCase();
    const mediaSource = `${name} ${safe}`;
    const isVideo = lowerType.startsWith("video/") || /\.(?:mp4|webm|mov|m4v|ogv|avi|mkv)(?:[?#]|$)/i.test(mediaSource);
    const isAudio = lowerType.startsWith("audio/") || /\.(?:mp3|ogg|oga|wav|m4a|aac|flac|opus)(?:[?#]|$)/i.test(mediaSource);
    if (isVideo) {
      const video = document.createElement("video"); video.src = safe; video.controls = false; video.autoplay = true; video.playsInline = true; video.preload = "metadata"; stage.appendChild(video);
    } else if (isAudio) {
      const audio = document.createElement("audio"); audio.src = safe; audio.controls = false; audio.autoplay = true; audio.preload = "metadata"; stage.appendChild(audio);
    } else if (lowerType.startsWith("image/") || ChatAttachments.isGifUrl(safe) || /\.(?:png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)/i.test(safe)) {
      const image = document.createElement("img"); image.src = safe; image.alt = name; stage.appendChild(image);
    } else {
      stage.innerHTML = `<div class="chat-media-lightbox-file"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/></svg><strong></strong><small>File preview unavailable</small></div>`;
      stage.querySelector("strong").textContent = name;
    }
    const zoomTarget = stage.querySelector("img");
    const mediaTarget = stage.querySelector("video, audio");
    const zoomLabel = modal.querySelector("[data-lightbox-zoom-level]");
    let zoom = 1;
    const applyZoom = () => {
      if (zoomTarget) {
        zoomTarget.style.transform = `scale(${zoom})`;
        zoomTarget.style.transformOrigin = "center center";
      }
      zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    };
    modal.querySelector("[data-lightbox-zoom-in]")?.addEventListener("click", () => {
      zoom = Math.min(3, +(zoom + 0.25).toFixed(2));
      applyZoom();
    });
    modal.querySelector("[data-lightbox-zoom-out]")?.addEventListener("click", () => {
      zoom = Math.max(0.25, +(zoom - 0.25).toFixed(2));
      applyZoom();
    });
    modal.querySelector("[data-lightbox-zoom-reset]")?.addEventListener("click", () => {
      zoom = 1;
      applyZoom();
    });
    if (!zoomTarget) {
      modal.querySelectorAll("[data-lightbox-zoom-in], [data-lightbox-zoom-out], [data-lightbox-zoom-reset]")
        .forEach(button => { button.disabled = true; });
    }
    if (mediaTarget) {
      const mediaControls = modal.querySelector("[data-media-controls]");
      const play = modal.querySelector("[data-media-play]");
      const mute = modal.querySelector("[data-media-mute]");
      const progress = modal.querySelector("[data-media-progress]");
      const volume = modal.querySelector("[data-media-volume]");
      const timeLabel = modal.querySelector("[data-media-time]");
      const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
      };
      const syncMedia = () => {
        const duration = Number.isFinite(mediaTarget.duration) ? mediaTarget.duration : 0;
        progress.value = duration ? String((mediaTarget.currentTime / duration) * 100) : "0";
        timeLabel.textContent = `${formatTime(mediaTarget.currentTime)} / ${formatTime(duration)}`;
        play.innerHTML = mediaTarget.paused
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>';
        play.setAttribute("aria-label", mediaTarget.paused ? "Play" : "Pause");
        play.title = mediaTarget.paused ? "Play" : "Pause";
        mute.setAttribute("aria-label", mediaTarget.muted ? "Unmute" : "Mute");
        mute.title = mediaTarget.muted ? "Unmute" : "Mute";
      };
      mediaControls.hidden = false;
      mediaTarget.volume = 1;
      mediaTarget.addEventListener("loadedmetadata", syncMedia);
      mediaTarget.addEventListener("timeupdate", syncMedia);
      mediaTarget.addEventListener("play", syncMedia);
      mediaTarget.addEventListener("pause", syncMedia);
      mediaTarget.addEventListener("volumechange", syncMedia);
      play.addEventListener("click", () => {
        if (mediaTarget.paused) mediaTarget.play().catch(() => {});
        else mediaTarget.pause();
      });
      mute.addEventListener("click", () => { mediaTarget.muted = !mediaTarget.muted; syncMedia(); });
      progress.addEventListener("input", () => {
        if (Number.isFinite(mediaTarget.duration) && mediaTarget.duration > 0) mediaTarget.currentTime = (Number(progress.value) / 100) * mediaTarget.duration;
      });
      volume.addEventListener("input", () => {
        mediaTarget.volume = Number(volume.value);
        mediaTarget.muted = mediaTarget.volume === 0;
      });
      syncMedia();
      modal.querySelectorAll("[data-lightbox-zoom-in], [data-lightbox-zoom-out], [data-lightbox-zoom-reset], [data-lightbox-zoom-level]")
        .forEach(control => { control.hidden = true; });
    }
    const download = modal.querySelector("[data-lightbox-download]");
    download.href = safe; download.setAttribute("download", name);
    download.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        const response = await fetch(safe);
        if (!response.ok) throw new Error("download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = objectUrl; link.download = name; link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch {
        window.open(safe, "_blank", "noopener,noreferrer");
      }
    });
    const open = modal.querySelector("[data-lightbox-open]");
    open.href = safe;
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-lightbox-close]")) this.closeMediaLightbox();
    });
    this._mediaLightboxKeydown = (event) => { if (event.key === "Escape") this.closeMediaLightbox(); };
    document.addEventListener("keydown", this._mediaLightboxKeydown);
    modal.querySelector("[data-lightbox-close]")?.focus();
  },

  closeMediaLightbox(){
    if (this._mediaLightbox) { this._mediaLightbox.remove(); this._mediaLightbox = null; }
    if (this._mediaLightboxKeydown) { document.removeEventListener("keydown", this._mediaLightboxKeydown); this._mediaLightboxKeydown = null; }
  },

  resetComposerHeight(){
    if (!this.els.input) return;
    // Remove the auto-grow override after a send so the stylesheet's normal
    // composer height is restored. Setting `var(--control-h)` inline here
    // bypassed the chat-specific height and made the bar a few pixels taller
    // after the first message, which shifted the placeholder off-center.
    this.els.input.style.removeProperty("height");
    this.els.input.style.removeProperty("overflow-y");
  },

  canAskAiInChannel(channel = this.currentChannel){
    return !!channel
      && String(channel.visibility || "public").toLowerCase() !== "dm"
      && !channel.is_log;
  },

  extractAiPrompt(value){
    // Require a real standalone @ai token so email-like text and handles
    // such as @airplane remain ordinary chat messages.
    const match = /(^|[^a-zA-Z0-9_])@ai(?![a-zA-Z0-9_])([\s\S]*)/i.exec(String(value || ""));
    const prompt = match?.[2]?.trim() || "";
    return prompt || null;
  },

  /**
   * Reconstruct the reply chain leading to an AI message. Public channels can
   * contain many unrelated conversations, so only the selected reply thread
   * is sent to BlurGPT instead of dumping the whole channel into the prompt.
   */
  async buildAiReplyHistory(messageId){
    const history = [];
    const seen = new Set();
    let currentId = messageId;
    while (currentId && !seen.has(currentId) && history.length < 16) {
      seen.add(currentId);
      let message = Messages.getCached(currentId, "channel")?.message || null;
      if (!message) {
        try {
          const { data } = await sb.from("messages")
            .select("id,content,reply_to_id,is_ai")
            .eq("id", currentId)
            .maybeSingle();
          message = data || null;
        } catch { message = null; }
      }
      if (!message) break;
      const content = String(message.content || "").trim();
      if (content) history.unshift({ role: message.is_ai === true ? "assistant" : "user", content });
      currentId = message.reply_to_id || null;
    }
    return history;
  },

  async sendAiChannelPrompt(raw, pendingAttachment, replyToId, sendContext, postTitle = null, continueAi = false, forumPostId = null){
    const prompt = continueAi
      ? (this.extractAiPrompt(raw) || String(raw || "").trim())
      : this.extractAiPrompt(raw);
    if (!prompt || !window.BlurGPT?.ask) return false;

    const { content } = await Messages.resolveMentions(raw, this._mentionIds);
    const history = continueAi && replyToId ? await this.buildAiReplyHistory(replyToId) : [];
    if (!this.isViewContext(sendContext)) return true;
    const question = await Messages.send(this.currentChannel.id, this.user.id, content, replyToId, { title: postTitle, attachment: pendingAttachment, forumPostId });
    if (this._viewToken === sendContext.token && this.els.input.value === raw) {
      this.els.input.value = "";
      this.resetComposerHeight();
      if (postTitle && this.els.forumTitle) this.els.forumTitle.value = "";
      this.clearReplyTarget();
      if (this._pendingAttachment === pendingAttachment) this.clearPendingAttachment();
    }

    this.showSendFeedback("BlurGPT is thinking…");
    try {
      const result = await window.BlurGPT.ask(prompt, { channel: this.currentChannel.name, history });
      if (!this.isViewContext(sendContext)) return true;
      let answer = String(result?.content || "").trim();
      // Keep AI replies within the database's existing message ceiling while
      // allowing them to be more useful than the 500-character user limit.
      if (answer.length > 1900) answer = `${answer.slice(0, 1897).trimEnd()}…`;
      if (answer) await Messages.send(this.currentChannel.id, this.user.id, answer, question?.id || null, { isAi: true, aiModel: result?.model, forumPostId });
    } catch (error) {
      console.error("BlurGPT Chat reply failed:", error);
      if (this.isViewContext(sendContext)) this.showSendFeedback(error?.message || "BlurGPT couldn’t answer right now.");
    }
    return true;
  },

  async handleSend(e){
    e.preventDefault();
    if (this._sending) return;
    const raw = this.els.input.value;
    const pendingAttachment = this._pendingAttachment;
    if (!raw.trim() && !pendingAttachment) return;
    this.closeMentionPopover();
    this.closeAttachmentMenu();
    this._sending = true;
    const viewToken = this._viewToken;

    if (this.viewMode === "dm") {
      if (!this.currentDM) { this._sending = false; return; }
      if (!this.currentDM.is_group && !this.syncDMFriendshipState()) {
        this.showSendFeedback("You are no longer friends with this user.", "blocked");
        this._sending = false;
        return;
      }
      const conversationId = this.currentDM.id;
      const sendContext = { token: viewToken, scope: "dm", scopeId: conversationId };
      const replyToId = this.replyTarget?.id ?? null;
      try {
        const { content } = await Messages.resolveMentions(raw, this._mentionIds);
        if (!this.isViewContext(sendContext)) { this._sending = false; return; }
        await DirectMessages.send(conversationId, this.user.id, content, replyToId, { attachment: pendingAttachment });
        if (this._viewToken === viewToken && this.els.input.value === raw) {
          this.els.input.value = "";
          this.resetComposerHeight();
          this.clearReplyTarget();
          if (this._pendingAttachment === pendingAttachment) this.clearPendingAttachment();
        }
      } catch (err) {
        console.error("Failed to send DM:", err);
        this.showSendFeedback(this.sendErrorMessage(err));
      } finally { this._sending = false; }
      return;
    }

    if (!this.currentChannel) { this._sending = false; return; }
    const channelId = this.currentChannel.id;
    const sendContext = { token: viewToken, scope: "channel", scopeId: channelId };
    if (!Permissions.canPostChannel(this.profile, this.currentChannel)) {
      this.showSendFeedback("You don’t have permission to post here.");
      this._sending = false;
      return;
    }
    // A forum thread id keeps ordinary comments in the open post without
    // making each comment a visual reply to the root. Only the reply button
    // creates reply_to_id; this also allows replies to replies.
    const forumPostId = ChatPermissions.isForum(this.currentChannel) && this.forumPostId
      ? this.forumPostId : null;
    const insideForumThread = Boolean(forumPostId);
    const replyToId = this.replyTarget?.id ?? null;
    const titleInput = this.els.forumTitle || this.els.composer.querySelector("[name='forum_title']");
    // Once a forum post is open, typing in the composer adds a comment to
    // that thread. It must never inherit a stale title or be promoted to a
    // second forum root just because the user did not press Reply first.
    const title = ChatPermissions.isForum(this.currentChannel) && !replyToId && !insideForumThread
      ? String(titleInput?.value || "").trim() : null;
    const postTitle = insideForumThread
      ? null
      : (title || (ChatPermissions.isForum(this.currentChannel) && !replyToId ? truncateText(raw, 120) : null));
    if (ChatPermissions.isForum(this.currentChannel) && !insideForumThread && !replyToId && !postTitle) {
      this.showSendFeedback("Add a title for your forum post.");
      this._sending = false;
      return;
    }
    const replyingToAi = this.replyTarget?.message?.is_ai === true;
    const aiPrompt = replyingToAi
      ? String(raw || "").trim()
      : (this.canAskAiInChannel(this.currentChannel) ? this.extractAiPrompt(raw) : null);
    const moderation = Messages.inspectOutgoingText([raw, postTitle].filter(Boolean).join(" "), { scope: "channel" });
    if (moderation.blocked) {
      this.rejectBlockedMessage();
      this._sending = false;
      return;
    }
    if (aiPrompt && !pendingAttachment && window.BlurGPT?.ask) {
      try {
        await this.sendAiChannelPrompt(raw, pendingAttachment, replyToId, sendContext, postTitle, replyingToAi, forumPostId);
      } catch (err) {
        console.error("Failed to send BlurGPT prompt:", err);
        this.showSendFeedback(this.sendErrorMessage(err));
      } finally { this._sending = false; }
      return;
    }
    try {
      const { content } = await Messages.resolveMentions(raw, this._mentionIds);
      if (!this.isViewContext(sendContext)) { this._sending = false; return; }
      await Messages.send(channelId, this.user.id, content, replyToId, { title: postTitle, attachment: pendingAttachment, forumPostId });
      if (this._viewToken === viewToken && this.els.input.value === raw) {
        this.els.input.value = "";
        this.resetComposerHeight();
        if (titleInput) titleInput.value = "";
        this.clearReplyTarget();
        if (this._pendingAttachment === pendingAttachment) this.clearPendingAttachment();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      this.showSendFeedback(this.sendErrorMessage(err));
    } finally { this._sending = false; }
  },

  async startMessageEdit(messageId){
    if (this.viewMode !== "channel" && this.viewMode !== "dm") return;
    const scope = this.viewMode === "dm" ? "dm" : "channel";
    const editContext = { token: this._viewToken, scope, scopeId: this.msgScope().scopeId };
    const row = this.els.messages.querySelector(`.message-row[data-message-id="${messageId}"]`);
    const cached = Messages.getCached(messageId, scope);
    if (!row || !cached || cached.userId !== this.user.id) return;
    const text = row.querySelector(".message-text");
    if (!text || text.querySelector(".message-edit-input")) return;
    const input = document.createElement("textarea");
    input.className = "message-edit-input";
    if (Permissions.canBypassMessageLimit(this.profile)) input.removeAttribute("maxlength");
    else input.maxLength = 500;
    input.value = Messages.plainText(cached.content);
    text.replaceChildren(input);
    row.classList.add("message-editing");
    const controls = document.createElement("div");
    controls.className = "message-edit-controls";
    controls.innerHTML = `<button type="button" data-edit-save>Save</button><button type="button" data-edit-cancel>Cancel</button>`;
    text.after(controls);
    input.focus();
    const resizeEditor = () => {
      input.style.height = "auto";
      const nextHeight = Math.min(Math.max(input.scrollHeight, 52), 220);
      input.style.height = `${nextHeight}px`;
      input.style.overflowY = input.scrollHeight > 220 ? "auto" : "hidden";
    };
    input.addEventListener("input", resizeEditor);
    resizeEditor();
    input.setSelectionRange(input.value.length, input.value.length);
    const cancel = () => { controls.remove(); text.replaceChildren(); Messages.renderContent(text, cached.content, { allowEveryone: scope === "channel" && Permissions.canUseEveryone(Chat.profile) }); row.classList.remove("message-editing"); };
    const save = async () => {
      const value = input.value.trim();
      if (!value) { this.showSendFeedback("Message can’t be empty."); return; }
      if (scope === "channel" && Messages.inspectOutgoingText(value, { scope }).blocked) {
        this.rejectBlockedMessage();
        return;
      }
      try {
        const resolved = await Messages.resolveMentions(value, this._mentionIds);
        if (!this.isViewContext(editContext)) { cancel(); return; }
        const updated = await Messages.edit(messageId, this.user.id, resolved.content, scope);
        if (!this.isViewContext(editContext) || !row.isConnected) return;
        controls.remove(); text.replaceChildren(); await Messages.renderContent(text, resolved.content, { allowEveryone: scope === "channel" && Permissions.canUseEveryone(Chat.profile) }); const time = row.querySelector(".message-time"); if (time && updated.edited_at && !time.querySelector(".message-edited")) time.insertAdjacentHTML("beforeend", ` <span class="message-edited">(edited)</span>`); row.classList.remove("message-editing");
      }
      catch (err) { this.showSendFeedback(this.sendErrorMessage(err)); }
    };
    controls.querySelector("[data-edit-save]").addEventListener("click", save);
    controls.querySelector("[data-edit-cancel]").addEventListener("click", cancel);
    input.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); cancel(); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } });
  },

  async deleteMessage(messageId, options = {}){
    if (this.viewMode !== "channel" && this.viewMode !== "dm") return;
    const scope = this.viewMode === "dm" ? "dm" : "channel";
    const context = { token: this._viewToken, scope, scopeId: this.msgScope().scopeId };
    if (!options.skipConfirm) {
      const confirmed = await this.confirmDialog("Delete message?", "This removes the message for everyone in this conversation.", "Delete", true);
      if (!confirmed) return;
    }
    if (!this.isViewContext(context)) return;
    try { await Messages.remove(messageId, this.user.id, scope); }
    catch (err) { this.showSendFeedback(this.sendErrorMessage(err)); }
  },

  async reportMessage(messageId){
    if (this.viewMode !== "channel" || !this.currentChannel || this.currentChannel.is_log) return;
    const context = { token: this._viewToken, scope: "channel", scopeId: this.currentChannel.id };
    const confirmed = await this.confirmDialog("Report message?", "This sends the message to Blur staff for review.", "Report", true);
    if (!confirmed) return;
    if (!this.isViewContext(context)) return;
    try {
      const { data, error } = await sb.rpc("blur_report_message", { p_message_id: messageId });
      if (error) throw error;
      this.showSendFeedback(data?.duplicate ? "You already reported this message." : "Message reported to Blur staff.");
    } catch (err) {
      console.error("Message report failed:", err);
      this.showSendFeedback("Couldn’t report that message right now.");
    }
  },

  async deleteForumPost(postId){
    if (this.viewMode !== "channel" || !ChatPermissions.isForum(this.currentChannel)) return;
    const context = { token: this._viewToken, scope: "channel", scopeId: this.currentChannel.id };
    const confirmed = await this.confirmDialog("Delete forum post?", "This removes the post and its replies for everyone.", "Delete", true);
    if (!confirmed) return;
    if (!this.isViewContext(context)) return;
    try {
      let { error } = await sb.rpc("blur_delete_forum_post", { p_message_id: postId });
      // Keep older installations usable until the forum-delete migration is
      // applied. The fallback is still subject to the existing RLS rules.
      if (error && /function .*blur_delete_forum_post|does not exist|schema cache/i.test(error.message || "")) {
        if (Permissions.canModerate(this.profile)) {
          const { error: repliesError } = await sb.from("messages").delete().eq("reply_to_id", postId);
          if (repliesError) throw repliesError;
        }
        const fallback = await sb.from("messages").delete().eq("id", postId);
        error = fallback.error;
      }
      if (error) throw error;
      this.forumPostId = null;
      await this.refreshForumView();
    } catch (err) {
      console.error("Forum delete failed:", err);
      this.showSendFeedback("Couldn’t delete that forum post.");
    }
  },

  confirmDialog(title, message, confirmLabel = "Confirm", danger = false){
    return new Promise(resolve => {
      const overlay = this.els.overlay;
      const previous = overlay.innerHTML;
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKeydown);
        overlay.innerHTML = previous;
        resolve(value);
      };
      const onKeydown = event => {
        if (event.key === "Escape") finish(false);
      };
      overlay.innerHTML = `<div class="modal-backdrop chat-confirm-backdrop ui-overlay is-open" data-modal-cancel><section class="modal-card chat-confirm-card ui-dialog ui-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="chat-confirm-title"><h2 id="chat-confirm-title">${escapeHtml(title)}</h2><p class="modal-sub">${escapeHtml(message)}</p><div class="chat-confirm-actions"><button type="button" class="chat-confirm-cancel" data-modal-cancel>Cancel</button><button type="button" class="chat-confirm-submit${danger ? " is-danger" : ""}" data-modal-confirm>${escapeHtml(confirmLabel)}</button></div></section></div>`;
      overlay.querySelectorAll("[data-modal-cancel]").forEach(el => el.addEventListener("click", event => {
        if (event.target === el) finish(false);
      }));
      overlay.querySelector("[data-modal-confirm]")?.addEventListener("click", () => finish(true));
      document.addEventListener("keydown", onKeydown);
      overlay.querySelector("[data-modal-confirm]")?.focus();
    });
  },

  sendErrorMessage(err){
    const text = String(err?.message || "");
    if (/500 characters/i.test(text)) return "Messages are limited to 500 characters.";
    return /too quickly|spam/i.test(text) ? "You’re sending messages too quickly. Please wait a moment." : "Couldn’t send that message. Try again.";
  },

  showSendFeedback(message, kind = ""){
    if (!this.els.sendFeedback) return;
    this.els.sendFeedback.textContent = message;
    this.els.sendFeedback.classList.toggle("is-blocked", kind === "blocked");
    this.els.sendFeedback.classList.add("visible");
    clearTimeout(this._feedbackTimer);
    this._feedbackTimer = setTimeout(() => this.els.sendFeedback.classList.remove("visible"), 3200);
  },

  rejectBlockedMessage(){
    const messages = ["Nope.", "Not gonna happen.", "Say something else.", "Did you mean to type that?"];
    const composer = this.els.composer;
    composer?.classList.remove("chat-composer-rejected");
    if (composer) {
      void composer.offsetWidth;
      composer.classList.add("chat-composer-rejected");
      setTimeout(() => composer.classList.remove("chat-composer-rejected"), 460);
    }
    this.showSendFeedback(messages[Math.floor(Math.random() * messages.length)], "blocked");
  },

  maybePromptCensorPreference(){
    const key = "blur-profanity-onboarding-v1";
    try { if (localStorage.getItem(key) === "1") return; } catch {}
    if (document.querySelector(".chat-profanity-onboarding")) return;
    const prompt = document.createElement("div");
    prompt.className = "chat-profanity-onboarding";
    prompt.innerHTML = `<section class="chat-profanity-card" role="dialog" aria-modal="true" aria-labelledby="chat-profanity-title"><div class="chat-profanity-kicker">Chat preference</div><h2 id="chat-profanity-title">How should Blur handle curse words?</h2><p>You can change this anytime in Settings. Public slurs are always blocked, while DMs stay private.</p><div class="chat-profanity-actions"><button type="button" data-profanity-choice="heavy">Censor them</button><button type="button" class="secondary" data-profanity-choice="off">Leave them visible</button></div></section>`;
    document.body.appendChild(prompt);
    const finish = (mode) => {
      try { localStorage.setItem("blur-profanity-filter", mode); localStorage.setItem(key, "1"); } catch {}
      document.dispatchEvent(new CustomEvent("blur-profanity-change", { detail: mode }));
      prompt.remove();
    };
    prompt.querySelectorAll("[data-profanity-choice]").forEach(button => button.addEventListener("click", () => finish(button.dataset.profanityChoice)));
  },

  /** Shows the "Replying to…" bar above the composer for the given message id. */
  setReplyTarget(messageId, scope = "channel"){
    const info = Messages.getCached(messageId, scope);
    this.replyTarget = { id: messageId, ...(info || {}) };

    const name = info?.displayName || "message";
    const snippet = info?.content ? truncateText(Messages.plainText(info.content), 80) : "";

    this.els.replyPreview.hidden = false;
    if (this.els.forumTitle) this.els.forumTitle.hidden = true;
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
    if (this.els.forumTitle) this.els.forumTitle.hidden = !ChatPermissions.isForum(this.currentChannel);
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

  openMessageMenu(anchorEl, messageId){
    this.closeMessageMenu();
    this.closeReactionPicker();
    this.closeAttachmentMenu();
    const scope = anchorEl.dataset.moreScope || this.msgScope().scope;
    const cached = Messages.getCached(messageId, scope);
    if (!cached) return;
    const own = cached.userId === this.user?.id;
    const canEdit = anchorEl.dataset.moreEdit === "1";
    const canDelete = anchorEl.dataset.moreDelete === "1";
    const canPin = anchorEl.dataset.morePin === "1";
    const isPinned = anchorEl.dataset.morePinned === "1";
    const canReport = scope === "channel" && !this.currentChannel?.is_log;
    const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
    const items = [
      `<button type="button" class="ui-menu__item" data-message-menu-action="react">${icon('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.2 2 1.8 3.5 1.8s2.6-.6 3.5-1.8M8.7 9.5h.1M15.2 9.5h.1"/>')}<span>Add reaction</span></button>`,
      `<button type="button" class="ui-menu__item" data-message-menu-action="copy">${icon('<path d="M8 8h11v12H8z"/><path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"/>')}<span>Copy text</span></button>`,
      canEdit ? `<button type="button" class="ui-menu__item" data-message-menu-action="edit">${icon('<path d="M4 16.5V20h3.5L18.8 8.7a2.1 2.1 0 0 0-3-3L4 16.5Z"/><path d="m14.5 7 2.5 2.5"/>')}<span>Edit message</span></button>` : "",
      canDelete ? `<button type="button" class="ui-menu__item ui-menu__item--danger is-danger" data-message-menu-action="delete">${icon('<path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-8 0 .7 13h4.6L15 7"/>')}<span>${own ? "Delete message" : "Moderation delete"}</span></button>` : "",
      canPin ? `<button type="button" class="ui-menu__item" data-message-menu-action="pin">${icon('<path d="m8 4 8 8M14.5 3.5l6 6-3 1-3 3-1 3-6-6 3-1 3-3 1-3ZM12 15l-5 5"/>')}<span>${isPinned ? "Unpin message" : "Pin message"}</span></button>` : "",
      canReport ? `<button type="button" class="ui-menu__item message-report-action" data-message-menu-action="report">${icon('<path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4M12 16.5h.01"/>')}<span>Report message</span></button>` : ""
    ].filter(Boolean).join("");
    const menu = document.createElement("div");
    menu.className = "message-more-popover ui-menu";
    menu.innerHTML = `<div class="message-more-title ui-menu__header">Message actions</div>${items}`;
    document.body.appendChild(menu);
    this._messageMenu = menu;
    const rect = anchorEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.right - menuRect.width;
    if (left < 8) left = rect.left;
    let top = rect.bottom + 6;
    if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 6;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
    menu.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-message-menu-action]")?.dataset.messageMenuAction;
      if (!action) return;
      this.closeMessageMenu();
      if (action === "react") {
        const reactionAnchor = this.els.messages.querySelector(`.message-row[data-message-id="${messageId}"] .message-react-btn`);
        if (reactionAnchor) this.openReactionPicker(reactionAnchor, messageId);
      } else if (action === "copy") {
        try { await navigator.clipboard?.writeText(Messages.plainText(cached.content)); this.showSendFeedback("Message copied."); }
        catch { this.showSendFeedback("Couldn’t copy that message."); }
      } else if (action === "edit") this.startMessageEdit(messageId);
      else if (action === "delete") this.deleteMessage(messageId);
      else if (action === "report") this.reportMessage(messageId);
      else if (action === "pin") {
        Messages.setPinned(messageId, !isPinned).then(() => { if (this._contextMode === "actions") this.renderChatActionsPanel(); }).catch(err => this.showSendFeedback(err?.message || "Couldn’t update that pin."));
      }
    });
    const listenerToken = ++this._messageMenuToken;
    setTimeout(() => {
      if (listenerToken !== this._messageMenuToken || this._messageMenu !== menu) return;
      this._messageMenuOutside = (event) => { if (!menu.contains(event.target) && event.target !== anchorEl && !anchorEl.contains(event.target)) this.closeMessageMenu(); };
      document.addEventListener("click", this._messageMenuOutside);
    }, 0);
  },

  closeMessageMenu(){
    this._messageMenuToken++;
    if (this._messageMenu) { this._messageMenu.remove(); this._messageMenu = null; }
    if (this._messageMenuOutside) { document.removeEventListener("click", this._messageMenuOutside); this._messageMenuOutside = null; }
  },

  /** Shared Discord-like emoji picker for message reactions and composer inserts. */
  openReactionPicker(anchorEl, messageId, options = {}){
    this.closeReactionPicker();
    this.closeOnlinePopover();
    this.closeAttachmentMenu();
    const viewToken = this._viewToken;

    const pop = document.createElement("div");
    pop.className = "reaction-popover reaction-popover-polished ui-menu";
    const groups = Reactions.EMOJI_GROUPS || {};
    const fallbackFrequent = groups["Frequently used"] || Reactions.EMOJIS.slice(0, 30);
    const entries = Object.entries(groups)
      .filter(([, emojis]) => Array.isArray(emojis) && emojis.length)
      .filter(([label]) => label !== "Frequently used")
      .map(([label, emojis]) => [label, [...new Set(emojis)]]);
    const pickerSections = [["Frequently used", Reactions.frequentlyUsed(this.user?.id, fallbackFrequent, 30)], ...entries];
    const emojiAliases = {
      "👍": "thumbs up like approve",
      "❤️": "heart love",
      "😂": "laugh laughing joy",
      "😮": "surprised shocked wow",
      "😢": "sad cry crying",
      "🔥": "fire hot lit",
      "🎉": "party celebration",
      "👀": "eyes look watching",
      "👏": "clap applause",
      "✅": "check done yes",
      "✨": "sparkles magic",
      "💯": "hundred perfect",
      "❤️‍🔥": "heart fire love",
      "💔": "broken heart heartbreak sad",
      "😀": "grin smile happy",
      "😃": "smile happy",
      "😄": "smile happy",
      "😁": "grin happy",
      "🤣": "rofl laugh",
      "😊": "blush smile",
      "😍": "heart eyes love",
      "😎": "cool sunglasses",
      "🤔": "think thinking",
      "🙏": "pray please thanks",
      "💪": "strong muscle",
      "⭐": "star",
      "⚡": "lightning zap",
      "💎": "gem diamond",
      "🚀": "rocket launch",
      "🎵": "music note",
      "☕": "coffee",
      "📌": "pin",
      "🔔": "bell notification",
    };
    const button = (emoji, label = "") => {
      const searchText = `${label} ${emoji} ${emojiAliases[emoji] || ""}`.trim();
      const actionLabel = options.mode === "composer" ? "Insert" : "React";
      return `<button type="button" data-pick-emoji="${escapeAttr(emoji)}" data-emoji-search="${escapeAttr(searchText)}" aria-label="${actionLabel} ${escapeAttr(emoji)}">${escapeHtml(emoji)}</button>`;
    };
    const categoryIcon = (label) => ({
      "all": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
      "Frequently used": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
      "Smileys": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.5h.01M15 9.5h.01"/></svg>',
      "Smileys & Emotion": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.5h.01M15 9.5h.01"/></svg>',
      "People": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M4.5 18c.5-2.8 2-4.2 4.5-4.2s4 1.4 4.5 4.2M15 6.5a2.6 2.6 0 0 1 0 5M16 14c2.1.2 3.4 1.5 3.8 4"/></svg>',
      "People & Body": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M4.5 18c.5-2.8 2-4.2 4.5-4.2s4 1.4 4.5 4.2M15 6.5a2.6 2.6 0 0 1 0 5M16 14c2.1.2 3.4 1.5 3.8 4"/></svg>',
      "Animals & Nature": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20c-4-2.5-6-5.3-6-8.2A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 6 2.8c0 2.9-2 5.7-6 8.2Z"/><path d="M12 9V4M12 6 9 4M12 6l3-2"/></svg>',
      "Food & Drink": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3v18M15 3c3 1 4 3.2 4 6h-4"/></svg>',
      "Travel & Places": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M4.5 9h15M4.5 15h15M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8c-2-2.2-3-4.9-3-8s1-5.8 3-8Z"/></svg>',
      "Activities": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.6 8 12 3Z"/></svg>',
      "Objects": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.6 8-4.6M12 12.1V21"/></svg>',
      "Symbols": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 16h14M8 5v14M16 5v14"/></svg>',
      "Flags": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 5c4-3 7 3 12 0v9c-5 3-8-3-12 0"/></svg>',
      "Objects & symbols": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/><path d="m18.5 16 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></svg>'
    }[label] || '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>');
    const sectionMarkup = pickerSections.map(([label]) => `
      <section class="reaction-category" data-emoji-section="${escapeAttr(label)}">
        <h3>${escapeHtml(label)}</h3>
        <div data-emoji-grid></div>
      </section>
    `).join("");
    pop.innerHTML = `
      <div class="reaction-picker-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
        <input type="search" data-emoji-search-input placeholder="Search emoji" autocomplete="off" aria-label="Search emoji">
      </div>
      <div class="reaction-picker-categories" role="tablist" aria-label="Emoji categories">
        <button type="button" class="reaction-category-tab is-active" data-emoji-category="all" role="tab" aria-selected="true" aria-label="All categories" title="All categories">${categoryIcon("all")}</button>
        ${pickerSections.map(([label]) => `<button type="button" class="reaction-category-tab" data-emoji-category="${escapeAttr(label)}" role="tab" aria-selected="false" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">${categoryIcon(label)}</button>`).join("")}
      </div>
      <div class="reaction-picker-body" data-emoji-body>
        ${sectionMarkup}
        <div class="reaction-picker-empty" data-emoji-empty hidden>No emoji found</div>
      </div>
    `;

    document.body.appendChild(pop);
    this._reactionPopover = pop;
    // Reaction pickers sit beside message actions. The composer picker opens
    // upward from the attachment button so it never crowds the message text.
    // Recalculate after filtering changes the popover's height.
    const reposition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const size = pop.getBoundingClientRect();
      let left;
      let top;
      if (options.mode === "composer") {
        left = rect.left;
        top = rect.top - size.height - 8;
        if (top < 8) top = rect.bottom + 8;
      } else {
        left = rect.left - size.width - 8;
        if (left < 8) left = rect.right + 8;
        top = rect.top + (rect.height - size.height) / 2;
      }
      if (left + size.width > window.innerWidth - 8) left = window.innerWidth - size.width - 8;
      if (top + size.height > window.innerHeight - 8) top = window.innerHeight - size.height - 8;
      pop.style.left = `${Math.max(8, left)}px`;
      pop.style.top = `${Math.max(8, top)}px`;
    };
    reposition();

    const searchInput = pop.querySelector("[data-emoji-search-input]");
    const categoryTabs = [...pop.querySelectorAll("[data-emoji-category]")];
    const sections = [...pop.querySelectorAll("[data-emoji-section]")];
    const emptyState = pop.querySelector("[data-emoji-empty]");
    const sectionSources = pickerSections;
    const sectionLoaded = sectionSources.map(() => 0);
    const batchSize = 30;
    let globalSectionIndex = 0;
    let activeCategory = "all";
    const appendFromSection = (sectionIndex, amount = batchSize) => {
      const source = sectionSources[sectionIndex];
      const section = sections[sectionIndex];
      if (!source || !section) return 0;
      const [, emojis] = source;
      const start = sectionLoaded[sectionIndex];
      const next = Math.min(start + amount, emojis.length);
      if (next <= start) return 0;
      const grid = section.querySelector("[data-emoji-grid]");
      grid.insertAdjacentHTML("beforeend", emojis.slice(start, next).map(emoji => button(emoji, source[0])).join(""));
      sectionLoaded[sectionIndex] = next;
      return next - start;
    };
    const appendGlobal = (amount = batchSize) => {
      let remaining = amount;
      while (remaining > 0 && globalSectionIndex < sectionSources.length) {
        const added = appendFromSection(globalSectionIndex, remaining);
        remaining -= added;
        if (sectionLoaded[globalSectionIndex] >= sectionSources[globalSectionIndex][1].length) globalSectionIndex++;
        if (!added && globalSectionIndex >= sectionSources.length) break;
      }
    };
    const loadAll = () => {
      while (globalSectionIndex < sectionSources.length) appendGlobal(batchSize);
    };
    const ensureCategoryLoaded = (category) => {
      const index = sectionSources.findIndex(([label]) => label === category);
      if (index < 0) return;
      appendFromSection(index, batchSize);
    };
    const applyFilter = () => {
      const query = (searchInput.value || "").trim().toLowerCase();
      let visibleCount = 0;
      sections.forEach(section => {
        const category = section.dataset.emojiSection;
        const categoryMatches = activeCategory === "all" || category === activeCategory;
        let sectionCount = 0;
        section.querySelectorAll("[data-pick-emoji]").forEach(btn => {
          const matches = categoryMatches && (!query || (btn.dataset.emojiSearch || "").toLowerCase().includes(query));
          btn.hidden = !matches;
          if (matches) sectionCount++;
        });
        section.hidden = sectionCount === 0;
        visibleCount += sectionCount;
      });
      emptyState.hidden = visibleCount !== 0;
      reposition();
    };
    appendGlobal(batchSize);
    applyFilter();
    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim()) loadAll();
      applyFilter();
    });
    const pickerBody = pop.querySelector("[data-emoji-body]");
    const loadOnScroll = () => {
      const nearBottom = pickerBody.scrollTop + pickerBody.clientHeight >= pickerBody.scrollHeight - 48;
      if (!nearBottom) return;
      if (activeCategory === "all") appendGlobal(batchSize);
      else appendFromSection(sectionSources.findIndex(([label]) => label === activeCategory), batchSize);
      applyFilter();
    };
    pickerBody.addEventListener("scroll", loadOnScroll, { passive: true });
    pickerBody.addEventListener("wheel", () => {
      // The first batch can be shorter than the viewport; let the first
      // deliberate wheel gesture continue filling it without eagerly
      // building the entire catalog.
      if (pickerBody.scrollHeight <= pickerBody.clientHeight + 4) loadOnScroll();
    }, { passive: true });
    categoryTabs.forEach(tab => tab.addEventListener("click", () => {
      activeCategory = tab.dataset.emojiCategory || "all";
      categoryTabs.forEach(item => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
      });
      if (activeCategory !== "all") ensureCategoryLoaded(activeCategory);
      applyFilter();
    }));
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeReactionPicker();
    });
    searchInput.focus({ preventScroll: true });

    pop.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pick-emoji]");
      if (!btn) return;
      const pickedEmoji = btn.dataset.pickEmoji;
      if (typeof options.onPick === "function") {
        Promise.resolve(options.onPick(pickedEmoji))
          .then(() => Reactions.recordUsage(this.user?.id, pickedEmoji))
          .catch(err => this.showSendFeedback(err?.message || "Couldn’t add that emoji."));
      } else {
        const { scope, scopeId } = this.msgScope();
        Reactions.toggle(scope, scopeId, messageId, this.user.id, pickedEmoji)
          .then(() => {
            Reactions.recordUsage(this.user?.id, pickedEmoji);
            if (this._viewToken === viewToken) Messages.updateReactions(this.els.messages, messageId, scope);
          })
          .catch(err => this.showSendFeedback(err?.message || "Couldn’t add that reaction."));
      }
      this.closeReactionPicker();
    });

    // Deferred so the click that opened the popover doesn't
    // immediately bubble up and close it again.
    const listenerToken = ++this._reactionListenerToken;
    setTimeout(() => {
      if (listenerToken !== this._reactionListenerToken || this._reactionPopover !== pop) return;
      this._outsideReactionListener = (ev) => {
        if (!pop.contains(ev.target)) this.closeReactionPicker();
      };
      document.addEventListener("click", this._outsideReactionListener);
    }, 0);
  },

  closeReactionPicker(){
    this._reactionListenerToken++;
    this.closeMessageMenu();
    if (this._reactionPopover) {
      this._reactionPopover.remove();
      this._reactionPopover = null;
    }
    if (this._outsideReactionListener) {
      document.removeEventListener("click", this._outsideReactionListener);
      this._outsideReactionListener = null;
    }
  },

  /* ---------------------------------------------------------
     @mention autocomplete
     Watches the composer for an @token under the caret and
     shows a picker. Channels search all profiles; DMs offer the
     two conversation participants. Picking inserts @username and
     records username → userId for resolveMentions() at send time.
     --------------------------------------------------------- */

  async updateMentionAutocomplete(){
    const input = this.els.input;
    const queryToken = (this._mentionQueryToken || 0) + 1;
    this._mentionQueryToken = queryToken;
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    const m = before.match(/(^|\s)@([a-zA-Z0-9_]*)$/);

    if (!m) {
      this.closeMentionPopover();
      return;
    }

    const q = m[2].toLowerCase();
    this._mention.start = caret - m[2].length - 1;
    this._mention.end = caret;

    let items = [];
    if (this.viewMode === "dm") {
      // Relevant to this conversation: every group member (or the other
      // person in a 1:1 DM) plus yourself. Group chats do not have an
      // _otherProfile, so using that old 1:1-only path made group mentions
      // silently disappear from autocomplete.
      const pool = this.currentDM?.is_group
        ? [...(this.currentDM._members || []), this.profile]
        : [this.currentDM?._otherProfile, this.profile];
      const unique = [...new Map(pool.filter(Boolean).map(p => [p.id, p])).values()];
      items = unique.filter(p =>
        !q
        || (p.username || "").toLowerCase().includes(q)
        || (p.display_name || "").toLowerCase().includes(q)
      ).slice(0, 8);
    } else {
      if (this.canAskAiInChannel(this.currentChannel)
          && (!q || "ai".includes(q))) {
        items.push({ __ai: true, username: "ai", display_name: "Ask BlurGPT" });
      }
      if (Permissions.canUseEveryone(this.profile)
          && (!q || "everyone".includes(q))) {
        items.push({ __everyone: true, username: "everyone", display_name: "Notify everyone" });
      }
      try {
        const cols = "id,username,display_name,avatar_url";
        // escape LIKE wildcards the user may have typed
        const like = q.replace(/[\\%_]/g, ch => "\\" + ch);
        const query = q
          ? sb.from("profiles").select(cols)
              .or(`username.ilike.%${like}%,display_name.ilike.%${like}%`)
              .order("username")
              .limit(8)
          : sb.from("profiles").select(cols).order("username").limit(8);
        const { data, error } = await query;
        if (error) throw error;
        if (this._mentionQueryToken !== queryToken) return;
        items = [...items, ...(data || [])];
      } catch (err) {
        if (this._mentionQueryToken !== queryToken) return;
        console.error("Mention lookup failed:", err);
      }
    }

    if (this._mentionQueryToken !== queryToken) return;

    this._mention.items = items;
    this._mention.index = 0;

    if (!items.length) {
      this.closeMentionPopover();
      return;
    }
    this.renderMentionPopover();
  },

  renderMentionPopover(){
    if (!this._mention.el) {
      const el = document.createElement("div");
      el.className = "mention-popover ui-menu";
      el.addEventListener("mousedown", (e) => {
        const row = e.target.closest("[data-mention-index]");
        if (!row) return;
        e.preventDefault(); // keep composer focus/caret
        this.pickMention(this._mention.items[Number(row.dataset.mentionIndex)]);
      });
      document.body.appendChild(el);
      this._mention.el = el;
      this._mention.open = true;
    }

    const el = this._mention.el;
    el.innerHTML = this._mention.items.map((p, i) => p.__ai
      ? `<button type="button" class="mention-item mention-ai ui-menu__item ${i === this._mention.index ? "active" : ""}" data-mention-index="${i}">
          <span class="mention-everyone-icon">✦</span>
          <span class="mention-item-name">@ai</span>
          <span class="mention-item-handle">Ask BlurGPT</span>
        </button>`
      : p.__everyone
      ? `<button type="button" class="mention-item mention-everyone ui-menu__item ${i === this._mention.index ? "active" : ""}" data-mention-index="${i}">
          <span class="mention-everyone-icon">@</span>
          <span class="mention-item-name">@everyone</span>
          <span class="mention-item-handle">Notify everyone</span>
        </button>`
      : `<button type="button" class="mention-item ui-menu__item ${i === this._mention.index ? "active" : ""}" data-mention-index="${i}">
           <img src="${escapeAttr(Profiles.safeImageUrl(p.avatar_url, p.username || "?"))}" alt="">
          <span class="mention-item-name">${escapeHtml(p.display_name || p.username)}</span>
          <span class="mention-item-handle">@${escapeHtml(p.username)}</span>
        </button>`
    ).join("");

    // float above the composer, aligned to its left edge
    const rect = this.els.composer.getBoundingClientRect();
    el.style.left = `${rect.left}px`;
    el.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    el.style.maxWidth = `${Math.min(340, rect.width)}px`;
  },

  pickMention(profile){
    if (!profile) return;
    const input = this.els.input;
    const mentionText = profile.__everyone ? "@everyone " : profile.__ai ? "@ai " : `@${profile.username} `;
    input.value = input.value.slice(0, this._mention.start) + mentionText + input.value.slice(this._mention.end);
    const caret = this._mention.start + mentionText.length;
    input.setSelectionRange(caret, caret);
    if (!profile.__everyone && !profile.__ai) this._mentionIds[profile.username.toLowerCase()] = profile.id;
    this.closeMentionPopover();
    input.focus();
  },

  closeMentionPopover(){
    // Invalidate any in-flight profile lookup. Without this, switching
    // channels while an @mention query is pending could reopen the old
    // popover over the new conversation when the request resolves.
    this._mentionQueryToken = (this._mentionQueryToken || 0) + 1;
    if (this._mention.el) {
      this._mention.el.remove();
      this._mention.el = null;
    }
    this._mention.open = false;
  },

  handleComposerKeydown(e){
    if (e.key === "Enter" && e.shiftKey) return;
    if (e.key === "Enter" && !e.shiftKey && (!this._mention.open || !this._mention.items.length)) {
      e.preventDefault();
      this.els.composer.requestSubmit();
      return;
    }
    if (!this._mention.open || !this._mention.items.length) return;

    const items = this._mention.items;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._mention.index = (this._mention.index + 1) % items.length;
      this.renderMentionPopover();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._mention.index = (this._mention.index - 1 + items.length) % items.length;
      this.renderMentionPopover();
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      this.pickMention(items[this._mention.index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.closeMentionPopover();
    }
  }
};

document.addEventListener("DOMContentLoaded", () => Chat.init());
