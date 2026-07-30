const DEFAULT_TITLE = "blur";
const DEFAULT_ICON = "assets/favicon.ico";

const settingsPanel = document.querySelector(
    '[data-panel="settings"]'
);


settingsPanel.innerHTML = `

<div class="settings-window">


    <div class="settings-top">

        <h1>
            Settings
        </h1>

        <p class="settings-subtitle">
            Customize how the app looks and behaves.
        </p>


        <div class="settings-tabs">

            <button class="active" data-tab="appearance">
                Appearance
            </button>

<button data-tab="settings-privacy">
    Privacy
</button>

            <button data-tab="config">
                Config
            </button>

            <button data-tab="suggestions">
                Suggestions
                </button>

            <button data-tab="about">
                About
            </button>

        </div>

    </div>




    <div class="settings-scroll">



        <div class="settings-page active"
        data-page="appearance">


            <div class="settings-group">

                <h3>
                    Theme [BETA]
                </h3>

                <p class="theme-section-caption">
                    Pick a look for the whole app.
                </p>

                <div class="theme-grid" data-theme-grid>
                </div>

                <div class="theme-grid" data-custom-theme-grid
                style="padding-top:0;">
                </div>

            </div>



<div class="settings-group">

    <h3>
        Interface
    </h3>

    <div class="setting-row">

        <div class="row-info">
            <span>Hide Scrollbars</span>
            <small>Hide scrollbars for a cleaner appearance.</small>
        </div>

        <button class="switch" data-scrollbars></button>

    </div>

</div>


            </div>










<div class="settings-page"
data-page="settings-privacy">

            <div class="settings-group">

    <h3>
        Tab Cloaking
    </h3>

    <p class="theme-section-caption">
        Change how Blur appears in your browser tab.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Enable Cloaking</span>
            <small>Changes the tab name and icon.</small>
        </div>

        <button class="switch" data-cloak-toggle></button>

    </div>



    <div class="setting-row">

        <div class="row-info">
            <span>Preset</span>
            <small>Select a disguise.</small>
        </div>


        <select class="cloak-select" data-cloak-select>

            <option value="docs">
                Google Docs
            </option>

            <option value="drive">
                Google Drive
            </option>

            <option value="search">
                Google Search
            </option>

            <option value="classroom">
                Classroom
            </option>

            <option value="clever">
                Clever
            </option>

            <option value="iready">
                I-ready
            </option>

            <option value="blank">
                Blank Tab
            </option>

        </select>



    </div>


</div>

<div class="settings-group">

    <h3>
        Screen Privacy
    </h3>

    <p class="theme-section-caption">
        Hide Blur when you leave the tab.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Enable Screen Privacy</span>
            <small>Shows an overlay when Blur loses focus.</small>
        </div>

        <button class="switch" data-screen-privacy></button>

    </div>


    <div class="setting-row">

        <div class="row-info">
            <span>Overlay Style</span>
            <small>Choose what appears when hidden.</small>
        </div>


        <select class="cloak-select" data-privacy-style>

            <option value="blank">
                White Screen [best]
            </option>

            <option value="black">
                Black Screen
            </option>

            <option value="blur">
                Blurred Screen
            </option>

        </select>

    </div>


</div>

<div class="settings-group">

    <h3>
        Text Obfuscation
    </h3>

    <p class="theme-section-caption">
        Makes text harder to read at a glance.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Enable Text Obfuscation</span>
            <small>Replaces letters with similar characters.</small>
        </div>

        <button class="switch" data-text-obfuscation></button>

    </div>


    <div class="setting-row">

        <div class="row-info">
            <span>Intensity</span>
            <small>Controls how much text changes.</small>
        </div>


        <select class="cloak-select" data-obfuscation-level>

            <option value="low">
                Low
            </option>

            <option value="medium">
                Medium
            </option>

            <option value="high">
                High
            </option>

        </select>

    </div>


</div>

<div class="settings-group">

    <h3>
        Cloak Site
    </h3>

    <p class="theme-section-caption">
        Change the url for the site.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Open as Blob URL</span>
            <small>Launches Blur inside a blob page.</small>
        </div>

        <button class="small-button" data-blob-mode>
    Open
</button>

    </div>

</div>

<div class="settings-group">

    <h3>
        Panic Key
    </h3>

    <p class="theme-section-caption">
        Quickly leave Blur with one key.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Enable Panic Key</span>
            <small>Press your chosen key to redirect.</small>
        </div>

        <button class="switch" data-panic-toggle></button>

    </div>


    <div class="setting-row">

        <div class="row-info">
            <span>Redirect Website</span>
            <small>Where Blur will send you.</small>
        </div>

        <input
            class="panic-input"
            data-panic-url
            placeholder="https://google.com"
            type="url"
        >

    </div>


    <div class="setting-row">

        <div class="row-info">
            <span>Panic Key</span>
            <small>Choose a single keyboard key.</small>
        </div>

        <button
            class="panic-key-button"
            data-panic-key>
            P
        </button>

    </div>


</div>

<div class="settings-group">

    <h3>
        Close Confirmation
    </h3>

    <p class="theme-section-caption">
        Ask before leaving Blur.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Enable Close Confirmation</span>
            <small>Shows a warning when closing the page.</small>
        </div>

        <button class="switch" data-close-confirm></button>

    </div>

    <div class="setting-row">

    <div class="row-info">
        <span>Confirm External Links</span>
        <small>Ask before leaving Blur through a link.</small>
    </div>

    <button class="switch" data-external-confirm></button>

</div>


</div>

        </div>









        <div class="settings-page"
        data-page="config">

<div class="settings-group">

    <h3>
        AI Personality
    </h3>

    <p class="theme-section-caption">
        Customize how Blur AI behaves.
    </p>


    <div class="setting-row vertical">

        <div class="row-info">
            <span>Custom Instructions</span>
            <small>
                Tell Blur AI how you want it to respond.
            </small>
        </div>


        <textarea
            class="ai-personality-input"
            data-ai-personality
            placeholder="Example: Act like a friendly coding mentor who explains things step-by-step."
        ></textarea>

    </div>


</div>

<div class="settings-group">

    <h3>
        Performance
    </h3>


    <div class="setting-row">

        <div class="row-info">
            <span>Performance Mode</span>
            <small>Reduces effects to improve speed.</small>
        </div>

        <button class="switch" data-performance-mode></button>

    </div>


</div>

<div class="settings-group">

    <h3>
        Storage
    </h3>


    <div class="setting-row">

        <div class="row-info">
            <span>Export Settings</span>
            <small>Download your Blur settings as a backup.</small>
        </div>

        <button class="small-button" data-export-settings>
            Export
        </button>

    </div>



    <div class="setting-row">

        <div class="row-info">
            <span>Import Settings</span>
            <small>Restore settings from a backup file.</small>
        </div>

        <button class="small-button" data-import-settings>
            Import
        </button>

    </div>



    <div class="setting-row">

        <div class="row-info">
            <span>Reset Local Data</span>
            <small>Deletes ALL saved data.</small>
        </div>

<button class="small-button danger" data-reset-data>
    Reset Local Data
</button>

    </div>


</div>


        </div>

        <div class="settings-page" data-page="suggestions">

    <div class="settings-group">

        <h3>
            Send a Suggestion
        </h3>

        <p class="theme-section-caption">
            Got an idea, bug report, or feature request? Send it straight to the devs.
        </p>

        <div class="setting-row vertical">
            <div class="row-info">
                <span>Your Suggestion</span>
                <small>Be as detailed as you'd like.</small>
            </div>

            <textarea
                class="ai-personality-input"
                data-suggestion-text
                placeholder="Example: It would be cool if..."
            ></textarea>
        </div>

        <div class="setting-row vertical">
            <div class="row-info">
                <span>Contact (optional)</span>
                <small>Leave an email/Discord if you want a reply.</small>
            </div>

            <input
                class="panic-input"
                data-suggestion-contact
                placeholder="you@example.com"
                type="text"
            >
        </div>

        <div class="setting-row">
            <div class="row-info">
                <span id="suggestion-status"></span>
            </div>
            <button class="small-button" data-send-suggestion>
                Send
            </button>
        </div>

    </div>

</div>


<div class="settings-page" data-page="about">

    <div class="settings-group">

        <h3>Application</h3>

        <div class="setting-row">
            <div class="row-info">
                <span>Developer</span>
            </div>
            <span class="badge">Blur Studios</span>
        </div>

        <div class="setting-row">
            <div class="row-info">
                <span>Release</span>
            </div>
            <span class="badge">August 2026</span>
        </div>

        <div class="setting-row">
            <div class="row-info">
                <span>Build</span>
            </div>
            <span class="badge">Beta #1</span>
        </div>

    </div>


    <div class="settings-group">

        <h3>Credits</h3>

        <div class="credit-mini">

            <img src="assets/images/sprite.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Blur Studios</strong>
                <span>Creator & Lead Developer</span>
            </div>

            <div class="credit-mini-role">
                UI • Apps • Backend
            </div>

        </div>

             <div class="credit-mini">

            <img src="assets/images/blessedb1r.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>BlessedB1r</strong>
                <span>Co-owner</span>
            </div>

            <div class="credit-mini-role">
                Some ideas and hosting help
            </div>

        </div>

            <div class="credit-mini">

            <img src="assets/images/darqmarq.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>DarqMarq</strong>
                <span>Content Creator</span>
            </div>

            <div class="credit-mini-role">
                @darqmarq on YT & TT
            </div>

        </div>

    </div>

<div class="about-footer">
    © 2026 Blur Studios 
    <span class="dev-link" id="dev-link">- Dev</span>
</div>

</div>

`;





