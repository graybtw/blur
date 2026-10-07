/* =========================================================
   Blur Music — Solara Player API adapter
   ========================================================= */
const SOLARA_API = "https://solara-player.graysonzsimmons.workers.dev/proxy";
const MUSIC_SOURCES = ["netease", "joox", "bilibili"];
const HOME_DISCOVERY_SOURCE = "joox";
const HOME_DISCOVERY_QUERIES = ["indie pop", "alternative rock", "r&b"];
const HOME_RECOMMENDATION_SOURCE = "joox";
const HOME_RECOMMENDATION_QUERIES = 3;
const HOME_RECOMMENDATION_COUNT = 16;
const MUSIC_GENRE_QUERY_ARTISTS = {
  Pop: ["Dua Lipa", "Ariana Grande", "The Weeknd"],
  "R&B": ["SZA", "Frank Ocean", "H.E.R."],
  "Hip-Hop": ["Kendrick Lamar", "Drake", "Travis Scott"],
  "Alternative Rock": ["Arctic Monkeys", "Paramore", "Radiohead"],
  "Indie Pop": ["Clairo", "beabadoobee", "Glass Animals"],
  Electronic: ["Fred again..", "Calvin Harris", "Daft Punk"],
  Country: ["Luke Combs", "Kacey Musgraves", "Zach Bryan"],
  Jazz: ["Laufey", "Ella Fitzgerald", "Miles Davis"],
};
const MAX_ARTWORK_REQUESTS = 3;
const FALLBACK_COVER = "assets/icons/music.png";
const PLAYLISTS_STORAGE_KEY = "blur-music-playlists";
const HISTORY_STORAGE_KEY = "blur-music-history";
const FAVORITES_STORAGE_KEY = "blur-music-favorites";

const els = {
  navBtns: document.querySelectorAll(".music-nav-btn"),
  views: document.querySelectorAll(".music-view"),
  libraryBtns: document.querySelectorAll(".music-library-tab"),
  libraryPanels: document.querySelectorAll(".music-library-panel"),

  // home
  homeWrap: document.getElementById("music-home-view"),
  homeHero: document.getElementById("music-home-hero"),
  homeTrending: document.getElementById("music-home-trending"),
  homeRecommendationEyebrow: document.getElementById("music-home-recommendation-eyebrow"),
  homeCharts: document.getElementById("music-home-charts"),
  homeLibrarySection: document.getElementById("music-home-library-section"),
  homeLibraryOpen: document.getElementById("music-home-library-open"),
  homeSearch: document.getElementById("music-home-search"),
  homePlayAll: document.getElementById("music-home-play-all"),
  search: document.getElementById("music-search"),
  searchQuery: document.getElementById("music-search-query"),
  spinner: document.getElementById("music-search-spinner"),
  searchSuggestions: document.getElementById("music-search-suggestions"),
  sourceBtns: document.querySelectorAll(".music-source-btn"),
  searchTabs: document.querySelectorAll(".music-search-tab"),
  filterBtn: document.getElementById("music-filter-btn"),
  filterPanel: document.getElementById("music-filter-panel"),
  filterClose: document.getElementById("music-filter-close"),
  filterSource: document.getElementById("music-filter-source"),
  filterPeriod: document.getElementById("music-filter-period"),
  filterFrom: document.getElementById("music-filter-from"),
  filterTo: document.getElementById("music-filter-to"),
  customYears: document.getElementById("music-custom-years"),
  filterCount: document.getElementById("music-filter-count"),
  filterNote: document.getElementById("music-filter-note"),
  filterClear: document.getElementById("music-filter-clear"),
  quality: document.getElementById("music-quality"),
  results: document.getElementById("music-results"),
  detailView: document.getElementById("music-detail-view"),
  detailBack: document.getElementById("music-detail-back"),
  detailBreadcrumb: document.getElementById("music-detail-breadcrumb"),
  detailContent: document.getElementById("music-detail-content"),

  queueList: document.getElementById("music-queue-list"),
  queueBadge: document.getElementById("music-queue-badge"),
  relatedList: document.getElementById("music-related-list"),
  historyList: document.getElementById("music-history-list"),

  // favorites
  favoritesList: document.getElementById("music-favorites-list"),

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
  favoriteBtn: document.getElementById("music-favorite-btn"),
  player: document.querySelector(".music-player"),
  floatingPlayer: document.getElementById("music-floating-player"),
  floatingCover: document.getElementById("music-floating-cover"),
  floatingTitle: document.getElementById("music-floating-title"),
  floatingArtist: document.getElementById("music-floating-artist"),
  floatingPlay: document.getElementById("music-floating-play"),
  floatingNext: document.getElementById("music-floating-next"),
  floatingCollapse: document.getElementById("music-floating-collapse"),
  floatingProgress: document.getElementById("music-floating-progress"),
  floatingProgressFill: document.getElementById("music-floating-progress-fill"),
  floatingTimeCurrent: document.getElementById("music-floating-time-current"),
  floatingTimeTotal: document.getElementById("music-floating-time-total"),

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
  npClose: document.getElementById("np-close"),
  npCover: document.getElementById("np-cover"),
  npTitle: document.getElementById("np-title"),
  npArtist: document.getElementById("np-artist"),
  npLyricsBody: document.getElementById("np-lyrics-body"),
  npFavoriteBtn: document.getElementById("np-favorite-btn"),

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
  source: "all",
  quality: "320",
  npOpen: false,
  lyricsCache: new Map(),
  artworkCache: new Map(),
  homeTracks: [],

  // playlists
  playlists: [],        // [{ id, name, tracks: [track, ...] }]
  activePlaylistId: null,

  // favorites
  favorites: [],         // [track, ...]

  // home
  homeLoaded: false,
  activeSiteTab: document.querySelector(".panel.active")?.dataset.panel || "home",
  searchType: "songs",
  searchFilters: { period: "any", from: "", to: "" },
  detailStack: [],
};

let searchDebounce = null;
let searchAbort = null;
let musicSearchSuggestionItems = [];
let musicSearchSuggestionQuery = "";
let activeMusicSuggestionIndex = -1;
let isSeeking = false;
let seekTarget = null;
let openPlaylistMenu = null; // currently-open "add to playlist" popover
let playbackRequestId = 0;
let detailRequestId = 0;
let activeArtworkRequests = 0;
let activeLibraryView = "playlists";
const artworkRequestQueue = [];

function updateFloatingPlayer(activeTab) {
  if (activeTab) state.activeSiteTab = activeTab;
  if (!els.floatingPlayer) return;

  const track = state.current;
  const miniPlayerDisabled = document.documentElement.classList.contains("music-miniplayer-disabled");
  els.floatingPlayer.hidden = !track || state.activeSiteTab === "music" || miniPlayerDisabled;
  if (!track) return;

  els.floatingTitle.textContent = track.title || "Unknown track";
  els.floatingArtist.textContent = track.artist || "Unknown artist";
  const key = trackIdentity(track);
  if (els.floatingPlayer.dataset.trackKey !== key) {
    els.floatingPlayer.dataset.trackKey = key;
    els.floatingCover.src = safeRemoteUrl(track.thumbnail) || FALLBACK_COVER;
    hydrateArtwork(track, els.floatingCover);
  }
}

window.updateMusicFloatingPlayer = updateFloatingPlayer;

/* ---------------- sidebar view switching ---------------- */

els.navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    els.navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.view;
    els.views.forEach(v => v.classList.toggle("active", v.dataset.viewPanel === target));
    if (target !== "search") {
      state.detailStack = [];
      detailRequestId++;
    }
    if (els.detailView) els.detailView.hidden = true;
    if (target === "library") renderPlaylistsGrid();
    if (target === "home") {
      showHomeGrid();
      if (!state.homeLoaded) loadHome();
    }
  });
});

