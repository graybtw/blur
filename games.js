/* ============================================================
   GAMES CONFIG
   ------------------------------------------------------------
   To add a new game, just push another object onto GAMES.
============================================================ */

const CATEGORIES = [
    { key:'all',       label:'All' },
    { key:'favorites', label:'♥ Favorites' },
    { key:'action',    label:'Action' },
    { key:'arcade',    label:'Arcade' },
    { key:'puzzle',    label:'Puzzle' },
    { key:'sports',    label:'Sports' },
    { key:'strategy',  label:'Strategy' },
    { key:'other',     label:'Other' },
];

const GAMES = [
    {id:'10bullets', title:'10 Bullets', category:'action', src:'assets/games/10bullets.html', thumb:'assets/games/thumbnails/10bullets.jpg'},
    {id:'1v1lol', title:'1v1.LOL', category:'action', src:'assets/games/1v1lol.html', thumb:'assets/games/thumbnails/1v1lol.jpg'},
    {id:'2048', title:'2048', category:'puzzle', src:'assets/games/2048.html', thumb:'assets/games/thumbnails/2048.jpg'},
    {id:'2048cupcakes', title:'2048 Cupcakes', category:'puzzle', src:'assets/games/2048-cupcakes.html', thumb:'assets/games/thumbnails/2048cupcakes.jpg'},
    {id:'adifficultclimbinggame', title:'A Difficult Climbing Game', category:'action', src:'assets/games/adifficultclimbinggame.html', thumb:'assets/games/thumbnails/adifficultclimbinggame.jpg'},
    {id:'agesofconflict', title:'Ages of Conflict', category:'strategy', src:'assets/games/ages-of-conflict.html', thumb:'assets/games/thumbnails/agesofconflict.jpg'},
    {id:'badparenting', title:'Bad Parenting', category:'other', src:'assets/games/Bad Parenting 1.html', thumb:'assets/games/thumbnails/badparenting.jpg', hot:true},
    {id:'bartbash', title:'Bart Bash', category:'action', src:'assets/games/bartbash.html', thumb:'assets/games/thumbnails/bartbash.jpg'},
    {id:'cheeserolling', title:'Cheese Rolling', category:'arcade', src:'assets/games/cheese-rolling.html', thumb:'assets/games/thumbnails/cheeserolling.jpg'},
    {id:'cookieclicker', title:'Cookie Clicker', category:'other', src:'assets/games/cookieclicker.html', thumb:'assets/games/thumbnails/cookieclicker.jpg'},
    {id:'cuphead', title:'Cuphead', category:'action', src:'assets/games/cuphead.html', thumb:'assets/games/thumbnails/cuphead.jpg', hot:true},
    {id:'drivemad', title:'Drive Mad', category:'action', src:'assets/games/drivemad.html', thumb:'assets/games/thumbnails/drivemad.jpg'},
    {id:'ducklife', title:'Duck Life', category:'sports', src:'assets/games/ducklife.html', thumb:'assets/games/thumbnails/ducklife.jpg'},
    {id:'dunkshot', title:'Dunk Shot', category:'sports', src:'assets/games/dunkshot.html', thumb:'assets/games/thumbnails/dunkshot.jpg'},
    {id:'fnab', title:'FNAB', category:'other', src:'assets/games/fnab.html', thumb:'assets/games/thumbnails/fnab.jpg'},
    {id:'fnae', title:'FNAE', category:'other', src:'assets/games/fnae.html', thumb:'assets/games/thumbnails/fnae.jpg', hot:true},
    {id:'fnaf', title:'FNAF', category:'other', src:'assets/games/fnaf.html', thumb:'assets/games/thumbnails/fnaf.jpg'},
    {id:'fnash', title:'FNASH', category:'other', src:'assets/games/fnash.html', thumb:'assets/games/thumbnails/fnash.jpg'},
    {id:'fnf', title:'Friday Night Funkin', category:'action', src:'assets/games/fnf.html', thumb:'assets/games/thumbnails/fnf.jpg'},
    {id:'geodash', title:'Geometry Dash', category:'arcade', src:'assets/games/geometry-dash.html', thumb:'assets/games/thumbnails/geodash.jpg', hot:true},
    {id:'halflife', title:'Half Life', category:'action', src:'assets/games/halflife.html', thumb:'assets/games/thumbnails/halflife.jpg'},
    {id:'impossiblequiz', title:'Impossible Quiz', category:'puzzle', src:'assets/games/impossible-quiz.html', thumb:'assets/games/thumbnails/impossiblequiz.jpg'},
    {id:'infinitecraft', title:'Infinite Craft', category:'puzzle', src:'assets/games/infinite-craft.html', thumb:'assets/games/thumbnails/infinitecraft.jpg'},
    {id:'ironlung', title:'Iron Lung', category:'other', src:'assets/games/ironlung.html', thumb:'assets/games/thumbnails/ironlung.jpg'},
    {id:'jetpackjoyride', title:'Jetpack Joyride', category:'arcade', src:'assets/games/jetpack-joyride.html', thumb:'assets/games/thumbnails/jetpackjoyride.jpg'},
    {id:'motox3m', title:'Moto X3M', category:'racing', src:'assets/games/motoxm-3.html', thumb:'assets/games/thumbnails/motox3m.jpg'},
    {id:'ovo', title:'OvO', category:'action', src:'assets/games/ovo.html', thumb:'assets/games/thumbnails/ovo.jpg'},
    {id:'ovo2', title:'OvO 2', category:'action', src:'assets/games/ovo2.html', thumb:'assets/games/thumbnails/ovo2.jpg'},
    {id:'ovodimensions', title:'OvO Dimensions', category:'action', src:'assets/games/ovo-dimensions.html', thumb:'assets/games/thumbnails/ovodimensions.jpg'},
    {id:'paperiomania', title:'Paper.io Mania', category:'arcade', src:'assets/games/paper-io-mania.html', thumb:'assets/games/thumbnails/paperiomania.jpg'},
    {id:'peopleplayground', title:'People Playground', category:'other', src:'assets/games/peopleplayground.html', thumb:'assets/games/thumbnails/peopleplayground.jpg'},
    {id:'pixelbattlegrounds', title:'Pixel Battlegrounds', category:'action', src:'assets/games/pixel-battlegrounds.html', thumb:'assets/games/thumbnails/pixelbattlegrounds.jpg'},
    {id:'pvz', title:'Plants vs Zombies', category:'strategy', src:'assets/games/pvz.html', thumb:'assets/games/thumbnails/pvz.jpg'},
    {id:'ragdollarchers', title:'Ragdoll Archers', category:'action', src:'assets/games/ragdoll-archers.html', thumb:'assets/games/thumbnails/ragdollarchers.jpg'},
    {id:'slope', title:'Slope', category:'arcade', src:'assets/games/slope.html', thumb:'assets/games/thumbnails/slope.jpg'},
    {id:'soccerrandom', title:'Soccer Random', category:'sports', src:'assets/games/soccer-random.html', thumb:'assets/games/thumbnails/soccerrandom.jpg'},
    {id:'terraria', title:'Terraria', category:'other', src:'assets/games/terraria.html', thumb:'assets/games/thumbnails/terraria.jpg'},
    {id:'tinyfishing', title:'Tiny Fishing', category:'arcade', src:'assets/games/tiny-fishing.html', thumb:'assets/games/thumbnails/tinyfishing.jpg'},
    {id:'tubejumpers', title:'Tube Jumpers', category:'sports', src:'assets/games/tube-jumpers.html', thumb:'assets/games/thumbnails/tubejumpers.jpg'},
    {id:'turbostars', title:'Turbo Stars', category:'racing', src:'assets/games/turbo-stars.html', thumb:''},
    {id:'untitledgoosegame', title:'Untitled Goose Game', category:'other', src:'assets/games/untitlegoosegame.html', thumb:'assets/games/thumbnails/untitledgoosegame.jpg'},
    {id:'vex8', title:'Vex 8', category:'action', src:'assets/games/vex8.html', thumb:'assets/games/thumbnails/vex8.jpg'},
    {id:'volleyrandom', title:'Volley Random', category:'sports', src:'assets/games/volley-random.html', thumb:'assets/games/thumbnails/volleyrandom.jpg'},
    {id:'wordle', title:'Wordle', category:'puzzle', src:'assets/games/wordle.html', thumb:'assets/games/thumbnails/wordle.jpg'},
    {id:'worldshardestgame', title:"World's Hardest Game", category:'puzzle', src:'assets/games/whg.html', thumb:'assets/games/thumbnails/worldshardestgame.jpg'},

    // Lite Games
    {id:'lite2048', title:'Lite 2048', category:'puzzle', src:'assets/games/lite/2048/index.html', thumb:''},
    {id:'litesnake', title:'Lite Snake', category:'arcade', src:'assets/games/lite/snake/index.html', thumb:''}
];

