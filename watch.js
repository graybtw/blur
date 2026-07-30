/* ==========================================================================
   BLUR WATCH
   Movies + TV Streaming Tab
   ========================================================================== */


/* =========================
   WATCH APP
========================= */

const Watch = {


    /* =========================
       STATE
    ========================= */

    state: {

        tab: "home",

        heroItems: [],

        currentHero: 0,

        rows: [],

        searchQuery: "",

        selectedMovie: null


    },



    /* =========================
       ELEMENTS
    ========================= */

    elements: {},



    /* =========================
       START
    ========================= */

    init(){


        this.createInterface();


        this.cacheElements();


        this.setupEvents();


        console.log(
            "Blur Watch loaded"
        );


    },



    /* =========================
       CREATE UI
    ========================= */

    createInterface(){


        const panel =
        document.querySelector(
            ".watch-panel"
        );


        if(!panel) return;



        panel.innerHTML = `


        <div class="watch-app">


            <div class="watch-top">


                <div class="watch-search">


<span class="search-icon">

    <img src="assets/icons/search.png">

</span>


                    <input

                    id="watchSearch"

                    placeholder="Search movies and TV shows..."

                    autocomplete="off">


                </div>



                <div class="watch-tabs">


                    <button

                    class="watch-tab active"

                    data-watch-tab="home">

                        Home

                    </button>



                    <button

                    class="watch-tab"

                    data-watch-tab="movies">

                        Movies

                    </button>



                    <button

                    class="watch-tab"

                    data-watch-tab="tv">

                        TV Shows

                    </button>


                </div>


            </div>




            <section class="watch-hero">


                <div class="hero-background">


                    <img id="watchHeroImage">


                    <div class="hero-overlay"></div>


                </div>



                <div class="hero-content">


                    <span id="watchHeroLabel">

                        Trending

                    </span>



                    <h1 id="watchHeroTitle">

                        Loading...

                    </h1>



                    <p id="watchHeroDescription">

                        Loading movies...

                    </p>



                    <div id="watchHeroMeta">


                    </div>



                    <div class="hero-actions">


                        <button

                        class="hero-watch-button">

                            ▶ Watch

                        </button>



                        <button

                        class="hero-info-button">

                            More Info

                        </button>


                    </div>


                </div>

                <div class="hero-dots" id="heroDots"></div>

            </section>





            <section

            id="watchRows"

            class="watch-rows">


            </section>

            <div id="watchDetailsModal" class="watch-modal hidden">


    <div class="watch-details">


        <button class="watch-modal-close">

            ✕

        </button>



        <div class="details-backdrop">


            <img id="detailsImage">


            <div></div>


        </div>




        <div class="details-content">


            <img 
            id="detailsPoster"
            class="details-poster">



            <div class="details-info">


                <h1 id="detailsTitle">

                </h1>


                <div id="detailsMeta">

                </div>



                <p id="detailsDescription">

                </p>

<div class="provider-selector">

    <div class="provider-label">
        Provider
    </div>

    <button
        id="providerCurrent"
        class="provider-current">

        <span id="providerCurrentName">
            Select Provider
        </span>

        <span
            id="providerArrow"
            class="provider-arrow">
            ▼
        </span>

    </button>

    <div
        id="providerDropdown"
        class="provider-dropdown">
    </div>

</div>



<button class="details-watch">

▶ Watch Now

</button>


            </div>


        </div>


    </div>


</div>

<div id="watchPlayerModal" class="player-modal hidden">


    <div class="player-box">


    <button class="player-fullscreen">

    ⛶

</button>


<button class="player-close">

    ✕

</button>



        <div class="player-header">


            <h2 id="playerTitle">

            </h2>


        </div>



        <div class="player-frame">


            <iframe

            id="watchPlayer"

            allowfullscreen>

            </iframe>


        </div>


    </div>


</div>



        </div>


        `;


    },




    /* =========================
       CACHE ELEMENTS
    ========================= */

    cacheElements(){


        this.elements = {


            panel:
            document.querySelector(
                ".watch-panel"
            ),


            search:
            document.querySelector(
                "#watchSearch"
            ),


            heroImage:
            document.querySelector(
                "#watchHeroImage"
            ),


            heroTitle:
            document.querySelector(
                "#watchHeroTitle"
            ),


            heroDescription:
            document.querySelector(
                "#watchHeroDescription"
            ),


            heroMeta:
            document.querySelector(
                "#watchHeroMeta"
            ),


            rows:
            document.querySelector(
                "#watchRows"
            ),

            dots:

document.querySelector(
    "#heroDots"
),

            fullscreen:

document.querySelector(
".player-fullscreen"
),

            playerModal:

document.querySelector(
"#watchPlayerModal"
),


playerFrame:

document.querySelector(
"#watchPlayer"
),


playerTitle:

document.querySelector(
"#playerTitle"
),


playerClose:

document.querySelector(
".player-close"
),


watchButton:

document.querySelector(
".details-watch"
),

            modal:

document.querySelector(

"#watchDetailsModal"

),


detailsImage:

document.querySelector(

"#detailsImage"

),


detailsPoster:

document.querySelector(

"#detailsPoster"

),


detailsTitle:

document.querySelector(

"#detailsTitle"

),


detailsMeta:

document.querySelector(

"#detailsMeta"

),


detailsDescription:

document.querySelector(

"#detailsDescription"

),

providerCurrent:
document.querySelector("#providerCurrent"),

providerCurrentName:
document.querySelector("#providerCurrentName"),

providerDropdown:
document.querySelector("#providerDropdown"),


closeModal:

document.querySelector(

".watch-modal-close"

)


        };


    },




    /* =========================
       EVENTS
    ========================= */

    setupEvents(){


        document
        .querySelectorAll(
            "[data-watch-tab]"
        )
        .forEach(button=>{


button.onclick = ()=>{


    document
    .querySelectorAll(
        "[data-watch-tab]"
    )
    .forEach(tab=>{

        tab.classList.remove(
            "active"
        );

    });



    button.classList.add(
        "active"
    );


    this.state.tab =
    button.dataset.watchTab;


    this.loadRows();


};


        });


    }


};

