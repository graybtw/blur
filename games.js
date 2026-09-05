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
    { key:'truffled',  label:'Truffled' },
    { key:'petezah',   label:'PeteZah' },
    { key:'ugs',       label:'UGS' },
    { key:'seraph',    label:'Seraph' },
];

// Track which categories are series for the divider
const SERIES_CATEGORIES = [];

const GAMES = [];

const RECENT_LIMIT = 10;
const GAMES_FAVORITES_KEY = 'blur_favorite_games';
const GAMES_RECENT_KEY = 'blur_recent_games';

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
    'truffled': {
        url: 'https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json',
        map: (data) => (data.games || []).map((g, index) => ({
            id: `truffled-${g.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            title: g.name,
            category: 'truffled',
            src: g.url,
            thumb: g.thumbnail,
            provider: 'truffled',
            addedOrder: index,
            rawUrl: g.url,
            frameType: g.frameType || 'iframe'
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
        url: 'https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json',
        map: (data) => data.map((g, index) => {
            const gamePath = g.url.endsWith('index.html') ? g.url : g.url.replace(/\/?$/, '/index.html');
            return {
                id: `seraph-${g.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                title: g.name,
                category: 'seraph',
                src: gamePath.startsWith('http') ? gamePath : "https://cdn.jsdelivr.net/gh/a456pur/seraph@main/" + gamePath.replace(/^\//, ''),
                thumb: g.img || '',
                provider: 'seraph',
                addedOrder: index
            };
        })
    }
};

let providerGamesCache = {};
let providerGamesLoaded = {};

async function fetchProviderGames(providerKey) {
    if (providerGamesLoaded[providerKey]) return providerGamesCache[providerKey] || [];
    
    const provider = DOMINUM_PROVIDERS[providerKey];
    if (!provider) return [];

    try {
        let data;
        if (providerKey === 'ugs') {
            data = await provider.map();
        } else {
            const response = await fetch(provider.url);
            const json = await response.json();
            data = provider.map(json);
        }
        providerGamesCache[providerKey] = data;
        providerGamesLoaded[providerKey] = true;
        return data;
    } catch (err) {
        console.error(`Failed to fetch ${providerKey}:`, err);
        providerGamesCache[providerKey] = [];
        providerGamesLoaded[providerKey] = true;
        return [];
    }
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
// ============================================================

async function getAllGames() {
    let allGames = [];
    
    const providerKeys = ['gn-math', 'truffled', 'petezah', 'ugs', 'seraph'];
    for (const key of providerKeys) {
        const games = await fetchProviderGames(key);
        allGames = [...allGames, ...games];
    }
    
    const youtubeGames = await fetchYouTubePlayables();
    allGames = [...allGames, ...youtubeGames];
    
    return allGames;
}

// Get games by category
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
    refreshAllSections();
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
                            <div class="games-search">
                                <span class="games-search-icon">
                                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                                </span>
                                <input type="text" id="gamesSearchInput" placeholder="Search...">
                            </div>

                            <div class="games-dropdown" id="gamesDropdown">
                                <button class="games-dropdown-btn" id="gamesDropdownBtn">
                                    <span id="gamesDropdownLabel">All</span>
                                    <span class="games-dropdown-count" id="gamesDropdownCount"></span>
                                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>
                                </button>
                                <div class="games-dropdown-menu" id="gamesDropdownMenu"></div>
                            </div>
                        </div>
                    </div>

                    <div class="games-section" id="gamesRecentSection">
                        <div class="games-section-title">
                            <h2>Recently Played</h2>
                            <span>Jump back in</span>
                        </div>
                        <div class="games-row-wrap">
                            <div class="games-row-arrow left" data-target="gamesRecentRow" data-dir="-1">&#8249;</div>
                            <div class="games-row" id="gamesRecentRow"></div>
                            <div class="games-row-arrow right" data-target="gamesRecentRow" data-dir="1">&#8250;</div>
                        </div>
                    </div>

                    <div class="games-section" id="gamesHotSection">
                        <div class="games-section-title">
                            <h2>Recently Added</h2>
                            <span>New games</span>
                        </div>
                        <div class="games-row-wrap">
                            <div class="games-row-arrow left" data-target="gamesHotRow" data-dir="-1">&#8249;</div>
                            <div class="games-row" id="gamesHotRow"></div>
                            <div class="games-row-arrow right" data-target="gamesHotRow" data-dir="1">&#8250;</div>
                        </div>
                    </div>

                    <div class="games-section">
                        <div class="games-section-title">
                            <h2 id="gamesGridTitle">All Games</h2>
                            <span id="gamesGridCount"></span>
                        </div>
                        <div class="games-grid" id="gamesGrid"></div>
                    </div>
                </div>

                <!-- Player View -->
                <div id="gamesPlayerView" class="games-player-view hidden">
                    <div class="games-player-topbar">
                        <div class="games-player-info">
                            <img id="gamePlayerThumb" src="" alt="" onerror="this.style.display='none'">
                            <h2 id="gamePlayerTitle"></h2>
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
    `;

    await updateCategoryCounts();
    renderGamesDropdown();
    refreshAllSections();
    bindGamesEvents();
}

function refreshAllSections() {
    renderGamesRecentRow();
    renderGamesHotRow();
    renderGamesGrid();
    renderGamesDropdown();
}

function renderGamesDropdown() {
    const menu = document.getElementById('gamesDropdownMenu');
    const label = document.getElementById('gamesDropdownLabel');
    const count = document.getElementById('gamesDropdownCount');
    const current = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];

    label.textContent = current.label;
    count.textContent = getCategoryCount(activeCategory);

    let html = '';
    let lastWasSeries = false;
    
    CATEGORIES.forEach((cat, index) => {
        const isSeries = SERIES_CATEGORIES.includes(cat.key);
        const catCount = getCategoryCount(cat.key);
        
        if (isSeries && !lastWasSeries && index > 0) {
            html += `<div class="games-dropdown-divider"></div>`;
        }
        
        html += `
            <button class="games-dropdown-item ${cat.key === activeCategory ? 'active' : ''}" data-cat="${cat.key}">
                <span class="games-dropdown-item-label">${cat.label}</span>
                <span class="games-dropdown-item-count">${catCount}</span>
            </button>
        `;
        
        lastWasSeries = isSeries;
    });

    menu.innerHTML = html;
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

async function renderGamesHotRow() {
    const hotGames = [];
    const section = document.getElementById('gamesHotSection');
    const row = document.getElementById('gamesHotRow');

    if (hotGames.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    row.innerHTML = '';
    hotGames.forEach(g => {
        row.appendChild(createGameCardElement(g));
    });
}

async function renderGamesGrid() {
    const grid = document.getElementById('gamesGrid');
    const title = document.getElementById('gamesGridTitle');
    const count = document.getElementById('gamesGridCount');

    const filtered = await getGamesByCategory(activeCategory, searchQuery);

    const catLabel = CATEGORIES.find(c => c.key === activeCategory)?.label || 'All Games';
    title.textContent = searchQuery.trim() ? `Results for "${searchQuery}"` : catLabel;
    count.textContent = `${filtered.length} game${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="games-empty">
                <strong>No games found</strong>
                <p>${activeCategory === 'favorites' ? 'Hover a game and tap the heart to save it here.' : 'Try a different search or category.'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(g => {
        grid.appendChild(createGameCardElement(g));
    });
}

function createGameCardElement(g) {
    const fav = isGameFavorite(g.id);
    const initial = g.title.charAt(0);
    const isYoutube = g.youtube === true;
    const isProvider = g.provider && !g.youtube;
    
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.id = g.id;
    
    const thumb = document.createElement('div');
    thumb.className = 'game-thumb';
    
    if (g.thumb && g.thumb.startsWith('http')) {
        const img = document.createElement('img');
        img.src = g.thumb;
        img.alt = g.title;
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
    favBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.6-4.7-10-9.6C.4 7.4 2.9 3.8 6.4 3.8c2.4 0 4.4 1.7 5.6 3.5 1.2-1.8 3.2-3.5 5.6-3.5 3.5 0 6 3.6 4.4 7.6-2.4 4.9-10 9.6-10 9.6z"/></svg>`;
    thumb.appendChild(favBtn);
    card.appendChild(thumb);
    
    const info = document.createElement('div');
    info.className = 'game-card-info';
    const strong = document.createElement('strong');
    strong.textContent = g.title;
    info.appendChild(strong);
    const span = document.createElement('span');
    span.textContent = isYoutube ? 'YouTube Playable' : (isProvider ? g.provider : g.category);
    info.appendChild(span);
    card.appendChild(info);
    
    return card;
}

// ============================================================
// EVENTS
// ============================================================

function bindGamesEvents() {
    const panel = document.querySelector('.games-panel');

    const dropdownBtn = document.getElementById('gamesDropdownBtn');
    const dropdownMenu = document.getElementById('gamesDropdownMenu');

    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('open');
        dropdownBtn.setAttribute('aria-expanded', dropdownMenu.classList.contains('open'));
    });

    document.addEventListener('click', function() {
        dropdownMenu.classList.remove('open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
    });

    dropdownMenu.addEventListener('click', function(e) {
        const item = e.target.closest('.games-dropdown-item');
        if (item) {
            activeCategory = item.dataset.cat;
            renderGamesDropdown();
            renderGamesGrid();
            dropdownMenu.classList.remove('open');
            dropdownBtn.setAttribute('aria-expanded', 'false');
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

    const searchInput = document.getElementById('gamesSearchInput');
    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        renderGamesGrid();
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
                const blobUrl = await loadGameAsBlob(game);
                if (blobUrl) {
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
            const playerView = document.getElementById('gamesPlayerView');
            if (!playerView.classList.contains('hidden')) {
                closeGame();
            }
        }
    });
}

let currentGameId = null;

async function findGameById(id) {
    const allGames = await getAllGames();
    return allGames.find(g => g.id === id) || null;
}

// ============================================================
// OPEN GAME
// ============================================================

async function openGame(id) {
    const game = await findGameById(id);
    if (!game) return;

    currentGameId = id;

    addGamesRecent(id);
    renderGamesRecentRow();

    document.getElementById('gamesBrowseView').classList.add('hidden');
    document.getElementById('gamesPlayerView').classList.remove('hidden');

    document.getElementById('gamePlayerTitle').textContent = game.title;
    document.getElementById('gamePlayerThumb').src = game.thumb || '';
    
    // For provider games - use blob loading like Dominum
    if (game.provider && game.provider !== 'youtube') {
        const blobUrl = await loadGameAsBlob(game);
        if (blobUrl) {
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
        if (game.provider && game.provider !== 'youtube') {
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
    if (window._youtubeBlobUrls) {
        window._youtubeBlobUrls.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) {}
        });
        window._youtubeBlobUrls = [];
    }
    
    document.getElementById('gamesPlayerView').classList.add('hidden');
    document.getElementById('gamesBrowseView').classList.remove('hidden');
    document.getElementById('gamePlayerFrame').src = '';
    currentGameId = null;
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