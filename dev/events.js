// ======================================================
// BLUR EVENTS SYSTEM
// Admin-triggered global effects shown to every connected user for a set
// duration. Events are deliberately small, global visual moments rather than
// a second application layered over Blur.
// ======================================================


// Replace or extend these paths with the supplied eye artwork. If a path is
// missing, False Deity falls back to a small CSS eye so the event still has a
// coherent preview while assets are being swapped in.
const FALSE_DEITY_EYES = Object.freeze([
   "assets/creepyeye.png"
]);

const FALSE_DEITY_MESSAGES = Object.freeze([
  "IT SEES YOU",
  "DO NOT LOOK AWAY",
  "FALSE DEITY"
]);

const FALSE_DEITY_CONFIG = Object.freeze({
  maxEyes: 30,
  introMinMs: 280,
  introMaxMs: 400,
  introMessageMs: 860,
  spawnStartMs: 760,
  spawnEndRatio: .84,
  spawnMinMs: 290,
  spawnMaxMs: 720,
  flashStartMs: 3300,
  flashEndRatio: .94,
  deityRatio: .58,
  deityCapMs: 4800,
  baseIntensity: .1,
  peakIntensity: .74,
  baseDarkness: .12,
  peakDarkness: .56
});

const EVENT_TYPES = {

  "yin-yang": {
    label: "Yin Yang",
    description: "Shift the entire site into a living balance of light and shadow.",
    emojis: ["✦", "✧", "·", "○", "●"],
    mode: "float",
    particle: "dust",
    special: "yinyang",
    particleInterval: 420,
    particleCount: 1
  },
  "matrix": {
    label: "Matrix",
    description: "Drop Blur into a live green terminal: code rain, scanlines, and system noise.",
    emojis: [],
    mode: "float",
    particle: null,
    special: "matrix",
    particleInterval: 0,
    particleCount: 0
  },
  "false-deity": {
    label: "False Deity",
    description: "Something ancient is watching from the dark.",
    emojis: [],
    mode: "float",
    particle: null,
    special: "false-deity",
    particleInterval: 0,
    particleCount: 0
  },
  "snowfall": {
    label: "Snowfall",
    description: "A quiet drift of snow and starlight across the site.",
    emojis: ["❄", "✦", "·"],
    mode: "rain",
    particle: "snow",
    particleInterval: 300,
    particleCount: 1
  },
  "fireflies": {
    label: "Fireflies",
    description: "Warm little lights float through the dark for a moment.",
    emojis: ["·", "✦", "✧"],
    mode: "float",
    particle: "firefly",
    particleInterval: 260,
    particleCount: 1
  },
  "meteor-shower": {
    label: "Meteor Shower",
    description: "A handful of bright meteors streak across the night.",
    emojis: ["✦", "☄"],
    mode: "diagonal",
    particle: "meteor",
    particleInterval: 520,
    particleCount: 1
  },
  "heartfall": {
    label: "Heartfall",
    description: "Soft hearts drift down across every Blur page.",
    emojis: ["♡", "♥", "✦"],
    mode: "rain",
    particle: "heart",
    particleInterval: 360,
    particleCount: 1
  }

};


let eventSpawnTimer = null;
let eventCleanupTimer = null;
let eventRemoveTimer = null;
let matrixIntroTimer = null;
let matrixFrameId = null;
let matrixRuntimeCleanup = null;
let falseDeityFrameId = null;
let falseDeityScene = null;
let falseDeityCollapseTimer = null;
const falseDeityTimers = new Set();
let eventPollTimer = null;
let eventRealtimeChannel = null;
let activeEventKey = null;
const stoppedEventIds = new Set();


function matrixMotionReduced(){
  return Boolean(
    document.documentElement?.classList.contains("reduce-motion") ||
    document.body?.classList.contains("force-reduce-motion")
  );
}


function stopMatrixRuntime(){
  if(matrixFrameId !== null){
    window.cancelAnimationFrame?.(matrixFrameId);
    matrixFrameId = null;
  }
  if(matrixRuntimeCleanup){
    matrixRuntimeCleanup();
    matrixRuntimeCleanup = null;
  }
}


