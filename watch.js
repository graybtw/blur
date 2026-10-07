/* ==========================================================================
   BLUR WATCH — CLEAN EDITION
   Movies + TV Streaming Tab — No popups, no banners
   ========================================================================== */

const Watch = {

    /* =========================
       STATE
    ========================= */
    state: {
        view: "browse",
        tab: "home",
        heroItems: [],
        currentHero: 0,
        rows: [],
        searchQuery: "",
        selectedMovie: null,
        selectedSeason: 1,
        selectedEpisode: 1,
        browseScroll: 0,
        currentProviderId: null,
        playerRetryCount: 0,
        adDetectionCount: 0,
    },

    elements: {},

    /* =========================
       CONFIG
    ========================= */
    config: {
        apiKey: "adb28b9c41cf9c0eb6b04b92659b0fe8",
        base: "https://api.themoviedb.org/3",
        images: "https://image.tmdb.org/t/p/"
    },

    /* =========================
       PROVIDERS — ALL WORKING
    ========================= */
    providers: [
        {
            id: "framextv",
            name: "FrameXtv [likely has ads, untested]",
            movie: id => `https://framextv.tech/watch/${id}`,
            tv: (id, s, e) => `https://framextv.tech/watch/${id}/${s}/${e}`
        }
    ],

    /* =========================
       START
    ========================= */
    init() {
        this.createInterface();
        this.cacheElements();
        this.setupEvents();
        this.setupSearch();
        this.setupDetails();
        this.setupPlayer();
        this.setupAdBlocker();
        this.initHero();
        this.initRows();
    },

    /* =========================
       CREATE UI — CLEAN PLAYER
    ========================= */
    createInterface() {
        const panel = document.querySelector(".watch-panel");
        if (!panel) return;

        panel.innerHTML = `
        <div class="watch-app">
            <div id="watchBrowseView" class="watch-browse-view">
                <div class="watch-top">
                    <div class="watch-search ui-field">
                        <span class="search-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <circle cx="11" cy="11" r="7"></circle>
                                <path d="M21 21l-4.3-4.3"></path>
                            </svg>
                        </span>
                        <input id="watchSearch" type="search" placeholder="Search..." autocomplete="off" aria-label="Search movies and TV shows" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="watchSearchSuggestions">
                        <div id="watchSearchSuggestions" class="watch-search-suggestions" role="listbox" aria-label="Search suggestions" hidden></div>
                    </div>
                    <div class="watch-tabs">
                        <button type="button" class="watch-tab active" data-watch-tab="home" aria-pressed="true">Home</button>
                        <button type="button" class="watch-tab" data-watch-tab="movies" aria-pressed="false">Movies</button>
                        <button type="button" class="watch-tab" data-watch-tab="tv" aria-pressed="false">TV Shows</button>
                        <button type="button" class="watch-tab" data-watch-tab="anime" aria-pressed="false">Anime</button>
                    </div>
                </div>

                <section class="watch-hero watch-hero-feature" aria-label="Featured movie or show">
                    <div class="hero-background">
                        <img id="watchHeroImage" alt="" aria-hidden="true">
                        <img id="watchHeroImageNext" class="hero-image-next" alt="" aria-hidden="true">
                        <div class="hero-overlay"></div>
                    </div>
                    <div class="hero-content">
                        <h1 id="watchHeroTitle">Loading...</h1>
                        <p id="watchHeroDescription">Loading movies...</p>
                        <div id="watchHeroMeta"></div>
                        <div class="hero-actions">
                            <button type="button" class="hero-watch-button ui-button ui-button--primary">▶ Watch</button>
                            <button type="button" class="hero-info-button ui-button ui-button--secondary">More Info</button>
                        </div>
                    </div>
                    <div class="hero-dots" id="heroDots"></div>
                </section>

                <section id="watchRows" class="watch-rows"></section>
            </div>

            <div id="watchDetailsView" class="watch-details-view hidden">
                <button type="button" id="detailsBackBtn" class="details-back-btn" aria-label="Back to browsing">
                    <span class="details-back-arrow">←</span>
                    <span>Back</span>
                </button>

                <div class="details-hero">
                    <div class="details-hero-bg">
                        <img id="detailsImage" alt="" aria-hidden="true">
                        <div class="details-hero-overlay"></div>
                    </div>
                    <div class="details-hero-content">
                        <img id="detailsPoster" class="details-poster" alt="">
                        <div class="details-info">
                            <div class="details-title-row">
                                <h1 id="detailsTitle"></h1>
                            </div>
                            <div id="detailsMeta"></div>
                            <p id="detailsDescription"></p>
                            <div id="detailsGenres" class="details-genres"></div>
                            <div class="provider-actions">
                                <button type="button" class="details-watch">▶ Watch Now</button>
                                <div class="provider-selector">
                                    <button type="button" id="providerCurrent" class="provider-current" aria-controls="providerDropdown" aria-expanded="false">
                                        <span id="providerCurrentName">Select Provider</span>
                                        <span class="provider-arrow">▼</span>
                                    </button>
                                    <div id="providerDropdown" class="provider-dropdown ui-menu"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="details-body">
                    <div id="episodePicker" class="episode-picker hidden">
                        <div class="episode-picker-top">
                            <h2 class="details-section-title">Episodes</h2>
                            <div class="season-selector">
                                <button type="button" id="seasonCurrent" class="provider-current" aria-controls="seasonDropdown" aria-expanded="false">
                                    <span id="seasonCurrentName">Season 1</span>
                                    <span class="provider-arrow">▼</span>
                                </button>
                                <div id="seasonDropdown" class="provider-dropdown ui-menu"></div>
                            </div>
                        </div>
                        <div id="episodeList" class="episode-list"></div>
                    </div>

                    <div id="castSection" class="cast-section hidden">
                        <h2 id="castTitle" class="details-section-title">Cast</h2>
                        <div id="castCarousel" class="details-carousel">
                            <button type="button" class="row-arrow left details-scroll-arrow" data-scroll-step="-1" aria-label="Scroll cast left">‹</button>
                            <div id="castRow" class="cast-row details-horizontal-scroll"></div>
                            <button type="button" class="row-arrow right details-scroll-arrow" data-scroll-step="1" aria-label="Scroll cast right">›</button>
                        </div>
                        <div id="crewSection" class="crew-section hidden">
                            <h2 class="details-section-title">Production Crew</h2>
                            <div class="details-carousel">
                                <button type="button" class="row-arrow left details-scroll-arrow" data-scroll-step="-1" aria-label="Scroll key crew left">‹</button>
                                <div id="crewRow" class="crew-row details-horizontal-scroll" role="list"></div>
                                <button type="button" class="row-arrow right details-scroll-arrow" data-scroll-step="1" aria-label="Scroll key crew right">›</button>
                            </div>
                        </div>
                    </div>

                    <div id="relatedSection" class="related-section hidden">
                        <h2 class="details-section-title">More Like This</h2>
                        <div class="details-carousel">
                            <button type="button" class="row-arrow left details-scroll-arrow" data-scroll-step="-1" aria-label="Scroll related titles left">‹</button>
                            <div id="relatedRow" class="row-scroll details-horizontal-scroll"></div>
                            <button type="button" class="row-arrow right details-scroll-arrow" data-scroll-step="1" aria-label="Scroll related titles right">›</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CLEAN PLAYER — No banners, no popups -->
            <div id="watchPlayerModal" class="player-modal hidden">
                <div class="player-topbar">
                    <div class="player-info">
                        <img id="playerPoster" class="player-poster" src="" alt="" onerror="this.style.display='none'">
                        <h2 id="playerTitle"></h2>
                    </div>
                    <div class="player-controls">
                        <button type="button" id="playerReload" class="player-btn" title="Reload Player" aria-label="Reload player">
                            <svg viewBox="0 0 24 24">
                                <path d="M23 4v6h-6"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                        </button>
                        <button type="button" id="playerPopout" class="player-btn" title="Open in new tab" aria-label="Open player in new tab">
                            <svg viewBox="0 0 24 24">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                        </button>
                        <button type="button" id="playerFullscreen" class="player-btn" title="Fullscreen" aria-label="Toggle fullscreen">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
                            </svg>
                        </button>
                        <button type="button" id="playerClose" class="player-btn" title="Close" aria-label="Close player">
                            <svg viewBox="0 0 24 24">
                                <path d="M6 6l12 12M18 6L6 18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="player-frame-wrap">
                    <iframe id="watchPlayer" allow="fullscreen; autoplay; encrypted-media" allowfullscreen></iframe>
                </div>
            </div>
        </div>
        `;
    },

    /* =========================
       CACHE ELEMENTS
    ========================= */
    cacheElements() {
        this.elements = {
            panel: document.querySelector(".watch-panel"),
            app: document.querySelector(".watch-app"),
            browseView: document.querySelector("#watchBrowseView"),
            detailsView: document.querySelector("#watchDetailsView"),
            backBtn: document.querySelector("#detailsBackBtn"),
            search: document.querySelector("#watchSearch"),
            heroImage: document.querySelector("#watchHeroImage"),
            heroImageNext: document.querySelector("#watchHeroImageNext"),
            heroTitle: document.querySelector("#watchHeroTitle"),
            heroDescription: document.querySelector("#watchHeroDescription"),
            heroMeta: document.querySelector("#watchHeroMeta"),
            rows: document.querySelector("#watchRows"),
            dots: document.querySelector("#heroDots"),
            playerModal: document.querySelector("#watchPlayerModal"),
            playerFrame: document.querySelector("#watchPlayer"),
            playerTitle: document.querySelector("#playerTitle"),
            playerPoster: document.querySelector("#playerPoster"),
            playerClose: document.querySelector("#playerClose"),
            playerReload: document.querySelector("#playerReload"),
            playerPopout: document.querySelector("#playerPopout"),
            playerFullscreen: document.querySelector("#playerFullscreen"),
            watchButton: document.querySelector(".details-watch"),
            detailsImage: document.querySelector("#detailsImage"),
            detailsPoster: document.querySelector("#detailsPoster"),
            detailsTitle: document.querySelector("#detailsTitle"),
            detailsMeta: document.querySelector("#detailsMeta"),
            detailsDescription: document.querySelector("#detailsDescription"),
            detailsGenres: document.querySelector("#detailsGenres"),
            episodePicker: document.querySelector("#episodePicker"),
            episodeList: document.querySelector("#episodeList"),
            seasonCurrent: document.querySelector("#seasonCurrent"),
            seasonCurrentName: document.querySelector("#seasonCurrentName"),
            seasonDropdown: document.querySelector("#seasonDropdown"),
            providerCurrent: document.querySelector("#providerCurrent"),
            providerCurrentName: document.querySelector("#providerCurrentName"),
            providerDropdown: document.querySelector("#providerDropdown"),
            castSection: document.querySelector("#castSection"),
            castTitle: document.querySelector("#castTitle"),
            castCarousel: document.querySelector("#castCarousel"),
            castRow: document.querySelector("#castRow"),
            crewSection: document.querySelector("#crewSection"),
            crewRow: document.querySelector("#crewRow"),
            relatedSection: document.querySelector("#relatedSection"),
            relatedRow: document.querySelector("#relatedRow")
        };
    },

    /* =========================
       EVENTS
    ========================= */
    setupEvents() {
        document.querySelectorAll("[data-watch-tab]").forEach(button => {
            button.onclick = () => {
                document.querySelectorAll("[data-watch-tab]").forEach(t => t.classList.remove("active"));
                button.classList.add("active");
                document.querySelectorAll("[data-watch-tab]").forEach(t => t.setAttribute("aria-pressed", String(t === button)));
                this.state.tab = button.dataset.watchTab;
                this.state.searchQuery = "";
                this._suggestionQuery = "";
                this._searchRequestId = (this._searchRequestId || 0) + 1;
                if (this.elements.search) this.elements.search.value = "";
                this.updateSearchContext();
                this.closeSearchSuggestions();
                this.loadRows();
                this.loadHero();
            };
        });

        this.elements.backBtn.onclick = () => this.closeDetails();
    },

    /* =========================
       API
    ========================= */
    api: async function(endpoint) {
        try {
            const response = await fetch(
                `${this.config.base}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${this.config.apiKey}`
            );
            if (!response.ok) throw new Error("TMDB failed");
            return await response.json();
        } catch (error) {
            console.error("TMDB Error:", error);
            return null;
        }
    },

    image(path, size = "original") {
        if (!path) return "";
        return this.config.images + size + path;
    },

    formatMedia(item) {
        if (!item) return null;
        const type = item.media_type || (item.title ? "movie" : "tv");
        return {
            id: item.id,
            type: type,
            title: item.title || item.name || "Unknown",
            description: item.overview || "No description.",
            poster: this.image(item.poster_path, "w500"),
            backdrop: this.image(item.backdrop_path, "original"),
            rating: item.vote_average ? item.vote_average.toFixed(1) : "N/A",
            year: (item.release_date || item.first_air_date || "").slice(0, 4),
            genres: item.genre_ids || [],
            runtime: item.runtime || null
        };
    },

    genres: {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
        80: "Crime", 99: "Documentary", 18: "Drama", 14: "Fantasy",
        27: "Horror", 878: "Sci-Fi", 53: "Thriller", 10749: "Romance",
        10751: "Family", 10759: "Action & Adventure", 10765: "Sci-Fi & Fantasy",
        10768: "War & Politics"
    },

    getGenres(ids) {
        return ids.map(id => this.genres[id]).filter(Boolean).slice(0, 3);
    },

    // Keep the Anime shelf suitable for a general-audience community. TMDB's
    // `adult` flag catches titles explicitly marked as adult, while the title
    // and synopsis check catches common adult-only labels that are sometimes
    // missing that flag. This is intentionally scoped to Anime so ordinary
    // movie/TV browsing keeps its existing catalog behavior.
    animeContentFilter: {
        blockedPattern: /(?:\bhentai\b|\becchi\b|\bporn(?:ography)?\b|\bxxx\b|\bnsfw\b|\br[-\s]?18\b|\b18\s*\+\b|\berotic\b|\bsex(?:ual|ually)?\b|\bnud(?:e|ity)\b|\blewd\b|\bexplicit\b|\buncensored\b|\buncut\b|\badult\b)/i,
        blockedTitlePattern: /(?:\boverflow\b|\bharem\s+camp\b|\badam['’]s\s+sweet\s+agony\b|\bjimihen\b|\binterspecies\s+reviewers\b|\byosuga\s+no\s+sora\b|\bseikon\s+no\s+qwaser\b|\bcaressing\s+my\s+hibernating\s+bear\b|\bcrazy\s+over\s+his\s+fingers\b|\bafter\s+closing\b)/i,
        allows(item) {
            if (!item || item.adult === true) return false;
            const text = [item.title, item.name, item.overview, item.original_title, item.original_name]
                .filter(Boolean)
                .join(" ");
            return !this.blockedPattern.test(text) && !this.blockedTitlePattern.test(String(item.title || item.name || ""));
        }
    },

    filterAnimeItems(items) {
        if (!Array.isArray(items)) return [];
        return items.filter(item => this.animeContentFilter.allows(item));
    },

    /* =========================
       HERO
    ========================= */
    heroConfig: {
        home: "/trending/all/week",
        movies: "/movie/popular",
        tv: "/tv/popular",
        anime: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc"
    },

    loadHero: async function() {
        const requestId = this._heroLoadRequestId = (this._heroLoadRequestId || 0) + 1;
        const endpoint = this.heroConfig[this.state.tab] || this.heroConfig.home;
        const data = await this.api(endpoint);
        if (requestId !== this._heroLoadRequestId || !data || !data.results) return;
        const heroResults = this.state.tab === "anime"
            ? this.filterAnimeItems(data.results)
            : data.results;
        this.state.heroItems = heroResults
            .map(item => this.formatMedia(item))
            .filter(item => item.backdrop && item.title)
            .slice(0, 8);
        this.state.currentHero = 0;
        this.renderHero();
    },

    renderHero: function() {
        const movie = this.state.heroItems[this.state.currentHero];
        if (!movie) {
            this.elements.heroTitle.textContent = "Nothing to show";
            this.elements.heroDescription.textContent = "No results.";
            this.elements.heroMeta.innerHTML = "";
            this.renderHeroDots();
            return;
        }

        this.renderHeroDots();

        // A repeated render of the currently requested item should only refresh
        // the dots. Re-loading its image would create an unnecessary flash.
        if (this._heroRequestedMovieId === movie.id) return;
        this._heroRequestedMovieId = movie.id;

        const imageRequestId = this._heroImageRequestId = (this._heroImageRequestId || 0) + 1;
        clearTimeout(this._heroContentTimer);
        const activeImage = this._heroActiveImage || this.elements.heroImage;
        const incomingImage = activeImage === this.elements.heroImage
            ? this.elements.heroImageNext
            : this.elements.heroImage;
        const content = this.elements.heroTitle.closest(".hero-content");
        const hasPreviousCopy = this._heroDisplayedMovieId != null;
        const isChangingMovie = hasPreviousCopy && this._heroDisplayedMovieId !== movie.id;

        const updateCopy = () => {
            this.elements.heroTitle.textContent = movie.title;
            this.elements.heroDescription.textContent = movie.description;
            this.elements.heroMeta.innerHTML = `
                <span>⭐ ${movie.rating}</span>
                <span>${movie.year}</span>
                <span>${movie.type === "tv" ? "TV Show" : "Movie"}</span>
            `;
            this._heroDisplayedMovieId = movie.id;
        };

        const commitCopy = () => {
            if (imageRequestId !== this._heroImageRequestId) return;
            if (!isChangingMovie || !content) {
                updateCopy();
                content?.classList.remove("is-changing");
                return;
            }

            content.classList.add("is-changing");
            this._heroContentTimer = setTimeout(() => {
                if (imageRequestId !== this._heroImageRequestId) return;
                updateCopy();
                requestAnimationFrame(() => {
                    if (imageRequestId === this._heroImageRequestId) content.classList.remove("is-changing");
                });
            }, 140);
        };

        if (!incomingImage || !movie.backdrop) {
            commitCopy();
            return;
        }

        incomingImage.classList.remove("is-visible");
        incomingImage.onload = () => {
            if (imageRequestId !== this._heroImageRequestId) return;
            incomingImage.classList.add("is-visible");
            activeImage.classList.remove("is-visible");
            this._heroActiveImage = incomingImage;
            commitCopy();
        };
        incomingImage.onerror = () => {
            if (imageRequestId === this._heroImageRequestId) commitCopy();
        };
        incomingImage.src = movie.backdrop;
    },

    renderHeroDots: function() {
        const container = this.elements.dots;
        if (!container) return;

        if (container.children.length !== this.state.heroItems.length) {
            container.replaceChildren(...this.state.heroItems.map(() => {
                const dot = document.createElement("button");
                dot.type = "button";
                dot.className = "hero-dot";
                return dot;
            }));
        }

        this.state.heroItems.forEach((movie, index) => {
            const dot = container.children[index];
            dot.setAttribute("aria-label", `Show ${movie.title}`);
            dot.setAttribute("aria-pressed", String(index === this.state.currentHero));
            dot.title = movie.title;
            dot.classList.toggle("active", index === this.state.currentHero);
            dot.onclick = () => {
                this.state.currentHero = index;
                this.renderHero();
            };
        });
    },

    startHeroRotation: function() {
        setInterval(() => {
            // Performance Mode: keep the featured item still instead of rotating.
            if (document.documentElement.classList.contains("performance-mode")) return;
            if (!this.state.heroItems.length || this.state.view === "details") return;
            this.state.currentHero = (this.state.currentHero + 1) % this.state.heroItems.length;
            this.renderHero();
        }, 8000);
    },

    setupHeroButtons: function() {
        document.querySelector(".hero-watch-button").onclick = async () => {
            const movie = this.state.heroItems[this.state.currentHero];
            if (!movie) return;
            this.openDetails(await this.getDetails(movie));
        };
        document.querySelector(".hero-info-button").onclick = async () => {
            const movie = this.state.heroItems[this.state.currentHero];
            if (!movie) return;
            this.openDetails(await this.getDetails(movie));
        };
    },

    initHero: async function() {
        await this.loadHero();
        this.startHeroRotation();
        this.setupHeroButtons();
    },

    /* =========================
       ROWS
    ========================= */
    rowConfig: {
        home: [
            { title: "Trending Now", endpoint: "/trending/all/week" },
            { title: "Popular Movies", endpoint: "/movie/popular" },
            { title: "Popular TV Shows", endpoint: "/tv/popular" },
            { title: "Top Rated Movies", endpoint: "/movie/top_rated" }
        ],
        movies: [
            { title: "Popular Movies", endpoint: "/movie/popular" },
            { title: "Now Playing", endpoint: "/movie/now_playing" },
            { title: "Upcoming Movies", endpoint: "/movie/upcoming" }
        ],
        tv: [
            { title: "Popular TV Shows", endpoint: "/tv/popular" },
            { title: "Top Rated TV", endpoint: "/tv/top_rated" },
            { title: "Currently Airing", endpoint: "/tv/on_the_air" }
        ],
        anime: [
            { title: "Trending Anime", endpoint: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc" },
            { title: "Top Rated Anime", endpoint: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200" },
            { title: "Anime Movies", endpoint: "/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc" },
            { title: "Currently Airing", endpoint: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&air_date.gte=" + new Date().toISOString().slice(0, 10) }
        ]
    },

    renderSkeletonRows: function(count = 3) {
        this.elements.rows.innerHTML = "";
        // Watch uses one consistent portrait card rhythm across every browse
        // surface. Home previously switched to landscape backdrops, which
        // made the first tab feel like a different product from Movies/TV.
        const isLandscape = false;
        for (let i = 0; i < count; i++) {
            const section = document.createElement("section");
            section.className = "watch-row skeleton-row";
            let cards = "";
            for (let c = 0; c < 6; c++) {
                cards += `
                    <div class="skeleton-card${isLandscape ? " landscape" : ""}">
                        <div class="skeleton-poster"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                `;
            }
            section.innerHTML = `
                <div class="row-title"><div class="skeleton-line title"></div></div>
                <div class="row-scroll no-scrollbar">${cards}</div>
            `;
            this.elements.rows.appendChild(section);
        }
    },

    loadRows: async function() {
        const requestId = this._rowsRequestId = (this._rowsRequestId || 0) + 1;
        this.renderSkeletonRows();
        const rows = this.rowConfig[this.state.tab];
        if (!rows) return;

        // providers/endpoint requests are independent — load in parallel
        const results = await Promise.all(rows.map(row => this.api(row.endpoint)));
        if (requestId !== this._rowsRequestId) return;

        this.elements.rows.innerHTML = "";
        let failed = 0;
        rows.forEach((row, index) => {
            const data = results[index];
            if (!data || !data.results) { failed++; return; }
            const sourceResults = this.state.tab === "anime"
                ? this.filterAnimeItems(data.results)
                : data.results;
            const movies = sourceResults.map(item => this.formatMedia(item)).filter(Boolean);
            this.renderRow(row.title, movies);
        });

        if (failed === rows.length) {
            const error = document.createElement("div");
            error.className = "ui-error watch-load-error";
            error.innerHTML = `
                <span>Couldn't load content right now. Check your connection.</span>
                <button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-retry-rows>Retry</button>
            `;
            error.querySelector("[data-retry-rows]").addEventListener("click", () => this.loadRows());
            this.elements.rows.appendChild(error);
        }
    },

    renderRow: function(title, movies) {
        const section = document.createElement("section");
        section.className = "watch-row";
        section.innerHTML = `
            <div class="row-title"><h2>${title}</h2></div>
            <div class="row-wrapper">
                <button type="button" class="row-arrow left" aria-label="Scroll ${title} left">‹</button>
                <div class="row-scroll"></div>
                <button type="button" class="row-arrow right" aria-label="Scroll ${title} right">›</button>
            </div>
        `;
        const container = section.querySelector(".row-scroll");
        movies.forEach(movie => container.appendChild(this.createMovieCard(movie)));
        this.elements.rows.appendChild(section);

        const scroll = section.querySelector(".row-scroll");
        section.querySelector(".row-arrow.left").onclick = () => scroll.scrollBy({ left: -600, behavior: "smooth" });
        section.querySelector(".row-arrow.right").onclick = () => scroll.scrollBy({ left: 600, behavior: "smooth" });
    },

    createMovieCard: function(movie) {
        const card = document.createElement("div");
        const isLandscape = false;
        card.className = isLandscape ? "movie-card landscape" : "movie-card";
        const imgSrc = movie.poster || "assets/no-poster.png";
        card.innerHTML = `
            <div class="poster-wrap">
                <img src="${imgSrc}" loading="lazy" onerror="this.src='assets/no-poster.png'">
                <div class="movie-card-info"><h3></h3></div>
            </div>
        `;
        card.querySelector(".movie-card-info h3").textContent = movie.title;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `View ${movie.title}`);
        card.tabIndex = 0;
        card.onclick = async () => this.openDetails(await this.getDetails(movie));
        card.onkeydown = event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            card.click();
        };
        return card;
    },

    initRows: function() { this.loadRows(); },

    /* =========================
       DETAILS
    ========================= */
    getDetails: async function(movie) {
        const endpoint = movie.type === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`;
        const data = await this.api(endpoint);
        if (!data) return movie;
        movie.genres = data.genres ? data.genres.map(g => g.name) : [];
        movie.runtime = data.runtime || data.episode_run_time?.[0] || null;
        movie.description = data.overview || movie.description;
        if (movie.type === "tv") {
            movie.seasons = (data.seasons || [])
                .filter(s => s.season_number > 0 && s.episode_count > 0)
                .map(s => ({ number: s.season_number, name: s.name, episodeCount: s.episode_count }));
        }
        return movie;
    },

    getSeasonDetails: async function(tvId, seasonNumber) {
        const data = await this.api(`/tv/${tvId}/season/${seasonNumber}`);
        if (!data || !data.episodes) return [];
        return data.episodes.map(ep => ({
            number: ep.episode_number,
            name: ep.name || `Episode ${ep.episode_number}`,
            overview: ep.overview || "",
            still: this.image(ep.still_path, "w300"),
            airDate: ep.air_date || ""
        }));
    },

    getCredits: async function(movie) {
        const endpoint = movie.type === "tv" ? `/tv/${movie.id}/credits` : `/movie/${movie.id}/credits`;
        const data = await this.api(endpoint);
        if (!data) return { cast: [], crew: [] };
        return {
            cast: (data.cast || []).slice(0, 12).map(p => ({
                name: p.name,
                character: p.character || "",
                photo: this.image(p.profile_path, "w300")
            })),
            crew: this.getKeyCrew(data.crew || [], movie.type)
        };
    },

    getKeyCrew: function(crew, mediaType) {
        const roles = [
            ...(mediaType === "tv" ? [{ label: "Created by", matches: job => /creator|created by/.test(job) }] : []),
            { label: "Director", matches: job => /^(co-)?director$|^series director$/.test(job) },
            { label: "Writing", matches: job => /writer|screenplay|story|teleplay|script|adaptation|author/.test(job) },
            { label: "Production", matches: job => /producer/.test(job) },
            { label: "Cinematography", matches: job => /cinematograph|director of photography/.test(job) },
            { label: "Production Design", matches: job => /production design|production designer|art director|art direction|set decoration/.test(job) },
            { label: "Music", matches: job => /composer|music/.test(job) },
            { label: "Editing", matches: job => /editor/.test(job) }
        ];

        return roles.map(role => {
            const names = [...new Set(crew
                .filter(person => role.matches(String(person.job || "").toLowerCase()))
                .map(person => person.name)
                .filter(Boolean))];
            return names.length ? { label: role.label, names } : null;
        }).filter(Boolean);
    },

    getRecommendations: async function(movie) {
        const endpoint = movie.type === "tv" ? `/tv/${movie.id}/recommendations` : `/movie/${movie.id}/recommendations`;
        const data = await this.api(endpoint);
        if (!data || !data.results) return [];
        const results = this.state.tab === "anime"
            ? this.filterAnimeItems(data.results)
            : data.results;
        return results.map(item => {
            item.media_type = item.media_type || movie.type;
            return this.formatMedia(item);
        }).filter(item => item && item.poster).slice(0, 12);
    },

    openDetails: function(movie) {
        this.state.browseScroll = this.elements.app.scrollTop;
        this.state.selectedMovie = movie;
        this.state.selectedSeason = (movie.type === "tv" && movie.seasons?.length) ? movie.seasons[0].number : 1;
        this.state.selectedEpisode = 1;
        this.state.view = "details";

        this.elements.browseView.classList.add("hidden");
        this.elements.detailsView.classList.remove("hidden");
        this.elements.app.scrollTop = 0;

        this.elements.detailsImage.src = movie.backdrop;
        this.elements.detailsPoster.src = movie.poster;
        document.querySelectorAll(".details-horizontal-scroll").forEach(row => { row.scrollLeft = 0; });
        this.elements.detailsTitle.textContent = movie.title;
        this.elements.detailsDescription.textContent = movie.description;

        this.elements.detailsMeta.innerHTML = `
            <span>⭐ ${movie.rating}</span>
            <span>${movie.year}</span>
            <span>${movie.type === "tv" ? "TV Show" : "Movie"}</span>
            ${movie.runtime ? `<span>${movie.runtime} min</span>` : ""}
        `;

        this.elements.detailsGenres.innerHTML = (movie.genres || [])
            .map(g => `<span class="genre-chip">${g}</span>`).join("");

        if (movie.type === "tv" && movie.seasons?.length) {
            this.elements.episodePicker.classList.remove("hidden");
            this.loadSeasonDropdown(movie);
            this.loadEpisodes(movie, this.state.selectedSeason);
        } else {
            this.elements.episodePicker.classList.add("hidden");
        }

        this.loadProviders(movie);
        this.loadCast(movie);
        this.loadRelated(movie);
    },

    closeDetails: function() {
        this.state.view = "browse";
        this.elements.detailsView.classList.add("hidden");
        this.elements.browseView.classList.remove("hidden");
        this.elements.seasonDropdown.classList.remove("open");
        this.elements.providerDropdown.classList.remove("open");
        this.elements.seasonCurrent.setAttribute("aria-expanded", "false");
        this.elements.providerCurrent.setAttribute("aria-expanded", "false");
        this.elements.app.scrollTop = this.state.browseScroll || 0;
    },

    loadSeasonDropdown: function(movie) {
        const dropdown = this.elements.seasonDropdown;
        dropdown.innerHTML = "";
        const current = movie.seasons.find(s => s.number === this.state.selectedSeason) || movie.seasons[0];
        this.elements.seasonCurrentName.textContent = current.name || `Season ${current.number}`;

        movie.seasons.forEach(season => {
            const item = document.createElement("button");
            item.className = "provider-item ui-menu__item";
            if (season.number === this.state.selectedSeason) item.classList.add("selected");
            item.innerHTML = `
                <span>${season.name || `Season ${season.number}`}</span>
                ${season.number === this.state.selectedSeason ? "<span>✓</span>" : ""}
            `;
            item.onclick = () => {
                this.state.selectedSeason = season.number;
                this.state.selectedEpisode = 1;
                dropdown.classList.remove("open");
                this.elements.seasonCurrent.setAttribute("aria-expanded", "false");
                this.loadSeasonDropdown(movie);
                this.loadEpisodes(movie, season.number);
            };
            dropdown.appendChild(item);
        });
    },

    loadEpisodes: async function(movie, seasonNumber) {
        const container = this.elements.episodeList;
        const requestId = this._episodeRequestId = (this._episodeRequestId || 0) + 1;
        container.innerHTML = `<div class="episode-row-skeleton"></div><div class="episode-row-skeleton"></div><div class="episode-row-skeleton"></div>`;

        const episodes = await this.getSeasonDetails(movie.id, seasonNumber);
        if (requestId !== this._episodeRequestId || !this.state.selectedMovie || this.state.selectedMovie.id !== movie.id || this.state.selectedSeason !== seasonNumber) return;

        if (!episodes.length) {
            container.innerHTML = `<p class="episode-loading">No episode data.</p>`;
            return;
        }

        container.innerHTML = "";
        episodes.forEach(ep => {
            const row = document.createElement("button");
            row.className = "episode-row";
            if (ep.number === this.state.selectedEpisode) row.classList.add("active");
            row.innerHTML = `
                <div class="episode-still">
                    <img src="${ep.still || "assets/no-poster.png"}" loading="lazy" onerror="this.src='assets/no-poster.png'">
                    <span class="episode-num">${ep.number}</span>
                </div>
                <div class="episode-info">
                    <h4>${ep.name}</h4>
                    <p>${ep.overview || "No description."}</p>
                </div>
            `;
            row.onclick = () => {
                this.state.selectedEpisode = ep.number;
                container.querySelectorAll(".episode-row").forEach(r => r.classList.remove("active"));
                row.classList.add("active");
            };
            container.appendChild(row);
        });
    },

    loadCast: async function(movie) {
        this.elements.castSection.classList.remove("hidden");
        this.elements.castTitle.hidden = false;
        this.elements.castCarousel.hidden = false;
        this.elements.crewSection.classList.add("hidden");
        this.elements.castRow.innerHTML = `
            <div class="cast-skeleton"><div class="cast-skeleton-photo"></div><div class="skeleton-line short"></div></div>
            <div class="cast-skeleton"><div class="cast-skeleton-photo"></div><div class="skeleton-line short"></div></div>
            <div class="cast-skeleton"><div class="cast-skeleton-photo"></div><div class="skeleton-line short"></div></div>
        `;

        const credits = await this.getCredits(movie);
        if (this.state.selectedMovie?.id !== movie.id || this.state.selectedMovie?.type !== movie.type) return;
        const { cast, crew } = credits;

        if (!cast.length && !crew.length) {
            this.elements.castSection.classList.add("hidden");
            return;
        }

        this.elements.castTitle.hidden = !cast.length;
        this.elements.castCarousel.hidden = !cast.length;
        this.elements.crewSection.classList.toggle("hidden", !crew.length);
        this.elements.castRow.innerHTML = "";
        cast.forEach(person => {
            const card = document.createElement("div");
            card.className = "cast-card";
            card.innerHTML = `
                <img src="${person.photo || "assets/no-poster.png"}" loading="lazy" onerror="this.src='assets/no-poster.png'">
                <h4>${person.name}</h4>
                <p>${person.character}</p>
            `;
            this.elements.castRow.appendChild(card);
        });
        this.elements.crewRow.replaceChildren();
        crew.forEach(credit => {
            const card = document.createElement("div");
            card.className = "crew-credit";
            card.setAttribute("role", "listitem");

            const role = document.createElement("span");
            role.className = "crew-credit-role";
            role.textContent = credit.label;

            const names = document.createElement("span");
            names.className = "crew-credit-names";
            names.textContent = credit.names.length > 3
                ? `${credit.names.slice(0, 3).join(", ")} +${credit.names.length - 3}`
                : credit.names.join(", ");

            card.append(role, names);
            this.elements.crewRow.appendChild(card);
        });
        this.updateDetailsScrollControls(this.elements.castRow.closest(".details-carousel"));
        this.updateDetailsScrollControls(this.elements.crewRow.closest(".details-carousel"));
    },

    loadRelated: async function(movie) {
        this.elements.relatedSection.classList.remove("hidden");
        this.elements.relatedRow.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-poster"></div></div>
            <div class="skeleton-card"><div class="skeleton-poster"></div></div>
            <div class="skeleton-card"><div class="skeleton-poster"></div></div>
            <div class="skeleton-card"><div class="skeleton-poster"></div></div>
        `;

        const related = await this.getRecommendations(movie);
        if (!this.state.selectedMovie || this.state.selectedMovie.id !== movie.id) return;

        if (!related.length) {
            this.elements.relatedSection.classList.add("hidden");
            return;
        }

        this.elements.relatedRow.innerHTML = "";
        related.forEach(item => this.elements.relatedRow.appendChild(this.createMovieCard(item)));
        this.updateDetailsScrollControls(this.elements.relatedRow.closest(".details-carousel"));
    },

    loadProviders: function(movie) {
        const dropdown = this.elements.providerDropdown;
        dropdown.innerHTML = "";
        const saved = localStorage.getItem("blurProvider") || this.providers[0].id;
        const current = this.providers.find(p => p.id === saved) || this.providers[0];
        this.elements.providerCurrentName.textContent = current.name;

        this.providers.forEach(provider => {
            const item = document.createElement("button");
            item.className = "provider-item ui-menu__item";
            if (provider.id === saved) item.classList.add("selected");
            item.innerHTML = `
                <span>${provider.name}</span>
                ${provider.id === saved ? "<span>✓</span>" : ""}
            `;
            item.onclick = () => {
                localStorage.setItem("blurProvider", provider.id);
                this.elements.providerCurrentName.textContent = provider.name;
                dropdown.classList.remove("open");
                this.elements.providerCurrent.setAttribute("aria-expanded", "false");
                this.loadProviders(movie);
            };
            dropdown.appendChild(item);
        });
    },

    setupDetails: function() {
        this.elements.seasonCurrent.onclick = () => {
            const open = !this.elements.seasonDropdown.classList.contains("open");
            this.elements.seasonDropdown.classList.toggle("open", open);
            this.elements.seasonCurrent.setAttribute("aria-expanded", String(open));
        };
        this.elements.providerCurrent.onclick = () => {
            const open = !this.elements.providerDropdown.classList.contains("open");
            this.elements.providerDropdown.classList.toggle("open", open);
            this.elements.providerCurrent.setAttribute("aria-expanded", String(open));
        };

        this.setupDetailsScrollControls();

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".provider-selector")) {
                this.elements.providerDropdown.classList.remove("open");
                this.elements.providerCurrent.setAttribute("aria-expanded", "false");
            }
            if (!e.target.closest(".season-selector")) {
                this.elements.seasonDropdown.classList.remove("open");
                this.elements.seasonCurrent.setAttribute("aria-expanded", "false");
            }
        });
    },

    setupDetailsScrollControls: function() {
        document.querySelectorAll(".details-carousel").forEach(wrapper => {
            const scroller = wrapper.querySelector(".details-horizontal-scroll");
            if (!scroller) return;
            wrapper.querySelectorAll("[data-scroll-step]").forEach(button => {
                button.addEventListener("click", () => {
                    const distance = Math.max(scroller.clientWidth * .82, 200);
                    scroller.scrollBy({ left: distance * Number(button.dataset.scrollStep), behavior: "smooth" });
                });
            });
            scroller.addEventListener("scroll", () => this.updateDetailsScrollControls(wrapper), { passive: true });
            this.updateDetailsScrollControls(wrapper);
        });

        window.addEventListener("resize", () => {
            document.querySelectorAll(".details-carousel").forEach(wrapper => this.updateDetailsScrollControls(wrapper));
        }, { passive: true });
    },

    updateDetailsScrollControls: function(wrapper) {
        if (!wrapper) return;
        const scroller = wrapper.querySelector(".details-horizontal-scroll");
        if (!scroller) return;
        const [leftButton, rightButton] = wrapper.querySelectorAll("[data-scroll-step]");
        const canScroll = scroller.scrollWidth > scroller.clientWidth + 2;
        wrapper.classList.toggle("is-scrollable", canScroll);
        if (leftButton) leftButton.disabled = !canScroll || scroller.scrollLeft <= 2;
        if (rightButton) rightButton.disabled = !canScroll || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
    },

    /* =========================
       SEARCH
    ========================= */
    searchTimer: null,

    updateSearchContext: function() {
        const labels = {
            home: { placeholder: "Search movies and shows", aria: "Search movies and TV shows" },
            movies: { placeholder: "Search movies", aria: "Search movies" },
            tv: { placeholder: "Search TV shows", aria: "Search TV shows" },
            anime: { placeholder: "Search anime", aria: "Search anime" }
        };
        const context = labels[this.state.tab] || labels.home;
        this.elements.search.placeholder = context.placeholder;
        this.elements.search.setAttribute("aria-label", context.aria);
    },

    searchMedia: async function(query, options = {}) {
        const cleanQuery = query.trim();
        const requestId = this._searchRequestId = (this._searchRequestId || 0) + 1;
        this.state.searchQuery = cleanQuery;
        this._activeSuggestionIndex = -1;
        if (!cleanQuery) {
            this.closeSearchSuggestions();
            this.loadRows();
            return;
        }
        if (options.hideSuggestions) this.closeSearchSuggestions();
        const tab = this.state.tab;
        const categoryLabel = tab === "movies" ? "movies" : tab === "tv" ? "TV shows" : tab === "anime" ? "anime" : "movies and shows";
        this.elements.rows.innerHTML = `
            <div class="watch-empty-state" role="status"><div><strong>Searching</strong><p>Finding ${categoryLabel}…</p></div></div>
        `;
        const encodedQuery = encodeURIComponent(cleanQuery);
        const endpoint = tab === "movies"
            ? `/search/movie?query=${encodedQuery}`
            : tab === "tv"
                ? `/search/tv?query=${encodedQuery}`
                : `/search/multi?query=${encodedQuery}`;
        const data = await this.api(endpoint);
        if (requestId !== this._searchRequestId) return;
        if (!data || !data.results) {
            if (!options.hideSuggestions) this.showSearchSuggestionStatus("Suggestions couldn’t load");
            this.showSearchMessage("Search couldn’t load", "Check your connection and try again.", cleanQuery, true);
            return;
        }
        const results = data.results
            .filter(item => {
                const type = item.media_type || (item.title ? "movie" : "tv");
                if (type !== "movie" && type !== "tv") return false;
                if (tab === "movies") return type === "movie";
                if (tab === "tv") return type === "tv";
                if (tab === "anime") return (item.genre_ids || []).includes(16) && item.original_language === "ja" && this.animeContentFilter.allows(item);
                return true;
            })
            .map(item => this.formatMedia(item))
            .filter(Boolean);
        if (!options.hideSuggestions) this.showSearchSuggestions(results.slice(0, 6), cleanQuery);
        this.showSearchResults(results, cleanQuery);
    },

    showSearchSuggestions: function(results, query) {
        const panel = document.querySelector("#watchSearchSuggestions");
        if (!panel || query !== this.elements.search.value.trim()) return;
        this._searchSuggestions = results;
        this._suggestionQuery = query;
        this._activeSuggestionIndex = -1;
        panel.replaceChildren();

        if (!results.length) {
            const empty = document.createElement("div");
            empty.className = "watch-search-suggestion-empty";
            empty.textContent = `No matches for “${query}”`;
            panel.appendChild(empty);
        } else {
            results.forEach((movie, index) => {
                const option = document.createElement("div");
                option.className = "watch-search-suggestion";
                option.id = `watchSearchSuggestion${index}`;
                option.setAttribute("role", "option");
                option.setAttribute("aria-selected", "false");
                option.dataset.suggestionIndex = String(index);

                const image = document.createElement("img");
                image.src = movie.poster || "assets/no-poster.png";
                image.alt = "";
                image.loading = "lazy";
                image.onerror = () => { image.src = "assets/no-poster.png"; };

                const copy = document.createElement("span");
                copy.className = "watch-search-suggestion-copy";
                const title = document.createElement("strong");
                title.textContent = movie.title;
                const meta = document.createElement("span");
                meta.textContent = [movie.type === "tv" ? "TV show" : "Movie", movie.year].filter(Boolean).join(" · ");
                copy.append(title, meta);
                option.append(image, copy);
                option.addEventListener("click", () => this.selectSearchSuggestion(index));
                panel.appendChild(option);
            });
        }

        panel.hidden = false;
        this.elements.search.setAttribute("aria-expanded", "true");
        this.elements.search.removeAttribute("aria-activedescendant");
    },

    showSearchSuggestionStatus: function(message) {
        const panel = document.querySelector("#watchSearchSuggestions");
        if (!panel) return;
        this._suggestionQuery = "";
        panel.replaceChildren();
        const status = document.createElement("div");
        status.className = "watch-search-suggestion-empty";
        status.textContent = message;
        panel.appendChild(status);
        panel.hidden = false;
        this.elements.search.setAttribute("aria-expanded", "true");
        this.elements.search.removeAttribute("aria-activedescendant");
    },

    closeSearchSuggestions: function() {
        const panel = document.querySelector("#watchSearchSuggestions");
        if (panel) panel.hidden = true;
        this.elements.search?.setAttribute("aria-expanded", "false");
        this.elements.search?.removeAttribute("aria-activedescendant");
        this._activeSuggestionIndex = -1;
    },

    moveSearchSuggestion: function(direction) {
        const panel = document.querySelector("#watchSearchSuggestions");
        const options = panel ? [...panel.querySelectorAll("[role=option]")] : [];
        if (!options.length) return;
        const next = this._activeSuggestionIndex + direction;
        this._activeSuggestionIndex = (next + options.length) % options.length;
        options.forEach((option, index) => {
            const selected = index === this._activeSuggestionIndex;
            option.setAttribute("aria-selected", String(selected));
            option.classList.toggle("active", selected);
        });
        const active = options[this._activeSuggestionIndex];
        this.elements.search.setAttribute("aria-activedescendant", active.id);
        active.scrollIntoView({ block: "nearest" });
    },

    selectSearchSuggestion: async function(index) {
        const movie = this._searchSuggestions?.[index];
        if (!movie) return;
        clearTimeout(this.searchTimer);
        this._searchRequestId = (this._searchRequestId || 0) + 1;
        this.closeSearchSuggestions();
        this.elements.search.value = movie.title;
        this.state.searchQuery = movie.title;
        this.openDetails(await this.getDetails(movie));
    },

    showSearchResults: function(results, query = "") {
        this.elements.rows.innerHTML = "";
        if (!results.length) {
            const category = this.state.tab === "movies" ? "movies" : this.state.tab === "tv" ? "TV shows" : this.state.tab === "anime" ? "anime" : "movies or shows";
            this.showSearchMessage("No matches found", `No ${category} matched “${query}”.`, query);
            return;
        }
        const section = document.createElement("section");
        section.className = "watch-row search-results";
        section.innerHTML = `<div class="row-title"><h2>Search Results</h2><span class="watch-result-count"></span></div><div class="row-scroll"></div>`;
        const count = section.querySelector(".watch-result-count");
        count.textContent = `${results.length} ${results.length === 1 ? "result" : "results"}`;
        count.setAttribute("aria-label", `Search for ${query}: ${count.textContent}`);
        const container = section.querySelector(".row-scroll");
        results.forEach(movie => container.appendChild(this.createMovieCard(movie)));
        this.elements.rows.appendChild(section);
    },

    showSearchMessage: function(title, message, query = "", retry = false) {
        const state = document.createElement("div");
        state.className = "watch-empty-state";
        state.setAttribute("role", "status");
        const copy = document.createElement("div");
        const heading = document.createElement("strong");
        const description = document.createElement("p");
        heading.textContent = title;
        description.textContent = message;
        copy.append(heading, description);
        state.appendChild(copy);
        if (retry) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Try again";
            button.addEventListener("click", () => this.searchMedia(query));
            state.appendChild(button);
        }
        this.elements.rows.replaceChildren(state);
    },

    setupSearch: function() {
        const input = this.elements.search;
        if (!input) return;
        this.updateSearchContext();
        input.addEventListener("input", () => {
            clearTimeout(this.searchTimer);
            this._searchRequestId = (this._searchRequestId || 0) + 1;
            this._activeSuggestionIndex = -1;
            if (!input.value.trim()) {
                this.state.searchQuery = "";
                this._suggestionQuery = "";
                this._searchSuggestions = [];
                this.closeSearchSuggestions();
                this.loadRows();
                return;
            }
            this.showSearchSuggestionStatus("Searching…");
            this.searchTimer = setTimeout(() => this.searchMedia(input.value), 320);
        });
        input.addEventListener("focus", () => {
            if (input.value.trim() && input.value.trim() === this._suggestionQuery && this._searchSuggestions?.length) {
                const panel = document.querySelector("#watchSearchSuggestions");
                if (panel) {
                    panel.hidden = false;
                    input.setAttribute("aria-expanded", "true");
                }
            }
        });
        input.addEventListener("keydown", event => {
            const suggestions = document.querySelector("#watchSearchSuggestions");
            if (event.key === "ArrowDown" && suggestions && !suggestions.hidden) {
                event.preventDefault();
                this.moveSearchSuggestion(1);
                return;
            }
            if (event.key === "ArrowUp" && suggestions && !suggestions.hidden) {
                event.preventDefault();
                this.moveSearchSuggestion(-1);
                return;
            }
            if (event.key === "Escape") {
                this.closeSearchSuggestions();
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                if (this._activeSuggestionIndex >= 0) this.selectSearchSuggestion(this._activeSuggestionIndex);
                else {
                    clearTimeout(this.searchTimer);
                    this.searchMedia(input.value, { hideSuggestions: true });
                }
            }
        });
        document.addEventListener("click", event => {
            if (!event.target.closest(".watch-search")) this.closeSearchSuggestions();
        });
    },

    /* =========================
       PLAYER — CLEAN (no banners, working popout)
    ========================= */
    openPlayer: function(movie, url) {
        if (!movie) return;

        this.state.playerRetryCount = 0;
        this.state.adDetectionCount = 0;

        // Store the current movie and URL for popout
        this._currentMovie = movie;
        this._currentUrl = url;
        const episodeLabel = movie.type === "tv"
            ? `Season ${this.state.selectedSeason}, episode ${this.state.selectedEpisode}`
            : "";
        window.BlurPresence?.setActivity("movie", {
            title: movie.title,
            subtitle: episodeLabel
        });

        // Set poster
        if (this.elements.playerPoster) {
            this.elements.playerPoster.src = movie.poster || '';
            this.elements.playerPoster.style.display = movie.poster ? '' : 'none';
        }

        // Set title
        this.elements.playerTitle.textContent =
            movie.type === "tv"
                ? `${movie.title} — S${this.state.selectedSeason} E${this.state.selectedEpisode}`
                : movie.title;

        // Show modal
        this.elements.playerModal.classList.remove("hidden");

        // Load iframe
        const frame = this.elements.playerFrame;
        if (String(url).includes("/stigstream/") || String(url).includes("provider=stigstream")) {
            frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-presentation");
        } else {
            frame.removeAttribute("sandbox");
        }
        frame.src = url;

        // Store original URL for reload
        frame.dataset.originalUrl = url;

        // Monitor for popups (silently, no banners)
        this.monitorIframe(frame);
        setTimeout(() => frame.focus(), 300);
    },

    monitorIframe: function(frame) {
        let lastSrc = frame.src;

        if (this._monitorInterval) clearInterval(this._monitorInterval);

        this._monitorInterval = setInterval(() => {
            if (!this.elements.playerModal || this.elements.playerModal.classList.contains("hidden")) {
                clearInterval(this._monitorInterval);
                return;
            }

            try {
                const currentSrc = frame.src;
                
                if (currentSrc !== lastSrc && currentSrc !== "about:blank" && currentSrc !== "") {
                    if (this.isPopupRedirect(currentSrc)) {
                        // Silently block — no banner
                        console.warn("🚫 Popup redirect blocked");
                        frame.src = lastSrc;
                        clearInterval(this._monitorInterval);
                        return;
                    }
                    lastSrc = currentSrc;
                }
            } catch (e) {}
        }, 800);
    },

    isPopupRedirect: function(url) {
        if (!url) return false;
        const lower = url.toLowerCase();
        const popupDomains = [
            'go.ad', 'click.ad', 'popunder', 'popup',
            'adservice', 'doubleclick',
            'ad.doubleclick', 'adsrv',
            'newtab', 'new-tab',
            'porn', 'xxx', 'adult', 'sex', 'nude', '18+', 'casino', 'gambling'
        ];
        return popupDomains.some(b => lower.includes(b));
    },

    closePlayer: function() {
        this.elements.playerModal.classList.add("hidden");
        this.elements.playerFrame.src = "about:blank";
        if (this._monitorInterval) clearInterval(this._monitorInterval);
        this._currentMovie = null;
        this._currentUrl = null;
        window.BlurPresence?.clearActivity("movie");
    },

    setupPlayer: function() {
        const self = this;

        // Watch button opens player
        this.elements.watchButton.onclick = () => {
            const movie = this.state.selectedMovie;
            if (!movie) return;

            const saved = localStorage.getItem("blurProvider") || this.providers[0].id;
            const provider = this.providers.find(p => p.id === saved) || this.providers[0];

            const url = movie.type === "tv"
                ? provider.tv(movie.id, this.state.selectedSeason, this.state.selectedEpisode)
                : provider.movie(movie.id);

            this.openPlayer(movie, url);
        };

        // Close button
        this.elements.playerClose.onclick = () => this.closePlayer();

        // Fullscreen button
        this.elements.playerFullscreen.onclick = () => {
            const wrap = document.querySelector(".player-frame-wrap");
            if (!document.fullscreenElement) {
                wrap?.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        };

        // Reload button — SILENT (no banner)
        this.elements.playerReload.onclick = () => {
            const frame = this.elements.playerFrame;
            const original = frame.dataset.originalUrl || frame.src;
            if (original && original !== "about:blank") {
                frame.src = original;
            }
        };

        // Popout button — FIXED: uses stored URL
        this.elements.playerPopout.onclick = () => {
            const frame = this.elements.playerFrame;
            // Try multiple sources for the URL
            let url = frame.dataset.originalUrl || frame.src || self._currentUrl;
            
            if (url && url !== "about:blank" && url !== "") {
                // Open in new tab
                window.open(url, "_blank");
            } else {
                console.warn("No URL to popout");
            }
        };

        // Click on backdrop closes player
        this.elements.playerModal.onclick = (e) => {
            if (e.target === this.elements.playerModal) this.closePlayer();
        };
    },

    /* =========================
       AD BLOCKER — SILENT (no banners)
    ========================= */
    setupAdBlocker: function() {
        // 1. BLOCK window.open (popups) — SILENT
        const originalOpen = window.open;
        window.open = function(url, name, features) {
            const modal = document.getElementById("watchPlayerModal");
            if (modal && !modal.classList.contains("hidden")) {
                console.warn("🚫 Popup blocked:", url);
                return null;
            }
            return originalOpen.call(this, url, name, features);
        };

        // 2. BLOCK new tab clicks — SILENT
        document.addEventListener("click", (e) => {
            const modal = this.elements.playerModal;
            if (modal && !modal.classList.contains("hidden")) {
                const target = e.target.closest("a");
                if (target && target.target === "_blank") {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn("🚫 New tab blocked");
                    return false;
                }
            }
        }, true);

        // 3. BLOCK context menu
        this.elements.playerFrame?.addEventListener("contextmenu", (e) => e.preventDefault());

        // 4. BLOCK keyboard shortcuts for new windows
        document.addEventListener("keydown", (e) => {
            const modal = this.elements.playerModal;
            if (modal && !modal.classList.contains("hidden")) {
                if ((e.ctrlKey || e.metaKey) && ["n", "t"].includes(e.key)) {
                    e.preventDefault();
                    console.warn("🚫 Keyboard shortcut blocked");
                    return false;
                }
            }
        });

        // 5. Remove suspicious popup elements — SILENT
        setInterval(() => {
            const modal = this.elements.playerModal;
            if (modal && !modal.classList.contains("hidden")) {
                document.querySelectorAll('iframe:not(#watchPlayer)').forEach(el => {
                    const src = el.src || '';
                    if (src.includes('popup') || src.includes('ad') && !src.includes('noads')) {
                        console.warn("🚫 Popup iframe removed");
                        el.remove();
                    }
                });
            }
        }, 3000);
    }
};

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => Watch.init());
