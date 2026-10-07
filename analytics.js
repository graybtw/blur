/*
   Blur analytics + lightweight site presence.

   Analytics is intentionally event based and minimal: no URLs, message
   content, user agents, or cross-site identifiers are recorded. A random
   browser visitor id is kept locally so the dev summary can distinguish
   visits from unique visitors without identifying guests.
*/
(() => {
  const TABLE = "blur_analytics_events";
  const VISITOR_KEY = "blur-analytics-visitor-v1";
  const SESSION_KEY = "blur-analytics-session-v1";
  const VISIT_RECORDED_KEY = "blur-analytics-visit-recorded-v1";
  const HEARTBEAT_MS = 30_000;

  const makeId = (prefix) => {
    try {
      if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    } catch { /* fall through */ }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  };

  const readOrCreate = (storage, key, prefix) => {
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const created = makeId(prefix);
      storage.setItem(key, created);
      return created;
    } catch {
      return makeId(prefix);
    }
  };

  const visitorId = readOrCreate(localStorage, VISITOR_KEY, "visitor");
  const sessionId = readOrCreate(sessionStorage, SESSION_KEY, "session");
  const listeners = new Set();
  let channel = null;
  let initialized = false;
  let lastTab = "home";
  let sessionStartedAt = Date.now();
  let heartbeatTimer = null;
  let panelObserver = null;
  let panelSyncTimer = null;

  function currentTab() {
    return document.querySelector(".panel.active[data-panel]")?.dataset.panel
      || document.querySelector("[data-tab].active")?.dataset.tab
      || "home";
  }

  function accountState() {
    const user = window.Account?.user || null;
    return { userId: user?.id || null, authenticated: Boolean(user?.id) };
  }

  function presencePayload() {
    const account = accountState();
    return {
      visitor_id: visitorId,
      authenticated: account.authenticated,
      user_id: account.userId,
      tab: currentTab(),
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
  }

  async function record(eventType, tab = currentTab(), extra = {}) {
    if (!window.sb?.from) return;
    const account = accountState();
    const payload = {
      event_type: eventType,
      tab: String(tab || "home").slice(0, 80),
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: account.userId,
      is_authenticated: account.authenticated,
      duration_seconds: Number.isFinite(extra.durationSeconds)
        ? Math.max(0, Math.min(86400, Math.round(extra.durationSeconds)))
        : 0
    };
    try {
      let response = await window.sb.from(TABLE).insert(payload);
      if (response?.error && eventType === "heartbeat" && /duration_seconds|schema cache|column|check constraint/i.test(response.error.message || "")) {
        return;
      }
      if (response?.error && /duration_seconds|schema cache|column/i.test(response.error.message || "")) {
        // Keep the basic visit/tab counters working until the additive v2
        // migration has been run. Heartbeats simply wait for the new column.
        if (eventType === "heartbeat") return;
        const legacyPayload = { ...payload };
        delete legacyPayload.duration_seconds;
        response = await window.sb.from(TABLE).insert(legacyPayload);
      }
      if (response?.error) throw response.error;
    } catch (error) {
      // Analytics must never affect the site when its optional table has not
      // been migrated yet or the network is unavailable.
      if (!record._warned) {
        record._warned = true;
        console.info("Blur analytics is unavailable until its Supabase migration is applied.");
      }
    }
  }

  function notifyPresence() {
    listeners.forEach((listener) => {
      try { listener(); } catch (error) { console.warn("Analytics presence listener failed", error); }
    });
  }

  function presenceState() {
    return channel?.presenceState?.() || {};
  }

  function liveSummary() {
    const state = presenceState();
    const rows = Object.values(state).flatMap((entries) => Array.isArray(entries) ? entries : []);
    const byVisitor = new Map();
    rows.forEach((entry) => {
      if (!entry?.visitor_id) return;
      byVisitor.set(entry.visitor_id, entry);
    });
    const unique = [...byVisitor.values()];
    return {
      total: unique.length,
      accounts: unique.filter((entry) => entry.authenticated || entry.user_id).length,
      guests: unique.filter((entry) => !(entry.authenticated || entry.user_id)).length,
      tabs: unique.reduce((counts, entry) => {
        const tab = entry.tab || "home";
        counts[tab] = (counts[tab] || 0) + 1;
        return counts;
      }, {})
    };
  }

  function sessionDurationSeconds() {
    return Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
  }

  async function trackPresence() {
    if (!channel?.track || document.visibilityState === "hidden") return;
    try {
      await channel.track(presencePayload());
      notifyPresence();
    } catch (error) {
      // Realtime presence is optional; the rest of the analytics pipeline
      // should continue working if a connection briefly drops.
    }
  }

  function recordHeartbeat() {
    if (document.visibilityState === "hidden") return;
    void record("heartbeat", currentTab(), { durationSeconds: sessionDurationSeconds() });
    void trackPresence();
  }

  function updatePresenceTab() {
    const nextTab = currentTab();
    if (nextTab === lastTab) {
      void trackPresence();
      return;
    }
    lastTab = nextTab;
    void record("tab_view", nextTab);
    void trackPresence();
  }

  async function startPresence() {
    if (!window.sb?.channel) return;
    try {
      channel = window.sb.channel("blur-site-presence", {
        config: { presence: { key: visitorId } }
      });
      channel
        .on("presence", { event: "sync" }, notifyPresence)
        .on("presence", { event: "join" }, notifyPresence)
        .on("presence", { event: "leave" }, notifyPresence)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await trackPresence();
          }
        });
    } catch (error) {
      console.info("Blur live presence is unavailable.");
    }
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    lastTab = currentTab();

    // Wait for the shared auth restore so signed-in visits are counted as
    // account traffic instead of briefly looking like guest traffic.
    try { await window.Account?.ready; } catch { /* analytics remains optional */ }
    sessionStartedAt = Date.now();

    // A visit is one browser session, while tab views provide the usage
    // breakdown. Both are best-effort and intentionally non-blocking.
    let hasRecordedVisit = false;
    try { hasRecordedVisit = sessionStorage.getItem(VISIT_RECORDED_KEY) === "1"; } catch { /* optional */ }
    if (!hasRecordedVisit) {
      try { sessionStorage.setItem(VISIT_RECORDED_KEY, "1"); } catch { /* optional */ }
      void record("visit", lastTab, { durationSeconds: 0 });
    }
    // Record the initial view as well as the session visit so the first page
    // is included in tab usage even when the visitor never navigates away.
    void record("tab_view", lastTab);
    void startPresence();

    heartbeatTimer = window.setInterval(recordHeartbeat, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void channel?.untrack?.();
        notifyPresence();
        return;
      }
      lastTab = currentTab();
      void trackPresence();
      recordHeartbeat();
    });

    window.addEventListener("pagehide", () => {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      window.clearTimeout(panelSyncTimer);
      panelSyncTimer = null;
      panelObserver?.disconnect();
      panelObserver = null;
      void channel?.untrack?.();
    }, { once: true });

    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("[data-tab]");
      if (!link || link.closest(".dev-root")) return;
      setTimeout(updatePresenceTab, 0);
    }, true);

    // Navigation can also happen through keyboard shortcuts, redirects, or a
    // component calling the app's tab switcher directly. Watch the panel
    // state as a second source of truth so those views are not missed.
    panelObserver = new MutationObserver(() => {
      window.clearTimeout(panelSyncTimer);
      panelSyncTimer = window.setTimeout(updatePresenceTab, 60);
    });
    document.querySelectorAll(".panel[data-panel]").forEach(panel => {
      panelObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
    });

    window.Account?.onAuthStateChange?.(() => {
      void trackPresence();
    });
  }

  window.BlurAnalytics = {
    table: TABLE,
    visitorId,
    presenceState,
    liveSummary,
    sessionDurationSeconds,
    record(eventType, tab, extra) {
      return record(eventType, tab, extra);
    },
    onPresenceChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refreshTab: updatePresenceTab
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();
