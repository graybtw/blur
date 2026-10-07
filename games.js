/* ============================================================
   GAMES CONFIG
   ------------------------------------------------------------
   To add a new game, just push another object onto GAMES.
============================================================ */

const CATEGORIES = [
    { key:'all',       label:'All' },
    { key:'favorites', label:'Favorites' },
    // YouTube Playables
    { key:'youtube',   label:'YouTube Playables' },
    // Dominum Providers
    { key:'gn-math',   label:'GN-Math' },
    { key:'petezah',   label:'PeteZah' },
    { key:'ugs',       label:'UGS' },
    { key:'seraph',    label:"Noah's Tutoring Hub" },
];

// Track which categories are series for the divider
const SERIES_CATEGORIES = [];

const GAMES = [];

// Dedicated server entries appear only in the banner section, never in the
// searchable game catalog. Set `banner` to an image path when you choose art.
const DEDICATED_SERVERS = [
    {
        id: 'minecraft',
        title: 'Minecraft',
        description: 'Step into a world made entirely of blocks. Gather resources, craft your tools, and build anything you can imagine—from a quiet home in the hills to a sprawling city. Explore caves, discover new biomes, and choose your own pace: create freely or see how long you can survive after night falls.',
        rating: 'E10+',
        year: '2011',
        type: 'Dedicated server',
        url: 'https://classroom.google.com.portal-network.com/c/423567943',
        banner: 'assets/images/minecraft.png'
    },

    {
        id: 'ultrakill',
        title: 'Ultrakill',
        description: 'ULTRAKILL is a fast-paced ultraviolent old school FPS that fuses together classic shooters like Quake, modern shooters like Doom (2016) and character action games like Devil May Cry. Mankind has gone extinct and the only beings left on earth are machines fueled by blood.  But now that blood is starting to run out on the surface... Machines are racing to the depths of Hell in search of more',
        rating: 'M',
        year: '2020',
        type: 'Dedicated server',
        url: 'https://ultrakill.bergbok.party/',
        banner: 'assets/images/ultrakill.png'
    }
];

const RECENT_LIMIT = 10;
const GAMES_FAVORITES_KEY = 'blur_favorite_games';
const GAMES_RECENT_KEY = 'blur_recent_games';
const GAMES_RATINGS_KEY = 'blur_game_ratings_v1';
const GAME_RATING_THRESHOLD_MS = 5 * 60 * 1000;

// ============================================================
// DOMINUM PROVIDERS - Fetch games from GitHub
// ============================================================

