/* =========================================================
   messages.js
   Message loading, sending, rendering, and live-subscribing —
   for BOTH scopes:

     scope "channel" → messages table (keyed by channel_id)
     scope "dm"      → dm_messages table (keyed by conversation_id)

   Rendering is shared: one row builder handles author grouping,
   replies, @mentions, link autolinking, lightweight embeds, and
   reactions identically for channels and DMs. DirectMessages
   delegates its rendering here.

   Mention encoding: a mention is stored inside content as a
   <@user-id> token (Discord-style). The id is stable, so mentions
   keep resolving after username changes. Rendering resolves tokens
   through the shared Profiles cache and turns them into clickable
   chips — the existing [data-user] click delegation opens profiles.
   ========================================================= */

function truncateText(text, maxLen){
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? flat.slice(0, maxLen - 1).trimEnd() + "…" : flat;
}

const CHAT_PROFANITY_KEY = "blur-profanity-filter";
// Keep the display filter forgiving enough to catch stretched words and
// common letter swaps, while still requiring a close match to a known root.
const CHAT_CUSS_WORDS = ["fuck", "shit", "bitch", "asshole", "dick", "piss", "crap", "hell", "damn", "cunt", "cock", "whore", "slut"];
// Stored as pieces so the moderation list is not accidentally rendered in UI
// copy or logs. These are always blocked in public channels, regardless of the
// user's display-censor preference.
const CHAT_SLUR_WORDS = [
  ["n", "igg", "er"], ["n", "igg", "a"], ["f", "agg", "ot"],
  ["tr", "ann", "y"], ["ch", "ink"], ["sp", "ic"], ["ret", "ard"]
].map(parts => parts.join(""));
const CHAT_EMBEDDED_SLUR_WORDS = new Set(CHAT_SLUR_WORDS.filter(root => root !== "spic"));

function chatProfanityMode(){
  try {
    const mode = localStorage.getItem(CHAT_PROFANITY_KEY);
    if (mode === "light" || mode === "heavy") return mode;
    // Older builds occasionally stored the slider's numeric value.
    if (mode === "1") return "light";
    if (mode === "2") return "heavy";
  } catch {}
  return "off";
}

function chatCustomBlockedWords(){
  try {
    return String(localStorage.getItem("blur-custom-blocked-words") || "")
      .split(/[\n,]+/).map(normalizeCensorToken).filter(word => word.length >= 2);
  } catch { return []; }
}

function normalizeCensorToken(value){
  const leet = { "@":"a", "4":"a", "3":"e", "1":"i", "!":"i", "0":"o", "$":"s", "5":"s", "7":"t" };
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").split("").map(char => leet[char] || char).join("")
    .replace(/[^a-z]/g, "").replace(/(.)\1{1,}/g, "$1");
}

// Slur matching intentionally has a stronger normalization pass than the
// user-configurable profanity list. It handles common visual substitutions,
// unicode homoglyphs, and punctuation inserted between letters without
// changing how ordinary custom words are interpreted.
const CHAT_SLUR_LEET = Object.freeze({
  "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "|": "i", "ı": "i", "l": "i",
  "0": "o", "$": "s", "5": "s", "7": "t", "8": "b",
  "а": "a", "ｅ": "e", "е": "e", "і": "i", "о": "o", "р": "p",
  "с": "c", "ѕ": "s", "х": "x", "у": "y", "ј": "j", "ӏ": "l"
});

function normalizeSlurToken(value){
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("").map(char => CHAT_SLUR_LEET[char] || char).join("")
    .replace(/[^a-z]/g, "");
}

// Catch rearranged or missing letters without treating every ordinary
// one-letter spelling variation as profanity.
function oneStructuralEditAway(left, right){
  if (!left || !right) return false;
  if (left.length === right.length) {
    for (let i = 0; i < left.length - 1; i++) {
      if (left[i] !== right[i] && left[i] === right[i + 1] && left[i + 1] === right[i]
        && left.slice(i + 2) === right.slice(i + 2)) return true;
    }
    return false;
  }
  return Math.abs(left.length - right.length) === 1;
}

function fuzzyCensorMatch(token, roots){
  const normalized = normalizeCensorToken(token);
  if (!normalized) return null;
  for (const root of roots) {
    // Match complete tokens (or ordinary inflections), rather than finding a
    // profanity root anywhere inside an unrelated word such as "shell".
    if (normalized === root) return root;
    const suffix = normalized.slice(root.length);
    if (normalized.startsWith(root) && /^(s|es|ed|er|ing|y|ly)$/.test(suffix)) return root;

    // Keep typo tolerance conservative: the first and last letters must stay
    // intact, which catches swaps like "fcuk" and omissions like "fuk"
    // without treating words such as "help" as "hell".
    if (root.length >= 4 && normalized.length <= root.length + 1
      && normalized[0] === root[0] && normalized.at(-1) === root.at(-1)
      && oneStructuralEditAway(normalized, root)) return root;
  }
  return null;
}

function fuzzySlurMatch(token){
  const normalized = normalizeSlurToken(token);
  if (!normalized) return null;
  const compact = normalized.replace(/(.)\1+/g, "$1");
  // Long, high-confidence roots may appear inside a larger handle/word (for
  // example "niggerboy"). Keep "spic" boundary-sensitive so ordinary words
  // such as "spice" are not blocked merely because they share a prefix.
  for (const root of CHAT_SLUR_WORDS) {
    const collapsedRoot = root.replace(/(.)\1+/g, "$1");
    const matchesRoot = normalized === root
      || new RegExp(`^${root}(?:s|a|er|ing)?$`).test(normalized)
      || (CHAT_EMBEDDED_SLUR_WORDS.has(root) && normalized.includes(root));
    const matchesRepeatedLetters = compact === collapsedRoot
      || (CHAT_EMBEDDED_SLUR_WORDS.has(root) && compact.includes(collapsedRoot));
    if (matchesRoot || matchesRepeatedLetters) return root;

    // Longer roots still catch one deliberate typo, but only when their
    // first/last characters remain intact to avoid ordinary-word collisions.
    if (root.length >= 5 && normalized.length <= root.length + 1
      && normalized.slice(0, 2) === root.slice(0, 2)
      && normalized.slice(-2) === root.slice(-2)
      && oneStructuralEditAway(normalized, root)) return root;
  }
  return null;
}

function inspectCensorToken(token, mode = chatProfanityMode()){
  const custom = chatCustomBlockedWords();
  const customRoot = fuzzyCensorMatch(token, custom);
  const slurRoot = fuzzySlurMatch(token);
  const cussRoots = mode === "heavy" ? [...CHAT_CUSS_WORDS, ...custom] : custom;
  const cussRoot = customRoot || fuzzyCensorMatch(token, cussRoots);
  return { slur: Boolean(slurRoot), cuss: Boolean(cussRoot || slurRoot), root: slurRoot || cussRoot };
}

