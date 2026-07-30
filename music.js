/* =========================================================
   music.js
   Talks to a Verome API instance (https://github.com/Kirazul/Verome-API).
   Point VEROME at your own local `deno run` server or a hosted
   deployment (e.g. https://verome-api.deno.dev).
   ========================================================= */

const VEROME = "https://verome.graysonzsimmons.deno.net";
const FALLBACK_COVER = "assets/icons/music.png";
const PLAYLISTS_STORAGE_KEY = "blur-music-playlists";
const HISTORY_STORAGE_KEY = "blur-music-history";

const els = {
  navBtns: document.querySelectorAll(".music-nav-btn"),
  views: document.querySelectorAll(".music-view"),

  search: document.getElementById("music-search"),
  spinner: document.getElementById("music-search-spinner"),
  filters: document.querySelectorAll(".music-filter"),
  results: document.getElementById("music-results"),

  queueList: document.getElementById("music-queue-list"),
  queueBadge: document.getElementById("music-queue-badge"),
  relatedList: document.getElementById("music-related-list"),
  historyList: document.getElementById("music-history-list"),

  // playlists
  playlistsGrid: document.getElementById("music-playlists-grid"),
  playlistsGridWrap: document.getElementById("music-playlists-grid-view"),
  playlistDetailWrap: document.getElementById("music-playlist-detail-view"),
  playlistDetailTitle: document.getElementById("music-playlist-detail-title"),
  playlistDetailCount: document.getElementById("music-playlist-detail-count"),
  playlistDetailList: document.getElementById("music-playlist-detail-list"),
  playlistDetailBack: document.getElementById("music-playlist-back"),
  playlistDetailDelete: document.getElementById("music-playlist-delete"),
  playlistDetailPlayAll: document.getElementById("music-playlist-play-all"),
  newPlaylistBtn: document.getElementById("music-new-playlist-btn"),
  newPlaylistInput: document.getElementById("music-new-playlist-input"),

  shuffleBtn: document.getElementById("music-shuffle"),
  repeatBtn: document.getElementById("music-repeat"),
  repeatOneBadge: document.querySelector(".music-repeat-one"),

  audio: document.getElementById("music-audio"),
  cover: document.getElementById("music-cover"),
  title: document.getElementById("music-title"),
  artist: document.getElementById("music-artist"),

  prevBtn: document.getElementById("music-prev"),
  playBtn: document.getElementById("music-play"),
  nextBtn: document.getElementById("music-next"),

  progress: document.getElementById("music-progress"),
  progressFill: document.getElementById("music-progress-fill"),
  progressHandle: document.getElementById("music-progress-handle"),
  timeCurrent: document.getElementById("music-time-current"),
  timeTotal: document.getElementById("music-time-total"),
  volume: document.getElementById("music-volume"),

  // fullscreen "Now Playing" view
  npRoot: document.getElementById("music-nowplaying"),
  npBgImage: document.getElementById("np-bg-image"),
  npClose: document.getElementById("np-close"),
  npCover: document.getElementById("np-cover"),
  npTitle: document.getElementById("np-title"),
  npArtist: document.getElementById("np-artist"),
  npLyricsBody: document.getElementById("np-lyrics-body"),

  npShuffle: document.getElementById("np-shuffle"),
  npPrev: document.getElementById("np-prev"),
  npPlay: document.getElementById("np-play"),
  npNext: document.getElementById("np-next"),
  npRepeat: document.getElementById("np-repeat"),
  npRepeatOneBadge: document.querySelector("#np-repeat .music-repeat-one"),

  npProgress: document.getElementById("np-progress"),
  npProgressFill: document.getElementById("np-progress-fill"),
  npProgressHandle: document.getElementById("np-progress-handle"),
  npTimeCurrent: document.getElementById("np-time-current"),
  npTimeTotal: document.getElementById("np-time-total"),
};

const state = {
  queue: [],
  history: [],
  current: null,
  shuffle: false,
  repeatMode: "off",   // off -> all -> one -> off
  filter: "songs",
  npOpen: false,
  lyricsCache: new Map(),

  // playlists
  playlists: [],        // [{ id, name, tracks: [track, ...] }]
  activePlaylistId: null,
};