// Matrix used to rely entirely on CSS keyframes. That made the event appear
// frozen when a preference, a browser extension, or the site's motion rules
// shortened/disabled animations. A small requestAnimationFrame loop keeps the
// code rain and boot glitch deterministic while remaining click-through.
function startMatrixRuntime(scene){
  stopMatrixRuntime();
  if(!scene || typeof window.requestAnimationFrame !== "function") return;

  const columns = [...scene.querySelectorAll(".site-event-matrix-column")];
  const canvas = scene.querySelector(".site-event-matrix-canvas");
  const glitch = scene.querySelector(".site-event-matrix-glitch");
  const flash = scene.querySelector(".site-event-matrix-flash");
  const reduced = matrixMotionReduced();
  const glyphs = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}\\/+=-*#@$%";
  let drawCanvas = null;
  let canvasActive = false;

  // Canvas is used for the actual rain so the event is not dependent on CSS
  // animation support or dozens of independently animated DOM nodes.
  if(canvas && typeof canvas.getContext === "function"){
    const context = canvas.getContext("2d");
    if(context){
      canvasActive = true;
      scene.classList.add("matrix-canvas-active");
      let width = 0;
      let height = 0;
      let fontSize = 14;
      let cell = 18;
      let streams = [];

      const resizeCanvas = () => {
        width = Math.max(1, scene.clientWidth || window.innerWidth || 1200);
        height = Math.max(1, scene.clientHeight || window.innerHeight || 800);
        fontSize = Math.max(11, Math.min(17, width / 92));
        cell = Math.max(15, fontSize * 1.45);
        const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        streams = Array.from({length: Math.ceil(width / cell) + 2}, (_, index) => ({
          x: index * cell + Math.random() * 5,
          y: Math.random() * height,
          speed: 1.35 + Math.random() * 2.25,
          length: 12 + Math.floor(Math.random() * 27),
          chars: Array.from({length: 34}, () => glyphs[Math.floor(Math.random() * glyphs.length)])
        }));
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas, {passive:true});
      matrixRuntimeCleanup = () => {
        window.removeEventListener("resize", resizeCanvas);
        scene.classList.remove("matrix-canvas-active");
        context.clearRect(0, 0, width, height);
      };

      drawCanvas = (elapsed, delta) => {
        context.clearRect(0, 0, width, height);
        context.textBaseline = "top";
        context.font = `${fontSize}px "IBM Plex Mono", monospace`;
        const glyphTick = Math.floor(elapsed / 115);
        streams.forEach((stream, streamIndex) => {
          if(!reduced) stream.y += stream.speed * delta;
          if(stream.y - stream.length * fontSize > height){
            stream.y = -Math.random() * height * .5;
            stream.speed = 1.35 + Math.random() * 2.25;
          }
          for(let index = 0; index < stream.length; index += 1){
            const y = stream.y - index * fontSize;
            if(y < -fontSize || y > height + fontSize) continue;
            const strength = Math.max(.08, 1 - index / stream.length);
            const char = stream.chars[(glyphTick + index + streamIndex) % stream.chars.length];
            if(index === 0){
              context.fillStyle = `rgba(220,255,224,${Math.min(.98, strength)})`;
              context.shadowColor = "rgba(35,255,82,.92)";
              context.shadowBlur = 9;
            }else{
              context.fillStyle = `rgba(28,${Math.round(168 + strength * 62)},${Math.round(65 + strength * 54)},${Math.min(.78, strength * .72)})`;
              context.shadowBlur = 0;
            }
            context.fillText(char, stream.x, y);
          }
        });
        context.shadowBlur = 0;
      };
    }
  }

  // Once this runtime is active, the fallback DOM streams are driven by the
  // same frame clock as Canvas. That keeps the moving glyphs visible even if
  // CSS animation timing is shortened or disabled by another site rule.
  scene.style.transform = "none";
  scene.style.filter = "none";
  columns.forEach((column, index) => {
    // Once the runtime is available, drive the fallback columns from the same
    // clock as the canvas. This keeps the glyphs moving even when a browser
    // renders Canvas with reduced contrast or pauses CSS animations.
    column.style.animation = "none";
    column.dataset.matrixSpeed = String(6500 + Math.random() * 7000);
    column.dataset.matrixPhase = String(Math.random() * 9000 + index * 180);
    column.dataset.matrixOpacity = column.style.opacity || "0.5";
  });

  if(reduced){
    if(drawCanvas) drawCanvas(0, 0);
    columns.forEach((column, index) => {
      column.style.top = `${(index % 7) * 13 - 10}vh`;
      column.style.transform = `translate3d(0, ${(index % 5) * 7}vh, 0)`;
      if(!canvasActive) column.style.opacity = "0.28";
    });
    if(glitch) glitch.style.opacity = "0";
    if(flash) flash.style.opacity = "0";
    return;
  }

  if(typeof window.requestAnimationFrame !== "function"){
    for(let index = 0; index < Math.min(8, maxEyes); index += 1){
      createFalseDeityEye(scene, {opacity: .12 + Math.random() * .24, blur: 1 + Math.random() * 2});
    }
    return;
  }

  const startedAt = performance.now();
  const bootDuration = 1450;
  let lastGlyphSwap = -Infinity;
  let lastFrameAt = startedAt;
  const glitchBands = [
    "inset(0 0 0 0)",
    "inset(8% 0 78% 0)",
    "inset(46% 0 38% 0)",
    "inset(76% 0 10% 0)",
    "inset(21% 0 57% 0)",
    "inset(58% 0 24% 0)"
  ];
  const frame = (now) => {
    if(!scene.isConnected || !scene.closest(".site-event-fx")?.classList.contains("site-event-matrix-mode")){
      matrixFrameId = null;
      if(matrixRuntimeCleanup){
        matrixRuntimeCleanup();
        matrixRuntimeCleanup = null;
      }
      return;
    }

    const elapsed = now - startedAt;
    const delta = Math.min(48, Math.max(0, now - lastFrameAt));
    lastFrameAt = now;
    if(drawCanvas) drawCanvas(elapsed, delta);

    const elapsedInRain = elapsed;
    columns.forEach((column) => {
      const duration = Math.max(4200, Number(column.dataset.matrixSpeed) || 8200);
      const phase = Number(column.dataset.matrixPhase) || 0;
      const progress = ((elapsedInRain + phase) % duration) / duration;
      column.style.transform = `translate3d(0, ${progress * 246}vh, 0)`;
    });

    if(elapsed - lastGlyphSwap > 120){
      columns.forEach((column, index) => {
        const chars = String(column.textContent || "").split("");
        if(!chars.length) return;
        const position = (Math.floor(elapsed / 120) * 11 + index * 17) % chars.length;
        if(chars[position] !== "\n"){
          chars[position] = glyphs[(Math.floor(elapsed / 120) + index) % glyphs.length];
          column.textContent = chars.join("");
        }
      });
      lastGlyphSwap = elapsed;
    }

    if(scene.classList.contains("is-glitching")){
      const bootProgress = Math.min(1, elapsed / bootDuration);
      const band = glitchBands[Math.min(glitchBands.length - 1, Math.floor(bootProgress * glitchBands.length))];
      const jitterX = Math.sin(elapsed / 17) * 1.15;
      const jitterY = Math.cos(elapsed / 23) * 0.42;
      if(glitch){
        glitch.style.clipPath = band;
        glitch.style.opacity = String(bootProgress < .82 ? .88 : .16);
        glitch.style.transform = `translate3d(${jitterX}%, ${jitterY}%, 0)`;
      }
      if(flash){
        flash.style.opacity = bootProgress < .075 || (bootProgress > .21 && bootProgress < .27) ? ".82" : "0";
      }
      scene.style.transform = `translate3d(${jitterX * .32}%, ${jitterY * .24}%, 0) skewX(${Math.sin(elapsed / 31) * .42}deg)`;
      scene.style.filter = `contrast(${1.18 + Math.sin(elapsed / 29) * .35}) brightness(${.9 + Math.sin(elapsed / 22) * .16}) saturate(1.2)`;
    }else{
      if(glitch){ glitch.style.opacity = "0"; glitch.style.transform = "none"; }
      if(flash) flash.style.opacity = "0";
      scene.style.transform = "none";
      scene.style.filter = "none";
    }

    matrixFrameId = window.requestAnimationFrame(frame);
  };

  matrixFrameId = window.requestAnimationFrame(frame);
}


