// Minimal greeting
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Reversible shutdown notice. Leave this false while the decision is still
   being considered; the console helpers make it easy to preview without
   removing or disabling any of Blur's existing code. */
const BLUR_SHUTDOWN_MODE = false;
const shutdownOverlay = document.getElementById("blur-shutdown-overlay");
const shutdownMainPage = shutdownOverlay?.querySelector(".blur-shutdown-letter:not(.blur-shutdown-mod-page)");
const shutdownModPage = document.getElementById("blur-shutdown-mod-page");
const showShutdownModPage = () => {
  if (!shutdownOverlay || !shutdownMainPage || !shutdownModPage) return;
  shutdownMainPage.hidden = true;
  shutdownModPage.hidden = false;
};
const showShutdownMainPage = () => {
  if (!shutdownOverlay || !shutdownMainPage || !shutdownModPage) return;
  shutdownMainPage.hidden = false;
  shutdownModPage.hidden = true;
};
window.setBlurShutdownNotice = function(enabled = true){
  const overlay = shutdownOverlay;
  if (!overlay) return false;
  const active = Boolean(enabled);
  overlay.hidden = !active;
  overlay.setAttribute("aria-hidden", String(!active));
  document.documentElement.classList.toggle("blur-shutdown-active", active);
  document.body.classList.toggle("blur-shutdown-active", active);
  if (!active) showShutdownMainPage();
  return active;
};
window.enableBlurShutdown = () => window.setBlurShutdownNotice(true);
window.disableBlurShutdown = () => window.setBlurShutdownNotice(false);
shutdownOverlay?.querySelector("[data-blur-mod-note]")?.addEventListener("click", showShutdownModPage);
shutdownOverlay?.querySelector("[data-blur-mod-back]")?.addEventListener("click", showShutdownMainPage);
window.addEventListener("keydown", event => {
  if (event.key.toLowerCase() !== "v" || shutdownOverlay?.hidden) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  event.preventDefault();
  showShutdownModPage();
});
if (BLUR_SHUTDOWN_MODE) window.enableBlurShutdown();

/* tilt + spotlight on the quick-action cards */
const cards = document.querySelectorAll(".action-card");

if(!reduceMotion){

  cards.forEach(card=>{

    card.addEventListener("pointermove", e=>{

      if (document.documentElement.classList.contains("performance-mode")) return;

      const box = card.getBoundingClientRect();

      const px = (e.clientX - box.left) / box.width;
      const py = (e.clientY - box.top) / box.height;

      const rx = (py - 0.5) * -8;
      const ry = (px - 0.5) * 8;

      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.setProperty("--s", "1.03");

    });

    card.addEventListener("pointerleave", ()=>{

      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--s", "1");

    });

  });

}


/* ============ TABS ============ */

const navLinks = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");

function goToTab(name){

  const target = document.querySelector(`[data-panel="${name}"]`);
  if(!target) return;

  // Profile settings is an inline editor mounted inside the Settings panel.
  // Tear it down before leaving Settings so it cannot remain mounted or be
  // resurrected by an account/profile update while another tab is visible.
  if(name !== "settings" && typeof window.closeProfileSettingsEditor === "function"){
    window.closeProfileSettingsEditor({ force: true });
  }

  // Auth is global. Close a sign-in overlay when navigation moves to a
  // different surface so it cannot stack with a tab's own auth state.
  if(name !== "account" && typeof AccountUI !== "undefined" && AccountUI.closeAuthOverlay){
    AccountUI.closeAuthOverlay();
  }

  // Chat keeps a few body-level popovers (reaction picker, message actions,
  // attachment menu, media preview) so they are not clipped by its layout.
  // Always dismiss those transient layers before leaving Chat; otherwise one
  // can remain over another Blur tab and swallow its clicks.
  if(name !== "chat" && typeof Chat !== "undefined" && Chat.closeTransientUI){
    Chat.closeTransientUI();
  }

  panels.forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  if (typeof window.updateMusicFloatingPlayer === "function") {
    window.updateMusicFloatingPlayer(name);
  }

  navLinks.forEach(link => {
    let active = link.dataset.tab === name;
    // The account/profile entry opens the Settings panel's Profile page, but
    // the sidebar should present Settings as the single active destination.
    if (name === "settings" && link.dataset.tab === "settings") {
      active = link.classList.contains("acct-settings");
    }
    link.classList.toggle("active", active);
  });

  target.scrollTop = 0;



  // initialize lazy-loaded apps when opened
  if(name === "games" && window.initGames){
    window.initGames();
  }

}