function setLibraryView(target) {
  activeLibraryView = target;
  els.libraryBtns.forEach(button => {
    const selected = button.dataset.libraryView === target;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
  els.libraryPanels.forEach(panel => {
    const selected = panel.dataset.libraryPanel === target;
    panel.classList.toggle("active", selected);
    panel.hidden = !selected;
  });

  if (target === "playlists") showPlaylistsGrid();
  if (target === "favorites") renderFavorites();
  if (target === "history") renderHistory();
  if (target === "queue") renderQueue();
}

els.libraryBtns.forEach(button => {
  button.addEventListener("click", () => setLibraryView(button.dataset.libraryView));
});

document.getElementById("music-queue-open")?.addEventListener("click", () => {
  [...els.navBtns].find(button => button.dataset.view === "library")?.click();
  [...els.libraryBtns].find(button => button.dataset.libraryView === "queue")?.click();
});

/* ---------------- home ---------------- */

function showHomeGrid() {
  if (els.homeWrap) els.homeWrap.hidden = false;
}

async function requestSolara(params, signal) {
  const query = new URLSearchParams({ ...params, s: randomSignature() });
  const response = await fetch(`${SOLARA_API}?${query.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Music request failed (${response.status})`);
  const data = await response.json();
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Music service error");
  return data;
}

function randomSignature() {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function safeRemoteUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

const EXPLICIT_TITLE_RE = /\s*(?:\(\s*explicit\s*\)|\[\s*explicit\s*\]|[-–—:]\s*explicit|\bexplicit)\s*$/i;

function explicitTitleInfo(title) {
  const raw = String(title || "Untitled").trim();
  return {
    explicit: EXPLICIT_TITLE_RE.test(raw),
    title: raw.replace(EXPLICIT_TITLE_RE, "").trim() || raw,
  };
}

function normalizeSavedTrack(track) {
  if (!track || typeof track !== "object") return track;
  const info = explicitTitleInfo(track.title);
  return {
    ...track,
    title: info.title,
    explicit: Boolean(track.explicit || info.explicit),
  };
}

function isExplicitTrack(track) {
  return Boolean(track?.explicit || explicitTitleInfo(track?.title).explicit);
}

function explicitBadgeMarkup(track) {
  return isExplicitTrack(track)
    ? `<span class="music-explicit-badge" title="Explicit" aria-label="Explicit">E</span>`
    : "";
}

function toTrackFromSearch(song, fallbackSource = state.source === "all" ? "netease" : state.source) {
  const source = MUSIC_SOURCES.includes(song.source) ? song.source : fallbackSource;
  const id = song.id ?? song.url_id ?? song.urlId;
  if (id === undefined || id === null || id === "") return null;
  const artistName = item => typeof item === "string"
    ? item
    : item?.translatedName || item?.transName || item?.tns?.[0] || item?.name;
  const artist = Array.isArray(song.artist)
    ? song.artist.map(artistName).filter(Boolean).join(" / ")
    : artistName(song.artist) || (Array.isArray(song.artists) ? song.artists.map(artistName).filter(Boolean).join(" / ") : "Unknown Artist");
  const titleInfo = explicitTitleInfo(song.translatedName || song.transName || song.tns?.[0] || song.name || song.title || song.songTitle || "Untitled");
  const yearCandidate = song.releaseYear || song.release_year || song.year || song.publishYear || song.publish_year || song.publishTime;
  const releaseYear = String(yearCandidate || "").match(/(?:19|20)\d{2}/)?.[0] || "";
  return {
    id: String(id),
    source,
    // Solara's stream and lyrics endpoints use the canonical search id.
    urlId: String(id),
    lyricId: String(song.lyric_id || song.lyricId || id),
    picId: song.pic_id || song.picId || "",
    videoId: `${source}:${id}`,
    title: titleInfo.title,
    explicit: Boolean(song.explicit || song.isExplicit || song.explicitFlag || titleInfo.explicit),
    artist: typeof artist === "string" && artist.trim() ? artist : "Unknown Artist",
    album: song.album || "",
    releaseYear,
    thumbnail: safeRemoteUrl(song.thumbnail || song.image || song.cover || "") || FALLBACK_COVER,
    duration: song.durationText || song.duration || formatDuration(song.duration_seconds || song.dt / 1000),
  };
}

function sourceLabel(source) {
  return ({ netease: "NetEase", joox: "JOOX", bilibili: "Bilibili" })[source] || "Saved track";
}

function hydrateArtwork(track, image) {
  if (!track || !image) return;
  image.referrerPolicy = "no-referrer";
  image.onerror = () => {
    image.onerror = null;
    image.src = FALLBACK_COVER;
  };
  if (track.thumbnail && track.thumbnail !== FALLBACK_COVER) {
    const thumbnail = safeRemoteUrl(track.thumbnail);
    if (thumbnail) {
      image.src = thumbnail;
      return;
    }
  }
  image.src = FALLBACK_COVER;
  if (!track.picId || !track.source) return;
  image.__musicTrack = track;
  // Resolve independently of visibility: the Music panel can be hidden inside
  // the app shell when its images are rendered, which can strand observed
  // images on some layouts. Results are deduplicated by artworkCache.
  resolveArtwork(track, image);
}

async function resolveArtwork(track, image) {
  if (!track || !image || !track.picId || !track.source) return;
  const key = `${track.source}:${track.picId}`;
  if (!state.artworkCache.has(key)) {
    const artworkPromise = track.source === "joox"
      ? Promise.resolve(safeRemoteUrl(`https://image.joox.com/JOOXcover/0/${encodeURIComponent(String(track.picId))}/300`))
      : requestArtworkData({
        types: "pic",
        id: String(track.picId),
        source: track.source,
        size: "300",
      }).then(data => safeRemoteUrl(data?.url) || "").catch(error => {
        console.warn("Artwork lookup failed:", error.message);
        return "";
      });
    state.artworkCache.set(key, artworkPromise);
  }
  const artworkUrl = await state.artworkCache.get(key);
  if (!artworkUrl) {
    state.artworkCache.delete(key);
    return;
  }
  track.thumbnail = artworkUrl;
  if (image.isConnected) {
    image.onerror = () => {
      image.onerror = null;
      image.src = FALLBACK_COVER;
    };
    image.src = artworkUrl;
  }
  if (state.current && trackIdentity(state.current) === trackIdentity(track) && window.updateNowPlayingBackground) {
    window.updateNowPlayingBackground(artworkUrl);
  }
}

function requestArtworkData(params) {
  return new Promise((resolve, reject) => {
    artworkRequestQueue.push({ params, resolve, reject });
    pumpArtworkRequests();
  });
}

function pumpArtworkRequests() {
  while (activeArtworkRequests < MAX_ARTWORK_REQUESTS && artworkRequestQueue.length) {
    const request = artworkRequestQueue.shift();
    activeArtworkRequests++;
    fetchArtworkData(request.params)
      .then(request.resolve, request.reject)
      .finally(() => {
        activeArtworkRequests--;
        pumpArtworkRequests();
      });
  }
}

async function fetchArtworkData(params) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestSolara(params);
    } catch (error) {
      const retryable = /\((?:429|503)\)/.test(error.message);
      if (!retryable || attempt >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
}

function renderMusicHero(track, tracks, eyebrow = "Recommended from your listening") {
  if (!els.homeHero) return;
  els.homeHero.classList.remove("loading");
  els.homeHero.innerHTML = `
    <div class="music-featured-art"><img src="${FALLBACK_COVER}" alt="Album artwork" loading="lazy">${explicitBadgeMarkup(track)}</div>
    <div class="music-featured-copy">
      <p class="music-eyebrow">${escapeHtml(eyebrow)}</p>
      <h2>${escapeHtml(track.title)}</h2>
      <p class="music-featured-artist"><button type="button" class="music-artist-link" data-feature-artist>${escapeHtml(track.artist)}</button>${track.album ? ` <span>·</span> ${escapeHtml(track.album)}` : ""}</p>
      <div class="music-featured-actions">
        <button class="music-primary-action" type="button" data-feature-play>
          <svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>Play track
        </button>
        <button class="music-secondary-action" type="button" data-feature-queue>Add to queue</button>
        <button class="music-feature-favorite" type="button" aria-label="Add to favorites" title="Add to favorites" data-feature-favorite>
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>
        </button>
      </div>
    </div>
    <span class="music-featured-number">01 <span>/</span> ${String(tracks.length).padStart(2, "0")}</span>
  `;
  const artwork = els.homeHero.querySelector(".music-featured-art img");
  hydrateArtwork(track, artwork);
  els.homeHero.querySelector("[data-feature-artist]")?.addEventListener("click", event => {
    event.stopPropagation();
    openArtistPage(track.artist, [track]);
  });
  els.homeHero.querySelector("[data-feature-play]").addEventListener("click", () => playFromList(tracks, 0));
  els.homeHero.querySelector("[data-feature-queue]").addEventListener("click", () => addToQueue(track));
  const favorite = els.homeHero.querySelector("[data-feature-favorite]");
  favorite.dataset.favoriteKey = trackIdentity(track);
  favorite.classList.toggle("active", isFavorite(track));
  favorite.setAttribute("aria-label", isFavorite(track) ? "Remove from favorites" : "Add to favorites");
  favorite.title = isFavorite(track) ? "Remove from favorites" : "Add to favorites";
  favorite.addEventListener("click", () => {
    toggleFavorite(track);
    favorite.classList.toggle("active", isFavorite(track));
  });
}

function renderMusicFirstListenHero(tracks) {
  if (!els.homeHero) return;
  els.homeHero.classList.remove("loading");
  els.homeHero.innerHTML = `<div class="music-home-unavailable"><strong>Your music recommendations start with your first listen.</strong><span>Play any song below and Blur will use your listening history to pick something for you here.</span><div><button type="button" data-home-first-listen>Start listening</button></div></div>`;
  els.homeHero.querySelector("[data-home-first-listen]")?.addEventListener("click", () => {
    if (tracks?.length) playFromList(tracks, 0);
    else openMusicSearch();
  });
}

function renderHomeTracks(tracks) {
  if (!els.homeTrending) return;
  els.homeTrending.innerHTML = "";
  if (!tracks.length) {
    els.homeTrending.innerHTML = `<p class="ui-empty music-empty">No tracks are available right now. Try searching another source.</p>`;
    if (els.homePlayAll) els.homePlayAll.disabled = true;
    return;
  }
  if (els.homePlayAll) els.homePlayAll.disabled = false;
  tracks.slice(0, HOME_RECOMMENDATION_COUNT).forEach((track, index) => {
    els.homeTrending.appendChild(buildSongCard(track, {
      onPlay: () => playFromList(tracks, index),
      onQueue: () => addToQueue(track),
      onAddToPlaylist: anchor => openAddToPlaylistMenu(track, anchor),
      onFavorite: () => toggleFavorite(track),
      layout: "grid",
    }));
  });
}

function uniqueTracks(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track) return false;
    const key = trackIdentity(track);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadHomeRecommendations(fallbackTracks) {
  const fallback = uniqueTracks(fallbackTracks).slice(0, HOME_RECOMMENDATION_COUNT);
  const recent = state.history.slice(0, 8);

  if (!recent.length) {
    if (els.homeRecommendationEyebrow) els.homeRecommendationEyebrow.textContent = "Popular right now";
    state.homeTracks = fallback;
    renderHomeTracks(state.homeTracks);
    return state.homeTracks;
  }

  const recentKeys = new Set(recent.map(trackIdentity));
  const normalizeArtist = value => String(value || "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const recentArtists = [...new Set(recent
    .map(track => track.artist)
    .filter(artist => artist && artist !== "Unknown Artist")
    .map(normalizeArtist)
    .filter(Boolean))];
  const queries = recentArtists
    .slice(0, HOME_RECOMMENDATION_QUERIES);

  if (!queries.length) {
    if (els.homeRecommendationEyebrow) els.homeRecommendationEyebrow.textContent = "From your recent listening";
    state.homeTracks = uniqueTracks(recent).slice(0, HOME_RECOMMENDATION_COUNT);
    renderHomeTracks(state.homeTracks);
    return state.homeTracks;
  }

  try {
    const results = await Promise.allSettled(queries.map(query => requestSolara({
      types: "search",
      source: HOME_RECOMMENDATION_SOURCE,
      name: query,
      count: String(HOME_RECOMMENDATION_COUNT),
      pages: "1",
    })));
    const artistMatches = track => {
      const artist = normalizeArtist(track.artist);
      return artist && recentArtists.some(recentArtist => (
        artist === recentArtist || artist.includes(recentArtist) || recentArtist.includes(artist)
      ));
    };
    const recommendations = uniqueTracks(results
      .filter(result => result.status === "fulfilled")
      .flatMap(result => (Array.isArray(result.value) ? result.value : [])
        .map(item => toTrackFromSearch(item, HOME_RECOMMENDATION_SOURCE))
        .filter(isEnglishCatalogTrack)))
      .filter(artistMatches)
      .filter(track => !recentKeys.has(trackIdentity(track)))
      .slice(0, HOME_RECOMMENDATION_COUNT);

    const relevantBackup = uniqueTracks(recent.filter(artistMatches));
    const combined = uniqueTracks([...recommendations, ...relevantBackup]).slice(0, HOME_RECOMMENDATION_COUNT);
    if (els.homeRecommendationEyebrow) {
      els.homeRecommendationEyebrow.textContent = recommendations.length
        ? "Based on your listening"
        : "From your recent listening";
    }
    state.homeTracks = combined;
    renderHomeTracks(state.homeTracks);
    return state.homeTracks;
  } catch (error) {
    console.warn("Music recommendations unavailable:", error.message);
    const historyFallback = uniqueTracks(recent).slice(0, HOME_RECOMMENDATION_COUNT);
    if (els.homeRecommendationEyebrow) {
      els.homeRecommendationEyebrow.textContent = historyFallback.length
        ? "From your recent listening"
        : "Popular right now";
    }
    state.homeTracks = historyFallback.length ? historyFallback : fallback;
    renderHomeTracks(state.homeTracks);
    return state.homeTracks;
  }
}

function renderHomeLibrary() {
  if (!els.homeCharts || !els.homeLibrarySection) return;
  const saved = [...state.history, ...state.favorites]
    .filter((track, index, all) => all.findIndex(item => trackIdentity(item) === trackIdentity(track)) === index)
    .slice(0, 8);
  els.homeLibrarySection.hidden = !saved.length;
  els.homeCharts.innerHTML = "";
  saved.forEach(track => {
    els.homeCharts.appendChild(buildSongCard(track, {
      onPlay: () => playFromList(saved, saved.indexOf(track)),
      onQueue: () => addToQueue(track),
      onAddToPlaylist: anchor => openAddToPlaylistMenu(track, anchor),
      onFavorite: () => toggleFavorite(track),
      layout: "grid",
    }));
  });
}

async function loadHome() {
  if (!els.homeHero || state.homeLoaded) return;
  state.homeLoaded = true;
  els.homeHero.classList.add("loading");
  els.homeHero.innerHTML = `<p class="music-empty">Loading today's selection...</p>`;
  if (els.homeTrending) els.homeTrending.innerHTML = Array.from({ length: 4 }, () => `<div class="song-card-skeleton song-card-skeleton-grid"></div>`).join("");
  try {
    const queryResults = await Promise.allSettled(HOME_DISCOVERY_QUERIES.map(async name => {
      const data = await requestSolara({
        types: "search",
        source: HOME_DISCOVERY_SOURCE,
        name,
        count: "12",
        pages: "1",
      });
      return (Array.isArray(data) ? data : [])
        .map(item => toTrackFromSearch(item, HOME_DISCOVERY_SOURCE))
        .filter(isEnglishCatalogTrack)
        .slice(0, 12);
    }));
    const catalogResults = queryResults
      .filter(result => result.status === "fulfilled")
      .map(result => result.value);
    const tracks = mergeDiscoveryTracks(catalogResults).slice(0, 24);
    if (!tracks.length) throw new Error("The music service returned an empty playlist");
    const recommendations = await loadHomeRecommendations(tracks);
    if (!state.history.length) {
      renderMusicFirstListenHero(tracks);
    } else {
      const historyKeys = new Set(state.history.map(trackIdentity));
      const recommendedTrack = recommendations.find(track => !historyKeys.has(trackIdentity(track)))
        || tracks.find(track => !historyKeys.has(trackIdentity(track)))
        || recommendations[0]
        || state.history[0];
      const featuredQueue = [recommendedTrack, ...recommendations.filter(item => trackIdentity(item) !== trackIdentity(recommendedTrack))];
      renderMusicHero(recommendedTrack, featuredQueue, recommendations.some(track => !historyKeys.has(trackIdentity(track))) ? "Recommended from your listening" : "A pick for your next listen");
    }
  } catch (error) {
    console.error("Music home error:", error);
    els.homeHero.classList.remove("loading");
    els.homeHero.innerHTML = `<div class="music-home-unavailable"><strong>Music discovery is unavailable right now.</strong><span>Search still works across the connected catalogs.</span><div><button type="button" data-home-retry>Try again</button><button type="button" data-home-search>Go to Search</button></div></div>`;
    els.homeHero.querySelector("[data-home-retry]").addEventListener("click", () => {
      state.homeLoaded = false;
      loadHome();
    });
    els.homeHero.querySelector("[data-home-search]").addEventListener("click", openMusicSearch);
    if (els.homeTrending) els.homeTrending.innerHTML = `<p class="ui-error music-error">Couldn't load the current selection.</p>`;
  }
  renderHomeLibrary();
}

function isEnglishCatalogTrack(track) {
  if (!track) return false;
  // Keep the default discovery feed readable in English. Search remains broad
  // so users can still deliberately look up music in any language.
  const nonLatinScripts = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  const genericArtists = /^(?:pop hits|top 40(?: pop hits)?|top hits|today'?s hits|latin top hits|pop tracks)$/i;
  return !nonLatinScripts.test(`${track.title} ${track.artist}`) && !genericArtists.test(track.artist.trim());
}

function mergeDiscoveryTracks(groups) {
  const merged = [];
  const seen = new Set();
  for (let index = 0; index < 12; index++) {
    groups.forEach(group => {
      const track = group[index];
      if (!track) return;
      const key = `${track.title.toLocaleLowerCase()}|${track.artist.toLocaleLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(track);
    });
  }
  return merged;
}

els.homeSearch?.addEventListener("click", openMusicSearch);
els.homePlayAll?.addEventListener("click", () => {
  if (state.homeTracks.length) playFromList(state.homeTracks, 0);
});
els.homeLibraryOpen?.addEventListener("click", () => {
  els.navBtns.forEach(b => b.classList.toggle("active", b.dataset.view === "library"));
  els.views.forEach(v => v.classList.toggle("active", v.dataset.viewPanel === "library"));
  renderPlaylistsGrid();
});
document.querySelectorAll("[data-music-genre]").forEach(button => {
  button.addEventListener("click", () => {
    const genre = button.dataset.musicGenre || "";
    if (!genre || !els.search) return;
    activateSearchView();
    state.searchType = "songs";
    updateSearchTabs();
    els.search.value = genre;
    if (els.searchQuery) els.searchQuery.textContent = `for “${genre}”`;
    runGenreSearch(genre);
    els.search.focus({ preventScroll: true });
  });
});
function activateSearchView() {
  els.navBtns.forEach(b => b.classList.toggle("active", b.dataset.view === "search"));
  els.views.forEach(v => v.classList.toggle("active", v.dataset.viewPanel === "search"));
  if (els.detailView) els.detailView.hidden = true;
}

function openMusicSearch() {
  activateSearchView();
  els.search?.focus({ preventScroll: true });
}

/* ---------------- search ---------------- */

function normalizeMusicName(value) {
  return String(value || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function uniqueMusicTracks(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    const key = trackIdentity(track) || `${normalizeMusicName(track.title)}|${normalizeMusicName(track.artist)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function updateSearchTabs() {
  els.searchTabs.forEach(tab => {
    const active = tab.dataset.searchType === state.searchType;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function updateFilterUI() {
  const filters = state.searchFilters;
  if (els.filterSource) els.filterSource.value = state.source;
  if (els.filterPeriod) els.filterPeriod.value = filters.period;
  if (els.filterFrom) els.filterFrom.value = filters.from;
  if (els.filterTo) els.filterTo.value = filters.to;
  if (els.customYears) els.customYears.hidden = filters.period !== "custom";
  const count = Number(state.source !== "all") + Number(filters.period !== "any");
  if (els.filterCount) {
    els.filterCount.hidden = count === 0;
    els.filterCount.textContent = String(count);
  }
}

function closeMusicSearchSuggestions() {
  if (els.searchSuggestions) els.searchSuggestions.hidden = true;
  els.search?.setAttribute("aria-expanded", "false");
  els.search?.removeAttribute("aria-activedescendant");
  activeMusicSuggestionIndex = -1;
}

function showMusicSearchSuggestionStatus(message) {
  if (!els.searchSuggestions || !els.search) return;
  musicSearchSuggestionItems = [];
  musicSearchSuggestionQuery = "";
  activeMusicSuggestionIndex = -1;
  els.searchSuggestions.replaceChildren();
  const status = document.createElement("div");
  status.className = "music-search-suggestion-empty";
  status.textContent = message;
  els.searchSuggestions.appendChild(status);
  els.searchSuggestions.hidden = false;
  els.search.setAttribute("aria-expanded", "true");
  els.search.removeAttribute("aria-activedescendant");
}

function musicArtistGroups(tracks) {
  const groups = new Map();
  tracks.forEach(track => {
    String(track.artist || "Unknown Artist").split(/\s*\/\s*/).filter(Boolean).forEach(name => {
      const key = normalizeMusicName(name);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, { name, cover: track.thumbnail, tracks: [track] });
      else groups.get(key).tracks.push(track);
    });
  });
  return [...groups.values()];
}

function musicAlbumGroups(tracks) {
  const groups = new Map();
  tracks.forEach(track => {
    if (!track.album) return;
    const key = `${normalizeMusicName(track.album)}|${normalizeMusicName(track.artist)}`;
    if (!groups.has(key)) groups.set(key, { title: track.album, artist: track.artist, cover: track.thumbnail, tracks: [track] });
    else groups.get(key).tracks.push(track);
  });
  return [...groups.values()];
}

function renderMusicSearchSuggestions(tracks, query) {
  if (!els.searchSuggestions || !els.search || query !== els.search.value.trim()) return;
  const mode = state.searchType;
  const groups = mode === "artists" ? musicArtistGroups(tracks) : mode === "albums" ? musicAlbumGroups(tracks) : uniqueMusicTracks(tracks).map(track => ({ track }));
  const normalizedQuery = normalizeMusicName(query);
  const startsWith = item => normalizeMusicName(mode === "songs" ? item.track.title : mode === "artists" ? item.name : item.title).startsWith(normalizedQuery);
  musicSearchSuggestionItems = groups.sort((a, b) => Number(startsWith(b)) - Number(startsWith(a))).slice(0, 6);
  musicSearchSuggestionQuery = query;
  activeMusicSuggestionIndex = -1;
  els.searchSuggestions.replaceChildren();

  if (!musicSearchSuggestionItems.length) {
    const empty = document.createElement("div");
    empty.className = "music-search-suggestion-empty";
    empty.textContent = `No matches for “${query}”`;
    els.searchSuggestions.appendChild(empty);
  } else {
    musicSearchSuggestionItems.forEach((item, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "music-search-suggestion";
      option.id = `musicSearchSuggestion${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      const track = item.track || item.tracks[0];
      const image = document.createElement("img");
      image.src = safeRemoteUrl(item.cover || track?.thumbnail) || FALLBACK_COVER;
      image.alt = "";
      image.loading = "lazy";
      image.onerror = () => { image.src = FALLBACK_COVER; };
      const copy = document.createElement("span");
      copy.className = "music-search-suggestion-copy";
      const title = document.createElement("strong");
      title.textContent = mode === "songs" ? track.title : mode === "artists" ? item.name : item.title;
      const meta = document.createElement("span");
      meta.textContent = mode === "songs"
        ? [track.artist, track.album].filter(Boolean).join(" · ")
        : mode === "artists"
          ? "Artist"
          : [item.artist, `${item.tracks.length} track${item.tracks.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
      copy.append(title, meta);
      option.append(image, copy);
      option.addEventListener("click", () => selectMusicSearchSuggestion(index));
      els.searchSuggestions.appendChild(option);
    });
  }
  els.searchSuggestions.hidden = false;
  els.search.setAttribute("aria-expanded", "true");
  els.search.removeAttribute("aria-activedescendant");
}

function moveMusicSearchSuggestion(direction) {
  const options = els.searchSuggestions ? [...els.searchSuggestions.querySelectorAll("[role=option]")] : [];
  if (!options.length) return;
  activeMusicSuggestionIndex = activeMusicSuggestionIndex < 0
    ? (direction > 0 ? 0 : options.length - 1)
    : (activeMusicSuggestionIndex + direction + options.length) % options.length;
  options.forEach((option, index) => {
    const selected = index === activeMusicSuggestionIndex;
    option.setAttribute("aria-selected", String(selected));
    option.classList.toggle("active", selected);
  });
  const active = options[activeMusicSuggestionIndex];
  els.search?.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function selectMusicSearchSuggestion(index) {
  const item = musicSearchSuggestionItems[index];
  if (!item) return;
  closeMusicSearchSuggestions();
  if (state.searchType === "artists") return openArtistPage(item.name, item.tracks);
  if (state.searchType === "albums") return openAlbumPage(item, item.tracks);
  const track = item.track;
  if (!track) return;
  els.search.value = track.title;
  if (els.searchQuery) els.searchQuery.textContent = `for “${track.title}”`;
  playFromList([track], 0);
}

function setFilterPanel(open) {
  if (!els.filterPanel || !els.filterBtn) return;
  els.filterPanel.hidden = !open;
  els.filterBtn.setAttribute("aria-expanded", open ? "true" : "false");
  const wrap = els.filterPanel.closest(".music-filter-wrap");
  if (!open) {
    wrap?.classList.remove("opens-up");
    return;
  }
  requestAnimationFrame(() => {
    if (els.filterPanel.hidden) return;
    const trigger = els.filterBtn.getBoundingClientRect();
    const panel = els.filterPanel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - trigger.bottom;
    wrap?.classList.toggle("opens-up", spaceBelow < panel.height + 8 && trigger.top > spaceBelow);
  });
}

els.searchTabs.forEach(tab => tab.addEventListener("click", () => {
  state.searchType = tab.dataset.searchType || "songs";
  updateSearchTabs();
  const query = els.search?.value.trim();
  if (query) {
    showMusicSearchSuggestionStatus("Searching…");
    runSearch(query);
  }
}));

els.filterBtn?.addEventListener("click", () => setFilterPanel(els.filterPanel.hidden));
els.filterClose?.addEventListener("click", () => setFilterPanel(false));
els.filterSource?.addEventListener("change", () => {
  state.source = els.filterSource.value;
  updateFilterUI();
  if (els.search?.value.trim()) runSearch(els.search.value.trim());
});
els.filterPeriod?.addEventListener("change", () => {
  state.searchFilters.period = els.filterPeriod.value;
  updateFilterUI();
  if (els.search?.value.trim()) runSearch(els.search.value.trim());
});
[els.filterFrom, els.filterTo].forEach(input => input?.addEventListener("input", () => {
  state.searchFilters.from = els.filterFrom?.value || "";
  state.searchFilters.to = els.filterTo?.value || "";
  if (els.search?.value.trim() && state.searchFilters.period === "custom") runSearch(els.search.value.trim());
}));
els.filterClear?.addEventListener("click", () => {
  state.source = "all";
  state.searchFilters = { period: "any", from: "", to: "" };
  updateFilterUI();
  if (els.search?.value.trim()) runSearch(els.search.value.trim());
});
document.addEventListener("click", event => {
  if (els.filterPanel && !els.filterPanel.hidden && !event.target.closest(".music-filter-wrap")) setFilterPanel(false);
});
updateSearchTabs();
updateFilterUI();

els.quality?.addEventListener("change", () => {
  state.quality = els.quality.value;
  try { localStorage.setItem("blur-music-quality", state.quality); } catch {}
});

try {
  const savedQuality = localStorage.getItem("blur-music-quality");
  if (["128", "192", "320", "999"].includes(savedQuality)) state.quality = savedQuality;
  if (els.quality) els.quality.value = state.quality;
} catch {}

els.search.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const query = els.search.value.trim();
  if (els.searchQuery) els.searchQuery.textContent = query ? `for “${query}”` : "";

  if (!query) {
    if (searchAbort) searchAbort.abort();
    closeMusicSearchSuggestions();
    els.spinner.hidden = true;
    els.results.setAttribute("aria-busy", "false");
    els.results.innerHTML = `<p class="ui-empty music-empty">Search for a song to get started.</p>`;
    return;
  }

  showMusicSearchSuggestionStatus("Searching…");
  searchDebounce = setTimeout(() => runSearch(query), 350);
});

els.search.addEventListener("focus", () => {
  if (els.search.value.trim() && els.search.value.trim() === musicSearchSuggestionQuery && musicSearchSuggestionItems.length) {
    els.searchSuggestions.hidden = false;
    els.search.setAttribute("aria-expanded", "true");
  }
});

els.search.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" && els.searchSuggestions && !els.searchSuggestions.hidden) {
    e.preventDefault();
    moveMusicSearchSuggestion(1);
    return;
  }
  if (e.key === "ArrowUp" && els.searchSuggestions && !els.searchSuggestions.hidden) {
    e.preventDefault();
    moveMusicSearchSuggestion(-1);
    return;
  }
  if (e.key === "Escape") {
    closeMusicSearchSuggestions();
    return;
  }
  if (e.key !== "Enter") return;
  clearTimeout(searchDebounce);
  const query = els.search.value.trim();
  if (!query) return;
  e.preventDefault();
  if (activeMusicSuggestionIndex >= 0) return selectMusicSearchSuggestion(activeMusicSuggestionIndex);
  closeMusicSearchSuggestions();
  runSearch(query, { hideSuggestions: true });
});

document.addEventListener("click", event => {
  if (!event.target.closest(".music-search-wrap")) closeMusicSearchSuggestions();
});

async function runSearch(query, options = {}) {

  if (searchAbort) searchAbort.abort();
  const controller = new AbortController();
  searchAbort = controller;

  els.spinner.hidden = false;
  els.results.setAttribute("aria-busy", "true");
  els.results.innerHTML = `
    <div class="music-results-loading">
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
    </div>
  `;

  try {

    const { tracks, failed } = await fetchMusicSearchTracks(query, controller.signal, 40);
    if (controller.signal.aborted) return;
    if (!tracks.length && failed) throw failed;
    const filtered = applyReleaseFilter(uniqueMusicTracks(tracks));
    if (!options.hideSuggestions) renderMusicSearchSuggestions(filtered, query);
    renderSearchResults(filtered);

  } catch (err) {

    if (err.name === "AbortError") return;

    console.error("Search error:", err);
    if (!options.hideSuggestions) showMusicSearchSuggestionStatus("Suggestions couldn’t load");
    els.results.innerHTML = `<p class="ui-error music-error">Couldn't reach the music service. Try again in a moment.</p>`;

  } finally {
    if (searchAbort === controller) {
      els.spinner.hidden = true;
      els.results.setAttribute("aria-busy", "false");
    }
  }
}

async function fetchMusicSearchTracks(query, signal, count = 40) {
  const sources = state.source === "all" ? MUSIC_SOURCES : [state.source];
  const results = await Promise.allSettled(sources.map(async source => {
    const data = await requestSolara({ types: "search", source, name: query, count: String(count), pages: "1" }, signal);
    if (!Array.isArray(data)) throw new Error(`${source} returned an invalid response`);
    return data.map(item => toTrackFromSearch(item, source)).filter(Boolean);
  }));
  const tracks = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  return { tracks, failed: !tracks.length && results.every(result => result.status === "rejected") ? (results[0]?.reason || new Error("No music catalogs responded")) : null };
}

function applyReleaseFilter(tracks) {
  const { period, from, to } = state.searchFilters;
  if (period === "any") {
    if (els.filterNote) els.filterNote.textContent = "Release filters apply when the provider includes release-year metadata.";
    return tracks;
  }
  const withYears = tracks.filter(track => /^\d{4}$/.test(String(track.releaseYear || "")));
  if (!withYears.length) {
    if (els.filterNote) els.filterNote.textContent = "This provider did not return release years, so results are shown unfiltered.";
    return tracks;
  }
  if (period === "custom" && !from && !to) {
    if (els.filterNote) els.filterNote.textContent = "Enter a start year, end year, or both to filter releases.";
    return tracks;
  }
  const now = new Date().getFullYear();
  const min = period === "year" ? now : period === "five" ? now - 4 : Number(from) || 0;
  const max = period === "custom" ? Number(to) || now : now;
  if (els.filterNote) els.filterNote.textContent = `Showing releases from ${min || "any year"} to ${max}.`;
  return tracks.filter(track => {
    const year = Number(track.releaseYear);
    return Number.isFinite(year) && year >= min && year <= max;
  });
}

async function runGenreSearch(genre) {
  if (searchAbort) searchAbort.abort();
  const controller = new AbortController();
  searchAbort = controller;
  const artistSeeds = MUSIC_GENRE_QUERY_ARTISTS[genre] || [];
  if (!artistSeeds.length) return runSearch(genre);

  els.spinner.hidden = false;
  els.results.setAttribute("aria-busy", "true");
  els.results.innerHTML = `
    <div class="music-results-loading">
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
      <div class="song-card-skeleton"></div>
    </div>
  `;

  try {
    // Use a small set of representative artists instead of searching the
    // genre word itself, which makes some catalogs return songs with that
    // word in the title rather than music from the genre.
    const sources = state.source === "all" ? [HOME_DISCOVERY_SOURCE] : [state.source];
    const requests = sources.flatMap(source => artistSeeds.map(name => requestSolara({
      types: "search",
      source,
      name,
      count: "8",
      pages: "1",
    }, controller.signal).then(data => ({ source, seed: name, data }))));
    const responses = await Promise.allSettled(requests);
    if (controller.signal.aborted) return;
    const normalize = value => String(value || "")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    const tracks = uniqueTracks(responses
      .filter(result => result.status === "fulfilled")
      .flatMap(result => (Array.isArray(result.value?.data) ? result.value.data : [])
        .map(item => ({
          track: toTrackFromSearch(item, result.value.source),
          seed: normalize(result.value.seed),
        }))
        .filter(({ track, seed }) => {
          if (!track || !isEnglishCatalogTrack(track)) return false;
          const artist = normalize(track.artist);
          return artist === seed || artist.includes(seed) || seed.includes(artist);
        })
        .map(({ track }) => track)))
      .slice(0, HOME_RECOMMENDATION_COUNT);
    renderSearchResults(tracks);
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Genre search error:", err);
    els.results.innerHTML = `<p class="ui-error music-error">Couldn't reach the music service. Try again in a moment.</p>`;
  } finally {
    if (searchAbort === controller) {
      els.spinner.hidden = true;
      els.results.setAttribute("aria-busy", "false");
    }
  }
}

function renderSearchResults(tracks) {

  els.results.innerHTML = "";

  if (!tracks.length) {
    els.results.innerHTML = `<p class="ui-empty music-empty">No results found.</p>`;
    return;
  }

  if (state.searchType === "artists") return renderArtistResults(tracks);
  if (state.searchType === "albums") return renderAlbumResults(tracks);

  tracks.forEach((track, i) => {
    const card = buildSongCard(track, {
      onPlay: () => playFromList(tracks, i),
      onQueue: () => addToQueue(track),
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
      onFavorite: () => toggleFavorite(track),
    });
    els.results.appendChild(card);
  });

}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------------- shared song-card builder ---------------- */

// layout: "row" (default, horizontal list item) or "grid" (big Spotify-style
// square card with cover-on-top and a hover play overlay).
function buildSongCard(track, { onPlay, onQueue, onRemove, onAddToPlaylist, onFavorite, layout = "row" } = {}) {

  const card = document.createElement("div");
  card.className = layout === "grid" ? "song-card song-card-grid" : "song-card";
  if (state.current && trackIdentity(state.current) === trackIdentity(track)) card.classList.add("playing");
  card.dataset.musicKey = track.videoId || "";

  const playOverlay = (onPlay && layout === "grid") ? `
      <button class="song-card-play-overlay" aria-label="Play" title="Play">
        <svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button>` : "";

  card.innerHTML = `
    <div class="song-card-cover">
      <img src="${safeRemoteUrl(track.thumbnail) || FALLBACK_COVER}" alt="Album artwork" loading="lazy">
      ${explicitBadgeMarkup(track)}
      <div class="song-card-playing-icon"><span></span><span></span><span></span></div>
      ${playOverlay}
    </div>
    <div class="song-card-body">
      <strong>${escapeHtml(track.title)}</strong>
      <span><button class="song-card-artist" type="button" data-song-artist>${escapeHtml(track.artist)}</button>${track.album ? ` <i class="song-card-separator">·</i> <span class="song-card-album">${escapeHtml(track.album)}</span>` : ""}</span>
      <small class="song-card-provider">${escapeHtml(sourceLabel(track.source))}</small>
    </div>
    <span class="song-card-duration">${escapeHtml(track.duration)}</span>
    <div class="song-card-actions"></div>
  `;

  const cover = card.querySelector(".song-card-cover img");
  cover.addEventListener("error", () => {
    cover.onerror = null;
    cover.src = FALLBACK_COVER;
  });
  hydrateArtwork(track, cover);
  card.querySelector("[data-song-artist]")?.addEventListener("click", event => {
    event.stopPropagation();
    openArtistPage(track.artist, [track]);
  });

  const actions = card.querySelector(".song-card-actions");

  if (onFavorite) {
    const isFav = isFavorite(track);
    const btn = document.createElement("button");
    btn.className = "song-card-action song-card-favorite" + (isFav ? " active" : "");
    btn.dataset.favoriteKey = trackIdentity(track);
    btn.title = isFav ? "Remove from favorites" : "Add to favorites";
    btn.setAttribute("aria-label", btn.title);
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="${isFav ? "currentColor" : "none"}"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onFavorite();
      const saved = isFavorite(track);
      btn.classList.toggle("active", saved);
      btn.title = saved ? "Remove from favorites" : "Add to favorites";
      btn.setAttribute("aria-label", btn.title);
      btn.querySelector("svg")?.setAttribute("fill", saved ? "currentColor" : "none");
    });
    actions.appendChild(btn);
  }

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

/* ---------------- favorites ---------------- */

function persistableTrack(track) {
  const copy = { ...track };
  // Stream URLs are short-lived; the catalog IDs are the durable references.
  delete copy.streamUrl;
  delete copy.url;
  if (copy.picId) copy.thumbnail = FALLBACK_COVER;
  return copy;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    state.favorites = raw ? JSON.parse(raw).map(normalizeSavedTrack) : [];
  } catch (err) {
    console.error("Couldn't load favorites:", err);
    state.favorites = [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites.map(persistableTrack)));
  } catch (err) {
    console.error("Couldn't save favorites:", err);
  }
}

function isFavorite(track) {
  return state.favorites.some(t => trackIdentity(t) === trackIdentity(track));
}

function trackIdentity(track) {
  if (track?.source && (track?.id || track?.urlId)) {
    return `${track.source}:${track.id || track.urlId}`;
  }
  return track?.videoId || "";
}

function toggleFavorite(track) {
  if (isFavorite(track)) {
    state.favorites = state.favorites.filter(t => trackIdentity(t) !== trackIdentity(track));
  } else {
    state.favorites.unshift(track);
  }
  saveFavorites();
  refreshAllVisibleCards();
  syncFavoriteButtons();
  updateNowPlayingFavoriteUI();
}

function syncFavoriteButtons() {
  document.querySelectorAll("[data-favorite-key]").forEach(btn => {
    const saved = state.favorites.some(track => trackIdentity(track) === btn.dataset.favoriteKey);
    btn.classList.toggle("active", saved);
    btn.title = saved ? "Remove from favorites" : "Add to favorites";
    btn.setAttribute("aria-label", btn.title);
    btn.querySelector("svg")?.setAttribute("fill", saved ? "currentColor" : "none");
  });
}

function refreshAllVisibleCards() {
  // Cheapest correct way to keep every list's heart icon in sync without
  // threading extra state through each render function: just re-run
  // whichever renders are currently backed by in-memory data.
  renderFavorites();
  renderQueue();
  renderHistory();
  renderHomeLibrary();
  if (state.activePlaylistId) {
    const playlist = state.playlists.find(p => p.id === state.activePlaylistId);
    if (playlist) renderPlaylistDetail(playlist);
  }
}

function renderFavorites() {

  if (!els.favoritesList) return;
  els.favoritesList.innerHTML = "";

  if (!state.favorites.length) {
    els.favoritesList.innerHTML = `<p class="ui-empty music-empty">No favorites yet. Tap the heart on any song to save it here.</p>`;
    return;
  }

  state.favorites.forEach((track, i) => {
    const card = buildSongCard(track, {
      onPlay: () => playFromList(state.favorites, i),
      onQueue: () => addToQueue(track),
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
      onFavorite: () => toggleFavorite(track),
      layout: "grid",
    });
    els.favoritesList.appendChild(card);
  });

}

function updateNowPlayingFavoriteUI() {
  const fav = state.current ? isFavorite(state.current) : false;
  [els.favoriteBtn, els.npFavoriteBtn].forEach(btn => {
    if (!btn) return;
    btn.dataset.favoriteKey = state.current ? trackIdentity(state.current) : "";
    btn.classList.toggle("active", fav);
    btn.title = fav ? "Remove from favorites" : "Add to favorites";
    btn.setAttribute("aria-label", btn.title);
    const svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("fill", fav ? "currentColor" : "none");
  });
}

[els.favoriteBtn, els.npFavoriteBtn].forEach(btn => {
  btn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.current) toggleFavorite(state.current);
  });
});

/* ---------------- queue / history state + rendering ---------------- */

function playFromList(tracks, index) {
  const track = tracks[index];

  state.queue = tracks.slice(index + 1);

  // Add immediately to recently played
  state.history = state.history.filter(
    t => trackIdentity(t) !== trackIdentity(track)
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
  state.history = state.history.filter(item => trackIdentity(item) !== trackIdentity(track));
  state.history.unshift(track);
  if (state.history.length > 25) state.history.pop();
  saveHistory();
  renderHistory();
}

function renderQueue() {

  els.queueList.innerHTML = "";
  updateQueueBadge();

  if (!state.queue.length) {
    els.queueList.innerHTML = `<p class="ui-empty music-empty">Nothing queued. Play a song and the rest of your results will line up here.</p>`;
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
      onFavorite: () => toggleFavorite(track),
    });
    els.queueList.appendChild(card);
  });

}