function setFalseDeityTimeout(callback, delay){
  const timer = window.setTimeout(() => {
    falseDeityTimers.delete(timer);
    callback();
  }, Math.max(0, delay));
  falseDeityTimers.add(timer);
  return timer;
}


function stopFalseDeityRuntime({resetScene = true} = {}){
  if(falseDeityFrameId !== null){
    window.cancelAnimationFrame?.(falseDeityFrameId);
    falseDeityFrameId = null;
  }

  falseDeityTimers.forEach(timer => window.clearTimeout(timer));
  falseDeityTimers.clear();

  const scene = falseDeityScene || document.querySelector(".site-event-false-deity-scene");
  if(scene){
    scene.querySelectorAll(".false-deity-eye").forEach(eye => eye.remove());
    scene.style.transform = "";
    scene.style.filter = "";
    if(resetScene){
      ["--false-intensity", "--false-darkness", "--false-jitter", "--false-grain", "--false-distortion-opacity"].forEach(name => {
        scene.style.removeProperty(name);
      });
      scene.classList.remove("is-presence", "is-active", "is-collapsing", "is-leaving", "is-reduced");
    }
  }

  if(resetScene) falseDeityScene = null;
}


function falseDeityPosition(eye, edge = false){
  let left = 5 + Math.random() * 90;
  let top = 7 + Math.random() * 86;

  if(edge){
    const side = Math.floor(Math.random() * 4);
    if(side === 0){ left = 4 + Math.random() * 20; top = 8 + Math.random() * 78; }
    if(side === 1){ left = 76 + Math.random() * 20; top = 8 + Math.random() * 78; }
    if(side === 2){ left = 7 + Math.random() * 86; top = 5 + Math.random() * 15; }
    if(side === 3){ left = 7 + Math.random() * 86; top = 80 + Math.random() * 15; }
  }

  eye.style.left = `${left}%`;
  eye.style.top = `${top}%`;
}


function createFalseDeityEye(scene, options = {}){
  const root = scene?.querySelector(".false-deity-eyes");
  if(!root) return null;

  const eye = document.createElement("span");
  eye.className = "false-deity-eye";
  if(options.intro) eye.classList.add("is-intro");
  if(options.flash) eye.classList.add("is-flash");
  if(options.deity) eye.classList.add("is-deity");

  const shell = document.createElement("span");
  shell.className = "false-deity-eye-shell";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  image.loading = "eager";

  const fallback = document.createElement("span");
  fallback.className = "false-deity-fallback";
  fallback.setAttribute("aria-hidden", "true");

  const configuredEyes = FALSE_DEITY_EYES.filter(Boolean);
  const source = configuredEyes[Math.floor(Math.random() * configuredEyes.length)];
  if(source){
    image.addEventListener("error", () => {
      image.hidden = true;
      eye.classList.add("is-fallback");
    }, {once:true});
    image.src = source;
  }else{
    image.hidden = true;
    eye.classList.add("is-fallback");
  }

  shell.append(image, fallback);
  eye.append(shell);

  const size = options.size || (48 + Math.random() * 116);
  const opacity = options.opacity ?? (.16 + Math.random() * .42);
  const blur = options.blur ?? Math.random() * 2.2;
  const scale = options.scale ?? (.78 + Math.random() * .5);
  eye.style.width = `${size}px`;
  eye.style.height = `${Math.round(size * .62)}px`;
  eye.style.opacity = String(opacity);
  eye.style.filter = `blur(${blur}px)`;
  eye.style.transform = `translate(-50%, -50%) rotate(${options.rotation ?? (-12 + Math.random() * 24)}deg) scale(${scale})`;
  eye.style.setProperty("--false-eye-drift-x", `${-5 + Math.random() * 10}px`);
  eye.style.setProperty("--false-eye-drift-y", `${-7 + Math.random() * 14}px`);
  shell.style.animationDuration = `${options.duration || (4.8 + Math.random() * 6.4)}s`;
  shell.style.animationDelay = `${options.delay || 0}ms`;

  falseDeityPosition(eye, Boolean(options.edge));
  root.appendChild(eye);

  if(!options.reduced){
    window.requestAnimationFrame?.(() => eye.classList.add("is-visible"));
  }else{
    eye.classList.add("is-visible");
  }

  return eye;
}