let searchDebounce = null;
let searchAbort = null;
let isSeeking = false;
let seekTarget = null;
let openPlaylistMenu = null; // currently-open "add to playlist" popover

/* ---------------- sidebar view switching ---------------- */

els.navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    els.navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.view;
    els.views.forEach(v => v.classList.toggle("active", v.dataset.viewPanel === target));
    if (target === "playlists") {
      showPlaylistsGrid();
    }
  });
});

/* ---------------- search ---------------- */

els.filters.forEach(btn => {
  btn.addEventListener("click", () => {
    els.filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.filter;
    const query = els.search.value.trim();
    if (query) runSearch(query);
  });
});

els.search.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const query = els.search.value.trim();

  if (!query) {
    els.results.innerHTML = `<p class="music-empty">Search for a song to get started.</p>`;
    return;
  }

  searchDebounce = setTimeout(() => runSearch(query), 350);
});

els.search.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  clearTimeout(searchDebounce);
  const query = els.search.value.trim();
  if (query) runSearch(query);
});

async function runSearch(query) {

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  els.spinner.hidden = false;
  els.results.innerHTML = `
    <div class="music-results-loading">
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
    </div>
  `;

  try {

    const res = await fetch(
      `${VEROME}/api/search?q=${encodeURIComponent(query)}&filter=${state.filter}`,
      { signal: searchAbort.signal }
    );

    if (!res.ok) throw new Error(`Search failed (${res.status})`);

    const data = await res.json();
    renderSearchResults(data.results || []);

  } catch (err) {

    if (err.name === "AbortError") return;

    console.error("Search error:", err);
    els.results.innerHTML = `<p class="music-error">Couldn't reach the music server. Is the Verome API running at ${VEROME}?</p>`;

  } finally {
    els.spinner.hidden = true;
  }
}

function renderSearchResults(items) {

  els.results.innerHTML = "";

  if (!items.length) {
    els.results.innerHTML = `<p class="music-empty">No results found.</p>`;
    return;
  }

  if (state.filter !== "songs") {
    // Albums / artists: browsing their contents isn't wired up here, so
    // show them as read-only reference rows instead of pretending they play.
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "song-card browse-only";
      const image = item.thumbnails?.[0]?.url || FALLBACK_COVER;
      card.innerHTML = `
        <div class="song-card-cover ${state.filter === "artists" ? "round" : ""}">
          <img src="${image}" onerror="this.src='${FALLBACK_COVER}'">
        </div>
        <div class="song-card-body">
          <strong>${escapeHtml(item.title || "Untitled")}</strong>
          <span>${escapeHtml(state.filter === "artists" ? "Artist" : (item.artists?.[0]?.name || "Album"))}</span>
        </div>
      `;
      els.results.appendChild(card);
    });
    return;
  }

  const tracks = items.filter(s => s.videoId).map(toTrackFromSearch);

  tracks.forEach((track, i) => {
    const card = buildSongCard(track, {
      onPlay: () => playFromList(tracks, i),
      onQueue: () => addToQueue(track),
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
    });
    els.results.appendChild(card);
  });

}

function toTrackFromSearch(song) {
  return {
    videoId: song.videoId,
    title: song.title || "Untitled",
    artist: song.artists?.[0]?.name || "Unknown Artist",
    thumbnail: song.thumbnails?.[0]?.url || FALLBACK_COVER,
    duration: song.duration || "",
  };
}