function forEachCensorToken(value, callback){
  // Keep punctuation-separated obfuscations together (n.i.g.g.a,
  // n.1.gg.a, zero-width separators, etc.). The first branch also catches
  // deliberately spaced single-letter variants without merging normal prose.
  const tokenPattern = /(?:[A-Za-z0-9][\s._*|:/\\-\u200B-\u200D\uFEFF]{1,3}){3,}[A-Za-z0-9]|[A-Za-z0-9@!$'_-]+(?:[._*|:/\\-\u200B-\u200D\uFEFF]+[A-Za-z0-9@!$'_-]+)*/g;
  return String(value ?? "").replace(tokenPattern, (token) => callback(token));
}

function censorChatText(value){
  const mode = chatProfanityMode();
  if (mode === "off" && !chatCustomBlockedWords().length) return String(value);
  return forEachCensorToken(value, token => {
    const match = inspectCensorToken(token, mode);
    if (!match.cuss || mode === "off" && !chatCustomBlockedWords().length) return token;
    if (token.length <= 2) return "**";
    return token[0] + "*".repeat(Math.max(2, token.length - 2)) + token[token.length - 1];
  });
}

function blockedPublicSlur(value){
  let blocked = false;
  forEachCensorToken(value, token => { if (inspectCensorToken(token, "heavy").slur) blocked = true; return token; });
  return blocked;
}

window.BlurCensor = window.BlurCensor || {
  mode: chatProfanityMode,
  censor: censorChatText,
  hasBlockedPublicSlur: blockedPublicSlur,
  customWords: chatCustomBlockedWords,
  setCustomWords(words){
    const value = Array.isArray(words) ? words.join("\n") : String(words || "");
    try { localStorage.setItem("blur-custom-blocked-words", value); } catch {}
    document.dispatchEvent(new CustomEvent("blur-profanity-change"));
  }
};

// Shared display-only text filter used by Chat and the home splash copy.
window.BlurTextFilter = window.BlurTextFilter || { censor: censorChatText };

