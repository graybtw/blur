/* =========================================================
   reactions.js
   Loading, toggling, live-subscribing to, and rendering emoji
   reactions. One system for BOTH scopes:

     scope "channel" → messages + message_reactions (keyed by channel_id)
     scope "dm"      → dm_messages + dm_message_reactions (keyed by conversation_id)

   The dm tables/policies mirror the channel ones (see
   supabase-messaging-migration.sql), so toggling/subscribing
   only differs by table name and filter column.

   Caches are keyed `${scope}:${messageId}` — messages.id and
   dm_messages.id are independent sequences and can collide.
   ========================================================= */

const Reactions = {

  MAX_TYPES_PER_MESSAGE: 12,
EMOJI_GROUPS: Object.freeze({
  "Frequently used": [
    "👍","❤️","😂","🤣","😭","😮","🔥","🎉","👀","👏","✅","✨","💯","🙏","💀",
    "😊","😍","🥰","😎","🤔","💪","🫡","💔","❤️‍🔥","⭐","🚀","😈","👎","🙌"
  ],

  "Smileys & Emotion": [
    "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","🫠","😉","😊","😇",
    "🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝",
    "🤑","🤗","🤭","🫢","🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶",
    "🫥","😶‍🌫️","😏","😒","🙄","😬","😮‍💨","🤥","🫨","🙂‍↔️","🙂‍↕️",
    "😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶",
    "🥴","😵","😵‍💫","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤",
    "😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰",
    "😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡",
    "😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾",
    "🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊",
    "💋","💌","💘","💝","💖","💗","💓","💞","💕","💟","❣️","💔","❤️",
    "🩷","🧡","💛","💚","💙","🩵","💜","🤎","🖤","🩶","🤍","❤️‍🔥",
    "❤️‍🩹","💯","💢","💥","💫","💦","💨","🕳️","💬","👁️‍🗨️","🗨️",
    "🗯️","💭","💤"
  ],

  "People & Body": [
    "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫷","🫸","👌",
    "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇",
    "☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲",
    "🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃",
    "🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄","🫦","👶","🧒",
    "👦","👧","🧑","👱","👨","🧔","🧔‍♂️","🧔‍♀️","👩","🧓","👴",
    "👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷",
    "👮","👷","💂","🕵️","👩‍⚕️","👨‍⚕️","👩‍🌾","👨‍🌾","👩‍🍳",
    "👨‍🍳","👩‍🎓","👨‍🎓","👩‍🎤","👨‍🎤","👩‍🏫","👨‍🏫","👩‍🏭",
    "👨‍🏭","👩‍💻","👨‍💻","👩‍💼","👨‍💼","👩‍🔧","👨‍🔧","👩‍🔬",
    "👨‍🔬","👩‍🎨","👨‍🎨","👩‍🚒","👨‍🚒","👩‍✈️","👨‍✈️","👩‍🚀",
    "👨‍🚀","👩‍⚖️","👨‍⚖️","👰","🤵","👸","🤴","🥷","🦸","🦹",
    "🧙","🧚","🧛","🧜","🧝","🧞","🧟","🧌","💆","💇","🚶","🧍",
    "🧎","🏃","💃","🕺","🕴️","👯","🧖","🧗","🤺","🏇","⛷️",
    "🏂","🏌️","🏄","🚣","🏊","⛹️","🏋️","🚴","🚵","🤸","🤼","🤽",
    "🤾","🤹","🧘","🛀","🛌","👭","👫","👬","💏","💑","👪",
    "🗣️","👤","👥","🫂","👣"
  ],

  "Animals & Nature": [
    "🐵","🐒","🦍","🦧","🐶","🐕","🦮","🐕‍🦺","🐩","🐺","🦊","🦝",
    "🐱","🐈","🐈‍⬛","🦁","🐯","🐅","🐆","🐴","🫎","🫏","🐎","🦄",
    "🦓","🦌","🦬","🐮","🐂","🐃","🐄","🐷","🐖","🐗","🐽","🐏",
    "🐑","🐐","🐪","🐫","🦙","🦒","🐘","🦣","🦏","🦛","🐭","🐁",
    "🐀","🐹","🐰","🐇","🐿️","🦫","🦔","🦇","🐻","🐻‍❄️","🐨",
    "🐼","🦥","🦦","🦨","🦘","🦡","🐾","🦃","🐔","🐓","🐣","🐤",
    "🐥","🐦","🐧","🕊️","🦅","🦆","🦢","🦉","🦤","🪶","🦩","🦚",
    "🦜","🪽","🐦‍⬛","🪿","🐦‍🔥","🐸","🐊","🐢","🦎","🐍","🐲",
    "🐉","🦕","🦖","🐳","🐋","🐬","🦭","🐟","🐠","🐡","🦈","🐙",
    "🐚","🪸","🪼","🦀","🦞","🦐","🦑","🦪","🐌","🦋","🐛","🐜",
    "🐝","🪲","🐞","🦗","🪳","🕷️","🕸️","🦂","🦟","🪰","🪱",
    "🦠","💐","🌸","💮","🪷","🏵️","🌹","🥀","🌺","🌻","🌼","🌷",
    "🪻","🌱","🪴","🌲","🌳","🌴","🌵","🌾","🌿","☘️","🍀","🍁",
    "🍂","🍃","🪹","🪺","🍄","🍄‍🟫","🌰","🪨","🪵","🌍","🌎",
    "🌏","🌐","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️",
    "🏝️","🏞️","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️",
    "🌨️","❄️","☃️","⛄","🌬️","💨","🌪️","🌫️","🌈","☂️","☔",
    "⚡","🌊","💧","💦","☄️","🔥","🌙","🌚","🌛","🌜","🌝","🌞",
    "⭐","🌟","✨","💫","🌌"
  ],

  "Food & Drink": [
    "🍏","🍎","🍐","🍊","🍋","🍋‍🟩","🍌","🍉","🍇","🍓","🫐","🍈",
    "🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🫛","🥦","🥬",
    "🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🫘","🌰",
    "🫚","🫜","🍄","🍄‍🟫","🍞","🥐","🥖","🫓","🥨","🥯","🥞",
    "🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮",
    "🌯","🫔","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣","🥗","🍿",
    "🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢",
    "🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🦪","🍦","🍧","🍨",
    "🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼",
    "🥛","☕","🫖","🍵","🧃","🥤","🧋","🫙","🍶","🍺","🍻","🥂",
    "🍷","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢","🧋"
  ],

  "Travel & Places": [
    "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚",
    "🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🛼","🚨","🚔","🚍","🚘",
    "🚖","🛞","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈",
    "🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🛰️","🚀",
    "🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","⚓","🛟","⛽",
    "🚧","🚦","🚥","🗿","🗽","🗼","🏰","🏯","🏟️","🎡","🎢","🎠",
    "⛲","⛱️","🏖️","🏝️","🏜️","🌋","⛰️","🏕️","⛺","🛖","🏠",
    "🏡","🏘️","🏚️","🏗️","🏭","🏢","🏬","🏣","🏤","🏥","🏦",
    "🏨","🏪","🏫","🏩","💒","🏛️","⛪","🕌","🕍","🛕","🕋","⛩️",
    "🛤️","🛣️","🗺️","🧭","🌅","🌄","🌠","🎇","🎆","🌇","🌆",
    "🏙️","🌃","🌌","🌉","♨️"
  ],

  "Activities": [
    "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓",
    "🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿",
    "🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂",
    "🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄",
    "🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️",
    "🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🎬","🎤",
    "🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🪈",
    "🎲","♟️","🎯","🎳","🎮","🎰","🧩","🃏","🀄","🎴","🎁","🎉",
    "🎊","🎈","🪅","🪩","🧸","🪄"
  ],

  "Objects": [
    "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️",
    "💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞",
    "☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️",
    "⏰","🕰️","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯️",
    "🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳",
    "💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚",
    "🔩","⚙️","🪤","🧱","⛓️","⛓️‍💥","🧲","🔫","💣","🧨","🪓",
    "🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿",
    "🧿","🪬","💈","⚗️","🔭","🔬","🕳️","🩹","🩺","💊","💉",
    "🩸","🧬","🦠","🧫","🧪","🌡️","🧹","🪠","🧺","🧻","🚽",
    "🚿","🛁","🧼","🪥","🪒","🧽","🪣","🧴","🛎️","🔑","🗝️",
    "🚪","🪑","🛋️","🛏️","🛌","🧸","🪆","🖼️","🪞","🪟","🛍️",
    "🛒","🎁","🎈","🎏","🎀","🪄","🪅","🎊","🎉","🪩","🧧",
    "✉️","📩","📨","📧","💌","📥","📤","📦","🏷️","🪧","📪",
    "📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊",
    "📈","📉","🗒️","🗓️","📆","📅","🗑️","🪪","📇","🗃️","🗳️",
    "🗄️","📋","📁","📂","🗂️","🗞️","📰","📓","📔","📒","📕",
    "📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇️","📐",
    "📏","🧮","📌","📍","✂️","🖊️","🖋️","✒️","🖌️","🖍️",
    "📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"
  ],

  "Symbols": [
    "❤️","🩷","🧡","💛","💚","💙","🩵","💜","🤎","🖤","🩶","🤍",
    "💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
    "💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️",
    "🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒",
    "♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺",
    "🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲",
    "🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛",
    "🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭",
    "❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸",
    "🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐",
    "💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗","🈳","🈂️",
    "🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧️","🚻","🚮","🎦",
    "📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒",
    "🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣",
    "8️⃣","9️⃣","🔟","#️⃣","*️⃣","⏏️","▶️","⏸️","⏯️","⏹️",
    "⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️","🔼","🔽",
    "➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️",
    "↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🎵","🎶","➕","➖",
    "➗","✖️","🟰","♾️","💲","💱","™️","©️","®️","〰️","➰","➿",
    "✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","🟤","⚫",
    "⚪","🟥","🟧","🟨","🟩","🟦","🟪","🟫","⬛","⬜","◼️",
    "◻️","◾","◽","▪️","▫️","🔶","🔷","🔸","🔹","🔺","🔻",
    "💠","🔳","🔲"
  ],

  "Flags": [
    "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
    "🇺🇸","🇨🇦","🇲🇽","🇧🇷","🇦🇷","🇨🇱","🇨🇴","🇵🇪","🇻🇪",
    "🇬🇧","🇮🇪","🇫🇷","🇩🇪","🇪🇸","🇵🇹","🇮🇹","🇳🇱","🇧🇪",
    "🇨🇭","🇦🇹","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇮🇸","🇵🇱","🇨🇿",
    "🇬🇷","🇺🇦","🇷🇴","🇭🇺","🇷🇸","🇭🇷","🇷🇺","🇹🇷","🇬🇪",
    "🇨🇳","🇯🇵","🇰🇷","🇮🇳","🇵🇰","🇧🇩","🇱🇰","🇳🇵","🇹🇭",
    "🇻🇳","🇵🇭","🇮🇩","🇲🇾","🇸🇬","🇲🇳","🇰🇿","🇦🇫","🇮🇷",
    "🇮🇶","🇮🇱","🇵🇸","🇯🇴","🇱🇧","🇸🇦","🇦🇪","🇶🇦","🇰🇼",
    "🇪🇬","🇲🇦","🇩🇿","🇹🇳","🇿🇦","🇳🇬","🇰🇪","🇬🇭","🇪🇹",
    "🇦🇺","🇳🇿","🇫🇯","🇵🇬"
  ]
  }),
  get EMOJIS(){ return [...new Set(Object.values(this.EMOJI_GROUPS).flat())]; },

  // Keep a small per-user history so the picker can surface the reactions
  // this person actually reaches for, while still having a useful fallback
  // on a new device.
  usageKey(userId){ return `blur-reaction-usage:${userId || "anonymous"}`; },
  readUsage(userId){
    try {
      const parsed = JSON.parse(localStorage.getItem(this.usageKey(userId)) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  },
  recordUsage(userId, emoji){
    if (!emoji) return;
    try {
      const usage = this.readUsage(userId);
      const previous = Number(usage[emoji]) || 0;
      usage[emoji] = Math.min(previous + 1, 999);
      localStorage.setItem(this.usageKey(userId), JSON.stringify(usage));
    } catch { /* localStorage can be unavailable in private/embedded contexts */ }
  },
  frequentlyUsed(userId, fallback = [], limit = 30){
    const usage = this.readUsage(userId);
    const fallbackOrder = [...new Set(fallback)];
    const fallbackIndex = new Map(fallbackOrder.map((emoji, index) => [emoji, index]));
    const candidates = [...new Set([...fallbackOrder, ...this.EMOJIS])];
    return candidates
      .sort((a, b) => (usage[b] || 0) - (usage[a] || 0)
        || (fallbackIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (fallbackIndex.get(b) ?? Number.MAX_SAFE_INTEGER))
      .slice(0, limit);
  },

  // `${scope}:${messageId}` -> Map(emoji -> Set(userId))
  byMessage: new Map(),
  realtimeSub: null,

  TABLES: {
    channel: { table: "message_reactions", filterCol: "channel_id" },
    dm:      { table: "dm_message_reactions", filterCol: "conversation_id" },
  },

  key(scope, messageId){
    return `${scope}:${messageId}`;
  },

  ingest(rows, scope){
    for (const row of rows || []) {
      if (row?.message_id && row?.user_id && typeof row.emoji === "string" && row.emoji.length <= 32) {
        this._add(scope, row.message_id, row.emoji, row.user_id);
      }
    }
  },

  _add(scope, messageId, emoji, userId){
    if (!messageId || !userId || typeof emoji !== "string" || !emoji || emoji.length > 32) return;
    const k = this.key(scope, messageId);
    if (!this.byMessage.has(k)) this.byMessage.set(k, new Map());
    const emojiMap = this.byMessage.get(k);
    if (!emojiMap.has(emoji) && emojiMap.size >= this.MAX_TYPES_PER_MESSAGE) return;
    if (!emojiMap.has(emoji)) emojiMap.set(emoji, new Set());
    emojiMap.get(emoji).add(userId);
  },

  _remove(scope, messageId, emoji, userId){
    const emojiMap = this.byMessage.get(this.key(scope, messageId));
    if (!emojiMap) return;
    const set = emojiMap.get(emoji);
    if (!set) return;
    set.delete(userId);
    if (set.size === 0) emojiMap.delete(emoji);
  },

  /** Loads all reactions for one channel or conversation. Like the
   *  original loadForChannel, this fully replaces the cache for the
   *  scope — so reactions deleted while we were elsewhere can't linger. */
  async load(scope, scopeId, isCurrent = () => true){
    const { table, filterCol } = this.TABLES[scope];
    const { data, error } = await sb
      .from(table)
      .select("*")
      .eq(filterCol, scopeId);
    if (error) throw error;
    if (!isCurrent()) return data || [];
    for (const k of [...this.byMessage.keys()]) {
      if (k.startsWith(`${scope}:`)) this.byMessage.delete(k);
    }
    this.ingest(data || [], scope);
    return data || [];
  },

  /** Adds the reaction if the user hasn't used that emoji on this message yet, else removes it. */
  async toggle(scope, scopeId, messageId, userId, emoji){
    if (!this.TABLES[scope] || !scopeId || !messageId || !userId || typeof emoji !== "string" || !emoji || emoji.length > 32) {
      throw new Error("That reaction is not valid.");
    }
    const already = this.byMessage.get(this.key(scope, messageId))?.get(emoji)?.has(userId);

    if (already) {
      const { table } = this.TABLES[scope];
      const { error } = await sb
        .from(table)
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
      if (error) throw error;
      this._remove(scope, messageId, emoji, userId); // optimistic; realtime DELETE is a harmless no-op re-apply
    } else {
      const localMap = this.byMessage.get(this.key(scope, messageId));
      if (!localMap?.has(emoji) && (localMap?.size || 0) >= this.MAX_TYPES_PER_MESSAGE) {
        throw new Error(`A message can have up to ${this.MAX_TYPES_PER_MESSAGE} different reactions.`);
      }
      const { table, filterCol } = this.TABLES[scope];
      // Re-check against Supabase so a stale client cache cannot bypass the
      // distinct-reaction limit. Existing emoji rows remain toggleable.
      const { data: existing, error: countError } = await sb
        .from(table)
        .select("emoji")
        .eq(filterCol, scopeId)
        .eq("message_id", messageId);
      if (countError) throw countError;
      const distinct = new Set((existing || []).map(row => row.emoji));
      if (!distinct.has(emoji) && distinct.size >= this.MAX_TYPES_PER_MESSAGE) {
        throw new Error(`A message can have up to ${this.MAX_TYPES_PER_MESSAGE} different reactions.`);
      }
      const { error } = await sb
        .from(table)
        .insert({ message_id: messageId, [filterCol]: scopeId, user_id: userId, emoji });
      if (error) throw error;
      this._add(scope, messageId, emoji, userId);
    }
  },

  /**
   * Subscribes to INSERT/DELETE for one scope's reactions.
   * `onChange(messageId)` fires so the caller can re-render just
   * that message's pill row. Does NOT touch byMessage — the
   * caller is expected to have already called load() first.
   * Always replaces any previous subscription.
   */
  subscribe(scope, scopeId, onChange){
    this.unsubscribe();

    const { table, filterCol } = this.TABLES[scope];
    this.realtimeSub = sb
      .channel(`reactions:${scope}:${scopeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table,
        filter: `${filterCol}=eq.${scopeId}`
      }, (payload) => {
        if (!payload?.new?.message_id) return;
        this._add(scope, payload.new.message_id, payload.new.emoji, payload.new.user_id);
        try { onChange?.(payload.new.message_id); } catch (error) { console.error("Reaction update listener failed:", error); }
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table,
        filter: `${filterCol}=eq.${scopeId}`
      }, (payload) => {
        // Requires "replica identity full" on the reactions table
        // so payload.old has more than just the primary key.
        if (!payload?.old?.message_id) return;
        this._remove(scope, payload.old.message_id, payload.old.emoji, payload.old.user_id);
        try { onChange?.(payload.old.message_id); } catch (error) { console.error("Reaction update listener failed:", error); }
      })
      .subscribe();
  },

  /** Just tears down the realtime channel — leaves byMessage alone. */
  unsubscribe(){
    if (this.realtimeSub) {
      sb.removeChannel(this.realtimeSub);
      this.realtimeSub = null;
    }
  },

  /** Full reset — call this on sign-out, not on every channel switch. */
  reset(){
    this.unsubscribe();
    this.byMessage.clear();
  },

  /** Builds the inner HTML for one message's reaction row: existing pills. */
  renderPills(scope, messageId, currentUserId){
    const emojiMap = this.byMessage.get(this.key(scope, messageId));
    let html = "";
    let renderedCount = 0;

    if (emojiMap) {
      for (const [emoji, users] of [...emojiMap].slice(0, this.MAX_TYPES_PER_MESSAGE)) {
        if (users.size === 0) continue;
        renderedCount++;
        const mine = users.has(currentUserId);
        const userIds = escapeAttr(JSON.stringify([...users]));
        // Reaction values normally come from the curated picker, but escape
        // database rows as well so a forged/custom value cannot become HTML
        // when another user opens the channel.
        html += `<button type="button" class="reaction-pill ${mine ? "mine" : ""}" data-react-message="${escapeAttr(messageId)}" data-react-emoji="${escapeAttr(emoji)}" data-reaction-users="${userIds}">${escapeHtml(emoji)} <span>${users.size}</span></button>`;
      }
    }

    // Keep adding another reaction discoverable without duplicating the
    // hover action bar. The existing Chat click delegation opens the same
    // picker used by the message-level reaction button.
    if (renderedCount > 0) {
      html += `<button type="button" class="reaction-add-inline" data-react-add="${messageId}" title="Add reaction" aria-label="Add reaction"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>`;
    }

    return html;
  }
};