function toTrackFromRelated(item) {
  return {
    videoId: item.videoId,
    title: item.title || "Untitled",
    artist: item.artist || "Unknown Artist",
    thumbnail: item.thumbnail || FALLBACK_COVER,
    duration: item.duration || "",
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------------- shared song-card builder ---------------- */

function buildSongCard(track, { onPlay, onQueue, onRemove, onAddToPlaylist } = {}) {

  const card = document.createElement("div");
  card.className = "song-card";
  if (state.current && state.current.videoId === track.videoId) card.classList.add("playing");

  card.innerHTML = `
    <div class="song-card-cover">
      <img src="${track.thumbnail}" onerror="this.src='${FALLBACK_COVER}'">
      <div class="song-card-playing-icon"><span></span><span></span><span></span></div>
    </div>
    <div class="song-card-body">
      <strong>${escapeHtml(track.title)}</strong>
      <span>${escapeHtml(track.artist)}</span>
    </div>
    <span class="song-card-duration">${escapeHtml(track.duration)}</span>
    <div class="song-card-actions"></div>
  `;

  const actions = card.querySelector(".song-card-actions");

  if (onAddToPlaylist) {
    const btn = document.createElement("button");
    btn.className = "song-card-action";
    btn.title = "Add to playlist";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle><line x1="21" y1="2" x2="21" y2="8"></line><line x1="18" y1="5" x2="24" y2="5"></line></svg>`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); onAddToPlaylist(btn); });
    actions.appendChild(btn);
  }

  if (onQueue) {
    const btn = document.createElement("button");
    btn.className = "song-card-action";
    btn.title = "Add to queue";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); onQueue(); });
    actions.appendChild(btn);
  }

  if (onRemove) {
    const btn = document.createElement("button");
    btn.className = "song-card-action song-card-remove";
    btn.title = "Remove";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); onRemove(); });
    actions.appendChild(btn);
  }

  if (onPlay) card.addEventListener("click", onPlay);

  return card;
}

/* ---------------- queue / history state + rendering ---------------- */

function playFromList(tracks, index) {
  const track = tracks[index];

  state.queue = tracks.slice(index + 1);

  // Add immediately to recently played
  state.history = state.history.filter(
    t => t.videoId !== track.videoId
  );

  state.history.unshift(track);

  if (state.history.length > 25) {
    state.history.pop();
  }

  state.current = track;

  saveHistory();
  renderHistory();

  renderQueue();
  loadAndPlay(track);
}

function addToQueue(track) {
  state.queue.push(track);
  renderQueue();
}

function setCurrent(track) {
  state.current = track;
  renderHistory();
}

function renderQueue() {

  els.queueList.innerHTML = "";
  updateQueueBadge();

  if (!state.queue.length) {
    els.queueList.innerHTML = `<p class="music-empty">Nothing queued. Play a song and the rest of your results will line up here.</p>`;
    return;
  }

  state.queue.forEach((track, i) => {
    const card = buildSongCard(track, {
      onPlay: () => {
        const [picked] = state.queue.splice(i, 1);
        setCurrent(picked);
        renderQueue();
        loadAndPlay(picked);
      },
      onRemove: () => {
        state.queue.splice(i, 1);
        renderQueue();
      },
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
    });
    els.queueList.appendChild(card);
  });

}

function renderHistory() {

  els.historyList.innerHTML = "";

  if (!state.history.length) {
    els.historyList.innerHTML = `<p class="music-empty">Tracks you play will show up here.</p>`;
    return;
  }

  state.history.forEach((track, i) => {
    const card = buildSongCard(track, {
      onPlay: () => {
        const [picked] = state.history.splice(i, 1);
        setCurrent(picked);
        renderHistory();
        loadAndPlay(picked);
      },
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
    });
    els.historyList.appendChild(card);
  });

}

function updateQueueBadge() {
  if (state.queue.length) {
    els.queueBadge.hidden = false;
    els.queueBadge.textContent = state.queue.length;
  } else {
    els.queueBadge.hidden = true;
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    state.history = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Couldn't load history:", err);
    state.history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(state.history)
    );
  } catch (err) {
    console.error("Couldn't save history:", err);
  }
}

/* ---------------- related ---------------- */

async function loadRelated(track) {

  els.relatedList.innerHTML = `
    <div class="music-results-loading">
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
    </div>
  `;

  try {

    const res = await fetch(`${VEROME}/api/related/${track.videoId}`);
    if (!res.ok) throw new Error(`Related lookup failed (${res.status})`);

    const data = await res.json();
    const related = (data.data || []).filter(r => r.videoId).map(toTrackFromRelated);

    els.relatedList.innerHTML = "";

    if (!related.length) {
      els.relatedList.innerHTML = `<p class="music-empty">No related tracks found.</p>`;
      return;
    }

    related.forEach((rTrack, i) => {
      const card = buildSongCard(rTrack, {
        onPlay: () => playFromList(related, i),
        onQueue: () => addToQueue(rTrack),
        onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(rTrack, anchorEl),
      });
      els.relatedList.appendChild(card);
    });

  } catch (err) {
    console.error("Related error:", err);
    els.relatedList.innerHTML = `<p class="music-error">Couldn't load related tracks.</p>`;
  }

}

/* ---------------- playlists ----------------
   Playlists live entirely on the client (localStorage) since the
   Verome API has no concept of them. A playlist is just
   { id, name, tracks: [track, ...] }. */

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    state.playlists = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Couldn't load playlists:", err);
    state.playlists = [];
  }
}