navLinks.forEach(link=>{

  link.addEventListener("click", (event)=>{
    // These are in-app tab links. Some (like the Browser agreement links)
    // have a hash href for link semantics, but must never trigger document
    // navigation/reload after the SPA tab switch.
    event.preventDefault();
    goToTab(link.dataset.tab);
    if (link.dataset.tab === "settings" && link.dataset.settingsTarget && typeof window.activateSettingsTab === "function") {
      window.activateSettingsTab(link.dataset.settingsTarget);
    }
  });

});

/* ============ RESIZABLE SIDEBAR ============
   Drag the outer edge to resize the navigation. Pulling it close to the
   rail collapses it; the chosen width is remembered in this browser. */
const sidebar = document.querySelector(".sidebar");
const sidebarResizeHandle = document.getElementById("sidebar-resize-handle");
const SIDEBAR_WIDTH_KEY = "blur-sidebar-width";
const SIDEBAR_STATE_KEY = "blur-sidebar-expanded";
const SIDEBAR_RAIL_WIDTH = 68;
const SIDEBAR_COLLAPSE_THRESHOLD = 136;
const SIDEBAR_MIN_WIDTH = 186;
const SIDEBAR_MAX_WIDTH = 320;
let sidebarWidth = SIDEBAR_RAIL_WIDTH;
let sidebarPointerId = null;

function applySidebarWidth(nextWidth){
  const root = document.documentElement;
  const expanded = Number(nextWidth) >= SIDEBAR_COLLAPSE_THRESHOLD;
  sidebarWidth = expanded
    ? Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(Number(nextWidth))))
    : SIDEBAR_RAIL_WIDTH;

  root.classList.toggle("sidebar-expanded", expanded);
  // Other full-screen elements use these offsets to align with the sidebar.
  root.style.setProperty("--sidebar-rail", `${sidebarWidth}px`);
  root.style.setProperty("--sidebar-wide", `${sidebarWidth}px`);

  if(sidebarResizeHandle){
    sidebarResizeHandle.setAttribute("aria-valuenow", String(sidebarWidth));
    sidebarResizeHandle.setAttribute("aria-valuetext", expanded ? `${sidebarWidth} pixels wide` : "Collapsed to icon rail");
  }
  return sidebarWidth;
}

function saveSidebarWidth(){
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarWidth > SIDEBAR_RAIL_WIDTH));
  } catch(e) {}
}

let initialSidebarWidth = SIDEBAR_RAIL_WIDTH;
try {
  const savedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if(Number.isFinite(savedWidth) && savedWidth > 0){
    initialSidebarWidth = savedWidth;
  } else if(localStorage.getItem(SIDEBAR_STATE_KEY) === "true"){
    initialSidebarWidth = 216;
  }
} catch(e) {}
applySidebarWidth(initialSidebarWidth);

function resizeSidebarFromPointer(event){
  if(!sidebar) return;
  const proposedWidth = event.clientX - sidebar.getBoundingClientRect().left;
  applySidebarWidth(proposedWidth);
}

function finishSidebarResize(event){
  if(sidebarPointerId === null || (event && event.pointerId !== sidebarPointerId)) return;
  sidebarPointerId = null;
  document.documentElement.classList.remove("sidebar-resizing");
  saveSidebarWidth();
}

sidebarResizeHandle?.addEventListener("pointerdown", event=>{
  if(event.button !== 0) return;
  event.preventDefault();
  sidebarPointerId = event.pointerId;
  sidebarResizeHandle.setPointerCapture(event.pointerId);
  document.documentElement.classList.add("sidebar-resizing");
});

sidebarResizeHandle?.addEventListener("pointermove", event=>{
  if(event.pointerId === sidebarPointerId) resizeSidebarFromPointer(event);
});
sidebarResizeHandle?.addEventListener("pointerup", finishSidebarResize);
sidebarResizeHandle?.addEventListener("pointercancel", finishSidebarResize);

sidebarResizeHandle?.addEventListener("keydown", event=>{
  let nextWidth = sidebarWidth;
  if(event.key === "ArrowLeft") nextWidth = sidebarWidth - 16;
  else if(event.key === "ArrowRight") nextWidth = sidebarWidth + 16;
  else if(event.key === "Home") nextWidth = SIDEBAR_RAIL_WIDTH;
  else if(event.key === "End") nextWidth = SIDEBAR_MAX_WIDTH;
  else return;
  event.preventDefault();
  applySidebarWidth(nextWidth);
  saveSidebarWidth();
});

/* ============ AFK AWARENESS ============
   A quiet global pause screen for long idle sessions. Media is paused and
   resumed only for elements that were playing when AFK activated. */
const AFK_AWARENESS_STORAGE = "blur-afk-delay";
const afkMessages = [
  "come back", "i miss you", "is anyone home?", "it gets lonely here",
  "ready when you are", "take your time", "we’ll be here"
];
const afkRareMessages = ["its a %1 of getting this message btw, congrats"];
let afkTimer = null;
let afkCycleTimer = null;
let afkOverlay = null;
let afkPausedMedia = [];
let afkMessageIndex = 0;