function renderHistory() {

  els.historyList.innerHTML = "";

  if (!state.history.length) {
    els.historyList.innerHTML = `<p class="ui-empty music-empty">Tracks you play will show up here.</p>`;
    renderHomeLibrary();
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
      onFavorite: () => toggleFavorite(track),
    });
    els.historyList.appendChild(card);
  });

  renderHomeLibrary();

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
    state.history = raw ? JSON.parse(raw).map(normalizeSavedTrack) : [];
  } catch (err) {
    console.error("Couldn't load history:", err);
    state.history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(state.history.map(persistableTrack))
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
    const query = track.artist && track.artist !== "Unknown Artist" ? track.artist : track.title;
    const data = await requestSolara({
      types: "search",
      source: MUSIC_SOURCES.includes(track.source) ? track.source : "netease",
      name: query,
      count: "12",
      pages: "1",
    });
    if (state.current && trackIdentity(state.current) !== trackIdentity(track)) return;
    const related = (Array.isArray(data) ? data : [])
      .map(item => toTrackFromSearch(item, track.source || "netease"))
      .filter(item => item && trackIdentity(item) !== trackIdentity(track));

    els.relatedList.innerHTML = "";

    if (!related.length) {
      els.relatedList.innerHTML = `<p class="ui-empty music-empty">No related tracks found.</p>`;
      return;
    }

    related.forEach((rTrack, i) => {
      const card = buildSongCard(rTrack, {
        onPlay: () => playFromList(related, i),
        onQueue: () => addToQueue(rTrack),
        onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(rTrack, anchorEl),
        onFavorite: () => toggleFavorite(rTrack),
      });
      els.relatedList.appendChild(card);
    });

  } catch (err) {
    if (state.current && trackIdentity(state.current) !== trackIdentity(track)) return;
    console.error("Related error:", err);
    els.relatedList.innerHTML = `<p class="ui-empty music-empty">More tracks will appear here when available.</p>`;
  }

}

