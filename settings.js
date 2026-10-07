const DEFAULT_TITLE = "blur";
const DEFAULT_ICON = "assets/images/logo.png";

const settingsPanel = document.querySelector(
    '[data-panel="settings"]'
);

// One catalog powers both the Interface picker and the community theme
// creator, so every listed font has a real CSS stack and stays searchable.
let FONT_CATALOG = [
    { id: "system", label: "System UI (default)", body: "'Inter', sans-serif", display: "'Fraunces', serif" },
    { id: "inter", label: "Inter", body: "'Inter', sans-serif", display: "'Inter', sans-serif" },
    { id: "times-new-roman", label: "Times New Roman", body: "'Times New Roman', Times, serif", display: "'Times New Roman', Times, serif" },
    { id: "georgia", label: "Georgia", body: "Georgia, serif", display: "Georgia, serif" },
    { id: "dm-sans", label: "DM Sans", body: "'DM Sans', sans-serif", display: "'DM Sans', sans-serif" },
    { id: "space-grotesk", label: "Space Grotesk", body: "'Space Grotesk', sans-serif", display: "'Space Grotesk', sans-serif" },
    { id: "atkinson", label: "Atkinson Hyperlegible", body: "'Atkinson Hyperlegible', sans-serif", display: "'Atkinson Hyperlegible', sans-serif" },
    { id: "manrope", label: "Manrope", body: "'Manrope', sans-serif", display: "'Manrope', sans-serif" },
    { id: "roboto", label: "Roboto", body: "'Roboto', sans-serif", display: "'Roboto', sans-serif" },
    { id: "open-sans", label: "Open Sans", body: "'Open Sans', sans-serif", display: "'Open Sans', sans-serif" },
    { id: "lato", label: "Lato", body: "'Lato', sans-serif", display: "'Lato', sans-serif" },
    { id: "montserrat", label: "Montserrat", body: "'Montserrat', sans-serif", display: "'Montserrat', sans-serif" },
    { id: "poppins", label: "Poppins", body: "'Poppins', sans-serif", display: "'Poppins', sans-serif" },
    { id: "nunito", label: "Nunito", body: "'Nunito', sans-serif", display: "'Nunito', sans-serif" },
    { id: "raleway", label: "Raleway", body: "'Raleway', sans-serif", display: "'Raleway', sans-serif" },
    { id: "outfit", label: "Outfit", body: "'Outfit', sans-serif", display: "'Outfit', sans-serif" },
    { id: "plus-jakarta", label: "Plus Jakarta Sans", body: "'Plus Jakarta Sans', sans-serif", display: "'Plus Jakarta Sans', sans-serif" },
    { id: "ibm-plex-sans", label: "IBM Plex Sans", body: "'IBM Plex Sans', sans-serif", display: "'IBM Plex Sans', sans-serif" },
    { id: "source-sans", label: "Source Sans 3", body: "'Source Sans 3', sans-serif", display: "'Source Sans 3', sans-serif" },
    { id: "fira-sans", label: "Fira Sans", body: "'Fira Sans', sans-serif", display: "'Fira Sans', sans-serif" },
    { id: "rubik", label: "Rubik", body: "'Rubik', sans-serif", display: "'Rubik', sans-serif" },
    { id: "work-sans", label: "Work Sans", body: "'Work Sans', sans-serif", display: "'Work Sans', sans-serif" },
    { id: "public-sans", label: "Public Sans", body: "'Public Sans', sans-serif", display: "'Public Sans', sans-serif" },
    { id: "ubuntu", label: "Ubuntu", body: "'Ubuntu', sans-serif", display: "'Ubuntu', sans-serif" },
    { id: "lexend", label: "Lexend", body: "'Lexend', sans-serif", display: "'Lexend', sans-serif" },
    { id: "quicksand", label: "Quicksand", body: "'Quicksand', sans-serif", display: "'Quicksand', sans-serif" },
    { id: "cabin", label: "Cabin", body: "'Cabin', sans-serif", display: "'Cabin', sans-serif" },
    { id: "barlow", label: "Barlow", body: "'Barlow', sans-serif", display: "'Barlow', sans-serif" },
    { id: "archivo", label: "Archivo", body: "'Archivo', sans-serif", display: "'Archivo', sans-serif" },
    { id: "karla", label: "Karla", body: "'Karla', sans-serif", display: "'Karla', sans-serif" },
    { id: "noto-sans", label: "Noto Sans", body: "'Noto Sans', sans-serif", display: "'Noto Sans', sans-serif" },
    { id: "bitter", label: "Bitter", body: "'Bitter', serif", display: "'Bitter', serif" },
    { id: "merriweather", label: "Merriweather", body: "'Merriweather', serif", display: "'Merriweather', serif" },
    { id: "playfair-display", label: "Playfair Display", body: "'Playfair Display', serif", display: "'Playfair Display', serif" },
    { id: "ibm-plex-mono", label: "IBM Plex Mono", body: "'IBM Plex Mono', monospace", display: "'IBM Plex Mono', monospace" },
    { id: "fira-code", label: "Fira Code", body: "'Fira Code', monospace", display: "'Fira Code', monospace" },
    { id: "bebas-neue", label: "Bebas Neue", body: "'Bebas Neue', sans-serif", display: "'Bebas Neue', sans-serif" },
    { id: "orbitron", label: "Orbitron", body: "'Orbitron', sans-serif", display: "'Orbitron', sans-serif" },
    { id: "sora", label: "Sora", body: "'Sora', sans-serif", display: "'Sora', sans-serif" },
    { id: "space-mono", label: "Space Mono", body: "'Space Mono', monospace", display: "'Space Mono', monospace" },
    { id: "jetbrains-mono", label: "JetBrains Mono", body: "'JetBrains Mono', monospace", display: "'JetBrains Mono', monospace" },
    { id: "exo-2", label: "Exo 2", body: "'Exo 2', sans-serif", display: "'Exo 2', sans-serif" },
    { id: "kanit", label: "Kanit", body: "'Kanit', sans-serif", display: "'Kanit', sans-serif" },
    { id: "josefin-sans", label: "Josefin Sans", body: "'Josefin Sans', sans-serif", display: "'Josefin Sans', sans-serif" },
    { id: "cinzel", label: "Cinzel", body: "'Cinzel', serif", display: "'Cinzel', serif" },
    { id: "cormorant", label: "Cormorant Garamond", body: "'Cormorant Garamond', serif", display: "'Cormorant Garamond', serif" },
    { id: "dm-serif-display", label: "DM Serif Display", body: "'DM Serif Display', serif", display: "'DM Serif Display', serif" },
    { id: "libre-baskerville", label: "Libre Baskerville", body: "'Libre Baskerville', serif", display: "'Libre Baskerville', serif" },
    { id: "unbounded", label: "Unbounded", body: "'Unbounded', sans-serif", display: "'Unbounded', sans-serif" },
    { id: "chakra-petch", label: "Chakra Petch", body: "'Chakra Petch', sans-serif", display: "'Chakra Petch', sans-serif" }
];

function fontSelectOptionsMarkup(){
    return FONT_CATALOG.map(font => `<option value="${settingsEscape(font.id)}">${settingsEscape(font.label)}</option>`).join("");
}


