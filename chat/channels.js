/* =========================================================
   channels.js
   Fetches available channels and renders the Discord-style
   channel sidebar.
   ========================================================= */

const Channels = {

  list: [],
  activeId: null,

  async fetchAll(){
    const { data, error } = await sb
      .from("channels")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    this.list = data;
    return data;
  },

  render(container, onSelect){
    container.innerHTML = this.list.map(ch => `
      <button type="button" class="channel-item ${ch.id === this.activeId ? "active" : ""}" data-id="${ch.id}">
        <span class="channel-hash">#</span>
        <span class="channel-name">${escapeHtml(ch.name)}</span>
      </button>
    `).join("");

    container.querySelectorAll(".channel-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const channel = this.list.find(c => c.id === btn.dataset.id);
        this.setActive(container, channel.id);
        onSelect(channel);
      });
    });
  },

  setActive(container, id){
    this.activeId = id;
    container.querySelectorAll(".channel-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });
  }
};