/* ---------------- playlists ----------------
   Playlists live entirely on the client (localStorage) so the saved
   library remains private to this browser. A playlist is just
   { id, name, tracks: [track, ...] }. */

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    state.playlists = raw ? JSON.parse(raw).map(playlist => ({
      ...playlist,
      tracks: Array.isArray(playlist.tracks) ? playlist.tracks.map(normalizeSavedTrack) : [],
    })) : [];
  } catch (err) {
    console.error("Couldn't load playlists:", err);
    state.playlists = [];
  }
}

function savePlaylists() {
  try {
    const playlists = state.playlists.map(playlist => ({
      ...playlist,
      tracks: playlist.tracks.map(persistableTrack),
    }));
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
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
  if (playlist.tracks.some(t => trackIdentity(t) === trackIdentity(track))) return; // already in there
  playlist.tracks.push(track);
  savePlaylists();
  renderPlaylistsGrid();
  if (state.activePlaylistId === playlistId) renderPlaylistDetail(playlist);
}

function removeTrackFromPlaylist(playlistId, trackKey) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  playlist.tracks = playlist.tracks.filter(t => trackIdentity(t) !== trackKey);
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
    els.playlistsGrid.innerHTML = `<p class="ui-empty music-empty">No playlists yet. Create one above, or hit the playlist icon on any song.</p>`;
    return;
  }

  state.playlists.forEach(playlist => {
    const card = document.createElement("div");
    card.className = "playlist-card";

    const coverTracks = playlist.tracks.slice(0, 4);
    const covers = coverTracks.map(t => safeRemoteUrl(t.thumbnail) || FALLBACK_COVER);
    while (covers.length < 4) covers.push(null);

    card.innerHTML = `
      <div class="playlist-card-cover ${covers.filter(Boolean).length <= 1 ? "single" : ""}">
        ${covers.map((src, index) => src
          ? `<img data-cover-index="${index}" src="${safeRemoteUrl(src) || FALLBACK_COVER}" alt="" loading="lazy">`
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
    card.querySelectorAll("img[data-cover-index]").forEach(image => {
      const track = coverTracks[Number(image.dataset.coverIndex)];
      if (track) hydrateArtwork(track, image);
    });
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
    els.playlistDetailList.innerHTML = `<p class="ui-empty music-empty">This playlist is empty. Add songs from Search using the playlist icon.</p>`;
    return;
  }

  playlist.tracks.forEach((track) => {
    const card = buildSongCard(track, {
      onPlay: () => playFromList(playlist.tracks, playlist.tracks.indexOf(track)),
      onRemove: () => removeTrackFromPlaylist(playlist.id, trackIdentity(track)),
      onAddToPlaylist: (anchorEl) => openAddToPlaylistMenu(track, anchorEl),
      onFavorite: () => toggleFavorite(track),
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
  menu.className = "playlist-menu ui-menu";

  const list = state.playlists.map(p => `
    <button class="playlist-menu-item ui-menu__item" data-playlist-id="${p.id}">
      <span>${escapeHtml(p.name)}</span>
      ${p.tracks.some(t => trackIdentity(t) === trackIdentity(track)) ? `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
    </button>
  `).join("");

  menu.innerHTML = `
    ${state.playlists.length ? `<div class="playlist-menu-list">${list}</div>` : `<p class="playlist-menu-empty">No playlists yet.</p>`}
    <div class="playlist-menu-new">
      <input type="text" class="playlist-menu-input ui-input" placeholder="New playlist name">
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
loadFavorites();
renderHistory();
renderFavorites();
loadHome();
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

  if (els.audio.currentTime > 3) {
    els.audio.currentTime = 0;
    return;
  }

  if (state.current && state.history[0] && trackIdentity(state.history[0]) === trackIdentity(state.current)) {
    state.history.shift();
  }
  const previousTrack = state.history.shift();
  if (!previousTrack) {
    if (state.current) state.history.unshift(state.current);
    saveHistory();
    renderHistory();
    els.audio.currentTime = 0;
    return;
  }

  if (state.current) state.queue.unshift(state.current);
  setCurrent(previousTrack);
  renderQueue();
  loadAndPlay(previousTrack);

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

async function resolvePlayableTrack(track) {
  // Search results can contain a valid catalog id whose provider does not
  // actually have an audio stream for that particular item. Validate direct
  // tracks here so home recommendations can gracefully fall back to another
  // connected catalog instead of stopping at “No source found”.
  if (track?.id && MUSIC_SOURCES.includes(track.source)) {
    try {
      return { track, streamUrl: await resolveStreamUrl(track) };
    } catch {
      // Continue with a cross-source title/artist lookup below.
    }
  }
  const query = [track?.title, track?.artist].filter(Boolean).join(" ").trim();
  if (!query) throw new Error("This saved track is missing its music details");
  const sources = state.source === "all" ? MUSIC_SOURCES : [state.source];
  const sourceResults = await Promise.allSettled(sources.map(async source => {
    const data = await requestSolara({
      types: "search",
      source,
      name: query,
      count: "12",
      pages: "1",
    });
    return (Array.isArray(data) ? data : []).slice(0, 12)
      .map(item => toTrackFromSearch(item, source)).filter(Boolean);
  }));
  const matches = sourceResults.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (!matches.length) throw new Error("This older saved track could not be found in the new music catalogs");
  const normalize = value => String(value || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const title = normalize(track.title);
  const artist = normalize(track.artist);
  const ordered = [...matches].sort((a, b) => {
    const score = item => (normalize(item.title) === title ? 2 : 0)
      + (artist && normalize(item.artist).includes(artist) ? 1 : 0);
    return score(b) - score(a);
  });
  for (const candidate of ordered.slice(0, 18)) {
    try {
      return { track: candidate, streamUrl: await resolveStreamUrl(candidate) };
    } catch {
      // Some catalogs expose metadata without a playable stream. Keep trying.
    }
  }
  throw new Error("No playable source was found for this track");
}

async function resolveStreamUrl(track) {
  const qualities = state.quality === "320" ? ["320"] : [state.quality, "320"];
  let lastError = null;
  for (const bitrate of qualities) {
    try {
      const data = await requestSolara({
        types: "url",
        id: track.id || track.urlId,
        source: track.source,
        br: bitrate,
      });
      const url = safeRemoteUrl(data?.url);
      if (url) return url;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error("No playable audio stream was returned for this track");
}

function replaceSavedTrack(oldTrack, newTrack) {
  if (!oldTrack || !newTrack || oldTrack.videoId === newTrack.videoId) return;
  const oldVideoId = oldTrack.videoId;
  const replace = list => list.map(item => item.videoId === oldVideoId ? newTrack : item);
  state.queue = replace(state.queue);
  state.history = replace(state.history);
  state.favorites = replace(state.favorites);
  state.playlists.forEach(playlist => { playlist.tracks = replace(playlist.tracks); });
  if (state.current?.videoId === oldVideoId) state.current = newTrack;
  saveHistory();
  saveFavorites();
  savePlaylists();
}

async function loadAndPlay(track) {
  const requestId = ++playbackRequestId;
  const requestedTrack = track;
  if (els.player) els.player.hidden = false;
  updateFloatingPlayer();
  els.title.textContent = track.title;
  els.artist.textContent = track.artist;
  setPlayDisabled(true);
  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  setPlayState("loading");

  try {
    const resolved = await resolvePlayableTrack(track);
    track = resolved.track;
    if (requestId !== playbackRequestId) return;
    replaceSavedTrack(requestedTrack, track);
    if (state.current?.videoId === requestedTrack.videoId || !state.current) state.current = track;

    els.title.textContent = track.title;
    els.artist.textContent = track.artist;
    els.cover.src = safeRemoteUrl(track.thumbnail) || FALLBACK_COVER;
    if (els.npTitle) els.npTitle.textContent = track.title;
    if (els.npArtist) els.npArtist.textContent = track.artist;
    if (els.npCover) els.npCover.src = safeRemoteUrl(track.thumbnail) || FALLBACK_COVER;
    updateFloatingPlayer();
    if (window.updateNowPlayingBackground) window.updateNowPlayingBackground(track.thumbnail);
    updateNowPlayingFavoriteUI();
    hydrateArtwork(track, els.cover);
    if (els.npCover) hydrateArtwork(track, els.npCover);
    loadLyrics(track);
    loadRelated(track);

    const streamUrl = resolved.streamUrl || await resolveStreamUrl(track);
    if (requestId !== playbackRequestId) return;
    els.audio.src = streamUrl;
    els.audio.load();
    await els.audio.play();
    if (requestId !== playbackRequestId) return;
    setPlayDisabled(false);
    setPlayState("playing");

  } catch (err) {
    if (requestId !== playbackRequestId) return;
    console.error("Playback error:", err);
    if (err.name === "NotAllowedError" && els.audio.src) {
      els.artist.textContent = "Tap Play to start";
      if (els.npArtist) els.npArtist.textContent = "Tap Play to start";
      setPlayDisabled(false);
      setPlayState("paused");
    } else {
      els.title.textContent = "Couldn't play this track";
      els.artist.textContent = err.message || "Try another song";
      if (els.npTitle) els.npTitle.textContent = "Couldn't play this track";
      if (els.npArtist) els.npArtist.textContent = err.message || "Try another song";
      setPlayState("idle");
    }

  }

  if (requestId !== playbackRequestId) return;
  document.querySelectorAll(".song-card[data-music-key]").forEach(card => {
    card.classList.toggle("playing", card.dataset.musicKey === state.current?.videoId);
  });
  renderQueue();
  renderHistory();
  renderFavorites();
  renderHomeLibrary();
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

[els.playBtn, els.npPlay, els.floatingPlay].forEach(b => b && b.addEventListener("click", togglePlayPause));
[els.floatingNext].forEach(b => b && b.addEventListener("click", advance));

els.floatingCollapse?.addEventListener("click", () => {
  const collapsed = els.floatingPlayer.dataset.collapsed !== "true";
  els.floatingPlayer.dataset.collapsed = String(collapsed);
  els.floatingCollapse.setAttribute("aria-expanded", String(!collapsed));
  els.floatingCollapse.setAttribute("aria-label", collapsed ? "Expand mini player" : "Collapse mini player");
  els.floatingCollapse.title = collapsed ? "Expand" : "Collapse";
});

els.audio.addEventListener("play", () => setPlayState("playing"));
els.audio.addEventListener("play", syncMusicPresence);
els.audio.addEventListener("pause", () => {
  setPlayState("paused");
  if (els.audio.paused) window.BlurPresence?.clearActivity("music");
});
els.audio.addEventListener("waiting", () => setPlayState("loading"));
els.audio.addEventListener("playing", () => {
  setPlayState("playing");
  syncMusicPresence();
});

function syncMusicPresence(){
  if (!state.current || els.audio.paused) return;
  window.BlurPresence?.setActivity("music", {
    title: state.current.title,
    subtitle: state.current.artist || "Music"
  });
}

function renderArtistResults(tracks) {
  const artists = new Map();
  tracks.forEach(track => {
    const names = String(track.artist || "Unknown Artist").split(/\s*\/\s*/).filter(Boolean);
    names.forEach(name => {
      const key = normalizeMusicName(name);
      if (!key || artists.has(key)) {
        if (artists.has(key)) artists.get(key).tracks.push(track);
        return;
      }
      artists.set(key, { name, tracks: [track], cover: track.thumbnail, source: track.source });
    });
  });
  if (!artists.size) {
    els.results.innerHTML = `<p class="music-empty">No artists found.</p>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "music-artist-results";
  [...artists.values()].forEach(artist => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "music-artist-result";
    card.innerHTML = `<span class="music-artist-result-art"><img src="${safeRemoteUrl(artist.cover) || FALLBACK_COVER}" alt=""></span><span class="music-artist-result-copy"><strong>${escapeHtml(artist.name)}</strong><small>${artist.tracks.length} result${artist.tracks.length === 1 ? "" : "s"}</small></span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>`;
    hydrateArtwork(artist.tracks[0], card.querySelector("img"));
    card.addEventListener("click", () => openArtistPage(artist.name, artist.tracks));
    grid.appendChild(card);
  });
  els.results.appendChild(grid);
}