/* ==========================================================================
   TMDB API + HELPERS
   ========================================================================== */


/* =========================
   CONFIG
========================= */


Watch.config = {

    apiKey:

    "adb28b9c41cf9c0eb6b04b92659b0fe8",


    base:

    "https://api.themoviedb.org/3",


    images:

    "https://image.tmdb.org/t/p/"

};


Watch.providers = [

{
    id: "peachify",
    name: "Peachify [best]",

    movie: id =>
    `https://peachify.top/embed/movie/${id}`,

    tv: (id, season=1, episode=1) =>
    `https://peachify.top/embed/tv/${id}/${season}/${episode}`
},

{
    id:"111movies",
    name:"111Movies [good]",

    movie:id =>
    `https://111movies.net/movie/${id}`,

    tv:(id,season=1,episode=1)=>
    `https://111movies.net/tv/${id}/${season}/${episode}`
},

{
    id:"embedmaster",
    name:"EmbedMaster [pretty good]",

    movie:id =>
    `https://embedmaster.link/movie/${id}`,

    tv:(id,season=1,episode=1)=>
    `https://embedmaster.link/tv/${id}/${season}/${episode}`
},

{
    id: "videasy",
    name: "VidEasy [good]",

    movie: id => `https://player.videasy.to/movie/${id}`,

    tv: (id, season = 1, episode = 1) =>
    `https://player.videasy.to/tv/${id}/${season}/${episode}`
},


{
    id: "moviesapi",
    name: "MoviesAPI [laggy]",

    movie: id => `https://moviesapi.to/movie/${id}`,

    tv: (id, season = 1, episode = 1) =>
    `https://moviesapi.to/tv/${id}/${season}/${episode}`
},


{
    id: "vidcore",
    name: "VidCore [slow]",

    movie: id => `https://www.vidcore.org/embed/movie/${id}`,

    tv: (id, season = 1, episode = 1) =>
    `https://www.vidcore.org/embed/tv/${id}/${season}/${episode}`
},

];



/* =========================
   API REQUEST
========================= */