// tab switching

document.querySelectorAll(".settings-tabs button")
.forEach(button=>{


    button.onclick=()=>{


        document.querySelectorAll(
            ".settings-tabs button"
        )
        .forEach(btn=>btn.classList.remove("active"));



        button.classList.add("active");



        let target =
        button.dataset.tab;



        document.querySelectorAll(
            ".settings-page"
        )
        .forEach(page=>{


            page.classList.toggle(
                "active",
                page.dataset.page===target
            );


        });


    };


});

const HIDE_SCROLLBARS_KEY = "blur-hide-scrollbars";

function updateScrollbarSetting(enabled){

    document.documentElement.classList.toggle(
        "hide-scrollbars",
        enabled
    );

    localStorage.setItem(
        HIDE_SCROLLBARS_KEY,
        enabled
    );

}

const savedScrollbarState =
    localStorage.getItem(HIDE_SCROLLBARS_KEY) === "true";

updateScrollbarSetting(savedScrollbarState);

const scrollbarToggle = document.querySelector("[data-scrollbars]");

if(scrollbarToggle){

    scrollbarToggle.classList.toggle("on", savedScrollbarState);

}

// switches

document.querySelectorAll(".switch")
.forEach(toggle=>{


    toggle.onclick=()=>{


        toggle.classList.toggle("on");


        if(toggle.hasAttribute("data-scrollbars")){

            updateScrollbarSetting(
                toggle.classList.contains("on")
            );

        }


        if(toggle.dataset.motion){

            document.body.classList.toggle(
                "force-reduce-motion",
                toggle.classList.contains("on")
            );

        }


    };


});