settingsPanel.innerHTML = `

<div class="settings-window">


    <div class="settings-top">

        <span class="settings-eyebrow">
            Settings
        </span>

        <h1>
            Settings
        </h1>

        <p class="settings-subtitle">
            Shape Blur around the way you use it.
        </p>


        <div class="settings-tabs" hidden>

            <button class="active" data-tab="appearance">
                <span class="settings-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg></span>
                <span>Appearance</span>
            </button>

            <button data-tab="config">
                <span class="settings-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="11" cy="18" r="2"></circle></svg></span>
                <span>Config</span>
            </button>

            <button data-tab="profile">
                <span class="settings-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"></path></svg></span>
                <span>Profile</span>
            </button>

            <button data-tab="settings-privacy">
                <span class="settings-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg></span>
                <span>Privacy</span>
            </button>

            <button data-tab="about">
                <span class="settings-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path></svg></span>
                <span>About</span>
            </button>

        </div>

    </div>




    <div class="settings-scroll">

        <section class="settings-overview" data-settings-overview aria-labelledby="settings-overview-title">
            <div class="settings-overview-heading">
                <span class="settings-content-kicker">Blur preferences</span>
                <h2 id="settings-overview-title">Settings</h2>
            </div>
            <div class="settings-overview-list">
                <button type="button" class="settings-overview-row" data-settings-overview-target="appearance">
                    <span class="settings-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg></span>
                    <span class="settings-overview-copy"><strong>Appearance</strong><small>Theme, font, and visual preferences</small></span>
                    <span class="settings-overview-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" class="settings-overview-row" data-settings-overview-target="profile">
                    <span class="settings-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"></path></svg></span>
                    <span class="settings-overview-copy"><strong>Profile</strong><small>Display name, avatar, bio, and profile effects</small></span>
                    <span class="settings-overview-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" class="settings-overview-row" data-settings-overview-target="config">
                    <span class="settings-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="11" cy="18" r="2"></circle></svg></span>
                    <span class="settings-overview-copy"><strong>Config</strong><small>Behavior, data, and device preferences</small></span>
                    <span class="settings-overview-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" class="settings-overview-row" data-settings-overview-target="settings-privacy">
                    <span class="settings-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg></span>
                    <span class="settings-overview-copy"><strong>Privacy</strong><small>Privacy, cloaking, and data controls</small></span>
                    <span class="settings-overview-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" class="settings-overview-row" data-settings-overview-target="about">
                    <span class="settings-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path></svg></span>
                    <span class="settings-overview-copy"><strong>About</strong><small>Blur, credits, and service information</small></span>
                    <span class="settings-overview-chevron" aria-hidden="true">›</span>
                </button>
            </div>
            <nav class="settings-overview-legal" aria-label="Legal information">
                <a data-tab="legal">Terms of Service</a>
                <a data-tab="dmca">DMCA</a>
                <a data-tab="privacy">Privacy Policy</a>
            </nav>
        </section>

        <header class="settings-content-heading">
            <span class="settings-content-kicker">Blur preferences</span>
            <h2 id="settings-page-title">Appearance</h2>
            <p id="settings-page-subtitle">
                Tune the look and feel of Blur. Changes apply instantly and are saved on this device.
            </p>
            <button type="button" class="settings-back-button" data-settings-back aria-label="Back to Settings">← All settings</button>
        </header>



        <div class="settings-page active"
        data-page="appearance">


            <div class="settings-group">

                <h3>
                    Blur themes
                </h3>

                <div class="theme-grid" data-theme-grid>
                </div>

            </div>

            <div class="settings-group" data-community-theme-section>

                <h3>
                    Community themes
                </h3>

                <div class="theme-grid community-theme-grid" data-community-theme-grid>
                </div>

            </div>

            <div class="settings-group" data-exclusive-theme-section hidden>

                <h3>
                    Exclusive themes
                </h3>

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

    <div class="setting-row">
        <div class="row-info">
            <span>Resizable Sidebar</span>
            <small>Allow dragging the sidebar edge to change its width.</small>
        </div>
        <button class="switch" data-sidebar-resize aria-label="Toggle sidebar resizing" aria-pressed="true"></button>
    </div>

    <div class="setting-row">
        <div class="row-info">
            <span>Interface font</span>
            <small>Changes headings, labels, messages, and controls.</small>
        </div>
        <select class="cloak-select" data-font-select aria-label="Interface font">${fontSelectOptionsMarkup()}</select>
    </div>

            </div>


<div class="settings-group">

    <h3>
        Performance
    </h3>

    <p class="theme-section-caption">
        Trade visual effects for speed on weaker devices.
    </p>

    <div class="setting-row">

        <div class="row-info">
            <span>Performance Mode</span>
            <small>Reduces effects to improve speed.</small>
        </div>

        <button class="switch" data-performance-mode></button>

    </div>


</div>

<div class="settings-group">
    <h3>Playback</h3>
    <p class="theme-section-caption">
        Choose playback quality and how the compact player behaves.
    </p>
    <div class="setting-row">
        <div class="row-info">
            <span>Music quality</span>
            <small>Choose the audio stream quality used for music playback.</small>
        </div>
        <select id="music-quality" class="cloak-select" aria-label="Music quality">
            <option value="128">Data saver</option>
            <option value="192">Standard</option>
            <option value="320" selected>High</option>
            <option value="999">Highest</option>
        </select>
    </div>
    <div class="setting-row">
        <div class="row-info">
            <span>Mini Player</span>
            <small>Show the compact player outside the Music tab.</small>
        </div>
        <button class="switch" data-music-mini-player aria-label="Toggle music mini player" aria-pressed="true"></button>
    </div>
</div>

<div class="settings-group">
    <h3>Content</h3>
    <div class="setting-row">
        <div class="row-info">
            <span>Profanity Filter</span>
            <small>Choose how strongly curse words are censored. Public slurs are always blocked; DMs are never blocked.</small>
        </div>
        <div class="profanity-slider-control">
            <input class="profanity-slider" type="range" min="0" max="2" step="1" value="0" data-profanity-filter aria-label="Profanity filter level">
            <div class="profanity-slider-labels" aria-hidden="true"><span>Off</span><span>Light</span><span>Heavy</span></div>
        </div>
    </div>
    <div class="setting-row setting-row-stacked">
        <div class="row-info">
            <span>Custom blocked words</span>
            <small>These words are censored only for you. Separate words with commas or new lines.</small>
        </div>
        <textarea class="custom-blocked-words" data-custom-blocked-words rows="2" maxlength="800" placeholder="word one, word two" aria-label="Custom blocked words"></textarea>
    </div>
    <div class="setting-row" id="settingsNonchalantRow" hidden>
        <div class="row-info">
            <span>Nonchalant Mode</span>
            <small>Lowercase copy with a little more casual slang across Blur.</small>
        </div>
        <button class="switch" data-nonchalant-mode aria-label="Toggle Nonchalant Mode" aria-pressed="false"></button>
    </div>
</div>

<div class="settings-group">
    <h3>AFK Awareness</h3>
    <div class="setting-row">
        <div class="row-info">
            <span>Pause when away</span>
            <small>Dims the site and pauses playing media after you’ve been idle.</small>
        </div>
        <select class="cloak-select" data-afk-delay aria-label="AFK awareness delay">
            <option value="off">Off</option>
            <option value="5">After 5 minutes</option>
            <option value="10">After 10 minutes</option>
            <option value="15">After 15 minutes</option>
            <option value="30">After 30 minutes</option>
        </select>
    </div>
</div>

            </div>










<div class="settings-page"
data-page="profile">
    <div class="profile-settings-shell profile-settings-v2">
        <div id="settings-profile-editor" class="profile-settings-editor" role="tabpanel">
            <div class="settings-profile-empty" data-profile-loading>
                <strong>Profile settings</strong>
                <span>Loading your profile settings…</span>
            </div>
        </div>
    </div>
</div>

<div class="settings-page"
data-page="settings-privacy">

            <div class="settings-group" data-settings-collection="anti-monitoring">

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
        Google Classroom
    </option>

    <option value="sheets">
        Google Sheets
    </option>

    <option value="slides">
        Google Slides
    </option>

    <option value="forms">
        Google Forms
    </option>

    <option value="gmail">
        Gmail
    </option>

    <option value="calendar">
        Google Calendar
    </option>

    <option value="meet">
        Google Meet
    </option>

    <option value="clever">
        Clever
    </option>

    <option value="iready">
        i-Ready
    </option>

    <option value="khan">
        Khan Academy
    </option>

    <option value="canvas">
        Canvas
    </option>

    <option value="schoology">
        Schoology
    </option>

    <option value="microsoft">
        Microsoft 365
    </option>

    <option value="word">
        Microsoft Word
    </option>

    <option value="powerpoint">
        Microsoft PowerPoint
    </option>

    <option value="onedrive">
        OneDrive
    </option>

    <option value="calculator">
        Calculator
    </option>

    <option value="translate">
        Google Translate
    </option>

    <option value="maps">
        Google Maps
    </option>

    <option value="wikipedia">
        Wikipedia
    </option>

    <option value="blank">
        Blank Tab
    </option>

</select>



    </div>


</div>

<div class="settings-group" data-settings-collection="privacy">

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
                White Screen
            </option>

            <option value="clever">
                Clever
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

<div class="settings-group" data-settings-collection="privacy">

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

<div class="settings-group" data-settings-collection="chat">

    <h3>
        Activity Sharing
    </h3>

    <p class="theme-section-caption">
        Choose what people in Chat can see about your activity.
    </p>

    <div class="setting-row">

        <div class="row-info">
            <span>Share my activity</span>
            <small>Let others in Chat see the first game, movie, or song you’re using.</small>
        </div>

        <button class="switch" data-chat-activity-share aria-label="Share my activity in Chat" aria-pressed="false"></button>

    </div>

</div>

<div class="settings-group" data-settings-collection="anti-monitoring">

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

        <button class="small-button ui-button ui-button--secondary ui-button--sm" data-blob-mode>
    Open
</button>

    </div>

</div>

<div class="settings-group" data-settings-collection="anti-monitoring">

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
            class="panic-input ui-input"
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
            class="panic-key-button ui-button ui-button--secondary"
            data-panic-key>
            P
        </button>

    </div>


</div>

<div class="settings-group" data-settings-collection="extra">

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
        Games
    </h3>

    <p class="theme-section-caption">
        Choose whether Blur asks for quick game ratings.
    </p>

    <div class="setting-row">
        <div class="row-info">
            <span>Game rating prompts</span>
            <small>Ask once after you’ve played a new game for five minutes.</small>
        </div>
        <button class="switch" data-game-rating-surveys aria-label="Toggle game rating prompts" aria-pressed="true"></button>
    </div>

</div>

<div class="settings-group">

    <h3>
        Storage
    </h3>

    <p class="theme-section-caption">
        Back up or restore your preferences on this device.
    </p>


    <div class="setting-row">

        <div class="row-info">
            <span>Export Settings</span>
            <small>Download your Blur settings as a backup.</small>
        </div>

        <button class="small-button ui-button ui-button--secondary ui-button--sm" data-export-settings>
            Export
        </button>

    </div>



    <div class="setting-row">

        <div class="row-info">
            <span>Import Settings</span>
            <small>Restore settings from a backup file.</small>
        </div>

        <button class="small-button ui-button ui-button--secondary ui-button--sm" data-import-settings>
            Import
        </button>

    </div>


</div>

<div class="settings-group danger-zone">

    <h3>
        Danger Zone
    </h3>

    <p class="theme-section-caption">
        Irreversible actions that remove locally saved Blur data.
    </p>

    <div class="setting-row">

        <div class="row-info">
            <span class="danger-text">Reset Local Data</span>
            <small>Deletes ALL saved data on this device. This can't be undone.</small>
        </div>

<button class="small-button danger ui-button ui-button--danger ui-button--sm" data-reset-data>
    Reset
</button>

    </div>


</div>


        </div>

        <div class="settings-page about-page" data-page="about">

    <div class="settings-group about-group about-application">

        <h3>Application</h3>

        <p class="theme-section-caption">
            Build details and ways to reach Blur Studios.
        </p>

        <div class="setting-row">
            <div class="row-info">
                <span>Developer</span>
            </div>
            <span class="badge">Blur Studios</span>
        </div>

        <div class="setting-row">
            <div class="row-info">
                <span>Contact</span>
                <small>For safety, copyright, account, or general questions.</small>
            </div>
            <a class="badge settings-contact-link" href="mailto:blurstudios22@gmail.com">blurstudios22@gmail.com</a>
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

    <div class="settings-group about-group about-resources">

        <h3>Resources</h3>

        <div class="setting-row">
            <div class="row-info">
                <span>Release notes</span>
                <small>See what changed in the latest Blur update.</small>
            </div>
            <button class="small-button ui-button ui-button--secondary ui-button--sm" type="button" data-open-changelog>Open</button>
        </div>

        <div class="setting-row">
            <div class="row-info">
                <span>Responsible use</span>
                <small>Reopen the welcome notice and review Blur's use guidelines.</small>
            </div>
            <button class="small-button ui-button ui-button--secondary ui-button--sm" type="button" data-open-responsible-use>Open</button>
        </div>

    </div>


    <div class="settings-group credits-group about-group about-credits">

        <h3>Credits</h3>
        <button type="button" class="about-credits-toggle" data-about-credits-toggle aria-expanded="false" aria-controls="about-credits-list" aria-label="Expand credits">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
        </button>

        <div class="about-credits-list" id="about-credits-list">

        <div class="credit-mini">

            <img src="assets/images/sprite.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Blur Studios</strong>
                <span>Creator & Lead Developer</span>
            </div>

            <div class="credit-mini-role">
                Main Developer & Founder
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/sprite.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Codex</strong>
                <span>AI Helper/span>
            </div>

            <div class="credit-mini-role">
                Code help
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/darqmarq.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>DarqMarq</strong>
                <span>Content Creator</span>
            </div>

            <div class="credit-mini-role">
                Ideas and site logo
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/jayden.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Jayden</strong>
                <span>Helper</span>
            </div>

            <div class="credit-mini-role">
                Suggestions and ideas
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/jayden.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Solara</strong>
                <span>Helper</span>
            </div>

            <div class="credit-mini-role">
                Music provider
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/jayden.jpg" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Crax</strong>
                <span>Helper</span>
            </div>

            <div class="credit-mini-role">
                AI provider
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/logo.png" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Supabase</strong>
                <span>Platform service</span>
            </div>

            <div class="credit-mini-role">
                Accounts and chat storage
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/icons/watch.png" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>TMDB</strong>
                <span>Watch data provider</span>
            </div>

            <div class="credit-mini-role">
                Watch tab searching and info
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/icons/watch.png" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>FrameXtv</strong>
                <span>Watch playback provider</span>
            </div>

            <div class="credit-mini-role">
                Watch tab playback provider
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/icons/chat.png" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Klipy</strong>
                <span>Chat media provider</span>
            </div>

            <div class="credit-mini-role">
                GIF provider
            </div>

        </div>

        <div class="credit-mini">

            <img src="assets/images/logo.png" class="credit-mini-avatar">

            <div class="credit-mini-info">
                <strong>Google Fonts</strong>
                <span>Typography provider</span>
            </div>

            <div class="credit-mini-role">
                Font provider
            </div>

        </div>

        </div>

    </div>

<div class="about-footer">
    © 2026 Blur Studios
    <span class="dev-link" id="dev-link">- Dev</span>
</div>

</div>

`;





