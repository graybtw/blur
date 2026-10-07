/* =========================================================
   channels.js
   Fetches available channels and renders the Discord-style
   channel sidebar.
   ========================================================= */

const ChatPermissions = {
  isStaff(user, profile){ return !!user?.id && Permissions.isStaff(profile); },
  isAnnouncement(channel){
    return String(channel?.type || "text").toLowerCase() === "announcement";
  },
  isForum(channel){
    return String(channel?.type || "text").toLowerCase() === "forum";
  },
  async isStaffId(userId){ if (!userId) return false; try { const { data } = await sb.from("profiles").select("role,roles").eq("id", userId).maybeSingle(); return Permissions.isStaff(data); } catch { return false; } },
  async canUseEveryoneId(userId){ if (!userId) return false; try { const { data } = await sb.from("profiles").select("role,roles").eq("id", userId).maybeSingle(); return Permissions.canUseEveryone(data); } catch { return false; } }
};

// Keep the sidebar's information hierarchy stable even when channels were
// created at different times in Supabase. Unknown/future channels are kept
// after the curated entries rather than being hidden.
const CHANNEL_ORDER = Object.freeze({
  main: Object.freeze(["global", "gaming", "movies", "suggestions", "ai"]),
  important: Object.freeze(["updates", "bug-fixes", "announcements", "premium", "sneak-peaks", "to-do"]),
  staff: Object.freeze(["mod-announcements", "logs", "mod-chat", "testing"])
});

function sortChannels(rows, preferredNames){
  const rank = new Map(preferredNames.map((name, index) => [name, index]));
  return [...rows].sort((a, b) => {
    const ar = rank.has(String(a.name).toLowerCase()) ? rank.get(String(a.name).toLowerCase()) : Number.MAX_SAFE_INTEGER;
    const br = rank.has(String(b.name).toLowerCase()) ? rank.get(String(b.name).toLowerCase()) : Number.MAX_SAFE_INTEGER;
    return ar - br || new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

// Keep the existing channel record/id compatible with older databases while
// correcting the public spelling everywhere it is displayed.
function blurChannelDisplayName(channelOrName){
  const name = typeof channelOrName === "string" ? channelOrName : channelOrName?.name;
  return String(name || "").toLowerCase() === "sneak-peaks" ? "sneak-peeks" : String(name || "");
}
window.blurChannelDisplayName = blurChannelDisplayName;

const Channels = {

  list: [],
  activeId: null,

  async fetchAll(){
    const { data, error } = await sb
      .from("channels")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    // Old rows (and databases not yet migrated) remain normal text channels.
    this.list = (data || []).map(ch => ({
      ...ch,
      type: ["announcement", "forum"].includes(String(ch.type || "").toLowerCase()) ? String(ch.type).toLowerCase() : "text",
      visibility: String(ch.visibility || "public").toLowerCase() === "staff" ? "staff" : "public",
      is_log: !!ch.is_log
    })).filter(ch => ch.visibility !== "staff" || Permissions.canViewStaff(Chat.profile));
    return this.list;
  },

  render(container, onSelect, staffContainer = null, importantContainer = null){
    const normal = sortChannels(this.list.filter(ch => ch.visibility !== "staff" && !ChatPermissions.isAnnouncement(ch)), CHANNEL_ORDER.main);
    const announcements = sortChannels(this.list.filter(ch => ch.visibility !== "staff" && ChatPermissions.isAnnouncement(ch)), CHANNEL_ORDER.important);
    const staff = sortChannels(this.list.filter(ch => ch.visibility === "staff"), CHANNEL_ORDER.staff);
    const renderItem = (ch, category) => {
      const displayName = blurChannelDisplayName(ch);
      return `
      <button type="button" class="channel-item ${ChatPermissions.isAnnouncement(ch) ? "announcement" : ""} ${ChatPermissions.isForum(ch) ? "forum" : ""} ${ch.id === this.activeId ? "active" : ""}" data-id="${ch.id}" data-channel-category="${category}" title="${escapeHtml(ch.topic || displayName)}">
        <span class="channel-hash ${ChatPermissions.isAnnouncement(ch) ? "channel-hash-announcement" : ""}">
          ${ChatPermissions.isForum(ch)
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 16H11l-5.5 4v-4.25a2.5 2.5 0 0 1-1-2.25v-8Z"/><path d="M8 8h8M8 11h6"/></svg>`
            : ChatPermissions.isAnnouncement(ch)
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4M7 9l10-4v14L7 15V9zM7 15l-2 5h4l2-4"/></svg>`
            : "#"}
        </span>
        <span class="channel-name">${escapeHtml(displayName)}</span>
      </button>
    `;
    };
    container.innerHTML = normal.map(ch => renderItem(ch, "main")).join("");
    if (importantContainer) importantContainer.innerHTML = announcements.map(ch => renderItem(ch, "important")).join("");
    else container.insertAdjacentHTML("beforeend", announcements.map(ch => renderItem(ch, "important")).join(""));

    const bindItems = (target, category) => {
      target.querySelectorAll(`.channel-item[data-channel-category="${category}"]`).forEach(btn => {
        btn.addEventListener("click", () => {
          const channel = this.list.find(c => c.id === btn.dataset.id);
          if (!channel) return;
          this.setActive(target, channel.id);
          onSelect(channel);
        });
      });
    };
    bindItems(container, "main");
    if (importantContainer) bindItems(importantContainer, "important");
    else bindItems(container, "important");

    if (staffContainer) {
      staffContainer.innerHTML = staff.map(ch => {
        const displayName = blurChannelDisplayName(ch);
        return `
        <button type="button" class="channel-item staff-channel ${ChatPermissions.isAnnouncement(ch) ? "announcement" : ""} ${ChatPermissions.isForum(ch) ? "forum" : ""} ${ch.id === this.activeId ? "active" : ""}" data-id="${ch.id}" data-channel-category="staff" title="${escapeHtml(ch.topic || displayName)}">
          <span class="channel-hash channel-hash-announcement">${ch.is_log ? "≡" : (ChatPermissions.isAnnouncement(ch) ? "!" : (ChatPermissions.isForum(ch) ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 16H11l-5.5 4v-4.25a2.5 2.5 0 0 1-1-2.25v-8Z"/><path d="M8 8h8M8 11h6"/></svg>` : "#"))}</span>
          <span class="channel-name">${escapeHtml(displayName)}</span>
        </button>`;
      }).join("");
      bindItems(staffContainer, "staff");
      staffContainer.hidden = !staff.length;
    }
  },

  setActive(container, id){
    this.activeId = id;
    document.querySelectorAll("#channel-list .channel-item, #important-channel-list .channel-item, #staff-channel-list .channel-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });
  }
};
