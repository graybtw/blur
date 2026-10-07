/* =========================================================
   np-bg-canvas.js
   Spotify-"Canvas"-style animated background for the fullscreen
   Now Playing view: extracts dominant colors from the current
   track's cover art, then animates soft blurred color blobs
   drifting/morphing behind the lyrics.

   Drop this in after music.js (it hooks into the existing
   loadAndPlay flow by wrapping/patching, so no edits to
   music.js are required — see integration note at the bottom).
   ========================================================= */

(function () {

  const canvas = document.getElementById("np-bg-canvas");
  if (!canvas) return; // markup not present yet — see HTML note below

  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let blobs = [];
  let currentColors = ["#3a3a38", "#1a1a18", "#55554f"];
  let targetColors = currentColors.slice();
  let colorLerpT = 1; // 1 = fully transitioned
  let rafId = null;
  let lastImgKey = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  window.addEventListener("resize", resize);

  /* ---- color extraction from the cover image ---- */

  function extractColors(imgEl, count = 4) {
    return new Promise((resolve) => {
      try {
        const sw = 48, sh = 48;
        const off = document.createElement("canvas");
        off.width = sw;
        off.height = sh;
        const octx = off.getContext("2d");
        octx.drawImage(imgEl, 0, 0, sw, sh);

        const { data } = octx.getImageData(0, 0, sw, sh);
        const buckets = new Map();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          // skip near-black / near-white / very low-saturation pixels
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const lightness = (max + min) / 2;
          const sat = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));
          if (lightness < 18 || lightness > 240) continue;

          const key = `${r >> 4}-${g >> 4}-${b >> 4}`; // coarse quantize
          const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, sat };
          entry.r += r; entry.g += g; entry.b += b; entry.n += 1;
          buckets.set(key, entry);
        }

        let sorted = [...buckets.values()]
          .map(e => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, n: e.n, sat: e.sat }))
          .sort((a, b) => (b.n * (0.4 + b.sat)) - (a.n * (0.4 + a.sat)));

        if (!sorted.length) {
          resolve(["#3a3a38", "#1a1a18", "#55554f", "#2a2a28"]);
          return;
        }

        const picked = [];
        for (const c of sorted) {
          if (picked.length >= count) break;
          const tooClose = picked.some(p =>
            Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) < 60
          );
          if (!tooClose) picked.push(c);
        }
        while (picked.length < count) picked.push(sorted[0]);

        resolve(picked.map(c => `rgb(${c.r | 0}, ${c.g | 0}, ${c.b | 0})`));
      } catch (err) {
        console.error("Color extraction failed:", err);
        resolve(["#3a3a38", "#1a1a18", "#55554f", "#2a2a28"]);
      }
    });
  }

  /* ---- blob setup ---- */

  function makeBlobs(colors) {
    return colors.map((color, i) => ({
      color,
      // normalized center (0-1), each blob wanders around its own anchor
      anchorX: 0.2 + (i % 2) * 0.6,
      anchorY: 0.2 + Math.floor(i / 2) * 0.6,
      radius: 0.55 + (i % 3) * 0.12,
      speed: 0.00018 + i * 0.00007,
      phase: i * 1.7,
      wobble: 0.28 + (i % 2) * 0.12,
    }));
  }

  function rgbToArr(str) {
    const m = str.match(/\d+/g);
    return m ? m.map(Number) : [58, 58, 56];
  }

  function lerpColor(a, b, t) {
    const [ar, ag, ab] = rgbToArr(a);
    const [br, bg, bb] = rgbToArr(b);
    return `rgb(${ar + (br - ar) * t | 0}, ${ag + (bg - ag) * t | 0}, ${ab + (bb - ab) * t | 0})`;
  }

  /* ---- render loop ---- */

  function draw(time) {
    const w = canvas.width, h = canvas.height;

    if (document.documentElement.classList.contains("performance-mode")) {
      rafId = null;
      return;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";

    if (colorLerpT < 1) colorLerpT = Math.min(1, colorLerpT + 0.006);

    blobs.forEach((b, i) => {
      const tt = time * b.speed + b.phase;
      const cx = (b.anchorX + Math.sin(tt) * b.wobble) * w;
      const cy = (b.anchorY + Math.cos(tt * 0.8) * b.wobble) * h;
      const r = b.radius * Math.max(w, h) * (0.85 + 0.15 * Math.sin(tt * 1.3));

      const displayColor = colorLerpT < 1
        ? lerpColor(currentColors[i] || b.color, targetColors[i] || b.color, colorLerpT)
        : (targetColors[i] || b.color);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, displayColor);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = "source-over";
    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    resize();
    // If the Now Playing panel isn't visible/laid out yet, the parent
    // rect can still be 0x0 even after resize() (e.g. opacity:0 but
    // display isn't none, or this runs before first layout). Retry on
    // the next couple of frames until we get real dimensions, instead
    // of silently animating into a zero-area buffer forever.
    if (canvas.width === 0 || canvas.height === 0) {
      requestAnimationFrame(() => {
        resize();
        if (canvas.width === 0 || canvas.height === 0) {
          requestAnimationFrame(start);
          return;
        }
        rafId = requestAnimationFrame(draw);
      });
      return;
    }
    rafId = requestAnimationFrame(draw);
  }

  // Re-measure every time the Now Playing panel is actually opened,
  // since that's the point layout is guaranteed correct.
  const npRoot = document.getElementById("music-nowplaying");
  if (npRoot) {
    const obs = new MutationObserver(() => {
      if (npRoot.classList.contains("open")) start();
    });
    obs.observe(npRoot, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---- public hook: call this whenever the current track changes ---- */

  async function updateNowPlayingBackground(imgUrl) {
    if (!imgUrl || imgUrl === lastImgKey) return;
    lastImgKey = imgUrl;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const colors = await extractColors(img, 4);
      targetColors = colors;
      currentColors = blobs.length
        ? blobs.map((b, i) => {
            const t = colorLerpT < 1 ? colorLerpT : 1;
            return lerpColor(currentColors[i] || colors[i], targetColors[i] || colors[i], t);
          })
        : colors.slice();
      blobs = makeBlobs(colors);
      colorLerpT = 0;
      if (!rafId) start();
    };
    img.onerror = () => {
      // CORS or load failure: fall back to a neutral palette so the
      // animation still runs even without real extracted colors.
      const fallback = ["#3a3a38", "#1a1a18", "#55554f", "#2a2a28"];
      targetColors = fallback;
      blobs = blobs.length ? blobs : makeBlobs(fallback);
      colorLerpT = 0;
      if (!rafId) start();
    };
    img.src = imgUrl;
  }

  window.updateNowPlayingBackground = updateNowPlayingBackground;

  window.addEventListener("blur-performance-mode-change", (event) => {
    const enabled = event.detail?.enabled ?? document.documentElement.classList.contains("performance-mode");
    if (enabled) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }
    if (npRoot && npRoot.classList.contains("open") &&
      !document.documentElement.classList.contains("performance-mode")) start();
  });

  // Seed blobs immediately but don't force a render loop until the
  // panel is actually visible (see MutationObserver above) — starting
  // blind here is what caused the 0x0-canvas bug.
  blobs = makeBlobs(currentColors);
  if (npRoot && npRoot.classList.contains("open")) start();

})();