const SETTINGS_SECTION_ICONS = {
    "blur themes": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2"></circle><circle cx="16.5" cy="7" r="2.4"></circle><circle cx="14" cy="16" r="4"></circle><circle cx="6" cy="16" r="2"></circle></svg>`,
    "community themes": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="15" r="4"></circle><path d="m13 6 3-2M5 14l-2 2"></path></svg>`,
    "exclusive themes": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"></path></svg>`,
    interface: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="11" cy="18" r="2"></circle></svg>`,
    performance: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 1 1 16 0"></path><path d="m12 12 4-4"></path><path d="M7 19h10"></path></svg>`,
    playback: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="m10 8 5 4-5 4V8Z"></path></svg>`,
    content: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
    "afk awareness": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path></svg>`,
    typography: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 10 5h4l5 14M7 14h10"></path></svg>`,
    "tab cloaking": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>`,
    "screen privacy": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>`,
    "text obfuscation": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M12 5v14M8 19h8"></path><path d="m4 13 3-3 3 3M14 13l3-3 3 3"></path></svg>`,
    "activity sharing": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16h4l2-8 3 12 2-7h5"></path></svg>`,
    "cloak site": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"></path></svg>`,
    "panic key": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"></path></svg>`,
    "close confirmation": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10v16H5z"></path><path d="m15 12h6M18 9l3 3-3 3"></path></svg>`,
    storage: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg>`,
    "danger zone": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 9 16H3L12 4Z"></path><path d="M12 9v5M12 17h.01"></path></svg>`,
    application: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 11v5M12 8h.01"></path></svg>`,
    resources: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"></path><path d="M8 4v16M11 8h5M11 12h5"></path></svg>`,
    credits: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"></path></svg>`,
    "blur backstage": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z"></path></svg>`
};

function decorateSettingsSectionHeadings(){
    settingsPanel.querySelectorAll(".settings-group > h3").forEach(heading => {
        if (heading.querySelector(".settings-section-icon")) return;
        const key = heading.textContent.trim().replace(/\s+/g, " ").toLowerCase();
        const icon = SETTINGS_SECTION_ICONS[key] || SETTINGS_SECTION_ICONS.interface;
        heading.classList.add("settings-section-heading");
        heading.insertAdjacentHTML("afterbegin", `<span class="settings-section-icon" aria-hidden="true">${icon}</span>`);
    });
}

decorateSettingsSectionHeadings();

// Keep behavior-focused preferences in Config while leaving Interface with
// the visual controls in Appearance. Preserve each original group, heading,
// and description instead of introducing synthetic collection wrappers.
function organizeSettingsGroups(){
    const appearance = settingsPanel.querySelector('[data-page="appearance"]');
    const config = settingsPanel.querySelector('[data-page="config"]');
    if (!appearance || !config) return;
    const groups = [...appearance.querySelectorAll(":scope > .settings-group")];
    const preferenceGroups = groups.filter((group, index) => {
        const heading = group.querySelector(":scope > h3")?.textContent.trim().replace(/\s+/g, " ").toLowerCase();
        return index > 0
            && heading !== "interface"
            && !group.matches("[data-exclusive-theme-section]")
            && !group.matches("[data-community-theme-section]")
            && !group.matches("[data-font-settings]");
    });
    const storageAnchor = config.querySelector(":scope > .settings-group");
    preferenceGroups.forEach(group => config.insertBefore(group, storageAnchor));
}

organizeSettingsGroups();

// Settings dropdowns keep the real <select> elements for compatibility with
// existing preference listeners, while presenting a compact searchable menu
// that behaves consistently across every Settings page.
function enhanceSettingsDropdowns(root = settingsPanel) {
    const selects = [...root.querySelectorAll("select:not([data-settings-dropdown-ready])")];
    if (!selects.length) return;

    const instances = [];
    const closeInstance = instance => {
        instance.wrapper.classList.remove("is-open");
        instance.wrapper.classList.remove("opens-up");
        instance.trigger.setAttribute("aria-expanded", "false");
        instance.popover.hidden = true;
        instance.search.value = "";
        instance.filterOptions("");
    };
    const closeAll = except => instances.forEach(instance => {
        if (instance !== except) closeInstance(instance);
    });

    selects.forEach(select => {
        const wrapper = document.createElement("div");
        wrapper.className = "settings-dropdown";
        wrapper.dataset.settingsDropdown = "true";
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        select.dataset.settingsDropdownReady = "true";
        select.classList.add("settings-native-select");
        select.tabIndex = -1;
        select.setAttribute("aria-hidden", "true");

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "settings-dropdown-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-label", select.getAttribute("aria-label") || "Choose an option");
        trigger.innerHTML = `<span class="settings-dropdown-value"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>`;

        const popover = document.createElement("div");
        popover.className = "settings-dropdown-popover ui-menu";
        popover.hidden = true;
        popover.innerHTML = `<label class="settings-dropdown-search ui-menu__search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" placeholder="Search options…" autocomplete="off"></label><div class="settings-dropdown-options" role="listbox"></div><span class="settings-dropdown-empty" hidden>No matching options</span>`;

        const value = trigger.querySelector(".settings-dropdown-value");
        const search = popover.querySelector("input");
        const optionsHost = popover.querySelector(".settings-dropdown-options");
        const empty = popover.querySelector(".settings-dropdown-empty");
        const instance = { wrapper, trigger, popover, search, optionsHost, empty, filterOptions: () => {} };
        const positionPopover = () => {
            const triggerRect = wrapper.getBoundingClientRect();
            const popoverHeight = popover.offsetHeight || 260;
            const spaceBelow = window.innerHeight - triggerRect.bottom;
            const spaceAbove = triggerRect.top;
            const shouldOpenUp = spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;
            wrapper.classList.toggle("opens-up", shouldOpenUp);
        };
        instance.positionPopover = positionPopover;

        let optionButtons = [];
        const buildOptionButton = option => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "settings-dropdown-option ui-menu__item";
            button.dataset.value = option.value;
            button.dataset.label = option.textContent.trim().toLowerCase();
            button.setAttribute("role", "option");
            button.textContent = option.textContent.trim();
            if (select.matches("[data-font-select]") || select.name === "font") {
                const font = FONT_CATALOG.find(item => item.id === option.value);
                if (font) button.style.fontFamily = font.display;
            }
            button.addEventListener("click", () => {
                select.value = option.value;
                select.dispatchEvent(new Event("change", { bubbles: true }));
                closeInstance(instance);
                trigger.focus();
            });
            optionsHost.appendChild(button);
            return button;
        };
        const rebuildOptions = () => {
            optionsHost.replaceChildren();
            optionButtons = [...select.options].map(buildOptionButton);
        };

        const sync = () => {
            const option = select.options[select.selectedIndex];
            const label = option?.textContent.trim() || "Choose an option";
            value.textContent = label;
            if (select.matches("[data-font-select]") || select.name === "font") {
                const font = FONT_CATALOG.find(item => item.id === select.value);
                if (font) {
                    value.style.fontFamily = font.display;
                    trigger.style.fontFamily = font.display;
                }
            }
            trigger.setAttribute("aria-label", `${select.getAttribute("aria-label") || "Choose an option"}: ${label}`);
            optionButtons.forEach(button => {
                const selected = button.dataset.value === select.value;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-selected", String(selected));
            });
        };
        const filterOptions = query => {
            const normalized = String(query || "").trim().toLowerCase();
            let visible = 0;
            optionButtons.forEach(button => {
                const matches = !normalized || button.dataset.label.includes(normalized);
                button.hidden = !matches;
                if (matches) visible += 1;
            });
            empty.hidden = visible !== 0;
        };
        instance.filterOptions = filterOptions;
        instance.refreshOptions = () => {
            rebuildOptions();
            sync();
            filterOptions(search.value);
        };
        wrapper._settingsDropdownRefresh = instance.refreshOptions;
        select.addEventListener("change", sync);
        trigger.addEventListener("click", event => {
            event.stopPropagation();
            const opening = !wrapper.classList.contains("is-open");
            closeAll(instance);
            wrapper.classList.toggle("is-open", opening);
            trigger.setAttribute("aria-expanded", String(opening));
            popover.hidden = !opening;
            if (opening) {
                search.value = "";
                filterOptions("");
                requestAnimationFrame(() => {
                    positionPopover();
                    search.focus();
                });
            }
        });
        search.addEventListener("input", () => filterOptions(search.value));
        search.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeInstance(instance);
                trigger.focus();
            }
        });

        wrapper.insertBefore(trigger, select);
        wrapper.appendChild(popover);
        rebuildOptions();
        instances.push(instance);
        sync();
    });

    const repositionOpenDropdowns = () => {
        instances.forEach(instance => {
            if (instance.wrapper.classList.contains("is-open")) instance.positionPopover?.();
        });
    };
    window.addEventListener("resize", repositionOpenDropdowns, { passive: true });
    document.addEventListener("scroll", repositionOpenDropdowns, { passive: true, capture: true });
    root._settingsDropdownCleanup = () => {
        window.removeEventListener("resize", repositionOpenDropdowns);
        document.removeEventListener("scroll", repositionOpenDropdowns, true);
    };
    root._settingsDropdownRefreshOptions = () => {
        instances.forEach(instance => instance.refreshOptions?.());
    };

    if (!root.dataset.settingsDropdownDocumentBound) {
        root.dataset.settingsDropdownDocumentBound = "true";
        document.addEventListener("click", event => {
            if (!event.target.closest("[data-settings-dropdown]")) closeAll();
        });
    }

    if (root !== settingsPanel) return;
    window.refreshSettingsDropdowns = () => {
        settingsPanel.querySelectorAll("[data-settings-dropdown]").forEach(wrapper => {
            const select = wrapper.querySelector("select");
            const trigger = wrapper.querySelector(".settings-dropdown-trigger");
            const value = wrapper.querySelector(".settings-dropdown-value");
            if (!select || !trigger || !value) return;
            const option = select.options[select.selectedIndex];
            const label = option?.textContent.trim() || "Choose an option";
            value.textContent = label;
            trigger.setAttribute("aria-label", `${select.getAttribute("aria-label") || "Choose an option"}: ${label}`);
            wrapper.querySelectorAll(".settings-dropdown-option").forEach(button => {
                const selected = button.dataset.value === select.value;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-selected", String(selected));
            });
        });
    };
}

enhanceSettingsDropdowns();

const FONT_KEY = "blur-interface-font-v2";
let FONT_OPTIONS = Object.fromEntries(
    FONT_CATALOG.map(({ id, body, display }) => [id, { body, display }])
);
const fontSelect = settingsPanel.querySelector("[data-font-select]");
let selectedFont = "system";
try {
    const savedFont = localStorage.getItem(FONT_KEY);
    if (savedFont === "inter") {
        // v2 wrote Inter as its automatic default. That was never meant to
        // replace Blur's original Inter/Fraunces system pairing.
        selectedFont = "system";
    } else if (FONT_OPTIONS[savedFont]) {
        selectedFont = savedFont;
    } else {
        // The first version stored its default (Inter) automatically. Keep
        // intentional non-default choices, but restore the real Blur default
        // for users who never selected a font.
        const legacyFont = localStorage.getItem("blur-interface-font");
        if (legacyFont && legacyFont !== "inter" && FONT_OPTIONS[legacyFont]) selectedFont = legacyFont;
    }
} catch (e) {}

function applyInterfaceFont(fontId, { persist = true } = {}) {
    const font = FONT_OPTIONS[fontId] || FONT_OPTIONS.inter;
    const appliedFont = FONT_OPTIONS[fontId] ? fontId : "system";
    loadFontsourceStylesheet(font);
    if (persist) selectedFont = appliedFont;
    document.documentElement.style.setProperty("--font-body", font.body);
    document.documentElement.style.setProperty("--font-display", font.display);
    fontSelect?.classList.toggle("font-system", appliedFont === "system");
    if (persist) {
        try { localStorage.setItem(FONT_KEY, appliedFont); } catch (e) {}
    }
}

