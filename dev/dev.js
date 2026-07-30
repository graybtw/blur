// ======================================================
// BLUR DEV CONSOLE
// Hidden developer control panel — flat instrument-panel edition
// ======================================================

const DEV_PASSWORD = "blur";
const DEV_AUTH_KEY = "blur-dev-auth";

const DEV_PAGES = ["dashboard", "events", "announcements", "tools"];

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
    this.activeIndex = 0;
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
            <div class="dev-logo">B</div>
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
            <div class="dev-mini-logo">B</div>
            <div class="dev-title-text">
              <div class="dev-address"><i class="dev-live-dot"></i><span id="dev-address-path">blur://dev/dashboard [SEVERELY UNFINISHED]</span></div>
              <span class="dev-clock" id="dev-clock">00:00:00</span>
            </div>
          </div>

          <div class="dev-actions">
            <button class="dev-minimize" aria-label="Minimize">${this.icon("minimize")}</button>
            <button class="dev-close" aria-label="Close">${this.icon("close")}</button>
          </div>

        </div>

        <div class="dev-body">

          <aside class="dev-sidebar">
            <div class="dev-nav-label">Menu</div>
            <button class="active" data-page="dashboard">${this.icon("dashboard")}<span>Dashboard</span><i class="dev-kbd-hint">1</i></button>
            <button data-page="events">${this.icon("events")}<span>Events [WIP]</span><i class="dev-kbd-hint">2</i></button>
            <button data-page="announcements">${this.icon("announcements")}<span>Announcements [WIP]</span><i class="dev-kbd-hint">3</i></button>
            <button data-page="tools">${this.icon("tools")}<span>Tools [WIP]</span><i class="dev-kbd-hint">4</i></button>
          </aside>

          <main class="dev-main">

            <section class="dev-page active">
              <div class="dev-hero">
                <div class="dev-eyebrow">${this.icon("spark")}System status</div>
                <h2>Welcome back, Developer. [THIS DEV PANEL IS UNFINISHED]</h2>
                <p>Blur control center — everything running inside this session is global.</p>
              </div>

              <div class="dev-warning">
  ⚠ Blur Dev Console is severely unfinished. Some features may be broken, incomplete, or experimental.
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

            <section class="dev-page">
              <div class="dev-section dev-event-section">
                <div class="dev-section-label">01 · Broadcast</div>
                <h2>Global Events</h2>
                <p>Trigger a fun effect for every Blur user, for a set duration.</p>

                <label class="dev-field-label">Event</label>
                <select class="dev-event-type">
                  <option value="tacos">🌮 Raining Tacos</option>
                  <option value="money">💵 Money Rain</option>
                  <option value="confetti">🎉 Confetti Party</option>
                  <option value="meteor">☄️ Meteor Shower</option>
                  <option value="balloons">🎈 Balloon Party</option>
                  <option value="hearts">💖 Heart Storm</option>
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
                  <span class="dev-event-state">Ready</span>
                  <button class="dev-primary dev-event-start">Start Event</button>
                </div>
              </div>
            </section>

<section class="dev-page">

<div class="dev-announcements-layout">

<div class="announcement-maker dev-section">

<div class="dev-section-label">
02 · Broadcast
</div>

<h2>
Global Announcement
</h2>

<p>
Send a message instantly to every Blur user.
</p>


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
<span class="announcement-state">
Ready
</span>
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
03 · Restart
</div>

<h2>Server Restart</h2>

<p>Broadcast a countdown warning to everyone on the site.</p>

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
                <div class="dev-section-label">04 · Maintenance</div>
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
      events: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>`,
      announcements: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5v-5h2l5 4V6l-5 4H9L6 9H5a2 2 0 0 0-2 2z"/></svg>`,
      tools: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 1 5.4-5.4l-3 3-2-2 3-3z"/></svg>`,
      minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
      close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
      spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 13.6 9 21 12l-7.4 3-1.6 7-1.6-7L3 12l7.4-3z"/></svg>`,
      reload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/></svg>`,
      clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>`,
      debug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="8" width="10" height="10" rx="3"/><path d="M12 2v4M4.2 8 2 6M19.8 8 22 6M4.2 15 2 17M19.8 15 22 17M9 8V6M15 8V6"/></svg>`,
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

      const n = parseInt(e.key,10);
      if(n>=1 && n<=DEV_PAGES.length){
        this.selectPage(n-1);
      }

    });

this.setupTabs();
this.setupDrag();
this.setupAnnouncements();
this.setupEvents();

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
      this.root.querySelectorAll(".dev-sidebar button");

    buttons.forEach((btn,i)=>{
      btn.onclick=()=>{
        this.selectPage(i);
      };
    });

  }

  selectPage(i){

    const buttons =
      this.root.querySelectorAll(".dev-sidebar button");

    const pages =
      this.root.querySelectorAll(".dev-page");

    if(!buttons[i] || !pages[i])
      return;

    buttons.forEach(b=>b.classList.remove("active"));
    pages.forEach(p=>p.classList.remove("active"));

    buttons[i].classList.add("active");
    pages[i].classList.add("active");

    this.activeIndex = i;

    const addr = this.root.querySelector("#dev-address-path");
    if(addr){
      addr.textContent = `blur://dev/${DEV_PAGES[i]}`;
    }

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

}



window.addEventListener(
  "DOMContentLoaded",
  ()=>{
    window.blurDev =
      new BlurDev();
  }
);