// ============ THEMES ============

const PRESET_THEMES = [
    {
        id:"carbon",
        name:"Carbon",
        desc:"Dark & minimal",
        dots:["#0a0a0a","#3a3a3a","#ffffff"]
    },

    {
        id:"ember",
        name:"Ember",
        desc:"Warm amber glow",
        dots:["#170f09","#4a3016","#e8a35c"]
    },

    {
        id:"verdant",
        name:"Verdant",
        desc:"Dark forest green",
        dots:["#070c08","#1c3320","#4fbf6b"]
    },

{
    id:"mint",
    name:"Mint",
    desc:"Fresh glass green",
    dots:["#06110e","#194035","#5ee6b3"]
},

    {
        id:"vapor",
        name:"Vapor",
        desc:"Purple neon haze",
        dots:["#0d0814","#2b1645","#a855f7"]
    },

    {
        id:"ocean",
        name:"Ocean",
        desc:"Deep blue glass",
        dots:["#050b12","#102b45","#38bdf8"]
    },

    {
        id:"rose",
        name:"Rose",
        desc:"Dark pink accent",
        dots:["#12070c","#3b1624","#fb7185"]
    },

    {
        id:"slate",
        name:"Slate",
        desc:"Clean steel gray",
        dots:["#090909","#252525","#a3a3a3"]
    },
];

const THEME_KEY = "blur-theme";
const CUSTOM_THEMES_KEY = "blur-custom-themes";