if (fontSelect) {
    fontSelect.value = selectedFont;
    fontSelect.addEventListener("change", () => applyInterfaceFont(fontSelect.value));
}
applyInterfaceFont(selectedFont);

// Fontsource provides a broad, searchable catalog without shipping thousands
// of local font files. Metadata is cached locally, and only the selected
// family's stylesheet is loaded from the CDN.
const FONTSOURCE_API = "https://api.fontsource.org/v1/fonts?subsets=latin";
const FONTSOURCE_CACHE_KEY = "blur-fontsource-catalog-v1";
const FONTSOURCE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;

function fontFallbackForCategory(category){
    if (category === "serif" || category === "slab-serif") return "Georgia, serif";
    if (category === "monospace") return "ui-monospace, SFMono-Regular, Consolas, monospace";
    return "Arial, sans-serif";
}

function makeFontsourceEntry(raw){
    if (!raw?.id || !raw?.family) return null;
    const family = String(raw.family).trim();
    const safeFamily = family.replace(/"/g, "\\\"");
    const fallback = fontFallbackForCategory(raw.category);
    return {
        id: `fontsource-${String(raw.id).toLowerCase()}`,
        label: family,
        body: `"${safeFamily}", ${fallback}`,
        display: `"${safeFamily}", ${fallback}`,
        fontsourceId: String(raw.id).toLowerCase(),
        fontsourceVariable: Boolean(raw.variable)
    };
}

function mergeFontsourceCatalog(rows){
    const existingIds = new Set(FONT_CATALOG.map(font => font.id));
    const existingFamilies = new Set(FONT_CATALOG.map(font => font.label.toLowerCase()));
    const remote = (Array.isArray(rows) ? rows : [])
        .map(makeFontsourceEntry)
        .filter(font => font && !existingIds.has(font.id) && !existingFamilies.has(font.label.toLowerCase()))
        .sort((a, b) => a.label.localeCompare(b.label));
    if (!remote.length) return;

    FONT_CATALOG = [...FONT_CATALOG, ...remote];
    FONT_OPTIONS = Object.fromEntries(FONT_CATALOG.map(({ id, body, display, fontsourceId, fontsourceVariable }) => [
        id, { body, display, fontsourceId, fontsourceVariable }
    ]));

    document.querySelectorAll('select[data-font-select], select[name="font"]').forEach(select => {
        const existing = new Set([...select.options].map(option => option.value));
        remote.forEach(font => {
            if (existing.has(font.id)) return;
            const option = document.createElement("option");
            option.value = font.id;
            option.textContent = font.label;
            select.appendChild(option);
        });
    });
    document.querySelectorAll("[data-settings-dropdown]").forEach(wrapper => wrapper._settingsDropdownRefresh?.());
    if (window.refreshSettingsDropdowns) window.refreshSettingsDropdowns();

    // A dynamic font may have been saved before its catalog metadata loaded.
    let savedFont = "";
    try { savedFont = localStorage.getItem(FONT_KEY) || ""; } catch (e) {}
    if (savedFont && FONT_OPTIONS[savedFont] && selectedFont !== savedFont) {
        selectedFont = savedFont;
        if (fontSelect) fontSelect.value = savedFont;
        applyInterfaceFont(savedFont);
    }
}