Watch.api = async function(endpoint){


    try{


        const response = await fetch(

            `${this.config.base}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${this.config.apiKey}`

        );


        if(!response.ok){

            throw new Error(
                "TMDB request failed"
            );

        }


        return await response.json();


    }


    catch(error){


        console.error(
            "TMDB Error:",
            error
        );


        return null;


    }


};




/* ==========================================================================
   FULL DETAILS
   ========================================================================== */


Watch.getDetails = async function(movie){


    const endpoint =

    movie.type === "tv"

    ?

    `/tv/${movie.id}`

    :

    `/movie/${movie.id}`;




    const data = await this.api(

        endpoint

    );



    if(!data)

    return movie;



    movie.genres =

    data.genres

    ?

    data.genres.map(

        g=>g.name

    )

    :

    [];



    movie.runtime =

    data.runtime

    ||

    data.episode_run_time?.[0]

    ||

    null;



    movie.description =

    data.overview

    ||

    movie.description;



    return movie;


};

/* =========================
   IMAGE HELPERS
========================= */


Watch.image = function(

    path,

    size="original"

){


    if(!path)

    return "";



    return (

        this.config.images

        +

        size

        +

        path

    );


};






/* =========================
   FORMAT MOVIE / TV
========================= */


Watch.formatMedia = function(

    item

){


    if(!item)

    return null;



    const type =

    item.media_type

    ||

    (

        item.title

        ?

        "movie"

        :

        "tv"

    );



    return {


        id:item.id,


        type:type,


        title:

        item.title

        ||

        item.name

        ||

        "Unknown",



        description:

        item.overview

        ||

        "No description available.",



        poster:

        this.image(

            item.poster_path,

            "w500"

        ),



        backdrop:

        this.image(

            item.backdrop_path,

            "original"

        ),



        rating:

        item.vote_average

        ?

        item.vote_average.toFixed(1)

        :

        "N/A",



        year:

        (

            item.release_date

            ||

            item.first_air_date

            ||

            ""

        ).slice(0,4),



genres:

item.genre_ids || [],


runtime:

item.runtime || null,


trailer:

null

    };


};






/* =========================
   GENRE NAMES
========================= */


Watch.genres = {


    28:"Action",

    12:"Adventure",

    16:"Animation",

    35:"Comedy",

    80:"Crime",

    99:"Documentary",

    18:"Drama",

    14:"Fantasy",

    27:"Horror",

    878:"Sci-Fi",

    53:"Thriller",

    10749:"Romance",


    10751:"Family",

    10759:"Action & Adventure",

    10765:"Sci-Fi & Fantasy",

    10768:"War & Politics"


};






Watch.getGenres = function(ids){


    return ids

    .map(

        id=>this.genres[id]

    )

    .filter(Boolean)

    .slice(0,3);


};

/* =========================
   LOAD HERO DATA
========================= */


Watch.loadHero = async function(){


    const data = await this.api(

        "/trending/all/week"

    );



    if(!data || !data.results){

        console.error(
            "No hero data"
        );

        return;

    }



    this.state.heroItems =

    data.results

    .map(item=>{

        return this.formatMedia(item);

    })

    .filter(item=>{


        return (

            item.backdrop

            &&

            item.title

        );


    })

    .slice(0,8);





    this.state.currentHero = 0;



    this.renderHero();



};






/* =========================
   RENDER HERO
========================= */

Watch.renderHero = function(){


    const movie =

    this.state.heroItems[

        this.state.currentHero

        

    ];



    if(!movie)

    return;



    const img = this.elements.heroImage;



    img.style.opacity = "0";



    setTimeout(()=>{


        img.src = movie.backdrop;



        img.onload = ()=>{


            img.style.opacity="1";


        };


    },250);




    this.elements.heroTitle.textContent =

    movie.title;



    this.elements.heroDescription.textContent =

    movie.description;

    this.renderHeroDots();



    this.elements.heroMeta.innerHTML = `


        <span>

        ⭐ ${movie.rating}

        </span>


        <span>

        ${movie.year}

        </span>


        <span>

        ${movie.type === "tv"

        ?

        "TV Show"

        :

        "Movie"

        }

        </span>


    `;



};