function afkDelayMs(){
  let value = "10";
  try { value = localStorage.getItem(AFK_AWARENESS_STORAGE) || value; } catch (e) {}
  return value === "off" ? 0 : Math.max(1, Number(value) || 10) * 60 * 1000;
}

function afkResetTimer(){
  clearTimeout(afkTimer);
  if (afkOverlay) return;
  const delay = afkDelayMs();
  if (delay) afkTimer = setTimeout(activateAfk, delay);
}

function afkSetMessage(){
  if (!afkOverlay) return;
  const rare = Math.random() < 0.01;
  const message = rare ? afkRareMessages[Math.floor(Math.random() * afkRareMessages.length)] : afkMessages[afkMessageIndex++ % afkMessages.length];
  const sub = afkOverlay.querySelector("[data-afk-message]");
  if (sub) sub.textContent = message;
}

function activateAfk(){
  if (afkOverlay || !afkDelayMs()) return;
  afkPausedMedia = [...document.querySelectorAll("audio, video")].filter(media => !media.paused).map(media => ({ media, time: media.currentTime }));
  afkPausedMedia.forEach(({ media }) => { try { media.pause(); } catch (e) {} });
  afkOverlay = document.createElement("div");
  afkOverlay.className = "afk-overlay";
  afkOverlay.innerHTML = `<div class="afk-card" role="dialog" aria-modal="true" aria-label="Away from Blur"><div class="afk-title">AFK</div><div class="afk-message" data-afk-message></div><button type="button" class="afk-resume" data-afk-resume>Resume</button></div>`;
  document.body.appendChild(afkOverlay);
  afkMessageIndex = 0;
  afkSetMessage();
  afkCycleTimer = setInterval(afkSetMessage, 20000);
  afkOverlay.querySelector("[data-afk-resume]")?.addEventListener("click", deactivateAfk);
  afkOverlay.querySelector("[data-afk-resume]")?.focus();
}

function deactivateAfk(){
  clearInterval(afkCycleTimer);
  afkCycleTimer = null;
  afkOverlay?.remove();
  afkOverlay = null;
  const media = afkPausedMedia;
  afkPausedMedia = [];
  media.forEach(({ media, time }) => {
    try { media.currentTime = time; const play = media.play(); if (play?.catch) play.catch(() => {}); } catch (e) {}
  });
  afkResetTimer();
}

function afkActivity(){
  if (!afkOverlay) afkResetTimer();
}

["pointerdown", "keydown", "touchstart", "wheel"].forEach(type => document.addEventListener(type, afkActivity, { passive: true }));
document.addEventListener("blur-afk-setting-change", () => {
  if (afkOverlay && !afkDelayMs()) deactivateAfk();
  afkResetTimer();
});
afkResetTimer();

/* quick-action cards on the home tab jump straight to a tab */
document.querySelectorAll("[data-goto]").forEach(el=>{

  el.addEventListener("click", ()=>{
    goToTab(el.dataset.goto);
  });

});


/* ============ SETTINGS TOGGLES ============ */

document.querySelectorAll("[data-switch]").forEach(btn=>{

  btn.addEventListener("click", ()=>{

    btn.classList.toggle("on");

    if(btn.dataset.switch === "reduceMotion"){
      document.body.classList.toggle("force-reduce-motion", btn.classList.contains("on"));
    }

  });

});

const taglines = [
  "sooo why arent you doing work",
  "lemme lemme tell u smth -marq",
  "i own you",
  "blur on top",
  "doin anything but work atp",
  "ts so goated fr",
  "uhh idk",
  "launching a nuke to ur location rn btw",
  "the dude who made this site is pretty cool✌️",
  "play geometry dash rn",
  "sonion",
  "join da discord",
  "join the discord big dawg🥹",
  "this site is so ✨LE sussy✨ BOII-",
  "bring ur own snacks",
  "r u serious",
  "gimme money",
  "long time no see",
  "dm me on dc if u wanna partner or sum shi",
  "SONda civic💔🙏😭",
  "im sayin🥀🥀🥀",
  "shut the fuck up",
  "gimme suggestions plsss",
  "goattttt",
  "loading failed: punch ur chromebook.",
  "schlawg",
  "rip zawg 🕊️💔",
  "refresh to see a different message",
  "you get a cookie!!!",
  "whats ur password?",
  "67",
  "splash text",
  "congrats u found a rare message",
  "do ur homework bro",
  "fairs 👌",
  "no ads cause im lowk the goat i think",
  "pls lmk if anyone finds any bugs",
  "press power + esc + reload, it gives you $10000",
  "guys we got 4k+ games now wow",
  "long live travelers domain🙏",
  "muahahahaaahaahhhaaa",
  "guys i need money to make the browser work pls",
  "darqmarq da goat fr",
];


