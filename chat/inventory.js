/* =========================================================
   Blur inventory
   A small account-scoped collection for profile cosmetics. It intentionally
   uses the same local preference boundary as the rest of the client: the
   catalog and progress are durable per signed-in browser, while the Chat
   lifecycle remains the source of truth for navigation and cleanup.
   ========================================================= */
(function(){
  const STORAGE_PREFIX = "blur-inventory-v1:";

  const CATALOG = {
    pfp: [
      { id: "orbit-halo", name: "Orbit Halo", description: "A quiet ring of light around your avatar.", price: 100, mark: "◎", className: "orbit-halo" },
      { id: "prism-orbit", name: "Prism Orbit", description: "A second orbit that slowly traces your avatar.", price: 180, mark: "✦", className: "prism-orbit" }
    ],
    profile: [
      { id: "nocturne-frame", name: "Nocturne Frame", description: "A fine accent frame for your full profile card.", price: 150, mark: "▣", className: "nocturne-frame" }
    ]
  };

  const ACHIEVEMENTS = [
    { id: "welcome", name: "First look", description: "Open your Inventory for the first time.", reward: 100, condition: state => !!state.stats.inventoryOpened },
    { id: "first-message", name: "First words", description: "Send your first message in Chat.", reward: 60, condition: state => state.stats.messages >= 1 },
    { id: "collector", name: "A little something", description: "Buy your first cosmetic from the Shop.", reward: 75, condition: state => state.ownedPfp.length + state.ownedProfile.length >= 1 }
  ];

  const QUESTS = [
    { id: "say-hello", name: "Say hello", description: "Send 3 messages", goal: 3, reward: 40 },
    { id: "keep-talking", name: "Keep talking", description: "Send 10 messages", goal: 10, reward: 90 }
  ];

  let userId = null;
  let state = null;
  let activeTab = "pfp";
  let chat = null;
  let profileSyncQueue = Promise.resolve();

  function esc(value){
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }

  function blankState(){
    return {
      credits: 0,
      ownedPfp: [],
      ownedProfile: [],
      equippedPfp: null,
      equippedProfile: null,
      achievements: {},
      quests: {},
      stats: { messages: 0, inventoryOpened: false }
    };
  }

  function storageKey(id = userId){ return `${STORAGE_PREFIX}${id || "guest"}`; }

  function load(id){
    userId = id || null;
    const base = blankState();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(id)) || "null");
      if (saved && typeof saved === "object") {
        Object.assign(base, saved);
        base.ownedPfp = Array.isArray(saved.ownedPfp) ? saved.ownedPfp : [];
        base.ownedProfile = Array.isArray(saved.ownedProfile) ? saved.ownedProfile : [];
        base.achievements = saved.achievements && typeof saved.achievements === "object" ? saved.achievements : {};
        base.quests = saved.quests && typeof saved.quests === "object" ? saved.quests : {};
        base.stats = { ...blankState().stats, ...(saved.stats || {}) };
      }
    } catch { /* private browsing/storage-disabled is still usable */ }
    base.credits = Number.isFinite(Number(base.credits)) ? Math.max(0, Number(base.credits)) : 0;
    base.stats.messages = Number.isFinite(Number(base.stats.messages)) ? Math.max(0, Number(base.stats.messages)) : 0;
    state = base;
    return state;
  }

  function save(){
    if (!state) return;
    try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch { /* optional persistence */ }
  }

  // When the inventory columns are present, mirror the local state to the
  // public profile row so equipped cosmetics travel with the author into
  // other users' messages and profile cards. Older installs simply keep the
  // local fallback until the migration is applied.
  async function syncFromProfile(){
    if (!state || !userId || typeof Profiles === "undefined") return;
    try {
      const profile = await Profiles.getById(userId, { force: true });
      if (!profile || !Object.prototype.hasOwnProperty.call(profile, "blur_credits")) return;
      const backendPfp = Array.isArray(profile.owned_pfp_effects) ? profile.owned_pfp_effects.filter(id => !!findItem(id)) : [];
      const backendProfile = Array.isArray(profile.owned_profile_effects) ? profile.owned_profile_effects.filter(id => !!findItem(id)) : [];
      const backendCredits = Math.max(0, Math.floor(Number(profile.blur_credits) || 0));
      const backendHasData = backendCredits > 0 || backendPfp.length > 0 || backendProfile.length > 0 || !!profile.equipped_pfp_effect || !!profile.equipped_profile_effect;
      const localHasData = state.credits > 0 || state.ownedPfp.length > 0 || state.ownedProfile.length > 0 || !!state.equippedPfp || !!state.equippedProfile;
      // A freshly added migration has zero/default columns. Preserve an
      // existing local collection in that case, then upload it once so the
      // profile becomes the shared source of truth for future sessions.
      if (backendHasData || !localHasData) {
        state.credits = backendCredits;
        state.ownedPfp = backendPfp;
        state.ownedProfile = backendProfile;
        state.equippedPfp = findItem(profile.equipped_pfp_effect)?.id || null;
        state.equippedProfile = findItem(profile.equipped_profile_effect)?.id || null;
      }
      save();
      if (!backendHasData && localHasData) await syncToProfile();
    } catch (error) {
      // A missing migration or a transient profile request must not block the
      // local inventory experience.
      console.warn("Inventory profile sync unavailable:", error?.message || error);
    }
  }

  function syncToProfile(){
    if (!state || !userId || typeof Profiles === "undefined" || typeof Profiles.updateInventory !== "function") return Promise.resolve();
    const targetUserId = userId;
    const payload = {
      blur_credits: Math.max(0, Math.floor(Number(state.credits) || 0)),
      owned_pfp_effects: [...state.ownedPfp],
      owned_profile_effects: [...state.ownedProfile],
      equipped_pfp_effect: state.equippedPfp,
      equipped_profile_effect: state.equippedProfile
    };
    // Serialize writes so rapid messages or a quick equip/purchase sequence
    // cannot race and restore an older credit balance.
    profileSyncQueue = profileSyncQueue
      .catch(() => null)
      .then(() => Profiles.updateInventory(targetUserId, payload));
    return profileSyncQueue;
  }

  function setUser(id){
    if (!id) return;
    if (userId !== id || !state) load(id);
    evaluateAchievements();
    save();
  }

  function allItems(){ return [...CATALOG.pfp, ...CATALOG.profile]; }
  function findItem(id){ return allItems().find(item => item.id === id) || null; }
  function owns(item){ return !!item && (state?.ownedPfp.includes(item.id) || state?.ownedProfile.includes(item.id)); }

  function evaluateAchievements(){
    if (!state) return;
    ACHIEVEMENTS.forEach(item => {
      if (state.achievements[item.id]?.claimed) return;
      if (!item.condition(state)) return;
      // Achievements are instant rewards; the tab is a history of what was
      // earned, not another button the user has to discover and press.
      state.achievements[item.id] = { claimed: true, earnedAt: new Date().toISOString() };
      state.credits += item.reward;
    });
  }

  function questProgress(item){ return Math.min(item.goal, Number(state?.quests?.[item.id]?.progress || 0)); }

  function currentCardMarkup(){
    const pfp = findItem(state?.equippedPfp);
    const profile = findItem(state?.equippedProfile);
    return `<div class="inventory-equipped"><span class="inventory-equipped-label">Equipped</span><div class="inventory-equipped-values"><span>${pfp ? `${esc(pfp.mark)} ${esc(pfp.name)}` : "No avatar effect"}</span><span>${profile ? `${esc(profile.mark)} ${esc(profile.name)}` : "No profile effect"}</span></div></div>`;
  }

  function itemCard(item, kind, shop = false){
    const owned = owns(item);
    const equipped = kind === "pfp" ? state.equippedPfp === item.id : state.equippedProfile === item.id;
    const disabled = shop && (owned || state.credits < item.price);
    const action = shop
      ? `<button type="button" class="inventory-action" data-inventory-buy="${esc(item.id)}" ${disabled ? "disabled" : ""}>${owned ? "Owned" : state.credits < item.price ? "Need credits" : `Buy · ${item.price}`}</button>`
      : owned
        ? `<button type="button" class="inventory-action${equipped ? " is-equipped" : ""}" data-inventory-equip="${esc(item.id)}" data-inventory-kind="${kind}">${equipped ? "Equipped" : "Equip"}</button>`
        : `<span class="inventory-item-locked">Not owned</span>`;
    return `<article class="inventory-item ${equipped ? "is-equipped" : ""}" data-effect-kind="${kind}"><div class="inventory-item-mark effect-${esc(item.className)}">${esc(item.mark)}</div><div class="inventory-item-copy"><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small>${kind === "pfp" ? "PFP effect" : "Profile effect"}</small></div><div class="inventory-item-action">${action}</div></article>`;
  }

  function achievementMarkup(item){
    const done = !!state.achievements[item.id]?.claimed;
    return `<article class="inventory-progress-row ${done ? "is-complete" : ""}"><div class="inventory-progress-mark">${done ? "✓" : "○"}</div><div class="inventory-progress-copy"><strong>${esc(item.name)}</strong><span>${esc(item.description)}</span></div><div class="inventory-progress-reward">+${item.reward}</div></article>`;
  }

  function questMarkup(item){
    const progress = questProgress(item);
    const claimed = !!state.quests[item.id]?.claimed;
    const complete = progress >= item.goal;
    const action = claimed ? `<span class="inventory-progress-status">Claimed</span>` : complete ? `<button type="button" class="inventory-action" data-inventory-claim-quest="${esc(item.id)}">Claim +${item.reward}</button>` : `<span class="inventory-progress-count">${progress} / ${item.goal}</span>`;
    return `<article class="inventory-progress-row ${complete ? "is-complete" : ""}"><div class="inventory-progress-mark">${complete ? "✓" : "·"}</div><div class="inventory-progress-copy"><strong>${esc(item.name)}</strong><span>${esc(item.description)}</span><div class="inventory-progress-track"><i style="width:${Math.round((progress / item.goal) * 100)}%"></i></div></div><div class="inventory-progress-reward">${action}</div></article>`;
  }

  function renderSidebar(container){
    if (!container || !state) return;
    const nav = [
      ["pfp", "PFP effects", "○"],
      ["profile", "Profile effects", "□"],
      ["shop", "Shop", "＋"],
      ["progress", "Achievements / Quests", "✓"]
    ];
    const equipped = [findItem(state.equippedPfp)?.name, findItem(state.equippedProfile)?.name].filter(Boolean);
    container.innerHTML = `<div class="inventory-sidebar-wallet"><span class="inventory-sidebar-kicker">BLUR CREDITS</span><strong>${state.credits.toLocaleString()}</strong><span>available to spend</span></div><div class="inventory-sidebar-divider"></div><nav class="inventory-sidebar-nav" aria-label="Inventory navigation">${nav.map(([id, label, icon]) => `<button type="button" class="inventory-sidebar-item${activeTab === id ? " is-active" : ""}" data-inventory-sidebar-tab="${id}"><span class="inventory-sidebar-icon" aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`).join("")}</nav><div class="inventory-sidebar-equipped"><span class="inventory-sidebar-kicker">EQUIPPED</span>${equipped.length ? equipped.map(name => `<span class="inventory-sidebar-effect">${esc(name)}</span>`).join("") : `<span class="inventory-sidebar-muted">Nothing equipped</span>`}</div>`;
    container.querySelectorAll("[data-inventory-sidebar-tab]").forEach(button => button.addEventListener("click", () => {
      activeTab = button.dataset.inventorySidebarTab;
      render(chat?.els?.friendsView);
    }));
  }

  function render(container){
    if (!container || !state) return;
    evaluateAchievements();
    save();
    renderSidebar(chat?.els?.inventorySidebar);
    const tabs = [
      ["pfp", "PFP effects"],
      ["profile", "Profile effects"],
      ["shop", "Shop"],
      ["progress", "Achievements / Quests"]
    ];
    const content = activeTab === "shop"
      ? `<div class="inventory-section-heading"><div><span class="inventory-kicker">THE SHOP</span><h2>Pick a look</h2><p>Spend Blur Credits on effects you can equip from your inventory.</p></div></div><div class="inventory-item-list">${CATALOG.pfp.map(item => itemCard(item, "pfp", true)).join("")}${itemCard(CATALOG.profile[0], "profile", true)}</div>`
      : activeTab === "progress"
        ? `<div class="inventory-progress-section"><div class="inventory-section-heading"><div><span class="inventory-kicker">MILESTONES</span><h2>Achievements</h2><p>Small wins that add credits to your collection.</p></div></div><div class="inventory-progress-list">${ACHIEVEMENTS.map(achievementMarkup).join("")}</div></div><div class="inventory-progress-section"><div class="inventory-section-heading"><div><span class="inventory-kicker">ONGOING</span><h2>Quests</h2><p>Keep chatting to finish these quests.</p></div></div><div class="inventory-progress-list">${QUESTS.map(questMarkup).join("")}</div></div>`
        : (() => {
            const kind = activeTab === "profile" ? "profile" : "pfp";
            const title = kind === "pfp" ? "PFP effects" : "Profile effects";
            const owned = CATALOG[kind].filter(item => state[kind === "pfp" ? "ownedPfp" : "ownedProfile"].includes(item.id));
            return `<div class="inventory-section-heading"><div><span class="inventory-kicker">YOUR COLLECTION</span><h2>${title}</h2><p>${kind === "pfp" ? "Effects that sit around your avatar." : "Effects that shape your full profile card."}</p></div></div><div class="inventory-item-list">${owned.length ? owned.map(item => itemCard(item, kind)).join("") : `<div class="inventory-empty"><span>○</span><strong>Nothing here yet</strong><p>Visit the Shop to pick up your first ${kind === "pfp" ? "avatar" : "profile"} effect.</p><button type="button" class="inventory-action" data-inventory-tab="shop">Browse shop</button></div>`}</div>`;
          })();

    container.innerHTML = `<section class="chat-inventory-view"><header class="inventory-header"><div><span class="inventory-kicker">YOUR COLLECTION</span><h1>Inventory</h1><p>Make your profile feel like yours.</p></div><div class="inventory-credit-balance"><span>Blur Credits</span><strong>${state.credits.toLocaleString()}</strong></div></header><nav class="inventory-tabs" aria-label="Inventory sections">${tabs.map(([id, label]) => `<button type="button" class="inventory-tab${activeTab === id ? " is-active" : ""}" data-inventory-tab="${id}">${esc(label)}</button>`).join("")}</nav>${currentCardMarkup()}<div class="inventory-content">${content}</div></section>`;
    container.querySelectorAll("[data-inventory-tab]").forEach(button => button.addEventListener("click", () => {
      activeTab = button.dataset.inventoryTab;
      render(container);
    }));
    container.querySelectorAll("[data-inventory-buy]").forEach(button => button.addEventListener("click", () => buy(button.dataset.inventoryBuy, container)));
    container.querySelectorAll("[data-inventory-equip]").forEach(button => button.addEventListener("click", () => equip(button.dataset.inventoryEquip, button.dataset.inventoryKind, container)));
    container.querySelectorAll("[data-inventory-claim-quest]").forEach(button => button.addEventListener("click", () => claimQuest(button.dataset.inventoryClaimQuest, container)));
  }

  function buy(id, container){
    const item = findItem(id);
    const price = Math.max(0, Math.floor(Number(item?.price) || 0));
    const credits = Math.max(0, Math.floor(Number(state?.credits) || 0));
    if (!item || owns(item) || credits < price) return;
    // Normalize both sides of the debit so fractional/stale values can never
    // make the balance drift from the displayed price.
    state.credits = credits - price;
    (CATALOG.pfp.includes(item) ? state.ownedPfp : state.ownedProfile).push(item.id);
    evaluateAchievements();
    save();
    syncToProfile().catch(error => console.warn("Inventory purchase sync failed:", error?.message || error));
    render(container);
  }

  function equip(id, kind, container){
    const item = findItem(id);
    if (!item || !owns(item)) return;
    const key = kind === "profile" ? "equippedProfile" : "equippedPfp";
    state[key] = state[key] === id ? null : id;
    save();
    syncToProfile().catch(error => console.warn("Inventory equip sync failed:", error?.message || error));
    applyToUserInterface();
    render(container);
  }

  function claimQuest(id, container){
    const quest = QUESTS.find(item => item.id === id);
    if (!quest || state.quests[id]?.claimed || questProgress(quest) < quest.goal) return;
    state.quests[id] = { ...state.quests[id], progress: quest.goal, claimed: true, claimedAt: new Date().toISOString() };
    state.credits += quest.reward;
    save();
    syncToProfile().catch(error => console.warn("Inventory quest sync failed:", error?.message || error));
    render(container);
  }

  // Developer convenience for testing the shop from DevTools. It uses the
  // same persistence path as earned credits, so the balance remains correct
  // after a refresh when the inventory migration is installed.
  function grantCredits(amount = 1000){
    if (!state) throw new Error("Sign in before granting Blur Credits.");
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a positive credit amount.");
    state.credits = Math.max(0, Math.floor(Number(state.credits) || 0)) + value;
    save();
    syncToProfile().catch(error => console.warn("Inventory credit sync failed:", error?.message || error));
    const view = chat?.els?.friendsView;
    if (chat?._sidebarTab === "inventory" && view && !view.hidden) render(view);
    return state.credits;
  }

  function recordMessage(){
    if (!state) return;
    state.stats.messages += 1;
    QUESTS.forEach(item => {
      const previous = Number(state.quests[item.id]?.progress || 0);
      state.quests[item.id] = { ...state.quests[item.id], progress: Math.min(item.goal, previous + 1) };
    });
    evaluateAchievements();
    save();
    syncToProfile().catch(error => console.warn("Inventory message sync failed:", error?.message || error));
    const view = chat?.els?.friendsView;
    if (chat?._sidebarTab === "inventory" && view && !view.hidden) render(view);
  }

  function applyToUserInterface(){
    if (!state) return;
    if (chat?.els?.userBar) decorateUserBar(chat.els.userBar);
    if (chat?.els?.overlay) decorateProfilePopup(chat.els.overlay, null, true);
    const messageRoot = chat?.els?.messages;
    if (messageRoot) {
      [...messageRoot.querySelectorAll(".message-row[data-author-id]")]
        .filter(row => row.dataset.authorId === String(userId))
        .forEach(row => {
          const pfp = state.equippedPfp || "";
          const profile = state.equippedProfile || "";
          if (pfp) row.dataset.pfpEffect = pfp; else delete row.dataset.pfpEffect;
          if (profile) row.dataset.profileEffect = profile; else delete row.dataset.profileEffect;
          const avatar = row.querySelector(".message-avatar");
          if (avatar) {
            if (pfp) avatar.dataset.pfpEffect = pfp;
            else delete avatar.dataset.pfpEffect;
          }
        });
    }
    // Account is another surface for the same profile; refresh it when an
    // effect changes so the cosmetic is immediately visible there too.
    if (typeof AccountUI !== "undefined") AccountUI.refresh?.();
  }

  function decorateUserBar(container){
    const avatar = container?.querySelector?.(".user-bar-avatar");
    if (avatar) avatar.dataset.pfpEffect = state?.equippedPfp || "";
  }

  function decorateProfilePopup(container, profile, isSelf){
    if (!container) return;
    const card = container?.querySelector?.(".acct-pcard");
    if (!card) return;
    const profileEffect = profile?.equipped_profile_effect || (isSelf ? state?.equippedProfile : "") || "";
    card.dataset.profileEffect = profileEffect;
    const avatar = card.querySelector(".acct-avatar");
    const pfpEffect = profile?.equipped_pfp_effect || (isSelf ? state?.equippedPfp : "") || "";
    if (avatar) avatar.dataset.pfpEffect = pfpEffect;
  }

  async function open(chatInstance){
    chat = chatInstance;
    setUser(chat.user?.id);
    if (!state) throw new Error("Inventory needs a signed-in user");
    await syncFromProfile();
    state.stats.inventoryOpened = true;
    evaluateAchievements();
    save();
    syncToProfile().catch(error => console.warn("Inventory open sync failed:", error?.message || error));
    activeTab = "pfp";
    chat._viewToken = (chat._viewToken || 0) + 1;
    chat.viewMode = "inventory";
    chat.currentChannel = null;
    chat.currentDM = null;
    if (typeof DirectMessages !== "undefined") DirectMessages.activeId = null;
    chat.resetNewMessages();
    Messages.unsubscribe();
    Reactions.unsubscribe();
    DirectMessages.unsubscribeConversation();
    Moderation.unsubscribeLogs();
    chat.closeContextPanel();
    chat.closeReactionPicker();
    chat.closeAttachmentMenu();
    chat.closeOnlinePopover();
    chat.closeMentionPopover();
    chat.closeMessageMenu();
    chat.clearPendingAttachment();
    Profiles.closePopup?.(chat.els.overlay);
    chat.forumPostId = null;
    chat.els.forumBack.hidden = true;
    chat.els.friendsTabs.hidden = true;
    chat.els.messages.hidden = true;
    chat.els.replyPreview.hidden = true;
    chat.els.composer.hidden = true;
    chat.els.friendsView.hidden = false;
    chat.setTopbarIcon("inventory");
    chat.els.topbarName.textContent = "Inventory";
    chat.els.topbarName.title = "Your cosmetics and progress";
    chat.els.pinsToggle.hidden = true;
    chat.els.groupLeave.hidden = true;
    chat.els.groupDelete.hidden = true;
    chat.els.groupMembers.hidden = true;
    chat.els.groupMembers.innerHTML = "";
    if (chat.els.topbarTopic) {
      chat.els.topbarTopic.textContent = "Cosmetics, credits, and quests";
      chat.els.topbarTopic.hidden = false;
    }
    render(chat.els.friendsView);
  }

  window.Inventory = { CATALOG, ACHIEVEMENTS, QUESTS, setUser, open, render, renderSidebar, recordMessage, grantCredits, decorateUserBar, decorateProfilePopup, getState: () => state };
})();