/* =========================
   HERO ROTATION
========================= */


Watch.startHeroRotation = function(){



    setInterval(()=>{



        if(

            !this.state.heroItems.length

        )

        return;



        this.state.currentHero++;



        if(

            this.state.currentHero

            >=

            this.state.heroItems.length

        ){


            this.state.currentHero = 0;


        }



        this.renderHero();

this.renderHeroDots();



    },8000);



};






/* =========================
   HERO BUTTONS
========================= */


Watch.setupHeroButtons = function(){


const watchButton =
document.querySelector(
".hero-watch-button"
);


const infoButton =
document.querySelector(
".hero-info-button"
);



watchButton.onclick = async ()=>{


    const movie =
    this.state.heroItems[
        this.state.currentHero
    ];


    const details =
    await this.getDetails(movie);


    this.openDetails(details);


};



infoButton.onclick = async ()=>{


    const movie =
    this.state.heroItems[
        this.state.currentHero
    ];


    const details =
    await this.getDetails(movie);


    this.openDetails(details);


};



};





/* =========================
   START HERO
========================= */


Watch.initHero = async function(){


    await this.loadHero();



    this.startHeroRotation();



    this.setupHeroButtons();


};

/* ==========================================================================
   MOVIE ROW SYSTEM
   ========================================================================== */


/* =========================
   ROW CONFIG
========================= */


Watch.rowConfig = {


    home:[

        {
            title:"Trending Now",
            endpoint:"/trending/all/week"
        },


        {
            title:"Popular Movies",
            endpoint:"/movie/popular"
        },


        {
            title:"Popular TV Shows",
            endpoint:"/tv/popular"
        },


        {
            title:"Top Rated Movies",
            endpoint:"/movie/top_rated"
        }

    ],



    movies:[

        {
            title:"Popular Movies",
            endpoint:"/movie/popular"
        },


        {
            title:"Now Playing",
            endpoint:"/movie/now_playing"
        },


        {
            title:"Upcoming Movies",
            endpoint:"/movie/upcoming"
        }

    ],



    tv:[

        {
            title:"Popular TV Shows",
            endpoint:"/tv/popular"
        },


        {
            title:"Top Rated TV",
            endpoint:"/tv/top_rated"
        },


        {
            title:"Currently Airing",
            endpoint:"/tv/on_the_air"
        }

    ]


};






/* =========================
   LOAD ROWS
========================= */


Watch.loadRows = async function(){



    this.elements.rows.innerHTML = "";



    const rows =

    this.rowConfig[

        this.state.tab

    ];



    for(

        const row of rows

    ){



        const data =

        await this.api(

            row.endpoint

        );



        if(

            !data ||

            !data.results

        )

        continue;




        const movies =

        data.results

        .map(item=>{


            return this.formatMedia(

                item

            );


        })

        .filter(Boolean);




        this.renderRow(

            row.title,

            movies

        );


    }



};






/* =========================
   CREATE ROW
========================= */


Watch.renderRow = function(

    title,

    movies

){



    const section =

    document.createElement(

        "section"

    );



    section.className =

    "watch-row";



section.innerHTML = `


    <div class="row-title">

        <h2>${title}</h2>

    </div>



    <div class="row-wrapper">


        <button class="row-arrow left">

            ‹

        </button>



        <div class="row-scroll">


        </div>



        <button class="row-arrow right">

            ›

        </button>


    </div>


`;



    const container =

    section.querySelector(

        ".row-scroll"

    );




    movies.forEach(movie=>{



        container.appendChild(

            this.createMovieCard(

                movie

            )

        );



    });




    this.elements.rows.appendChild(

        section

    );

    const scroll =
section.querySelector(".row-scroll");


const left =
section.querySelector(".row-arrow.left");


const right =
section.querySelector(".row-arrow.right");



left.onclick = ()=>{

    scroll.scrollBy({

        left:-600,

        behavior:"smooth"

    });

};



right.onclick = ()=>{

    scroll.scrollBy({

        left:600,

        behavior:"smooth"

    });

};



};






