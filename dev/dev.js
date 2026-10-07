// ======================================================
// BLUR DEV CONSOLE
// Hidden developer control panel — flat instrument-panel edition
// ======================================================

const DEV_PASSWORD = "blur";
const DEV_AUTH_KEY = "blur-dev-auth";

class BlurDev {

  constructor(){
    this.root = null;
    this.panel = null;
    this.drag = {
      active:false,
      x:0,
      y:0
    };
    this.clockTimer = null;
    this.init();
  }

  init(){
    this.create();
    this.bind();
  }

  create(){

    this.root=document.createElement("div");
    this.root.className="dev-root";

    this.root.innerHTML=`

      <div class="dev-login-layer">
        <div class="dev-login-card">

          <div class="dev-brand">
            <img class="dev-logo" src="assets/images/logo.png" alt="Blur">
            <div>
              <h1>Blur Dev</h1>
              <p>Restricted developer access</p>
            </div>
          </div>

          <div class="dev-prompt-line">
            <span class="dev-prompt-caret">&gt;</span>
            <span>authenticate --user=dev</span>
          </div>

          <label class="dev-field-label">Password</label>
          <div class="dev-input-wrap">
            <input
              type="password"
              placeholder="Enter password"
              class="dev-password"
              autocomplete="off"
            >
          </div>

          <button class="dev-login-submit">Unlock console<span class="dev-kbd">Enter</span></button>

          <div class="dev-login-error"></div>

        </div>
      </div>


      <div class="dev-window">

        <div class="dev-titlebar">

          <div class="dev-title">
            <img class="dev-mini-logo" src="assets/images/logo.png" alt="Blur">
            <div class="dev-title-text">
              <div class="dev-address"><i class="dev-live-dot"></i><span id="dev-address-path">Blur Dev Panel [UNFINISHED]</span></div>
              <span class="dev-clock" id="dev-clock">00:00:00</span>
            </div>
          </div>

          <div class="dev-actions">
            <button class="dev-minimize" aria-label="Minimize">${this.icon("minimize")}</button>
            <button class="dev-close" aria-label="Close">${this.icon("close")}</button>
          </div>

        </div>

        <div class="dev-body">

          <aside class="dev-sidebar collapsed">
            <div class="dev-nav-label">Menu</div>
            <button class="active" data-page="dashboard" aria-label="Dashboard" title="Dashboard">${this.icon("dashboard")}<span>Dashboard</span></button>
            <button data-page="analytics" aria-label="Analytics" title="Analytics">${this.icon("analytics")}<span>Analytics</span></button>
            <button data-page="ratings" aria-label="Game ratings" title="Game ratings">${this.icon("ratings")}<span>Game ratings</span></button>
            <button data-page="events" aria-label="Events" title="Events">${this.icon("events")}<span>Events</span></button>
            <button data-page="announcements" aria-label="Announcements" title="Announcements">${this.icon("announcements")}<span>Announcements</span></button>
            <button data-page="tools" aria-label="Tools" title="Tools">${this.icon("tools")}<span>Tools [WIP]</span></button>
            <button type="button" class="dev-sidebar-toggle" aria-label="Expand sidebar" aria-expanded="false">${this.icon("chevron-right")}</button>
          </aside>

          <main class="dev-main">

            <section class="dev-page active">
              <div class="dev-hero">
                <div class="dev-eyebrow">${this.icon("spark")}System status</div>
                <h2>Welcome back, Developer.</h2>
                <p>Manage global tools and broadcasts from one place.</p>
              </div>

<div class="dev-console-strip">
  <div class="dev-console-item">
    <span class="dev-status-dot"></span>
    <div>
      <small>Session</small>
      <strong>Active</strong>
    </div>
  </div>

  <div class="dev-console-item">
    <div>
      <small>Environment</small>
      <strong>Browser Runtime</strong>
    </div>
  </div>

  <div class="dev-console-item">
    <div>
      <small>Access</small>
      <strong>Developer</strong>
    </div>
  </div>
</div>
            </section>

            <section class="dev-page dev-analytics-page">
              <div class="dev-analytics-head">
                <div>
                  <div class="dev-section-label">01 · Analytics</div>
                  <h2>Site activity</h2>
                </div>
                <div class="dev-analytics-controls">
                  <select class="dev-analytics-period" data-analytics-period aria-label="Analytics time period">
                    <option value="7">7 days</option>
                    <option value="30" selected>30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">12 months</option>
                  </select>
                  <button class="dev-tool dev-analytics-refresh" type="button" aria-label="Refresh analytics">${this.icon("reload")}<span>Refresh</span></button>
                </div>
              </div>

              <div class="dev-analytics-summary" aria-live="polite">
                <article class="dev-analytics-stat"><span>Visits</span><strong data-analytics-visits>—</strong><small data-analytics-visits-detail>Last 30 days</small></article>
                <article class="dev-analytics-stat"><span>Visitors</span><strong data-analytics-visitors>—</strong><small data-analytics-visitors-detail>Unique browsers</small></article>
                <article class="dev-analytics-stat"><span>Accounts</span><strong data-analytics-account-visitors>—</strong><small>Signed-in visitors</small></article>
                <article class="dev-analytics-stat"><span>Guests</span><strong data-analytics-guest-visitors>—</strong><small>Signed-out visitors</small></article>
              </div>

              <div class="dev-analytics-grid">
                <section class="dev-analytics-card dev-analytics-realtime">
                  <div class="dev-analytics-card-head"><div><span class="dev-analytics-kicker"><i></i>Live</span><h3>Online right now</h3></div><strong data-analytics-live-total>—</strong></div>
                  <div class="dev-analytics-live-split">
                    <div><span>Accounts</span><strong data-analytics-live-accounts>—</strong></div>
                    <div><span>Guests</span><strong data-analytics-live-guests>—</strong></div>
                  </div>
                  <div class="dev-analytics-live-meta"><span>Active area</span><strong data-analytics-live-tab>—</strong></div>
                </section>

                <section class="dev-analytics-card">
                  <div class="dev-analytics-card-head"><div><span class="dev-analytics-kicker">Usage</span><h3>Most used tabs</h3></div></div>
                  <div class="dev-analytics-tabs-list" data-analytics-tabs><div class="dev-analytics-empty">Loading…</div></div>
                </section>
              </div>

              <section class="dev-analytics-card dev-analytics-trend-card">
                <div class="dev-analytics-card-head"><div><span class="dev-analytics-kicker">Traffic</span><h3>Daily visits</h3></div><span class="dev-analytics-range">30 days</span></div>
                <div class="dev-analytics-trend" data-analytics-daily><div class="dev-analytics-empty">Loading…</div></div>
              </section>
              <p class="dev-analytics-status" data-analytics-status role="status"></p>
            </section>

            <section class="dev-page dev-ratings-page">
              <div class="dev-analytics-head">
                <div>
                  <div class="dev-section-label">02 · Games</div>
                  <h2>Game ratings</h2>
                </div>
                <button class="dev-tool" type="button" data-dev-ratings-refresh>${this.icon("reload")}<span>Refresh</span></button>
              </div>
              <div class="dev-analytics-summary dev-ratings-summary">
                <article class="dev-analytics-stat"><span>Rated games</span><strong data-dev-ratings-count>—</strong><small>Local rating records</small></article>
                <article class="dev-analytics-stat"><span>Ratings</span><strong data-dev-ratings-total>—</strong><small>Total submissions</small></article>
                <article class="dev-analytics-stat"><span>Average</span><strong data-dev-ratings-average>—</strong><small>Across rated games</small></article>
                <article class="dev-analytics-stat"><span>Surveys</span><strong data-dev-ratings-surveys>—</strong><small data-dev-ratings-surveys-label>Enabled</small></article>
              </div>
              <section class="dev-analytics-card dev-ratings-card">
                <div class="dev-analytics-card-head"><div><span class="dev-analytics-kicker">Catalog signal</span><h3>Highest-rated games</h3></div></div>
                <div class="dev-ratings-list" data-dev-ratings-list><div class="dev-analytics-empty">No ratings yet.</div></div>
              </section>
            </section>

            <section class="dev-page">
              <div class="dev-section dev-event-section">
                <div class="dev-section-label">02 · Atmosphere</div>
                <h2 class="dev-event-heading">Yin Yang</h2>
                <p class="dev-event-description">Shift the entire site into a living balance of light and shadow.</p>

                <label class="dev-field-label">Event</label>
                <select class="dev-event-type">
                  <option value="yin-yang">Yin Yang</option>
                  <option value="matrix">Matrix</option>
                  <option value="false-deity">False Deity</option>
                </select>

                <label class="dev-field-label">Duration</label>
                <div class="dev-event-duration-row">
                  <input type="number" class="dev-event-duration" min="1" value="30">
                  <select class="dev-event-unit">
                    <option value="1">Seconds</option>
                    <option value="60">Minutes</option>
                  </select>
                </div>

                <div class="dev-event-bottom">
                  <span class="dev-event-state" aria-live="polite"></span>
                  <div class="dev-event-actions">
                    <button class="dev-primary dev-event-stop" type="button">Stop active event</button>
                    <button class="dev-primary dev-event-start" type="button">Start event</button>
                  </div>
                </div>
              </div>
            </section>

<section class="dev-page">

<div class="dev-announcements-layout">

<div class="announcement-maker dev-section">

<div class="dev-section-label">
 03 · Broadcast
</div>

<h2>
Global Announcement
</h2>

<p>Send a message to everyone on Blur.</p>


<input
class="announcement-name"
placeholder="Announcement name..."
maxlength="30"
>

<div class="announcement-color-row">
  <label class="dev-field-label">Color</label>
  <div class="announcement-colors">
    <button type="button" class="announcement-color-option active" data-color="#ffffff" style="background:#ffffff"></button>
    <button type="button" class="announcement-color-option" data-color="#ff5757" style="background:#ff5757"></button>
    <button type="button" class="announcement-color-option" data-color="#ff9b45" style="background:#ff9b45"></button>
    <button type="button" class="announcement-color-option" data-color="#ffe35c" style="background:#ffe35c"></button>
    <button type="button" class="announcement-color-option" data-color="#55dd8a" style="background:#55dd8a"></button>
    <button type="button" class="announcement-color-option" data-color="#5ab8ff" style="background:#5ab8ff"></button>
    <button type="button" class="announcement-color-option" data-color="#b886ff" style="background:#b886ff"></button>
    <button type="button" class="announcement-color-option announcement-color-rainbow" data-color="rainbow" aria-label="Rainbow announcement" title="Rainbow"></button>
    <button type="button" class="announcement-color-option announcement-color-admin" data-color="admin" aria-label="Admin announcement" title="Admin"></button>
    <label class="announcement-color-custom" title="Custom color">
      <input type="color" class="announcement-color-picker" value="#ffffff">
    </label>
  </div>
</div>


<div class="announcement-box">

<textarea
class="announcement-input"
placeholder="Write announcement..."
maxlength="200">
</textarea>



<div class="announcement-bottom">

<div class="announcement-meta">
<span class="announcement-state" aria-live="polite"></span>
<span class="announcement-count">0 / 200</span>
</div>


<button class="dev-primary publish-announcement">
Send Broadcast
</button>


</div>

</div>


</div>

<div class="dev-restart-card dev-section">

<div class="dev-section-label">
 04 · Restart
</div>

<h2>Server Restart</h2>

<p>Send a countdown warning to everyone on the site.</p>

<label class="dev-field-label">Seconds</label>
<div class="dev-restart-input-row">
  <input type="number" class="dev-restart-seconds" min="5" max="600" value="60">
  <span>seconds</span>
</div>

<div class="dev-restart-note">Shows a full-screen yellow countdown warning to every connected user.</div>

<div class="dev-restart-actions">
  <button class="dev-primary dev-restart-start">Start countdown</button>
</div>

</div>

</div>

</section>

            <section class="dev-page">
              <div class="dev-section">
                <div class="dev-section-label">05 · Maintenance</div>
                <h2>Developer Tools</h2>
                <button class="dev-tool">${this.icon("reload")}<span>Reload interface</span></button>
                <button class="dev-tool">${this.icon("clear")}<span>Clear cache</span></button>
                <button class="dev-tool">${this.icon("debug")}<span>Debug mode</span></button>
              </div>
            </section>

          </main>

        </div>

      </div>

    `;

    document.body.appendChild(this.root);

    this.panel =
      this.root.querySelector(".dev-window");

  }