const DOMINUM_PROVIDERS = {
    'gn-math': {
        url: 'https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json',
        map: (data) => data.filter(g => g.id !== -1 && !g.name.startsWith("[!]")).map((z, index) => ({
            id: `gn-${z.id}`,
            title: z.name,
            category: 'gn-math',
            src: z.url,
            thumb: 'https://cdn.jsdelivr.net/gh/freebuisness/covers@main/' + (z.cover || '').replace('{COVER_URL}', '').replace(/^\//, ''),
            provider: 'gn-math',
            addedOrder: index
        }))
    },
    'petezah': {
        url: 'https://cdn.jsdelivr.net/gh/PeteZah-G/singlefile-json@main/search.json',
        map: (data) => (data.games || []).map((g, index) => {
            let finalUrl = g.url;
            if (finalUrl && !finalUrl.endsWith('index.html') && !finalUrl.match(/\.\w+$/)) {
                finalUrl = finalUrl.replace(/\/$/, '') + '/index.html';
            }
            return {
                id: `petezah-${g.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                title: g.label,
                category: 'petezah',
                src: finalUrl,
                thumb: g.imageUrl || '',
                provider: 'petezah',
                addedOrder: index,
                categories: g.categories || []
            };
        })
    },
    'ugs': {
        url: null,
        map: async () => {
            const repos = ["tharun9772/ugs-1", "tharun9772/ugs-2", "tharun9772/ugs-3"];
            let games = [];
            let globalIndex = 0;
            for (const repo of repos) {
                try {
                    const r = await fetch(`https://api.github.com/repos/${repo}/contents/`);
                    const d = await r.json();
                    d.forEach(f => {
                        if (f.type === "file" && f.name.startsWith("cl") && f.name.endsWith(".html")) {
                            let cleanName = f.name.replace(/^cl/, "").replace(".html", "");
                            cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                            games.push({
                                id: `ugs-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                                title: cleanName,
                                category: 'ugs',
                                src: `https://cdn.jsdelivr.net/gh/${repo}@main/${f.name}`,
                                thumb: "https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png",
                                provider: 'ugs',
                                addedOrder: globalIndex++
                            });
                        }
                    });
                } catch (e) {
                    console.warn("UGS fetch failed for:", repo);
                }
            }
            return games;
        }
    },
    'seraph': {
        // Kept under the existing provider key so saved category selections
        // continue to work while the source is replaced.
        url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/master/games.js',
        format: 'javascript',
        map: (data) => data.map((g, index) => ({
            id: `noah-${String(g.title || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '_')}-${index}`,
            title: g.title || 'Untitled game',
            description: g.desc || '',
            category: 'seraph',
            src: g.url || '',
            thumb: g.image || '',
            provider: 'noah',
            providerLabel: "Noah's Tutoring Hub",
            addedOrder: index,
            secret: !!g.secret
        })).filter(g => g.src)
    }
};

let providerGamesCache = {};
let providerGamesLoaded = {};
let providerInFlight = {};
let providerFailures = {};

async function fetchProviderGames(providerKey) {
    if (providerGamesLoaded[providerKey]) return providerGamesCache[providerKey] || [];

    // dedupe concurrent requests for the same provider
    if (providerInFlight[providerKey]) return providerInFlight[providerKey];

    const provider = DOMINUM_PROVIDERS[providerKey];
    if (!provider) return [];

    providerInFlight[providerKey] = (async () => {
        try {
            let data;
            if (providerKey === 'ugs') {
                data = await provider.map();
            } else if (provider.format === 'javascript') {
                const response = await fetch(provider.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const source = await response.text();
                const match = source.match(/(?:const|let|var)\s+games\s*=\s*(\[[\s\S]*\])\s*;?/);
                if (!match) throw new Error('Provider script did not contain a games array');
                // The source is a plain array of object literals. Evaluate only
                // that extracted array so the provider's surrounding script is
                // never executed by the page.
                let parsed;
                try { parsed = Function(`"use strict"; return (${match[1]});`)(); }
                catch (parseError) { throw new Error(`Invalid provider games array: ${parseError.message}`); }
                data = provider.map(parsed);
            } else {
                const response = await fetch(provider.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const json = await response.json();
                data = provider.map(json);
            }
            providerGamesCache[providerKey] = data;
            providerGamesLoaded[providerKey] = true;
            delete providerFailures[providerKey];
            return data;
        } catch (err) {
            console.error(`Failed to fetch ${providerKey}:`, err);
            providerGamesCache[providerKey] = [];
            providerGamesLoaded[providerKey] = true;
            providerFailures[providerKey] = true;
            return [];
        }
    })();

    const result = await providerInFlight[providerKey];
    delete providerInFlight[providerKey];
    return result;
}

// ============================================================
// YOUTUBE PLAYABLES - Fetch games from GitHub repo
// ============================================================

const YOUTUBE_REPO_URL = 'https://api.github.com/repos/graybtw/youtube-playables/contents';

let youtubeGamesCache = null;
let youtubeGamesLoaded = false;
let youtubeGamesPromise = null;

function formatGameName(folderName) {
    return folderName
        .replace(/^[0-9]+-/, '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getGameIdFromFolder(folderName) {
    return folderName
        .replace(/^[0-9]+-/, '')
        .replace(/-/g, '');
}

async function fetchYouTubePlayables() {
    if (youtubeGamesLoaded) return youtubeGamesCache;
    if (youtubeGamesPromise) return youtubeGamesPromise;

    youtubeGamesPromise = (async () => {
        try {
            const response = await fetch(YOUTUBE_REPO_URL);
            if (!response.ok) throw new Error(`Failed to fetch repo contents: ${response.status}`);
            const contents = await response.json();
            const folders = contents.filter(item => item.type === 'dir');
            const games = folders.map(folder => {
                const folderName = folder.name;
                const gameId = getGameIdFromFolder(folderName);
                const gameTitle = formatGameName(folderName);
                return {
                    id: `yt-${gameId}`,
                    title: gameTitle,
                    category: 'youtube',
                    src: `https://raw.githubusercontent.com/graybtw/youtube-playables/main/${folderName}/index.html`,
                    thumb: `https://raw.githubusercontent.com/graybtw/youtube-playables/main/${folderName}/icon.png`,
                    youtube: true,
                    folder: folderName,
                };
            });
            games.sort((a, b) => a.title.localeCompare(b.title));
            youtubeGamesCache = games;
            youtubeGamesLoaded = true;
            return games;
        } catch (err) {
            console.error('Failed to fetch YouTube Playables:', err);
            youtubeGamesCache = [];
            youtubeGamesLoaded = true;
            return [];
        } finally {
            youtubeGamesPromise = null;
        }
    })();
    return youtubeGamesPromise;
}

// ============================================================
// GET ALL GAMES (Combines YouTube + Dominum providers)
// Providers load CONCURRENTLY; concurrent callers share one load.
// ============================================================

let allGamesCache = null;
let allGamesPromise = null;
let catalogLoadFailed = false;

async function getAllGames() {
    if (allGamesCache) return allGamesCache;
    if (allGamesPromise) return allGamesPromise;

    allGamesPromise = (async () => {
        const providerKeys = ['gn-math', 'petezah', 'ugs', 'seraph'];
        const results = await Promise.all(providerKeys.map(key => fetchProviderGames(key)));
        let allGames = [].concat(...results);

        const youtubeGames = await fetchYouTubePlayables();
        allGames = allGames.concat(youtubeGames);

        catalogLoadFailed = allGames.length === 0 &&
            Object.keys(providerFailures).length > 0;
        allGamesCache = allGames;
        return allGames;
    })();

    const result = await allGamesPromise;
    allGamesPromise = null;
    return result;
}

// Get games by category (always operates on the FULL catalog)
async function getGamesByCategory(categoryKey, searchQuery = '') {
    const allGames = await getAllGames();
    const q = searchQuery.trim().toLowerCase();

    return allGames.filter(g => {
        const matchesSearch = !q || g.title.toLowerCase().includes(q);

        if (categoryKey === 'favorites') {
            return isGameFavorite(g.id) && matchesSearch;
        }
        if (categoryKey === 'all') {
            return matchesSearch;
        }
        return g.category === categoryKey && matchesSearch;
    });
}

// ============================================================
// BLOB LOADER - Load games with blob URLs (like Dominum)
// ============================================================

async function loadGameAsBlob(game) {
    try {
        let url = game.src;
        
        // If it's a provider game with relative URL, resolve it
        if (game.provider === 'gn-math' && !game.src.startsWith('http')) {
            url = 'https://cdn.jsdelivr.net/gh/freebuisness/html@main/' + game.src.replace('{HTML_URL}', '');
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let html = await response.text();
        
        // Add base tag for relative paths
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        if (!html.includes('<base ')) {
            html = html.replace('</head>', `<base href="${baseUrl}"></head>`);
        }
        
        const blob = new Blob([html], { type: 'text/html' });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('Blob load failed:', e);
        return null;
    }
}

// ============================================================
// STATE + PERSISTENCE
// ============================================================

let activeCategory = 'all';
let searchQuery = '';
let gamesFavoritesCache = null;
let gamePlaySession = null;
let ratingPopupGame = null;
let ratingPopupValue = 0;

function loadGameRatingState() {
    try {
        const raw = localStorage.getItem(GAMES_RATINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            disabled: parsed?.disabled === true,
            ratings: parsed?.ratings && typeof parsed.ratings === 'object' ? parsed.ratings : {},
            playedMs: parsed?.playedMs && typeof parsed.playedMs === 'object' ? parsed.playedMs : {},
            played: parsed?.played && typeof parsed.played === 'object' ? parsed.played : {},
            prompted: parsed?.prompted && typeof parsed.prompted === 'object' ? parsed.prompted : {}
        };
    } catch (_) {
        return { disabled: false, ratings: {}, playedMs: {}, played: {}, prompted: {} };
    }
}

function saveGameRatingState(state) {
    try { localStorage.setItem(GAMES_RATINGS_KEY, JSON.stringify(state)); } catch (_) { /* local-only preference */ }
}

function getGameRatingEntries() {
    return Object.entries(loadGameRatingState().ratings)
        .map(([id, value]) => ({ id, value: Number(value?.value) || 0, updatedAt: Number(value?.updatedAt) || 0 }))
        .filter(entry => entry.value >= 0.5 && entry.value <= 5);
}

function gameRatingSummary(gameId) {
    const entry = getGameRatingEntries().find(item => item.id === gameId);
    return entry ? { average: entry.value, count: 1 } : null;
}

function beginGameRatingSession(game) {
    if (gamePlaySession) finishGameRatingSession();
    const state = loadGameRatingState();
    const alreadyPlayed = state.played[game.id] === true;
    state.played[game.id] = true;
    saveGameRatingState(state);
    gamePlaySession = {
        id: game.id,
        title: game.title,
        startedAt: Date.now(),
        previousMs: Number(state.playedMs[game.id]) || 0,
        alreadyPlayed
    };
}

function finishGameRatingSession() {
    const session = gamePlaySession;
    gamePlaySession = null;
    if (!session) return;

    const elapsed = Math.max(0, Date.now() - session.startedAt);
    const state = loadGameRatingState();
    const totalMs = Math.min(24 * 60 * 60 * 1000, session.previousMs + elapsed);
    state.playedMs[session.id] = totalMs;
    saveGameRatingState(state);

    if (!state.disabled && !session.alreadyPlayed && totalMs >= GAME_RATING_THRESHOLD_MS && !state.prompted[session.id] && !state.ratings[session.id]) {
        state.prompted[session.id] = Date.now();
        saveGameRatingState(state);
        showGameRatingPopup({ id: session.id, title: session.title });
    }
}

function renderGamesTopRated(allGames = null) {
    const section = document.getElementById('gamesTopRatedSection');
    const row = document.getElementById('gamesTopRatedRow');
    if (!section || !row) return;
    const weekCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const entries = getGameRatingEntries().filter(entry => !entry.updatedAt || entry.updatedAt >= weekCutoff);
    if (!entries.length) {
        section.hidden = true;
        row.replaceChildren();
        return;
    }
    const catalog = allGames || allGamesCache || [];
    const games = entries
        .map(entry => ({ game: catalog.find(game => game.id === entry.id), entry }))
        .filter(item => item.game)
        .sort((a, b) => b.entry.value - a.entry.value || b.entry.updatedAt - a.entry.updatedAt)
        .slice(0, 10)
        .map(item => item.game);
    if (!games.length) {
        section.hidden = true;
        return;
    }
    section.hidden = false;
    row.replaceChildren(...games.map(game => createGameCardElement(game)));
}

function setRatingPopupValue(value) {
    ratingPopupValue = Math.max(0.5, Math.min(5, Math.round(value * 2) / 2));
    const popup = document.getElementById('gamesRatingOverlay');
    if (!popup) return;
    popup.querySelectorAll('.games-rating-star').forEach((star, index) => {
        const fill = Math.max(0, Math.min(1, ratingPopupValue - index));
        star.style.setProperty('--star-fill', `${fill * 100}%`);
        star.classList.toggle('is-active', fill > 0);
    });
    const valueLabel = popup.querySelector('[data-rating-value]');
    if (valueLabel) valueLabel.textContent = `${ratingPopupValue.toFixed(1)} / 5`;
    const confirm = popup.querySelector('[data-rating-confirm]');
    if (confirm) confirm.hidden = false;
}

function hideGameRatingPopup() {
    const popup = document.getElementById('gamesRatingOverlay');
    if (!popup) return;
    popup.classList.remove('is-visible');
    setTimeout(() => { popup.hidden = true; }, 180);
    ratingPopupGame = null;
    ratingPopupValue = 0;
}

function showGameRatingPopup(game) {
    const popup = document.getElementById('gamesRatingOverlay');
    if (!popup || !game) return;
    ratingPopupGame = game;
    ratingPopupValue = 0;
    popup.querySelector('[data-rating-game]').textContent = game.title;
    popup.querySelector('[data-rating-value]').textContent = 'Choose a rating';
    popup.querySelector('[data-rating-confirm]').hidden = true;
    popup.querySelectorAll('.games-rating-star').forEach(star => {
        star.style.setProperty('--star-fill', '0%');
        star.classList.remove('is-active');
    });
    popup.hidden = false;
    requestAnimationFrame(() => popup.classList.add('is-visible'));
}

function saveGameRating() {
    if (!ratingPopupGame || !ratingPopupValue) return;
    const state = loadGameRatingState();
    state.ratings[ratingPopupGame.id] = { value: ratingPopupValue, updatedAt: Date.now() };
    saveGameRatingState(state);
    hideGameRatingPopup();
    Promise.resolve(getAllGames()).then(renderGamesTopRated);
}

window.BlurGameRatings = {
    getState: loadGameRatingState,
    getEntries: getGameRatingEntries,
    getSummary(gameId) { return gameRatingSummary(gameId); },
    setSurveysEnabled(enabled) {
        const state = loadGameRatingState();
        state.disabled = !enabled;
        saveGameRatingState(state);
        return !state.disabled;
    }
};
window.getAllGames = getAllGames;

// progressive rendering state
const GRID_BATCH_SIZE = 50;
let filteredCatalog = [];   // full filtered result set (JS only)
let renderedCount = 0;      // how many of those exist as DOM cards
let gridSentinel = null;
let gridObserver = null;
let gridRenderToken = 0;    // cancels stale async filter/render passes

function resetProviderData() {
    allGamesCache = null;
    allGamesPromise = null;
    providerGamesCache = {};
    providerGamesLoaded = {};
    providerInFlight = {};
    providerFailures = {};
    catalogLoadFailed = false;
    youtubeGamesCache = null;
    youtubeGamesLoaded = false;
    youtubeGamesPromise = null;
}

function loadGamesIds(key) {
    try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function saveGamesIds(key, ids) {
    try {
        localStorage.setItem(key, JSON.stringify(ids));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function getGamesFavorites() {
    if (gamesFavoritesCache === null) {
        gamesFavoritesCache = loadGamesIds(GAMES_FAVORITES_KEY);
    }
    return gamesFavoritesCache;
}

function isGameFavorite(id) {
    return getGamesFavorites().includes(id);
}

function toggleGameFavorite(id) {
    let favs = getGamesFavorites();
    const index = favs.indexOf(id);
    if (index > -1) {
        favs.splice(index, 1);
    } else {
        favs.unshift(id);
    }
    saveGamesIds(GAMES_FAVORITES_KEY, favs);
    gamesFavoritesCache = favs;

    // sync every rendered card for this game in place — no re-render
    syncFavoriteButtons(id);

    // membership changed: favorites/category counts + favorites view
    renderGameCategoryControls();
    if (activeCategory === 'favorites') {
        applyFilters();
    }
}

/** Updates the heart state of every rendered card for one game without re-rendering the grid. */
function syncFavoriteButtons(id) {
    const fav = isGameFavorite(id);
    document.querySelectorAll(`.game-fav-btn[data-fav-id="${CSS.escape(id)}"]`).forEach(btn => {
        btn.classList.toggle('active', fav);
        btn.setAttribute('aria-pressed', String(fav));
        btn.title = fav ? 'Remove from favorites' : 'Add to favorites';
    });
}

function getGamesRecent() {
    return loadGamesIds(GAMES_RECENT_KEY);
}

function getGamesRecent() {
    return loadGamesIds(GAMES_RECENT_KEY);
}

function addGamesRecent(id) {
    let recent = getGamesRecent().filter(r => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, RECENT_LIMIT);
    saveGamesIds(GAMES_RECENT_KEY, recent);
}

// ============================================================
// HELPER: count games per category
// ============================================================

let categoryCounts = {};

async function updateCategoryCounts() {
    const allGames = await getAllGames();
    const counts = {};
    allGames.forEach(g => {
        counts[g.category] = (counts[g.category] || 0) + 1;
    });
    counts.all = allGames.length;
    counts.favorites = getGamesFavorites().length;
    categoryCounts = counts;
}

function getCategoryCount(categoryKey) {
    if (categoryKey === 'favorites') return getGamesFavorites().length;
    return categoryCounts[categoryKey] || 0;
}

// ============================================================
// INIT GAMES
// ============================================================

async function initGames() {
    const panel = document.querySelector('.games-panel');
    if (!panel || panel.dataset.built) return;
    panel.dataset.built = 'true';

    gamesFavoritesCache = null;

    panel.innerHTML = `
        <div class="games-app">
            <div class="games-app-inner">
                <!-- Browse View -->
                <div id="gamesBrowseView">
                    <div class="games-toolbar">
                        <div class="games-search-wrap">
                            <div class="games-search ui-field">
                                <span class="games-search-icon">
                                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                                </span>
                                <input type="text" id="gamesSearchInput" placeholder="Search games" aria-label="Search games" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="gamesSearchSuggestions">
                                <button type="button" class="games-search-clear" id="gamesSearchClear" aria-label="Clear search" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
                                <div id="gamesSearchSuggestions" class="games-search-suggestions" role="listbox" aria-label="Game search suggestions" hidden></div>
                            </div>

                            <div class="watch-tabs games-category-tabs" id="gamesCategoryTabs" aria-label="Game categories">
                                <button type="button" class="watch-tab games-category-tab active" data-cat="all" aria-pressed="true">All</button>
                                <button type="button" class="watch-tab games-category-tab" data-cat="favorites" aria-pressed="false">Favorites</button>
                                <div class="games-providers" id="gamesProviders">
                                    <button type="button" class="watch-tab games-category-tab games-providers-trigger" id="gamesProvidersBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="gamesDropdownMenu" aria-label="Browse provider categories">
                                        <span id="gamesProvidersLabel">Providers</span>
                                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
                                    </button>
                                    <div class="games-dropdown-menu games-providers-menu ui-menu" id="gamesDropdownMenu" role="menu" aria-label="Game providers"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <section class="games-dedicated-section watch-hero watch-hero-feature games-dedicated-feature" id="gamesDedicatedFeature" aria-label="Dedicated servers">
                        <div class="hero-background">
                            <img id="gamesDedicatedBanner" alt="" aria-hidden="true">
                            <img id="gamesDedicatedBannerNext" class="hero-image-next" alt="" aria-hidden="true">
                            <div class="hero-overlay"></div>
                        </div>
                        <div class="hero-content">
                            <h1 id="gamesDedicatedTitle"></h1>
                            <p id="gamesDedicatedDescription"></p>
                            <div id="gamesDedicatedMeta" class="games-dedicated-meta" aria-label="Game details"></div>
                            <div class="hero-actions">
                                <button type="button" class="games-dedicated-launch" id="gamesDedicatedLaunch">
                                    ▶ Play now
                                </button>
                            </div>
                        </div>
                        <div class="hero-dots" id="gamesDedicatedDots" aria-label="Dedicated server selection" hidden></div>
                    </section>

                    <div class="games-section" id="gamesRecentSection">
                        <div class="games-section-title">
                            <h2>Recently Played</h2>
                            <span>Jump back in</span>
                        </div>
                        <div class="games-row-wrap">
                            <button type="button" class="games-row-arrow left" data-target="gamesRecentRow" data-dir="-1" aria-label="Scroll recently played left">&#8249;</button>
                            <div class="games-row" id="gamesRecentRow"></div>
                            <button type="button" class="games-row-arrow right" data-target="gamesRecentRow" data-dir="1" aria-label="Scroll recently played right">&#8250;</button>
                        </div>
                    </div>

                    <div class="games-section games-top-rated-section" id="gamesTopRatedSection" hidden>
                        <div class="games-section-title">
                            <h2>Weekly top rated</h2>
                            <span>Highest-rated games this week</span>
                        </div>
                        <div class="games-row-wrap">
                            <button type="button" class="games-row-arrow left" data-target="gamesTopRatedRow" data-dir="-1" aria-label="Scroll weekly top rated left">&#8249;</button>
                            <div class="games-row" id="gamesTopRatedRow"></div>
                            <button type="button" class="games-row-arrow right" data-target="gamesTopRatedRow" data-dir="1" aria-label="Scroll weekly top rated right">&#8250;</button>
                        </div>
                    </div>

                    <div class="games-section">
                        <div class="games-section-title">
                            <h2 id="gamesGridTitle">All Games</h2>
                            <span id="gamesGridCount"></span>
                        </div>
                        <div class="games-grid" id="gamesGrid">
                            <div class="ui-empty games-loading-state">
                                <span class="ui-spinner"></span>
                                <p>Loading games…</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Player View -->
                <div id="gamesPlayerView" class="games-player-view hidden">
                    <div class="games-player-topbar">
                        <div class="games-player-info">
                            <img id="gamePlayerThumb" src="" alt="" onerror="this.style.display='none'">
                            <h2 id="gamePlayerTitle"></h2>
                            <span id="gamePlayerCategory" class="games-player-category"></span>
                        </div>
                        <div class="games-player-controls">
                            <button id="gamePlayerReload" title="Reload Game" class="games-player-btn">
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M23 4v6h-6"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
</svg>
                            </button>
                            <button id="gamePlayerPopout" title="Open in new tab" class="games-player-btn">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                            </button>
                            <button id="gamePlayerFullscreen" title="Fullscreen" class="games-player-btn">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
                                </svg>
                            </button>
                            <button id="gamePlayerClose" title="Close" class="games-player-btn">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M6 6l12 12M18 6L6 18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="games-player-frame">
                        <iframe id="gamePlayerFrame" src="" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        </div>
        <div id="gamesRatingOverlay" class="games-rating-overlay" hidden aria-hidden="true">
            <section class="games-rating-dialog" role="dialog" aria-modal="true" aria-labelledby="gamesRatingTitle">
                <button type="button" class="games-rating-close" data-rating-close aria-label="Close rating prompt">×</button>
                <span class="games-rating-kicker">quick question</span>
                <h2 id="gamesRatingTitle">What would you rate this game?</h2>
                <p class="games-rating-game" data-rating-game></p>
                <div class="games-rating-stars" data-rating-stars aria-label="Rate from half a star to five stars">
                    ${[0, 1, 2, 3, 4].map(index => `<button type="button" class="games-rating-star" data-rating-star="${index}" aria-label="${index + 1} star"><span aria-hidden="true">★</span></button>`).join('')}
                </div>
                <div class="games-rating-value" data-rating-value>Choose a rating</div>
                <button type="button" class="games-rating-confirm ui-button ui-button--primary" data-rating-confirm hidden>Save rating</button>
                <button type="button" class="games-rating-optout" data-rating-optout>Close &amp; don’t show again</button>
            </section>
        </div>
    `;

    await updateCategoryCounts();
    renderGameCategoryControls();
    renderDedicatedServerFeature();
    renderGamesRecentRow();
    renderGamesTopRated();
    applyFilters();
    bindGamesEvents();
    startDedicatedServerRotation();
}

function renderGameCategoryControls() {
    const menu = document.getElementById('gamesDropdownMenu');
    const trigger = document.getElementById('gamesProvidersBtn');
    const triggerLabel = document.getElementById('gamesProvidersLabel');
    const primaryCategories = new Set(['all', 'favorites']);
    const selectedCategory = CATEGORIES.find(category => category.key === activeCategory);
    const selectedProvider = selectedCategory && !primaryCategories.has(selectedCategory.key);

    document.querySelectorAll('#gamesCategoryTabs > .games-category-tab[data-cat]').forEach(button => {
        const selected = button.dataset.cat === activeCategory;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    });

    triggerLabel.textContent = selectedProvider ? selectedCategory.label : 'Providers';
    trigger.classList.toggle('active', !!selectedProvider);
    trigger.setAttribute('aria-label', selectedProvider
        ? `Provider categories. Selected: ${selectedCategory.label}`
        : 'Browse provider categories');

    const providers = CATEGORIES.filter(category => !primaryCategories.has(category.key));
    const fragment = document.createDocumentFragment();
    let previousWasSeries = false;

    providers.forEach((category, index) => {
        const isSeries = SERIES_CATEGORIES.includes(category.key);
        if (isSeries && !previousWasSeries && index > 0) {
            const divider = document.createElement('div');
            divider.className = 'games-dropdown-divider ui-menu__divider';
            divider.setAttribute('role', 'separator');
            fragment.appendChild(divider);
        }

        const selected = category.key === activeCategory;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `games-dropdown-item ui-menu__item${selected ? ' active' : ''}`;
        item.dataset.cat = category.key;
        item.setAttribute('role', 'menuitemradio');
        item.setAttribute('aria-checked', String(selected));
        item.tabIndex = selected || (!providers.some(provider => provider.key === activeCategory) && index === 0) ? 0 : -1;

        const name = document.createElement('span');
        name.className = 'games-dropdown-item-label';
        name.textContent = category.label;

        const count = document.createElement('span');
        count.className = 'games-dropdown-item-count';
        count.textContent = getCategoryCount(category.key);

        item.append(name, count);
        fragment.appendChild(item);
        previousWasSeries = isSeries;
    });

    menu.replaceChildren(fragment);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

async function renderGamesRecentRow() {
    const section = document.getElementById('gamesRecentSection');
    const row = document.getElementById('gamesRecentRow');
    const ids = getGamesRecent();

    const allGames = await getAllGames();
    const games = ids.map(id => allGames.find(g => g.id === id)).filter(Boolean);

    if (games.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    row.innerHTML = '';
    games.forEach(g => {
        row.appendChild(createGameCardElement(g));
    });
}

// ============================================================
// PROGRESSIVE GRID RENDERING
// Full filtered catalog lives in JS; only GRID_BATCH_SIZE cards
// exist in the DOM at a time. A sentinel + IntersectionObserver
// appends the next batch as the user approaches the bottom.
// ============================================================

function gridEmptyStateHtml() {
    if (activeCategory === 'favorites') {
        return `
            <div class="ui-empty games-empty">
                <strong>No favorites yet</strong>
                <p>Hover a game and tap the heart to save it here.</p>
            </div>`;
    }
    if (searchQuery.trim()) {
        return `
            <div class="ui-empty games-empty">
                <strong>No games found</strong>
                <p>No results for "${escapeHtml(searchQuery.trim())}". Try a different search.</p>
            </div>`;
    }
    return `
        <div class="ui-empty games-empty">
            <strong>No games found</strong>
            <p>Try a different search or category.</p>
        </div>`;
}

/** Recomputes the filtered catalog and renders the first batch. */
async function applyFilters() {
    const token = ++gridRenderToken;
    const grid = document.getElementById('gamesGrid');
    const title = document.getElementById('gamesGridTitle');
    const count = document.getElementById('gamesGridCount');

    if (!allGamesCache) {
        grid.innerHTML = `
            <div class="ui-empty games-loading-state">
                <span class="ui-spinner"></span>
                <p>Loading games…</p>
            </div>
        `;
    }

    filteredCatalog = await getGamesByCategory(activeCategory, searchQuery);
    if (token !== gridRenderToken) { window.__nfLog = 'STALE token ' + token + ' vs ' + gridRenderToken; return; }

    renderGamesTopRated(allGamesCache || []);

    renderGamesSearchSuggestions(filteredCatalog, searchQuery.trim());

    window.__nfLog = 'branch check: catalogLoadFailed=' + catalogLoadFailed + ' catalog=' + filteredCatalog.length;

    // every provider failed → this is an error, not an empty catalog
    if (catalogLoadFailed) {
        grid.innerHTML = `
            <div class="ui-error games-load-error">
                <span>Couldn't load the game catalog right now. Check your connection.</span>
                <button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-catalog>Retry</button>
            </div>
        `;
        grid.querySelector('[data-retry-catalog]').addEventListener('click', () => {
            grid.innerHTML = `<div class="ui-empty games-loading-state"><span class="ui-spinner"></span><p>Loading games…</p></div>`;
            resetProviderData();
            updateCategoryCounts().then(renderGameCategoryControls);
            applyFilters();
        });
        return;
    }

    let currentLabel = 'All Games';
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    if (cat) {
        currentLabel = cat.label;
    }
    title.textContent = searchQuery.trim() ? `Results for "${searchQuery.trim()}"` : currentLabel;
    count.textContent = `${filteredCatalog.length} game${filteredCatalog.length === 1 ? '' : 's'}`;

    renderedCount = 0;
    grid.innerHTML = '';

    if (filteredCatalog.length === 0) {
        grid.innerHTML = gridEmptyStateHtml();
        if (gridSentinel) gridSentinel.remove();
        return;
    }

    // partial provider failure: content is available, but some sources
    // are missing — tell the user quietly without replacing the grid
    const failedProviders = Object.keys(providerFailures);
    if (failedProviders.length > 0 && filteredCatalog.length > 0) {
        const notice = document.createElement('div');
        notice.className = 'ui-error games-partial-error';
        notice.innerHTML = `
            <span>Some game providers couldn't load — their games are missing from this list.</span>
            <button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-providers>Retry</button>
        `;
        notice.querySelector('[data-retry-providers]').addEventListener('click', () => {
            resetProviderData();
            updateCategoryCounts().then(renderGameCategoryControls);
            applyFilters();
        });
        grid.appendChild(notice);
    }

    renderNextBatch();
    ensureGridSentinel();
}

/** Appends the next GRID_BATCH_SIZE cards without touching existing ones. */
function renderNextBatch() {
    const grid = document.getElementById('gamesGrid');
    const end = Math.min(renderedCount + GRID_BATCH_SIZE, filteredCatalog.length);
    const frag = document.createDocumentFragment();
    for (let i = renderedCount; i < end; i++) {
        frag.appendChild(createGameCardElement(filteredCatalog[i]));
    }
    renderedCount = end;
    grid.appendChild(frag);
    if (gridSentinel) grid.appendChild(gridSentinel); // keep sentinel last
}

/** One sentinel + one observer for the whole grid. */
function ensureGridSentinel() {
    const grid = document.getElementById('gamesGrid');
    if (renderedCount >= filteredCatalog.length) return;

    if (!gridSentinel) {
        gridSentinel = document.createElement('div');
        gridSentinel.className = 'games-grid-sentinel';
        gridSentinel.setAttribute('aria-hidden', 'true');
        gridObserver = new IntersectionObserver(onGridSentinelVisible, {
            root: document.querySelector('.games-app'),
            rootMargin: '300px 0px'
        });
        gridObserver.observe(gridSentinel);
    }
    grid.appendChild(gridSentinel);
}

function onGridSentinelVisible(entries) {
    if (!entries.some(entry => entry.isIntersecting)) return;
    if (renderedCount >= filteredCatalog.length) {
        if (gridSentinel) gridSentinel.remove();
        return;
    }
    renderNextBatch();
}

function createGameCardElement(g) {
    const fav = isGameFavorite(g.id);
    const initial = g.title.charAt(0);
    const isYoutube = g.youtube === true;
    const isProvider = g.provider && !g.youtube;

    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.id = g.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Play ${g.title}`);

    const thumb = document.createElement('div');
    thumb.className = 'game-thumb';

    if (g.thumb && g.thumb.startsWith('http')) {
        const img = document.createElement('img');
        img.src = g.thumb;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function() {
            this.replaceWith(Object.assign(document.createElement('div'), {
                className: 'game-thumb-fallback',
                textContent: initial
            }));
        };
        thumb.appendChild(img);
    } else {
        const fallback = document.createElement('div');
        fallback.className = 'game-thumb-fallback';
        fallback.textContent = initial;
        thumb.appendChild(fallback);
    }

    const info = document.createElement('div');
    info.className = 'game-card-info';
    const strong = document.createElement('strong');
    strong.textContent = g.title;
    info.appendChild(strong);
    thumb.appendChild(info);

    if (g.hot) {
        const badge = document.createElement('span');
        badge.className = 'game-badge';
        badge.textContent = 'New';
        thumb.appendChild(badge);
    }

    const favBtn = document.createElement('button');
    favBtn.className = `game-fav-btn ${fav ? 'active' : ''}`;
    favBtn.dataset.favId = g.id;
    favBtn.title = fav ? 'Remove from favorites' : 'Add to favorites';
    favBtn.setAttribute('aria-label', fav ? `Remove ${g.title} from favorites` : `Add ${g.title} to favorites`);
    favBtn.setAttribute('aria-pressed', String(fav));
    favBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.6-4.7-10-9.6C.4 7.4 2.9 3.8 6.4 3.8c2.4 0 4.4 1.7 5.6 3.5 1.2-1.8 3.2-3.5 5.6-3.5 3.5 0 6 3.6 4.4 7.6-2.4 4.9-10 9.6-10 9.6z"/></svg>`;
    thumb.appendChild(favBtn);

    card.appendChild(thumb);

    return card;
}

let dedicatedServerIndex = 0;
let dedicatedServerRotationTimer = null;
let dedicatedBannerRequestId = 0;
let dedicatedBannerRequestedId = null;
let dedicatedBannerDisplayedId = null;
let dedicatedBannerActiveImage = null;
let dedicatedBannerContentTimer = null;

function renderDedicatedServerFeature() {
    const feature = document.getElementById('gamesDedicatedFeature');
    if (!feature) return;

    if (!DEDICATED_SERVERS.length) {
        feature.hidden = true;
        return;
    }

    feature.hidden = false;
    dedicatedServerIndex = Math.max(0, Math.min(dedicatedServerIndex, DEDICATED_SERVERS.length - 1));
    const server = DEDICATED_SERVERS[dedicatedServerIndex];
    const banner = document.getElementById('gamesDedicatedBanner');
    const bannerNext = document.getElementById('gamesDedicatedBannerNext');
    const title = document.getElementById('gamesDedicatedTitle');
    const description = document.getElementById('gamesDedicatedDescription');
    const meta = document.getElementById('gamesDedicatedMeta');
    const dots = document.getElementById('gamesDedicatedDots');

    feature.dataset.gameId = server.id;
    renderDedicatedServerDots(dots);
    if (dedicatedBannerRequestedId === server.id) return;
    dedicatedBannerRequestedId = server.id;

    const requestId = ++dedicatedBannerRequestId;
    const content = title.closest('.hero-content');
    const isChanging = dedicatedBannerDisplayedId !== null && dedicatedBannerDisplayedId !== server.id;
    clearTimeout(dedicatedBannerContentTimer);

    const updateCopy = () => {
        title.textContent = server.title;
        description.textContent = server.description || '';
        description.hidden = !server.description;
        meta.replaceChildren();
        [server.rating, server.year, server.type].filter(Boolean).forEach((value, index) => {
            const detail = document.createElement('span');
            detail.textContent = index === 0 && server.rating ? `ESRB ${value}` : value;
            if (index === 0 && server.rating) detail.setAttribute('aria-label', `ESRB rating ${value}`);
            meta.appendChild(detail);
        });
        meta.hidden = !meta.childElementCount;
        dedicatedBannerDisplayedId = server.id;
    };

    const commitCopy = () => {
        if (requestId !== dedicatedBannerRequestId) return;
        if (!isChanging || !content) {
            updateCopy();
            content?.classList.remove('is-changing');
            return;
        }
        content.classList.add('is-changing');
        dedicatedBannerContentTimer = setTimeout(() => {
            if (requestId !== dedicatedBannerRequestId) return;
            updateCopy();
            requestAnimationFrame(() => {
                if (requestId === dedicatedBannerRequestId) content.classList.remove('is-changing');
            });
        }, 140);
    };

    if (server.banner && banner && bannerNext) {
        banner.hidden = false;
        bannerNext.hidden = false;
        const activeImage = dedicatedBannerActiveImage || banner;
        const incomingImage = activeImage === banner ? bannerNext : banner;
        incomingImage.classList.remove('is-visible');
        incomingImage.onload = () => {
            if (requestId !== dedicatedBannerRequestId) return;
            incomingImage.classList.add('is-visible');
            activeImage.classList.remove('is-visible');
            dedicatedBannerActiveImage = incomingImage;
            commitCopy();
        };
        incomingImage.onerror = () => {
            if (requestId === dedicatedBannerRequestId) commitCopy();
        };
        incomingImage.src = server.banner;
    } else {
        [banner, bannerNext].filter(Boolean).forEach(image => {
            image.onload = null;
            image.onerror = null;
            image.removeAttribute('src');
            image.classList.remove('is-visible');
            image.hidden = true;
        });
        dedicatedBannerActiveImage = null;
        commitCopy();
    }
}

function renderDedicatedServerDots(dots) {
    if (!dots) return;
    if (dots.children.length !== DEDICATED_SERVERS.length) {
        dots.replaceChildren(...DEDICATED_SERVERS.map(() => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'hero-dot';
            return dot;
        }));
    }
    dots.hidden = DEDICATED_SERVERS.length < 2;
    DEDICATED_SERVERS.forEach((item, index) => {
        const dot = dots.children[index];
        dot.setAttribute('aria-label', `Show ${item.title}`);
        dot.setAttribute('aria-pressed', String(index === dedicatedServerIndex));
        dot.title = item.title;
        dot.classList.toggle('active', index === dedicatedServerIndex);
        dot.onclick = () => {
            dedicatedServerIndex = index;
            renderDedicatedServerFeature();
        };
    });
}

function startDedicatedServerRotation() {
    clearInterval(dedicatedServerRotationTimer);
    if (DEDICATED_SERVERS.length < 2) return;
    dedicatedServerRotationTimer = setInterval(() => {
        if (!document.querySelector('.games-panel.active') || document.documentElement.classList.contains('performance-mode')) return;
        dedicatedServerIndex = (dedicatedServerIndex + 1) % DEDICATED_SERVERS.length;
        renderDedicatedServerFeature();
    }, 8000);
}

// ============================================================
// EVENTS
// ============================================================

function bindGamesEvents() {
    const panel = document.querySelector('.games-panel');

    const ratingOverlay = document.getElementById('gamesRatingOverlay');
    const ratingStars = ratingOverlay?.querySelector('[data-rating-stars]');
    if (ratingOverlay && ratingStars) {
        const valueFromPointer = (event, star) => {
            const rect = star.getBoundingClientRect();
            const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            return Number(star.dataset.ratingStar || 0) + (fraction <= 0.5 ? 0.5 : 1);
        };
        ratingStars.addEventListener('pointermove', event => {
            const star = event.target.closest('[data-rating-star]');
            if (star) setRatingPopupValue(valueFromPointer(event, star));
        });
        ratingStars.addEventListener('pointerleave', () => {
            if (ratingPopupValue) setRatingPopupValue(ratingPopupValue);
            else ratingStars.querySelectorAll('.games-rating-star').forEach(star => star.style.setProperty('--star-fill', '0%'));
        });
        ratingStars.addEventListener('click', event => {
            const star = event.target.closest('[data-rating-star]');
            if (star) setRatingPopupValue(valueFromPointer(event, star));
        });
        ratingOverlay.querySelector('[data-rating-confirm]')?.addEventListener('click', saveGameRating);
        ratingOverlay.querySelector('[data-rating-close]')?.addEventListener('click', hideGameRatingPopup);
        ratingOverlay.querySelector('[data-rating-optout]')?.addEventListener('click', () => {
            const state = loadGameRatingState();
            state.disabled = true;
            saveGameRatingState(state);
            hideGameRatingPopup();
        });
        ratingOverlay.addEventListener('click', event => {
            if (event.target === ratingOverlay) hideGameRatingPopup();
        });
    }

    document.getElementById('gamesDedicatedLaunch').addEventListener('click', function() {
        const feature = document.getElementById('gamesDedicatedFeature');
        if (feature?.dataset.gameId) openGame(feature.dataset.gameId);
    });

    const categoryTabs = document.getElementById('gamesCategoryTabs');
    const providers = document.getElementById('gamesProviders');
    const providersBtn = document.getElementById('gamesProvidersBtn');
    const providersMenu = document.getElementById('gamesDropdownMenu');

    function closeProviders(returnFocus = false) {
        providersMenu.classList.remove('open');
        providersBtn.setAttribute('aria-expanded', 'false');
        if (returnFocus) providersBtn.focus();
    }

    function selectCategory(categoryKey, returnFocus = false) {
        if (!CATEGORIES.some(category => category.key === categoryKey)) return;
        closeProviders();
        activeCategory = categoryKey;
        renderGameCategoryControls();
        if (returnFocus) providersBtn.focus();
        applyFilters();
    }

    categoryTabs.addEventListener('click', function(e) {
        const tab = e.target.closest('.games-category-tab[data-cat]');
        if (tab) selectCategory(tab.dataset.cat);
    });

    providersBtn.addEventListener('click', function() {
        const isOpen = providersMenu.classList.toggle('open');
        providersBtn.setAttribute('aria-expanded', String(isOpen));
    });

    providersMenu.addEventListener('click', function(e) {
        const item = e.target.closest('.games-dropdown-item[data-cat]');
        if (item) selectCategory(item.dataset.cat, true);
    });

    document.addEventListener('click', function(e) {
        if (!providers.contains(e.target)) closeProviders();
    });

    providersBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && providersMenu.classList.contains('open')) {
            e.preventDefault();
            closeProviders(true);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            providersMenu.classList.add('open');
            providersBtn.setAttribute('aria-expanded', 'true');
            const items = [...providersMenu.querySelectorAll('.games-dropdown-item')];
            const target = e.key === 'ArrowDown'
                ? items.find(item => item.tabIndex === 0) || items[0]
                : items[items.length - 1];
            target?.focus();
        }
    });

    providersMenu.addEventListener('keydown', function(e) {
        const items = [...providersMenu.querySelectorAll('.games-dropdown-item')];
        const currentIndex = items.indexOf(document.activeElement);
        if (e.key === 'Escape') {
            e.preventDefault();
            closeProviders(true);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            const nextIndex = e.key === 'Home' ? 0
                : e.key === 'End' ? items.length - 1
                : (currentIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[nextIndex]?.focus();
        }
    });

    panel.addEventListener('click', function(e) {
        const favBtn = e.target.closest('.game-fav-btn');
        if (favBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = favBtn.dataset.favId;
            if (id) {
                toggleGameFavorite(id);
            }
            return;
        }

        const arrow = e.target.closest('.games-row-arrow');
        if (arrow) {
            const target = document.getElementById(arrow.dataset.target);
            if (target) target.scrollBy({ left: 320 * parseInt(arrow.dataset.dir, 10), behavior: 'smooth' });
            return;
        }

        const card = e.target.closest('.game-card');
        if (card) {
            openGame(card.dataset.id);
            return;
        }
    });

    panel.addEventListener('keydown', function(e) {
        const card = e.target.closest('.game-card');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openGame(card.dataset.id);
        }
    });

    const searchInput = document.getElementById('gamesSearchInput');
    const searchClear = document.getElementById('gamesSearchClear');
    const searchSuggestions = document.getElementById('gamesSearchSuggestions');
    let searchDebounce = null;

    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        searchClear.hidden = !searchQuery;
        activeGamesSuggestionIndex = -1;
        if (searchQuery.trim()) showGamesSearchStatus('Searching…');
        else closeGamesSearchSuggestions();
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(function() {
            applyFilters();
        }, 200);
    });

    searchInput.addEventListener('focus', function() {
        const query = searchInput.value.trim();
        if (query && query === gamesSearchSuggestionQuery) {
            searchSuggestions.hidden = false;
            searchInput.setAttribute('aria-expanded', 'true');
        }
    });

    searchInput.addEventListener('keydown', function(e) {
        if (!searchSuggestions.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            moveGamesSearchSuggestion(e.key === 'ArrowDown' ? 1 : -1);
            return;
        }
        if (e.key === 'Escape') {
            closeGamesSearchSuggestions();
            return;
        }
        if (e.key === 'Enter' && !searchSuggestions.hidden && activeGamesSuggestionIndex >= 0) {
            e.preventDefault();
            selectGamesSearchSuggestion(activeGamesSuggestionIndex);
        }
    });

    searchSuggestions.addEventListener('mousedown', function(e) {
        // Keep keyboard focus in the input until the selected result is opened.
        if (e.target.closest('.games-search-suggestion')) e.preventDefault();
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.games-search')) closeGamesSearchSuggestions();
    });

    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        searchClear.hidden = true;
        closeGamesSearchSuggestions();
        clearTimeout(searchDebounce);
        applyFilters();
        searchInput.focus();
    });

    document.getElementById('gamePlayerClose').addEventListener('click', closeGame);

    document.getElementById('gamePlayerFullscreen').addEventListener('click', function() {
        const frame = document.getElementById('gamePlayerFrame');
        if (frame.requestFullscreen) frame.requestFullscreen();
    });

    // Reload button - reloads the game
    document.getElementById('gamePlayerReload').addEventListener('click', async function() {
        const game = await findGameById(currentGameId);
        if (game) {
            const frame = document.getElementById('gamePlayerFrame');
            const btn = this;
            
            // Show loading state
            btn.style.opacity = '0.5';
            btn.style.transform = 'rotate(360deg)';
            
            // Reload the game
            if (game.provider && game.provider !== 'youtube') {
                revokeActiveGameBlob();
                const blobUrl = await loadGameAsBlob(game);
                if (blobUrl) {
                    activeGameBlobUrl = blobUrl;
                    frame.src = blobUrl;
                } else {
                    frame.src = game.src;
                }
            } else if (game.youtube) {
                await loadYouTubeGameInFrame(game);
            } else {
                frame.src = game.src;
            }
            
            // Reset button
            btn.style.opacity = '1';
            btn.style.transform = 'rotate(0deg)';
        }
    });

    document.getElementById('gamePlayerPopout').addEventListener('click', async function() {
        const game = await findGameById(currentGameId);
        if (game) {
            const btn = this;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" class="games-player-spinner">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 1 8.5 4.5"/>
                </svg>
            `;
            btn.style.opacity = '0.6';
            await openGameInNewTab(game);
            btn.innerHTML = originalHtml;
            btn.style.opacity = '1';
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (ratingOverlay && !ratingOverlay.hidden) {
                hideGameRatingPopup();
                return;
            }
            const playerView = document.getElementById('gamesPlayerView');
            if (!playerView.classList.contains('hidden')) {
                closeGame();
            }
        }
    });
}

let gamesSearchSuggestionItems = [];
let gamesSearchSuggestionQuery = '';
let activeGamesSuggestionIndex = -1;

function showGamesSearchStatus(message) {
    const panel = document.getElementById('gamesSearchSuggestions');
    const input = document.getElementById('gamesSearchInput');
    if (!panel || !input) return;
    gamesSearchSuggestionItems = [];
    gamesSearchSuggestionQuery = '';
    activeGamesSuggestionIndex = -1;
    panel.replaceChildren();
    const status = document.createElement('div');
    status.className = 'games-search-suggestion-empty';
    status.textContent = message;
    panel.appendChild(status);
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
}

function renderGamesSearchSuggestions(games, query) {
    const panel = document.getElementById('gamesSearchSuggestions');
    const input = document.getElementById('gamesSearchInput');
    if (!panel || !input) return;
    if (!query) {
        closeGamesSearchSuggestions();
        return;
    }

    const normalizedQuery = query.toLowerCase();
    const leadingMatches = [];
    const otherMatches = [];
    games.forEach(game => {
        (game.title.toLowerCase().startsWith(normalizedQuery) ? leadingMatches : otherMatches).push(game);
    });
    gamesSearchSuggestionItems = leadingMatches.concat(otherMatches).slice(0, 6);
    gamesSearchSuggestionQuery = query;
    activeGamesSuggestionIndex = -1;
    panel.replaceChildren();

    if (!gamesSearchSuggestionItems.length) {
        const empty = document.createElement('div');
        empty.className = 'games-search-suggestion-empty';
        empty.textContent = `No matches for “${query}”`;
        panel.appendChild(empty);
    } else {
        gamesSearchSuggestionItems.forEach((game, index) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'games-search-suggestion';
            option.id = `gamesSearchSuggestion${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.dataset.suggestionIndex = String(index);

            if (game.thumb) {
                const image = document.createElement('img');
                image.src = game.thumb;
                image.alt = '';
                image.loading = 'lazy';
                image.onerror = () => { image.hidden = true; };
                option.appendChild(image);
            } else {
                const fallback = document.createElement('span');
                fallback.className = 'games-search-suggestion-fallback';
                fallback.textContent = (game.title || '?').charAt(0).toUpperCase();
                fallback.setAttribute('aria-hidden', 'true');
                option.appendChild(fallback);
            }

            const copy = document.createElement('span');
            copy.className = 'games-search-suggestion-copy';
            const title = document.createElement('strong');
            title.textContent = game.title;
            const meta = document.createElement('span');
            meta.textContent = game.providerLabel || CATEGORIES.find(category => category.key === game.category)?.label || 'Game';
            copy.append(title, meta);
            option.appendChild(copy);
            option.addEventListener('click', () => selectGamesSearchSuggestion(index));
            panel.appendChild(option);
        });
    }

    panel.hidden = document.activeElement !== input;
    input.setAttribute('aria-expanded', String(!panel.hidden));
    input.removeAttribute('aria-activedescendant');
}

function closeGamesSearchSuggestions() {
    const panel = document.getElementById('gamesSearchSuggestions');
    const input = document.getElementById('gamesSearchInput');
    if (panel) panel.hidden = true;
    input?.setAttribute('aria-expanded', 'false');
    input?.removeAttribute('aria-activedescendant');
    activeGamesSuggestionIndex = -1;
}

function moveGamesSearchSuggestion(direction) {
    const panel = document.getElementById('gamesSearchSuggestions');
    const input = document.getElementById('gamesSearchInput');
    const options = panel ? [...panel.querySelectorAll('.games-search-suggestion')] : [];
    if (!options.length) return;
    activeGamesSuggestionIndex = activeGamesSuggestionIndex < 0
        ? (direction > 0 ? 0 : options.length - 1)
        : (activeGamesSuggestionIndex + direction + options.length) % options.length;
    options.forEach((option, index) => {
        const selected = index === activeGamesSuggestionIndex;
        option.setAttribute('aria-selected', String(selected));
        option.classList.toggle('active', selected);
    });
    const active = options[activeGamesSuggestionIndex];
    input?.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
}

function selectGamesSearchSuggestion(index) {
    const game = gamesSearchSuggestionItems[index];
    if (!game) return;
    closeGamesSearchSuggestions();
    openGame(game.id);
}

let currentGameId = null;
let activeGameBlobUrl = null;   // main-player blob — revoked when replaced/closed

function revokeActiveGameBlob() {
    if (activeGameBlobUrl) {
        try { URL.revokeObjectURL(activeGameBlobUrl); } catch (e) {}
        activeGameBlobUrl = null;
    }
}

async function findGameById(id) {
    const dedicatedServer = DEDICATED_SERVERS.find(game => game.id === id);
    if (dedicatedServer) {
        return {
            ...dedicatedServer,
            src: dedicatedServer.url,
            thumb: dedicatedServer.banner || '',
            providerLabel: 'Dedicated server',
            isDedicatedServer: true
        };
    }

    const allGames = await getAllGames();
    return allGames.find(g => g.id === id) || null;
}

// ============================================================
// OPEN GAME
// ============================================================

async function openGame(id) {
    const game = await findGameById(id);
    if (!game) return;

    beginGameRatingSession(game);
    currentGameId = id;
    window.BlurPresence?.setActivity("game", {
        title: game.title
    });

    if (!game.isDedicatedServer) {
        addGamesRecent(id);
        renderGamesRecentRow();
    }

    document.getElementById('gamesBrowseView').classList.add('hidden');
    document.getElementById('gamesPlayerView').classList.remove('hidden');

    document.getElementById('gamePlayerTitle').textContent = game.title;
    const categoryEl = document.getElementById('gamePlayerCategory');
    if (categoryEl) {
        categoryEl.textContent = game.youtube ? 'YouTube Playable' : (game.providerLabel || game.provider || game.category || 'Game');
        categoryEl.hidden = !categoryEl.textContent;
    }
    document.getElementById('gamePlayerThumb').src = game.thumb || '';
    document.getElementById('gamePlayerThumb').style.display = game.thumb ? '' : 'none';
    
    // For HTML provider games - use blob loading like Dominum
    if (game.provider && game.provider !== 'youtube') {
        revokeActiveGameBlob();
        const blobUrl = await loadGameAsBlob(game);
        if (blobUrl) {
            activeGameBlobUrl = blobUrl;
            document.getElementById('gamePlayerFrame').src = blobUrl;
            return;
        }
        // Fallback to direct URL
        document.getElementById('gamePlayerFrame').src = game.src;
        return;
    }
    
    // YouTube games
    if (game.youtube) {
        await loadYouTubeGameInFrame(game);
        return;
    }
    
    // Local games (if any)
    document.getElementById('gamePlayerFrame').src = game.src;
}

// ============================================================
// OPEN GAME IN NEW TAB
// ============================================================

async function openGameInNewTab(game) {
    try {
        let blobUrl = null;

        // For provider games
        if (!blobUrl && game.provider && game.provider !== 'youtube') {
            blobUrl = await loadGameAsBlob(game);
        }
        
        // Fallback to regular loading
        if (!blobUrl) {
            const html = await fetchGameHTML(game.src);
            blobUrl = createBlobURL(html);
        }
        
        const newTab = window.open(blobUrl, '_blank');
        if (newTab) {
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 5000);
        }
        return newTab;
    } catch (err) {
        console.error('Failed to open game in new tab:', err);
        return window.open(game.src, '_blank');
    }
}

// ============================================================
// FETCH GAME HTML - SUPPORT BOTH LOCAL AND REMOTE
// ============================================================

async function fetchGameHTML(url) {
    // If it's a local file (starts with / or assets/)
    if (url.startsWith('/') || url.startsWith('assets/') || url.startsWith('study/')) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch local game: ${response.status}`);
        }
        return await response.text();
    }
    
    // Otherwise, treat as full URL
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch game: ${response.status}`);
    }
    return await response.text();
}