function loadFontsourceStylesheet(font){
    if (!font?.fontsourceId || document.querySelector(`link[data-fontsource="${font.fontsourceId}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.fontsource = font.fontsourceId;
    const packageId = font.fontsourceVariable ? `${font.fontsourceId}:vf` : font.fontsourceId;
    const file = font.fontsourceVariable ? "index.css" : "latin.css";
    link.href = `https://cdn.jsdelivr.net/fontsource/css/${packageId}@latest/${file}`;
    document.head.appendChild(link);
}

async function loadFontsourceCatalog(){
    let rows = null;
    try {
        const cached = JSON.parse(localStorage.getItem(FONTSOURCE_CACHE_KEY) || "null");
        if (cached?.savedAt && Date.now() - cached.savedAt < FONTSOURCE_CACHE_TTL && Array.isArray(cached.fonts)) {
            rows = cached.fonts;
        }
    } catch (e) {}
    if (!rows) {
        try {
            const response = await fetch(FONTSOURCE_API, { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error(`Font catalog request failed (${response.status})`);
            rows = await response.json();
            try { localStorage.setItem(FONTSOURCE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), fonts: rows })); } catch (e) {}
        } catch (error) {
            console.warn("Font catalog unavailable; keeping built-in fonts:", error);
            return;
        }
    }
    mergeFontsourceCatalog(rows);
}

loadFontsourceCatalog();

const SIDEBAR_RESIZE_ENABLED_KEY = "blur-sidebar-resize-enabled";
const sidebarResizeToggle = settingsPanel.querySelector("[data-sidebar-resize]");
const settingsSidebarResizeHandle = document.getElementById("sidebar-resize-handle");
let sidebarResizeEnabled = true;
try {
    const saved = localStorage.getItem(SIDEBAR_RESIZE_ENABLED_KEY);
    if (saved !== null) sidebarResizeEnabled = saved === "true";
} catch (e) {}

function applySidebarResizeSetting(enabled) {
    document.documentElement.classList.toggle("sidebar-resize-disabled", !enabled);
    sidebarResizeToggle?.classList.toggle("on", enabled);
    sidebarResizeToggle?.setAttribute("aria-pressed", String(enabled));
    if (settingsSidebarResizeHandle) {
        settingsSidebarResizeHandle.setAttribute("aria-hidden", String(!enabled));
        settingsSidebarResizeHandle.setAttribute("aria-disabled", String(!enabled));
        settingsSidebarResizeHandle.tabIndex = enabled ? 0 : -1;
    }
}

applySidebarResizeSetting(sidebarResizeEnabled);
sidebarResizeToggle?.addEventListener("click", () => {
    sidebarResizeEnabled = !sidebarResizeEnabled;
    try { localStorage.setItem(SIDEBAR_RESIZE_ENABLED_KEY, String(sidebarResizeEnabled)); } catch (e) {}
    applySidebarResizeSetting(sidebarResizeEnabled);
});

const MUSIC_MINI_PLAYER_KEY = "blur-music-mini-player-enabled";
const musicMiniPlayerToggle = settingsPanel.querySelector("[data-music-mini-player]");
let musicMiniPlayerEnabled = true;
try {
    const saved = localStorage.getItem(MUSIC_MINI_PLAYER_KEY);
    if (saved !== null) musicMiniPlayerEnabled = saved === "true";
} catch (e) {}

function applyMusicMiniPlayerSetting(enabled) {
    document.documentElement.classList.toggle("music-miniplayer-disabled", !enabled);
    musicMiniPlayerToggle?.classList.toggle("on", enabled);
    musicMiniPlayerToggle?.setAttribute("aria-pressed", String(enabled));
    window.updateMusicFloatingPlayer?.();
}

applyMusicMiniPlayerSetting(musicMiniPlayerEnabled);
musicMiniPlayerToggle?.addEventListener("click", () => {
    musicMiniPlayerEnabled = !musicMiniPlayerEnabled;
    try { localStorage.setItem(MUSIC_MINI_PLAYER_KEY, String(musicMiniPlayerEnabled)); } catch (e) {}
    applyMusicMiniPlayerSetting(musicMiniPlayerEnabled);
});

const CHAT_ACTIVITY_SHARING_KEY = "blur-chat-activity-sharing";
const chatActivitySharingToggle = settingsPanel.querySelector("[data-chat-activity-share]");
let chatActivitySharingEnabled = false;
try {
    chatActivitySharingEnabled = localStorage.getItem(CHAT_ACTIVITY_SHARING_KEY) === "true";
} catch (e) {}

function applyChatActivitySharingSetting(enabled) {
    chatActivitySharingEnabled = Boolean(enabled);
    chatActivitySharingToggle?.classList.toggle("on", chatActivitySharingEnabled);
    chatActivitySharingToggle?.setAttribute("aria-pressed", String(chatActivitySharingEnabled));
    window.BlurPresence?.setShareActivity(chatActivitySharingEnabled);
}

applyChatActivitySharingSetting(chatActivitySharingEnabled);
chatActivitySharingToggle?.addEventListener("click", () => {
    const enabled = !chatActivitySharingEnabled;
    try { localStorage.setItem(CHAT_ACTIVITY_SHARING_KEY, String(enabled)); } catch (e) {}
    applyChatActivitySharingSetting(enabled);
});

// Chat profanity filtering is a local display preference. Messages remain
// stored exactly as sent; Chat reads this value when rendering them.
const PROFANITY_FILTER_KEY = "blur-profanity-filter";
const profanityFilter = document.querySelector("[data-profanity-filter]");
const validProfanityModes = new Set(["off", "light", "heavy"]);
const profanityModeToSlider = { off: "0", light: "1", heavy: "2" };
const sliderToProfanityMode = ["off", "light", "heavy"];
const customBlockedWords = document.querySelector("[data-custom-blocked-words]");
let profanityMode = "off";
const syncProfanitySliderVisual = () => {
    if (!profanityFilter) return;
    const min = Number(profanityFilter.min || 0);
    const max = Number(profanityFilter.max || 100);
    const value = Number(profanityFilter.value || min);
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
    profanityFilter.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, progress))}%`);
    profanityFilter.parentElement?.querySelectorAll(".profanity-slider-labels span").forEach((label, index) => {
        label.classList.toggle("is-current", index === value - min);
    });
};
try {
    const saved = localStorage.getItem(PROFANITY_FILTER_KEY);
    if (validProfanityModes.has(saved)) profanityMode = saved;
    else if (saved === "1") profanityMode = "light";
    else if (saved === "2") profanityMode = "heavy";
} catch (e) {}
if (profanityFilter) {
    profanityFilter.value = profanityModeToSlider[profanityMode];
    syncProfanitySliderVisual();
    profanityFilter.addEventListener("input", () => {
        profanityMode = sliderToProfanityMode[Number(profanityFilter.value)] || "off";
        syncProfanitySliderVisual();
        try { localStorage.setItem(PROFANITY_FILTER_KEY, profanityMode); } catch (e) {}
        document.dispatchEvent(new CustomEvent("blur-profanity-change", { detail: profanityMode }));
    });
}
if (customBlockedWords) {
    try { customBlockedWords.value = localStorage.getItem("blur-custom-blocked-words") || ""; } catch (e) {}
    customBlockedWords.addEventListener("change", () => {
        const value = customBlockedWords.value.slice(0, 800);
        try { localStorage.setItem("blur-custom-blocked-words", value); } catch (e) {}
        document.dispatchEvent(new CustomEvent("blur-profanity-change", { detail: value }));
    });
}

// Nonchalant is an exclusive-code reward. Keep the row hidden until the code
// is redeemed, but let the preference itself be turned on or off at any time.
const nonchalantRow = document.getElementById("settingsNonchalantRow");
const syncNonchalantVisibility = () => {
    const unlocked = Boolean(window.blurNonchalant?.isUnlocked?.());
    if (nonchalantRow) nonchalantRow.hidden = !unlocked;
    return unlocked;
};
syncNonchalantVisibility();
const nonchalantToggle = document.querySelector("[data-nonchalant-mode]");
const syncNonchalantToggle = (enabled) => {
    nonchalantToggle?.classList.toggle("on", Boolean(enabled));
    nonchalantToggle?.setAttribute("aria-pressed", String(Boolean(enabled)));
};
syncNonchalantToggle(window.blurNonchalant?.isEnabled?.() || false);
nonchalantToggle?.addEventListener("click", () => {
    if (!window.blurNonchalant?.isUnlocked?.()) return;
    const enabled = !(window.blurNonchalant.isEnabled?.() || false);
    window.blurNonchalant.setEnabled(enabled);
    syncNonchalantToggle(enabled);
});
document.addEventListener("blur-nonchalant-change", event => {
    syncNonchalantVisibility();
    syncNonchalantToggle(event.detail);
});

const AFK_DELAY_KEY = "blur-afk-delay";
const afkDelaySelect = document.querySelector("[data-afk-delay]");
let afkDelay = "10";
try {
    const savedAfk = localStorage.getItem(AFK_DELAY_KEY);
    if (["off", "5", "10", "15", "30"].includes(savedAfk)) afkDelay = savedAfk;
} catch (e) {}
if (afkDelaySelect) {
    afkDelaySelect.value = afkDelay;
    afkDelaySelect.addEventListener("change", () => {
        afkDelay = ["off", "5", "10", "15", "30"].includes(afkDelaySelect.value) ? afkDelaySelect.value : "off";
        try { localStorage.setItem(AFK_DELAY_KEY, afkDelay); } catch (e) {}
        document.dispatchEvent(new CustomEvent("blur-afk-setting-change", { detail: afkDelay }));
    });
}

// Game rating prompts are stored alongside the rating records so the Games
// tab can honor this preference even though it loads after Settings.
const gameRatingSurveysToggle = settingsPanel.querySelector("[data-game-rating-surveys]");
const GAME_RATINGS_KEY = "blur_game_ratings_v1";
let gameRatingSurveysEnabled = true;
const readGameRatingPreference = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(GAME_RATINGS_KEY) || "{}");
        return parsed?.disabled !== true;
    } catch (_) { return true; }
};
const writeGameRatingPreference = (enabled) => {
    try {
        const parsed = JSON.parse(localStorage.getItem(GAME_RATINGS_KEY) || "{}");
        parsed.disabled = !enabled;
        localStorage.setItem(GAME_RATINGS_KEY, JSON.stringify(parsed));
    } catch (_) {}
};
const applyGameRatingSurveySetting = (enabled) => {
    gameRatingSurveysEnabled = Boolean(enabled);
    gameRatingSurveysToggle?.classList.toggle("on", gameRatingSurveysEnabled);
    gameRatingSurveysToggle?.setAttribute("aria-pressed", String(gameRatingSurveysEnabled));
};
applyGameRatingSurveySetting(readGameRatingPreference());
gameRatingSurveysToggle?.addEventListener("click", () => {
    const enabled = !gameRatingSurveysEnabled;
    writeGameRatingPreference(enabled);
    applyGameRatingSurveySetting(enabled);
});

// Native selects are initialized by their individual preference handlers
// below. Sync the custom triggers once after those values are ready.
window.refreshSettingsDropdowns?.();

// tab switching

const settingsTabButtons = [...document.querySelectorAll(".settings-tabs button")];
const settingsPages = [...document.querySelectorAll(".settings-page")];
const settingsOverview = settingsPanel.querySelector("[data-settings-overview]");
const settingsContentHeading = settingsPanel.querySelector(".settings-content-heading");
let settingsOverviewVisible = false;
const settingsPageMeta = {
    appearance: {
        title: "Appearance",
        subtitle: "Tune the look and feel of Blur. Changes apply instantly and are saved on this device."
    },
    "settings-privacy": {
        title: "Privacy",
        subtitle: "Keep Blur quiet, private, and under your control."
    },
    config: {
        title: "Config",
        subtitle: "Set how Blur behaves, then manage the data saved on this device."
    },
    profile: {
        title: "Profile settings",
        subtitle: "Customize how people see you across Blur."
    },
    about: {
        title: "About",
        subtitle: "A little context about Blur and the people behind it."
    }
};

function showSettingsOverview() {
    const closeResult = window.closeProfileSettingsEditor?.({ force: false });
    if (closeResult === false) return;
    settingsOverviewVisible = true;
    settingsOverview && (settingsOverview.hidden = false);
    settingsContentHeading && (settingsContentHeading.hidden = true);
    settingsTabButtons.forEach(button => {
        button.classList.remove("active");
        button.setAttribute("aria-selected", "false");
    });
    settingsPages.forEach(page => {
        page.classList.remove("active");
        page.hidden = true;
    });
}

function activateSettingsTab(target = "appearance") {
    const next = settingsTabButtons.some(button => button.dataset.tab === target)
        ? target
        : "appearance";

    // The profile editor is mounted inline, so it needs an explicit teardown
    // when moving to another settings page. Without this, its editor handle
    // can survive the page switch and be rendered again by account callbacks.
    if (next !== "profile") {
        window.closeProfileSettingsEditor?.({ force: false });
    }

    settingsOverviewVisible = false;
    settingsOverview && (settingsOverview.hidden = true);
    settingsContentHeading && (settingsContentHeading.hidden = false);
    settingsTabButtons.forEach(button => {
        const active = button.dataset.tab === next;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    settingsPages.forEach(page => {
        const active = page.dataset.page === next;
        page.classList.toggle("active", active);
        page.hidden = !active;
    });
    const meta = settingsPageMeta[next];
    if (meta) {
        document.getElementById("settings-page-title")?.replaceChildren(document.createTextNode(meta.title));
        document.getElementById("settings-page-subtitle")?.replaceChildren(document.createTextNode(meta.subtitle));
    }
    if (next === "profile") {
        requestAnimationFrame(() => window.renderProfileSettingsEditor?.());
    }
    document.dispatchEvent(new CustomEvent("blur-settings-tab-change", { detail: next }));
}

const profileSettingsEditor = settingsPanel.querySelector("#settings-profile-editor");

function profileSettingsPageIsActive() {
    return settingsPanel.classList.contains("active") &&
        settingsPanel.querySelector('.settings-page[data-page="profile"].active');
}

function closeProfileSettingsEditor({ force = false } = {}) {
    const editorApi = typeof AccountUI !== "undefined" ? AccountUI : null;
    const editor = editorApi?.activeEditor;
    let closed = true;

    if (editor && profileSettingsEditor?.contains(editor.root)) {
        closed = editor.attemptClose();
    }

    if (closed && profileSettingsEditor && !profileSettingsEditor.querySelector(".settings-profile-empty")) {
        profileSettingsEditor.replaceChildren();
    }
    return closed;
}

window.closeProfileSettingsEditor = closeProfileSettingsEditor;

function renderProfileSettingsEditor() {
    if (!profileSettingsEditor) return;

    // Do not mount an inline profile editor while another Settings page (or
    // another main tab) is visible. Auth/profile listeners can fire at any
    // time, so this guard is intentionally checked on every render.
    if (!profileSettingsPageIsActive()) {
        closeProfileSettingsEditor({ force: false });
        return;
    }

    const account = typeof Account !== "undefined" ? Account : null;
    const profile = account?.profile;
    const editorApi = typeof AccountUI !== "undefined" ? AccountUI : null;
    if (!account?.user || !profile || !editorApi?.renderProfileEditor) {
        const signedIn = Boolean(account?.user);
        const message = signedIn
            ? (account?.profileError || "Your profile is still loading. Try again in a moment.")
            : "Your profile settings will appear here after you sign in.";
        profileSettingsEditor.innerHTML = `
            <div class="settings-profile-empty">
                <strong>${signedIn ? "Profile settings unavailable" : "Sign in to customize your profile."}</strong>
                <span>${settingsEscape(message)}</span>
                ${signedIn
                    ? '<button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-profile-retry>Try again</button>'
                    : '<button type="button" class="small-button ui-button ui-button--primary ui-button--sm" data-profile-signin>Sign in</button>'}
            </div>`;
        profileSettingsEditor.querySelector("[data-profile-signin]")?.addEventListener("click", () => {
            if (typeof AccountUI !== "undefined") AccountUI.openAuthOverlay?.("signin");
        });
        profileSettingsEditor.querySelector("[data-profile-retry]")?.addEventListener("click", () => {
            account?.retryProfile?.();
        });
        window.BlurCosmetics?.mountProfileSettings?.(profileSettingsEditor, profile);
        return;
    }
    if (editorApi.activeEditor?.root && profileSettingsEditor.contains(editorApi.activeEditor.root)) return;
    profileSettingsEditor.replaceChildren();
    editorApi.renderProfileEditor(profileSettingsEditor, profile, {
        inline: true,
        onSaved: (updated) => account.setProfile?.(updated),
        onCancel: () => {}
    });
    window.BlurCosmetics?.mountProfileSettings?.(profileSettingsEditor, profile);
}

function openProfileSettings() {
    if (typeof window.goToTab === "function") window.goToTab("settings");
    activateSettingsTab("profile");
    requestAnimationFrame(renderProfileSettingsEditor);
}

window.activateSettingsTab = activateSettingsTab;
window.renderProfileSettingsEditor = renderProfileSettingsEditor;
window.openProfileSettings = openProfileSettings;
window.showSettingsOverview = showSettingsOverview;

settingsPanel.querySelectorAll("[data-settings-overview-target]").forEach(button => {
    button.addEventListener("click", () => activateSettingsTab(button.dataset.settingsOverviewTarget));
});
settingsPanel.querySelector("[data-settings-back]")?.addEventListener("click", showSettingsOverview);
document.querySelectorAll('[data-tab="settings"]:not([data-settings-target])').forEach(link => {
    link.addEventListener("click", () => showSettingsOverview());
});

settingsTabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const editor = typeof AccountUI !== "undefined" ? AccountUI.activeEditor : null;
        if (button.dataset.tab !== "profile" && editor && !editor.attemptClose()) return;
        activateSettingsTab(button.dataset.tab);
        if (button.dataset.tab === "profile") requestAnimationFrame(renderProfileSettingsEditor);
    });
});

document.querySelector("[data-open-changelog]")?.addEventListener("click", () => {
    window.blurChangelog?.open?.();
});

document.querySelector("[data-open-responsible-use]")?.addEventListener("click", () => {
    window.blurResponsibleUse?.open?.();
});

// Credits are useful reference material but should stay out of the way until
// someone asks for them. Keep the disclosure local to the About page so it
// does not affect any other Settings section.
const aboutCredits = settingsPanel.querySelector(".about-credits");
const aboutCreditsToggle = aboutCredits?.querySelector("[data-about-credits-toggle]");
const syncAboutCredits = expanded => {
    if (!aboutCredits || !aboutCreditsToggle) return;
    aboutCredits.classList.toggle("is-expanded", expanded);
    aboutCreditsToggle.setAttribute("aria-expanded", String(expanded));
    aboutCreditsToggle.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} credits`);
};
aboutCreditsToggle?.addEventListener("click", () => {
    syncAboutCredits(!aboutCredits.classList.contains("is-expanded"));
});
syncAboutCredits(false);

// Open Settings on its destination overview; individual pages are selected
// explicitly by the overview rows or an existing deep-link target.
showSettingsOverview();

// If the global panel navigator re-renders/toggles Settings after this file
// initializes, restore a selection only when none is active. This preserves a
// user's selected tab while preventing the blank-active-state bug.
const settingsOpenObserver = new MutationObserver(() => {
    if (!settingsPanel.classList.contains("active")) {
        window.closeProfileSettingsEditor?.({ force: true });
        return;
    }
    if (settingsPanel.classList.contains("active") && !settingsOverviewVisible &&
        !settingsTabButtons.some(button => button.classList.contains("active"))) {
        activateSettingsTab("appearance");
    }
});
settingsOpenObserver.observe(settingsPanel, { attributes: true, attributeFilter: ["class"] });

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

