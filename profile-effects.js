/*
 * Blur cosmetics: account-backed Profile Effects.
 *
 * This module intentionally stays separate from Chat's message/data logic.
 * Chat only provides its existing avatar elements; this renderer decorates
 * them when a public equipped-effect row is available.
 */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const assetUrl = (value) => {
    const url = String(value || "");
    return url ? `${url}${url.includes("?") ? "&" : "?"}r=6` : "";
  };

  // Supplied decorations are animated PNGs (APNG), so the browser should
  // play them natively instead of treating them as Blur sprite sheets.
  const decorationAsset = (name) => `decorations/${name}.png`;

  const BASE_EFFECTS = Object.freeze([
    { id: "glow", name: "Glow", section: "Essentials", description: "A warm half-halo blooms behind one corner of the avatar.", price: 80, rarity: "common", icon: "✦", asset: decorationAsset("aurora"), assetAnimation: "apng" },
    { id: "pulse", name: "Pulse", section: "Essentials", description: "Offset waves expand out from the avatar and settle.", price: 125, rarity: "common", icon: "◌", asset: decorationAsset("radiating_energy"), assetAnimation: "apng" },
    { id: "spark", name: "Spark", section: "Essentials", description: "A single bright burst cuts in from above-right.", price: 175, rarity: "rare", icon: "✧", asset: decorationAsset("stardust"), assetAnimation: "apng" },
    { id: "flame", name: "Flame", section: "Essentials", description: "Two rising tongues of fire frame the lower avatar.", price: 400, rarity: "epic", icon: "♨", asset: decorationAsset("fire"), assetAnimation: "apng" },
    { id: "fox-hat", name: "Fox Hat", section: "Critters", description: "A tiny fox hat with a slow, choppy blink.", price: 350, rarity: "epic", icon: "🦊", asset: decorationAsset("fox_hat"), assetAnimation: "apng" },
    { id: "bones", name: "Bones", section: "Critters", description: "Four quiet bone pieces tucked around your avatar.", price: 280, rarity: "rare", icon: "☠", asset: decorationAsset("crossbones"), assetAnimation: "apng" },
    { id: "angry", name: "Angry", section: "Reactions", description: "A red reaction snaps in with a sharp impact arc.", price: 320, rarity: "epic", icon: "!", asset: decorationAsset("angry"), assetAnimation: "apng" },
    { id: "toast", name: "Toast", section: "Breakfast", description: "A toast frame that gets eaten away until it disappears.", price: 200, rarity: "common", icon: "▣", asset: decorationAsset("toast"), assetAnimation: "apng" },
    { id: "pancakes", name: "Pancakes", section: "Breakfast", description: "Syrup pours over a stack and curls around your avatar.", price: 260, rarity: "rare", icon: "◒", asset: decorationAsset("pancakes"), assetAnimation: "apng" },
    { id: "egg", name: "Egg Drop", section: "Breakfast", description: "A big egg drops in, lands, then rolls off the side.", price: 340, rarity: "rare", icon: "◒", asset: decorationAsset("fried_egg"), assetAnimation: "apng" },
    { id: "coffee", name: "Coffee", section: "Breakfast", description: "A warm mug with steam drifting upward.", price: 240, rarity: "common", icon: "☕", asset: decorationAsset("morning_coffee"), assetAnimation: "apng" },
    { id: "leaf-wreath", name: "Leaf Wreath", section: "Nature", description: "A growing sprig curls up from the lower corner.", price: 220, rarity: "common", icon: "❧", asset: decorationAsset("strawberry_vine"), assetAnimation: "apng" },
    { id: "fireflies", name: "Fireflies", section: "Nature", description: "Fireflies appear one at a time in a loose scene.", price: 300, rarity: "rare", icon: "✺", asset: decorationAsset("fairy_sprites"), assetAnimation: "apng" },
    { id: "pixel", name: "Pixel", section: "Arcade", description: "A clean glitch snaps across two corners, then clears.", price: 240, rarity: "rare", icon: "▪", asset: decorationAsset("glitch"), assetAnimation: "apng" },
    { id: "arcade-coins", name: "Arcade Coins", section: "Arcade", description: "A coin follows an irregular arcade path around the avatar.", price: 330, rarity: "rare", icon: "◉", asset: decorationAsset("joystick"), assetAnimation: "apng" },
    { id: "arcade-hearts", name: "Player Two", section: "Arcade", description: "A heart meter builds up one pop at a time.", price: 360, rarity: "epic", icon: "♥", asset: decorationAsset("heart_to_heart"), assetAnimation: "apng" },
    { id: "orbit", name: "Orbit", section: "Cosmos", description: "A comet and coin pass in front of and behind the avatar.", price: 220, rarity: "rare", icon: "◉", asset: decorationAsset("solar_orbit"), assetAnimation: "apng" },
    { id: "comet", name: "Comet", section: "Cosmos", description: "A comet makes a curved pass with a visible tail.", price: 380, rarity: "epic", icon: "☄", asset: decorationAsset("stardust"), assetAnimation: "apng" },
    { id: "moon-stars", name: "Moon & Stars", section: "Cosmos", description: "A moon hangs above while stars appear and vanish.", price: 420, rarity: "epic", icon: "☾", asset: decorationAsset("faces_of_the_moon"), assetAnimation: "apng" },
    { id: "holographic", name: "Holographic", section: "Cosmos", description: "A spectrum arc slides across one side of the avatar.", price: 300, rarity: "epic", icon: "◇", asset: decorationAsset("chromawave"), assetAnimation: "apng" },
    { id: "rain-cloud", name: "Rain Cloud", section: "Weather", description: "Rain starts in staggered drops beneath a hovering cloud.", price: 270, rarity: "rare", icon: "☁", asset: decorationAsset("rainy_mood"), assetAnimation: "apng" },
    { id: "snowflake-crown", name: "Snowflake Crown", section: "Weather", description: "A large snowflake travels in a looping diagonal path.", price: 340, rarity: "rare", icon: "❄", asset: decorationAsset("snowfall"), assetAnimation: "apng" },
    { id: "pumpkin-vine", name: "Pumpkin Vine", section: "Harvest", description: "A vine grows from the lower corner and carries a pumpkin upward.", price: 290, rarity: "rare", icon: "◉", asset: decorationAsset("pumpkin_spice"), assetAnimation: "apng" },
    { id: "ocean-bubbles", name: "Ocean Bubbles", section: "Ocean", description: "Bubbles rise through a curved underwater path and pop.", price: 310, rarity: "rare", icon: "◌", asset: decorationAsset("koi_pond"), assetAnimation: "apng" }
  ]);
  // Imported decorations are grouped by visual theme rather than being
  // dumped into one catch-all bucket. Keep the rules filename-driven so new
  // files added to /decorations automatically land in a sensible section.
  const decorationSection = (effect) => {
    const source = `${effect?.id || ""} ${effect?.name || ""} ${effect?.asset || ""}`.toLowerCase();
    if (/(fall|autumn|harvest|pumpkin|maple|leaves|fox_hat)/.test(source)) return "Fall";
    if (/(pirate|scallywag|crossbones|cannon_fire|helmsman|parrot|good_ol_pepper)/.test(source)) return "Pirates";
    if (/(spongebob|patrick_star|sandy_cheeks|gary_the_snail|musclebob|imagination|flower_clouds)/.test(source)) return "SpongeBob";
    if (/(halloween|spooky|jack_o_lantern|graveyard|ghost|zombie|witch|skull|oni|skeleton|omen|malefic|bloodthirsty|death|shadow|soul|monster_you_created)/.test(source)) return "Halloween";
    if (/(toast|pancake|coffee|tea|donut|jam|berry|scrumptious|snack|boba|teacup|pepper|egg|depresso|cinnamon)/.test(source)) return "Breakfast";
    if (/(blanket|cozy|cottage|candlelight|post_it|sleep|study|chilledcow|headphone|fresh_pine|mallow)/.test(source)) return "Cozy";
    if (/(ocean|water|koi|mermaid|fish|sandy_cheeks|patrick|bubble)/.test(source)) return "Ocean";
    if (/(flower|floral|bloom|dandelion|forest|leaf|vine|mushroom|sprout|lotus|sakura|arbor|garden|oasis|flora|chrysanthemum|honeyblossom|mech_flora|butterfl|fairy|fairies|nature|petal|glop)/.test(source)) return "Nature";
    if (/(cat|dog|fox|bunny|frog|owlbear|wolf|unicorn|dragon|fish|koi|snail|slither|beast|chillet|chewbert|gawblehop|lamball|mokoko|torgal|winkle|spongebob|doodlezard|cattiva|stinkums|goblin|musclebob|bush_camper|polar_bear|snake|kitsune)/.test(source)) return "Animals";
    if (/(magic|wizard|sword|phoenix|crystal|potion|portal|crown|rune|spirit|mermaid|kabuto|wand|treasure|atlas|sorceress|imagination|eldritch|arcane|alchemy|pipedream|timekeeper|blade_storm|gelatinous|the_mark)/.test(source)) return "Fantasy";
    if (/(astronaut|black_hole|aurora|solar|lunar|moon|constellation|star|anomaly|spaceport|ufo|galaxy|dusk_and_dawn|earth|cosmic|orbit|yoru)/.test(source)) return "Space";
    if (/(joystick|controller|dice|arcade|fighter|valorant|tga_|player|victory|clyde|gaming|scallywag|pirate|saw|batarang|shuriken|nibbles|frag_out|pal_sphere|hot_shot|los_santos|battle_field|street_fighter)/.test(source)) return "Arcade";
    if (/(confetti|firecrackers|new_year|lucky|lantern|string_lights|festive|celebration|fest|cannon|box_|rainbow)/.test(source)) return "Celebration";
    if (/(air|smoke|rain|snow|ice|icicle|cloud|snowglobe|water)/.test(source)) return "Weather";
    if (/(futuristic|gyroscope|cyber|digital|neural|hexcore|powered|headset|implant|tech|computer|glitch|chromawave|beamchop|laser|hex_lights|helmet)/.test(source)) return "Technology";
    if (/(lightning|energy|flame|fire|shield|ki_energy|radiating|defensive)/.test(source)) return "Energy";
    if (/(angry|rage|dismay|awe|nervous|panic|tears|sweat|shocked|love|heart|uwu|starry_eyed|group_hug|feelin|in_love|heartbloom|balance|reyna)/.test(source)) return "Reactions";
    if (/(cammy|chun|guile|juri|ken|ryu|bison|hailey|jeff|lofi_girl|m_bison|midnight_sorceress|akuma|fuchsia_agent|minions|wingman|chuck|im_a_clown|bowler_hat|hood_|straw_hat|helmsman|selyne)/.test(source)) return "Characters";
    if (/(brass_beats|doodling|fan_flourish|clove|music|beats)/.test(source)) return "Music & Art";
    return "Music & Art";
  };
  const IMPORTED_EFFECTS = Array.isArray(window.BLUR_DECORATION_CATALOG)
    ? window.BLUR_DECORATION_CATALOG.map((effect) => ({
      ...effect,
      assetAnimation: "apng",
      icon: effect.icon || "✦",
      section: decorationSection(effect)
    }))
    : [];
  // Profile-wide effects supplied in /effects. These are Discord-style APNG
  // overlays: the intro plays once, then the loop stays over the profile.
  // Keep this catalog explicit because a browser cannot enumerate a folder.
  const EFFECT_FOLDER_EFFECTS = Object.freeze([
    ["boost-relic", "Boost Relic", "Energy", "A bright relic surge that sweeps across your profile.", "effects/boost-relic-intro.png", "effects/boost-relic-loop.png"],
    ["cyberspace", "Cyberspace", "Technology", "A cool digital field flickers around your profile.", "effects/cyberspace-intro.png", "effects/cyberspace-loop.png"],
    ["dark-omens", "Dark Omens", "Halloween", "Dark silhouettes and omens drift through your profile.", "effects/dark-omens-intro.png", "effects/dark-omens-loop.png"],
    ["dragon-dance", "Dragon Dance", "Fantasy", "A dragon coils through a warm, animated profile scene.", "effects/dragon-dance-intro.png", "effects/dragon-dance-loop.png"],
    ["hydro-blast", "Hydro Blast", "Ocean", "A splash of water energy washes across the profile.", "effects/hydro-blast-intro.png", "effects/hydro-blast-loop.png"],
    ["ki-detonate", "Ki Detonate", "Energy", "A concentrated burst of energy breaks into motion.", "effects/ki-detonate-intro.png", "effects/ki-detonate-loop.png"],
    ["magic-hearts", "Magic Hearts", "Reactions", "A soft field of magical hearts surrounds the profile.", "effects/magic-hearts-intro.png", "effects/magic-hearts-loop.png"],
    ["mastery", "Mastery", "Essentials", "A polished, focused profile animation with a confident finish.", "effects/mastery-intro.png", "effects/mastery-loop.png"],
    ["pixie-dust", "Pixie Dust", "Fantasy", "A trail of pixie dust glitters around your profile.", "effects/pixie-dust-loop.png", "effects/pixie-dust-loop.png"],
    ["power-surge", "Power Surge", "Energy", "A sharp surge of power travels across the profile.", "effects/power-surge-intro.png", "effects/power-surge-loop.png"],
    ["spring-bloom", "Spring Bloom", "Nature", "A fresh bloom opens into a looping profile scene.", "effects/spring-bloom-intro.png", "effects/spring-bloom-loop.png"],
    ["sushi-mania", "Sushi Mania", "Food", "A playful sushi-themed animation brings the profile to life.", "effects/sushi-mania-intro.png", "effects/sushi-mania-loop.png"],
    ["vortex", "Vortex", "Space", "A swirling vortex pulls the profile into motion.", "effects/vortex-intro.png", "effects/vortex-loop.png"],
    ["zombie-slime", "Zombie Slime", "Halloween", "A spooky slime animation crawls through the profile.", "effects/zombie-slime-intro.png", "effects/zombie-slime-loop.png"]
  ].map(([id, name, section, description, introAsset, asset]) => ({
    id: `profile-${id}`,
    name,
    section,
    description,
    price: 0,
    rarity: "common",
    icon: "✦",
    introAsset,
    asset,
    assetAnimation: "apng",
    profileSurface: true
  })));
  const AVATAR_BORDER_EFFECTS = Object.freeze([...BASE_EFFECTS, ...IMPORTED_EFFECTS]);
  const PROFILE_EFFECTS = Object.freeze([...EFFECT_FOLDER_EFFECTS]);
  const EFFECTS = Object.freeze([...AVATAR_BORDER_EFFECTS, ...PROFILE_EFFECTS]);
  const SECTION_ORDER = ["Fall", "Pirates", "SpongeBob", "Halloween", "Breakfast", "Cozy", "Nature", "Animals", "Fantasy", "Space", "Arcade", "Technology", "Weather", "Energy", "Reactions", "Celebration", "Ocean", "Food", "Characters", "Music & Art", "Essentials", "Harvest", "Critters", "Seasonal", "Cosmos"];
  const effectSection = (effect) => {
    if (effect?.id === "pumpkin-vine" || effect?.id === "fox-hat") return "Fall";
    if (effect?.id === "bones") return "Pirates";
    return effect?.section || "Essentials";
  };

  const state = {
    userId: null,
    tokens: 0,
    owned: new Set(AVATAR_BORDER_EFFECTS.map((effect) => effect.id)),
    profileOwned: new Set(PROFILE_EFFECTS.map((effect) => effect.id)),
    equipped: null,
    profileEquipped: null,
    achievements: [],
    catalog: AVATAR_BORDER_EFFECTS.map((effect) => ({ ...effect })),
    profileCatalog: PROFILE_EFFECTS.map((effect) => ({ ...effect })),
    available: false,
    profileAvailable: false,
    error: "",
    profileError: "",
    loading: false
  };
  const publicBorders = new Map();
  const publicProfileEffects = new Map();
  const publicPending = new Set();
  let mountedHost = null;
  let animationSequence = 0;
  const pickerPreviewFrames = new Map();
  const pickerPreviewLoads = new Map();
  const pickerPreviewDecoders = new Map();

  // Canvas snapshots of an animated <img> are inconsistent for APNGs: in
  // Chromium they can keep returning frame 0 even after the image has been
  // playing for a while. ImageDecoder gives the picker a deterministic frame
  // at roughly the requested point in the intro instead.
  async function decodePickerFrame(source, targetMs = 500) {
    if (typeof window.ImageDecoder !== "function" || typeof window.fetch !== "function") return "";
    let decoder = null;
    let chosen = null;
    try {
      const response = await fetch(assetUrl(source), { cache: "no-store" });
      if (!response.ok) return "";
      const bytes = await response.arrayBuffer();
      decoder = new window.ImageDecoder({ data: bytes, type: response.headers.get("content-type") || "image/png" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = Math.max(1, Number(track?.frameCount) || 1);
      let elapsed = 0;
      for (let index = 0; index < frameCount; index += 1) {
        const result = await decoder.decode({ frameIndex: index });
        const frame = result?.image;
        if (!frame) continue;
        if (chosen && typeof chosen.close === "function") chosen.close();
        chosen = frame;
        if (elapsed >= targetMs || index === frameCount - 1) break;
        const durationMs = Number(frame.duration || 0) / 1000;
        elapsed += durationMs > 0 ? durationMs : Math.max(1, targetMs / frameCount);
      }
      if (!chosen) return "";
      const canvas = document.createElement("canvas");
      canvas.width = chosen.displayWidth || chosen.codedWidth || 1;
      canvas.height = chosen.displayHeight || chosen.codedHeight || 1;
      canvas.getContext("2d", { alpha: true })?.drawImage(chosen, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (_) {
      return "";
    } finally {
      if (chosen && typeof chosen.close === "function") chosen.close();
      if (decoder && typeof decoder.close === "function") decoder.close();
    }
  }

  // A URL fragment does not create a new image resource in Chromium; the
  // decoded APNG can therefore be reused after a picker/profile is reopened.
  // Use a query parameter instead so each animation gets a fresh decoder.
  const freshAnimationUrl = (value, scope) => {
    const base = assetUrl(value);
    return base ? `${base}&${scope}=${Date.now()}-${++animationSequence}` : "";
  };

  function bindPickerAnimationPreviews(container) {
    if (!container) return;
    container.querySelectorAll("[data-picker-animation-src]").forEach((image) => {
      const source = image.dataset.pickerAnimationSrc;
      const tile = image.closest("[data-blur-effect-preview], .blur-owned-effect, .blur-shop-card");
      if (!source || !tile || image.dataset.pickerPreviewBound === "true") return;
      image.dataset.pickerPreviewBound = "true";
      const frameDelay = Math.max(0, Number(image.dataset.pickerFrameDelay) || 0);
      const staticFrame = pickerPreviewFrames.get(source);
      const showStatic = (frame = staticFrame) => {
        if (!image.isConnected) return;
        if (frame) {
          image.dataset.pickerStaticSrc = frame;
          image.src = frame;
          image.classList.add("is-static");
          image.hidden = false;
        } else {
          image.hidden = true;
        }
      };
      const showAnimation = () => {
        if (!image.isConnected) return;
        image.hidden = false;
        image.classList.remove("is-static");
        image.src = freshAnimationUrl(source, "pickerHover");
      };
      const restoreStatic = () => showStatic(image.dataset.pickerStaticSrc || pickerPreviewFrames.get(source));
      const publishStaticFrame = (frame) => {
        document.querySelectorAll("[data-picker-animation-src]").forEach((candidate) => {
          if (candidate.dataset.pickerAnimationSrc !== source) return;
          const owner = candidate.closest("[data-blur-effect-preview], .blur-owned-effect, .blur-shop-card");
          if (!owner?.matches(":hover") && !owner?.contains(document.activeElement)) {
            candidate.dataset.pickerStaticSrc = frame;
            candidate.src = frame;
            candidate.classList.add("is-static");
            candidate.hidden = false;
          }
        });
      };
      tile.addEventListener("pointerenter", showAnimation);
      tile.addEventListener("pointerleave", restoreStatic);
      tile.addEventListener("focusin", showAnimation);
      tile.addEventListener("focusout", restoreStatic);
      restoreStatic();
      if (staticFrame || (pickerPreviewLoads.has(source) && pickerPreviewDecoders.has(source))) return;
      pickerPreviewLoads.set(source, true);
      if (frameDelay && typeof window.ImageDecoder === "function") {
        const job = decodePickerFrame(source, frameDelay);
        pickerPreviewDecoders.set(source, job);
        job.then((frame) => {
          if (frame) {
            pickerPreviewFrames.set(source, frame);
            publishStaticFrame(frame);
          }
          pickerPreviewDecoders.delete(source);
        }).catch(() => pickerPreviewDecoders.delete(source));
        return;
      }
      const decoder = new Image();
      decoder.onload = () => {
        const captureFrame = async () => {
          if (!image.isConnected && !frameDelay) return;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = decoder.naturalWidth || 1;
            canvas.height = decoder.naturalHeight || 1;
            const context = canvas.getContext("2d", { alpha: true });
            if (frameDelay && typeof createImageBitmap === "function") {
              const bitmap = await createImageBitmap(decoder);
              context?.drawImage(bitmap, 0, 0);
              bitmap.close?.();
            } else {
              context?.drawImage(decoder, 0, 0);
            }
            const frame = canvas.toDataURL("image/png");
            pickerPreviewFrames.set(source, frame);
            publishStaticFrame(frame);
            if (decoder.parentNode) decoder.remove();
            pickerPreviewDecoders.delete(source);
          } catch (_) { /* keep the quiet placeholder if a frame cannot be decoded */ }
        };
        if (frameDelay) {
          setTimeout(captureFrame, frameDelay);
          return;
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = decoder.naturalWidth || 1;
          canvas.height = decoder.naturalHeight || 1;
          canvas.getContext("2d", { alpha: true })?.drawImage(decoder, 0, 0);
          const frame = canvas.toDataURL("image/png");
          pickerPreviewFrames.set(source, frame);
          publishStaticFrame(frame);
        } catch (_) { /* keep the quiet placeholder if a frame cannot be decoded */ }
        pickerPreviewDecoders.delete(source);
      };
      decoder.onerror = () => {
        pickerPreviewLoads.delete(source);
        pickerPreviewDecoders.delete(source);
      };
      pickerPreviewDecoders.set(source, decoder);
      if (frameDelay) {
        // Chromium can hold a detached APNG on its first frame. Keep this
        // decoder just off-screen while the delayed profile thumbnail frame
        // advances, then remove it after capture.
        decoder.setAttribute("aria-hidden", "true");
        // Keep the decoder in a real, rendered layer while it advances. Some
        // Chromium builds freeze APNGs that are negative-z-index or clipped,
        // which would make every cover fall back to the transparent first
        // frame. It is off-screen and nearly transparent, so it never shows
        // to the user but still receives animation frames reliably.
        decoder.style.cssText = "position:fixed;left:-10000px;top:0;width:450px;height:880px;opacity:0.01;z-index:2147483647;pointer-events:none;object-fit:contain;";
        document.body.appendChild(decoder);
      }
      decoder.src = freshAnimationUrl(source, "pickerFrame");
    });
  }
  let observerStarted = false;
  // Keep each cosmetics picker independent. The profile-effect chooser and
  // avatar-border chooser used to share one expansion flag, so opening (or
  // equipping from) one picker could unexpectedly expand the other one too.
  const pickerState = { borders: false, profile: false };

  function account() { return typeof Account !== "undefined" ? Account : null; }
  function currentUserId() { return account()?.user?.id || null; }
  function icon(name) {
    const paths = {
      wave: '<path d="M4 12c2.2-4 4.5-4 6.7 0s4.5 4 6.7 0"/><path d="M4 17c2.2-4 4.5-4 6.7 0s4.5 4 6.7 0"/>',
      message: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
      spark: '<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>',
      profile: '<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }
  function effectById(id) { return state.catalog.find((effect) => effect.id === id) || EFFECTS.find((effect) => effect.id === id) || null; }
  function profileEffectById(id) { return state.profileCatalog.find((effect) => effect.id === id) || PROFILE_EFFECTS.find((effect) => effect.id === id) || null; }
  function isAvatarBorderId(id) { return !!id && AVATAR_BORDER_EFFECTS.some((effect) => effect.id === id); }
  function isProfileEffectId(id) { return !!id && PROFILE_EFFECTS.some((effect) => effect.id === id); }
  function isSettingsVisible(page) {
    const panel = document.querySelector('[data-panel="settings"]');
    return !!panel?.classList.contains("active") && !!panel.querySelector(`.settings-page[data-page="${page}"]`)?.classList.contains("active");
  }
  function openAuth(mode = "signin") { account()?.user ? null : window.AccountUI?.openAuthOverlay?.(mode); }
  function unavailableMarkup(message = "Profile Effects are still being set up.") {
    return `<div class="settings-profile-empty blur-cosmetics-unavailable"><strong>Profile cosmetics unavailable</strong><span>${esc(message)}</span><small>Run the open Profile Effects migration to enable global equipped-effect syncing.</small></div>`;
  }
  function signedOutMarkup(label) {
    return `<div class="settings-profile-empty blur-cosmetics-signed-out"><strong>${esc(label)}</strong><span>Sign in to equip Profile Effects and keep your choice across devices.</span><button type="button" class="small-button ui-button ui-button--primary ui-button--sm" data-cosmetics-signin>Sign in</button></div>`;
  }
  function bindAuthButton(container) {
    container?.querySelector("[data-cosmetics-signin]")?.addEventListener("click", () => openAuth("signin"));
  }

  async function load() {
    const userId = currentUserId();
    state.userId = userId;
    state.tokens = 0;
    state.owned = new Set(AVATAR_BORDER_EFFECTS.map((effect) => effect.id));
    state.profileOwned = new Set(PROFILE_EFFECTS.map((effect) => effect.id));
    state.equipped = null;
    state.profileEquipped = null;
    state.achievements = [];
    state.available = false;
    state.profileAvailable = false;
    state.error = "";
    state.profileError = "";
    if (!userId || typeof sb === "undefined") {
      refreshMounted();
      return;
    }
    if (state.loading) return;
    state.loading = true;
    try {
      // The open cosmetics library is local artwork plus one public equipped
      // ID. There is no token, achievement, purchase, or ownership gate.
      const [equippedResult, profileEquippedResult] = await Promise.all([
        sb.from("blur_effect_equipped").select("effect_id").eq("user_id", userId).maybeSingle(),
        sb.from("blur_profile_effect_equipped").select("effect_id").eq("user_id", userId).maybeSingle()
      ]);
      if (equippedResult.error) throw equippedResult.error;
      state.catalog = AVATAR_BORDER_EFFECTS.map((effect) => ({ ...effect }));
      state.profileCatalog = PROFILE_EFFECTS.map((effect) => ({ ...effect }));
      const legacyEquippedId = equippedResult.data?.effect_id || null;
      // Older builds stored both cosmetic types in blur_effect_equipped.
      // Never let a legacy Profile Effect fall through as an Avatar Border:
      // doing so wraps the avatar host and shifts the profile identity row.
      state.equipped = isAvatarBorderId(legacyEquippedId) ? legacyEquippedId : null;
      state.available = true;
      if (profileEquippedResult.error) {
        state.profileError = profileEquippedResult.error.message || "Run the Profile Effects migration to enable this section.";
        state.profileEquipped = isProfileEffectId(legacyEquippedId) ? legacyEquippedId : null;
      } else {
        const profileId = profileEquippedResult.data?.effect_id || null;
        state.profileEquipped = isProfileEffectId(profileId) ? profileId : (isProfileEffectId(legacyEquippedId) ? legacyEquippedId : null);
        state.profileAvailable = true;
      }
    } catch (error) {
      state.error = error?.message || "The cosmetics service is unavailable.";
    } finally {
      state.loading = false;
      refreshMounted();
      decorateVisibleAvatars();
    }
  }

  async function claimAchievement(id) {
    if (!state.available || !state.userId) return;
    try {
      const { error } = await sb.rpc("blur_claim_achievement", { p_achievement_id: id });
      if (error) throw error;
      await load();
      document.dispatchEvent(new CustomEvent("blur-cosmetics-feedback", { detail: { kind: "claim", id } }));
    } catch (error) {
      const target = document.querySelector(`[data-achievement-id="${CSS.escape(id)}"] [data-achievement-error]`);
      if (target) target.textContent = error?.message || "Could not claim that achievement.";
    }
  }

  async function purchaseEffect(id) {
    if (!state.available || !state.userId) return;
    const button = document.querySelector(`[data-shop-effect="${CSS.escape(id)}"] [data-effect-buy]`);
    if (button) { button.disabled = true; button.textContent = "Purchasing…"; }
    try {
      const { error } = await sb.rpc("blur_purchase_effect", { p_effect_id: id });
      if (error) throw error;
      await load();
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = `Buy · ${effectById(id)?.price || 0}`; }
      const card = document.querySelector(`[data-shop-effect="${CSS.escape(id)}"]`);
      if (card) card.querySelector("[data-shop-error]").textContent = error?.message || "Could not purchase this effect.";
    }
  }

  async function equipBorder(id) {
    if (!state.available || !state.userId) return;
    try {
      const { error } = await sb.rpc("blur_equip_effect", { p_effect_id: id || null });
      if (error) throw error;
      await load();
    } catch (error) {
      const target = mountedHost?.querySelector('[data-profile-effects-error="borders"]');
      if (target) target.textContent = error?.message || "Could not update your equipped effect.";
    }
  }

  async function equipProfileEffect(id) {
    if (!state.profileAvailable || !state.userId) return;
    try {
      const { error } = await sb.rpc("blur_equip_profile_effect", { p_effect_id: id || null });
      if (error) throw error;
      await load();
    } catch (error) {
      const target = mountedHost?.querySelector('[data-profile-effects-error="profile"]');
      if (target) target.textContent = error?.message || "Could not update your equipped Profile Effect.";
    }
  }

  function renderAchievements(container) {
    if (!container) return;
    if (!state.userId) { container.innerHTML = signedOutMarkup("Sign in to view achievements."); bindAuthButton(container); return; }
    if (!state.available) { container.innerHTML = unavailableMarkup(state.error); return; }
    const rows = state.achievements.map((achievement) => {
      const progress = Math.max(0, Number(achievement.progress) || 0);
      const target = Math.max(1, Number(achievement.target) || 1);
      const claimed = !!achievement.claimed;
      const completed = !!achievement.completed;
      const status = claimed ? "Claimed" : completed ? "Completed · Claim" : `${Math.min(progress, target)} / ${target}`;
      return `<article class="blur-achievement-row${claimed ? " is-claimed" : completed ? " is-complete" : ""}" data-achievement-id="${esc(achievement.id)}">
        <div class="blur-achievement-icon">${icon(achievement.icon)}</div>
        <div class="blur-achievement-copy"><strong>${esc(achievement.name)}</strong><span>${esc(achievement.description)}</span><small>${esc(status)}</small>${!claimed && !completed && target > 1 ? `<div class="blur-achievement-progress"><i style="width:${Math.round((Math.min(progress, target) / target) * 100)}%"></i></div>` : ""}</div>
        <div class="blur-achievement-reward"><strong>${Number(achievement.reward) || 0}</strong><small>Tokens</small>${completed && !claimed ? `<button type="button" class="ui-button ui-button--primary ui-button--sm" data-achievement-claim="${esc(achievement.id)}">Claim</button>` : ""}<em data-achievement-error></em></div>
      </article>`;
    }).join("");
    container.innerHTML = `<h3 class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"></path><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4M12 13v4M8 20h8M9 17h6"></path></svg></span>Achievements</h3><p class="theme-section-caption">Complete milestones across Blur and turn them into profile cosmetics.</p><div class="achievements-token-row setting-row"><div class="row-info"><span>Token balance</span><small>Earned from claimed achievements.</small></div><div class="blur-token-balance"><strong>${state.tokens.toLocaleString()}</strong><small>Tokens</small></div></div><div class="blur-achievement-list">${rows || `<div class="blur-cosmetics-empty">No achievements are available yet.</div>`}</div>`;
    container.querySelectorAll("[data-achievement-claim]").forEach((button) => button.addEventListener("click", () => claimAchievement(button.dataset.achievementClaim)));
  }

  function previewMarkup(effect, context = "shop") {
    // The tile is only the preview surface. The renderer itself wraps the
    // avatar target, exactly like real profile/message avatars do, so the
    // effect never gets a second, preview-only implementation.
    // Chooser/shop tiles are still previews, so use the supplied intro frame
    // and never start the looping artwork inside a tile.
    // Keep the picker still by default. The first frame is decoded into a
    // static thumbnail below, then a fresh animated image is mounted only
    // while the tile is hovered or focused.
    const previewAsset = effect.introAsset || effect.asset;
    const asset = previewAsset
      ? `<img class="blur-profile-effect-asset" data-picker-animation-src="${esc(previewAsset)}" data-picker-frame-delay="${effect.profileSurface ? "1000" : "0"}" alt="" aria-hidden="true" hidden>`
      : "";
    // Effect tiles are artwork-first. Keep the avatar target transparent so
    // legacy emoji/icon placeholders never appear over the decoration.
    const target = `<span class="blur-effect-avatar blur-effect-avatar--empty blur-profile-effect-target" aria-hidden="true"></span>`;
    return `<div class="blur-effect-preview blur-effect-preview--${esc(context)}" data-blur-effect-preview="${esc(effect.id)}"><span class="blur-profile-effect-renderer blur-profile-effect-host" data-blur-profile-effect="${esc(effect.id)}">${asset}${target}</span></div>`;
  }
  function renderShop(container) {
    if (!container) return;
    if (!state.userId) { container.innerHTML = signedOutMarkup("Sign in to open the Profile Shop."); bindAuthButton(container); return; }
    if (!state.available) { container.innerHTML = unavailableMarkup(state.error); return; }
    const renderCard = (effect) => {
      const owned = state.owned.has(effect.id);
      const equipped = state.equipped === effect.id;
      return `<article class="blur-shop-card${equipped ? " is-equipped" : ""}" data-shop-effect="${esc(effect.id)}"><div class="blur-shop-card-top">${previewMarkup(effect)}<span class="blur-effect-price">${Number(effect.price) || 0} Tokens</span></div><strong>${esc(effect.name)}</strong><p>${esc(effect.description)}</p><div class="blur-shop-card-foot">${equipped ? `<span class="blur-shop-owned">Equipped</span>` : owned ? `<span class="blur-shop-owned">Owned</span>` : `<button type="button" class="ui-button ui-button--secondary ui-button--sm" data-effect-buy>Buy</button>`}</div><small class="blur-shop-error" data-shop-error></small></article>`;
    };
    const groups = SECTION_ORDER.map((section) => {
      const effects = state.catalog.filter((effect) => effectSection(effect) === section);
      if (!effects.length) return "";
      return `<section class="blur-shop-section" data-effect-section="${esc(section)}"><h4 class="blur-effects-group-label">${esc(section)}</h4><div class="blur-shop-grid">${effects.map(renderCard).join("")}</div></section>`;
    }).join("");
    const extras = state.catalog.filter((effect) => !SECTION_ORDER.includes(effectSection(effect)));
    const extraGroup = extras.length ? `<section class="blur-shop-section"><h4 class="blur-effects-group-label">More</h4><div class="blur-shop-grid">${extras.map(renderCard).join("")}</div></section>` : "";
    container.innerHTML = `<div class="blur-cosmetics-heading"><div><span class="settings-content-kicker">Profile cosmetics</span><h3>Shop</h3><p>Spend Tokens on effects that follow your profile across Blur.</p></div><div class="blur-token-balance"><strong>${state.tokens.toLocaleString()}</strong><small>Tokens</small></div></div><div class="blur-shop-sections">${groups}${extraGroup}</div>`;
    bindPickerAnimationPreviews(container);
    container.querySelectorAll("[data-shop-effect]").forEach((card) => card.querySelector("[data-effect-buy]")?.addEventListener("click", () => purchaseEffect(card.dataset.shopEffect)));
  }

  function mountEffectSection(host) {
    const editor = host?.querySelector(".acct-editor-inline");
    const grid = editor?.querySelector(".acct-editor-grid");
    if (!grid || grid.querySelector("[data-avatar-borders-section]")) return;
    const borders = document.createElement("section");
    borders.className = "acct-editor-section blur-avatar-borders-section";
    borders.dataset.avatarBordersSection = "true";
    borders.innerHTML = `<div class="acct-section-heading blur-effects-section-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true">${icon("spark")}</span>Avatar decoration</span><span class="acct-section-note">A frame around your photo</span></div><div class="blur-effects-intro"><strong>Avatar decoration</strong><small>A frame around your photo.</small></div><div class="blur-owned-effects" data-owned-effects="borders"></div><small class="blur-profile-effects-error" data-profile-effects-error="borders"></small>`;
    const profiles = document.createElement("section");
    profiles.className = "acct-editor-section blur-profile-effects-section";
    profiles.dataset.profileEffectsSection = "true";
    profiles.innerHTML = `<div class="acct-section-heading blur-effects-section-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true">${icon("spark")}</span>Profile effect</span><span class="acct-section-note">An animated overlay on your profile card</span></div><div class="blur-effects-intro"><strong>Profile effect</strong><small>An animated overlay on your profile card in Chat.</small></div><div class="blur-owned-effects" data-owned-effects="profile"></div><small class="blur-profile-effects-error" data-profile-effects-error="profile"></small>`;
    // Keep both cosmetic pickers together after the About section in the
    // profile editor stack. This leaves the identity/about fields together
    // and keeps cosmetics as the final profile-customization group.
    const customization = document.createElement("section");
    customization.className = "acct-editor-section profile-customization-section";
    customization.innerHTML = `<div class="acct-section-heading profile-customization-heading"><span class="acct-section-label"><span class="acct-section-icon" aria-hidden="true">${icon("spark")}</span>Customization</span><span class="acct-section-note">Personalize your profile</span></div>`;
    customization.append(borders, profiles);
    const aboutSection = grid.querySelector(".acct-editor-section-about");
    if (aboutSection) grid.insertBefore(customization, aboutSection.nextSibling);
    else grid.append(customization);
    renderOwnedEffects(borders.querySelector('[data-owned-effects="borders"]'), "borders");
    renderOwnedEffects(profiles.querySelector('[data-owned-effects="profile"]'), "profile");
  }

  function renderOwnedEffects(container, kind = "borders") {
    if (!container) return;
    const isProfile = kind === "profile";
    const catalog = isProfile ? state.profileCatalog : state.catalog;
    const available = isProfile ? state.profileAvailable : state.available;
    const equipped = isProfile ? state.profileEquipped : state.equipped;
    const emptyLabel = isProfile ? "Profile Effects" : "Avatar Borders";
    const equipAttr = isProfile ? "data-profile-effect-equip" : "data-effect-equip";
    const action = isProfile ? "equipProfileEffect" : "equipBorder";
    const expanded = !!pickerState[kind];
    if (!state.userId) { container.innerHTML = `<span class="blur-owned-effects-empty">Sign in to equip ${emptyLabel}.</span>`; return; }
    if (!available) { container.innerHTML = `<span class="blur-owned-effects-empty">${esc(emptyLabel)} will appear here when the cosmetics service is enabled.</span>`; return; }
    const owned = catalog.filter(Boolean);
    const noneTile = isProfile
      ? `<button type="button" class="blur-owned-effect blur-owned-effect--none blur-owned-effect--profile-none${equipped ? "" : " is-equipped"}" ${equipAttr}="" aria-label="No ${esc(emptyLabel.toLowerCase())}" aria-pressed="${!equipped}"><span class="blur-profile-none-label">None</span></button>`
      : `<button type="button" class="blur-owned-effect blur-owned-effect--none${equipped ? "" : " is-equipped"}" ${equipAttr}="" aria-label="No ${esc(emptyLabel.toLowerCase())}" aria-pressed="${!equipped}"><span class="blur-profile-none-label">None</span></button>`;
    const effectTile = (effect) => `<button type="button" class="blur-owned-effect${equipped === effect.id ? " is-equipped" : ""}" ${equipAttr}="${esc(effect.id)}" aria-label="${esc(effect.name)}" aria-pressed="${equipped === effect.id}">${previewMarkup(effect, "owned")}</button>`;
    const sorted = owned.slice().sort((a, b) => {
      const sectionDelta = SECTION_ORDER.indexOf(effectSection(a)) - SECTION_ORDER.indexOf(effectSection(b));
      return sectionDelta || String(a.name || a.id).localeCompare(String(b.name || b.id));
    });
    let tiles = "";
    if (!expanded) {
      // One compact row: keep the no-effect option first, then the first line
      // of the catalog. The rest remains available behind the explicit action.
      const previewEffects = sorted.slice(0, 6);
      tiles = `<div class="blur-effects-group blur-effects-group--preview"><span class="blur-effects-group-label">Featured</span><div class="blur-owned-effects-grid blur-owned-effects-grid--preview">${noneTile}${previewEffects.map(effectTile).join("")}</div><button type="button" class="ui-button ui-button--secondary ui-button--sm blur-effects-view-all" aria-label="Choose ${esc(isProfile ? "profile effect" : "avatar decoration")}" data-view-all-effects="${esc(kind)}" data-effects-expanded="false">Choose</button></div>`;
    } else {
      const toggleIcon = `<svg class="blur-effects-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"></path></svg>`;
      if (isProfile) {
        // Profile effects are a visual gallery, not a categorized border list.
        // Keep the full artwork grid together so it reads like the reference.
        const profileGrid = `${noneTile}${sorted.map(effectTile).join("")}`;
        tiles = `<div class="blur-effects-group blur-effects-group--profile"><div class="blur-owned-effects-grid blur-owned-effects-grid--profile">${profileGrid}</div></div><button type="button" class="ui-button ui-button--secondary ui-button--sm blur-effects-view-all" aria-label="Done choosing profile effect" data-view-all-effects="${esc(kind)}" data-effects-expanded="true">Done${toggleIcon}</button>`;
      } else {
        let nonePlaced = false;
        const groups = SECTION_ORDER.map((section) => {
          const effects = sorted.filter((effect) => effectSection(effect) === section);
          if (!effects.length) return "";
          let groupNone = "";
          if (!nonePlaced) {
            nonePlaced = true;
            groupNone = noneTile;
          }
          return `<div class="blur-effects-group"><span class="blur-effects-group-label">${esc(section)}</span><div class="blur-owned-effects-grid">${groupNone}${effects.map(effectTile).join("")}</div></div>`;
        }).join("");
        const fallback = `<div class="blur-effects-group"><span class="blur-effects-group-label">Music &amp; Art</span><div class="blur-owned-effects-grid">${noneTile}</div></div>`;
        tiles = `${groups || fallback}<button type="button" class="ui-button ui-button--secondary ui-button--sm blur-effects-view-all" aria-label="Done choosing avatar decoration" data-view-all-effects="${esc(kind)}" data-effects-expanded="true">Done${toggleIcon}</button>`;
      }
    }
    container.innerHTML = `<div class="blur-effects-groups${expanded ? " is-expanded" : ""}">${tiles}</div>`;
    bindPickerAnimationPreviews(container);
    container.querySelectorAll(`[${equipAttr}]`).forEach((button) => button.addEventListener("click", () => (isProfile ? equipProfileEffect(button.dataset.profileEffectEquip || null) : equipBorder(button.dataset.effectEquip || null))));
    container.querySelector("[data-view-all-effects]")?.addEventListener("click", () => {
      pickerState[kind] = !pickerState[kind];
      renderOwnedEffects(container, kind);
    });
  }

  function setProfileSubtab(target = "editor") {
    const shell = mountedHost?.closest(".profile-settings-shell");
    if (!shell) return;
    const editor = shell.querySelector(".acct-editor-inline, .settings-profile-empty");
    shell.querySelectorAll("[data-profile-subtab]").forEach((button) => { const active = button.dataset.profileSubtab === target; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); });
    if (editor) { editor.hidden = false; editor.setAttribute("aria-hidden", "false"); }
    const legacyShop = shell.querySelector("[data-profile-shop]");
    if (legacyShop) { legacyShop.hidden = true; legacyShop.setAttribute("aria-hidden", "true"); }
  }

  function mountProfileSettings(host) {
    if (!host) return;
    mountedHost = host;
    const shell = host.closest(".profile-settings-shell");
    if (!shell) return;
    const subtabs = shell.querySelectorAll("[data-profile-subtab]");
    subtabs.forEach((button) => {
      if (button.dataset.cosmeticsBound) return;
      button.dataset.cosmeticsBound = "true";
      button.addEventListener("click", () => setProfileSubtab(button.dataset.profileSubtab || "editor"));
    });
    mountEffectSection(host);
    setProfileSubtab("editor");
  }

  function refreshMounted() {
    if (mountedHost) {
      mountEffectSection(mountedHost);
      renderOwnedEffects(mountedHost.querySelector('[data-owned-effects="borders"]'), "borders");
      renderOwnedEffects(mountedHost.querySelector('[data-owned-effects="profile"]'), "profile");
    }
  }

  function applyEffect(el, effectId) {
    if (!el) return;
    let host = el.closest(".message-avatar-slot,.acct-avatar-wrap,.acct-profile-hero-avatar");
    if (!host) {
      host = el.parentElement?.classList.contains("blur-profile-effect-renderer") ? el.parentElement : null;
      if (!host && effectId) {
        const createdHost = document.createElement("span");
        if (!createdHost) return;
        host = createdHost;
        host.className = "blur-profile-effect-renderer";
        el.parentNode?.insertBefore(host, el);
        host.appendChild(el);
      }
    }
    host = host || el;
    if (!host) return;
    el.classList.add("blur-profile-effect-target");
    host.classList.add("blur-profile-effect-host");
    // Keep the legacy avatar-border attribute intact. Avatar Borders and the
    // separate profile-wide effect are intentionally composable.
    if (effectId) {
      el.dataset.blurProfileEffect = effectId;
      host.dataset.blurProfileEffect = effectId;
    } else {
      delete el.dataset.blurProfileEffect;
      delete host.dataset.blurProfileEffect;
    }
    // Profile effects live in their own catalog/table. Resolve them directly
    // first so effects such as Vortex and Mastery still render even when the
    // avatar-border catalog is the only catalog populated from the service.
    const effect = profileEffectById(effectId) || effectById(effectId);
    const asset = effect?.asset || "";
    const isSprite = effect?.assetAnimation === "sprite";
    // Profile-wide APNGs are rendered by applyProfileSurfaceEffect on the
    // profile card/preview. Do not squeeze those tall artwork files into a
    // 36px avatar slot; keep the avatar itself clean while legacy avatar
    // decorations continue to use this renderer.
    const avatarAsset = !!asset && !effect?.profileSurface;
    host.classList.toggle("blur-profile-effect-has-asset", avatarAsset);
    if (isSprite) {
      host.dataset.blurAssetAnimation = "sprite";
      host.dataset.blurAssetFrames = String(Number(effect.assetFrames) || 6);
      if (effect.assetSpriteRatio) host.dataset.blurAssetSpriteRatio = effect.assetSpriteRatio;
      else delete host.dataset.blurAssetSpriteRatio;
    } else {
      delete host.dataset.blurAssetAnimation;
      delete host.dataset.blurAssetFrames;
      delete host.dataset.blurAssetSpriteRatio;
    }
    const existingSprite = host.querySelector(":scope > .blur-profile-effect-sprite");
    const existingAsset = host.querySelector(":scope > .blur-profile-effect-asset");
    if (avatarAsset) {
      let image = existingAsset;
      if (isSprite) {
        const sprite = existingSprite || document.createElement("span");
        if (!sprite) return;
        sprite.className = "blur-profile-effect-sprite";
        image = sprite.querySelector(":scope > .blur-profile-effect-asset") || document.createElement("img");
        if (!image) return;
        image.className = "blur-profile-effect-asset";
        if (!image.parentElement) sprite.appendChild(image);
        if (effect.assetSpriteRatio) sprite.dataset.blurSpriteRatio = effect.assetSpriteRatio;
        else delete sprite.dataset.blurSpriteRatio;
        if (!existingSprite) host.insertBefore(sprite, host.firstElementChild);
        if (existingAsset && !sprite.contains(existingAsset)) existingAsset.remove();
      } else {
        // A host can be reused when an account switches effects. If the
        // previous asset was inside a sprite wrapper, remove that wrapper and
        // create/reinsert the APNG as a direct child instead of leaving a
        // detached image node behind.
        if (existingSprite) existingSprite.remove();
        image = host.querySelector(":scope > .blur-profile-effect-asset") || null;
      }
      if (!image) image = document.createElement("img");
      if (!image) return;
      image.className = "blur-profile-effect-asset";
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.hidden = false;
      image.onerror = () => {
        image.hidden = true;
        host.classList.remove("blur-profile-effect-has-asset");
      };
      image.onload = () => { image.hidden = false; };
      // decorateVisibleAvatars() runs again when messages, profiles, or public
      // cosmetics finish loading. Reassigning src on every pass restarts an
      // APNG border before it can finish. Only change the source when the
      // equipped border actually changes (or when this is a new image).
      const nextAssetSrc = assetUrl(asset);
      if (image.getAttribute("src") !== nextAssetSrc) image.src = nextAssetSrc;
      if (!isSprite && !image.parentElement) host.insertBefore(image, host.firstElementChild);
    } else {
      existingSprite?.remove();
      existingAsset?.remove();
    }
  }

  // The supplied intro APNGs run for about 2.9 seconds. Switching to the
  // loop at 1.8s cut Vortex/Mastery off while they were still transparent,
  // making those effects look as if they never rendered.
  const PROFILE_INTRO_MS = 3000;
  function applyProfileSurfaceEffect(surface, effectId) {
    if (!surface) return;
    const effect = profileEffectById(effectId) || effectById(effectId);
    const active = !!effect?.profileSurface && !!effect.asset;
    const current = surface.dataset.blurProfileSurfaceEffect || "";
    // Remove nodes created by the previous renderer version. Those images
    // lived directly in the card and could become normal-flow content when
    // the profile stylesheet was cached or temporarily unavailable.
    surface.querySelectorAll(":scope > .blur-profile-effect-surface-intro, :scope > .blur-profile-effect-surface-loop").forEach((node) => node.remove());
    let layer = surface.querySelector(":scope > .blur-profile-effect-surface-layer");
    const existingIntro = layer?.querySelector(":scope > .blur-profile-effect-surface-intro");
    const existingLoop = layer?.querySelector(":scope > .blur-profile-effect-surface-loop");
    if (active && current === effect.id && (existingIntro || existingLoop)) return;
    if (surface._blurProfileEffectIntroTimer) {
      clearTimeout(surface._blurProfileEffectIntroTimer);
      surface._blurProfileEffectIntroTimer = null;
    }
    layer?.querySelectorAll(":scope > .blur-profile-effect-surface-intro, :scope > .blur-profile-effect-surface-loop").forEach((node) => node.remove());
    surface.classList.toggle("blur-profile-surface-host", active);
    if (!active) {
      delete surface.dataset.blurProfileSurfaceEffect;
      layer?.remove();
      return;
    }
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "blur-profile-effect-surface-layer";
      layer.setAttribute("aria-hidden", "true");
      // Keep the effect out of the card's document flow. It must not push or
      // reposition the avatar, status row, banner, or any profile controls.
      surface.insertBefore(layer, surface.firstElementChild);
    }
    surface.dataset.blurProfileSurfaceEffect = effect.id;
    const startLoop = () => {
      if (!surface.isConnected || surface.dataset.blurProfileSurfaceEffect !== effect.id) return;
      layer.querySelector(":scope > .blur-profile-effect-surface-intro")?.remove();
      layer.querySelector(":scope > .blur-profile-effect-surface-loop")?.remove();
      const loop = document.createElement("img");
      loop.className = "blur-profile-effect-surface-loop";
      loop.alt = "";
      loop.setAttribute("aria-hidden", "true");
      // A fresh element is intentional: it starts the supplied loop APNG from
      // frame one instead of inheriting a hidden/pre-advanced animation.
      loop.src = freshAnimationUrl(effect.asset, "profileLoop");
      loop.onerror = () => loop.remove();
      layer.appendChild(loop);
    };
    if (effect.introAsset && effect.introAsset !== effect.asset) {
      const intro = document.createElement("img");
      intro.className = "blur-profile-effect-surface-intro";
      intro.alt = "";
      intro.setAttribute("aria-hidden", "true");
      intro.src = freshAnimationUrl(effect.introAsset, "profileIntro");
      intro.onerror = () => {
        intro.remove();
        if (surface._blurProfileEffectIntroTimer) {
          clearTimeout(surface._blurProfileEffectIntroTimer);
          surface._blurProfileEffectIntroTimer = null;
        }
        startLoop();
      };
      layer.appendChild(intro);
      // APNG frame timing is preserved by the browser; this hand-off keeps
      // the supplied intro artwork visible before the supplied loop begins.
      surface._blurProfileEffectIntroTimer = setTimeout(() => {
        surface._blurProfileEffectIntroTimer = null;
        startLoop();
      }, PROFILE_INTRO_MS);
    } else {
      startLoop();
    }
  }
  async function loadPublicEffects(ids) {
    const needed = ids.filter((id) => id && id !== "blur-ai" && !publicBorders.has(id) && !publicProfileEffects.has(id) && !publicPending.has(id));
    if (!needed.length || typeof sb === "undefined" || !currentUserId()) return;
    needed.forEach((id) => publicPending.add(id));
    try {
      const [borderResult, profileResult] = await Promise.all([
        sb.from("blur_effect_equipped").select("user_id,effect_id").in("user_id", needed),
        sb.from("blur_profile_effect_equipped").select("user_id,effect_id").in("user_id", needed)
      ]);
      if (borderResult.error) throw borderResult.error;
      const foundBorders = new Map();
      const foundProfiles = profileResult.error ? new Map() : new Map();
      (borderResult.data || []).forEach((row) => {
        const effectId = row.effect_id || null;
        if (isAvatarBorderId(effectId)) foundBorders.set(row.user_id, effectId);
        else if (isProfileEffectId(effectId) && !foundProfiles.has(row.user_id)) foundProfiles.set(row.user_id, effectId);
      });
      if (!profileResult.error) {
        (profileResult.data || []).forEach((row) => {
          const effectId = row.effect_id || null;
          if (isProfileEffectId(effectId)) foundProfiles.set(row.user_id, effectId);
        });
      }
      needed.forEach((id) => {
        publicBorders.set(id, foundBorders.get(id) || null);
        publicProfileEffects.set(id, foundProfiles.get(id) || null);
      });
    } catch (error) {
      // Cosmetic loading is optional. Keep the normal avatar if the new
      // migration is unavailable or the network is temporarily offline.
    } finally {
      needed.forEach((id) => publicPending.delete(id));
      decorateVisibleAvatars();
    }
  }
  function decorateVisibleAvatars() {
    const elements = [...document.querySelectorAll(".message-avatar,.friend-row-avatar,.user-bar-avatar,.acct-nav-avatar,[data-acct-avatar]")];
    const ids = [];
    elements.forEach((el) => {
      const id = el.dataset.user || el.dataset.userId || (el.classList.contains("user-bar-avatar") ? state.userId : "");
      if (!id) return;
      ids.push(id);
      const effect = id === state.userId ? state.equipped : publicBorders.get(id);
      // Cosmetics are optional: a malformed/stale avatar node must never
      // interrupt the rest of the page's rendering.
      try { applyEffect(el, effect || null); } catch (_) { /* keep the normal avatar */ }
    });
    // Profile-wide effects belong on public profile cards only. The settings
    // preview should show the avatar and its decoration, but never the large
    // profile-surface artwork that can cover the whole preview.
    document.querySelectorAll(".acct-preview").forEach((surface) => {
      try { applyProfileSurfaceEffect(surface, null); } catch (_) { /* preview cleanup is optional */ }
    });
    const surfaces = [...document.querySelectorAll(".acct-pcard[data-profile-user]")];
    surfaces.forEach((surface) => {
      const id = surface.dataset.profileUser || state.userId || "";
      if (!id) return;
      ids.push(id);
      const effect = id === state.userId ? state.profileEquipped : publicProfileEffects.get(id);
      try { applyProfileSurfaceEffect(surface, effect || null); } catch (_) { /* cosmetics remain optional */ }
    });
    loadPublicEffects([...new Set(ids)]);
  }
  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;
    const observer = new MutationObserver((records) => { if (records.some((record) => record.addedNodes.length)) requestAnimationFrame(decorateVisibleAvatars); });
    observer.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(decorateVisibleAvatars);
  }

  document.addEventListener("blur-settings-tab-change", (event) => {
    if (event.detail === "profile") refreshMounted();
  });
  document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  if (document.readyState !== "loading") startObserver();
  account()?.onAuthStateChange?.(() => { publicBorders.clear(); publicProfileEffects.clear(); load(); });
  account()?.onProfileChange?.(() => { load(); refreshMounted(); });
  setTimeout(load, 0);

  window.BlurCosmetics = {
    EFFECTS,
    AVATAR_BORDER_EFFECTS,
    PROFILE_EFFECTS,
    getState: () => ({ ...state, owned: new Set(state.owned), profileOwned: new Set(state.profileOwned), achievements: [...state.achievements] }),
    load,
    renderAchievements,
    renderShop,
    mountProfileSettings,
    decorateVisibleAvatars,
    equipEffect: equipBorder,
    equipBorder,
    equipProfileEffect,
    purchaseEffect,
    claimAchievement
  };
})();