function startFalseDeityRuntime(scene, durationMs){
  stopFalseDeityRuntime();
  if(!scene) return;

  falseDeityScene = scene;
  const reduced = matrixMotionReduced();
  const total = Math.max(1000, Number(durationMs) || 12000);
  const viewportArea = Math.max(1, (window.innerWidth || 1200) * (window.innerHeight || 800));
  const maxEyes = Math.min(FALSE_DEITY_CONFIG.maxEyes, Math.max(12, Math.round(viewportArea / 85000)));
  const eyeRoot = scene.querySelector(".false-deity-eyes");
  const message = scene.querySelector(".false-deity-message");

  scene.classList.add("is-active");
  if(reduced) scene.classList.add("is-reduced");
  scene.style.setProperty("--false-intensity", reduced ? ".16" : String(FALSE_DEITY_CONFIG.baseIntensity));
  scene.style.setProperty("--false-darkness", reduced ? ".26" : String(FALSE_DEITY_CONFIG.baseDarkness));
  scene.style.setProperty("--false-jitter", "0px");
  scene.style.setProperty("--false-grain", reduced ? ".045" : ".043");
  scene.style.setProperty("--false-distortion-opacity", reduced ? ".08" : ".1");

  const introEye = createFalseDeityEye(scene, {
    intro: true,
    edge: true,
    size: 92 + Math.random() * 54,
    opacity: .88,
    blur: .4,
    scale: 1,
    duration: 2.8
  });
  scene.classList.add("is-presence");
  if(message){
    message.textContent = FALSE_DEITY_MESSAGES[Math.floor(Math.random() * FALSE_DEITY_MESSAGES.length)];
  }
  setFalseDeityTimeout(() => introEye?.remove(), FALSE_DEITY_CONFIG.introMinMs + Math.random() * (FALSE_DEITY_CONFIG.introMaxMs - FALSE_DEITY_CONFIG.introMinMs));
  setFalseDeityTimeout(() => scene.classList.remove("is-presence"), FALSE_DEITY_CONFIG.introMessageMs);

  if(reduced){
    for(let index = 0; index < Math.min(10, maxEyes); index += 1){
      createFalseDeityEye(scene, {
        reduced: true,
        opacity: .1 + Math.random() * .2,
        blur: 1.4 + Math.random() * 1.6,
        scale: .78 + Math.random() * .35,
        delay: index * 50
      });
    }
    return;
  }

  const startedAt = performance.now();
  let nextSpawnAt = FALSE_DEITY_CONFIG.spawnStartMs;
  let nextFlashAt = Math.max(FALSE_DEITY_CONFIG.flashStartMs, total * .38);
  const deityAt = Math.min(total * FALSE_DEITY_CONFIG.deityRatio, FALSE_DEITY_CONFIG.deityCapMs);
  let deityEye = null;
  let spawned = 0;

  const spawnWatchingEye = () => {
    if(!eyeRoot || spawned >= maxEyes) return;
    spawned += 1;
    createFalseDeityEye(scene, {
      opacity: .12 + Math.random() * .44,
      blur: Math.random() * 2.8,
      scale: .72 + Math.random() * .58,
      rotation: -16 + Math.random() * 32,
      duration: 5.2 + Math.random() * 7.5,
      delay: Math.random() * 180
    });
  };

  const spawnCenterFlash = () => {
    const flash = createFalseDeityEye(scene, {
      flash: true,
      size: 170 + Math.random() * 120,
      opacity: .94,
      blur: .15,
      scale: .9,
      rotation: -3 + Math.random() * 6,
      duration: .48
    });
    if(flash){
      flash.style.left = "50%";
      flash.style.top = "50%";
      setFalseDeityTimeout(() => flash.remove(), 480);
    }
  };

  const frame = (now) => {
    if(!scene.isConnected || !scene.closest(".site-event-fx")?.classList.contains("site-event-false-deity-mode")){
      falseDeityFrameId = null;
      return;
    }

    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / total);
    const ramp = Math.min(1, Math.max(0, (progress - .06) / .8));
    const peak = Math.min(1, Math.max(0, (ramp - .45) / .55));
    scene.style.setProperty("--false-intensity", (FALSE_DEITY_CONFIG.baseIntensity + ramp * (FALSE_DEITY_CONFIG.peakIntensity - FALSE_DEITY_CONFIG.baseIntensity)).toFixed(3));
    scene.style.setProperty("--false-darkness", (FALSE_DEITY_CONFIG.baseDarkness + ramp * (FALSE_DEITY_CONFIG.peakDarkness - FALSE_DEITY_CONFIG.baseDarkness)).toFixed(3));
    scene.style.setProperty("--false-grain", (.043 + ramp * .08).toFixed(3));
    scene.style.setProperty("--false-distortion-opacity", (.1 + peak * .2).toFixed(3));
    const jitter = (.08 + peak * .62) * (Math.sin(now / 37) * .8);
    scene.style.setProperty("--false-jitter", `${jitter.toFixed(2)}px`);
    scene.style.transform = `translate3d(${jitter}px, ${(Math.cos(now / 43) * (0.06 + peak * .5)).toFixed(2)}px, 0)`;

    while(elapsed >= nextSpawnAt && elapsed < total * FALSE_DEITY_CONFIG.spawnEndRatio && spawned < maxEyes){
      spawnWatchingEye();
      nextSpawnAt += FALSE_DEITY_CONFIG.spawnMinMs + Math.random() * (FALSE_DEITY_CONFIG.spawnMaxMs - FALSE_DEITY_CONFIG.spawnMinMs);
    }

    if(elapsed >= nextFlashAt && elapsed < total * FALSE_DEITY_CONFIG.flashEndRatio){
      spawnCenterFlash();
      nextFlashAt += 2900 + Math.random() * 2200;
    }

    if(!deityEye && elapsed >= deityAt){
      deityEye = createFalseDeityEye(scene, {
        deity: true,
        size: Math.min(window.innerWidth || 1200, window.innerHeight || 800) * .72,
        opacity: .94,
        blur: .1,
        scale: .74,
        rotation: 0,
        duration: 6.2
      });
      deityEye?.classList.add("is-deity-visible");
      if(message){
        message.textContent = "FALSE DEITY";
        message.classList.add("is-climax");
        setFalseDeityTimeout(() => message.classList.remove("is-climax"), 1300);
      }
    }

    if(deityEye){
      const deityProgress = Math.min(1, Math.max(0, (elapsed - deityAt) / Math.max(1, total - deityAt)));
      const deityOpacity = deityProgress > .82 ? .94 - (deityProgress - .82) * .8 : .28 + deityProgress * .8;
      deityEye.style.opacity = String(Math.max(.18, deityOpacity));
      deityEye.style.transform = `translate(-50%, -50%) scale(${(.74 + deityProgress * .2).toFixed(3)})`;
    }

    if(elapsed < total){
      falseDeityFrameId = window.requestAnimationFrame(frame);
    }else{
      falseDeityFrameId = null;
    }
  };

  falseDeityFrameId = window.requestAnimationFrame(frame);
}