function getActiveThemeId(){
    return localStorage.getItem(THEME_KEY) || "carbon";
}

function getCustomThemes(){
    try{
        return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY)) || [];
    }catch(e){
        return [];
    }
}

function saveCustomThemes(list){
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list));
}

function clearCustomVars(){
    [
        "--bg","--sidebar","--surface","--surface-2","--surface-3",
        "--accent","--accent-glow"
    ].forEach(v => document.documentElement.style.removeProperty(v));
}

function applyCustomAccent(accent){
    const html = document.documentElement;
    html.style.setProperty("--bg", `color-mix(in srgb, ${accent} 4%, #060606)`);
    html.style.setProperty("--sidebar", `color-mix(in srgb, ${accent} 5%, #0a0a0a)`);
    html.style.setProperty("--surface", `color-mix(in srgb, ${accent} 7%, #101010)`);
    html.style.setProperty("--surface-2", `color-mix(in srgb, ${accent} 9%, #161616)`);
    html.style.setProperty("--surface-3", `color-mix(in srgb, ${accent} 11%, #1d1d1d)`);
    html.style.setProperty("--accent", accent);
    html.style.setProperty("--accent-glow", `color-mix(in srgb, ${accent} 22%, transparent)`);
}

function applyTheme(id, opts={}){

    localStorage.setItem(THEME_KEY, id);

    if(id.startsWith("custom-") && opts.accent){
        document.documentElement.setAttribute("data-theme", id);
        applyCustomAccent(opts.accent);
    }else{
        clearCustomVars();
        document.documentElement.setAttribute("data-theme", id);
    }

    renderThemeGrids();

}

function makeThemeCard(theme, isCustom){

    const card = document.createElement("button");
    card.className = "theme-card";
    card.dataset.themeId = theme.id;

    if(theme.id === getActiveThemeId()){
        card.classList.add("active");
    }

    const dots = document.createElement("div");
    dots.className = "theme-dots";
    theme.dots.forEach(color=>{
        const dot = document.createElement("span");
        dot.style.background = color;
        dots.appendChild(dot);
    });

    const name = document.createElement("strong");
    name.textContent = theme.name;

    const desc = document.createElement("small");
    desc.textContent = theme.desc;

    card.appendChild(dots);
    card.appendChild(name);
    card.appendChild(desc);

    if(isCustom){
        const remove = document.createElement("span");
        remove.className = "remove-theme";
        remove.textContent = "\u00d7";
        remove.onclick = (e)=>{
            e.stopPropagation();
            const list = getCustomThemes().filter(t=>t.id!==theme.id);
            saveCustomThemes(list);
            if(getActiveThemeId() === theme.id){
                applyTheme("carbon");
            }else{
                renderThemeGrids();
            }
        };
        card.appendChild(remove);
    }

    card.onclick = ()=>{
        applyTheme(theme.id, { accent: theme.accent });
    };

    return card;

}

function renderThemeGrids(){

    const presetGrid = document.querySelector("[data-theme-grid]");
    const customGrid = document.querySelector("[data-custom-theme-grid]");

    if(!presetGrid || !customGrid) return;

    presetGrid.innerHTML = "";
    customGrid.innerHTML = "";

    PRESET_THEMES.forEach(theme=>{
        presetGrid.appendChild(makeThemeCard(theme, false));
    });

    getCustomThemes().forEach(theme=>{
        customGrid.appendChild(makeThemeCard(theme, true));
    });

    // customGrid.appendChild(makeCreateCard());

}

function initTheme(){

    const activeId = getActiveThemeId();
    const custom = getCustomThemes().find(t=>t.id===activeId);

    document.documentElement.setAttribute("data-theme", activeId);

    if(custom){
        applyCustomAccent(custom.accent);
    }

    renderThemeGrids();

}

initTheme();

// =============================
// TAB CLOAKING
// =============================


const CLOAK_ENABLED = "blur-cloak-enabled";
const CLOAK_TYPE = "blur-cloak-type";