function renderAlbumResults(tracks) {
  const albums = new Map();
  tracks.forEach(track => {
    if (!track.album) return;
    const key = `${normalizeMusicName(track.album)}|${normalizeMusicName(track.artist)}`;
    if (!albums.has(key)) albums.set(key, { title: track.album, artist: track.artist, cover: track.thumbnail, source: track.source, tracks: [] });
    albums.get(key).tracks.push(track);
  });
  if (!albums.size) {
    els.results.innerHTML = `<p class="music-empty">No albums found for this search.</p>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "music-album-results";
  [...albums.values()].forEach(album => {
    const card = document.createElement("div");
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.className = "music-album-result";
    card.innerHTML = `<span class="music-album-result-art"><img src="${safeRemoteUrl(album.cover) || FALLBACK_COVER}" alt=""></span><span class="music-album-result-copy"><strong>${escapeHtml(album.title)}</strong><small><button type="button" class="music-artist-link music-album-result-artist" data-album-artist>${escapeHtml(album.artist)}</button> · ${album.tracks.length} track${album.tracks.length === 1 ? "" : "s"}</small></span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>`;
    hydrateArtwork(album.tracks[0], card.querySelector("img"));
    const open = () => openAlbumPage(album, album.tracks);
    card.addEventListener("click", event => {
      if (event.target.closest("[data-album-artist]")) return;
      open();
    });
    card.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("[data-album-artist]")) {
        event.preventDefault();
        open();
      }
    });
    card.querySelector("[data-album-artist]")?.addEventListener("click", event => {
      event.stopPropagation();
      openArtistPage(album.artist, album.tracks);
    });
    grid.appendChild(card);
  });
  els.results.appendChild(grid);
}

function showMusicDetail(label) {
  if (!els.detailView || !els.detailContent) return;
  els.views.forEach(view => view.classList.remove("active"));
  els.detailView.hidden = false;
  if (els.detailBreadcrumb) els.detailBreadcrumb.textContent = label || "Music";
}

function returnToSearchView() {
  detailRequestId++;
  state.detailStack = [];
  if (els.detailView) els.detailView.hidden = true;
  activateSearchView();
}

els.detailBack?.addEventListener("click", async () => {
  const previous = state.detailStack.pop();
  if (!previous || previous.type === "search") return returnToSearchView();
  if (previous.type === "artist") return openArtistPage(previous.name, previous.tracks, false);
});

async function openArtistPage(name, seedTracks = [], push = true) {
  if (push) state.detailStack.push({ type: "search" });
  const requestId = ++detailRequestId;
  showMusicDetail(name);
  els.detailContent.innerHTML = `<div class="music-detail-loading"><div class="song-card-skeleton"></div><div class="song-card-skeleton"></div><div class="song-card-skeleton"></div></div>`;
  const controller = new AbortController();
  try {
    const { tracks, failed } = await fetchMusicSearchTracks(name, controller.signal, 50);
    if (requestId !== detailRequestId) return;
    const matches = uniqueMusicTracks(tracks.filter(track => String(track.artist || "").split(/\s*\/\s*/).some(artist => {
      const a = normalizeMusicName(artist), b = normalizeMusicName(name);
      return a === b || a.includes(b) || b.includes(a);
    })));
    renderArtistPage(name, matches.length ? matches : seedTracks, failed);
  } catch (error) {
    if (requestId !== detailRequestId) return;
    renderArtistPage(name, seedTracks, error);
  }
}

function renderArtistPage(name, tracks, error = null) {
  showMusicDetail(name);
  const cover = tracks[0]?.thumbnail || FALLBACK_COVER;
  const albums = new Map();
  tracks.forEach(track => {
    if (!track.album) return;
    const key = normalizeMusicName(track.album);
    if (!albums.has(key)) albums.set(key, { title: track.album, artist: name, cover: track.thumbnail, tracks: [] });
    albums.get(key).tracks.push(track);
  });
  els.detailContent.innerHTML = `
    <header class="music-detail-header music-artist-header">
      <img class="music-detail-avatar" src="${safeRemoteUrl(cover) || FALLBACK_COVER}" alt="">
      <div><p class="music-eyebrow">Artist</p><h1>${escapeHtml(name)}</h1><p>${tracks.length ? `${tracks.length} song${tracks.length === 1 ? "" : "s"} found` : "No catalog matches found"}</p></div>
    </header>
    ${error && !tracks.length ? `<p class="music-error">This artist could not be loaded right now.</p>` : ""}
    <section class="music-detail-section"><div class="music-detail-section-heading"><h2>Popular songs</h2><button class="music-text-action" type="button" data-detail-play-all ${tracks.length ? "" : "disabled"}>Play all</button></div><div id="music-artist-tracks" class="music-results"></div></section>
    ${albums.size ? `<section class="music-detail-section"><div class="music-detail-section-heading"><h2>Albums</h2></div><div class="music-album-results music-detail-albums"></div></section>` : ""}
  `;
  hydrateArtwork(tracks[0], els.detailContent.querySelector(".music-detail-avatar"));
  const list = els.detailContent.querySelector("#music-artist-tracks");
  tracks.slice(0, 24).forEach((track, index) => list.appendChild(buildSongCard(track, {
    onPlay: () => playFromList(tracks, index), onQueue: () => addToQueue(track), onAddToPlaylist: anchor => openAddToPlaylistMenu(track, anchor), onFavorite: () => toggleFavorite(track),
  })));
  els.detailContent.querySelector("[data-detail-play-all]")?.addEventListener("click", () => tracks.length && playFromList(tracks, 0));
  const albumGrid = els.detailContent.querySelector(".music-detail-albums");
  if (albumGrid) [...albums.values()].forEach(album => {
    const card = document.createElement("button");
    card.type = "button"; card.className = "music-album-result";
    card.innerHTML = `<span class="music-album-result-art"><img src="${safeRemoteUrl(album.cover) || FALLBACK_COVER}" alt=""></span><span class="music-album-result-copy"><strong>${escapeHtml(album.title)}</strong><small>${album.tracks.length} track${album.tracks.length === 1 ? "" : "s"}</small></span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>`;
    hydrateArtwork(album.tracks[0], card.querySelector("img"));
    card.addEventListener("click", () => openAlbumPage(album, album.tracks));
    albumGrid.appendChild(card);
  });
}

async function openAlbumPage(album, seedTracks = [], push = true) {
  if (push) state.detailStack.push({ type: "artist", name: album.artist, tracks: seedTracks });
  const requestId = ++detailRequestId;
  showMusicDetail(album.title);
  els.detailContent.innerHTML = `<div class="music-detail-loading"><div class="song-card-skeleton"></div><div class="song-card-skeleton"></div><div class="song-card-skeleton"></div></div>`;
  const controller = new AbortController();
  try {
    const query = `${album.title} ${album.artist || ""}`.trim();
    const { tracks } = await fetchMusicSearchTracks(query, controller.signal, 50);
    if (requestId !== detailRequestId) return;
    const albumKey = normalizeMusicName(album.title);
    const exact = tracks.filter(track => normalizeMusicName(track.album) === albumKey);
    const near = exact.length ? exact : tracks.filter(track => normalizeMusicName(track.album).includes(albumKey) || albumKey.includes(normalizeMusicName(track.album)));
    const matches = uniqueMusicTracks([...seedTracks, ...near]);
    renderAlbumPage(album, matches.length ? matches : seedTracks);
  } catch {
    if (requestId !== detailRequestId) return;
    renderAlbumPage(album, seedTracks);
  }
}

function renderAlbumPage(album, tracks) {
  showMusicDetail(album.title);
  const ordered = uniqueMusicTracks(tracks);
  els.detailContent.innerHTML = `
    <header class="music-detail-header music-album-header"><img class="music-detail-cover" src="${safeRemoteUrl(album.cover || ordered[0]?.thumbnail) || FALLBACK_COVER}" alt=""><div><p class="music-eyebrow">Album</p><h1>${escapeHtml(album.title)}</h1><button class="music-artist-link music-detail-artist-link" type="button" data-detail-artist>${escapeHtml(album.artist || ordered[0]?.artist || "Unknown artist")}</button><div class="music-detail-meta">${ordered.length} track${ordered.length === 1 ? "" : "s"}${ordered.some(track => track.releaseYear) ? ` · ${escapeHtml(ordered.find(track => track.releaseYear).releaseYear)}` : ""}</div><div class="music-detail-actions"><button class="music-primary-action" type="button" data-detail-play-all ${ordered.length ? "" : "disabled"}>Play album</button><button class="music-secondary-action" type="button" data-detail-shuffle ${ordered.length ? "" : "disabled"}>Shuffle</button></div></div></header>
    <section class="music-detail-section"><div class="music-detail-section-heading"><h2>Tracks</h2></div><div id="music-album-tracks" class="music-results"></div></section>
  `;
  hydrateArtwork(ordered[0], els.detailContent.querySelector(".music-detail-cover"));
  els.detailContent.querySelector("[data-detail-artist]")?.addEventListener("click", event => {
    event.stopPropagation();
    openArtistPage(album.artist || ordered[0]?.artist || "Unknown artist", ordered);
  });
  const list = els.detailContent.querySelector("#music-album-tracks");
  ordered.forEach((track, index) => list.appendChild(buildSongCard(track, {
    onPlay: () => playFromList(ordered, index), onQueue: () => addToQueue(track), onAddToPlaylist: anchor => openAddToPlaylistMenu(track, anchor), onFavorite: () => toggleFavorite(track),
  })));
  els.detailContent.querySelector("[data-detail-play-all]")?.addEventListener("click", () => ordered.length && playFromList(ordered, 0));
  els.detailContent.querySelector("[data-detail-shuffle]")?.addEventListener("click", () => {
    if (!ordered.length) return;
    const shuffled = [...ordered].sort(() => Math.random() - .5);
    playFromList(shuffled, 0);
  });
}

// Artist names in the persistent player and the full-screen player are
// navigation targets too. Keep their click separate from the track-level
// controls so opening an artist never toggles playback or Now Playing.
[els.artist, els.npArtist].forEach(artistLink => artistLink?.addEventListener("click", event => {
  event.stopPropagation();
  const artist = state.current?.artist || artistLink.textContent.trim();
  if (artist && artist !== "Unknown Artist") openArtistPage(artist, state.current ? [state.current] : []);
}));

els.audio.addEventListener("ended", () => {
  if (state.repeatMode === "one") {
    els.audio.currentTime = 0;
    els.audio.play();
    return;
  }
  window.BlurPresence?.clearActivity("music");
  advance();
});

// Both play buttons (mini player + fullscreen) share this logic so they
// never fall out of sync with each other or with the actual audio state.
function setPlayState(playState) {
  [els.playBtn, els.npPlay, els.floatingPlay].forEach(btn => {
    if (!btn) return;
    btn.dataset.state = playState;
    btn.setAttribute("aria-label", playState === "playing" ? "Pause" : "Play");
  });
}

function setPlayDisabled(disabled) {
  [els.playBtn, els.npPlay, els.floatingPlay].forEach(b => b && (b.disabled = disabled));
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
  if (els.floatingProgressFill) els.floatingProgressFill.style.width = pct + "%";
  if (els.floatingProgress) els.floatingProgress.setAttribute("aria-valuenow", String(Math.round(pct)));
}

function setTimeCurrentText(text) {
  if (els.timeCurrent) els.timeCurrent.textContent = text;
  if (els.npTimeCurrent) els.npTimeCurrent.textContent = text;
  if (els.floatingTimeCurrent) els.floatingTimeCurrent.textContent = text;
}

function setTimeTotalText(text) {
  if (els.timeTotal) els.timeTotal.textContent = text;
  if (els.npTimeTotal) els.npTimeTotal.textContent = text;
  if (els.floatingTimeTotal) els.floatingTimeTotal.textContent = text;
}

function seekFromEvent(e, progressEl) {
  if (!els.audio.duration) return;
  const rect = progressEl.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  updateProgress(ratio);
  setTimeCurrentText(formatTime(ratio * els.audio.duration));
  return ratio;
}

[els.progress, els.npProgress, els.floatingProgress].forEach(progressEl => {
  if (!progressEl) return;
  progressEl.addEventListener("mousedown", (e) => {
    isSeeking = true;
    seekTarget = progressEl;
    seekFromEvent(e, progressEl);
  });
});

els.floatingProgress?.addEventListener("keydown", event => {
  if (!els.audio.duration) return;
  const step = event.shiftKey ? 15 : 5;
  let nextTime;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextTime = els.audio.currentTime - step;
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") nextTime = els.audio.currentTime + step;
  else if (event.key === "Home") nextTime = 0;
  else if (event.key === "End") nextTime = els.audio.duration;
  else return;
  event.preventDefault();
  els.audio.currentTime = Math.max(0, Math.min(els.audio.duration, nextTime));
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

  if (els.npLyricsBody) els.npLyricsBody.innerHTML = `<p class="ui-empty music-empty">Loading lyrics...</p>`;

  try {
    const data = await requestSolara({
      types: "lyric",
      id: track.lyricId || track.id,
      source: track.source,
    });
    const parsed = parseLyricsResponse(data);
    state.lyricsCache.set(track.videoId, parsed);
    if (state.current && trackIdentity(state.current) === trackIdentity(track)) renderLyrics(parsed);

  } catch (err) {
    const parsed = { lines: null, plain: null };
    state.lyricsCache.set(track.videoId, parsed);
    if (state.current && trackIdentity(state.current) === trackIdentity(track)) renderLyrics(parsed);
  }

}

// GD Studio returns synced lyrics in LRC form, commonly with millisecond
// timestamps (and occasionally a speaker suffix such as `-1`). Keep the
// alternate field names for compatibility with other supported responses.
function parseLyricsResponse(data) {

  const payload = data?.data && typeof data.data === "object"
    ? { ...data, ...data.data }
    : (data || {});
  const syncedRaw = [payload.syncedLyrics, payload.lrc, payload.synced, payload.lyric]
    .find(value => typeof value === "string" && value.trim()) || null;
  const plainRaw = [payload.plainLyrics, payload.lyrics, payload.plain]
    .find(value => typeof value === "string" && value.trim()) || null;

  if (syncedRaw && typeof syncedRaw === "string") {
    const lines = [];
    const lineRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?(?:-\d+)?\]\s*(.*)/g;
    let match;
    while ((match = lineRe.exec(syncedRaw)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
      const time = mins * 60 + secs + fraction;
      const text = match[4].trim();
      // GD Studio may put writing/production credits in the synced feed before
      // the actual song begins; keep the lyrics view focused on sung lines.
      if (text && !isLyricsCredit(text)) lines.push({ time, text });
    }
    if (lines.length) return { lines, plain: null };

    // If a provider sends readable lyric text without recognized timestamps,
    // still show the words instead of incorrectly reporting that none exist.
    const loosePlain = syncedRaw.split(/\r?\n/)
      .map(line => line.replace(/^\s*\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?(?:-\d+)?\]\s*/, "").trim())
      .filter(line => line && !isLyricsCredit(line));
    if (loosePlain.length) return { lines: null, plain: loosePlain.join("\n") };
  }

  if (plainRaw && typeof plainRaw === "string" && plainRaw.trim()) {
    return { lines: null, plain: plainRaw.trim() };
  }

  return { lines: null, plain: null };
}

function isLyricsCredit(text) {
  return /^(?:作词|作曲|制作人|编曲|演唱|原唱|词曲|混音|录音|母带|监制)\s*[:：]/i.test(text);
}

function renderLyrics(parsed) {

  if (!els.npLyricsBody) return;
  els.npLyricsBody.innerHTML = "";
  lyricsScrollState.activeIndex = -1;

  if (parsed.lines && parsed.lines.length) {
    parsed.lines.forEach((line, i) => {
      const p = document.createElement("p");
      p.className = "np-lyric-line";
      p.dataset.time = line.time;
      p.dataset.index = i;
      p.textContent = line.text || "\u00A0"; // keep instrumental gaps clickable/visible
      p.addEventListener("click", () => {
        if (!isFinite(els.audio.duration)) return;
        els.audio.currentTime = line.time;
        if (els.audio.paused) els.audio.play().catch(() => {});
      });
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

  els.npLyricsBody.innerHTML = `<p class="ui-empty music-empty">No lyrics found for this track.</p>`;

}

// Tracks the currently active line index and drives a smooth,
// self-timed scroll (via requestAnimationFrame) instead of relying on
// scrollIntoView, which can feel like it "snaps" or fights native
// smooth-scroll timing when timeupdate fires ~4x/sec.
const lyricsScrollState = {
  activeIndex: -1,
  rafId: null,
};

window.addEventListener("blur-performance-mode-change", (event) => {
  if (event.detail?.enabled && lyricsScrollState.rafId) {
    cancelAnimationFrame(lyricsScrollState.rafId);
    lyricsScrollState.rafId = null;
  }
});

function updateActiveLyricLine(currentTime) {

  if (!els.npLyricsBody) return;

  const lines = els.npLyricsBody.querySelectorAll(".np-lyric-line");
  if (!lines.length) return;

  let activeIndex = -1;
  lines.forEach((line, i) => {
    const t = parseFloat(line.dataset.time);
    if (t <= currentTime) activeIndex = i;
  });

  if (activeIndex === lyricsScrollState.activeIndex) return;
  lyricsScrollState.activeIndex = activeIndex;

  lines.forEach((line, i) => {
    const dist = Math.abs(i - activeIndex);
    line.classList.toggle("active", i === activeIndex);
    if (i === activeIndex) {
      line.removeAttribute("data-dist");
    } else if (dist <= 2) {
      line.dataset.dist = String(dist);
    } else {
      line.removeAttribute("data-dist");
    }
  });

  if (activeIndex >= 0 && state.npOpen) {
    smoothScrollToLine(lines[activeIndex]);
  }

}

// Custom eased scroll (rather than element.scrollIntoView) so the
// motion always matches our own curve/duration and never gets cut
// short by a second scrollIntoView call landing mid-animation.
function smoothScrollToLine(lineEl) {

  if (document.documentElement.classList.contains("performance-mode")) return;

  const container = els.npLyricsBody;
  const containerRect = container.getBoundingClientRect();
  const lineRect = lineEl.getBoundingClientRect();

  const currentScroll = container.scrollTop;
  const target =
    currentScroll +
    (lineRect.top - containerRect.top) -
    (containerRect.height / 2 - lineRect.height / 2);

  if (lyricsScrollState.rafId) cancelAnimationFrame(lyricsScrollState.rafId);

  const start = currentScroll;
  const delta = target - start;
  const duration = 500;
  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    container.scrollTop = start + delta * easeOutCubic(t);
    if (t < 1) {
      lyricsScrollState.rafId = requestAnimationFrame(step);
    } else {
      lyricsScrollState.rafId = null;
    }
  }

  lyricsScrollState.rafId = requestAnimationFrame(step);

}