function queueFalseDeityCollapse(layer, eventKey){
  if(falseDeityCollapseTimer !== null){
    window.clearTimeout(falseDeityCollapseTimer);
    falseDeityCollapseTimer = null;
  }

  const scene = layer?.querySelector(".site-event-false-deity-scene");
  stopFalseDeityRuntime({resetScene:false});
  if(!scene){
    layer?.classList.remove("site-event-false-deity-mode");
    if(activeEventKey === eventKey) activeEventKey = null;
    falseDeityScene = null;
    if(layer && !layer.children.length) layer.remove();
    return;
  }

  scene.classList.remove("is-presence", "is-active");
  scene.classList.add("is-collapsing");
  scene.style.setProperty("--false-intensity", "1");
  scene.style.setProperty("--false-darkness", ".98");
  scene.style.setProperty("--false-jitter", "0px");
  scene.style.setProperty("--false-grain", ".1");
  scene.style.setProperty("--false-distortion-opacity", ".12");

  falseDeityCollapseTimer = setFalseDeityTimeout(() => {
    scene.classList.remove("is-collapsing");
    scene.classList.add("is-leaving");
    falseDeityCollapseTimer = setFalseDeityTimeout(() => {
      scene.remove();
      layer.classList.remove("site-event-false-deity-mode");
      layer.style.removeProperty("display");
      layer.style.removeProperty("visibility");
      layer.style.removeProperty("opacity");
      layer.style.removeProperty("background");
      if(activeEventKey === eventKey) activeEventKey = null;
      falseDeityScene = null;
      falseDeityCollapseTimer = null;
      if(!layer.children.length) layer.remove();
    }, 700);
  }, 540);
}


function setupEventSender(root){


const typeSelect =
root.querySelector(".dev-event-type");


const durationInput =
root.querySelector(".dev-event-duration");


const unitSelect =
root.querySelector(".dev-event-unit");


const startButton =
root.querySelector(".dev-event-start");

const stopButton =
root.querySelector(".dev-event-stop");

const eventHeading = root.querySelector(".dev-event-heading");
const eventDescription = root.querySelector(".dev-event-description");


const state =
root.querySelector(".dev-event-state");


if(!typeSelect || !durationInput || !unitSelect || !startButton){
    console.warn("Event elements missing");
    return;
}

const updateEventCopy = () => {
  const config = EVENT_TYPES[typeSelect.value];
  if(eventHeading && config) eventHeading.textContent = config.label;
  if(eventDescription && config) eventDescription.textContent = config.description;
};
typeSelect.addEventListener("change", updateEventCopy);
updateEventCopy();

if(stopButton){
  stopButton.onclick = async ()=>{
    stopButton.disabled = true;
    // Direct table updates are commonly filtered out by Supabase RLS (and can
    // return zero rows without an error). Use the server-side function so the
    // stop is persisted once and every client sees the same ended_at value.
    const {error} = await window.sb.rpc("stop_global_events");
    stopButton.disabled = false;

    if(error){
      console.error(error);
      const message = String(error.message || "");
      if(state) state.textContent = /function|schema cache|does not exist/i.test(message)
        ? "Run the global event stop migration in Supabase"
        : (message || "Could not stop event globally");
      return;
    }

    // End the local scene immediately; the persisted row update above is what
    // makes this stop apply to other tabs and survive a reload.
    stopGlobalEvent();
  };
}


startButton.onclick = async ()=>{


const type =
typeSelect.value;


const amount =
parseInt(durationInput.value, 10);


const unitSeconds =
parseInt(unitSelect.value, 10);


if(!EVENT_TYPES[type]){

state.textContent =
"Unknown event";

return;

}


if(!amount || amount < 1){

state.textContent =
"Invalid duration";

return;

}


const durationSeconds =
amount * unitSeconds;


const endsAt =
new Date(
Date.now() + durationSeconds * 1000
).toISOString();


state.textContent =
"Starting...";

startButton.disabled = true;

// Blur runs one global visual event at a time. End older active rows with the
// same server-side function used by Stop Event so stale rows cannot win a
// later reload or poll.
const {error: activeStopError} = await window.sb.rpc("stop_global_events");
if(activeStopError){
  startButton.disabled = false;
  const message = String(activeStopError.message || "");
  if(state) state.textContent = /function|schema cache|does not exist/i.test(message)
    ? "Run the global event stop migration in Supabase"
    : (message || "Could not clear the previous event");
  return;
}

const {data: insertedRows, error} =
await window.sb
.from("events")
.insert({

title:
EVENT_TYPES[type].label,

message:
type,

duration:
durationSeconds,

ends_at:
endsAt

})
.select("id, ends_at");


startButton.disabled = false;


if(error){

console.error(error);

state.textContent =
error.message || "Failed";

return;

}


state.textContent =
"Event started";

// Start immediately in the initiating tab instead of waiting for realtime or
// the five-second fallback poll. Other tabs still receive the row normally.
const inserted = insertedRows?.[0];
const remainingMs = Math.max(1000, new Date(inserted?.ends_at || endsAt).getTime() - Date.now());
playGlobalEvent(type, remainingMs, inserted?.id || `${type}:${endsAt}`);


};


}



function setupEventRealtime(){

  if(!window.sb){
    // The Supabase client is loaded immediately before the Dev Panel, but keep
    // a short retry so an early page load cannot silently miss the global event.
    setTimeout(setupEventRealtime, 500);
    return;
  }

  if(eventRealtimeChannel) return;

  eventRealtimeChannel = window.sb
 .channel("global-events")
.on(
"postgres_changes",
{
 event:"*",
schema:"public",
table:"events"
},
(payload)=>{

if(payload.eventType === "DELETE"){
  // A deleted/expired older row must not tear down a newer event that has
  // already started. Re-evaluate the latest active row instead.
  if(payload.old?.id != null) stoppedEventIds.add(String(payload.old.id));
  void checkActiveEvent();
  return;
}

const row = payload.new || payload.old;
if(!row) return;

const remainingMs =
new Date(row.ends_at).getTime() - Date.now();

const eventType = resolveEventType(row);

if(remainingMs > 0 && eventType){

    playGlobalEvent(eventType, remainingMs, row.id || `${eventType}:${row.ends_at}`);

} else if(payload.eventType === "UPDATE") {
  if(row.id != null) stoppedEventIds.add(String(row.id));
  // Multiple stale test rows can expire together. Let the same ordered query
  // used on boot decide whether there is another active event before stopping
  // the visible scene.
  void checkActiveEvent();
}

}

)
 .subscribe();


checkActiveEvent();

  // Realtime can be briefly unavailable while a session is restored. A small
  // poll keeps short-lived global events visible without requiring a reload.
  if(!eventPollTimer){
    eventPollTimer = setInterval(checkActiveEvent, 5000);
  }

  if(window.sb.auth?.onAuthStateChange){
    window.sb.auth.onAuthStateChange(()=>{
      setTimeout(checkActiveEvent, 0);
    });
  }


}