const cloakData = {

    docs:{
        title:"Google Docs",
        icon:"https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico"
    },


    drive:{
        title:"Google Drive",
        icon:"https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png"
    },


    search:{
        title:"Google Search",
        icon:"https://www.google.com/favicon.ico"
    },


    classroom:{
        title:"Classroom",
        icon:"https://ssl.gstatic.com/classroom/favicon.png"
    },

    clever:{
        title:"Clever",
        icon:"https://www.clever.com/wp-content/uploads/2023/06/cropped-Favicon-512px-32x32.png"
    },

    iready:{
        title:"I-Ready",
        icon:"https://login.i-ready.com/favicon.ico"
    },

blank:{
    title:"New Tab",
    icon:"assets/favicon.ico"
}

};



function applyCloak(){

    const enabled =
    localStorage.getItem(CLOAK_ENABLED)==="true";


    const type =
    localStorage.getItem(CLOAK_TYPE) || "docs";


if(!enabled){

    document.title = DEFAULT_TITLE;


    let favicon =
    document.querySelector(
        "link[rel='icon']"
    );


    if(favicon){

        favicon.href = DEFAULT_ICON;

    }


    return;

}


    const cloak =
    cloakData[type];


    if(!cloak) return;



    document.title =
    cloak.title;



    if(cloak.icon){

        let favicon =
        document.querySelector(
            "link[rel='icon']"
        );


        if(!favicon){

            favicon =
            document.createElement("link");

            favicon.rel="icon";

            document.head.appendChild(favicon);

        }


        favicon.href =
        cloak.icon;

    }

}





const cloakToggle =
document.querySelector(
"[data-cloak-toggle]"
);



const cloakSelect =
document.querySelector(
"[data-cloak-select]"
);



if(cloakToggle){


    const saved =
    localStorage.getItem(
        CLOAK_ENABLED
    )==="true";


    cloakToggle.classList.toggle(
        "on",
        saved
    );



    cloakToggle.onclick=()=>{


        const state =
        !cloakToggle.classList.contains("on");


        cloakToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            CLOAK_ENABLED,
            state
        );


        applyCloak();

    };

}



if(cloakSelect){


    cloakSelect.value =
    localStorage.getItem(
        CLOAK_TYPE
    ) || "docs";


cloakSelect.onchange=()=>{

    localStorage.setItem(
        CLOAK_TYPE,
        cloakSelect.value
    );


    if(
        localStorage.getItem(CLOAK_ENABLED)==="true"
    ){

        applyCloak();

    }

};


}

applyCloak();

// =============================
// PANIC KEY
// =============================


const PANIC_ENABLED = "blur-panic-enabled";
const PANIC_URL = "blur-panic-url";
const PANIC_KEY = "blur-panic-key";


const panicToggle =
document.querySelector("[data-panic-toggle]");

const panicURL =
document.querySelector("[data-panic-url]");

const panicKey =
document.querySelector("[data-panic-key]");



// load settings

if(panicToggle){


    const enabled =
    localStorage.getItem(PANIC_ENABLED)==="true";


    panicToggle.classList.toggle(
        "on",
        enabled
    );


    panicURL.value =
    localStorage.getItem(PANIC_URL) || "";


    panicKey.textContent =
    localStorage.getItem(PANIC_KEY) || "P";



    panicToggle.onclick=()=>{

        const state =
        !panicToggle.classList.contains("on");


        panicToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            PANIC_ENABLED,
            state
        );

    };


}



// save URL

if(panicURL){

    panicURL.onchange=()=>{

        localStorage.setItem(
            PANIC_URL,
            panicURL.value.trim()
        );

    };

}



// choose key

if(panicKey){

    panicKey.onclick=()=>{

        panicKey.textContent =
        "waiting...";


        const handler=(e)=>{

            e.preventDefault();


            let key =
            e.key.toUpperCase();


            // ignore modifiers
            if(
                key==="SHIFT" ||
                key==="CONTROL" ||
                key==="ALT" ||
                key==="META"
            )
                return;



            panicKey.textContent =
            key;


            localStorage.setItem(
                PANIC_KEY,
                key
            );


            window.removeEventListener(
                "keydown",
                handler
            );


        };


        window.addEventListener(
            "keydown",
            handler
        );

    };

}



// global panic listener

document.addEventListener(
"keydown",
(e)=>{


    if(
        localStorage.getItem(PANIC_ENABLED)!=="true"
    )
        return;



    const saved =
    localStorage.getItem(PANIC_KEY)
    || "P";



    if(
        e.key.toUpperCase() === saved
    ){


        let url =
        localStorage.getItem(PANIC_URL);



        if(!url)
            return;



        if(
            !url.startsWith("http://") &&
            !url.startsWith("https://")
        ){

            url =
            "https://" + url;

        }



        window.location.replace(url);


    }


});

