// Minimal greeting
console.log(
    `%c
    ██████  ██      ██    ██ ██████
    ██   ██ ██      ██    ██ ██   ██
    ██████  ██      ██    ██ ██████
    ██   ██ ██      ██    ██ ██   ██
    ██████  ███████  ██████  ██   ██
    
    early access · no ads · no tracking`,
    'color: #c9c39a; font-size: 10px; line-height: 1.2;'
);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* tilt + spotlight on the quick-action cards */
const cards = document.querySelectorAll(".action-card");

if(!reduceMotion){

  cards.forEach(card=>{

    card.addEventListener("pointermove", e=>{

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

  panels.forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.tab === name);
  });

  target.scrollTop = 0;


  // initialize lazy-loaded apps when opened
  if(name === "games" && window.initGames){
    window.initGames();
  }

}

navLinks.forEach(link=>{

  link.addEventListener("click", ()=>{
    goToTab(link.dataset.tab);
  });

});

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
];


const tagline = document.getElementById("home-tagline");


function changeTagline(){

    if(!tagline) return;


    let current = tagline.textContent;

    let next;

    do {
        next = taglines[
            Math.floor(Math.random() * taglines.length)
        ];
    } while(next === current);


    tagline.classList.add("changing");


    setTimeout(()=>{

        tagline.textContent = next;

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