async function checkActiveEvent(){


const {data, error} =
await window.sb
  .from("events")
  .select("*")
  .gt("ends_at", new Date().toISOString())
  .order("created_at", {ascending:false})
  .limit(20);


if(error){
    console.error(error);
    return;
}


const visibleEvents = (data || [])
  .filter(row => !stoppedEventIds.has(String(row.id)))
  .map(row => ({ row, eventType: resolveEventType(row) }))
  .filter(item => item.eventType);

if(visibleEvents.length){

const remainingMs =
new Date(visibleEvents[0].row.ends_at).getTime() - Date.now();

const eventType = visibleEvents[0].eventType;

if(remainingMs > 0 && eventType){
    playGlobalEvent(eventType, remainingMs, visibleEvents[0].row.id || `${eventType}:${visibleEvents[0].row.ends_at}`);
}

}

else if(activeEventKey){
  stopGlobalEvent();
}


}



function ensureFxLayer(){


if(eventRemoveTimer){
  clearTimeout(eventRemoveTimer);
  eventRemoveTimer = null;
}

let layer =
document.querySelector(".site-event-fx");


if(!layer){

layer = document.createElement("div");
layer.className = "site-event-fx";

document.body.appendChild(layer);

}

// Keep the event layer visible even when a user has a reduced-motion or
// performance preference that disables animation styles elsewhere.
layer.style.setProperty("position", "fixed");
layer.style.setProperty("inset", "0");
  layer.style.setProperty("pointer-events", "none");
  layer.style.setProperty("overflow", "hidden");
  layer.style.removeProperty("transition");
// Keep the event layer above the app shell. It is pointer-events:none, so the
// visual treatment can cover navigation without blocking normal interaction.
layer.style.setProperty("z-index", "12");


return layer;


}


function resolveEventType(row){
  // Support both the current title/message rows and older rows that stored
  // the event key in `type`.
  const raw = [row?.message, row?.title, row?.type, row?.event_type]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .join(" ");
  if(raw === "yin-yang" || (raw.includes("yin") && raw.includes("yang"))){
    return "yin-yang";
  }
  if(raw === "matrix" || raw.includes("matrix")) return "matrix";
  if(raw.includes("false") && raw.includes("deity")) return "false-deity";
  if(raw.includes("snow")) return "snowfall";
  if(raw.includes("firefly") || raw.includes("fireflies")) return "fireflies";
  if(raw.includes("meteor")) return "meteor-shower";
  if(raw.includes("heartfall") || raw.includes("heart fall")) return "heartfall";
  return null;
}


function spawnParticle(layer, config){


const emoji =
config.emojis[
Math.floor(Math.random() * config.emojis.length)
];


const particle =
document.createElement("span");

  particle.className =
`site-event-particle site-event-${config.mode}`;

// Keep event particles above opaque page surfaces while leaving the layer
// completely click-through.
particle.style.zIndex = "3";


particle.textContent = config.particle === "dust" ? "" : emoji;


const left =
Math.random() * 100;

const duration =
4 + Math.random() * 3;

const delay =
Math.random() * 0.4;

const size =
24 + Math.random() * 20;


particle.style.left = `${left}vw`;
particle.style.fontSize = `${size}px`;
particle.style.animationDuration = `${duration}s`;
particle.style.animationDelay = `${delay}s`;

if(config.particle === "dust"){
  particle.classList.add("site-event-dust");
  particle.style.top = `${Math.random() * 100}vh`;
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.width = `${1.5 + Math.random() * 3.5}px`;
  particle.style.height = particle.style.width;
  particle.style.animationDuration = `${8 + Math.random() * 10}s`;
  particle.style.animationDelay = `${Math.random() * 2}s`;
  particle.style.opacity = `${0.16 + Math.random() * 0.28}`;
} else if(config.particle === "snow"){
  particle.classList.add("site-event-snow");
  particle.style.top = "-44px";
  particle.style.fontSize = `${16 + Math.random() * 18}px`;
  particle.style.animationDuration = `${7 + Math.random() * 5}s`;
  particle.style.animationDelay = `${Math.random() * 1.4}s`;
  particle.style.opacity = `${0.4 + Math.random() * 0.45}`;
} else if(config.particle === "firefly"){
  particle.classList.add("site-event-firefly");
  particle.style.top = `${8 + Math.random() * 84}vh`;
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.fontSize = `${11 + Math.random() * 11}px`;
  particle.style.animationDuration = `${6 + Math.random() * 6}s`;
  particle.style.animationDelay = `${Math.random() * 2}s`;
  particle.style.opacity = `${0.35 + Math.random() * 0.55}`;
} else if(config.particle === "meteor"){
  particle.classList.add("site-event-meteor");
  particle.style.top = `${Math.random() * 72}vh`;
  particle.style.left = `${60 + Math.random() * 40}vw`;
  particle.style.fontSize = `${16 + Math.random() * 16}px`;
  particle.style.animationDuration = `${2.8 + Math.random() * 2.4}s`;
  particle.style.animationDelay = `${Math.random() * 1.4}s`;
  particle.style.opacity = `${0.55 + Math.random() * 0.45}`;
} else if(config.particle === "heart"){
  particle.classList.add("site-event-heart");
  particle.style.top = "-44px";
  particle.style.fontSize = `${18 + Math.random() * 16}px`;
  particle.style.animationDuration = `${5.5 + Math.random() * 3.5}s`;
  particle.style.animationDelay = `${Math.random() * 1.4}s`;
  particle.style.opacity = `${0.45 + Math.random() * 0.45}`;
} else if(config.mode === "float"){
  particle.style.top = `${Math.random() * 100}vh`;
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.animationDuration = `${5 + Math.random() * 5}s`;
  particle.style.animationDelay = `${Math.random() * 1.2}s`;
  particle.style.opacity = `${0.25 + Math.random() * 0.5}`;
}

if(config.mode === "diagonal"){
    particle.style.left = `${60 + Math.random() * 40}vw`;
}


particle.addEventListener("animationend", ()=>{
    particle.remove();
});


layer.appendChild(particle);


}