// =============================
// SCREEN PRIVACY
// =============================


const SCREEN_PRIVACY =
"blur-screen-privacy";


const SCREEN_STYLE =
"blur-screen-style";


const privacyToggle =
document.querySelector("[data-screen-privacy]");


const privacySelect =
document.querySelector("[data-privacy-style]");



const privacyOverlay =
document.createElement("div");


privacyOverlay.id =
"screen-privacy-overlay";

privacyOverlay.innerHTML = "";


document.body.appendChild(
    privacyOverlay
);



function showPrivacyScreen(){

    if(
        localStorage.getItem(SCREEN_PRIVACY)!=="true"
    )
        return;


    const style =
    localStorage.getItem(SCREEN_STYLE)
    || "black";


    privacyOverlay.className =
    style;


    privacyOverlay.classList.add(
        "active"
    );

}



function hidePrivacyScreen(){

    privacyOverlay.classList.remove(
        "active"
    );

}



// toggle

if(privacyToggle){

    const saved =
    localStorage.getItem(
        SCREEN_PRIVACY
    )==="true";


    privacyToggle.classList.toggle(
        "on",
        saved
    );


    privacyToggle.onclick=()=>{


        const state =
        !privacyToggle.classList.contains("on");


        privacyToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            SCREEN_PRIVACY,
            state
        );


    };

}



// selector

if(privacySelect){

    privacySelect.value =
    localStorage.getItem(
        SCREEN_STYLE
    ) || "black";


    privacySelect.onchange=()=>{

        localStorage.setItem(
            SCREEN_STYLE,
            privacySelect.value
        );

    };

}




document.addEventListener(
"visibilitychange",
()=>{

    if(document.hidden){

        showPrivacyScreen();

    }else{

        hidePrivacyScreen();

    }

});


window.addEventListener(
"blur",
showPrivacyScreen
);


window.addEventListener(
"focus",
hidePrivacyScreen
);

// =============================
// TEXT OBFUSCATION
// =============================


const OBFUSCATION_ENABLED =
"blur-text-obfuscation";


const OBFUSCATION_LEVEL =
"blur-text-obfuscation-level";



const obfuscationToggle =
document.querySelector("[data-text-obfuscation]");


const obfuscationSelect =
document.querySelector("[data-obfuscation-level]");



const obfuscationMaps = {

    low:{
        a:"α",
        e:"е",
        o:"о",
        i:"і"
    },


    medium:{
        a:"α",
        e:"е",
        o:"о",
        i:"і",
        s:"ѕ",
        t:"т",
        n:"п",
        c:"с"
    },


    high:{
        a:"α",
        b:"Ь",
        c:"с",
        d:"ԁ",
        e:"е",
        g:"ɡ",
        h:"һ",
        i:"і",
        k:"κ",
        l:"ⅼ",
        m:"ｍ",
        n:"п",
        o:"о",
        p:"р",
        s:"ѕ",
        t:"т",
        x:"х"
    }

};



function obfuscateText(text){


    const level =
    localStorage.getItem(
        OBFUSCATION_LEVEL
    ) || "low";


    const map =
    obfuscationMaps[level];


    return text.split("")
    .map(char=>{


        const lower =
        char.toLowerCase();


        if(
            map[lower] &&
            Math.random() > 0.45
        ){

            return map[lower];

        }


        return char;


    })
    .join("");

}




let originalTexts = [];



function applyObfuscation(){


    const enabled =
    localStorage.getItem(
        OBFUSCATION_ENABLED
    )==="true";


    document.querySelectorAll(
        "body *"
    )
    .forEach(el=>{


        if(
            el.children.length===0 &&
            el.textContent.trim()
        ){


            if(!el.dataset.originalText){

                el.dataset.originalText =
                el.textContent;

            }


            el.textContent =
            enabled
            ? obfuscateText(el.dataset.originalText)
            : el.dataset.originalText;


        }


    });


}



if(obfuscationToggle){


    const enabled =
    localStorage.getItem(
        OBFUSCATION_ENABLED
    )==="true";


    obfuscationToggle.classList.toggle(
        "on",
        enabled
    );


    obfuscationToggle.onclick=()=>{


        const state =
        !obfuscationToggle.classList.contains("on");


        obfuscationToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            OBFUSCATION_ENABLED,
            state
        );


        applyObfuscation();

    };


}