const tagline = document.getElementById("home-tagline");
let currentTaglineRaw = "";

// Home status timer: use the deployed document's Last-Modified timestamp so
// every visitor sees the same "time since update" value. The fallback keeps
// the timer useful on hosts that do not expose that response header.
const homeLastUpdate = document.getElementById("home-last-update");
const homeUpdateFallback = Date.parse("2026-10-05T13:39:47Z");
let homeUpdateStartedAt = Number.isFinite(homeUpdateFallback) ? homeUpdateFallback : Date.now();
function renderHomeUpdateTimer() {
  if (!homeLastUpdate) return;
  const elapsed = Math.max(0, Math.floor((Date.now() - homeUpdateStartedAt) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  homeLastUpdate.textContent = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
renderHomeUpdateTimer();
if (homeLastUpdate) window.setInterval(renderHomeUpdateTimer, 1000);

// Firebase Hosting (and the local static server used for previews) exposes
// the deployed index's Last-Modified header. Resolve it once per page load;
// if a host strips the header, the checked-in fallback above is used.
if (homeLastUpdate) {
  fetch(new URL("index.html", window.location.href).href, { method: "HEAD", cache: "no-store" })
    .then(response => {
      const updatedAt = Date.parse(response.headers.get("last-modified") || "");
      if (response.ok && Number.isFinite(updatedAt)) {
        homeUpdateStartedAt = updatedAt;
        renderHomeUpdateTimer();
      }
    })
    .catch(() => { /* keep the checked-in fallback */ });
}

function displayTagline(text){
  return window.BlurTextFilter?.censor ? window.BlurTextFilter.censor(text) : text;
}


function changeTagline(){

    if(!tagline) return;


    let current = currentTaglineRaw || tagline.textContent;

    let next;

    do {
        next = taglines[
            Math.floor(Math.random() * taglines.length)
        ];
    } while(next === current);


    tagline.classList.add("changing");


    setTimeout(()=>{

        currentTaglineRaw = next;
        tagline.textContent = displayTagline(next);

        tagline.classList.remove("changing");

    },200);

}



if(tagline){

    changeTagline();


    tagline.addEventListener(
        "click",
        changeTagline
    );

}

document.addEventListener("blur-profanity-change", () => {
  if (tagline && currentTaglineRaw) tagline.textContent = displayTagline(currentTaglineRaw);
});

(function(){
    const toast = document.getElementById('beta-toast');
    const closeBtn = document.getElementById('beta-toast-close');

    if(!toast || !closeBtn) return;

    const DISMISS_KEY = "blur-beta-toast-dismissed";

    if(localStorage.getItem(DISMISS_KEY) === "1"){
        toast.remove();
        return;
    }

    requestAnimationFrame(() => {
        setTimeout(() => toast.classList.add('show'), 300);
    });

    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');

        localStorage.setItem(DISMISS_KEY, "1");

        setTimeout(() => toast.remove(), 400);
    });
})();

/* Announcement + server-restart broadcast handling now lives in
   announcements.js (window.setupAnnouncementSystem), so it isn't
   duplicated here anymore. Just make sure announcements.js is
   loaded on every page that should show broadcasts, not only the
   dev panel page — it self-starts its realtime listeners as soon
   as window.sb is ready. */
if(window.sb && window.setupAnnouncementSystem){
  window.setupAnnouncementSystem(document);
}

/* =========================================================
   404 — Blur is a tab-based SPA served by Firebase rewrites,
   so any unknown path still loads index.html. When the path
   isn't a real route, show the 404 panel instead of Home.
   ========================================================= */

(function(){
    function pathIsNotFound(){
        const path = location.pathname.replace(/\/+$/, '').toLowerCase();
        return path !== '' && path !== '/' && path !== '/index.html';
    }

    function activatePanel(name){
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const target = document.querySelector(`[data-panel="${name}"]`);
        if (target) target.classList.add('active');
    }

    function showNotFound(){
        activatePanel('notfound');
        document.querySelectorAll('nav a, .bottom a, .acct-settings').forEach(a => a.classList.remove('active'));
    }

    if (pathIsNotFound()){
        showNotFound();
        const back = document.getElementById('nfBackBtn');
        if (back){
            back.addEventListener('click', function(){
                history.replaceState(null, '', '/');
                activatePanel('home');
                document.querySelectorAll('nav a').forEach(a => {
                    a.classList.toggle('active', a.dataset.tab === 'home');
                });
            });
        }
    }
})();