const RECENT_LIMIT = 10;
const FAVORITES_KEY = 'blur_favorite_games';
const RECENT_KEY = 'blur_recent_games';


/* ============================================================
   STATE + PERSISTENCE
============================================================ */

let activeCategory = 'all';
let searchQuery = '';

function loadIds(key){
    try{
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    }catch(e){
        return [];
    }
}

function saveIds(key, ids){
    try{
        localStorage.setItem(key, JSON.stringify(ids));
    }catch(e){
        /* storage unavailable, fail silently */
    }
}

function getFavorites(){
    return loadIds(FAVORITES_KEY);
}

function isFavorite(id){
    return getFavorites().includes(id);
}

function toggleFavorite(id){
    let favs = getFavorites();
    if(favs.includes(id)){
        favs = favs.filter(f => f !== id);
    }else{
        favs.unshift(id);
    }
    saveIds(FAVORITES_KEY, favs);
    refreshAllSections();
}

function getRecent(){
    return loadIds(RECENT_KEY);
}

function addRecent(id){
    let recent = getRecent().filter(r => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, RECENT_LIMIT);
    saveIds(RECENT_KEY, recent);
}


/* ============================================================
   RENDER
============================================================ */

function initGames(){
    const panel = document.querySelector('.games-panel');
    if(!panel || panel.dataset.built) return;
    panel.dataset.built = 'true';

    panel.innerHTML = `
        <div class="games-app">

            <div class="games-toolbar">
                <div class="games-search">
                    <span class="games-search-icon">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                    </span>
                    <input type="text" id="gamesSearchInput" placeholder="Search games...">
                </div>

                <div class="games-categories" id="gamesCategories"></div>
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

            <div class="games-section" id="gamesFavSection">
                <div class="games-section-title">
                    <h2>Your Favorites</h2>
                    <span>Saved</span>
                </div>
                <div class="games-row-wrap">
                    <div class="games-row-arrow left" data-target="gamesFavRow" data-dir="-1">&#8249;</div>
                    <div class="games-row" id="gamesFavRow"></div>
                    <div class="games-row-arrow right" data-target="gamesFavRow" data-dir="1">&#8250;</div>
                </div>
            </div>

            <div class="games-section" id="gamesHotSection">
                <div class="games-section-title">
                    <h2>Hot This Week</h2>
                    <span>Trending</span>
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

        <div class="game-modal hidden" id="gameModal">
            <div class="game-box">
                <div class="game-header">
                    <img id="gameModalThumb" src="" alt="" onerror="this.style.display='none'">
                    <h2 id="gameModalTitle"></h2>
                </div>
                <button class="game-fullscreen" id="gameFullscreen" title="Fullscreen">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
                    </svg>
                </button>
                <button class="game-close" id="gameClose" title="Close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M6 6l12 12M18 6L6 18"/>
                    </svg>
                </button>
                <div class="game-frame">
                    <iframe id="gameFrame" src="" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>
                </div>
            </div>
        </div>
    `;

    renderCategories();
    refreshAllSections();
    bindGamesEvents();
}