if(obfuscationSelect){


    obfuscationSelect.value =
    localStorage.getItem(
        OBFUSCATION_LEVEL
    ) || "low";


    obfuscationSelect.onchange=()=>{


        localStorage.setItem(
            OBFUSCATION_LEVEL,
            obfuscationSelect.value
        );


        applyObfuscation();


    };

}



applyObfuscation();

// =============================
// AI PERSONALITY
// =============================

const AI_PERSONALITY_KEY =
"blur-ai-personality";


const personalityInput =
document.querySelector("[data-ai-personality]");


if(personalityInput){

    personalityInput.value =
    localStorage.getItem(AI_PERSONALITY_KEY)
    || "";


    personalityInput.addEventListener(
        "input",
        ()=>{

            localStorage.setItem(
                AI_PERSONALITY_KEY,
                personalityInput.value
            );

        }
    );

}

// =============================
// CONFIG STORAGE
// =============================


const PERFORMANCE_KEY =
"blur-performance-mode";



const performanceToggle =
document.querySelector("[data-performance-mode]");



if(performanceToggle){

    const enabled =
    localStorage.getItem(
        PERFORMANCE_KEY
    )==="true";


    performanceToggle.classList.toggle(
        "on",
        enabled
    );


    document.documentElement.classList.toggle(
        "performance-mode",
        enabled
    );



    performanceToggle.onclick=()=>{


        const state =
        !performanceToggle.classList.contains("on");


        performanceToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            PERFORMANCE_KEY,
            state
        );


        document.documentElement.classList.toggle(
            "performance-mode",
            state
        );


    };

}



// =============================
// EXPORT SETTINGS
// =============================


const exportButton =
document.querySelector("[data-export-settings]");



if(exportButton){

    exportButton.onclick=()=>{


        const data = {};


        Object.keys(localStorage)
        .forEach(key=>{

            data[key] =
            localStorage.getItem(key);

        });



        const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:"application/json"
            }
        );


        const url =
        URL.createObjectURL(blob);



        const a =
        document.createElement("a");


        a.href=url;

        a.download =
        "blur-settings.json";


        a.click();



        URL.revokeObjectURL(url);


    };

}



// =============================
// IMPORT SETTINGS
// =============================


const importButton =
document.querySelector("[data-import-settings]");



if(importButton){


    const input =
    document.createElement("input");


    input.type="file";
    input.accept=".json";


    input.onchange=e=>{


        const file =
        e.target.files[0];


        if(!file)
            return;



        const reader =
        new FileReader();



        reader.onload=()=>{


            try{


                const data =
                JSON.parse(
                    reader.result
                );


                Object.entries(data)
                .forEach(([key,value])=>{

                    localStorage.setItem(
                        key,
                        value
                    );

                });



                location.reload();


            }catch{


                alert(
                    "Invalid Blur settings file."
                );

            }


        };


        reader.readAsText(file);


    };


    importButton.onclick=()=>{

        input.click();

    };


}

// =============================
// RESET LOCAL DATA MODAL
// =============================


const resetButton =
document.querySelector("[data-reset-data]");



const resetModal =
document.createElement("div");


resetModal.className =
"reset-modal";


resetModal.innerHTML = `

<div class="reset-card">

    <h2>
        Reset Blur?
    </h2>


    <p>
        This will delete your settings,
        themes, and saved preferences.
    </p>


    <div class="reset-actions">

        <button class="small-button" data-cancel-reset>
            Cancel
        </button>


        <button class="small-button danger" data-confirm-reset>
            Reset
        </button>

    </div>

</div>

`;


document.body.appendChild(resetModal);



const cancelReset =
resetModal.querySelector(
"[data-cancel-reset]"
);


const confirmReset =
resetModal.querySelector(
"[data-confirm-reset]"
);



if(resetButton){

    resetButton.onclick=()=>{

        resetModal.classList.add(
            "active"
        );

    };

}



cancelReset.onclick=()=>{

    resetModal.classList.remove(
        "active"
    );

};



confirmReset.onclick=()=>{


    localStorage.clear();


    location.reload();


};