/* =========================
   MOVIE CARD PLACEHOLDER
========================= */


Watch.createMovieCard = function(movie){


    const card =

    document.createElement(

        "div"

    );



    card.className =

    "movie-card";



card.innerHTML = `

<div class="poster-wrap">

    <img

    src="${movie.poster || "assets/no-poster.png"}"

    loading="lazy"
    onerror="this.src='assets/no-poster.png'">


    <span class="quality-badge">

        HD

    </span>

</div>


<div class="movie-card-info">


    <h3>

    ${movie.title}

    </h3>


    <p>

    ⭐ ${movie.rating}

    </p>


</div>

`;



card.onclick=async()=>{


    const details =

    await this.getDetails(

        movie

    );


    this.openDetails(

        details

    );


};



    return card;


};






/* =========================
   START ROWS
========================= */


Watch.initRows = function(){


    this.loadRows();


};

/* ==========================================================================
   SEARCH SYSTEM
   ========================================================================== */


/* =========================
   SEARCH TIMER
========================= */


Watch.searchTimer = null;






/* =========================
   SEARCH TMDB
========================= */


Watch.searchMedia = async function(query){


    if(!query.trim()){


        this.loadRows();


        return;


    }



    const data = await this.api(

        `/search/multi?query=${encodeURIComponent(query)}`

    );



    if(

        !data ||

        !data.results

    )

    return;




    const results =

    data.results

    .filter(item=>{


        return (

            item.media_type === "movie"

            ||

            item.media_type === "tv"

        );


    })

    .map(item=>{


        return this.formatMedia(item);


    });




    this.showSearchResults(

        results

    );


};








/* =========================
   SEARCH DISPLAY
========================= */


Watch.showSearchResults = function(results){



    this.elements.rows.innerHTML = "";



    const section =

    document.createElement(

        "section"

    );



    section.className =

    "watch-row search-results";




    section.innerHTML = `


        <div class="row-title">


            <h2>

            Search Results

            </h2>


        </div>



        <div class="row-scroll">


        </div>


    `;



    const container =

    section.querySelector(

        ".row-scroll"

    );




    results.forEach(movie=>{


        container.appendChild(

            this.createMovieCard(

                movie

            )

        );


    });



    this.elements.rows.appendChild(

        section

    );



};








/* =========================
   SEARCH EVENTS
========================= */


Watch.setupSearch = function(){


    const input =

    this.elements.search;



    if(!input)

    return;




    input.addEventListener(

        "input",

        ()=>{


            clearTimeout(

                this.searchTimer

            );



            const value =

            input.value;



            this.searchTimer =

            setTimeout(()=>{


                this.searchMedia(

                    value

                );


            },500);



        }


    );



    input.addEventListener(

        "keydown",

        event=>{


            if(

                event.key === "Enter"

            ){


                this.searchMedia(

                    input.value

                );


            }


        }

    );


};


Watch.renderHeroDots = function(){

    const container = this.elements.dots;

    if(!container)
    return;


    container.innerHTML = "";


    this.state.heroItems.forEach((movie,index)=>{


        const dot = document.createElement("button");


        dot.className =
        "hero-dot";


        if(
            index === this.state.currentHero
        ){

            dot.classList.add("active");

        }


        dot.onclick = ()=>{


            this.state.currentHero = index;


            this.renderHero();


            this.renderHeroDots();


        };


        container.appendChild(dot);


    });


};




/* =========================
   START SEARCH
========================= */


Watch.initSearch = function(){


    this.setupSearch();


};

/* ==========================================================================
   DETAILS MODAL
   ========================================================================== */


Watch.openDetails = function(movie){


    this.state.selectedMovie = movie;



    this.elements.modal.classList.remove(
        "hidden"
    );



    this.elements.detailsImage.src =

    movie.backdrop;



    this.elements.detailsPoster.src =

    movie.poster;



    this.elements.detailsTitle.textContent =

    movie.title;



    this.elements.detailsDescription.textContent =

    movie.description;



this.elements.detailsMeta.innerHTML = `

<span>
⭐ ${movie.rating}
</span>

<span>
${movie.year}
</span>

<span>
${movie.type==="tv" ? "TV Show":"Movie"}
</span>

${movie.runtime ? `

<span>
${movie.runtime} min
</span>

`:""}

`;

this.loadProviders(movie);

};