/* re-renders every section that can contain a heart icon or
   depends on favorites/recent state */
function refreshAllSections(){
    renderRecentRow();
    renderFavRow();
    renderHotRow();
    renderGrid();
}

function renderCategories(){
    const wrap = document.getElementById('gamesCategories');
    wrap.innerHTML = CATEGORIES.map(cat => `
        <button class="games-cat ${cat.key === activeCategory ? 'active' : ''}" data-cat="${cat.key}">
            ${cat.label}
        </button>
    `).join('');
}

function renderRecentRow(){
    const section = document.getElementById('gamesRecentSection');
    const row = document.getElementById('gamesRecentRow');
    const ids = getRecent();
    const games = ids.map(id => GAMES.find(g => g.id === id)).filter(Boolean);

    if(games.length === 0){
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    row.innerHTML = games.map(g => gameCardHTML(g)).join('');
}

function renderFavRow(){
    const section = document.getElementById('gamesFavSection');
    const row = document.getElementById('gamesFavRow');
    const ids = getFavorites();
    const games = ids.map(id => GAMES.find(g => g.id === id)).filter(Boolean);

    if(games.length === 0){
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    row.innerHTML = games.map(g => gameCardHTML(g)).join('');
}

function renderHotRow(){
    const hotGames = GAMES.filter(g => g.hot);
    const section = document.getElementById('gamesHotSection');
    const row = document.getElementById('gamesHotRow');

    if(hotGames.length === 0){
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    row.innerHTML = hotGames.map(g => gameCardHTML(g)).join('');
}

function renderGrid(){
    const grid = document.getElementById('gamesGrid');
    const title = document.getElementById('gamesGridTitle');
    const count = document.getElementById('gamesGridCount');

    const q = searchQuery.trim().toLowerCase();

    const filtered = GAMES.filter(g => {
        const matchesSearch = !q || g.title.toLowerCase().includes(q);
        if(activeCategory === 'favorites'){
            return isFavorite(g.id) && matchesSearch;
        }
        const matchesCategory = activeCategory === 'all' || g.category === activeCategory;
        return matchesCategory && matchesSearch;
    });

    title.textContent = q
        ? `Results for "${searchQuery}"`
        : (CATEGORIES.find(c => c.key === activeCategory)?.label.replace('♥ ', '') || 'All Games');
    count.textContent = `${filtered.length} game${filtered.length === 1 ? '' : 's'}`;

    if(filtered.length === 0){
        grid.innerHTML = `
            <div class="games-empty">
                <strong>No games found</strong>
                <p>${activeCategory === 'favorites' ? 'Hover a game and tap the heart to save it here.' : 'Try a different search or category.'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(g => gameCardHTML(g)).join('');
}

function gameCardHTML(g){
    const fav = isFavorite(g.id);
    return `
        <div class="game-card" data-id="${g.id}">
            <div class="game-thumb">
                ${g.thumb
                    ? `<img src="${g.thumb}" alt="${g.title}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'game-thumb-fallback',textContent:'${g.title.charAt(0)}'}))">`
                    : `<div class="game-thumb-fallback">${g.title.charAt(0)}</div>`
                }
                ${g.hot ? `<span class="game-badge">Hot</span>` : ''}
                <button class="game-fav-btn ${fav ? 'active' : ''}" data-fav-id="${g.id}" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">
                    <svg viewBox="0 0 24 24"><path d="M12 21s-7.6-4.7-10-9.6C.4 7.4 2.9 3.8 6.4 3.8c2.4 0 4.4 1.7 5.6 3.5 1.2-1.8 3.2-3.5 5.6-3.5 3.5 0 6 3.6 4.4 7.6-2.4 4.9-10 9.6-10 9.6z"/></svg>
                </button>
            </div>
            <div class="game-card-info">
                <strong>${g.title}</strong>
                <span>${g.category}</span>
            </div>
        </div>
    `;
}


/* ============================================================
   EVENTS
============================================================ */

function bindGamesEvents(){
    const panel = document.querySelector('.games-panel');

    panel.addEventListener('click', (e) => {
        const favBtn = e.target.closest('.game-fav-btn');
        if(favBtn){
            e.stopPropagation();
            toggleFavorite(favBtn.dataset.favId);
            return;
        }

        const catBtn = e.target.closest('.games-cat');
        if(catBtn){
            activeCategory = catBtn.dataset.cat;
            renderCategories();
            renderGrid();
            return;
        }

        const arrow = e.target.closest('.games-row-arrow');
        if(arrow){
            const target = document.getElementById(arrow.dataset.target);
            if(target) target.scrollBy({ left: 320 * parseInt(arrow.dataset.dir, 10), behavior:'smooth' });
            return;
        }

        const card = e.target.closest('.game-card');
        if(card){
            openGame(card.dataset.id);
            return;
        }
    });

    const searchInput = document.getElementById('gamesSearchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderGrid();
    });

    document.getElementById('gameClose').addEventListener('click', closeGame);

    document.getElementById('gameFullscreen').addEventListener('click', () => {
        const frame = document.getElementById('gameFrame');
        if(frame.requestFullscreen) frame.requestFullscreen();
    });

    document.getElementById('gameModal').addEventListener('click', (e) => {
        if(e.target.id === 'gameModal') closeGame();
    });

    document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') closeGame();
    });
}

function openGame(id){
    const game = GAMES.find(g => g.id === id);
    if(!game) return;

    addRecent(id);
    renderRecentRow();

    document.getElementById('gameModalTitle').textContent = game.title;
    document.getElementById('gameModalThumb').src = game.thumb || '';
    document.getElementById('gameFrame').src = game.src;
    document.getElementById('gameModal').classList.remove('hidden');
}

function closeGame(){
    document.getElementById('gameModal').classList.add('hidden');
    document.getElementById('gameFrame').src = '';
}


/* ============================================================
   INIT
   builds the panel the first time the Games tab is opened,
   and also immediately in case it's already the active tab
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const gamesNav = document.querySelector('[data-tab="games"]');
    if(gamesNav){
        gamesNav.addEventListener('click', initGames);
    }
    if(document.querySelector('.games-panel.active')){
        initGames();
    }
});