// =============================
// BLOB MODE
// =============================

const blobButton =
document.querySelector("[data-blob-mode]");


if(blobButton){

    blobButton.onclick=()=>{

        openBlobMode();

    };

}



function openBlobMode(){

    const currentURL =
    window.location.href;


    const blobHTML = `

<!DOCTYPE html>
<html>

<head>

<title>blur</title>

<style>

html, body {
    margin:0;
    padding:0;
    width:100%;
    height:100%;
    overflow:hidden;
    background:#000;
}


iframe {

    width:100%;
    height:100%;
    border:none;

}

</style>

</head>


<body>

<iframe src="${currentURL}"></iframe>

</body>

</html>

`;


    const blob =
    new Blob(
        [blobHTML],
        {
            type:"text/html"
        }
    );


    const blobURL =
    URL.createObjectURL(blob);


    window.location.href =
    blobURL;

}

// =============================
// SUGGESTIONS
// =============================

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mojgbkna"; // <-- replace with your Formspree endpoint

const suggestionText = document.querySelector("[data-suggestion-text]");
const suggestionContact = document.querySelector("[data-suggestion-contact]");
const suggestionBtn = document.querySelector("[data-send-suggestion]");
const suggestionStatus = document.getElementById("suggestion-status");

if (suggestionBtn) {

    suggestionBtn.onclick = async () => {

        const message = suggestionText.value.trim();
        const contact = suggestionContact.value.trim();

        if (!message) {
            suggestionStatus.textContent = "Write something first.";
            suggestionStatus.style.color = "#f87171";
            return;
        }

        suggestionBtn.disabled = true;
        suggestionBtn.textContent = "Sending...";
        suggestionStatus.textContent = "";

        try {

            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message,
                    contact: contact || "(none provided)"
                })
            });

            if (res.ok) {
                suggestionStatus.textContent = "Sent, thanks!";
                suggestionStatus.style.color = "#4ade80";
                suggestionText.value = "";
                suggestionContact.value = "";
            } else {
                throw new Error("Bad response");
            }

        } catch (err) {
            suggestionStatus.textContent = "Failed to send. Try again later.";
            suggestionStatus.style.color = "#f87171";
        }

        suggestionBtn.disabled = false;
        suggestionBtn.textContent = "Send";

    };

}

// =============================
// EXTERNAL LINK CONFIRMATION
// =============================


const EXTERNAL_CONFIRM =
"blur-external-confirm";


const externalToggle =
document.querySelector("[data-external-confirm]");



if(externalToggle){


    const enabled =
    localStorage.getItem(EXTERNAL_CONFIRM)==="true";


    externalToggle.classList.toggle(
        "on",
        enabled
    );



    externalToggle.onclick=()=>{


        const state =
        !externalToggle.classList.contains("on");


        externalToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            EXTERNAL_CONFIRM,
            state
        );


    };


}



// intercept links

document.addEventListener(
"click",
(e)=>{


    const link =
    e.target.closest("a");


    if(!link)
        return;



    const url =
    link.href;



    if(!url)
        return;



    const current =
    window.location.hostname;



    const target =
    new URL(url).hostname;



    const leavingBlur =
    target !== current;



    if(
        leavingBlur &&
        localStorage.getItem(EXTERNAL_CONFIRM)==="true"
    ){


        const confirmed =
        confirm(
            "Are you sure you want to leave Blur?"
        );


        if(!confirmed){

            e.preventDefault();

        }


    }


});

// =============================
// CLOSE CONFIRMATION
// =============================


const CLOSE_CONFIRM =
"blur-close-confirm";


const closeToggle =
document.querySelector("[data-close-confirm]");



if(closeToggle){


    const enabled =
    localStorage.getItem(CLOSE_CONFIRM)==="true";


    closeToggle.classList.toggle(
        "on",
        enabled
    );



    closeToggle.onclick=()=>{


        const state =
        !closeToggle.classList.contains("on");


        closeToggle.classList.toggle(
            "on",
            state
        );


        localStorage.setItem(
            CLOSE_CONFIRM,
            state
        );


    };


}



// browser close warning

window.addEventListener(
"beforeunload",
(e)=>{


    if(
        localStorage.getItem(CLOSE_CONFIRM)!=="true"
    )
        return;



    e.preventDefault();


    e.returnValue = "";


});