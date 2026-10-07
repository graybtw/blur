/* Developer analytics view. The page reads aggregate data through the
   Supabase RPC and uses the shared site presence channel for live counts. */
(() => {
  const labels = {
    home: "Home",
    watch: "Watch",
    games: "Games",
    proxy: "Browser",
    ai: "AI",
    chat: "Chat",
    music: "Music",
    settings: "Settings",
    legal: "Legal",
    dmca: "DMCA",
    privacy: "Privacy"
  };

  const number = value => Number(value || 0).toLocaleString();
  const duration = value => {
    const seconds = Math.max(0, Number(value) || 0);
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.round(seconds)}s`;
  };
  const escapeHtml = value => {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  };
  const escapeAttr = value => escapeHtml(value).replace(/`/g, "&#96;");

  function setupDevAnalytics(root) {
    const page = root.querySelector(".dev-analytics-page");
    if (!page) return;

    const refs = {
      visits: page.querySelector("[data-analytics-visits]"),
      visitors: page.querySelector("[data-analytics-visitors]"),
      visitsDetail: page.querySelector("[data-analytics-visits-detail]"),
      visitorsDetail: page.querySelector("[data-analytics-visitors-detail]"),
      accounts: page.querySelector("[data-analytics-account-visitors]"),
      guests: page.querySelector("[data-analytics-guest-visitors]"),
      liveTotal: page.querySelector("[data-analytics-live-total]"),
      liveAccounts: page.querySelector("[data-analytics-live-accounts]"),
      liveGuests: page.querySelector("[data-analytics-live-guests]"),
      liveTab: page.querySelector("[data-analytics-live-tab]"),
      tabs: page.querySelector("[data-analytics-tabs]"),
      daily: page.querySelector("[data-analytics-daily]"),
      status: page.querySelector("[data-analytics-status]"),
      refresh: page.querySelector(".dev-analytics-refresh"),
      period: page.querySelector("[data-analytics-period]")
    };

    const renderLive = () => {
      const live = window.BlurAnalytics?.liveSummary?.() || { total: 0, accounts: 0, guests: 0 };
      if (refs.liveTotal) refs.liveTotal.textContent = number(live.total);
      if (refs.liveAccounts) refs.liveAccounts.textContent = number(live.accounts);
      if (refs.liveGuests) refs.liveGuests.textContent = number(live.guests);
      if (refs.liveTab) {
        const activeTab = Object.entries(live.tabs || {}).sort((a, b) => b[1] - a[1])[0];
        refs.liveTab.textContent = activeTab ? `${labels[activeTab[0]] || activeTab[0]} · ${number(activeTab[1])}` : "No active area";
      }
    };

    const renderTabs = tabs => {
      if (!refs.tabs) return;
      if (!Array.isArray(tabs) || !tabs.length) {
        refs.tabs.innerHTML = '<div class="dev-analytics-empty">No tab views yet</div>';
        return;
      }
      const max = Math.max(...tabs.map(item => Number(item.views) || 0), 1);
      refs.tabs.innerHTML = tabs.map(item => {
        const tab = String(item.tab || "home");
        const views = Number(item.views) || 0;
        const width = Math.max(4, Math.round((views / max) * 100));
        const visitors = Number(item.visitors) || 0;
        return `<div class="dev-analytics-tab-row" title="${escapeAttr(`${number(views)} views from ${number(visitors)} visitors`)}"><span>${escapeHtml(labels[tab] || tab)}</span><div><i style="width:${width}%"></i></div><strong>${number(views)}</strong></div>`;
      }).join("");
    };

    const renderDaily = daily => {
      if (!refs.daily) return;
      if (!Array.isArray(daily) || !daily.length) {
        refs.daily.innerHTML = '<div class="dev-analytics-empty">No visits recorded yet</div>';
        return;
      }
      const max = Math.max(...daily.map(item => Number(item.visits) || 0), 1);
      refs.daily.innerHTML = daily.slice(-30).map(item => {
        const day = String(item.day || "").slice(5);
        const visits = Number(item.visits) || 0;
        const visitors = Number(item.visitors) || 0;
        const sessions = Number(item.sessions) || 0;
        const height = Math.max(6, Math.round((visits / max) * 100));
        return `<div class="dev-analytics-day" title="${escapeAttr(String(item.day || ""))}: ${number(visits)} visits · ${number(visitors)} visitors · ${number(sessions)} sessions"><i style="height:${height}%"></i><span>${escapeHtml(day)}</span></div>`;
      }).join("");
    };

    async function load() {
      renderLive();
      if (!window.sb?.rpc) {
        if (refs.status) refs.status.textContent = "Analytics service unavailable.";
        return;
      }
      if (refs.refresh) refs.refresh.disabled = true;
      if (refs.status) refs.status.textContent = "";
      try {
        const days = Math.max(1, Math.min(365, Number(refs.period?.value) || 30));
        const { data, error } = await window.sb.rpc("blur_dev_analytics_summary", { p_days: days });
        if (error) throw error;
        const summary = data || {};
        if (refs.visits) refs.visits.textContent = number(summary.visits);
        if (refs.visitors) refs.visitors.textContent = number(summary.visitors);
        if (refs.accounts) refs.accounts.textContent = number(summary.account_visitors);
        if (refs.guests) refs.guests.textContent = number(summary.guest_visitors);
        if (refs.visitsDetail) {
          const sessions = summary.sessions == null ? summary.visits : summary.sessions;
          const average = summary.avg_session_seconds == null ? "n/a" : duration(summary.avg_session_seconds);
          refs.visitsDetail.textContent = `${number(sessions)} sessions · avg ${average}`;
        }
        if (refs.visitorsDetail) {
          const returning = summary.returning_visitors == null ? null : Number(summary.returning_visitors) || 0;
          const recent = summary.last_24h_visitors == null ? null : Number(summary.last_24h_visitors) || 0;
          refs.visitorsDetail.textContent = `${returning == null ? "returning n/a" : number(returning) + " returning"} · ${recent == null ? days + " days" : number(recent) + " today"}`;
        }
        renderTabs(summary.tabs);
        renderDaily(summary.daily);
      } catch (error) {
        if (refs.status) refs.status.textContent = "Run the analytics migrations in dev/ to enable totals.";
        renderTabs([]);
        renderDaily([]);
      } finally {
        if (refs.refresh) refs.refresh.disabled = false;
      }
    }

    refs.refresh?.addEventListener("click", load);
    refs.period?.addEventListener("change", load);
    const unsubscribe = window.BlurAnalytics?.onPresenceChange?.(renderLive);
    root.addEventListener("click", event => {
      if (event.target.closest('[data-page="analytics"]')) void load();
    });
    if (root.classList.contains("visible")) void load();
    const refreshTimer = window.setInterval(() => {
      if (root.classList.contains("visible") && root.classList.contains("authenticated") && page.classList.contains("active")) {
        void load();
      }
    }, 30_000);
    root.addEventListener("dev:closed", () => {
      unsubscribe?.();
      window.clearInterval(refreshTimer);
    }, { once: true });
  }

  window.setupDevAnalytics = setupDevAnalytics;
})();