const Messages = {

  censorText: censorChatText,

  inspectOutgoingText(value, { scope = "channel" } = {}) {
    const blocked = scope !== "dm" && Boolean(window.BlurCensor?.hasBlockedPublicSlur?.(value));
    return {
      blocked,
      reason: blocked ? "slur" : null
    };
  },

  PAGE_SIZE: 50,
  realtimeSub: null,

  // Consecutive messages by the same author within this window
  // render as one visual group (author/name/time shown once).
  GROUP_WINDOW_MS: 5 * 60 * 1000,

  // Small in-memory lookup of {content, displayName, userId} keyed by
  // `${scope}:${messageId}` (the two message tables have independent
  // id sequences). Lets reply quotes and the "replying to" composer
  // preview render instantly without an extra round trip.
  _cache: new Map(),

  async loadInitial(channelId, options = {}){
    // We deliberately don't try to embed the reply_to relation here
    // (messages.reply_to_id -> messages.id is a self-join, and
    // PostgREST has proven unreliable resolving it — wrong direction,
    // then a stale-schema-cache 400). resolveReplyPreview() below
    // fetches the parent message directly instead, which is slower
    // per-reply but always correct.
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(this.PAGE_SIZE);

    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (options.forum) {
      // Realtime refreshes and older forum rows can occasionally contain the
      // same record more than once. Keep one canonical row per message id so
      // the index cannot render duplicate discussions or inflate reply data.
      const uniqueRows = [...new Map(rows.filter(row => row?.id).map(row => [String(row.id), row])).values()];
      // Forum index: pinned posts first, then newest posts descending.
      return uniqueRows.sort((a, b) => Number(!!b.is_pinned) - Number(!!a.is_pinned) || new Date(b.created_at) - new Date(a.created_at));
    }
    return rows.reverse(); // oldest → newest for rendering top-to-bottom
  },

  /** Load the next older page using the oldest rendered timestamp as a cursor. */
  async loadOlder(channelId, beforeCreatedAt){
    if (!channelId || !beforeCreatedAt) return [];
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .lt("created_at", beforeCreatedAt)
      .order("created_at", { ascending: false })
      .limit(this.PAGE_SIZE);
    if (error) throw error;
    return (data || []).reverse();
  },

  /**
   * Loads a complete forum thread without relying on the 50-row forum index
   * window. Older posts can fall outside that window, and replies can push
   * the root out of the latest page; fetching the root and its direct replies
   * separately keeps every forum conversation addressable.
   */
  async loadForumThread(channelId, postId){
    if (!channelId || !postId) return [];
    const { data: root, error: rootError } = await sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .eq("id", postId)
      .maybeSingle();
    if (rootError) throw rootError;
    if (!root) return [];

    const rows = new Map([[String(root.id), root]]);
    let forumColumnAvailable = true;
    const scopedResult = await sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .eq("forum_post_id", postId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (scopedResult.error) {
      if (/forum_post_id|column|schema cache/i.test(scopedResult.error.message || "")) {
        forumColumnAvailable = false;
      } else {
        throw scopedResult.error;
      }
    } else {
      (scopedResult.data || []).forEach(row => rows.set(String(row.id), row));
    }

    // Keep old forum data readable and include explicit replies nested under
    // another comment. New posts use forum_post_id; legacy posts are walked
    // through reply_to_id until every descendant has been collected.
    let frontier = [postId];
    const visitedParents = new Set();
    while (frontier.length) {
      const parentIds = frontier.filter(id => !visitedParents.has(String(id)));
      if (!parentIds.length) break;
      parentIds.forEach(id => visitedParents.add(String(id)));
      const legacyResult = await sb
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .in("reply_to_id", parentIds)
        .order("created_at", { ascending: true })
        .limit(500);
      if (legacyResult.error) {
        // Older installs may not have reply_to_id yet. Any messages already
        // returned through forum_post_id are still enough to render the post.
        if (/reply_to_id|column|schema cache/i.test(legacyResult.error.message || "")) break;
        throw legacyResult.error;
      }
      frontier = [];
      for (const row of legacyResult.data || []) {
        const key = String(row.id);
        if (!rows.has(key)) {
          rows.set(key, row);
          frontier.push(row.id);
        }
      }
      if (!forumColumnAvailable && !(legacyResult.data || []).length) break;
    }

    return [...rows.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  /** Warm author and reply caches before rendering a message list. */
  async prefetchRenderData(messages, scope = "channel"){
    // Keep the visual stream chronological even if a realtime/provider query
    // returns a page in an unexpected order. Date dividers are always placed
    // immediately before the first message of their calendar day.
    const rows = Array.isArray(messages)
      ? [...messages].sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))
      : [];
    const authorField = scope === "dm" ? "sender_id" : "user_id";
    const mentionIds = rows.flatMap(row => {
      const ids = [...String(row?.content || "").matchAll(/<@([0-9a-fA-F-]{36})>/g)].map(match => match[1]);
      return ids;
    });
    await Profiles.prefetch([...rows.map(row => row?.[authorField]), ...mentionIds]);

    const parentIds = [...new Set(rows.map(row => row?.reply_to_id).filter(Boolean))]
      .filter(id => !this._cache.has(`${scope}:${id}`));
    if (!parentIds.length) return;
    const table = scope === "dm" ? "dm_messages" : "messages";
    try {
      const { data, error } = await sb
        .from(table)
        .select(`id, content, ${authorField}`)
        .in("id", parentIds)
        .limit(parentIds.length);
      if (error) throw error;
      const parents = data || [];
      await Profiles.prefetch(parents.map(row => row?.[authorField]));
      for (const parent of parents) {
        if (!parent?.id) continue;
        const author = Profiles.cache.get(parent[authorField]);
        this._cache.set(`${scope}:${parent.id}`, {
          content: parent.content,
          displayName: author?.display_name || author?.username || "Unknown",
          userId: parent[authorField],
          message: parent
        });
      }
    } catch (error) {
      // Older schemas may not expose reply_to_id or may deny a deleted
      // parent. The existing per-message fallback handles those cases.
      if (!/reply_to_id|column|schema cache|does not exist/i.test(error?.message || "")) {
        console.warn("Reply prefetch unavailable:", error?.message || error);
      }
    }
  },

  /**
   * Parallel rendering can occasionally have one malformed/deleted row fail
   * while its following row has already been built as a grouped continuation.
   * Repair that visual edge without falling back to a serial render waterfall.
   */
  async repairGroupedElements(elements, rows, scope = "channel"){
    let previousRenderedRow = null;
    for (let index = 0; index < elements.length; index++) {
      let element = elements[index];
      if (!element) {
        previousRenderedRow = null;
        continue;
      }
      if (element.classList?.contains("message-grouped") && !previousRenderedRow) {
        try {
          const repaired = await this.renderOne(rows[index], null, scope);
          if (repaired) {
            elements[index] = repaired;
            element = repaired;
          }
        } catch (error) {
          console.error("Failed to repair grouped message", rows[index]?.id || "unknown", error);
          previousRenderedRow = null;
          continue;
        }
      }
      previousRenderedRow = rows[index];
    }
    return elements;
  },

  async send(channelId, userId, content, replyToId = null, options = {}){
    content = String(content ?? "").trim();
    const attachment = options?.attachment || null;
    const isAi = options?.isAi === true;
    if (!content && !attachment) return;
    if (content.length > 500 && !isAi && !Permissions.canBypassMessageLimit(Chat.profile)) {
      throw new Error("Messages are limited to 500 characters.");
    }

    // Client-side guard improves UX; the matching RLS policy in the
    // announcements migration is the authoritative enforcement.
    try {
      const { data: channel } = await sb.from("channels").select("type,visibility,is_log").eq("id", channelId).maybeSingle();
      if (channel && !Permissions.canPostChannel(Chat.profile, { ...channel, visibility: channel.visibility })) {
        throw new Error("You do not have permission to post in this channel.");
      }
    } catch (err) {
      if (err?.message?.includes("permission to post")) throw err;
      // A pre-migration database has no type column; preserve old text-channel behavior.
    }

    const payload = { channel_id: channelId, user_id: userId, content };
    if (replyToId) payload.reply_to_id = replyToId;
    if (isAi) {
      payload.is_ai = true;
      if (options.aiModel) payload.ai_model = String(options.aiModel).slice(0, 120);
    }
    if (options.title) payload.forum_title = String(options.title).trim().slice(0, 120);
    if (options.forumPostId) payload.forum_post_id = options.forumPostId;
    if (attachment?.path) {
      payload.attachment_path = String(attachment.path);
      payload.attachment_name = String(attachment.name || "file").slice(0, 240);
      payload.attachment_type = String(attachment.type || "application/octet-stream").slice(0, 120);
      payload.attachment_size = Number(attachment.size) || 0;
    } else if (attachment?.url) {
      payload.attachment_url = String(attachment.url);
      payload.attachment_name = String(attachment.name || "GIF").slice(0, 240);
      payload.attachment_type = String(attachment.type || "image/gif").slice(0, 120);
      payload.attachment_size = Number(attachment.size) || 0;
    }

    let { data, error } = await sb
      .from("messages")
      .insert(payload)
      .select("*")
      .single();

    // Forum thread metadata and AI metadata are additive. Keep the shared
    // message path usable while older databases are being migrated. Legacy
    // forum comments fall back to the root reply relationship so they remain
    // visible in existing forum threads.
    if (error && /forum_post_id|is_ai|ai_model|column .* does not exist|schema cache/i.test(error.message || "")) {
      const legacyPayload = { ...payload };
      delete legacyPayload.forum_post_id;
      delete legacyPayload.is_ai;
      delete legacyPayload.ai_model;
      if (!legacyPayload.reply_to_id && options.forumPostId) legacyPayload.reply_to_id = options.forumPostId;
      ({ data, error } = await sb.from("messages").insert(legacyPayload).select("*").single());
    }
    if (error) throw error;
    return data || null;
  },

  getCached(messageId, scope = "channel"){
    return this._cache.get(`${scope}:${messageId}`);
  },

  /* ---------------------------------------------------------
     Mentions
     --------------------------------------------------------- */

  /**
   * Resolves @username tokens in raw composer text to stable user
   * ids and returns content with <@id> tokens. `known` maps
   * lowercase username → userId (filled by the autocomplete picker);
   * anything unknown gets one best-effort exact-username lookup so
   * hand-typed mentions work too. Unresolvable tokens stay as text.
   */
  async resolveMentions(text, known = {}){
    const map = { ...known };
    const tokenRe = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,24})/g;

    const seen = new Set();
    let m;
    while ((m = tokenRe.exec(text)) !== null) {
      const name = m[2].toLowerCase();
      if (name === "everyone") continue;
      if (map[name] || seen.has(name)) continue;
      seen.add(name);
      try {
        const { data } = await sb
          .from("profiles")
          .select("id,username")
          .ilike("username", m[2])
          .maybeSingle();
        if (data) map[name] = data.id;
      } catch { /* leave unresolved */ }
    }

    return {
      content: text.replace(tokenRe, (whole, pre, name) => {
        const id = map[name.toLowerCase()];
        return id ? `${pre}<@${id}>` : whole;
      }),
    };
  },

  /** `<@id>` tokens → "@username" for plain-text contexts (sync, cache best-effort). */
  plainText(content){
    return String(content).replace(/<@([0-9a-fA-F-]{36})>/g, (m, id) => {
      const p = Profiles.cache.get(id);
      return "@" + (p?.username || "user");
    });
  },

  /**
   * Return a presentation class for messages made up exclusively of emoji.
   * Whitespace between emoji is allowed, while mixed text/markdown stays at
   * the normal message size. Grapheme segmentation keeps skin tones, flags,
   * and joined emoji together as a single visual character.
   */
  emojiPresentationClass(content){
    const text = String(content ?? "").trim();
    if (!text) return "";

    const segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
    const clusters = segmenter
      ? Array.from(segmenter.segment(text), part => part.segment)
      : Array.from(text);
    const emojiClusters = clusters.filter(cluster => !/^\s+$/u.test(cluster));
    if (!emojiClusters.length) return "";

    const isEmojiCluster = cluster => (
      /^\p{Extended_Pictographic}/u.test(cluster)
      || /^\p{Regional_Indicator}{2}$/u.test(cluster)
      || /^[#*0-9]\uFE0F?\u20E3$/u.test(cluster)
    );
    if (emojiClusters.some(cluster => !isEmojiCluster(cluster))) return "";
    if (emojiClusters.length === 1) return "message-text--emoji-xl";
    if (emojiClusters.length <= 4) return "message-text--emoji-lg";
    return "";
  },

  /* ---------------------------------------------------------
     Content rendering: autolinks, mention chips, embeds.
     Everything untrusted enters via textContent/createElement —
     never innerHTML.
     --------------------------------------------------------- */

  async renderInline(container, text, options = {}){
    const allowEveryone = options.allowEveryone === true;
    const re = /(<@[0-9a-fA-F-]{36}>|(?<![a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])|\|\|[^|\n]+\|\||\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/gi;
    let last = 0;
    for (const m of String(text).matchAll(re)) {
      if (m.index > last) container.appendChild(document.createTextNode(censorChatText(String(text).slice(last, m.index))));
      const token = m[0], user = token.match(/^<@([0-9a-fA-F-]{36})>$/);
      if (user) {
        const chip = document.createElement("span"); chip.className = "mention"; chip.dataset.user = user[1]; chip.textContent = "@…";
        container.appendChild(chip);
        try { const p = await Profiles.getById(user[1]); chip.textContent = "@" + (p?.username || "user"); } catch { chip.textContent = "@user"; }
      } else if (/^@everyone$/i.test(token) && allowEveryone) {
        const chip = document.createElement("span"); chip.className = "mention mention-everyone-chip"; chip.textContent = "@everyone"; container.appendChild(chip);
      } else if (/^@everyone$/i.test(token)) {
        // An unprivileged @everyone is ordinary text, even though it is
        // recognized by the lightweight markdown tokenizer.
        container.appendChild(document.createTextNode(token));
      } else {
        const el = document.createElement("span");
        if (token.startsWith("||")) {
          el.className = "md-spoiler";
          // Render the hidden content through the same inline parser so
          // mentions remain real mention chips after the spoiler is revealed.
          await this.renderInline(el, token.slice(2, -2), options);
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.setAttribute("aria-label", "Spoiler hidden. Click to reveal.");
          el.setAttribute("aria-expanded", "false");
          const reveal = () => {
            const revealed = el.classList.toggle("revealed");
            el.setAttribute("aria-expanded", String(revealed));
            el.setAttribute("aria-label", revealed ? "Spoiler revealed. Click to hide." : "Spoiler hidden. Click to reveal.");
          };
          el.addEventListener("click", reveal);
          el.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              reveal();
            }
          });
        } else if (token.startsWith("**")) { el.className = "md-bold"; el.textContent = censorChatText(token.slice(2, -2)); }
        else if (token.startsWith("~~")) { el.className = "md-strike"; el.textContent = censorChatText(token.slice(2, -2)); }
        else if (token.startsWith("*") || token.startsWith("_")) { el.className = "md-italic"; el.textContent = censorChatText(token.slice(1, -1)); }
        else { el.className = "md-code"; el.textContent = censorChatText(token.slice(1, -1)); }
        container.appendChild(el);
      }
      last = m.index + token.length;
    }
    if (last < String(text).length) container.appendChild(document.createTextNode(censorChatText(String(text).slice(last))));
  },

  async renderContent(container, content, options = {}){
    container.classList.remove("message-text--emoji-xl", "message-text--emoji-lg");
    const emojiClass = this.emojiPresentationClass(content);
    if (emojiClass) container.classList.add(emojiClass);

    const parts = String(content).split(/(https?:\/\/[^\s]+)/g);
    const embeds = [];

    for (const part of parts) {
      if (!part) continue;

      if (/^https?:\/\//.test(part)) {
        if (typeof ChatAttachments !== "undefined" && ChatAttachments.isGifUrl(part)) {
          const gifEmbed = this.embedFor(part);
          if (gifEmbed) embeds.push(gifEmbed);
          continue;
        }
        const link = document.createElement("a");
        link.className = "message-link";
        link.href = part;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = part;
        container.appendChild(link);

        const embed = this.embedFor(part);
        if (embed) embeds.push(embed);
        continue;
      }

      const lines = part.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const bullet = lines[i].match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
        const heading = lines[i].match(/^\s*(#{1,6})\s+(.+?)\s+\1\s*$/);
        if (heading) {
          const level = heading[1].length;
          const title = document.createElement("div");
          title.className = `md-heading md-heading-${level}`;
          await this.renderInline(title, heading[2], options);
          container.appendChild(title);
        } else if (bullet) {
          const list = document.createElement("ul"); list.className = "message-list";
          const item = document.createElement("li"); await this.renderInline(item, bullet[1], options);
          list.appendChild(item); container.appendChild(list);
        } else await this.renderInline(container, lines[i], options);
        if (i < lines.length - 1 && !bullet && !heading) container.appendChild(document.createElement("br"));
      }
    }

    if (embeds.length) {
      const wrap = document.createElement("div");
      wrap.className = "message-embeds";
      for (const card of embeds.slice(0, 3)) wrap.appendChild(card);
      container.appendChild(wrap);
    }
  },

  /**
   * Safe, provider-specific embeds only — pure client-side URL
   * parsing, no requests to arbitrary hosts. YouTube thumbnails
   * come from i.ytimg.com; images are the image host itself.
   * Returns null for anything unsupported (message keeps its link).
   */
  embedFor(url){
    if (typeof ChatAttachments !== "undefined" && ChatAttachments.isGifUrl(url)) {
      const safe = ChatAttachments.safeUrl(url);
      if (!safe) return null;
      const card = document.createElement("a");
      card.className = "message-embed message-embed-gif";
      card.href = safe;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.dataset.mediaPreview = "1"; card.dataset.mediaUrl = safe; card.dataset.mediaName = "GIF"; card.dataset.mediaType = "image/gif";
      const img = document.createElement("img");
      img.src = safe;
      img.alt = "GIF";
      img.loading = "lazy";
      img.addEventListener("error", () => card.remove());
      card.appendChild(img);
      const source = document.createElement("span");
      source.className = "message-embed-source";
      source.textContent = "GIF";
      card.appendChild(source);
      return card;
    }
    const yt = url.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
    if (yt) {
      const card = document.createElement("a");
      card.className = "message-embed message-embed-yt";
      card.href = url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${yt[1]}/mqdefault.jpg`;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => card.remove());
      card.appendChild(img);
      const source = document.createElement("span");
      source.className = "message-embed-source";
      source.textContent = "YouTube";
      card.appendChild(source);
      return card;
    }

    if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?.*)?$/i.test(url)) {
      const card = document.createElement("a");
      card.className = "message-embed message-embed-image";
      card.href = url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.dataset.mediaPreview = "1"; card.dataset.mediaUrl = url; card.dataset.mediaName = "Image"; card.dataset.mediaType = "image/*";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => card.remove());
      card.appendChild(img);
      return card;
    }

    return null;
  },

  /* ---------------------------------------------------------
     Realtime
     --------------------------------------------------------- */

  /**
   * Subscribes to new INSERTs for one channel. Always replaces
   * any previous subscription, so switching channels never
   * stacks up duplicate listeners.
   */
  subscribeToChannel(channelId, onInsert){
    this.unsubscribe();
    const handlers = typeof onInsert === "function" ? { insert: onInsert } : (onInsert || {});
    const dispatch = (handler, row) => {
      if (!row?.id || typeof handler !== "function") return;
      try {
        const result = handler(row);
        if (result?.catch) result.catch(error => console.error("Message realtime handler failed:", error));
      } catch (error) { console.error("Message realtime handler failed:", error); }
    };

    this.realtimeSub = sb
      .channel(`messages:${channelId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`
      }, (payload) => dispatch(handlers.insert, payload?.new))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}`
      }, (payload) => dispatch(handlers.update, payload?.new))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}`
      }, (payload) => dispatch(handlers.delete, payload?.old))
      .subscribe();
  },

  unsubscribe(){
    if (this.realtimeSub) {
      sb.removeChannel(this.realtimeSub);
      this.realtimeSub = null;
    }
  },

  /* ---------------------------------------------------------
     Rendering
     --------------------------------------------------------- */

  localDateKey(value){
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  formatDateSeparator(value){
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
  },

  formatMessageTime(value){
    const date = value instanceof Date ? value : new Date(value);
    const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
    const now = new Date();
    const today = this.localDateKey(date) === this.localDateKey(now);
    if (today) return time;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.localDateKey(date) === this.localDateKey(yesterday)) return `Yesterday at ${time}`;
    // Once the calendar day is older than yesterday, use the concrete date
    // instead of a weekday. The boundary is local midnight, not 24 elapsed
    // hours from the message timestamp.
    return `${this.formatDateSeparator(date)} at ${time}`;
  },

  createDateSeparator(value){
    const separator = document.createElement("div");
    separator.className = "message-date-separator";
    separator.dataset.dateKey = this.localDateKey(value);
    separator.innerHTML = `<span class="message-date-line" aria-hidden="true"></span><span class="message-date-label"></span><span class="message-date-line" aria-hidden="true"></span>`;
    separator.querySelector(".message-date-label").textContent = this.formatDateSeparator(value);
    return separator;
  },

  repairDateSeparators(container){
    if (!container) return;
    container.querySelectorAll(":scope > .message-date-separator").forEach(separator => separator.remove());
    let previousDateKey = "";
    [...container.querySelectorAll(":scope > .message-row")].forEach(row => {
      const dateKey = this.localDateKey(row.dataset.ts);
      if (previousDateKey && dateKey && dateKey !== previousDateKey) {
        container.insertBefore(this.createDateSeparator(row.dataset.ts), row);
      }
      if (dateKey) previousDateKey = dateKey;
    });
  },

  appendDateAware(fragment, element, message, previousDateKey = ""){
    if (!element || !message) return this.localDateKey(message?.created_at) || previousDateKey;
    const dateKey = this.localDateKey(message.created_at);
    // A divider represents a transition from an already-rendered day to a
    // newer day. Do not put one above the first message in a freshly loaded
    // history window; Discord only shows it when an actual message crosses
    // the calendar boundary.
    if (previousDateKey && dateKey && dateKey !== previousDateKey) {
      fragment.appendChild(this.createDateSeparator(message.created_at));
    }
    fragment.appendChild(element);
    return dateKey || previousDateKey;
  },

  /**
   * `isCurrent()` lets the caller cancel a render that's been
   * superseded by a newer one (e.g. the user switched channels
   * again before this render finished). Without it, two
   * overlapping renderList calls for different channel-open
   * requests can both clear+refill the same container and leave
   * messages duplicated or interleaved.
   */
  async renderList(container, messages, isCurrent = () => true, scope = "channel"){
    if (!isCurrent()) return;
    container.innerHTML = "";
    const rows = Array.isArray(messages)
      ? [...messages].sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))
      : [];
    await this.prefetchRenderData(rows, scope);
    if (!isCurrent()) return;
    // Author grouping only depends on the previous data row, so all DOM
    // builders can run concurrently after the cache is warm. This removes a
    // second serial waterfall from every 50-message history.
      const elements = await Promise.all(rows.map(async (msg, index) => {
      if (!isCurrent()) return null;
      try { return await this.renderOne(msg, index ? rows[index - 1] : null, scope); }
        catch (err) { console.error("Failed to render message", msg?.id || "unknown", err); return null; }
      }));
      await this.repairGroupedElements(elements, rows, scope);
      if (!isCurrent()) return;
    const fragment = document.createDocumentFragment();
    let previousDateKey = "";
    for (let index = 0; index < elements.length; index++) {
      previousDateKey = this.appendDateAware(fragment, elements[index], rows[index], previousDateKey);
    }
    container.appendChild(fragment);
    if (isCurrent()) container.scrollTop = container.scrollHeight;
  },

  /** Render an older page above the existing rows, preserving their scroll offset. */
  async prependList(container, messages, isCurrent = () => true, scope = "channel"){
    if (!isCurrent() || !messages?.length) return;
    const rows = Array.isArray(messages)
      ? [...messages].sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))
      : [];
    await this.prefetchRenderData(rows, scope);
    if (!isCurrent()) return;
    const fragment = document.createDocumentFragment();
      const elements = await Promise.all(rows.map(async (msg, index) => {
      if (!isCurrent()) return null;
      try { return await this.renderOne(msg, index ? rows[index - 1] : null, scope); }
        catch (err) { console.error("Failed to render older message", msg?.id || "unknown", err); return null; }
      }));
      await this.repairGroupedElements(elements, rows, scope);
      let previousDateKey = "";
      for (let index = 0; index < elements.length; index++) {
        previousDateKey = this.appendDateAware(fragment, elements[index], rows[index], previousDateKey);
      }
    if (!isCurrent()) return;
    const loader = container.querySelector(".chat-history-loader");
    const firstRow = loader?.nextElementSibling || container.querySelector(".message-row");

    // The boundary divider belongs immediately before the existing newer
    // day. Older rows themselves never get a divider at the top of the
    // window, because there may be no message before them in the viewport.
    const olderLast = [...rows].reverse().find(row => row?.created_at);
    const existingDateKey = firstRow?.classList.contains("message-row")
      ? this.localDateKey(firstRow.dataset.ts)
      : "";
    const olderLastDateKey = olderLast ? this.localDateKey(olderLast.created_at) : "";
    if (firstRow && existingDateKey && olderLastDateKey && existingDateKey !== olderLastDateKey) {
      const previous = firstRow.previousElementSibling;
      if (!previous?.classList.contains("message-date-separator")) {
        container.insertBefore(this.createDateSeparator(firstRow.dataset.ts), firstRow);
      }
    }
    container.insertBefore(fragment, firstRow || null);
  },

  async appendOne(container, msg, scope = "channel", isCurrent = () => true){
    if (!isCurrent()) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

    // group the new row against whatever is currently last —
    // the previous row never changes once rendered
    const rows = container.querySelectorAll(".message-row");
    const last = rows[rows.length - 1];
    const prev = last
      ? { user_id: last.dataset.authorId, sender_id: last.dataset.authorId, created_at: last.dataset.ts }
      : null;

    try {
      const element = await this.renderOne(msg, prev, scope);
      if (!isCurrent()) return;
      const renderedRows = container.querySelectorAll(".message-row");
      const last = renderedRows[renderedRows.length - 1];
      const previousDateKey = last ? this.localDateKey(last.dataset.ts) : "";
      const dateKey = this.localDateKey(msg.created_at);
      if (previousDateKey && dateKey && dateKey !== previousDateKey) {
        container.appendChild(this.createDateSeparator(msg.created_at));
      }
      container.appendChild(element);
    } catch (err) {
      console.error("Failed to render message", msg?.id || "unknown", err);
      return;
    }
    if (atBottom) container.scrollTop = container.scrollHeight;
  },

  async renderAttachment(msg){
    const path = msg?.attachment_path;
    let url = msg?.attachment_url || null;
    if (!url && path && typeof ChatAttachments !== "undefined") {
      try { url = await ChatAttachments.signedUrl(path); }
      catch (error) { console.warn("Attachment URL unavailable:", error?.message || error); }
    }
    url = typeof ChatAttachments !== "undefined" ? ChatAttachments.safeUrl(url) : url;
    if (!url) return null;
    const type = String(msg.attachment_type || "").toLowerCase();
    const name = String(msg.attachment_name || "Attachment");
    const mediaSource = `${name} ${url}`;
    const isVideo = type.startsWith("video/") || /\.(?:mp4|webm|mov|m4v|ogv|avi|mkv)(?:[?#]|$)/i.test(mediaSource);
    const isAudio = type.startsWith("audio/") || /\.(?:mp3|ogg|oga|wav|m4a|aac|flac|opus)(?:[?#]|$)/i.test(mediaSource);
    const size = typeof ChatAttachments !== "undefined" ? ChatAttachments.formatSize(msg.attachment_size) : "";
    const wrap = document.createElement("div");
    wrap.className = "message-attachment";
    if (type.startsWith("image/") || /\.(?:png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)/i.test(url)) {
      const link = document.createElement("a");
      link.className = "message-attachment-media";
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.dataset.mediaPreview = "1"; link.dataset.mediaUrl = url; link.dataset.mediaName = name; link.dataset.mediaType = type;
      const image = document.createElement("img");
      image.src = url; image.alt = name; image.loading = "lazy";
      image.addEventListener("error", () => wrap.remove());
      link.appendChild(image); wrap.appendChild(link);
    } else if (isVideo) {
      const link = document.createElement("a");
      link.className = "message-attachment-media message-attachment-video-preview";
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.dataset.mediaPreview = "1"; link.dataset.mediaUrl = url; link.dataset.mediaName = name; link.dataset.mediaType = type || "video/*";
      const video = document.createElement("video");
      video.className = "message-attachment-video"; video.src = url; video.muted = true; video.playsInline = true; video.preload = "metadata";
      link.append(video, Object.assign(document.createElement("span"), { className: "message-attachment-play", innerHTML: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>' }));
      wrap.appendChild(link);
    } else if (isAudio) {
      const link = document.createElement("a");
      link.className = "message-attachment-file message-attachment-audio-preview";
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.dataset.mediaPreview = "1"; link.dataset.mediaUrl = url; link.dataset.mediaName = name; link.dataset.mediaType = type || "audio/*";
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg><span><strong></strong><small></small></span>`;
      link.querySelector("strong").textContent = name;
      link.querySelector("small").textContent = [size, type || "Audio"].filter(Boolean).join(" · ");
      wrap.appendChild(link);
    } else {
      const link = document.createElement("a");
      link.className = "message-attachment-file"; link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.download = name;
      link.dataset.mediaPreview = "1"; link.dataset.mediaUrl = url; link.dataset.mediaName = name; link.dataset.mediaType = type;
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/></svg><span><strong></strong><small></small></span>`;
      link.querySelector("strong").textContent = name;
      link.querySelector("small").textContent = [size, type || "File"].filter(Boolean).join(" · ");
      wrap.appendChild(link);
    }
    return wrap;
  },

  async renderOne(msg, prev = null, scope = "channel"){
    if (!msg?.id) throw new Error("Message row is missing an id.");
    const isAiMessage = scope === "channel" && msg.is_ai === true;
    const authorId = scope === "dm" ? msg.sender_id : msg.user_id;
    if (!authorId) throw new Error("Message row is missing its author.");
    const prevAuthorId = prev
      ? (scope === "dm" ? prev.sender_id : prev.user_id)
      : null;

    // Forum replies use reply_to_id to stay inside the open post, but that
    // relationship should not make every comment look like a quoted reply to
    // the root post. Only an explicitly selected message should render the
    // reply quote in a forum thread.
    const isForumRootReply = scope === "channel"
      && typeof Chat !== "undefined"
      && ChatPermissions.isForum(Chat.currentChannel)
      && Chat.forumPostId
      && !msg.forum_post_id
      && String(msg.reply_to_id || "") === String(Chat.forumPostId);

    // Discord-style grouping: same author, no reply quote, within
    // the time window → continuation row (no avatar/name/meta).
    // Purely visual — each message stays an independent row.
    const timeDelta = prev ? new Date(msg.created_at) - new Date(prev.created_at) : NaN;
    const grouped = !!prev
      && prevAuthorId === authorId
      && (!!prev.is_ai === !!msg.is_ai)
      && (!msg.reply_to_id || isForumRootReply)
      && Number.isFinite(timeDelta)
      && timeDelta >= 0
      && timeDelta < this.GROUP_WINDOW_MS
      && this.localDateKey(msg.created_at) === this.localDateKey(prev.created_at);

    const author = isAiMessage
      ? (Profiles.aiProfile?.() || { display_name: "BlurGPT", username: "blur-ai", role: "member", avatar_url: null })
      : await Profiles.getById(authorId);
    const displayName = isAiMessage ? "BlurGPT" : (author?.display_name || author?.username || "Unknown");
    const profileUserId = isAiMessage ? (Profiles.AI_PROFILE_ID || "blur-ai") : authorId;
    const aiBadge = isAiMessage ? `<span class="message-ai-badge">AI</span>` : "";
    const replyPreview = msg.reply_to_id && !isForumRootReply
      ? await this.resolveReplyPreview(msg, scope)
      : null;

    this._cache.set(`${scope}:${msg.id}`, { content: msg.content, displayName, userId: authorId, replyPreview, message: msg });

    const time = this.formatMessageTime(msg.created_at);
    // Grouped rows show the time in the narrow avatar gutter. Keep the same
    // 12-hour clock convention as the full message timestamp.
    const compactTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(msg.created_at));
    const rawContent = String(msg.content);
    const directPing = !!Chat.user?.id && rawContent.includes(`<@${Chat.user.id}>`);
    const everyoneMention = /(?<![a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])/i.test(rawContent);
    const everyoneAllowed = !isAiMessage && scope === "channel" && everyoneMention && await ChatPermissions.canUseEveryoneId(authorId);
    const everyonePing = authorId !== Chat.user?.id && everyoneAllowed;
    const pinged = directPing || everyonePing;
    const ownMessage = !isAiMessage && Chat.user?.id === authorId;
    const canDelete = scope === "channel" ? Permissions.canDeleteMessage(Chat.profile, author, Chat.user?.id, msg) : ownMessage;
    const canPin = scope === "channel" && !msg.is_log && !Chat.currentChannel?.is_log && Permissions.canModerate(Chat.profile);
    const canMore = scope === "channel" || scope === "dm";
    const actions = canMore
      ? `<button type="button" class="message-more-btn" data-more-msg="${msg.id}" data-more-scope="${scope}" data-more-own="${ownMessage ? "1" : "0"}" data-more-edit="${ownMessage ? "1" : "0"}" data-more-delete="${ownMessage || canDelete ? "1" : "0"}" data-more-pin="${canPin ? "1" : "0"}" data-more-pinned="${msg.is_pinned ? "1" : "0"}" title="More message actions" aria-label="More message actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></button>` : "";

    const el = document.createElement("div");
    el.className = "message-row"
      + (grouped ? " message-grouped" : "")
      + (msg.is_pinned ? " forum-post-pinned" : "")
      + (scope === "channel" && ChatPermissions.isForum(Chat.currentChannel) && !msg.reply_to_id ? " forum-post-root" : "")
      + (pinged ? " message-pinged" : "")
      + (isAiMessage ? " message-ai" : "");
    el.dataset.messageId = msg.id;
    el.dataset.authorId = authorId;
    el.dataset.ts = msg.created_at;

    el.innerHTML = `
      <div class="message-avatar-slot">
        ${grouped
          ? `<span class="message-hover-time">${compactTime}</span>`
          : isAiMessage
          ? `<span class="message-ai-avatar" data-user="${escapeAttr(profileUserId)}" role="button" tabindex="0" aria-label="Open BlurGPT profile">✦</span>`
          : `<img class="message-avatar" src="${escapeAttr(Profiles.safeImageUrl(author?.avatar_url, author?.username || "?"))}" alt="" data-user="${authorId}">`}
      </div>
      <div class="message-body">
        ${replyPreview ? `
        <div class="message-reply-quote" data-jump-to="${replyPreview.id}">
          <svg viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5M4 12h10a5 5 0 0 1 5 5v2"/></svg>
          <span class="reply-quote-author">${escapeHtml(replyPreview.displayName)}</span>
          <span class="reply-quote-text"></span>
        </div>` : ""}
        ${grouped ? "" : `
        <div class="message-meta">
          <span class="message-author" data-user="${escapeAttr(profileUserId)}">${escapeHtml(displayName)}</span>${aiBadge}
          <span class="message-time">${time}${msg.edited_at ? ` <span class="message-edited">(edited)</span>` : ""}</span>
        </div>`}
        ${msg.forum_title ? `<div class="forum-post-title">${escapeHtml(msg.forum_title)}</div>` : ""}
        <div class="message-text"></div>
        <div class="message-reactions" data-message-id="${msg.id}"></div>
      </div>
      <button type="button" class="message-reply-btn" data-reply-msg="${msg.id}" title="Reply" aria-label="Reply">
        <svg viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5M4 12h10a5 5 0 0 1 5 5v2"/></svg>
      </button>
      <button type="button" class="message-react-btn" data-react-add="${msg.id}" title="Add reaction" aria-label="Add reaction">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.2 2 1.8 3.5 1.8s2.6-.6 3.5-1.8M8.7 9.5h.1M15.2 9.5h.1"/></svg>
      </button>
      ${actions}
    `;
    // textContent/element APIs for anything that's raw user
    // content, so it can never inject HTML/script.
    await this.renderContent(el.querySelector(".message-text"), msg.content, { allowEveryone: everyoneAllowed });
    const attachment = await this.renderAttachment(msg);
    if (attachment) el.querySelector(".message-body")?.insertBefore(attachment, el.querySelector(".message-reactions"));
    if (replyPreview) {
      el.querySelector(".reply-quote-text").textContent = truncateText(this.censorText(this.plainText(replyPreview.content)), 100);
    }
    el.querySelector(".message-reactions").innerHTML = Reactions.renderPills(scope, msg.id, Chat.user?.id);
    return el;
  },

  /**
   * Figures out what to show in a reply's quoted-snippet line.
   * Prefers the embedded `reply_to` relation from loadInitial;
   * falls back to our render cache (e.g. replying to a message
   * sent earlier this session via realtime); falls back further
   * to a direct fetch for anything neither of those caught.
   * scope picks the table (messages vs dm_messages) and the
   * author column.
   */
  async resolveReplyPreview(msg, scope = "channel"){
    if (!msg.reply_to_id) return null;

    const table = scope === "dm" ? "dm_messages" : "messages";
    const authorField = scope === "dm" ? "sender_id" : "user_id";

    // Defensive: depending on how PostgREST resolves the embed,
    // `reply_to` can come back as an array (or an empty array)
    // instead of a single object. Normalize before using it so a
    // malformed/empty embed can't throw and take down the whole
    // render loop.
    const embedded = Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to;

    if (embedded && embedded.id) {
      const author = embedded.is_ai
        ? (Profiles.aiProfile?.() || { display_name: "BlurGPT" })
        : await Profiles.getById(embedded[authorField]);
      const displayName = author?.display_name || author?.username || "Unknown";
      return { id: embedded.id, content: embedded.content, displayName };
    }

    const cached = this._cache.get(`${scope}:${msg.reply_to_id}`);
    if (cached) {
      return { id: msg.reply_to_id, content: cached.content, displayName: cached.displayName };
    }

    try {
      const { data, error } = await sb
        .from(table)
        .select(`id, content, ${authorField}`)
        .eq("id", msg.reply_to_id)
        .single();
      if (error || !data) {
        const deleted = { id: msg.reply_to_id, content: "Original message deleted", displayName: "Deleted message" };
        this._cache.set(`${scope}:${msg.reply_to_id}`, { ...deleted, deleted: true });
        return deleted;
      }
      const author = await Profiles.getById(data[authorField]);
      const displayName = author?.display_name || author?.username || "Unknown";
      this._cache.set(`${scope}:${data.id}`, { content: data.content, displayName, userId: data[authorField], message: data });
      return { id: data.id, content: data.content, displayName };
    } catch {
      // Parent message may have been deleted, or the fetch failed —
      // either way, just render without the quote rather than throw.
      return null;
    }
  },

  /** Re-renders just one message's reaction row after a toggle/realtime event. */
  updateReactions(container, messageId, scope = "channel"){
    const wrap = container.querySelector(`.message-reactions[data-message-id="${messageId}"]`);
    if (wrap) wrap.innerHTML = Reactions.renderPills(scope, messageId, Chat.user?.id);
  },

  async edit(messageId, userId, content, scope = "channel"){
    content = String(content).trim();
    if (!content) throw new Error("Message can’t be empty.");
    if (content.length > 500 && !Permissions.canBypassMessageLimit(Chat.profile)) {
      throw new Error("Messages are limited to 500 characters.");
    }
    const table = scope === "dm" ? "dm_messages" : "messages";
    const authorField = scope === "dm" ? "sender_id" : "user_id";
    const { data, error } = await sb.from(table).update({ content, edited_at: new Date().toISOString() }).eq("id", messageId).eq(authorField, userId).select().single();
    if (error) throw error;
    const cached = this._cache.get(`${scope}:${messageId}`) || {};
    this._cache.set(`${scope}:${messageId}`, { ...cached, content: data.content, edited_at: data.edited_at, userId: data.user_id || data.sender_id, message: { ...(cached.message || {}), ...data } });
    return data;
  },

  async pin(messageId, pinned){
    let { data, error } = await sb.rpc("blur_pin_forum_post", { p_message_id: messageId, p_pinned: !!pinned });
    // Older databases may have the forum columns but not the RPC yet.
    // Keep owner pinning usable where the existing owner update policy permits it.
    if (error && /function .*blur_pin_forum_post|does not exist/i.test(error.message || "")) {
      const fallback = await sb.from("messages").update({ is_pinned: !!pinned }).eq("id", messageId).select().single();
      data = fallback.data; error = fallback.error;
    }
    if (error) throw error;
    const row = document.getElementById("chat-messages")?.querySelector(`.message-row[data-message-id="${messageId}"]`);
    if (row) {
      const cached = this._cache.get(`channel:${messageId}`) || {};
      this._cache.set(`channel:${messageId}`, { ...cached, message: { ...(cached.message || {}), ...data } });
      const pin = row.querySelector("[data-more-msg]");
      if (pin) pin.dataset.morePinned = data.is_pinned ? "1" : "0";
      row.classList.toggle("forum-post-pinned", !!data.is_pinned);
    }
    return data;
  },

  async setPinned(messageId, pinned){
    let { data, error } = await sb.rpc("blur_pin_message", { p_message_id: messageId, p_pinned: !!pinned });
    if (error && /function .*blur_pin_message|does not exist/i.test(error.message || "")) {
      const fallback = await sb.from("messages").update({ is_pinned: !!pinned }).eq("id", messageId).select().single();
      data = fallback.data; error = fallback.error;
    }
    if (error) throw error;
    const row = document.getElementById("chat-messages")?.querySelector('.message-row[data-message-id="' + messageId + '"]');
    if (row) {
      const cached = this._cache.get("channel:" + messageId) || {};
      this._cache.set("channel:" + messageId, { ...cached, message: { ...(cached.message || {}), ...data } });
      const pin = row.querySelector("[data-more-msg]");
      if (pin) pin.dataset.morePinned = data.is_pinned ? "1" : "0";
      row.classList.toggle("forum-post-pinned", !!data.is_pinned);
    }
    return data;
  },

  async remove(messageId, userId, scope = "channel"){
    const table = scope === "dm" ? "dm_messages" : "messages";
    const authorField = scope === "dm" ? "sender_id" : "user_id";
    let query = sb.from(table).delete().eq("id", messageId);
    // DMs remain self-only. In shared channels, staff deletion is allowed
    // by the same role-aware RLS policy used to render the Delete action.
    if (scope === "dm" || !Permissions.canModerate(Chat.profile)) query = query.eq(authorField, userId);
    const { error } = await query;
    if (error) throw error;
  },

  async applyUpdate(container, msg, scope = "channel", isCurrent = () => true){
    if (!isCurrent()) return;
    const row = container.querySelector(`.message-row[data-message-id="${msg.id}"]`);
    if (!row) return;
    row.classList.toggle("forum-post-pinned", !!msg.is_pinned);
    const pinButton = row.querySelector("[data-more-msg]");
    if (pinButton) pinButton.dataset.morePinned = msg.is_pinned ? "1" : "0";
    if (msg.forum_title) {
      let title = row.querySelector(".forum-post-title");
      if (!title) { title = document.createElement("div"); title.className = "forum-post-title"; row.querySelector(".message-text")?.before(title); }
      title.textContent = msg.forum_title;
    }
    if (!msg.reply_to_id) row.querySelector(".message-reply-quote")?.remove();
    const text = row.querySelector(".message-text");
    const authorId = scope === "dm" ? msg.sender_id : msg.user_id;
    const everyoneAllowed = scope === "channel" && msg.is_ai !== true
      && /(?<![a-zA-Z0-9_])@everyone(?![a-zA-Z0-9_])/i.test(String(msg.content))
      && await ChatPermissions.canUseEveryoneId(authorId);
    if (!isCurrent()) return;
    const directPing = !!Chat.user?.id && String(msg.content).includes(`<@${Chat.user.id}>`);
    const everyonePing = authorId !== Chat.user?.id && everyoneAllowed;
    row.classList.toggle("message-pinged", directPing || everyonePing);
    if (text) {
      text.replaceChildren();
      await this.renderContent(text, msg.content, { allowEveryone: everyoneAllowed });
      if (!isCurrent()) return;
    }
    const time = row.querySelector(".message-time");
    if (time && msg.edited_at && !time.querySelector(".message-edited")) time.insertAdjacentHTML("beforeend", ` <span class="message-edited">(edited)</span>`);
    const cached = this._cache.get(`${scope}:${msg.id}`) || {};
    this._cache.set(`${scope}:${msg.id}`, { ...cached, content: msg.content, edited_at: msg.edited_at, message: { ...(cached.message || {}), ...msg } });
    // Keep any replies that quote this message in sync with an edit. Without
    // this, the parent updates correctly while every visible quote keeps the
    // old snippet until the conversation is reopened.
    container.querySelectorAll(`[data-jump-to="${msg.id}"] .reply-quote-text`).forEach(quote => {
      quote.textContent = truncateText(this.censorText(this.plainText(msg.content)), 100);
    });
  },

  async applyDelete(container, msg, scope = "channel", isCurrent = () => true){
    if (!isCurrent()) return;
    const row = container.querySelector(`.message-row[data-message-id="${msg.id}"]`);
    const nextRow = row?.nextElementSibling;
    if (row) row.remove();
    if (typeof Reactions !== "undefined") Reactions.byMessage.delete(Reactions.key(scope, msg.id));
    this._cache.delete(`${scope}:${msg.id}`);
    this._cache.set(`${scope}:${msg.id}`, { content: "Original message deleted", displayName: "Deleted message", deleted: true });

    // If the deleted row was the first item in a grouped run, promote the
    // next continuation row back to a full message header. Also refresh any
    // reply quote that pointed at the deleted message.
    container.querySelectorAll(`[data-jump-to="${msg.id}"]`).forEach(quote => {
      const author = quote.querySelector(".reply-quote-author");
      const text = quote.querySelector(".reply-quote-text");
      if (author) author.textContent = "Deleted message";
      if (text) text.textContent = "Original message deleted";
    });
    const continuation = nextRow?.classList.contains("message-grouped") ? nextRow : null;
    if (continuation) {
      const rows = [...container.querySelectorAll(".message-row")];
      const nextCached = this._cache.get(`${scope}:${continuation.dataset.messageId}`);
      if (!nextCached?.message) {
        continuation.classList.remove("message-grouped");
      } else {
        const index = rows.indexOf(continuation);
        const previousCached = index > 0 ? this._cache.get(`${scope}:${rows[index - 1].dataset.messageId}`) : null;
        const replacement = await this.renderOne(nextCached.message, previousCached?.message || null, scope);
        if (!isCurrent()) return;
        continuation.replaceWith(replacement);
      }
    }

    // Deleting the only message on a day can leave its divider orphaned.
    // Rebuild only the lightweight date markers from the remaining rows.
    this.repairDateSeparators(container);
  }
};