function createBlobURL(htmlContent) {
    const wrappedHtml = htmlContent.replace(
        '</head>',
        '<base href="' + window.location.origin + '/">\n</head>'
    );
    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
}

async function loadYouTubeGameInFrame(game) {
    try {
        const html = await fetchGameHTML(game.src);
        const blobUrl = createBlobURL(html);
        document.getElementById('gamePlayerFrame').src = blobUrl;
        if (window._youtubeBlobUrls) {
            window._youtubeBlobUrls.push(blobUrl);
        } else {
            window._youtubeBlobUrls = [blobUrl];
        }
        return blobUrl;
    } catch (err) {
        console.error('Failed to load YouTube game:', err);
        document.getElementById('gamePlayerFrame').src = game.src;
        return null;
    }
}

function closeGame() {
    finishGameRatingSession();
    if (window._youtubeBlobUrls) {
        window._youtubeBlobUrls.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) {}
        });
        window._youtubeBlobUrls = [];
    }
    revokeActiveGameBlob();
    
    document.getElementById('gamesPlayerView').classList.add('hidden');
    document.getElementById('gamesBrowseView').classList.remove('hidden');
    document.getElementById('gamePlayerFrame').src = '';
    document.getElementById('gamePlayerThumb').style.display = '';
    currentGameId = null;
    window.BlurPresence?.clearActivity("game");
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    window.initGames = initGames;
    if (document.querySelector('.games-panel.active')) {
        initGames();
    }
});