Watch.closeDetails = function(){


    this.elements.modal.classList.add(

        "hidden"

    );


};





Watch.setupDetails = function(){


    this.elements.closeModal.onclick = ()=>{


        this.closeDetails();


    };

    this.elements.providerCurrent.onclick = ()=>{

    this.elements.providerDropdown
        .classList.toggle("open");

};

document.addEventListener("click",(e)=>{

    if(
        !e.target.closest(".provider-selector")
    ){

        this.elements.providerDropdown
            .classList.remove("open");

    }

});



    this.elements.modal.onclick = (e)=>{


        if(

            e.target === this.elements.modal

        ){

            this.closeDetails();

        }


    };


};

/* ==========================================================================
   PLAYER SYSTEM
   ========================================================================== */


Watch.openPlayer = function(movie,url){


    if(!movie)

    return;



    this.elements.playerModal.classList.remove(

        "hidden"

    );



    this.elements.playerTitle.textContent =

    movie.title;



    /*
        TEMP PLAYER

        Replace this later with
        your chosen provider system

    */


this.elements.playerFrame.src = url;


};







Watch.closePlayer = function(){


    this.elements.playerModal.classList.add(

        "hidden"

    );


    this.elements.playerFrame.src =

    "about:blank";


};







Watch.setupPlayer = function(){



this.elements.watchButton.onclick = ()=>{

    const movie=this.state.selectedMovie;

    if(!movie) return;

    const id=
        localStorage.getItem("blurProvider")
        || Watch.providers[0].id;

    const provider=
        Watch.providers.find(
            p=>p.id===id
        ) || Watch.providers[0];

    const url =
        movie.type==="tv"
        ? provider.tv(movie.id)
        : provider.movie(movie.id);

    this.openPlayer(movie,url);

};




    this.elements.playerClose.onclick = ()=>{


        this.closePlayer();


    };

    this.elements.fullscreen.onclick = ()=>{

    const player =
    document.querySelector(
        ".player-frame"
    );


    if(
        !document.fullscreenElement
    ){

        player.requestFullscreen();

    }
    else{

        document.exitFullscreen();

    }

};




    this.elements.playerModal.onclick = (e)=>{


        if(

            e.target === this.elements.playerModal

        ){


            this.closePlayer();


        }


    };


};

Watch.loadProviders = function(movie){

    const dropdown = this.elements.providerDropdown;

    dropdown.innerHTML = "";

    const saved =
        localStorage.getItem("blurProvider") ||
        Watch.providers[0].id;

    const current =
        Watch.providers.find(
            p=>p.id===saved
        ) || Watch.providers[0];

    this.elements.providerCurrentName.textContent =
        current.name;

    Watch.providers.forEach(provider=>{

        const item =
        document.createElement("button");

        item.className="provider-item";

        if(provider.id===saved){

            item.classList.add("selected");

        }

        item.innerHTML=`
            <span>${provider.name}</span>
            ${
                provider.id===saved
                ?
                "<span>✓</span>"
                :
                ""
            }
        `;

        item.onclick=()=>{

            localStorage.setItem(
                "blurProvider",
                provider.id
            );

            this.elements.providerCurrentName.textContent =
                provider.name;

            dropdown.classList.remove("open");

            this.loadProviders(movie);

        };

        dropdown.appendChild(item);

    });

};

/* ==========================================================================
   START WATCH
   ========================================================================== */


document.addEventListener(
    "DOMContentLoaded",
    ()=>{


        Watch.init();


        if(
            Watch.initHero
        ){

            Watch.initHero();

        }


        if(
            Watch.initRows
        ){

            Watch.initRows();

        }


        if(
            Watch.initSearch
        ){

            Watch.initSearch();

        }

        if(
            Watch.setupDetails
        ){

            Watch.setupDetails();

        }

        if(
            Watch.setupPlayer
        ){

            Watch.setupPlayer();

        }


    }
);