  icon(name){
    const icons = {
      dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>`,
      analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-7"/></svg>`,
      ratings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z"/></svg>`,
      events: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>`,
      announcements: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5v-5h2l5 4V6l-5 4H9L6 9H5a2 2 0 0 0-2 2z"/></svg>`,
      tools: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 1 5.4-5.4l-3 3-2-2 3-3z"/></svg>`,
      minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
      close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
      spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 13.6 9 21 12l-7.4 3-1.6 7-1.6-7L3 12l7.4-3z"/></svg>`,
      reload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/></svg>`,
      clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>`,
      debug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="8" width="10" height="10" rx="3"/><path d="M12 2v4M4.2 8 2 6M19.8 8 22 6M4.2 15 2 17M19.8 15 22 17M9 8V6M15 8V6"/></svg>`,
      "chevron-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
      "chevron-left": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
    };
    return icons[name] || "";
  }

  bind(){

    const link =
      document.querySelector("#dev-link");

    if(link){
      link.onclick=()=>{
        this.openLogin();
      };
    }

    const login =
      this.root.querySelector(".dev-login-submit");

    const input =
      this.root.querySelector(".dev-password");

    login.onclick=()=>{
      if(input.value===DEV_PASSWORD){

        localStorage.setItem(
          DEV_AUTH_KEY,
          "true"
        );

        this.openPanel();

      }
      else{

        const err = this.root.querySelector(".dev-login-error");

        err.textContent="Incorrect password";
        err.classList.add("show");

        input.value="";
        input.focus();

      }
    };

    input.addEventListener("keydown", (e)=>{
      if(e.key==="Enter"){
        login.click();
      }
    });

    this.root.querySelector(".dev-close")
      .onclick=()=>{
        this.close();
      };

    this.root.querySelector(".dev-minimize")
      .onclick=()=>{
        this.panel.classList.toggle("minimized");
      };

    document.addEventListener("keydown",(e)=>{

      if(!this.root.classList.contains("visible"))
        return;

      if(!this.root.classList.contains("authenticated")){
        return;
      }

      if(e.key==="Escape"){
        this.close();
        return;
      }

    });

this.setupTabs();
this.setupSidebarToggle();
this.setupDrag();
this.setupAnnouncements();
this.setupEvents();
this.setupAnalytics();
this.setupGameRatings();

  }

  openLogin(){

    this.root.classList.add("visible");

    if(localStorage.getItem(DEV_AUTH_KEY)==="true"){
      this.openPanel();
    }

  }

  openPanel(){

    this.root.classList.add("authenticated");

    this.root
      .querySelector(".dev-login-layer")
      .style.display="none";

    this.panel.classList.add("show");

    this.startClock();

  }

  close(){
    this.root.classList.remove("visible");
    this.stopClock();
  }

  startClock(){
    const el = this.root.querySelector("#dev-clock");
    const tick = ()=>{
      const d = new Date();
      const pad = v=>String(v).padStart(2,"0");
      el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tick();
    this.clockTimer = setInterval(tick,1000);
  }

  stopClock(){
    if(this.clockTimer){
      clearInterval(this.clockTimer);
      this.clockTimer=null;
    }
  }

  setupTabs(){

    const buttons =
      this.root.querySelectorAll(".dev-sidebar button[data-page]");

    buttons.forEach((btn,i)=>{
      btn.onclick=()=>{
        this.selectPage(i);
      };
    });

  }

  setupSidebarToggle(){
    const sidebar = this.root.querySelector(".dev-sidebar");
    const toggle = this.root.querySelector(".dev-sidebar-toggle");
    if(!sidebar || !toggle) return;

    const setExpanded = expanded => {
      sidebar.classList.toggle("collapsed", !expanded);
      sidebar.classList.toggle("expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", expanded ? "Collapse sidebar" : "Expand sidebar");
      toggle.innerHTML = this.icon(expanded ? "chevron-left" : "chevron-right");
    };

    setExpanded(false);
    toggle.onclick = () => setExpanded(sidebar.classList.contains("collapsed"));
  }

  selectPage(i){

    const buttons =
      this.root.querySelectorAll(".dev-sidebar button[data-page]");

    const pages =
      this.root.querySelectorAll(".dev-page");

    if(!buttons[i] || !pages[i])
      return;

    buttons.forEach(b=>b.classList.remove("active"));
    pages.forEach(p=>p.classList.remove("active"));

    buttons[i].classList.add("active");
    pages[i].classList.add("active");

  }

  setupDrag(){

    const bar =
      this.root.querySelector(".dev-titlebar");

    bar.onmousedown=e=>{

      if(e.target.closest(".dev-actions"))
        return;

      this.drag.active=true;

      this.drag.x =
        e.clientX-this.panel.offsetLeft;

      this.drag.y =
        e.clientY-this.panel.offsetTop;

    };

    document.onmousemove=e=>{

      if(!this.drag.active)
        return;

      this.panel.style.left =
        e.clientX-this.drag.x+"px";

      this.panel.style.top =
        e.clientY-this.drag.y+"px";

    };

    document.onmouseup=()=>{
      this.drag.active=false;
    };

  }

  setupAnnouncements(){

if(window.setupAnnouncementSystem){

    window.setupAnnouncementSystem(
        this.root
    );

}

}

  setupEvents(){

if(window.setupEventSystem){

    window.setupEventSystem(
        this.root
    );

}

  }

  setupAnalytics(){
    if(window.setupDevAnalytics){
      window.setupDevAnalytics(this.root);
    }
  }

  setupGameRatings(){
    const list = this.root.querySelector('[data-dev-ratings-list]');
    if(!list) return;
    const count = this.root.querySelector('[data-dev-ratings-count]');
    const total = this.root.querySelector('[data-dev-ratings-total]');
    const average = this.root.querySelector('[data-dev-ratings-average]');
    const surveys = this.root.querySelector('[data-dev-ratings-surveys]');
    const surveysLabel = this.root.querySelector('[data-dev-ratings-surveys-label]');
    const refresh = this.root.querySelector('[data-dev-ratings-refresh]');

    const render = async () => {
      const api = window.BlurGameRatings;
      const entries = api?.getEntries?.() || [];
      const state = api?.getState?.() || { disabled: false };
      if(!entries.length){
        if(count) count.textContent = '0';
        if(total) total.textContent = '0';
        if(average) average.textContent = '—';
        if(surveys) surveys.textContent = state.disabled ? 'Off' : 'On';
        if(surveysLabel) surveysLabel.textContent = state.disabled ? 'Disabled on this browser' : 'Enabled on this browser';
        list.innerHTML = '<div class="dev-analytics-empty">No ratings yet.</div>';
        return;
      }
      const catalog = typeof window.getAllGames === 'function' ? await window.getAllGames() : [];
      const games = entries.map(entry => ({ entry, game: catalog.find(item => item.id === entry.id) })).filter(item => item.game);
      const ordered = games.sort((a, b) => b.entry.value - a.entry.value || b.entry.updatedAt - a.entry.updatedAt);
      if(count) count.textContent = String(ordered.length);
      if(total) total.textContent = String(entries.length);
      if(average) average.textContent = ordered.length ? `${(ordered.reduce((sum, item) => sum + item.entry.value, 0) / ordered.length).toFixed(1)} / 5` : '—';
      if(surveys) surveys.textContent = state.disabled ? 'Off' : 'On';
      if(surveysLabel) surveysLabel.textContent = state.disabled ? 'Disabled on this browser' : 'Enabled on this browser';
      list.innerHTML = ordered.length ? ordered.slice(0, 10).map((item, index) => `
        <div class="dev-rating-row">
          <span class="dev-rating-rank">${index + 1}</span>
          <div class="dev-rating-copy"><strong>${escapeDevRatingText(item.game.title)}</strong><small>${escapeDevRatingText(item.game.providerLabel || item.game.provider || item.game.category || 'Game')}</small></div>
          <span class="dev-rating-score">${item.entry.value.toFixed(1)} <small>★</small></span>
        </div>`).join('') : '<div class="dev-analytics-empty">No ratings yet.</div>';
    };
    refresh?.addEventListener('click', render);
    render();
  }

}

function escapeDevRatingText(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}



window.addEventListener(
  "DOMContentLoaded",
  ()=>{
    window.blurDev =
      new BlurDev();
  }
);