function savePlaylists() {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(state.playlists));
  } catch (err) {
    console.error("Couldn't save playlists:", err);
  }
}

function makePlaylistId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createPlaylist(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const playlist = { id: makePlaylistId(), name: trimmed, tracks: [] };
  state.playlists.push(playlist);
  savePlaylists();
  renderPlaylistsGrid();
  return playlist;
}

function deletePlaylist(id) {
  state.playlists = state.playlists.filter(p => p.id !== id);
  savePlaylists();
  if (state.activePlaylistId === id) showPlaylistsGrid();
  else renderPlaylistsGrid();
}

function addTrackToPlaylist(playlistId, track) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  if (playlist.tracks.some(t => t.videoId === track.videoId)) return; // already in there
  playlist.tracks.push(track);
  savePlaylists();
  renderPlaylistsGrid();
  if (state.activePlaylistId === playlistId) renderPlaylistDetail(playlist);
}

function removeTrackFromPlaylist(playlistId, videoId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  playlist.tracks = playlist.tracks.filter(t => t.videoId !== videoId);
  savePlaylists();
  renderPlaylistsGrid();
  if (state.activePlaylistId === playlistId) renderPlaylistDetail(playlist);
}

/* ---- playlist grid view ---- */

function showPlaylistsGrid() {
  state.activePlaylistId = null;
  if (els.playlistsGridWrap) els.playlistsGridWrap.hidden = false;
  if (els.playlistDetailWrap) els.playlistDetailWrap.hidden = true;
  renderPlaylistsGrid();
}

function renderPlaylistsGrid() {

  if (!els.playlistsGrid) return;
  els.playlistsGrid.innerHTML = "";

  if (!state.playlists.length) {
    els.playlistsGrid.innerHTML = `<p class="music-empty">No playlists yet. Create one above, or hit the playlist icon on any song.</p>`;
    return;
  }

  state.playlists.forEach(playlist => {
    const card = document.createElement("div");
    card.className = "playlist-card";

    const covers = playlist.tracks.slice(0, 4).map(t => t.thumbnail || FALLBACK_COVER);
    while (covers.length < 4) covers.push(null);

    card.innerHTML = `
      <div class="playlist-card-cover ${covers.filter(Boolean).length <= 1 ? "single" : ""}">
        ${covers.map(src => src
          ? `<img src="${src}" onerror="this.src='${FALLBACK_COVER}'">`
          : `<div class="playlist-card-cover-blank"></div>`
        ).join("")}
      </div>
      <div class="playlist-card-body">
        <strong>${escapeHtml(playlist.name)}</strong>
        <span>${playlist.tracks.length} track${playlist.tracks.length === 1 ? "" : "s"}</span>
      </div>
    `;

    card.addEventListener("click", () => openPlaylistDetail(playlist.id));
    els.playlistsGrid.appendChild(card);
  });

}

if (els.newPlaylistBtn && els.newPlaylistInput) {
  const submitNewPlaylist = () => {
    const name = els.newPlaylistInput.value;
    if (createPlaylist(name)) els.newPlaylistInput.value = "";
  };
  els.newPlaylistBtn.addEventListener("click", submitNewPlaylist);
  els.newPlaylistInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitNewPlaylist();
  });
}