// Scrollbar toggle has its own single source of truth. Other switches are
// bound by their feature-specific handlers above/below this section.
if (scrollbarToggle) {
    scrollbarToggle.addEventListener("click", () => {
        updateScrollbarSetting(!document.documentElement.classList.contains("hide-scrollbars"));
        scrollbarToggle.classList.toggle("on", document.documentElement.classList.contains("hide-scrollbars"));
        scrollbarToggle.setAttribute("aria-pressed", String(document.documentElement.classList.contains("hide-scrollbars")));
    });
}

// ============ THEMES ============

const PRESET_THEMES = [
    {
        id:"carbon",
        name:"Carbon",
        desc:"Dark & minimal",
        dots:["#0a0a09","#3a3a37","#c9c39a"]
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
        desc:"Forest image, moss UI",
        dots:["#07120b","#1c3b22","#83d66f"]
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
        id:"dusk",
        name:"Dusk",
        desc:"Deep blue twilight",
        dots:["#080a12","#18213a","#8ea5ff"]
    },

    {
        id:"cherryblossom",
        name:"Cherry Blossom",
        desc:"Light pink garden",
        dots:["#f7d6e2","#e39eb8","#cf5f87"]
    },

    
];

const EXCLUSIVE_THEME_CARD_COLORS = {
    earlyaccess: "#211313",
    atlas: "#1b1113",
    darqmarq: "#17100c",
    lalakers: "#1b1028",
    pixelblur: "#211d19"
};

const THEME_KEY = "blur-theme";
const CUSTOM_THEMES_KEY = "blur-custom-themes";

function getActiveThemeId(){
    const stored = localStorage.getItem(THEME_KEY);
    // Slate was replaced by Cherry Blossom; migrate existing selections so
    // users do not get stranded on a preset that no longer exists.
    if(stored === "slate"){
        localStorage.setItem(THEME_KEY, "cherryblossom");
        return "cherryblossom";
    }
    // Rose was too close to Early Access. Keep existing users on the new
    // Dusk palette instead of leaving them on a removed preset.
    if(stored === "rose"){
        localStorage.setItem(THEME_KEY, "dusk");
        return "dusk";
    }
    return stored || "carbon";
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
        "--bg","--sidebar","--surface","--surface-1","--surface-2","--surface-3",
        "--surface-hover","--surface-selected","--surface-active","--surface-raised","--site-control-surface",
        "--accent","--accent-hover","--accent-dim","--border","--border-subtle",
        "--border-strong","--text","--white","--muted","--muted-dim",
        "--text-primary","--text-secondary","--text-tertiary","--danger","--success"
    ].forEach(v => document.documentElement.style.removeProperty(v));
}

function applyCustomAccent(accent){
    // Do nothing - let themes.css handle it via data-theme attribute
    // This prevents inline styles from overriding the CSS
}

function applyTheme(id, opts={}){

    localStorage.setItem(THEME_KEY, id);

    if(id.startsWith("custom-") && opts.accent){
        document.documentElement.setAttribute("data-theme", id);
        applyCustomAccent(opts.accent);
    }else{
        clearCustomVars();
        document.documentElement.setAttribute("data-theme", id);
        applyInterfaceFont(selectedFont, { persist: false });
    }

    renderThemeGrids();

}

function makeThemeCard(theme, isCustom){

    const card = document.createElement("button");
    card.className = "theme-card";
    card.dataset.themeId = theme.id;
    const isExclusiveTheme = isCustom && Object.prototype.hasOwnProperty.call(EXCLUSIVE_THEME_CARD_COLORS, theme.id);

    // Exclusive themes use an intentional preview color, just like the
    // built-in Blur themes. Older/custom records still fall back gracefully
    // to their stored base swatch.
    if (isCustom) {
        const previewColor = EXCLUSIVE_THEME_CARD_COLORS[theme.id]
            || (Array.isArray(theme.dots) ? theme.dots[0] : "");
        if (/^#[0-9a-f]{6}$/i.test(previewColor || "")) {
            card.style.setProperty("background", previewColor, "important");
        }
    }

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

    // Redeemed exclusive themes are part of Blur's catalog, not user-created
    // themes. They must remain available and cannot be removed from the picker.
    if(isCustom && !isExclusiveTheme){
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


const COMMUNITY_THEMES_KEY = "blur-community-theme";
let communityThemesCache = [];
let communityThemeProfiles = new Map();

// Community themes use the same semantic surfaces as the rest of Blur. Keep
// these keys explicit so a creator can tune the full interface instead of
// choosing three vague swatches and hoping the derived colors work.
const COMMUNITY_THEME_COLOR_FIELDS = [
    { key: "background", label: "Background", group: "Backgrounds", default: "#0a0a09" },
    { key: "surface", label: "Surface", group: "Backgrounds", default: "#141412" },
    { key: "card", label: "Card", group: "Backgrounds", default: "#1a1a17" },
    { key: "hover", label: "Hover", group: "Backgrounds", default: "#212120" },
    { key: "input", label: "Input", group: "Backgrounds", default: "#121210" },
    { key: "sidebar", label: "Sidebar", group: "Backgrounds", default: "#0d0d0c" },
    { key: "text", label: "Text", group: "Text", default: "#f2f2ed" },
    { key: "textSecondary", label: "Text Secondary", group: "Text", default: "#96968d" },
    { key: "textMuted", label: "Text Muted", group: "Text", default: "#5c5c56" },
    { key: "accent", label: "Accent", group: "Accents", default: "#c9c39a" },
    { key: "accentHover", label: "Accent Hover", group: "Accents", default: "#d8d2a7" },
    { key: "border", label: "Border", group: "Accents", default: "#292925" },
    { key: "danger", label: "Danger", group: "Accents", default: "#e8938c" },
    { key: "success", label: "Success", group: "Accents", default: "#4fbf6b" }
];
const COMMUNITY_THEME_DEFAULTS = Object.fromEntries(
    COMMUNITY_THEME_COLOR_FIELDS.map(field => [field.key, field.default])
);

function settingsEscape(value){
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeCommunityTheme(theme){
    const rawColors = theme?.colors;
    const palette = { ...COMMUNITY_THEME_DEFAULTS };
    if (Array.isArray(rawColors)) {
        // Read themes created before the full palette editor existed.
        const legacy = rawColors.slice(0, 3).map(color => String(color || "").trim());
        if (legacy.length !== 3 || legacy.some(color => !/^#[0-9a-f]{6}$/i.test(color))) return null;
        palette.background = legacy[0];
        palette.surface = legacy[1];
        palette.card = legacy[1];
        palette.hover = legacy[1];
        palette.input = legacy[1];
        palette.sidebar = legacy[0];
        palette.accent = legacy[2];
        palette.accentHover = legacy[2];
    } else if (rawColors && typeof rawColors === "object") {
        COMMUNITY_THEME_COLOR_FIELDS.forEach(field => {
            const value = String(rawColors[field.key] || "").trim();
            if (/^#[0-9a-f]{6}$/i.test(value)) palette[field.key] = value;
        });
    } else {
        return null;
    }
    const colors = [palette.background, palette.surface, palette.accent];
    const font = Object.prototype.hasOwnProperty.call(FONT_OPTIONS, theme?.font)
        ? theme.font
        : "system";
    return {
        id: String(theme.id || ""),
        title: String(theme.title || "Untitled theme").trim().slice(0, 36),
        description: String(theme.description || "").trim().slice(0, 100),
        colors,
        palette,
        font,
        creator_id: String(theme.creator_id || ""),
        creator: theme.creator || null,
        created_at: theme.created_at || null
    };
}

function communityThemeIsLight(color){
    const hex = String(color || "").replace("#", "");
    if (hex.length !== 6) return false;
    const rgb = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = rgb.map(value => value <= .03928 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4));
    return (.2126 * linear[0]) + (.7152 * linear[1]) + (.0722 * linear[2]) > .55;
}

function applyCommunityThemeVars(theme){
    const normalized = normalizeCommunityTheme(theme);
    if (!normalized) return false;
    const palette = normalized.palette;
    const { background, surface, card, hover, input, sidebar, text, textSecondary, textMuted, accent, accentHover, border, danger, success } = palette;
    const light = communityThemeIsLight(background);
    clearCustomVars();
    document.documentElement.setAttribute("data-theme", "community");
    document.documentElement.style.setProperty("--bg", background);
    document.documentElement.style.setProperty("--sidebar", sidebar);
    document.documentElement.style.setProperty("--surface", surface);
    document.documentElement.style.setProperty("--surface-1", surface);
    document.documentElement.style.setProperty("--surface-2", card);
    document.documentElement.style.setProperty("--surface-3", hover);
    document.documentElement.style.setProperty("--surface-hover", hover);
    document.documentElement.style.setProperty("--surface-selected", card);
    document.documentElement.style.setProperty("--surface-active", card);
    document.documentElement.style.setProperty("--surface-raised", card);
    document.documentElement.style.setProperty("--site-control-surface", input);
    document.documentElement.style.setProperty("--text", text);
    document.documentElement.style.setProperty("--white", text);
    document.documentElement.style.setProperty("--muted", textSecondary);
    document.documentElement.style.setProperty("--muted-dim", textMuted);
    document.documentElement.style.setProperty("--text-primary", text);
    document.documentElement.style.setProperty("--text-secondary", textSecondary);
    document.documentElement.style.setProperty("--text-tertiary", textMuted);
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-hover", accentHover);
    document.documentElement.style.setProperty("--accent-dim", `color-mix(in srgb, ${accent} 18%, transparent)`);
    document.documentElement.style.setProperty("--border", border);
    document.documentElement.style.setProperty("--border-subtle", border);
    document.documentElement.style.setProperty("--border-strong", `color-mix(in srgb, ${border} 70%, ${text} 30%)`);
    document.documentElement.style.setProperty("--danger", danger);
    document.documentElement.style.setProperty("--success", success);
    applyInterfaceFont(normalized.font, { persist: false });
    return true;
}

function applyCommunityTheme(theme){
    const normalized = normalizeCommunityTheme(theme);
    if (!normalized || !applyCommunityThemeVars(normalized)) return;
    localStorage.setItem(THEME_KEY, `community-${normalized.id}`);
    localStorage.setItem(COMMUNITY_THEMES_KEY, JSON.stringify(normalized));
    renderThemeGrids();
}

function getSavedCommunityTheme(){
    try {
        return normalizeCommunityTheme(JSON.parse(localStorage.getItem(COMMUNITY_THEMES_KEY) || "null"));
    } catch {
        return null;
    }
}

function communityProfileOverlay(){
    let overlay = document.getElementById("settings-community-profile-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "settings-community-profile-overlay";
        document.body.appendChild(overlay);
    }
    return overlay;
}

function openCommunityThemeProfile(userId){
    if (!userId || typeof Profiles === "undefined" || typeof Account === "undefined") return;
    Profiles.renderProfilePopup(communityProfileOverlay(), userId, {
        isSelf: userId === Account.user?.id
    }).catch(error => console.error("Community theme profile failed:", error));
}

function makeCommunityCreateCard(){
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card community-theme-create";
    card.setAttribute("aria-label", "Create a community theme");
    card.innerHTML = `<span class="community-theme-create-icon" aria-hidden="true">+</span><span>Create Theme</span>`;
    card.addEventListener("click", openCommunityThemeCreator);
    return card;
}

function makeCommunityThemeCard(theme){
    const normalized = normalizeCommunityTheme(theme);
    if (!normalized) return null;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card community-theme-card";
    card.dataset.themeId = `community-${normalized.id}`;
    card.style.setProperty("background", normalized.colors[0], "important");
    if (getActiveThemeId() === `community-${normalized.id}`) card.classList.add("active");
    const creatorName = normalized.creator?.display_name || normalized.creator?.username || "Blur user";
    const isCreator = typeof Account !== "undefined" && Account.user?.id === normalized.creator_id;
    card.innerHTML = `
        <span class="community-theme-author" data-community-author="${settingsEscape(normalized.creator_id)}" role="button" tabindex="0" title="Open ${settingsEscape(creatorName)}'s profile">${settingsEscape(creatorName)}</span>
        <span class="community-theme-actions" aria-label="Theme actions">
            ${isCreator ? `<span class="community-theme-action community-theme-edit" data-community-edit title="Edit this theme" role="button" tabindex="0">Edit</span>` : ""}
        </span>
        <span class="theme-dots" aria-hidden="true">${normalized.colors.map(color => `<span style="background:${settingsEscape(color)}"></span>`).join("")}</span>
        <strong title="${settingsEscape(normalized.title)}">${settingsEscape(normalized.title)}</strong>
        <small>${settingsEscape(normalized.description || "Community theme")}</small>`;
    card.addEventListener("click", event => {
        if (event.target.closest("[data-community-author], [data-community-edit]")) return;
        applyCommunityTheme(normalized);
    });
    const author = card.querySelector("[data-community-author]");
    author?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openCommunityThemeProfile(normalized.creator_id);
    });
    author?.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        openCommunityThemeProfile(normalized.creator_id);
    });
    const editButton = card.querySelector("[data-community-edit]");
    const editTheme = event => {
        event.preventDefault();
        event.stopPropagation();
        if (!isCreator) return;
        openCommunityThemeCreator(normalized);
    };
    editButton?.addEventListener("click", editTheme);
    editButton?.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") editTheme(event);
    });
    return card;
}