function ensureYinYangScene(layer){

  let scene = layer.querySelector(".site-event-yinyang-scene");
  if(scene) return scene;

  scene = document.createElement("div");
  scene.className = "site-event-yinyang-scene";
  scene.innerHTML = `
    <div class="site-event-yinyang-backdrop"></div>
    <div class="site-event-yinyang-rays"></div>
    <div class="site-event-yinyang-orbit site-event-yinyang-orbit-a"></div>
    <div class="site-event-yinyang-orbit site-event-yinyang-orbit-b"></div>
    <div class="site-event-yinyang-core" aria-hidden="true">
      <div class="site-event-yinyang-disc">
        <svg viewBox="0 0 100 100" role="presentation">
          <circle cx="50" cy="50" r="46" fill="#f2f2ed"/>
          <path d="M50 4a46 46 0 0 1 0 92a23 23 0 0 1 0-46a23 23 0 0 0 0-46z" fill="#171715"/>
          <circle cx="50" cy="27" r="7" fill="#f2f2ed"/>
          <circle cx="50" cy="73" r="7" fill="#171715"/>
        </svg>
      </div>
    </div>
    <div class="site-event-yinyang-vignette"></div>
  `;
  layer.appendChild(scene);
  return scene;
}


function ensureMatrixScene(layer){
  let scene = layer.querySelector(".site-event-matrix-scene");
  if(scene) return scene;

  scene = document.createElement("div");
  scene.className = "site-event-matrix-scene site-event-scene is-glitching";
  scene.innerHTML = `
    <div class="site-event-matrix-backdrop"></div>
    <canvas class="site-event-matrix-canvas" aria-hidden="true"></canvas>
    <div class="site-event-matrix-code" aria-hidden="true"></div>
    <div class="site-event-matrix-grid" aria-hidden="true"></div>
    <div class="site-event-matrix-scanlines" aria-hidden="true"></div>
    <div class="site-event-matrix-camera site-event-matrix-camera-a" aria-hidden="true"></div>
    <div class="site-event-matrix-camera site-event-matrix-camera-b" aria-hidden="true"></div>
    <div class="site-event-matrix-popups" aria-hidden="true"></div>
    <div class="site-event-matrix-core" aria-hidden="true"><span>BLUR // MATRIX</span></div>
    <div class="site-event-matrix-target" aria-hidden="true"></div>
    <div class="site-event-matrix-glitch" aria-hidden="true"></div>
    <div class="site-event-matrix-flash" aria-hidden="true"></div>
    <div class="site-event-matrix-vignette" aria-hidden="true"></div>
  `;

  const codeRoot = scene.querySelector(".site-event-matrix-code");
  const alphabet = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}\/\\+=-*#@$%";
  const columnCount = Math.min(58, Math.max(18, Math.ceil((window.innerWidth || 1200) / 28)));

  for(let index = 0; index < columnCount; index += 1){
    const column = document.createElement("span");
    column.className = "site-event-matrix-column";
    column.textContent = Array.from({length: 44}, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("\n");
    column.style.left = `${(index / columnCount) * 100 + Math.random() * 1.3}%`;
    column.style.animationDuration = `${3.4 + Math.random() * 4.2}s`;
    column.style.animationDelay = `${-Math.random() * 5}s`;
    // Keep the streams legible against Blur's dark surfaces; the runtime
    // loop still fades each column as it travels so the field never becomes
    // a solid wall of green.
    column.style.opacity = `${0.36 + Math.random() * 0.46}`;
    codeRoot.appendChild(column);
  }

  const popupRoot = scene.querySelector(".site-event-matrix-popups");
  const popupCopy = [
    ["SIGNAL", "LOCKED // 07"],
    ["NODE", "BLUR-01 ONLINE"],
    ["TRACE", "0x7A / 100%"],
    ["UPLINK", "ENCRYPTED"],
    ["WATCHER", "CONNECTED"],
    ["PACKET", "0101 1100"],
    ["CHANNEL", "SECURE"],
    ["SYSTEM", "NOMINAL"]
  ];

  popupCopy.forEach(([label, value], index) => {
    const popup = document.createElement("div");
    popup.className = "site-event-matrix-popup";
    popup.innerHTML = `<span class="site-event-matrix-popup-label"></span><strong></strong>`;
    popup.querySelector(".site-event-matrix-popup-label").textContent = label;
    popup.querySelector("strong").textContent = value;
    popup.style.left = `${6 + Math.random() * 82}%`;
    popup.style.top = `${8 + Math.random() * 76}%`;
    popup.style.animationDelay = `${index * 280 + Math.random() * 700}ms`;
    popupRoot.appendChild(popup);
  });

  layer.appendChild(scene);
  return scene;
}


function ensureFalseDeityScene(layer){
  let scene = layer.querySelector(".site-event-false-deity-scene");
  if(scene) return scene;

  scene = document.createElement("div");
  scene.className = "site-event-false-deity-scene site-event-scene";
  scene.innerHTML = `
    <div class="false-deity-darkness" aria-hidden="true"></div>
    <div class="false-deity-grain" aria-hidden="true"></div>
    <div class="false-deity-vignette" aria-hidden="true"></div>
    <div class="false-deity-distortion" aria-hidden="true"></div>
    <div class="false-deity-eyes" aria-hidden="true"></div>
    <div class="false-deity-message" aria-hidden="true"></div>
    <div class="false-deity-collapse" aria-hidden="true"></div>
  `;
  layer.appendChild(scene);
  return scene;
}