/* ---- playlist detail view ---- */

function openPlaylistDetail(playlistId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  state.activePlaylistId = playlistId;
  if (els.playlistsGridWrap) els.playlistsGridWrap.hidden = true;
  if (els.playlistDetailWrap) els.playlistDetailWrap.hidden = false;
  renderPlaylistDetail(playlist);
}

function renderPlaylistDetail(playlist) {

  if (!els.playlistDetailList) return;

  if (els.playlistDetailTitle) els.playlistDetailTitle.textContent = playlist.name;
  if (els.playlistDetailCount) {
    els.playlistDetailCount.textContent = `${playlist.tracks.length} track${playlist.tracks.length === 1 ? "" : "s"}`;
  }

  els.playlistDetailList.innerHTML = "";

  if (!playlist.tracks.length) {
    els.playlistDetailList.innerHTML = `<p class="music-empty">This playlist is empty. Add songs from Search using the playlist icon.</p>`;
    return;
  }

  playlist.tracks.forEach((track) => {
    const card = buildSongCard(track, {
      onPlay: () => playFromList(playlist.tracks, playlist.tracks.indexOf(track)),
      onRemove: () => removeTrackFromPlaylist(playlist.id, track.videoId),
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
    });
    els.playlistDetailList.appendChild(card);
  });

}

els.playlistDetailBack?.addEventListener("click", showPlaylistsGrid);

els.playlistDetailDelete?.addEventListener("click", () => {
  if (!state.activePlaylistId) return;
  const playlist = state.playlists.find(p => p.id === state.activePlaylistId);
  if (!playlist) return;
  if (confirm(`Delete "${playlist.name}"? This can't be undone.`)) {
    deletePlaylist(playlist.id);
  }
});

els.playlistDetailPlayAll?.addEventListener("click", () => {
  const playlist = state.playlists.find(p => p.id === state.activePlaylistId);
  if (!playlist || !playlist.tracks.length) return;
  playFromList(playlist.tracks, 0);
});

/* ---- "add to playlist" popover, used from any song card ---- */

function closePlaylistMenu() {
  if (openPlaylistMenu) {
    openPlaylistMenu.remove();
    openPlaylistMenu = null;
  }
}