function renderCommunityThemeGrid(){
    const grid = document.querySelector("[data-community-theme-grid]");
    if (!grid) return;
    grid.innerHTML = "";
    grid.appendChild(makeCommunityCreateCard());
    communityThemesCache.forEach(theme => {
        const card = makeCommunityThemeCard(theme);
        if (card) grid.appendChild(card);
    });
}

async function loadCommunityThemes(){
    const grid = document.querySelector("[data-community-theme-grid]");
    if (!grid || typeof sb === "undefined") return;
    renderCommunityThemeGrid();
    try {
        let result = await sb
            .from("community_themes")
            .select("id, title, description, colors, font, creator_id, created_at")
            .order("created_at", { ascending: false })
            .limit(60);
        // Keep older installations readable until the optional font column
        // migration has been run; those themes simply use the system font.
        if (result.error && /font|column/i.test(result.error.message || "")) {
            result = await sb
                .from("community_themes")
                .select("id, title, description, colors, creator_id, created_at")
                .order("created_at", { ascending: false })
                .limit(60);
        }
        const { data, error } = result;
        if (error) throw error;
        const rows = (data || []).map(normalizeCommunityTheme).filter(Boolean);
        const creatorIds = [...new Set(rows.map(theme => theme.creator_id).filter(Boolean))];
        let profiles = [];
        if (creatorIds.length) {
            const result = await sb.from("profiles").select("id, username, display_name, avatar_url").in("id", creatorIds);
            if (!result.error) profiles = result.data || [];
        }
        communityThemeProfiles = new Map(profiles.map(profile => [profile.id, profile]));
        communityThemesCache = rows.map(theme => ({ ...theme, creator: communityThemeProfiles.get(theme.creator_id) || null }));
        renderCommunityThemeGrid();
    } catch (error) {
        // The gallery remains usable with the create card when the optional
        // migration has not been run yet or the network is unavailable.
        console.warn("Community themes unavailable:", error?.message || error);
    }
}

function closeCommunityThemeCreator(){
    const overlay = document.getElementById("settings-community-theme-overlay");
    overlay?._settingsDropdownCleanup?.();
    overlay?.remove();
}

function communityThemeColorFieldMarkup(field, palette = COMMUNITY_THEME_DEFAULTS){
    const value = /^#[0-9a-f]{6}$/i.test(String(palette?.[field.key] || ""))
        ? String(palette[field.key]).toLowerCase()
        : field.default;
    return `<label class="community-theme-color-field">
        <input name="${field.key}" type="color" value="${settingsEscape(value)}" aria-label="${settingsEscape(field.label)} color">
        <span class="community-theme-color-copy"><strong>${settingsEscape(field.label)}</strong><code data-community-color-value="${field.key}">${settingsEscape(value)}</code></span>
    </label>`;
}

function communityThemePaletteMarkup(palette = COMMUNITY_THEME_DEFAULTS){
    return ["Backgrounds", "Text", "Accents"].map(group => {
        const fields = COMMUNITY_THEME_COLOR_FIELDS.filter(field => field.group === group);
        return `<fieldset class="community-theme-palette-group">
            <legend>${group}</legend>
            <div class="community-theme-palette-grid">${fields.map(field => communityThemeColorFieldMarkup(field, palette)).join("")}</div>
        </fieldset>`;
    }).join("");
}