function playGlobalEvent(type, durationMs, eventKey){


const config =
EVENT_TYPES[type];


if(!config){
    console.warn("Unknown event type:", type);
    return;
}

const key = eventKey || `${type}:${Math.round(Date.now() / 1000)}`;
if(activeEventKey === key) return;
activeEventKey = key;

if(eventSpawnTimer){
    clearInterval(eventSpawnTimer);
    eventSpawnTimer = null;
}


if(eventCleanupTimer){
    clearTimeout(eventCleanupTimer);
    eventCleanupTimer = null;
}

if(matrixIntroTimer){
  clearTimeout(matrixIntroTimer);
  matrixIntroTimer = null;
}

if(falseDeityCollapseTimer !== null){
  window.clearTimeout(falseDeityCollapseTimer);
  falseDeityCollapseTimer = null;
}

stopMatrixRuntime();
stopFalseDeityRuntime();


const layer =
ensureFxLayer();

// A new global event replaces the previous one immediately. Clearing the old
// particles prevents one event's effects from leaking into another.
layer.querySelectorAll(".site-event-particle").forEach(particle => particle.remove());

layer.classList.toggle("site-event-yinyang-mode", config.special === "yinyang");
layer.classList.toggle("site-event-matrix-mode", config.special === "matrix");
layer.classList.toggle("site-event-false-deity-mode", config.special === "false-deity");

if(config.special === "yinyang" || config.special === "matrix" || config.special === "false-deity"){
  layer.style.setProperty("display", "block");
  layer.style.setProperty("visibility", "visible");
  layer.style.setProperty("opacity", "1");
  layer.style.setProperty("background", "transparent");
} else {
  layer.style.removeProperty("display");
  layer.style.removeProperty("visibility");
  layer.style.removeProperty("opacity");
  layer.style.removeProperty("background");
}

if(config.special === "yinyang"){
  layer.querySelector(".site-event-matrix-scene")?.remove();
  layer.querySelector(".site-event-false-deity-scene")?.remove();
  ensureYinYangScene(layer);
}else if(config.special === "matrix"){
  layer.querySelector(".site-event-yinyang-scene")?.remove();
  layer.querySelector(".site-event-false-deity-scene")?.remove();
  const scene = ensureMatrixScene(layer);
  scene.classList.remove("is-leaving", "is-glitching");
  // Restart the boot sequence even if a previous event left the scene node
  // mounted during its short fade-out window.
  void scene.offsetWidth;
  scene.classList.add("is-glitching");
  startMatrixRuntime(scene);
  matrixIntroTimer = setTimeout(()=>{
    scene.classList.remove("is-glitching");
    matrixIntroTimer = null;
  }, 1450);
}else if(config.special === "false-deity"){
  layer.querySelector(".site-event-yinyang-scene")?.remove();
  layer.querySelector(".site-event-matrix-scene")?.remove();
  const scene = ensureFalseDeityScene(layer);
  scene.classList.remove("is-leaving", "is-collapsing");
  startFalseDeityRuntime(scene, durationMs);
}else{
  layer.querySelector(".site-event-yinyang-scene")?.remove();
  layer.querySelector(".site-event-matrix-scene")?.remove();
  layer.querySelector(".site-event-false-deity-scene")?.remove();
}

if(config.particle){
  const particleInterval = config.particleInterval || 180;
  eventSpawnTimer = setInterval(()=>{
    for(let i = 0; i < (config.particleCount || 1); i += 1){
      spawnParticle(layer, config);
    }
  }, particleInterval);

  // Seed the scene immediately so short events and slow connections still
  // show a visible effect before the first interval tick.
  for(let i = 0; i < (config.particleCount || 1); i += 1){
    spawnParticle(layer, config);
  }
}


eventCleanupTimer = setTimeout(()=>{

clearInterval(eventSpawnTimer);
eventSpawnTimer = null;

if(matrixIntroTimer){
  clearTimeout(matrixIntroTimer);
  matrixIntroTimer = null;
}

stopMatrixRuntime();

if(config.special === "false-deity"){
  layer.querySelectorAll(".site-event-particle").forEach(particle => particle.remove());
  queueFalseDeityCollapse(layer, key);
  return;
}

const scene = layer.querySelector(".site-event-matrix-scene, .site-event-yinyang-scene");
if(scene){
  scene.style.animation = "";
  scene.style.transform = "";
  scene.style.filter = "";
  scene.classList.add("is-leaving");
  setTimeout(()=>scene.remove(), 700);
}
layer.querySelectorAll(".site-event-particle").forEach(particle => particle.remove());
layer.classList.remove("site-event-yinyang-mode", "site-event-matrix-mode", "site-event-false-deity-mode");
layer.style.removeProperty("display");
layer.style.removeProperty("visibility");
layer.style.removeProperty("opacity");
layer.style.removeProperty("background");

// Particles are intentionally cleared with the event instead of lingering
// after the atmosphere has ended.
eventRemoveTimer = setTimeout(()=>{
  eventRemoveTimer = null;
  if(layer && !layer.children.length) layer.remove();
}, 720);

if(activeEventKey === key){
  activeEventKey = null;
}

}, durationMs);


}


function stopGlobalEvent(){
  if(eventSpawnTimer){
    clearInterval(eventSpawnTimer);
    eventSpawnTimer = null;
  }
  if(eventCleanupTimer){
    clearTimeout(eventCleanupTimer);
    eventCleanupTimer = null;
  }

  if(matrixIntroTimer){
    clearTimeout(matrixIntroTimer);
    matrixIntroTimer = null;
  }

  stopMatrixRuntime();

  const layer = document.querySelector(".site-event-fx");
  if(!layer) return;

  if(eventRemoveTimer){
    clearTimeout(eventRemoveTimer);
    eventRemoveTimer = null;
  }

  const falseScene = layer.querySelector(".site-event-false-deity-scene");
  if(falseScene || layer.classList.contains("site-event-false-deity-mode")){
    const interruptedKey = activeEventKey;
    activeEventKey = null;
    queueFalseDeityCollapse(layer, interruptedKey);
    return;
  }

  activeEventKey = null;

  const scene = layer.querySelector(".site-event-matrix-scene, .site-event-yinyang-scene");
  if(scene){
    scene.style.animation = "";
    scene.style.transform = "";
    scene.style.filter = "";
    scene.classList.add("is-leaving");
  }
  layer.classList.remove("site-event-yinyang-mode", "site-event-matrix-mode", "site-event-false-deity-mode");
  layer.style.setProperty("opacity", "0");
  layer.style.setProperty("transition", "opacity 560ms ease");

  eventRemoveTimer = setTimeout(()=>{
    eventRemoveTimer = null;
    layer.remove();
  }, 720);
}

// exported startup

window.setupEventSystem =
function(root){

setupEventSender(root);
setupEventRealtime();

};