function openAddToPlaylistMenu(track, anchorEl) {

  if (openPlaylistMenu) {
    const wasForThisAnchor = openPlaylistMenu.dataset.anchorFor === anchorEl.dataset.menuId;
    closePlaylistMenu();
    if (wasForThisAnchor) return; // clicking the same button again just closes it
  }

  const menu = document.createElement("div");
  menu.className = "playlist-menu";

  const list = state.playlists.map(p => `
    <button class="playlist-menu-item" data-playlist-id="${p.id}">
      <span>${escapeHtml(p.name)}</span>
      ${p.tracks.some(t => t.videoId === track.videoId) ? `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
    </button>
  `).join("");

  menu.innerHTML = `
    ${state.playlists.length ? `<div class="playlist-menu-list">${list}</div>` : `<p class="playlist-menu-empty">No playlists yet.</p>`}
    <div class="playlist-menu-new">
      <input type="text" class="playlist-menu-input" placeholder="New playlist name">
      <button class="playlist-menu-add">Add</button>
    </div>
  `;

  document.body.appendChild(menu);

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  let left = rect.right - menu.offsetWidth;
  left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8));
  menu.style.left = `${left + window.scrollX}px`;

  menu.querySelectorAll(".playlist-menu-item").forEach(item => {
    item.addEventListener("click", () => {
      addTrackToPlaylist(item.dataset.playlistId, track);
      closePlaylistMenu();
    });
  });

  const input = menu.querySelector(".playlist-menu-input");
  const addBtn = menu.querySelector(".playlist-menu-add");
  const submitNew = () => {
    const playlist = createPlaylist(input.value);
    if (playlist) {
      addTrackToPlaylist(playlist.id, track);
      closePlaylistMenu();
    }
  };
  addBtn.addEventListener("click", submitNew);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitNew();
  });
  input.addEventListener("click", (e) => e.stopPropagation());

  menu.addEventListener("click", (e) => e.stopPropagation());

  openPlaylistMenu = menu;
}

document.addEventListener("click", closePlaylistMenu);
window.addEventListener("scroll", closePlaylistMenu, true);

loadPlaylists();
loadHistory();
renderHistory();

/* ---------------- shuffle / repeat ----------------
   Both the sidebar mode buttons and the fullscreen Now Playing
   buttons drive the same state, so every toggle updates both
   sets of UI at once. */

function updateShuffleUI() {
  [els.shuffleBtn, els.npShuffle].forEach(b => b && b.classList.toggle("active", state.shuffle));
}

function updateRepeatUI() {
  [els.repeatBtn, els.npRepeat].forEach(b => b && b.classList.toggle("active", state.repeatMode !== "off"));
  [els.repeatOneBadge, els.npRepeatOneBadge].forEach(b => b && (b.hidden = state.repeatMode !== "one"));
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  updateShuffleUI();
}

function cycleRepeat() {
  state.repeatMode = state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off";
  updateRepeatUI();
}

[els.shuffleBtn, els.npShuffle].forEach(b => b && b.addEventListener("click", toggleShuffle));
[els.repeatBtn, els.npRepeat].forEach(b => b && b.addEventListener("click", cycleRepeat));

/* ---------------- transport: prev / next ---------------- */

function handlePrev() {

  if (els.audio.currentTime > 3 || !state.history.length) {
    els.audio.currentTime = 0;
    return;
  }

  const track = state.history.shift();
  saveHistory();
  if (state.current) state.queue.unshift(state.current);
  state.current = track;
  renderHistory();
  renderQueue();
  loadAndPlay(track);

}

function advance() {

  if (!state.queue.length) {
    if (state.repeatMode === "all" && state.history.length) {
      state.queue = [...state.history].reverse();
      state.history = [];
    } else {
      return;
    }
  }

  const idx = state.shuffle ? Math.floor(Math.random() * state.queue.length) : 0;
  const [track] = state.queue.splice(idx, 1);
  setCurrent(track);
  renderQueue();
  loadAndPlay(track);

}

[els.prevBtn, els.npPrev].forEach(b => b && b.addEventListener("click", handlePrev));
[els.nextBtn, els.npNext].forEach(b => b && b.addEventListener("click", () => advance()));

/* ---------------- playback ---------------- */

async function loadAndPlay(track) {

  els.title.textContent = track.title;
  els.artist.textContent = track.artist;
  els.cover.src = track.thumbnail;

  if (els.npTitle) els.npTitle.textContent = track.title;
  if (els.npArtist) els.npArtist.textContent = track.artist;
  if (els.npCover) els.npCover.src = track.thumbnail;
  if (els.npBgImage) els.npBgImage.src = track.thumbnail;

  setPlayState("loading");
  setPlayDisabled(true);

  loadLyrics(track);
  loadRelated(track);

  try {

    const res = await fetch(`${VEROME}/api/stream?id=${track.videoId}`);
    if (!res.ok) throw new Error(`Stream lookup failed (${res.status})`);

    const data = await res.json();

    if (!data.success || !data.streamingUrls?.length) {
      throw new Error("No streaming sources available for this track");
    }

const stream =
  data.streamingUrls.find(s =>
    (s.type || s.mimeType || "").includes("audio/mp4")
  ) ||
  data.streamingUrls.find(s =>
    (s.type || s.mimeType || "").includes("audio/webm")
  ) ||
  data.streamingUrls.find(s => s.url) ||
  data.streamingUrls[0];

console.log("Chosen stream:", stream);

const streamUrl = typeof stream.url === "string"
  ? stream.url
  : stream.url?.url;

if (!streamUrl) {
  throw new Error("Stream URL missing");
}

els.audio.pause();
els.audio.removeAttribute("src");
els.audio.load();

els.audio.src = streamUrl;
els.audio.load();

await els.audio.play();

    setPlayDisabled(false);
    setPlayState("playing");

  } catch (err) {

    console.error("Playback error:", err);
    els.title.textContent = "Couldn't play this track";
    els.artist.textContent = err.message || "Try another song";
    if (els.npTitle) els.npTitle.textContent = "Couldn't play this track";
    if (els.npArtist) els.npArtist.textContent = err.message || "Try another song";
    setPlayState("idle");

  }

  document.querySelectorAll(".song-card").forEach(c => c.classList.remove("playing"));
  renderQueue();
  renderHistory();
  if (state.activePlaylistId) {
    const playlist = state.playlists.find(p => p.id === state.activePlaylistId);
    if (playlist) renderPlaylistDetail(playlist);
  }

}

function togglePlayPause() {
  if (!els.audio.src) return;

  if (els.audio.paused) {
    els.audio.play().catch(err => console.error("Audio error:", err));
  } else {
    els.audio.pause();
  }
}

[els.playBtn, els.npPlay].forEach(b => b && b.addEventListener("click", togglePlayPause));

els.audio.addEventListener("play", () => setPlayState("playing"));
els.audio.addEventListener("pause", () => setPlayState("paused"));
els.audio.addEventListener("waiting", () => setPlayState("loading"));
els.audio.addEventListener("playing", () => setPlayState("playing"));

els.audio.addEventListener("ended", () => {
  if (state.repeatMode === "one") {
    els.audio.currentTime = 0;
    els.audio.play();
    return;
  }
  advance();
});

// Both play buttons (mini player + fullscreen) share this logic so they
// never fall out of sync with each other or with the actual audio state.
function setPlayState(playState) {
  [els.playBtn, els.npPlay].forEach(btn => {
    if (!btn) return;
    btn.dataset.state = playState;
    btn.setAttribute("aria-label", playState === "playing" ? "Pause" : "Play");
  });
}

function setPlayDisabled(disabled) {
  [els.playBtn, els.npPlay].forEach(b => b && (b.disabled = disabled));
}

/* ---------------- progress bar ----------------
   Mirrors position/time across the mini player and the
   fullscreen view, and lets the user drag either one. */

els.audio.addEventListener("timeupdate", () => {
  if (isSeeking || !els.audio.duration) return;
  updateProgress(els.audio.currentTime / els.audio.duration);
  setTimeCurrentText(formatTime(els.audio.currentTime));
  updateActiveLyricLine(els.audio.currentTime);
});

els.audio.addEventListener("loadedmetadata", () => {
  setTimeTotalText(formatTime(els.audio.duration));
});

function updateProgress(ratio) {
  const pct = Math.min(1, Math.max(0, ratio)) * 100;
  [[els.progressFill, els.progressHandle], [els.npProgressFill, els.npProgressHandle]].forEach(([fill, handle]) => {
    if (!fill || !handle) return;
    fill.style.width = pct + "%";
    handle.style.left = pct + "%";
  });
}

function setTimeCurrentText(text) {
  if (els.timeCurrent) els.timeCurrent.textContent = text;
  if (els.npTimeCurrent) els.npTimeCurrent.textContent = text;
}

function setTimeTotalText(text) {
  if (els.timeTotal) els.timeTotal.textContent = text;
  if (els.npTimeTotal) els.npTimeTotal.textContent = text;
}

function seekFromEvent(e, progressEl) {
  if (!els.audio.duration) return;
  const rect = progressEl.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  updateProgress(ratio);
  setTimeCurrentText(formatTime(ratio * els.audio.duration));
  return ratio;
}

[els.progress, els.npProgress].forEach(progressEl => {
  if (!progressEl) return;
  progressEl.addEventListener("mousedown", (e) => {
    isSeeking = true;
    seekTarget = progressEl;
    seekFromEvent(e, progressEl);
  });
});

window.addEventListener("mousemove", (e) => {
  if (!isSeeking || !seekTarget) return;
  seekFromEvent(e, seekTarget);
});

window.addEventListener("mouseup", (e) => {
  if (!isSeeking || !seekTarget) return;
  isSeeking = false;
  const ratio = seekFromEvent(e, seekTarget);
  if (els.audio.duration && ratio != null) {
    els.audio.currentTime = ratio * els.audio.duration;
  }
  seekTarget = null;
});

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ---------------- volume ---------------- */

els.volume.addEventListener("input", () => {
  els.audio.volume = Number(els.volume.value) / 100;
});

els.audio.volume = Number(els.volume.value) / 100;

/* ---------------- fullscreen "Now Playing" ---------------- */

function openNowPlaying() {
  state.npOpen = true;
  els.npRoot.classList.add("open");
}

function closeNowPlaying() {
  state.npOpen = false;
  els.npRoot.classList.remove("open");
}

document.querySelectorAll(".js-toggle-np").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.npOpen) closeNowPlaying();
    else openNowPlaying();
  });
});

els.npClose?.addEventListener("click", closeNowPlaying);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.npOpen) closeNowPlaying();
});

/* ---------------- lyrics ---------------- */

async function loadLyrics(track) {

  if (state.lyricsCache.has(track.videoId)) {
    renderLyrics(state.lyricsCache.get(track.videoId));
    return;
  }

  if (els.npLyricsBody) els.npLyricsBody.innerHTML = `<p class="music-empty">Loading lyrics...</p>`;

  try {

    const res = await fetch(
      `${VEROME}/api/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`
    );

    if (!res.ok) throw new Error("Lyrics lookup failed");

    const data = await res.json();
    const parsed = parseLyricsResponse(data);
    state.lyricsCache.set(track.videoId, parsed);
    renderLyrics(parsed);

  } catch (err) {
    console.error("Lyrics error:", err);
    const parsed = { lines: null, plain: null };
    state.lyricsCache.set(track.videoId, parsed);
    renderLyrics(parsed);
  }

}

// The API's exact lyrics field names aren't pinned down here, so this
// checks the common variants (synced LRC string, or plain text) rather
// than assuming one shape.
function parseLyricsResponse(data) {

  const syncedRaw = data.syncedLyrics || data.lrc || data.synced || null;
  const plainRaw = data.plainLyrics || data.lyrics || data.plain || null;

  if (syncedRaw && typeof syncedRaw === "string") {
    const lines = [];
    const lineRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?\]\s*(.*)/g;
    let match;
    while ((match = lineRe.exec(syncedRaw)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const cs = match[3] ? parseInt(match[3].padEnd(2, "0"), 10) : 0;
      const time = mins * 60 + secs + cs / 100;
      const text = match[4].trim();
      if (text) lines.push({ time, text });
    }
    if (lines.length) return { lines, plain: null };
  }

  if (plainRaw && typeof plainRaw === "string" && plainRaw.trim()) {
    return { lines: null, plain: plainRaw.trim() };
  }

  return { lines: null, plain: null };
}

function renderLyrics(parsed) {

  if (!els.npLyricsBody) return;
  els.npLyricsBody.innerHTML = "";

  if (parsed.lines && parsed.lines.length) {
    parsed.lines.forEach(line => {
      const p = document.createElement("p");
      p.className = "np-lyric-line";
      p.dataset.time = line.time;
      p.textContent = line.text;
      els.npLyricsBody.appendChild(p);
    });
    return;
  }

  if (parsed.plain) {
    const p = document.createElement("p");
    p.className = "np-lyric-plain";
    p.textContent = parsed.plain;
    els.npLyricsBody.appendChild(p);
    return;
  }

  els.npLyricsBody.innerHTML = `<p class="music-empty">No lyrics found for this track.</p>`;

}

function updateActiveLyricLine(currentTime) {

  if (!els.npLyricsBody) return;

  const lines = els.npLyricsBody.querySelectorAll(".np-lyric-line");
  if (!lines.length) return;

  let activeLine = null;
  lines.forEach(line => {
    const t = parseFloat(line.dataset.time);
    if (t <= currentTime) activeLine = line;
  });

  lines.forEach(line => line.classList.toggle("active", line === activeLine));

  if (activeLine && state.npOpen) {
    activeLine.scrollIntoView({ block: "center", behavior: "smooth" });
  }

}