function openCommunityThemeCreator(themeToEdit = null){
    if (typeof Account === "undefined" || !Account.user) {
        if (typeof AccountUI !== "undefined") AccountUI.openAuthOverlay?.("signin");
        return;
    }
    const editingTheme = normalizeCommunityTheme(themeToEdit);
    const canEdit = Boolean(editingTheme && editingTheme.creator_id === Account.user.id);
    closeCommunityThemeCreator();
    const overlay = document.createElement("div");
    overlay.id = "settings-community-theme-overlay";
    overlay.className = "community-theme-overlay ui-overlay is-open";
    overlay.innerHTML = `
        <section class="community-theme-dialog ui-dialog" role="dialog" aria-modal="true" aria-labelledby="community-theme-title">
            <button type="button" class="community-theme-close" data-community-theme-close aria-label="Close">×</button>
            <span class="settings-dialog-kicker">COMMUNITY THEMES</span>
            <h2 id="community-theme-title">${canEdit ? "Edit your theme" : "Create a theme"}</h2>
            <p class="community-theme-dialog-copy">${canEdit ? "Update the colors, type, or details of your theme." : "Choose the colors and type that make your version of Blur feel right."}</p>
            <form data-community-theme-form>
                <div class="community-theme-form-head">
                    <label>Name<input class="ui-input" type="text" name="title" maxlength="36" required placeholder="My Theme" value="${canEdit ? settingsEscape(editingTheme.title) : ""}"></label>
                    <label>Description<input class="ui-input" type="text" name="description" maxlength="100" placeholder="A short description" value="${canEdit ? settingsEscape(editingTheme.description) : ""}"></label>
                </div>
                <div class="community-theme-palette">${communityThemePaletteMarkup(canEdit ? editingTheme.palette : COMMUNITY_THEME_DEFAULTS)}</div>
                <label class="community-theme-font-field">Font
                    <select class="ui-select" name="font" aria-label="Theme font">${fontSelectOptionsMarkup()}</select>
                </label>
                <p class="community-theme-error" data-community-theme-error hidden></p>
                <div class="community-theme-actions"><button type="button" class="small-button danger ui-button ui-button--danger ui-button--sm community-theme-delete-from-editor" data-community-theme-delete${canEdit ? "" : " hidden"}>Delete</button><span class="community-theme-action-spacer"></span><button type="button" class="small-button ui-button ui-button--quiet ui-button--sm" data-community-theme-close>Cancel</button><button type="submit" class="small-button ui-button ui-button--primary ui-button--sm community-theme-publish">${canEdit ? "Save changes" : "Publish theme"}</button></div>
    </form>
        </section>`;
    document.body.appendChild(overlay);
    enhanceSettingsDropdowns(overlay);
    const themeFont = overlay.querySelector('select[name="font"]');
    if (themeFont && canEdit) {
        themeFont.value = editingTheme.font;
        themeFont.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const close = () => closeCommunityThemeCreator();
    overlay.addEventListener("click", event => {
        if (event.target === overlay || event.target.closest("[data-community-theme-close]")) close();
    });
    const editorError = overlay.querySelector("[data-community-theme-error]");
    const editorDelete = overlay.querySelector("[data-community-theme-delete]");
    editorDelete?.addEventListener("click", async event => {
        event.preventDefault();
        if (!canEdit || typeof sb === "undefined") return;
        if (!window.confirm(`Delete “${editingTheme.title}” for everyone?`)) return;
        editorDelete.disabled = true;
        editorDelete.textContent = "Deleting…";
        try {
            const { error } = await sb.from("community_themes").delete().eq("id", editingTheme.id).eq("creator_id", Account.user.id);
            if (error) throw error;
            if (getActiveThemeId() === `community-${editingTheme.id}`) {
                localStorage.removeItem(COMMUNITY_THEMES_KEY);
                applyTheme("carbon");
            }
            communityThemesCache = communityThemesCache.filter(item => item.id !== editingTheme.id);
            close();
            renderCommunityThemeGrid();
        } catch (error) {
            editorDelete.disabled = false;
            editorDelete.textContent = "Delete";
            editorError.textContent = error?.message || "Couldn't delete this theme.";
            editorError.hidden = false;
        }
    });
    overlay.querySelector("form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const errorBox = form.querySelector("[data-community-theme-error]");
        const title = String(form.elements.title.value || "").trim();
        const description = String(form.elements.description.value || "").trim();
        const palette = Object.fromEntries(COMMUNITY_THEME_COLOR_FIELDS.map(field => [field.key, String(form.elements[field.key]?.value || "").trim()]));
        const colors = Object.values(palette);
        const font = String(form.elements.font?.value || "system");
        errorBox.hidden = true;
        if (!title) {
            errorBox.textContent = "Give your theme a title first.";
            errorBox.hidden = false;
            return;
        }
        if (colors.length !== COMMUNITY_THEME_COLOR_FIELDS.length || colors.some(color => !/^#[0-9a-f]{6}$/i.test(color))) {
            errorBox.textContent = "Choose a valid color for every theme surface.";
            errorBox.hidden = false;
            return;
        }
        const submit = form.querySelector(".community-theme-publish");
        submit.disabled = true;
        submit.textContent = canEdit ? "Saving…" : "Publishing…";
        try {
            const payload = { title, description, colors: palette, font };
            const result = canEdit
                ? await sb.from("community_themes").update(payload).eq("id", editingTheme.id).eq("creator_id", Account.user.id)
                : await sb.from("community_themes").insert({ creator_id: Account.user.id, ...payload });
            const { error } = result;
            if (error) throw error;
            if (!canEdit && typeof Profiles !== "undefined" && typeof Profiles.grantBadge === "function") {
                try {
                    const updatedProfile = await Profiles.grantBadge(Account.user.id, "thememaker");
                    Account.setProfile(updatedProfile);
                } catch (badgeError) {
                    // Publishing remains successful even if an older database
                    // has not run the profile-badges migration yet.
                    console.warn("Theme Maker badge could not be saved:", badgeError?.message || badgeError);
                }
            }
            if (canEdit && getActiveThemeId() === `community-${editingTheme.id}`) {
                applyCommunityTheme({ ...editingTheme, title, description, colors: palette, font });
            }
            close();
            await loadCommunityThemes();
        } catch (error) {
            submit.disabled = false;
            submit.textContent = canEdit ? "Save changes" : "Publish theme";
            errorBox.textContent = /community_themes|relation .* does not exist/i.test(error?.message || "")
                ? "Community themes are not enabled yet. Run the Supabase migration first."
                : (error?.message || "Couldn't publish this theme.");
            errorBox.hidden = false;
        }
    });
}

function renderThemeGrids(){

    const presetGrid = document.querySelector("[data-theme-grid]");
    const customGrid = document.querySelector("[data-custom-theme-grid]");
    const exclusiveSection = document.querySelector("[data-exclusive-theme-section]");

    if(!presetGrid || !customGrid) return;

    presetGrid.innerHTML = "";
    customGrid.innerHTML = "";

    PRESET_THEMES.forEach(theme=>{
        presetGrid.appendChild(makeThemeCard(theme, false));
    });

    const customThemes = getCustomThemes();
    if (exclusiveSection) {
        exclusiveSection.hidden = customThemes.length === 0;
    }

    customThemes.forEach(theme=>{
        customGrid.appendChild(makeThemeCard(theme, true));
    });

    renderCommunityThemeGrid();

    // customGrid.appendChild(makeCreateCard());

}

function initTheme(){

    const activeId = getActiveThemeId();
    const custom = getCustomThemes().find(t=>t.id===activeId);
    const community = getSavedCommunityTheme();

    if (activeId.startsWith("community-") && community?.id === activeId.slice("community-".length)) {
        applyCommunityThemeVars(community);
    } else {
        document.documentElement.setAttribute("data-theme", activeId);
        applyInterfaceFont(selectedFont, { persist: false });
    }

    if(custom){
        applyCustomAccent(custom.accent);
    }

    renderThemeGrids();

}

initTheme();

// Settings loads before the shared account client in index.html. Wait until
// the account service is ready so the gallery can query public themes while
// still keeping the create action account-gated.
window.addEventListener("load", () => {
    if (typeof Account !== "undefined" && Account.ready) Account.ready.then(loadCommunityThemes).catch(() => {});
});

// =============================
// TAB CLOAKING
// =============================


const CLOAK_ENABLED = "blur-cloak-enabled";
const CLOAK_TYPE = "blur-cloak-type";


const cloakData = {
    docs: {
        title: "Google Docs",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-docs-2026/default.svg"
    },

    drive: {
        title: "Google Drive",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-drive-2026/default.svg"
    },

    search: {
        title: "Google Search",
        icon: "https://www.gstatic.com/images/branding/googleg_gradient/1x/googleg_gradient_standard_20dp.png"
    },

    classroom: {
        title: "Google Classroom",
        icon: "https://ssl.gstatic.com/classroom/favicon.png"
    },

    sheets: {
        title: "Google Sheets",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-sheets-2026/default.svg"
    },

    slides: {
        title: "Google Slides",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-slides-2026/default.svg"
    },

    forms: {
        title: "Google Forms",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-forms-2026/default.svg"
    },

    gmail: {
        title: "Gmail",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/gmail-2026/default.svg"
    },

    calendar: {
        title: "Google Calendar",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-calendar-2026/default.svg"
    },

    meet: {
        title: "Google Meet",
        icon: "https://cdn.jsdelivr.net/gh/glincker/thesvg@484a2a5c2750cedd1c6da66c2b9a3b099f491a4f/public/icons/google-meet-2026/default.svg"
    },

    clever: {
        title: "Clever",
        icon: "https://www.clever.com/wp-content/uploads/2023/06/cropped-Favicon-512px-32x32.png"
    },

    iready: {
        title: "i-Ready",
        icon: "https://login.i-ready.com/favicon.ico"
    },

    khan: {
        title: "Khan Academy",
        icon: "https://www.khanacademy.org/favicon.ico"
    },

canvas: {
    title: "Canvas",
    icon: "https://www.google.com/s2/favicons?domain=canvas.instructure.com&sz=64"
},

    schoology: {
        title: "Schoology",
        icon: "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico"
    },

    microsoft: {
        title: "Microsoft 365",
        icon: "https://www.microsoft.com/favicon.ico"
    },

    word: {
        title: "Microsoft Word",
        icon: "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/item-types/32/docx.svg"
    },

    powerpoint: {
        title: "PowerPoint",
        icon: "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/item-types/32/pptx.svg"
    },

    onedrive: {
        title: "OneDrive",
        icon: "https://onedrive.live.com/favicon.ico"
    },

    calculator: {
        title: "Calculator",
        icon: "assets/favicon.ico"
    },

    translate: {
        title: "Google Translate",
        icon: "https://www.gstatic.com/translate/favicon.ico"
    },

    maps: {
        title: "Google Maps",
        icon: "https://www.google.com/images/branding/product/ico/web_maps_icon_32dp.ico"
    },

    wikipedia: {
        title: "Wikipedia",
        icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico"
    },

    blank: {
        title: "New Tab",
        icon: "assets/favicon.ico"
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

// Same-origin history entries keep the browser's back-stack looking like a
// normal study session before the final panic destination replaces the
// current entry.  The browser intentionally blocks pushState() to other
// origins, so these are neutral Blur paths styled as familiar school tools.
const PANIC_HISTORY_ENTRIES = [
    ["Clever", "/classroom/clever", "https://www.clever.com/wp-content/uploads/2023/06/cropped-Favicon-512px-32x32.png"],
    ["Google Classroom", "/classroom", "https://ssl.gstatic.com/classroom/favicon.png"],
    ["Khan Academy", "/study/khan-academy", "https://www.khanacademy.org/favicon.ico"],
    ["i-Ready", "/math/iready", "https://login.i-ready.com/favicon.ico"],
    ["Quizlet", "/study/quizlet", "https://quizlet.com/favicon.ico"],
    ["Desmos", "/math/desmos", "https://www.desmos.com/favicon.ico"],
    ["Canvas", "/courses", "https://www.google.com/s2/favicons?domain=canvas.instructure.com&sz=64"],
    ["Edpuzzle", "/lessons/edpuzzle", "https://edpuzzle.com/favicon.ico"],
    ["Schoology", "/courses/schoology", "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico"],
    ["Nearpod", "/lessons/nearpod", "https://nearpod.com/favicon.ico"]
];
let panicHistoryInProgress = false;

function setPanicFavicon(value){
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
    }
    const nextValue = value || DEFAULT_ICON;
    // index.html declares the normal logo as PNG.  Explicitly switch the
    // MIME type for the temporary SVG cover icons; otherwise Chromium keeps
    // displaying the existing Blur icon even though href changed.
    if (String(nextValue).startsWith("data:image/svg+xml")) {
        favicon.type = "image/svg+xml";
    } else {
        favicon.type = "image/png";
    }
    favicon.href = nextValue;
}

function panicFaviconData(title, index){
    const palette = ["#4b7bec", "#35a66f", "#8e6bd9", "#e58b32", "#d95757"];
    const letter = String(title || "S").trim().charAt(0).toUpperCase() || "S";
    const color = palette[index % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="white">${letter}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function seedPanicHistory(onComplete){
    if (panicHistoryInProgress) return;
    panicHistoryInProgress = true;
    const originalTitle = document.title;
    let index = 0;

    const addEntry = () => {
        if (index >= PANIC_HISTORY_ENTRIES.length) {
            panicHistoryInProgress = false;
            document.title = originalTitle;
            onComplete?.();
            return;
        }
        const [title, path] = PANIC_HISTORY_ENTRIES[index];
        const entryIndex = index++;
        try {
            document.title = title;
            setPanicFavicon(panicFaviconData(title, entryIndex));
            history.pushState({ panicCover: true }, "", `${path}?view=study`);
        } catch (error) {
            // History seeding is best-effort; the configured destination must
            // still open even if a browser blocks one of the entries.
        }
        // Give the browser enough time to repaint the title and favicon before
        // the next cover entry is pushed.  Very short timers are commonly
        // coalesced, which made the tab appear to keep Blur's favicon.
        window.setTimeout(addEntry, 160);
    };

    addEntry();
}

const PANIC_KEY_LABELS = {
    "`": "backtick", "~": "tilde", "!": "exclamation mark", "@": "at sign",
    "#": "hash", "$": "dollar sign", "%": "percent", "^": "caret",
    "&": "ampersand", "*": "asterisk", "(": "left parenthesis", ")": "right parenthesis",
    "-": "hyphen", "_": "underscore", "=": "equals", "+": "plus",
    "[": "left bracket", "]": "right bracket", "{": "left brace", "}": "right brace",
    "\\": "backslash", "|": "vertical bar", ";": "semicolon", ":": "colon",
    "'": "apostrophe", "\"": "quotation mark", ",": "comma", "<": "less than",
    ".": "period", ">": "greater than", "/": "slash", "?": "question mark",
    " ": "space", ESCAPE: "escape", ENTER: "enter", TAB: "tab", BACKSPACE: "backspace",
    DELETE: "delete", INSERT: "insert", HOME: "home", END: "end", PAGEUP: "page up",
    PAGEDOWN: "page down", ARROWUP: "up arrow", ARROWDOWN: "down arrow",
    ARROWLEFT: "left arrow", ARROWRIGHT: "right arrow", CAPSLOCK: "caps lock",
    NUMLOCK: "num lock", SCROLLLOCK: "scroll lock", PAUSE: "pause", PRINTSCREEN: "print screen",
    CONTEXTMENU: "context menu", ALTGRAPH: "alt graph"
};

function formatPanicKeyLabel(key) {
    const value = String(key ?? "");
    const name = PANIC_KEY_LABELS[value] || PANIC_KEY_LABELS[value.toUpperCase()];
    if (!name) return value;
    const isCharacter = value.length === 1;
    if (value === " ") return `[${name}]`;
    if (isCharacter) return `[${name}] ${value}`;
    const symbol = ({
        ARROWUP: "↑", ARROWDOWN: "↓", ARROWLEFT: "←", ARROWRIGHT: "→"
    })[value.toUpperCase()];
    return symbol ? `[${name}] ${symbol}` : `[${name}]`;
}


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
    formatPanicKeyLabel(localStorage.getItem(PANIC_KEY) || "P");



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
            formatPanicKeyLabel(key);


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
            url = "https://" + url;
        }

        e.preventDefault();
        seedPanicHistory(() => window.location.replace(url));
        return;

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


// Browsers also dispatch window.blur when focus moves into a cross-origin
// iframe. Movie players and game embeds rely on that behavior, so treating
// every blur as leaving Blur incorrectly covered the page while media was
// still in use. Defer the check long enough for activeElement to become the
// iframe, and only show the privacy screen for a true page/window blur.
function isEmbeddedContentFocused(){
    const active = document.activeElement;
    return active?.tagName === "IFRAME" || !!active?.closest?.("iframe, embed, object");
}

window.addEventListener("blur",()=>{
    window.setTimeout(()=>{
        if (!isEmbeddedContentFocused()) showPrivacyScreen();
    }, 40);
});


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

// AI personality/custom instructions were intentionally removed. Clear any
// value saved by older builds so it cannot remain as a hidden preference.
try { localStorage.removeItem("blur-ai-personality"); } catch (e) {}

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
    performanceToggle.setAttribute("aria-pressed", String(enabled));


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
        performanceToggle.setAttribute("aria-pressed", String(state));


        localStorage.setItem(
            PERFORMANCE_KEY,
            state
        );


        document.documentElement.classList.toggle(
            "performance-mode",
            state
        );

        window.dispatchEvent(new CustomEvent("blur-performance-mode-change", {
            detail: { enabled: state }
        }));


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
"reset-modal ui-overlay";


resetModal.innerHTML = `

<div class="reset-card ui-dialog ui-dialog--compact">

    <h2>
        Reset Blur?
    </h2>


    <p>
        This will delete ALL of the local data stored on this device.
    </p>


    <div class="reset-actions">

        <button class="small-button ui-button ui-button--quiet ui-button--sm" data-cancel-reset>
            Cancel
        </button>


        <button class="small-button danger ui-button ui-button--danger ui-button--sm" data-confirm-reset>
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
