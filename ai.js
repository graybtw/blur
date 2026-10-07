/* ============================================================
   Blur AI

   A small, local-first client for the OpenAI-compatible BlurGPT API.
   Conversations stay in this browser. The service credential is injected at
   deploy time; no key is shipped with Blur's public source.
============================================================ */

(function(){
  "use strict";

  const STORAGE_CONVOS = "blur.ai.conversations";
  const STORAGE_MODEL = "blur.ai.crax.model";
  const STORAGE_DAILY = "blur.ai.daily-usage";
  const STORAGE_COWORK = "blur.ai.cowork";
  const STORAGE_SEARCH = "blur.ai.search";
  const STORAGE_EFFORT = "blur.ai.effort";
  const CRAX_API = String(window.BLUR_AI_CONFIG?.endpoint || "https://svvgovbyzirdsjdcznyn.supabase.co/functions/v1/crax-proxy").replace(/\/$/, "");
  // Direct mode is for local development only. Production uses the same-origin
  // proxy so the credential never enters this public bundle.
  const CRAX_API_KEY = String(window.BLUR_AI_CONFIG?.craxApiKey || "").trim();
  const USE_PROXY = CRAX_API.startsWith("/") || CRAX_API.includes("/functions/v1/crax-proxy");
  const SERVICE_CONFIGURED = USE_PROXY || !!CRAX_API_KEY;
  let serviceReady = !!CRAX_API_KEY;
  let serviceError = "";
  const MEMBER_DAILY_LIMIT = 20;
  const STAFF_DAILY_LIMIT = 30;
  const COMMUNITY_MANAGER_DAILY_LIMIT = 40;

  const PROVIDER_LOGOS = Object.freeze({
    // OpenAI is no longer served by the Simple Icons CDN endpoint, so use
    // the same official icon source through jsDelivr instead.
    openai: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg",
    zai: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3E%3Cg fill='%23fff'%3E%3Cpath d='M15.47 7.1l-1.3 1.85c-.2.29-.54.47-.9.47h-7.1V7.09z'/%3E%3Cpath d='M24.3 7.1 13.14 22.91H5.7L16.86 7.1z'/%3E%3Cpath d='M14.53 22.91l1.31-1.86c.2-.29.54-.47.9-.47h7.09v2.33z'/%3E%3C/g%3E%3C/svg%3E",
    claude: "https://cdn.simpleicons.org/claude",
    anthropic: "https://cdn.simpleicons.org/anthropic",
    gemini: "https://cdn.simpleicons.org/googlegemini",
    google: "https://cdn.simpleicons.org/google",
    meta: "https://cdn.simpleicons.org/meta",
    deepseek: "https://cdn.simpleicons.org/deepseek",
    qwen: "https://cdn.simpleicons.org/qwen",
    alibaba: "https://cdn.simpleicons.org/alibabacloud",
    mistral: "https://cdn.simpleicons.org/mistralai",
    xai: "https://cdn.simpleicons.org/x",
    grok: "https://cdn.simpleicons.org/x",
    moonshot: "https://cdn.simpleicons.org/moonshotai",
    kimi: "https://cdn.simpleicons.org/kimi",
    useai: "https://useai.com/favicon.ico",
    minimax: "https://cdn.simpleicons.org/minimax",
    nvidia: "https://cdn.simpleicons.org/nvidia",
    bytedance: "https://cdn.simpleicons.org/bytedance",
    perplexity: "https://cdn.simpleicons.org/perplexity",
    openrouter: "https://cdn.simpleicons.org/openrouter",
    huggingface: "https://cdn.simpleicons.org/huggingface",
    // BlurGPT has no public provider favicon, so keep its mark self-contained
    // and reliable instead of depending on a missing remote favicon.
    crax: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23b79a5b' d='m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z'/%3E%3C/svg%3E",
    blurgpt: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23b79a5b' d='m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z'/%3E%3C/svg%3E",
  });

  // The catalog is loaded after a key is connected. This fallback keeps the
  // selector useful before the first catalog request (and on old keys).
  const FALLBACK_MODELS = Object.freeze([
    { id: "qwen3.8-max", name: "Qwen 3.8 Max", provider: "BlurGPT", description: "High-capability general assistant", tag: "MAX", tier: "free" },
    { id: "qwen3.8-plus", name: "Qwen 3.8 Plus", provider: "BlurGPT", description: "Balanced reasoning and speed", tag: "PLUS", tier: "free" },
    { id: "qwen3.8-flash", name: "Qwen 3.8 Flash", provider: "BlurGPT", description: "Fast everyday answers", tag: "FAST", tier: "free" },
  ]);

  let models = FALLBACK_MODELS.slice();
  let state = { conversations: [], activeId: null, model: FALLBACK_MODELS[0].id, apiKey: "", dailyCount: 0, cowork: false, search: false, effort: "medium", imageMode: false };
  let els = {};
  let isSending = false;
  let currentController = null;
  let modelDropdownEl = null;
  let modelDropdownOpen = false;
  let coworkPopoverEl = null;
  let coworkPopoverOpen = false;
  let effortPopoverEl = null;
  let effortPopoverOpen = false;
  let noticeTimer = null;
  let scrollFrame = 0;
  let modelProviderFilter = "all";
  let modelQuery = "";
  let modelDropdownQuery = "";
  let composerFiles = [];
  let editingMessage = null;
  const EFFORTS = Object.freeze(["off", "low", "medium", "high"]);
  const IMAGE_MODEL = "seedream-5";

  function accountService(){ return typeof Account !== "undefined" ? Account : null; }
  function currentProfile(){
    const account = accountService();
    return account?.profile || (typeof Chat !== "undefined" ? Chat.profile : null) || null;
  }
  function isStaffAiUser(){
    return typeof Permissions !== "undefined" && Permissions.isStaff(currentProfile());
  }
  function modelSupportsReasoning(model){
    if (!model) return false;
    if (model.reasoning === true) return true;
    if (model.reasoning === false) return false;
    // Crax exposes reasoning controls for the GLM family. Keep this fallback
    // conservative for older catalog responses that omit capability metadata.
    return /(?:^|[^a-z])glm(?:[-_.]|$)/i.test(`${model.id || ""} ${model.name || ""}`);
  }
  function modelUsesStream(model){
    // GLM's Crax route provides the stable OpenAI SSE shape. Other catalog
    // models are requested as JSON because their streamed responses can use a
    // different content type or remain open without a terminal event.
    return modelSupportsReasoning(model);
  }
  function dailyLimit(){
    const profile = currentProfile();
    if (typeof Permissions !== "undefined" && Permissions.hasExactRole(profile, "community_manager")) return COMMUNITY_MANAGER_DAILY_LIMIT;
    return isStaffAiUser() ? STAFF_DAILY_LIMIT : MEMBER_DAILY_LIMIT;
  }
  function requestBody(body){
    const next = { ...body };
    const selectedModel = findModel(next.model);
    // Crax rejects reasoning_effort for models that do not expose reasoning
    // controls. Only send the field when the catalog (or the GLM fallback)
    // says the selected model supports it.
    if (!modelSupportsReasoning(selectedModel)) {
      delete next.reasoning_effort;
      delete next.include_reasoning;
      return next;
    }
    // Crax accepts the OpenAI-compatible reasoning_effort field. Keep the
    // deeper setting exclusive to staff while leaving member requests as-is.
    const effort = EFFORTS.includes(next.reasoning_effort) ? next.reasoning_effort : (EFFORTS.includes(state.effort) ? state.effort : "medium");
    if (isStaffAiUser() || effort === "high") next.reasoning_effort = "high";
    else if (effort === "off") delete next.reasoning_effort;
    else next.reasoning_effort = effort;
    return next;
  }
  function accountScope(){ const account = accountService(); return account?.user?.id ? `user:${account.user.id}` : "browser"; }
  function localDay(){ const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
  function dailyKey(){ return `${accountScope()}:${localDay()}`; }
  function uid(){ return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  function providerKey(provider){ return String(provider || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function providerLogo(provider){
    const key = providerKey(provider);
    return Object.entries(PROVIDER_LOGOS).find(([name]) => key.includes(name))?.[1] || "";
  }
  function modelLogo(model){
    const name = String(model?.name || "").toLowerCase();
    const provider = String(model?.provider || "").toLowerCase();
    const source = `${name} ${provider}`;
    if (source.includes("glm") || source.includes("zai") || source.includes("zhipu") || source.includes("chatglm")) return PROVIDER_LOGOS.zai;
    if (source.includes("claude") || source.includes("anthropic")) return PROVIDER_LOGOS.claude;
    if (source.includes("gpt") || source.includes("chatgpt") || source.includes("openai")) return PROVIDER_LOGOS.openai;
    if (source.includes("deepseek")) return PROVIDER_LOGOS.deepseek;
    if (source.includes("kimi") || source.includes("moonshot")) return PROVIDER_LOGOS.kimi;
    if (source.includes("gemini") || source.includes("google")) return PROVIDER_LOGOS.gemini;
    if (source.includes("grok") || source.includes("xai")) return PROVIDER_LOGOS.xai;
    if (source.includes("qwen")) return PROVIDER_LOGOS.qwen;
    if (source.includes("mistral")) return PROVIDER_LOGOS.mistral;
    if (source.includes("llama") || source.includes("meta")) return PROVIDER_LOGOS.meta;
    if (source.includes("minimax")) return PROVIDER_LOGOS.minimax;
    return providerLogo(model?.provider) || providerLogo(model?.name);
  }
  function providerInitials(provider){
    const words = String(provider || "AI").trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words.map(word => word[0]) : [words[0]?.[0] || "A"]).join("").slice(0, 2).toUpperCase();
  }
  function providerLabel(provider){ return providerKey(provider).includes("crax") ? "BlurGPT" : String(provider || "BlurGPT"); }
  function providerMark(provider, extra = "", modelName = ""){
    const logo = modelLogo({ provider, name: modelName });
    return `<span class="ai-provider-mark ${extra}" aria-hidden="true">${logo ? `<img src="${escapeAttr(logo)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">` : ""}<span ${logo ? "hidden" : ""}>${escapeHtml(providerInitials(provider))}</span></span>`;
  }
  function modelMark(model, extra = ""){
    return providerMark(model?.provider, extra, model?.name);
  }

  function escapeHtml(value){ const div = document.createElement("div"); div.textContent = value == null ? "" : String(value); return div.innerHTML; }
  function escapeAttr(value){ return escapeHtml(value).replace(/`/g, "&#96;"); }
  function icon(path, extra = ""){ return `<svg viewBox="0 0 24 24" ${extra}>${path}</svg>`; }

  function normalizeModel(raw){
    const id = String(raw?.id || raw?.name || "").trim();
    if (!id) return null;
    const provider = String(raw?.provider || id.split("/")[0] || "BlurGPT").trim();
    const context = raw?.context_length || raw?.contextLength;
    const capabilitySource = raw?.capabilities ?? raw?.features ?? raw?.supported_parameters;
    const capabilityList = Array.isArray(capabilitySource) ? capabilitySource.map(value => String(value).toLowerCase()) : [];
    const capabilityObject = capabilitySource && typeof capabilitySource === "object" && !Array.isArray(capabilitySource) ? capabilitySource : null;
    const reasoningValues = raw?.reasoning_efforts || raw?.reasoningEfforts || raw?.supported_reasoning_efforts;
    let reasoning;
    if (typeof raw?.reasoning === "boolean") reasoning = raw.reasoning;
    else if (typeof raw?.supports_reasoning === "boolean") reasoning = raw.supports_reasoning;
    else if (Array.isArray(reasoningValues)) reasoning = reasoningValues.length > 0;
    else if (capabilityObject && typeof capabilityObject.reasoning === "boolean") reasoning = capabilityObject.reasoning;
    else if (capabilityList.length) reasoning = capabilityList.some(value => value.includes("reasoning") || value.includes("thinking"));
    else reasoning = /(?:^|[^a-z])glm(?:[-_.]|$)/i.test(`${id} ${raw?.name || ""}`);
    return {
      id,
      name: String(raw?.name || id.split("/").pop() || id),
      provider,
      description: String(raw?.description || (context ? `${Number(context).toLocaleString()} token context` : "Available through BlurGPT")),
      tag: String(raw?.tag || (raw?.reasoning ? "REASONING" : "MODEL")).toUpperCase(),
      tier: String(raw?.tier || raw?.plan || (raw?.premium ? "premium" : "free")).toLowerCase(),
      context,
      inRate: raw?.inRate,
      outRate: raw?.outRate,
      reasoning,
    };
  }

  function findModel(id){ return models.find(model => model.id === id) || models[0] || FALLBACK_MODELS[0]; }
  function formatTime(ts){ const date = new Date(ts); return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function sourceDomain(href){ try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return "source"; } }
  function normalizeSource(raw){
    if (typeof raw === "string") {
      const href = raw.trim();
      return /^https?:\/\//i.test(href) ? { name: sourceDomain(href), domain: sourceDomain(href), href } : null;
    }
    if (!raw || typeof raw !== "object") return null;
    const data = raw.url_citation || raw.urlCitation || raw.citation || raw.reference || raw;
    const href = String(data.href || data.url || data.link || data.uri || data.source_url || data.sourceUrl || data.web_url || data.webUrl || "").trim();
    if (!/^https?:\/\//i.test(href)) return null;
    const domain = String(data.domain || data.hostname || data.site || data.source || data.publisher || sourceDomain(href)).trim() || sourceDomain(href);
    const name = String(data.name || data.title || data.label || data.site_name || data.siteName || data.publisher || domain).trim() || domain;
    return { name: name.slice(0, 120), domain: domain.slice(0, 120), href };
  }
  function mergeSources(current, next){
    const all = [...(Array.isArray(current) ? current : []), ...(Array.isArray(next) ? next : [])];
    const seen = new Set();
    return all.map(normalizeSource).filter(source => {
      if (!source || seen.has(source.href)) return false;
      seen.add(source.href);
      return true;
    }).slice(0, 12);
  }
  function responseText(payload){
    const value = payload?.choices?.[0]?.message?.content ?? payload?.content;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value.map(block => {
        if (typeof block === "string") return block;
        if (typeof block?.text === "string") return block.text;
        if (typeof block?.content === "string") return block.content;
        return "";
      }).filter(Boolean).join("\n");
    }
    return "";
  }
  function extractSources(payload, text = ""){
    let sources = [];
    const sourceKey = /(?:source|citation|search|result|reference|annotation)/i;
    const visit = (value, depth = 0, hinted = false) => {
      if (depth > 8 || value == null) return;
      const direct = normalizeSource(value);
      if (direct) { sources = mergeSources(sources, [direct]); return; }
      if (Array.isArray(value)) {
        value.forEach(item => visit(item, depth + 1, hinted));
        return;
      }
      if (typeof value !== "object") return;
      Object.entries(value).forEach(([key, child]) => {
        const childHinted = hinted || sourceKey.test(key);
        if (childHinted || depth < 2) visit(child, depth + 1, childHinted);
      });
    };
    // Crax has returned citations under several OpenAI-compatible envelopes
    // over time, so walk only source-like branches instead of assuming one
    // fixed response schema.
    visit(payload);
    if (!sources.length && text) {
      const urls = String(text).match(/https?:\/\/[^\s)<>]+/gi) || [];
      sources = mergeSources(sources, urls);
    }
    return sources;
  }
  function resetLabel(){
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    return `Resets ${next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  function loadState(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_CONVOS) || "[]");
      state.conversations = Array.isArray(parsed) ? parsed.filter(convo => convo && convo.id && !convo.temporary).map(convo => ({ ...convo, temporary: false, cowork: !!convo.cowork, search: !!convo.search, effort: EFFORTS.includes(convo.effort) ? convo.effort : "medium", messages: Array.isArray(convo.messages) ? convo.messages.filter(message => message && message.role && typeof message.content === "string").map(message => ({ ...message, attachments: normalizeAttachments(message.attachments), images: normalizeImages(message.images) })) : [], updatedAt: Number(convo.updatedAt) || Date.now() })).filter(convo => convo.messages.length) : [];
    } catch { state.conversations = []; }
    state.model = localStorage.getItem(STORAGE_MODEL) || FALLBACK_MODELS[0].id;
    state.cowork = localStorage.getItem(STORAGE_COWORK) === "true";
    state.search = localStorage.getItem(STORAGE_SEARCH) === "true";
    state.effort = EFFORTS.includes(localStorage.getItem(STORAGE_EFFORT)) ? localStorage.getItem(STORAGE_EFFORT) : "medium";
    state.apiKey = CRAX_API_KEY;
    if (state.conversations.length) state.activeId = state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    loadDailyUsage();
  }

  function saveConversations(){
    try { localStorage.setItem(STORAGE_CONVOS, JSON.stringify(state.conversations.filter(convo => !convo.temporary && convo.messages?.length))); }
    catch (error) { console.warn("AI conversation save failed:", error); }
  }

  function loadDailyUsage(){
    state.dailyCount = 0;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_DAILY) || "{}");
      const record = all[dailyKey()];
      if (record?.day === localDay()) state.dailyCount = Math.max(0, Math.min(dailyLimit(), Number(record.count) || 0));
    } catch { state.dailyCount = 0; }
  }

  function saveDailyUsage(){
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_DAILY) || "{}");
      all[dailyKey()] = { day: localDay(), count: state.dailyCount };
      const keys = Object.keys(all);
      if (keys.length > 14) keys.sort().slice(0, keys.length - 14).forEach(key => delete all[key]);
      localStorage.setItem(STORAGE_DAILY, JSON.stringify(all));
    } catch { /* local storage is optional */ }
  }

  function consumeDailyMessage(){
    loadDailyUsage(); state.dailyCount = Math.min(dailyLimit(), state.dailyCount + 1); saveDailyUsage(); updateUsage();
  }
  function getActive(){ return state.conversations.find(convo => convo.id === state.activeId) || null; }
  function conversationTitle(convo){ const first = convo?.messages?.find(message => message.role === "user")?.content; if (!first) return "New chat"; const flat = first.replace(/\s+/g, " ").trim(); return flat.length > 42 ? `${flat.slice(0, 42).trimEnd()}…` : flat; }

  function updateUsage(){
    loadDailyUsage();
    const limit = dailyLimit();
    const used = state.dailyCount;
    if (els.usageCount) els.usageCount.textContent = `${used} / ${limit} today`;
    if (els.usageFill) els.usageFill.style.width = `${Math.min(100, (used / limit) * 100)}%`;
    const emptyLimit = els.messages?.querySelector("#aiEmptyLimit");
    if (emptyLimit) emptyLimit.textContent = `Choose a model below · ${limit} messages each day`;
    if (els.composerHint && !isSending) els.composerHint.textContent = serviceReady ? "" : "AI service unavailable";
  }

  function updateConnectionState(){
    const connected = serviceReady;
    const authIssue = /auth|jwt|token|401/i.test(serviceError);
    if (els.headerStatus) els.headerStatus.textContent = connected ? "READY" : authIssue ? "SIGN IN" : "OFFLINE";
    if (els.composerHint && !isSending) els.composerHint.textContent = connected ? "" : authIssue ? "Sign in to use AI" : "AI service unavailable";
  }

  function buildShell(panel){
    panel.innerHTML = `
      <div class="ai-app">
        <aside class="ai-sidebar" aria-label="AI conversations">
          <button class="ai-mobile-close" type="button" aria-label="Close conversations">×</button>
          <nav class="ai-sidebar-nav" aria-label="AI navigation">
            <button class="ai-sidebar-nav-item active" type="button" data-ai-new>${icon('<path d="M12 5v14M5 12h14"/>')}<span>New</span></button>
            <button class="ai-sidebar-nav-item" type="button" data-ai-models>${icon('<path d="M12 3 4 7l8 4 8-4-8-4ZM4 12l8 4 8-4M4 17l8 4 8-4"/>')}<span>Models</span></button>
            <button class="ai-sidebar-nav-item" type="button" data-ai-chats>${icon('<path d="M5 5h14v10H9l-4 4V5Z"/>')}<span>Chats</span><span class="ai-sidebar-nav-count" id="aiChatCount">0</span></button>
          </nav>
          <div class="ai-sidebar-section-label"><span>Recent</span><span class="ai-sidebar-nav-count" id="aiChatCount">0</span></div>
          <div class="ai-sidebar-list" id="aiSidebarList"></div>
          <div class="ai-sidebar-bottom"><div class="ai-usage-card"><div class="ai-usage-summary"><strong id="aiUsageCount">0 / ${dailyLimit()} today</strong></div><div class="ai-usage-track"><span id="aiUsageFill"></span></div></div></div>
        </aside>
        <section class="ai-main" aria-label="AI conversation">
          <header class="ai-chat-header"><button class="ui-icon-button ui-icon-button--sm ai-mobile-toggle" type="button" aria-label="Open conversations">${icon('<path d="M4 6h16M4 12h16M4 18h16"/>')}</button><div class="ai-header-copy"><h1 id="aiChatTitle">New chat</h1></div></header>
          <div class="ai-messages" id="aiMessages" aria-live="polite"></div>
          <div class="ai-composer-wrap"><div class="ai-composer-notice" id="aiComposerNotice" role="status" hidden></div><div class="ai-composer"><div class="ai-attachment-tray" id="aiAttachmentTray" hidden></div><textarea rows="1" placeholder="Message BlurGPT..." id="aiTextarea" aria-label="Message BlurGPT"></textarea><input class="ai-file-input" id="aiFileInput" type="file" multiple accept="image/*,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.html,.css,.xml,.yaml,.yml"><div class="ai-composer-bottom"><div class="ai-composer-controls"><button class="ai-composer-tool" id="aiAttachButton" type="button" aria-label="Attach files" title="Attach files">${icon('<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>')}</button><button class="ai-composer-tool" id="aiCoworkToggle" type="button" aria-label="Use AI coworkers" title="Use AI coworkers" aria-pressed="false">${icon('<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/>')}</button><button class="ai-composer-tool ai-image-toggle" id="aiImageToggle" type="button" aria-label="Generate an image" title="Generate an image" aria-pressed="false">${icon('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 6"/>')}</button></div><span class="ai-composer-hint" id="aiComposerHint"></span><button class="ai-model-selector ai-composer-model-selector" id="aiModelSelector" type="button" aria-haspopup="listbox" aria-expanded="false"><span class="ai-model-icon" id="aiModelIcon"></span><span class="ai-model-name" id="aiModelName">Qwen 3.8 Max</span><span class="ai-model-arrow" aria-hidden="true">⌄</span></button><button class="ui-icon-button ui-icon-button--sm ai-send" type="button" aria-label="Send message" id="aiSendBtn" disabled>${icon('<path d="M12 19V5M5 12l7-7 7 7"/>')}</button></div></div><div class="ai-composer-meta"><button class="ai-temporary-toggle" id="aiTemporaryToggle" type="button" aria-pressed="false" title="Don't save this chat">${icon('<path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/><path d="M3 3l18 18"/>')}<span>Temporary chat</span></button></div><p class="ai-temporary-note" id="aiTemporaryNote" hidden>Temporary chat · This chat won’t be saved.</p></div>
          <section class="ai-models-page" id="aiModelsPage" hidden aria-label="Models"><div class="ai-models-heading"><span class="ai-header-kicker">BLURGPT</span><h2>Models</h2><p><span id="aiModelsCount">0</span> models available. Select one to use it in your next chat.</p></div><label class="ai-models-search ui-field"><span>${icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}</span><input id="aiModelsSearch" type="search" placeholder="Search models or providers" autocomplete="off" aria-label="Search models or providers"></label><div class="ai-model-filters" id="aiModelFilters"></div><div class="ai-models-table"><div class="ai-models-table-head"><span>MODEL</span><span>CONTEXT</span><span>CAPABILITY</span><span>PRICING</span><span>STATUS</span></div><div class="ai-models-list" id="aiModelsList"></div></div></section>
        </section>
      </div>`;

    els.app = panel.querySelector(".ai-app");
    els.sidebarList = panel.querySelector("#aiSidebarList");
    els.sidebarSearch = panel.querySelector("#aiSidebarSearch");
    els.chatCount = panel.querySelector("#aiChatCount");
    els.chatTitle = panel.querySelector("#aiChatTitle");
    els.temporaryToggle = panel.querySelector("#aiTemporaryToggle");
    els.temporaryNote = panel.querySelector("#aiTemporaryNote");
    els.headerStatus = panel.querySelector("#aiHeaderStatus");
    els.messages = panel.querySelector("#aiMessages");
    els.textarea = panel.querySelector("#aiTextarea");
    els.sendBtn = panel.querySelector("#aiSendBtn");
    els.modelSelector = panel.querySelector("#aiModelSelector");
    els.modelIcon = panel.querySelector("#aiModelIcon");
    els.modelName = panel.querySelector("#aiModelName");
    els.usageCount = panel.querySelector("#aiUsageCount");
    els.usageFill = panel.querySelector("#aiUsageFill");
    els.usageLabel = panel.querySelector("#aiUsageLabel");
    els.usageReset = panel.querySelector("#aiUsageReset");
    els.composerHint = panel.querySelector("#aiComposerHint");
    els.notice = panel.querySelector("#aiComposerNotice");
    els.searchToggle = panel.querySelector("#aiSearchToggle");
    els.coworkToggle = panel.querySelector("#aiCoworkToggle");
    els.effortToggle = panel.querySelector("#aiEffortToggle");
    els.attachButton = panel.querySelector("#aiAttachButton");
    els.fileInput = panel.querySelector("#aiFileInput");
    els.attachmentTray = panel.querySelector("#aiAttachmentTray");
    els.imageToggle = panel.querySelector("#aiImageToggle");
    els.modelsPage = panel.querySelector("#aiModelsPage");
    els.modelsList = panel.querySelector("#aiModelsList");
    els.modelsCount = panel.querySelector("#aiModelsCount");
    els.modelsSearch = panel.querySelector("#aiModelsSearch");
    els.modelFilters = panel.querySelector("#aiModelFilters");

    panel.querySelector("[data-ai-new]")?.addEventListener("click", () => { showConversationView(); startNewConversation(true); });
    panel.querySelector("[data-ai-models]")?.addEventListener("click", showModelsView);
    panel.querySelector("[data-ai-chats]")?.addEventListener("click", showConversationView);
    panel.querySelector(".ai-mobile-toggle").addEventListener("click", () => els.app.classList.toggle("sidebar-open"));
    panel.querySelector(".ai-mobile-close").addEventListener("click", () => els.app.classList.remove("sidebar-open"));
    els.sidebarSearch?.addEventListener("input", renderSidebar);
    els.sidebarList.addEventListener("click", event => { const del = event.target.closest("[data-delete-conversation]"); if (del) { event.stopPropagation(); deleteConversation(del.dataset.deleteConversation); return; } const row = event.target.closest("[data-conversation-id]"); if (row) { showConversationView(); selectConversation(row.dataset.conversationId); } });
    els.textarea.addEventListener("input", handleTextareaInput);
    els.textarea.addEventListener("keydown", handleTextareaKeydown);
    els.sendBtn.addEventListener("click", handleSend);
    els.temporaryToggle?.addEventListener("click", toggleTemporaryChat);
    els.coworkToggle?.addEventListener("click", toggleCoworkPopover);
    els.effortToggle?.addEventListener("click", toggleEffortPopover);
    els.attachButton?.addEventListener("click", () => els.fileInput?.click());
    els.fileInput?.addEventListener("change", handleFileSelection);
    els.imageToggle?.addEventListener("click", toggleImageMode);
    els.attachmentTray?.addEventListener("click", event => { const remove = event.target.closest("[data-remove-ai-file]"); if (!remove) return; composerFiles.splice(Number(remove.dataset.removeAiFile), 1); renderAttachmentTray(); handleTextareaInput(); });
    els.modelsSearch?.addEventListener("input", renderModelsView);
    els.modelFilters?.addEventListener("click", event => { const filter = event.target.closest("[data-provider-filter]"); if (!filter) return; modelProviderFilter = filter.dataset.providerFilter; renderModelsView(); });
    els.modelsList?.addEventListener("click", event => { const row = event.target.closest("[data-model-id]"); if (!row) return; selectModel(row.dataset.modelId); showConversationView(); });
    els.modelSelector.addEventListener("click", event => { event.stopPropagation(); toggleModelDropdown(); });
    panel.querySelector("#aiClearButton")?.addEventListener("click", clearActiveConversation);
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (modelDropdownOpen) closeModelDropdown();
      if (coworkPopoverOpen) closeCoworkPopover();
      if (effortPopoverOpen) closeEffortPopover();
    });
    window.addEventListener("resize", () => { if (modelDropdownOpen) positionModelDropdown(); if (coworkPopoverOpen) positionCoworkPopover(); if (effortPopoverOpen) positionEffortPopover(); });
    accountService()?.onAuthStateChange?.(() => { loadDailyUsage(); updateUsage(); });
    accountService()?.onProfileChange?.(() => { loadDailyUsage(); updateUsage(); });
    renderAll();
    if (SERVICE_CONFIGURED) refreshModels({ silent: true });
    setTimeout(() => els.textarea.focus(), 120);
  }

  function renderAll(){ renderSidebar(); renderActiveConversation(); renderModelSelector(); renderTemporaryState(); renderCoworkState(); renderSearchState(); renderEffortState(); renderImageMode(); renderAttachmentTray(); renderModelsView(); updateConnectionState(); updateUsage(); }

  function showConversationView(){
    if (!els.app) return;
    els.app.classList.remove("models-view");
    els.modelsPage?.setAttribute("hidden", "");
    els.app.querySelectorAll("[data-ai-new],[data-ai-models],[data-ai-chats]").forEach(item => item.classList.toggle("active", item.matches("[data-ai-new]")));
    closeModelDropdown();
    closeCoworkPopover();
  }

  function showModelsView(){
    if (!els.app) return;
    els.app.classList.add("models-view");
    els.modelsPage?.removeAttribute("hidden");
    els.app.querySelectorAll("[data-ai-new],[data-ai-models],[data-ai-chats]").forEach(item => item.classList.toggle("active", item.matches("[data-ai-models]")));
    closeModelDropdown();
    closeCoworkPopover();
    renderModelsView();
  }

  function modelPrice(value){
    if (value == null || value === "") return "—";
    const number = Number(value);
    return Number.isFinite(number) ? `$${number.toFixed(number < 1 ? 2 : 1)}` : escapeHtml(String(value));
  }

  function renderModelsView(){
    if (!els.modelsPage || els.modelsPage.hidden || !els.modelsList) return;
    modelQuery = String(els.modelsSearch?.value || modelQuery).trim().toLowerCase();
    const providers = [...new Set(models.map(model => providerLabel(model.provider)))].sort();
    if (els.modelFilters) els.modelFilters.innerHTML = ["all", ...providers].map(provider => `<button type="button" class="ai-model-filter ${modelProviderFilter === provider ? "active" : ""}" data-provider-filter="${escapeAttr(provider)}">${escapeHtml(provider === "all" ? "All providers" : provider)}</button>`).join("");
    const filtered = models.filter(model => {
      const provider = providerLabel(model.provider);
      const matchesProvider = modelProviderFilter === "all" || provider === modelProviderFilter;
      const haystack = `${model.name} ${provider} ${model.id} ${model.description}`.toLowerCase();
      return matchesProvider && (!modelQuery || haystack.includes(modelQuery));
    });
    if (els.modelsCount) els.modelsCount.textContent = String(filtered.length);
    els.modelsList.innerHTML = filtered.length ? filtered.map(model => `<button type="button" class="ai-model-row ${model.id === state.model ? "active" : ""}" data-model-id="${escapeAttr(model.id)}">${modelMark(model, "ai-model-row-logo")}<span class="ai-model-row-name"><strong>${escapeHtml(model.name)}</strong><small>${escapeHtml(providerLabel(model.provider))}</small></span><span class="ai-model-row-context">${model.context ? `${Number(model.context).toLocaleString()} ctx` : "—"}</span><span class="ai-model-row-capability">${escapeHtml(model.tag || "MODEL")}</span><span class="ai-model-row-price">${modelPrice(model.inRate)} <i>/</i> ${modelPrice(model.outRate)}</span><span class="ai-model-row-check">${model.id === state.model ? "Selected" : ""}</span></button>`).join("") : `<div class="ai-models-empty">No models match that search.</div>`;
  }

  function renderCoworkState(){
    const active = getActive();
    const enabled = active ? !!active.cowork : !!state.cowork;
    if (els.coworkState) els.coworkState.textContent = enabled ? "ON" : "OFF";
    if (els.coworkToggle) {
      els.coworkToggle.classList.toggle("active", enabled);
      els.coworkToggle.setAttribute("aria-pressed", String(enabled));
      els.coworkToggle.title = enabled ? "Cowork enabled" : "Use multiple models";
    }
  }

  function coworkCandidates(active){
    const selected = findModel(active?.model || state.model);
    const pool = [selected, ...models.filter(model => model.id !== selected.id)];
    return pool.slice(0, Math.min(3, pool.length));
  }

  function setCoworkEnabled(enabled){
    const next = !!enabled;
    state.cowork = next;
    localStorage.setItem(STORAGE_COWORK, String(next));
    const active = getActive();
    if (active) {
      active.cowork = next;
      active.updatedAt = Date.now();
      saveConversations();
    }
    renderCoworkState();
    syncCoworkPopover();
  }

  function toggleCoworkPopover(){
    if (coworkPopoverOpen) {
      closeCoworkPopover();
      return;
    }
    closeModelDropdown();
    coworkPopoverOpen = true;
    const active = getActive();
    const enabled = active ? !!active.cowork : !!state.cowork;
    const names = coworkCandidates(active).map(model => model.name).join(" · ");
    coworkPopoverEl = document.createElement("section");
    coworkPopoverEl.className = "ai-cowork-popover ui-menu";
    coworkPopoverEl.setAttribute("role", "dialog");
    coworkPopoverEl.setAttribute("aria-label", "AI coworkers");
    coworkPopoverEl.innerHTML = `
      <div class="ai-cowork-head">
        <div><span>AI COWORKERS</span><h2>Use coworkers</h2></div>
        <button type="button" class="ai-cowork-close" aria-label="Close coworkers">×</button>
      </div>
      <label class="ai-cowork-check">
        <input id="aiCoworkCheck" type="checkbox" ${enabled ? "checked" : ""}>
        <span><strong>Use coworkers for this prompt</strong><small>Three models draft, then the lead model combines the answers.</small></span>
      </label>
      <div class="ai-cowork-mode"><strong>Top 3 automatically</strong><span>Lead: ${escapeHtml(findModel(active?.model || state.model).name)}</span></div>
      <p class="ai-cowork-models">${escapeHtml(names)}</p>
      <p class="ai-cowork-note">Cowork uses extra requests and may take longer.</p>`;
    coworkPopoverEl.querySelector("#aiCoworkCheck").addEventListener("change", event => setCoworkEnabled(event.target.checked));
    coworkPopoverEl.querySelector(".ai-cowork-close").addEventListener("click", closeCoworkPopover);
    coworkPopoverEl.addEventListener("click", event => event.stopPropagation());
    document.body.appendChild(coworkPopoverEl);
    positionCoworkPopover();
    setTimeout(() => document.addEventListener("click", closeCoworkPopoverOutside), 0);
  }

  function syncCoworkPopover(){
    if (!coworkPopoverEl) return;
    const active = getActive();
    const enabled = active ? !!active.cowork : !!state.cowork;
    const check = coworkPopoverEl.querySelector("#aiCoworkCheck");
    if (check) check.checked = enabled;
  }

  function positionCoworkPopover(){
    if (!coworkPopoverEl || !els.coworkToggle) return;
    const rect = els.coworkToggle.getBoundingClientRect();
    const width = Math.min(396, window.innerWidth - 20);
    const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width));
    const top = Math.max(10, rect.top - coworkPopoverEl.offsetHeight - 10);
    coworkPopoverEl.style.width = `${width}px`;
    coworkPopoverEl.style.left = `${left}px`;
    coworkPopoverEl.style.top = `${top}px`;
  }

  function closeCoworkPopover(){
    coworkPopoverOpen = false;
    coworkPopoverEl?.remove();
    coworkPopoverEl = null;
    document.removeEventListener("click", closeCoworkPopoverOutside);
  }

  function closeCoworkPopoverOutside(event){
    if (!event.target.closest(".ai-cowork-popover") && !event.target.closest("#aiCoworkToggle")) closeCoworkPopover();
  }

  function renderSearchState(){
    const active = getActive();
    const enabled = active ? !!active.search : !!state.search;
    const toggles = [els.searchToggle, modelDropdownEl?.querySelector("[data-search-toggle]")].filter(Boolean);
    toggles.forEach(toggle => { toggle.classList.toggle("active", enabled); toggle.setAttribute("aria-pressed", String(enabled)); });
  }

  function currentEffort(){
    const active = getActive();
    const selectedModel = findModel(active?.model || state.model);
    if (!modelSupportsReasoning(selectedModel)) return "off";
    return EFFORTS.includes(active?.effort) ? active.effort : (EFFORTS.includes(state.effort) ? state.effort : "medium");
  }

  function renderEffortState(){
    if (!els.effortToggle) return;
    const effort = currentEffort();
    const label = effort[0].toUpperCase() + effort.slice(1);
    els.effortToggle.dataset.effort = effort;
    els.effortToggle.setAttribute("aria-label", `Reasoning effort: ${label}`);
    els.effortToggle.title = `Reasoning effort: ${label}`;
    const labelEl = els.effortToggle.querySelector(".ai-effort-value");
    if (labelEl) labelEl.textContent = label;
  }

  function renderImageMode(){
    const enabled = !!state.imageMode;
    if (els.imageToggle) {
      els.imageToggle.classList.toggle("active", enabled);
      els.imageToggle.setAttribute("aria-pressed", String(enabled));
      els.imageToggle.setAttribute("aria-label", enabled ? "Image generation enabled" : "Generate an image");
      els.imageToggle.title = enabled ? "Image generation enabled" : "Generate an image";
    }
    if (els.textarea) {
      els.textarea.placeholder = enabled ? "Describe the image you want..." : "Message BlurGPT...";
      els.textarea.setAttribute("aria-label", enabled ? "Image prompt" : "Message BlurGPT");
    }
  }

  function toggleImageMode(){ state.imageMode = !state.imageMode; renderImageMode(); handleTextareaInput(); }

  function normalizeAttachments(items){
    if (!Array.isArray(items)) return [];
    return items.slice(0, 4).map(item => ({ name: String(item?.name || "Attached file").slice(0, 120), type: String(item?.type || "application/octet-stream").slice(0, 120), kind: item?.kind === "image" ? "image" : "text", size: Number(item?.size) || 0, data: typeof item?.data === "string" ? item.data : "", text: typeof item?.text === "string" ? item.text.slice(0, 80000) : "" })).filter(item => item.data || item.text);
  }

  function normalizeImages(items){
    if (!Array.isArray(items)) return [];
    return items.slice(0, 4).map(item => ({ url: typeof item?.url === "string" ? item.url : "", alt: String(item?.alt || "Generated image").slice(0, 160) })).filter(item => item.url);
  }

  function formatFileSize(size){ const value = Number(size) || 0; return value > 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
  const TEXT_FILE_EXTENSIONS = new Set(["txt", "md", "csv", "json", "js", "ts", "tsx", "jsx", "html", "css", "xml", "yaml", "yml"]);

  async function handleFileSelection(event){
    const incoming = [...(event.target.files || [])];
    event.target.value = "";
    if (!incoming.length) return;
    const available = Math.max(0, 4 - composerFiles.length);
    if (!available) { showNotice("You can attach up to 4 files.", "warning"); return; }
    for (const file of incoming.slice(0, available)) {
      const isImage = file.type.startsWith("image/");
      const maxSize = isImage ? 2 * 1024 * 1024 : 4 * 1024 * 1024;
      if (file.size > maxSize) { showNotice(`${file.name} is larger than ${isImage ? "2" : "4"} MB.`, "warning"); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!isImage && !TEXT_FILE_EXTENSIONS.has(ext)) { showNotice(`${file.name} is not a supported attachment.`, "warning"); continue; }
      try {
        if (isImage) {
          const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = reject; reader.readAsDataURL(file); });
          composerFiles.push({ name: file.name, type: file.type, size: file.size, kind: "image", data });
        } else {
          const text = (await file.text()).slice(0, 80000);
          composerFiles.push({ name: file.name, type: file.type || "text/plain", size: file.size, kind: "text", text });
        }
      } catch { showNotice(`Could not read ${file.name}.`, "warning"); }
    }
    renderAttachmentTray();
    handleTextareaInput();
  }

  function renderAttachmentTray(){
    if (!els.attachmentTray) return;
    els.attachmentTray.hidden = !composerFiles.length;
    els.attachmentTray.innerHTML = composerFiles.map((file, index) => `<span class="ai-attachment-chip">${file.kind === "image" ? `<img src="${escapeAttr(file.data)}" alt="" class="ai-attachment-thumb">` : icon('<path d="M6 3h8l4 4v14H6zM14 3v5h5"/>')}<span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(formatFileSize(file.size))}</small></span><button type="button" data-remove-ai-file="${index}" aria-label="Remove ${escapeAttr(file.name)}">×</button></span>`).join("");
  }

  function messagePayload(message){
    const attachments = normalizeAttachments(message.attachments);
    if (!attachments.length) return { role: message.role, content: message.content };
    const parts = [{ type: "text", text: message.content || "Please analyze the attached file(s)." }];
    attachments.forEach(file => { if (file.kind === "image" && file.data) parts.push({ type: "image_url", image_url: { url: file.data } }); else if (file.text) parts.push({ type: "text", text: `Attached file: ${file.name}\n${file.text}` }); });
    return { role: message.role, content: parts };
  }

  function setEffort(value){
    if (!EFFORTS.includes(value)) return;
    const active = getActive();
    const selectedModel = findModel(active?.model || state.model);
    if (!modelSupportsReasoning(selectedModel) && value !== "off") return;
    state.effort = value;
    localStorage.setItem(STORAGE_EFFORT, value);
    if (active) { active.effort = value; active.updatedAt = Date.now(); saveConversations(); renderSidebar(); }
    renderEffortState();
    closeEffortPopover();
  }

  function toggleEffortPopover(){
    if (effortPopoverOpen) { closeEffortPopover(); return; }
    closeModelDropdown();
    effortPopoverOpen = true;
    effortPopoverEl = document.createElement("div");
    effortPopoverEl.className = "ai-effort-popover ui-menu";
    effortPopoverEl.setAttribute("role", "menu");
    effortPopoverEl.setAttribute("aria-label", "Reasoning effort");
    const selected = currentEffort();
    effortPopoverEl.innerHTML = `<div class="ai-effort-heading ui-menu__header">Reasoning effort</div>${EFFORTS.map(value => `<button type="button" role="menuitemradio" aria-checked="${value === selected}" class="ui-menu__item${value === selected ? " active" : ""}" data-effort="${value}"><span class="ai-effort-dot" aria-hidden="true"></span><span><strong>${value[0].toUpperCase() + value.slice(1)}</strong><small>${value === "low" ? "Faster responses" : value === "high" ? "More deliberate answers" : "Balanced responses"}</small></span></button>`).join("")}`;
    effortPopoverEl.addEventListener("click", event => { event.stopPropagation(); const option = event.target.closest("[data-effort]"); if (option) setEffort(option.dataset.effort); });
    document.body.appendChild(effortPopoverEl);
    positionEffortPopover();
    setTimeout(() => document.addEventListener("click", closeEffortPopoverOutside), 0);
  }

  function positionEffortPopover(){
    if (!effortPopoverEl || !els.effortToggle) return;
    const rect = els.effortToggle.getBoundingClientRect();
    const width = Math.min(230, window.innerWidth - 16);
    const height = effortPopoverEl.offsetHeight || 180;
    const top = rect.top - height - 8;
    effortPopoverEl.style.width = `${width}px`;
    effortPopoverEl.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))}px`;
    effortPopoverEl.style.top = `${top >= 8 ? top : Math.min(window.innerHeight - height - 8, rect.bottom + 8)}px`;
  }

  function closeEffortPopover(){ effortPopoverOpen = false; effortPopoverEl?.remove(); effortPopoverEl = null; document.removeEventListener("click", closeEffortPopoverOutside); }
  function closeEffortPopoverOutside(event){ if (!event.target.closest(".ai-effort-popover") && !event.target.closest("#aiEffortToggle")) closeEffortPopover(); }

  function renderSidebar(){
    if (!els.sidebarList) return;
    const query = String(els.sidebarSearch?.value || "").trim().toLowerCase();
    const sorted = state.conversations.filter(convo => !convo.temporary && convo.messages?.length).slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const filtered = query ? sorted.filter(convo => conversationTitle(convo).toLowerCase().includes(query)) : sorted;
    if (els.chatCount) els.chatCount.textContent = String(filtered.length);
    els.sidebarList.innerHTML = filtered.length ? filtered.map(convo => `<button type="button" class="ai-sidebar-item ${convo.id === state.activeId ? "active" : ""}" data-conversation-id="${escapeAttr(convo.id)}"><span class="ai-sidebar-item-copy"><strong>${escapeHtml(conversationTitle(convo))}</strong><small>${convo.messages.length ? `${convo.messages.length} message${convo.messages.length === 1 ? "" : "s"}` : "Empty chat"}</small></span><span class="ai-sidebar-item-del" role="button" tabindex="0" data-delete-conversation="${escapeAttr(convo.id)}" aria-label="Delete chat">×</span></button>`).join("") : `<div class="ai-sidebar-empty"><span>${query ? "No chats match your search." : "No chats yet."}</span><small>Start a new chat above.</small></div>`;
  }

  function renderActiveConversation(){
    if (!els.messages) return;
    const active = getActive();
    els.messages.innerHTML = "";
    if (!active || !active.messages.length) { if (els.chatTitle) els.chatTitle.textContent = "New chat"; renderEmptyState(); return; }
    if (els.chatTitle) els.chatTitle.textContent = conversationTitle(active);
    const fragment = document.createDocumentFragment();
    active.messages.forEach(message => fragment.appendChild(buildMessageEl(message)));
    els.messages.appendChild(fragment);
    scrollMessagesToBottom();
  }

  function renderTemporaryState(){
    const active = getActive();
    const temporary = !!active?.temporary;
    if (!els.temporaryToggle) return;
    els.temporaryToggle.classList.toggle("active", temporary);
    els.temporaryToggle.setAttribute("aria-pressed", String(temporary));
    els.temporaryToggle.title = temporary ? "This chat will not be saved" : "Don't save this chat";
    if (els.temporaryNote) els.temporaryNote.hidden = !temporary;
  }

  function renderEmptyState(){
    const wrap = document.createElement("div");
    wrap.className = "ai-empty";
    wrap.innerHTML = `<h2>What can I help you make?</h2><p>A focused workspace for questions, ideas, and projects.</p>`;
    els.messages.appendChild(wrap);
  }

  function inlineMarkdown(value, { hideLinks = false } = {}){
    let raw = String(value || "");
    if (hideLinks) {
      raw = raw.replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/gi, "$1").replace(/https?:\/\/[^\s<>)]+/gi, "").replace(/\s*\[(?:\d{1,2}|source|citation)\]\s*/gi, " ").replace(/\s*【[^】]+】\s*/g, " ");
    }
    let text = escapeHtml(raw);
    const links = [];
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => { links.push(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`); return `@@AI_LINK_${links.length - 1}@@`; });
    text = text.replace(/(https?:\/\/[^\s<]+)/g, url => { links.push(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`); return `@@AI_LINK_${links.length - 1}@@`; });
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_\n]+)__/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/_([^_\n]+)_/g, "<em>$1</em>");
    return text.replace(/@@AI_LINK_(\d+)@@/g, (_, index) => links[Number(index)] || "");
  }

  function markdownHtml(value, options = {}){
    const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    const html = []; let code = false; let codeLines = []; let listType = null;
    const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = null; } };
    lines.forEach(line => {
      if (/^\s*```/.test(line)) { if (code) { html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`); codeLines = []; } code = !code; closeList(); return; }
      if (code) { codeLines.push(line); return; }
      if (!line.trim()) { closeList(); return; }
      const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*#*\s*$/);
      if (heading) { closeList(); const level = heading[1].length; html.push(`<h${level}>${inlineMarkdown(heading[2], options)}</h${level}>`); return; }
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      if (bullet) { if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; } html.push(`<li>${inlineMarkdown(bullet[1], options)}</li>`); return; }
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (ordered) { if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; } html.push(`<li>${inlineMarkdown(ordered[1], options)}</li>`); return; }
      if (/^\s*>\s?/.test(line)) { closeList(); html.push(`<blockquote>${inlineMarkdown(line.replace(/^\s*>\s?/, ""), options)}</blockquote>`); return; }
      closeList(); html.push(`<p>${inlineMarkdown(line, options)}</p>`);
    });
    if (code) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    closeList(); return html.join("");
  }

  async function copyMessageText(message){
    const text = String(message?.content || "");
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const fallback = document.createElement("textarea");
        fallback.value = text;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.appendChild(fallback);
        try {
          fallback.select();
          if (!document.execCommand("copy")) throw new Error("copy failed");
        } finally {
          fallback.remove();
        }
      }
      showNotice("Message copied.");
    } catch {
      showNotice("Couldn’t copy that message.", "warning");
    }
  }

  function beginEditMessage(message){
    if (!message || message.role !== "user" || isSending) return;
    editingMessage = message;
    els.textarea.value = message.content || "";
    composerFiles = normalizeAttachments(message.attachments);
    renderAttachmentTray();
    handleTextareaInput();
    els.textarea.focus();
    els.textarea.setSelectionRange(els.textarea.value.length, els.textarea.value.length);
    showNotice("Editing message — send to regenerate.");
  }

  function setMessageFeedback(message, value, wrap){
    if (!message || message.role === "user") return;
    message.feedback = message.feedback === value ? null : value;
    const active = getActive();
    if (active) { active.updatedAt = Date.now(); saveConversations(); }
    wrap?.querySelectorAll('[data-ai-action="feedback-up"],[data-ai-action="feedback-down"]').forEach(button => {
      const selected = (button.dataset.aiAction === "feedback-up" && message.feedback === "up") || (button.dataset.aiAction === "feedback-down" && message.feedback === "down");
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  async function retryAssistantMessage(message){
    if (!message || message.role === "user" || isSending) return;
    const active = getActive();
    const index = active?.messages?.indexOf(message) ?? -1;
    if (!active || index < 1) return;
    const previous = active.messages[index - 1];
    if (!previous || previous.role !== "user") return;
    active.messages = active.messages.slice(0, index);
    active.updatedAt = Date.now();
    saveConversations();
    renderAll();
    isSending = true;
    handleTextareaInput();
    if (els.composerHint) els.composerHint.textContent = "Thinking…";
    try { await completeConversation(active); }
    catch (error) { if (error?.name !== "AbortError") appendError(error?.message || "Couldn’t reach BlurGPT right now."); }
    finally { isSending = false; handleTextareaInput(); updateConnectionState(); updateUsage(); }
  }

  function messageActionButtons(message){
    const copyLabel = message.role === "user" ? "Copy your message" : "Copy AI message";
    const assistantActions = message.role !== "user" ? `<button type="button" class="ai-msg-action" data-ai-action="retry" aria-label="Regenerate answer" title="Regenerate answer">${icon('<path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/>')}</button><button type="button" class="ai-msg-action ${message.feedback === "up" ? "active" : ""}" data-ai-action="feedback-up" aria-label="Good answer" aria-pressed="${message.feedback === "up"}" title="Good answer">${icon('<path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/>')}</button><button type="button" class="ai-msg-action ${message.feedback === "down" ? "active" : ""}" data-ai-action="feedback-down" aria-label="Bad answer" aria-pressed="${message.feedback === "down"}" title="Bad answer">${icon('<path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/>')}</button>` : "";
    return `<div class="ai-msg-actions"><button type="button" class="ai-msg-action" data-ai-action="copy" aria-label="${copyLabel}" title="${copyLabel}">${icon('<rect x="8" y="8" width="11" height="11" rx="1"/><path d="M5 15V5h10"/>')}</button>${message.role === "user" ? `<button type="button" class="ai-msg-action" data-ai-action="edit" aria-label="Edit message" title="Edit message">${icon('<path d="m4 16.5-.7 3.2 3.2-.7L18.2 7.3l-2.5-2.5L4 16.5Z"/><path d="m14.5 6 2.5 2.5"/>')}</button>` : assistantActions}</div>`;
  }

  function renderSourcesHtml(sources){
    const items = mergeSources([], sources);
    if (!items.length) return "";
    const avatars = items.slice(0, 4).map(source => `<span class="ai-source-avatar" aria-hidden="true">${escapeHtml(source.domain.slice(0, 1).toUpperCase())}</span>`).join("");
    const label = `${items.length} source${items.length === 1 ? "" : "s"}`;
    return `<div class="ai-msg-sources"><button type="button" class="ai-sources-toggle" data-ai-sources-toggle aria-expanded="false"><span class="ai-source-stack">${avatars}</span><span>${label}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="ai-sources-list" data-expanded="false">${items.map(source => `<a href="${escapeAttr(source.href)}" target="_blank" rel="noopener noreferrer" class="ai-source-row"><span class="ai-source-avatar" aria-hidden="true">${escapeHtml(source.domain.slice(0, 1).toUpperCase())}</span><span class="ai-source-copy"><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.domain)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>`).join("")}</div></div>`;
  }

  function bindSourcesToggle(root){
    const toggle = root?.querySelector("[data-ai-sources-toggle]");
    const list = root?.querySelector(".ai-sources-list");
    if (!toggle || !list || toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      const expanded = list.dataset.expanded !== "true";
      list.dataset.expanded = String(expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      root.classList.toggle("sources-open", expanded);
    });
  }

  function updateMessageSources(messageEl, sources){
    const existing = messageEl?.querySelector(".ai-msg-sources");
    const html = renderSourcesHtml(sources);
    if (existing) existing.remove();
    if (html) messageEl?.querySelector(".ai-msg-actions")?.insertAdjacentHTML("beforebegin", html);
    bindSourcesToggle(messageEl);
  }

  function buildMessageEl(message, streaming = false){
    const wrap = document.createElement("article");
    wrap.className = `ai-msg ${message.role === "user" ? "user" : "assistant"}`;
    const assistant = message.role !== "user";
    const hideLinks = assistant && (message.searched === true || (Array.isArray(message.sources) && message.sources.length > 0));
    const body = message.role === "assistant" && !streaming ? markdownHtml(message.content, { hideLinks }) : escapeHtml(message.content).replace(/\n/g, "<br>");
    const streamCursor = streaming && assistant ? '<span class="ai-stream-cursor" aria-hidden="true"></span>' : "";
    const model = assistant ? (message.model === IMAGE_MODEL ? { name: "Seedream 5", provider: "BlurGPT" } : findModel(message.model || state.model)) : null;
    const thinking = assistant && message.thinking ? renderPersistedThinking(message.thinking) : "";
    const sources = assistant ? renderSourcesHtml(message.sources) : "";
    wrap.innerHTML = `<div class="ai-msg-head">${assistant ? `${modelMark(model, "ai-message-logo")}<span>${escapeHtml(model.name || "BlurGPT")}</span>` : ""}<time>${escapeHtml(formatTime(message.ts))}</time></div>${thinking}<div class="ai-msg-main"><div class="ai-msg-content">${body}${streamCursor}</div>${renderAttachmentHtml(message.attachments)}${renderGeneratedImages(message.images)}</div>${sources}${messageActionButtons(message)}`;
    bindThinkingToggle(wrap);
    bindSourcesToggle(wrap);
    wrap.querySelector('[data-ai-action="copy"]')?.addEventListener("click", event => { event.stopPropagation(); copyMessageText(message); });
    wrap.querySelector('[data-ai-action="edit"]')?.addEventListener("click", event => { event.stopPropagation(); beginEditMessage(message); });
    wrap.querySelector('[data-ai-action="retry"]')?.addEventListener("click", event => { event.stopPropagation(); retryAssistantMessage(message); });
    wrap.querySelector('[data-ai-action="feedback-up"]')?.addEventListener("click", event => { event.stopPropagation(); setMessageFeedback(message, "up", wrap); });
    wrap.querySelector('[data-ai-action="feedback-down"]')?.addEventListener("click", event => { event.stopPropagation(); setMessageFeedback(message, "down", wrap); });
    return wrap;
  }

  function renderAttachmentHtml(items){
    const attachments = normalizeAttachments(items);
    if (!attachments.length) return "";
    return `<div class="ai-msg-attachments">${attachments.map(file => file.kind === "image" ? `<img class="ai-msg-attachment-image" src="${escapeAttr(file.data)}" alt="${escapeAttr(file.name)}" loading="lazy">` : `<span class="ai-msg-attachment-file">${icon('<path d="M6 3h8l4 4v14H6zM14 3v5h5"/>')}<span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(formatFileSize(file.size))}</small></span></span>`).join("")}</div>`;
  }

  function renderGeneratedImages(items){
    const images = normalizeImages(items);
    if (!images.length) return "";
    return `<div class="ai-generated-images">${images.map(image => `<img class="ai-generated-image" src="${escapeAttr(image.url)}" alt="${escapeAttr(image.alt)}" loading="lazy">`).join("")}</div>`;
  }

  function nextStreamingChunk(value){
    const text = String(value || "");
    if (!text) return "";
    const word = text.match(/^\s*\S+(?:\s+|$)/);
    return word?.[0] || text.slice(0, Math.min(2, text.length));
  }

  function appendStreamingChunk(target, chunk){
    if (!target || !chunk) return;
    const cursor = target.querySelector(".ai-stream-cursor");
    const insertText = value => { if (!value) return; if (cursor) cursor.before(document.createTextNode(value)); else target.insertAdjacentText("beforeend", value); };
    const insertNode = node => { if (cursor) cursor.before(node); else target.appendChild(node); };
    const match = String(chunk).match(/^(\s*)(\S+)([\s\S]*)$/);
    if (!match) { insertText(chunk); return; }
    if (match[1]) insertText(match[1]);
    const word = document.createElement("span");
    word.className = "ai-stream-word";
    word.textContent = match[2];
    insertNode(word);
    if (match[3]) insertText(match[3]);
  }

  function formatThinkingElapsed(ms){
    const total = Math.max(0, ms) / 1000;
    if (total < 60) return `${total.toFixed(1)}s`;
    return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
  }

  function removeTyping(typingEl){
    if (!typingEl) return;
    if (typingEl._thinkingTimer) clearInterval(typingEl._thinkingTimer);
    typingEl._thinkingTimer = null;
    typingEl.remove();
  }

  function thinkingTraceRows(active){
    const rows = [
      { primary: "Reading the conversation" },
      { primary: "Choosing an approach" },
    ];
    if (active?.search) rows.push({ primary: "Searching the web", secondary: "web search enabled" });
    if (active?.cowork) rows.push({ primary: "Comparing coworker drafts" });
    rows.push({ primary: "Writing the response" });
    return rows;
  }

  function thinkingTraceRowsMarkup(rows){
    return rows.map(row => `<div class="ai-thinking-trace-row is-complete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span class="ai-thinking-trace-primary">${escapeHtml(row.primary)}</span>${row.secondary ? `<span class="ai-thinking-trace-secondary">${escapeHtml(row.secondary)}</span>` : ""}</div>`).join("");
  }

  function bindThinkingToggle(root){
    const toggle = root?.querySelector(".ai-thinking-toggle");
    const trace = root?.querySelector(".ai-thinking-trace");
    if (!toggle || !trace || toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      const expanded = trace.dataset.expanded !== "true";
      trace.dataset.expanded = String(expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      root.classList.toggle("is-collapsed", !expanded);
      if (expanded) setTimeout(() => root.scrollIntoView({ block: "nearest", behavior: "smooth" }), 40);
    });
  }

  function renderPersistedThinking(trace){
    const rows = Array.isArray(trace?.rows) ? trace.rows.filter(row => row && typeof row.primary === "string") : [];
    if (!rows.length) return "";
    const duration = Number.isFinite(Number(trace.durationMs)) ? formatThinkingElapsed(Number(trace.durationMs)) : "";
    const delays = [90, 180, 270, 90, 90, 180, 90, 180, 270];
    const pixels = delays.map(delay => `<span class="ai-thinking-pixel" style="--ai-thinking-delay:${delay}ms"></span>`).join("");
    return `<div class="ai-thinking-panel ai-thinking-persisted"><button type="button" class="ai-thinking-toggle" aria-expanded="true"><span class="ai-thinking-icon is-settled"><span class="ai-thinking-grid" aria-hidden="true">${pixels}</span></span><span class="ai-thinking-label is-settled">Thought for ${escapeHtml(duration)}</span><span class="ai-thinking-elapsed"></span><svg class="ai-thinking-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="ai-thinking-trace" data-expanded="true"><div class="ai-thinking-trace-line" aria-hidden="true"></div><div class="ai-thinking-trace-list">${thinkingTraceRowsMarkup(rows)}</div></div></div>`;
  }

  function renderThinkingTrace(typingEl, settled = false){
    const rows = typingEl?._thinkingRows || [];
    const stage = settled ? rows.length : Math.min(rows.length - 1, typingEl?._thinkingStage || 0);
    const elapsed = typingEl?.querySelector(".ai-thinking-elapsed");
    const list = typingEl?.querySelector(".ai-thinking-trace-list");
    if (elapsed && typingEl._thinkingStartedAt) elapsed.textContent = settled ? "" : formatThinkingElapsed(performance.now() - typingEl._thinkingStartedAt);
    if (!list) return;
    list.innerHTML = rows.map((row, index) => {
      const complete = settled || index < stage;
      const active = !settled && index === stage;
      const glyph = complete
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
        : active
          ? '<span class="ai-thinking-row-spinner" aria-hidden="true"></span>'
          : '<span class="ai-thinking-row-dot" aria-hidden="true"></span>';
      return `<div class="ai-thinking-trace-row${active ? " is-active" : ""}${complete ? " is-complete" : ""}">${glyph}<span class="ai-thinking-trace-primary">${escapeHtml(row.primary)}</span>${row.secondary ? `<span class="ai-thinking-trace-secondary">${escapeHtml(row.secondary)}</span>` : ""}</div>`;
    }).join("");
  }

  function settleTyping(typingEl){
    if (!typingEl || typingEl.dataset.settled === "true") return;
    typingEl.dataset.settled = "true";
    typingEl._thinkingSettledAt = performance.now();
    if (typingEl._thinkingTimer) clearInterval(typingEl._thinkingTimer);
    typingEl._thinkingTimer = null;
    const elapsed = typingEl.querySelector(".ai-thinking-elapsed");
    if (elapsed) elapsed.textContent = "";
    typingEl.querySelector(".ai-thinking-label")?.replaceChildren(document.createTextNode(`Thought for ${formatThinkingElapsed(typingEl._thinkingSettledAt - typingEl._thinkingStartedAt)}`));
    typingEl.querySelector(".ai-thinking-label")?.classList.add("is-settled");
    typingEl.querySelector(".ai-thinking-icon")?.classList.add("is-settled");
    typingEl.querySelector(".ai-thinking-chevron")?.setAttribute("aria-label", "Expand thinking trace");
    renderThinkingTrace(typingEl, true);
    return { rows: typingEl._thinkingRows || [], durationMs: typingEl._thinkingSettledAt - typingEl._thinkingStartedAt };
  }

  function appendTyping(active){
    const wrap = document.createElement("article");
    wrap.className = "ai-msg assistant ai-typing-row";
    const model = findModel(active?.model || getActive()?.model || state.model);
    const delays = [90, 180, 270, 90, 90, 180, 90, 180, 270];
    const pixels = delays.map(delay => `<span class="ai-thinking-pixel" style="--ai-thinking-delay:${delay}ms"></span>`).join("");
    wrap._thinkingRows = thinkingTraceRows(active);
    wrap._thinkingStartedAt = performance.now();
    wrap._thinkingStage = 0;
    wrap.innerHTML = `<div class="ai-msg-head">${modelMark(model, "ai-message-logo")}<span>${escapeHtml(model.name || "BlurGPT")}</span></div><div class="ai-thinking-panel"><button type="button" class="ai-thinking-toggle" aria-expanded="true"><span class="ai-thinking-icon"><span class="ai-thinking-grid" aria-hidden="true">${pixels}</span></span><span class="ai-thinking-label">Thinking</span><span class="ai-thinking-elapsed">0.0s</span><svg class="ai-thinking-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="ai-thinking-trace" data-expanded="true"><div class="ai-thinking-trace-line" aria-hidden="true"></div><div class="ai-thinking-trace-list"></div></div></div>`;
    renderThinkingTrace(wrap);
    const elapsed = wrap.querySelector(".ai-thinking-elapsed");
    bindThinkingToggle(wrap);
    wrap._thinkingTimer = setInterval(() => {
      if (!wrap.isConnected) { clearInterval(wrap._thinkingTimer); wrap._thinkingTimer = null; return; }
      if (wrap.dataset.settled === "true") return;
      const elapsedMs = performance.now() - wrap._thinkingStartedAt;
      if (elapsed) elapsed.textContent = formatThinkingElapsed(elapsedMs);
      const nextStage = Math.min(wrap._thinkingRows.length - 1, Math.floor(elapsedMs / 900));
      if (nextStage !== wrap._thinkingStage) { wrap._thinkingStage = nextStage; renderThinkingTrace(wrap); }
    }, 100);
    els.messages.appendChild(wrap);
    scrollMessagesToBottom();
    requestAnimationFrame(() => { if (wrap.isConnected) wrap.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
    return wrap;
  }
  function appendError(message){ const wrap = document.createElement("article"); wrap.className = "ai-error-message"; wrap.innerHTML = `<span>${escapeHtml(message)}</span><button type="button">Retry</button>`; wrap.querySelector("button").addEventListener("click", () => { wrap.remove(); retryLastMessage(); }); els.messages.appendChild(wrap); scrollMessagesToBottom(); }
  function scrollMessagesToBottom(){ if (scrollFrame || !els.messages) return; scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; if (els.messages) els.messages.scrollTop = els.messages.scrollHeight; }); }
  function handleTextareaInput(){ if (!els.textarea) return; els.textarea.style.height = "auto"; els.textarea.style.height = `${Math.min(180, Math.max(24, els.textarea.scrollHeight))}px`; els.sendBtn.disabled = ((!els.textarea.value.trim() && !composerFiles.length) || (state.imageMode && !els.textarea.value.trim()) || isSending); }
  function handleTextareaKeydown(event){ if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }
  function stopCurrentRequest(){ if (currentController) { currentController.abort(); currentController = null; } }

  function createConversation(focus = false, temporary = false){
    stopCurrentRequest();
    editingMessage = null;
    state.conversations = state.conversations.filter(convo => convo.messages?.length);
    const convo = { id: uid(), model: state.model, cowork: state.cowork, search: state.search, effort: state.effort, temporary, messages: [], updatedAt: Date.now() };
    state.conversations.unshift(convo);
    state.activeId = convo.id;
    renderAll();
    if (focus) setTimeout(() => els.textarea.focus(), 80);
  }
  function startNewConversation(focus = false){
    const active = getActive();
    if (active && !active.messages?.length) {
      stopCurrentRequest();
      editingMessage = null;
      renderAll();
      if (focus) setTimeout(() => els.textarea.focus(), 80);
      return;
    }
    createConversation(focus);
  }
  function toggleTemporaryChat(){
    let active = getActive();
    if (!active) { createConversation(false, true); return; }
    if (!active) return;
    active.temporary = !active.temporary;
    active.updatedAt = Date.now();
    saveConversations();
    renderAll();
  }
  function selectConversation(id){ const convo = state.conversations.find(item => item.id === id); if (!convo) return; stopCurrentRequest(); editingMessage = null; state.activeId = id; state.conversations = state.conversations.filter(item => item.messages?.length || item.id === id); state.effort = EFFORTS.includes(convo.effort) ? convo.effort : state.effort; els.app.classList.remove("sidebar-open"); renderAll(); setTimeout(() => els.textarea.focus(), 80); }
  function deleteConversation(id){ if (state.activeId === id) { stopCurrentRequest(); editingMessage = null; } state.conversations = state.conversations.filter(convo => convo.id !== id); if (state.activeId === id) state.activeId = state.conversations[0]?.id || null; saveConversations(); renderAll(); }
  function clearActiveConversation(){ const active = getActive(); if (!active) return; stopCurrentRequest(); editingMessage = null; active.messages = []; active.updatedAt = Date.now(); saveConversations(); renderAll(); }

  function showNotice(message, kind = ""){ if (!els.notice) return; clearTimeout(noticeTimer); els.notice.textContent = message; els.notice.className = `ai-composer-notice ${kind}`; els.notice.hidden = false; noticeTimer = setTimeout(() => { if (els.notice) els.notice.hidden = true; }, 4500); }

  async function readErrorResponse(response){ let body = ""; try { body = await response.text(); } catch { /* noop */ } try { const parsed = JSON.parse(body); return parsed?.error?.message || parsed?.message || `Request failed (${response.status})`; } catch { return body.slice(0, 240) || `Request failed (${response.status})`; } }

  async function craxFetch(path, init = {}){
    const headers = new Headers(init.headers || {});
    headers.set("Accept", "application/json, text/event-stream");
    if (USE_PROXY) {
      if (window.SUPABASE_ANON_KEY) headers.set("apikey", window.SUPABASE_ANON_KEY);
      try {
        const session = await window.sb?.auth?.getSession?.();
        const token = session?.data?.session?.access_token;
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch { /* the function will return a clear auth error */ }
    } else if (CRAX_API_KEY) {
      headers.set("Authorization", `Bearer ${CRAX_API_KEY}`);
    }
    try {
      const response = await fetch(`${CRAX_API}${path}`, { ...init, headers, mode: "cors", referrerPolicy: "no-referrer" });
      if (USE_PROXY && (response.headers.get("content-type") || "").includes("text/html")) throw new Error("The AI proxy is not deployed yet.");
      return response;
    } catch (error) {
      if (error?.name === "TypeError") throw new Error("The BlurGPT service could not be reached from this browser. Check the connection or network.");
      throw error;
    }
  }

  // Shared entry point for surfaces that want a BlurGPT answer without
  // recreating the AI client. Chat uses this for shared channel prompts;
  // model selection, proxy/auth handling, and the shared daily quota all stay
  // in one place.
  async function askFromChat(prompt, options = {}){
    const text = String(prompt || "").trim();
    if (!text) throw new Error("Ask BlurGPT a question first.");
    if (!SERVICE_CONFIGURED) throw new Error("BlurGPT is not configured right now.");
    if (!serviceReady) {
      const refreshed = await refreshModels({ silent: true });
      if (!refreshed) throw new Error("BlurGPT is unavailable right now.");
    }
    loadDailyUsage();
    const limit = dailyLimit();
    if (state.dailyCount >= limit) {
      const error = new Error(`You’ve reached the ${limit}-message daily limit. It resets tomorrow.`);
      error.code = "DAILY_LIMIT";
      throw error;
    }
    const selected = findModel(options.model || state.model);
    const history = Array.isArray(options.history)
      ? options.history
        .filter(message => ["user", "assistant"].includes(message?.role) && String(message?.content || "").trim())
        .map(message => ({ role: message.role, content: String(message.content).trim() }))
        .slice(-16)
      : [];
    const messages = [
      { role: "system", content: "You are BlurGPT, the helpful AI inside Blur Chat. Answer the user's question directly and clearly. Keep the response useful for a shared chat channel and do not address or ping other users." },
      ...history,
      { role: "user", content: text }
    ];
    consumeDailyMessage();
    const response = await craxFetch("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody({ model: selected.id, messages, stream: false, temperature: 0.7 })),
    });
    if (!response.ok) throw new Error(await readErrorResponse(response));
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("BlurGPT returned an empty answer.");
    return { content: content.trim(), model: selected.id, remaining: Math.max(0, limit - state.dailyCount) };
  }

  async function readSse(response, onDelta, onSources){
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    const consume = (text, flush = false) => {
      buffer += text;
      const lines = buffer.split(/\r?\n/);
      buffer = flush ? "" : (lines.pop() || "");
      lines.forEach(line => {
        const value = line.trim();
        if (!value.startsWith("data:")) return;
        // Some Crax-routed Anthropic responses arrive as `data: data: {...}`.
        // Normalize that wire variation before decoding the event payload.
        const payload = value.slice(5).trim().replace(/^(?:data:\s*)+/i, "");
        if (!payload || payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.error) throw new Error(parsed.error.message || "The model returned an error.");
          const delta = parsed?.choices?.[0]?.delta?.content
            ?? (parsed?.type === "content_block_delta" ? parsed?.delta?.text : "")
            ?? (parsed?.type === "content_block_start" ? parsed?.content_block?.text : "")
            ?? parsed?.delta?.text
            ?? parsed?.content?.[0]?.text;
          const sources = extractSources(parsed);
          if (sources.length) onSources?.(sources);
          if (typeof delta === "string") onDelta(delta, sources);
        } catch (error) {
          if (error instanceof SyntaxError) return;
          throw error;
        }
      });
    };
    while (true) { const { value, done } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); }
    consume(decoder.decode(), true);
  }

  function coworkPromptMessages(active, model){
    const messages = active.messages.map(messagePayload);
    messages.unshift({ role: "system", content: `You are a specialist coworker inside BlurGPT. Draft a useful candidate answer for the user's request. Be concrete and concise; another lead model will combine your work. You are model ${model.name}.` });
    if (active.search) messages.unshift({ role: "system", content: "Use web search when it improves accuracy or freshness. Distinguish sourced facts from your own reasoning." });
    return messages;
  }

  async function requestCoworkCandidate(model, messages, controller, searchEnabled){
    const response = await craxFetch("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody({ model: model.id, messages, stream: false, temperature: 0.7, web_search: !!searchEnabled })),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(await readErrorResponse(response));
    const data = await response.json();
    const reply = responseText(data);
    if (typeof reply !== "string" || !reply.trim()) throw new Error("A coworker returned an empty answer.");
    return reply.trim();
  }

  async function requestCoworkReply(active, typingEl){
    const controller = new AbortController();
    currentController = controller;
    const selected = findModel(active.model || state.model);
    const candidates = coworkCandidates(active);
    let assistant = null;
    let assistantEl = null;
    let content = "";
    let visible = "";
    let queue = "";
    let typeTimer = null;
    let resolveTyping = null;
    let responseSources = [];
    const pump = () => {
      if (!assistant) return;
      if (queue) {
        const chunk = nextStreamingChunk(queue);
        visible += chunk;
        queue = queue.slice(chunk.length);
        assistant.content = visible;
        const contentEl = assistantEl?.querySelector(".ai-msg-content");
        if (contentEl) appendStreamingChunk(contentEl, chunk);
        scrollMessagesToBottom();
        typeTimer = setTimeout(pump, 10);
      } else {
        typeTimer = null;
        if (resolveTyping) {
          const resolve = resolveTyping;
          resolveTyping = null;
          resolve();
        }
      }
    };
    const waitForTyping = () => new Promise(resolve => { if (!queue) resolve(); else resolveTyping = resolve; });
    const onDelta = (delta, sources = []) => {
      if (state.activeId !== active.id) return;
      responseSources = mergeSources(responseSources, sources);
      if (assistant) { assistant.sources = responseSources; updateMessageSources(assistantEl, responseSources); }
      if (!assistant) {
        const thinking = settleTyping(typingEl);
        removeTyping(typingEl);
        assistant = { role: "assistant", model: selected.id, content: "", thinking, sources: responseSources, searched: !!active.search, ts: Date.now() };
        active.messages.push(assistant);
        assistantEl = buildMessageEl(assistant, true);
        els.messages.appendChild(assistantEl);
      }
      content += delta;
      queue += delta;
      if (!typeTimer) pump();
    };
    try {
      const results = await Promise.allSettled(candidates.map(model => requestCoworkCandidate(model, coworkPromptMessages(active, model), controller, active.search)));
      const answers = results.filter(result => result.status === "fulfilled").map(result => result.value);
      if (!answers.length) throw results.find(result => result.status === "rejected")?.reason || new Error("Coworkers could not answer.");
      const original = active.messages.slice().reverse().find(message => message.role === "user")?.content || "";
      const candidateText = answers.map((answer, index) => `Candidate ${index + 1}:\n${answer}`).join("\n\n");
      const synthesisMessages = [
        { role: "system", content: "You are the lead BlurGPT model. Combine the candidate answers into one accurate, polished response to the user. Resolve conflicts, remove repetition, and return only the final answer." },
        { role: "user", content: `Original request:\n${original}\n\nCandidate answers:\n${candidateText}` }
      ];
      if (active.search) synthesisMessages.unshift({ role: "system", content: "Use web search when it improves accuracy or freshness, and include useful sources when available." });
      const stream = modelUsesStream(selected);
      const response = await craxFetch("/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody({ model: selected.id, messages: synthesisMessages, stream, temperature: 0.55, web_search: !!active.search })),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(await readErrorResponse(response));
      if (stream && response.body?.getReader) await readSse(response, onDelta, sources => { responseSources = mergeSources(responseSources, sources); if (assistant) { assistant.sources = responseSources; updateMessageSources(assistantEl, responseSources); } });
      else {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || data?.content?.[0]?.text;
        if (typeof reply === "string") onDelta(reply, extractSources(data, reply));
      }
      await waitForTyping();
    } catch (error) {
      error.aiPartial = { assistant, assistantEl };
      throw error;
    } finally {
      if (typeTimer) clearTimeout(typeTimer);
      typeTimer = null;
      if (currentController === controller) currentController = null;
    }
    if (!content.trim()) throw new Error("The cowork lead returned an empty reply.");
    if (state.activeId === active.id && assistant) {
      assistant.content = content.trim();
      responseSources = mergeSources(responseSources, extractSources(null, assistant.content));
      assistant.sources = responseSources;
      updateMessageSources(assistantEl, responseSources);
      assistantEl.querySelector(".ai-msg-content").innerHTML = markdownHtml(assistant.content, { hideLinks: assistant.searched === true || assistant.sources?.length > 0 });
      active.updatedAt = Date.now();
      saveConversations();
      renderSidebar();
    }
  }

  async function requestReply(active, typingEl){
    if (active.cowork) return requestCoworkReply(active, typingEl);
    const controller = new AbortController(); currentController = controller;
    const selected = findModel(active.model || state.model); active.model = selected.id;
    const stream = modelUsesStream(selected);
    let assistant = null; let assistantEl = null; let content = ""; let visible = ""; let queue = ""; let typeTimer = null; let resolveTyping = null; let responseSources = [];
    const pump = () => {
      if (!assistant) return;
      if (queue) {
        const chunk = nextStreamingChunk(queue);
        visible += chunk;
        queue = queue.slice(chunk.length);
        assistant.content = visible;
        const contentEl = assistantEl?.querySelector(".ai-msg-content");
        if (contentEl) appendStreamingChunk(contentEl, chunk);
        scrollMessagesToBottom();
        typeTimer = setTimeout(pump, 10);
      } else {
        typeTimer = null;
        if (resolveTyping) {
          const resolve = resolveTyping;
          resolveTyping = null;
          resolve();
        }
      }
    };
    const waitForTyping = () => new Promise(resolve => { if (!queue) resolve(); else resolveTyping = resolve; });
    const onDelta = (delta, sources = []) => { if (state.activeId !== active.id) return; responseSources = mergeSources(responseSources, sources); if (assistant) { assistant.sources = responseSources; updateMessageSources(assistantEl, responseSources); } if (!assistant) { const thinking = settleTyping(typingEl); removeTyping(typingEl); assistant = { role: "assistant", model: selected.id, content: "", thinking, sources: responseSources, searched: !!active.search, ts: Date.now() }; active.messages.push(assistant); assistantEl = buildMessageEl(assistant, true); els.messages.appendChild(assistantEl); } content += delta; queue += delta; if (!typeTimer) pump(); };
    try {
      const messages = active.messages.map(messagePayload);
      if (active.cowork) messages.unshift({ role: "system", content: "Work in a collaborative coworking style. Think alongside the user, make reasonable assumptions, show a concise plan when useful, and end with a practical next step. Keep the tone warm and focused." });
      if (active.search) messages.unshift({ role: "system", content: "Use web search when it improves accuracy or freshness. Ground factual answers in the retrieved results, distinguish current facts from your own reasoning, and include useful source links when available." });
      const response = await craxFetch("/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody({ model: selected.id, messages, stream, temperature: 0.7, web_search: !!active.search })), signal: controller.signal });
      if (!response.ok) throw new Error(await readErrorResponse(response));
      if (stream && response.body?.getReader) await readSse(response, onDelta, sources => { responseSources = mergeSources(responseSources, sources); if (assistant) { assistant.sources = responseSources; updateMessageSources(assistantEl, responseSources); } });
      else { const data = await response.json(); const reply = responseText(data); if (reply) onDelta(reply, extractSources(data, reply)); }
      await waitForTyping();
    } catch (error) { error.aiPartial = { assistant, assistantEl }; throw error; }
    finally { if (typeTimer) clearTimeout(typeTimer); typeTimer = null; if (currentController === controller) currentController = null; }
    if (!content.trim()) throw new Error("The model returned an empty reply.");
    if (state.activeId === active.id && assistant) { assistant.content = content.trim(); responseSources = mergeSources(responseSources, extractSources(null, assistant.content)); assistant.sources = responseSources; updateMessageSources(assistantEl, responseSources); assistantEl.querySelector(".ai-msg-content").innerHTML = markdownHtml(assistant.content, { hideLinks: assistant.searched === true || assistant.sources?.length > 0 }); active.updatedAt = Date.now(); saveConversations(); renderSidebar(); }
  }

  async function completeConversation(active){
    const typing = appendTyping(active);
    try { await requestReply(active, typing); }
    catch (error) { removeTyping(typing); if (error?.aiPartial?.assistant) { active.messages = active.messages.filter(message => message !== error.aiPartial.assistant); error.aiPartial.assistantEl?.remove(); } throw error; }
  }

  async function generateImage(prompt, referenceFiles = []){
    if (!prompt || isSending) return;
    if (!serviceReady) { showNotice("AI service is not available right now.", "warning"); return; }
    const limit = dailyLimit();
    loadDailyUsage(); if (state.dailyCount >= limit) { showNotice(`You’ve reached the ${limit}-message daily limit. It resets tomorrow.`, "warning"); return; }
    let active = getActive(); if (!active) { createConversation(false); active = getActive(); } if (!active) return;
    consumeDailyMessage();
    const userMessage = { role: "user", content: prompt, attachments: normalizeAttachments(referenceFiles), ts: Date.now() };
    active.messages.push(userMessage); active.updatedAt = Date.now(); saveConversations();
    els.messages.querySelector(".ai-empty")?.remove(); els.messages.appendChild(buildMessageEl(userMessage)); if (els.chatTitle) els.chatTitle.textContent = conversationTitle(active);
    els.textarea.value = ""; composerFiles = []; renderAttachmentTray(); isSending = true; els.sendBtn.disabled = true; if (els.composerHint) els.composerHint.textContent = "Creating image…"; renderSidebar();
    try {
      const referenceImages = normalizeAttachments(referenceFiles).filter(file => file.kind === "image" && file.data).map(file => file.data);
      // Keep the first request to Crax minimal: the image endpoint supplies a
      // valid default size, while reference images remain optional.
      const response = await craxFetch("/images/generations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: IMAGE_MODEL, prompt, ...(referenceImages.length ? { images: referenceImages } : {}) }) });
      if (!response.ok) {
        const detail = await readErrorResponse(response);
        console.error("Blur image generation failed", { status: response.status, detail });
        throw new Error(detail);
      }
      const data = await response.json();
      const item = data?.data?.[0];
      const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
      if (!url) throw new Error("This AI service does not provide image generation yet.");
      const assistant = { role: "assistant", model: IMAGE_MODEL, content: "", images: [{ url, alt: `Generated image for ${prompt}` }], ts: Date.now() };
      active.messages.push(assistant); active.updatedAt = Date.now(); saveConversations(); els.messages.appendChild(buildMessageEl(assistant)); scrollMessagesToBottom();
    } catch (error) { if (error?.name !== "AbortError") appendError(error?.message || "Couldn’t generate an image right now."); }
    finally { isSending = false; handleTextareaInput(); updateConnectionState(); updateUsage(); }
  }

  async function handleSend(){
    const text = els.textarea.value.trim(); const files = composerFiles.slice(); if ((!text && !files.length) || isSending) return;
    if (state.imageMode) { if (!text) return; await generateImage(text, files); return; }
    if (!serviceReady) { showNotice("AI service is not available right now.", "warning"); return; }
    const limit = dailyLimit();
    loadDailyUsage(); if (state.dailyCount >= limit) { showNotice(`You’ve reached the ${limit}-message daily limit. It resets tomorrow.`, "warning"); return; }
    let active = getActive(); if (!active) { createConversation(false); active = getActive(); } if (!active) return;
    if (!models.some(model => model.id === active.model)) active.model = state.model;
    const editIndex = editingMessage ? active.messages.indexOf(editingMessage) : -1;
    if (editIndex >= 0) {
      active.messages = active.messages.slice(0, editIndex);
      editingMessage = null;
      renderActiveConversation();
    } else {
      editingMessage = null;
    }
    consumeDailyMessage();
    const userMessage = { role: "user", content: text || "Please analyze the attached file(s).", attachments: files, ts: Date.now() }; active.messages.push(userMessage); active.updatedAt = Date.now(); saveConversations();
    els.messages.querySelector(".ai-empty")?.remove(); els.messages.appendChild(buildMessageEl(userMessage)); els.textarea.value = ""; els.textarea.style.height = "auto"; composerFiles = []; renderAttachmentTray(); isSending = true; els.sendBtn.disabled = true; if (els.composerHint) els.composerHint.textContent = "Thinking…"; renderSidebar(); if (els.chatTitle) els.chatTitle.textContent = conversationTitle(active);
    try { await completeConversation(active); } catch (error) { if (error?.name !== "AbortError") appendError(error?.message || "Couldn’t reach BlurGPT right now."); } finally { isSending = false; handleTextareaInput(); updateConnectionState(); updateUsage(); }
  }

  async function retryLastMessage(){
    if (isSending) return;
    const active = getActive(); const lastUser = active?.messages?.slice().reverse().find(message => message.role === "user"); if (!active || !lastUser) return;
    if (!serviceReady) { showNotice("AI service is not available right now.", "warning"); return; }
    const limit = dailyLimit();
    loadDailyUsage(); if (state.dailyCount >= limit) { showNotice(`You’ve reached the ${limit}-message daily limit. It resets tomorrow.`, "warning"); return; }
    consumeDailyMessage();
    isSending = true; els.sendBtn.disabled = true; if (els.composerHint) els.composerHint.textContent = "Thinking…";
    try { await completeConversation(active); } catch (error) { if (error?.name !== "AbortError") appendError(error?.message || "Couldn’t reach BlurGPT right now."); } finally { isSending = false; handleTextareaInput(); updateConnectionState(); updateUsage(); }
  }

  async function refreshModels({ silent = false } = {}){
    if (!SERVICE_CONFIGURED) { models = FALLBACK_MODELS.slice(); renderModelSelector(); return false; }
    try {
      const response = await craxFetch("/models", { cache: "no-store" });
      if (!response.ok) throw new Error(await readErrorResponse(response));
      const data = await response.json(); const next = (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []).map(normalizeModel).filter(Boolean); if (!next.length) throw new Error("BlurGPT returned no available models.");
      models = next; serviceReady = true; serviceError = ""; if (!models.some(model => model.id === state.model)) { state.model = models[0].id; localStorage.setItem(STORAGE_MODEL, state.model); }
      renderModelSelector(); renderModelsView(); updateConnectionState(); return true;
    } catch (error) { serviceReady = false; serviceError = error?.message || "Could not reach the AI service"; models = FALLBACK_MODELS.slice(); renderModelSelector(); renderModelsView(); updateConnectionState(); if (silent) console.warn("BlurGPT model catalog unavailable:", serviceError); return false; }
  }

  function renderModelSelector(){
    if (!els.modelSelector) return;
    const model = findModel(state.model);
    if (els.modelName) els.modelName.textContent = model.name;
    if (els.modelIcon) els.modelIcon.innerHTML = modelMark(model);
    els.modelSelector.title = `${model.name} · ${providerLabel(model.provider)}`;
  }

  function effortLabel(value){ return value === "medium" ? "Med" : value[0].toUpperCase() + value.slice(1); }

  function modelDropdownMarkup(){
    const query = modelDropdownQuery.trim().toLowerCase();
    const filtered = models.filter(model => !query || `${model.name} ${model.provider} ${model.description}`.toLowerCase().includes(query));
    const groups = { free: [], premium: [] };
    filtered.forEach(model => { (String(model.tier || "free").toLowerCase() === "premium" ? groups.premium : groups.free).push(model); });
    const groupMarkup = [["free", "Free"], ["premium", "Premium"]].map(([tier, label]) => {
      const rows = groups[tier];
      if (!rows.length) return "";
      return `<div class="ai-model-group-label">${label}</div>${rows.map(model => `<button type="button" class="ai-model-option ui-menu__item ${model.id === state.model ? "active" : ""}" data-model-id="${escapeAttr(model.id)}" role="option" aria-selected="${model.id === state.model}">${modelMark(model, "ai-model-option-logo")}<span class="ai-model-option-copy"><strong>${escapeHtml(model.name)}</strong></span><span class="ai-model-option-check">${model.id === state.model ? "✓" : ""}</span></button>`).join("")}`;
    }).join("");
    const searchEnabled = getActive() ? !!getActive().search : !!state.search;
    const reasoningAvailable = modelSupportsReasoning(findModel(getActive()?.model || state.model));
    const selectedEffort = currentEffort();
    const effortOptions = EFFORTS.map(value => `<button type="button" class="${value === selectedEffort ? "active" : ""}" data-effort="${value}" aria-pressed="${value === selectedEffort}"${!reasoningAvailable && value !== "off" ? " disabled title=\"Not supported by this model\"" : ""}>${effortLabel(value)}</button>`).join("");
    const thinkingDescription = reasoningAvailable ? "Reasoning effort" : "Not supported by this model";
    return `<label class="ai-model-search"><span class="ai-model-search-icon" aria-hidden="true">${icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}</span><input type="search" data-model-search placeholder="Search models" value="${escapeAttr(modelDropdownQuery)}" aria-label="Search models" autocomplete="off"></label><div class="ai-model-dropdown-list">${groupMarkup || `<div class="ai-model-dropdown-empty">No models match that search.</div>`}</div><div class="ai-model-thinking"><div class="ai-model-thinking-label">${icon('<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/>')}<span><strong>Thinking</strong><small>${thinkingDescription}</small></span></div><div class="ai-model-thinking-controls"><div class="ai-model-thinking-options" role="group" aria-label="Reasoning effort">${effortOptions}</div><div class="ai-model-search-options" role="group" aria-label="Web search"><button type="button" class="ai-model-search-toggle ${searchEnabled ? "active" : ""}" data-search-toggle aria-label="Web search" aria-pressed="${searchEnabled}">${icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}</button></div></div>`;
  }

  function renderModelDropdown(){
    if (!modelDropdownEl) return;
    modelDropdownEl.innerHTML = modelDropdownMarkup();
    positionModelDropdown();
  }

  function toggleModelDropdown(){
    if (modelDropdownOpen) { closeModelDropdown(); return; }
    modelDropdownOpen = true; modelDropdownQuery = ""; els.modelSelector.classList.add("active"); els.modelSelector.setAttribute("aria-expanded", "true"); modelDropdownEl = document.createElement("div"); modelDropdownEl.className = "ai-model-dropdown ui-menu"; modelDropdownEl.setAttribute("role", "dialog"); modelDropdownEl.setAttribute("aria-label", "Choose a model");
    modelDropdownEl.addEventListener("click", event => {
      event.stopPropagation();
      const option = event.target.closest("[data-model-id]");
      if (option) { selectModel(option.dataset.modelId); renderModelDropdown(); return; }
      const searchToggle = event.target.closest("[data-search-toggle]");
      if (searchToggle) { toggleSearch(); renderModelDropdown(); return; }
      const effort = event.target.closest("[data-effort]");
      if (effort) { setEffort(effort.dataset.effort); renderModelDropdown(); return; }
    });
    modelDropdownEl.addEventListener("input", event => {
      const search = event.target.closest("[data-model-search]");
      if (!search) return;
      modelDropdownQuery = search.value;
      renderModelDropdown();
      const next = modelDropdownEl.querySelector("[data-model-search]");
      next?.focus();
      next?.setSelectionRange(modelDropdownQuery.length, modelDropdownQuery.length);
    });
    document.body.appendChild(modelDropdownEl); renderModelDropdown(); setTimeout(() => document.addEventListener("click", closeModelDropdownOutside), 0);
  }

  function positionModelDropdown(){
    if (!modelDropdownEl || !els.modelSelector) return;
    const rect = els.modelSelector.getBoundingClientRect();
    const width = Math.min(344, Math.max(280, rect.width + 80));
    const safeWidth = Math.min(width, window.innerWidth - 16);
    const height = modelDropdownEl.offsetHeight || 320;
    const below = rect.bottom + 8;
    modelDropdownEl.style.width = `${safeWidth}px`;
    modelDropdownEl.style.left = `${Math.max(8, Math.min(window.innerWidth - safeWidth - 8, rect.right - safeWidth))}px`;
    if (below + height <= window.innerHeight - 8 || rect.top < height + 16) {
      modelDropdownEl.style.top = `${Math.min(below, window.innerHeight - height - 8)}px`;
      modelDropdownEl.style.bottom = "auto";
    } else {
      modelDropdownEl.style.bottom = `${Math.max(8, window.innerHeight - rect.top + 8)}px`;
      modelDropdownEl.style.top = "auto";
    }
  }
  function closeModelDropdown(){ modelDropdownOpen = false; els.modelSelector?.classList.remove("active"); els.modelSelector?.setAttribute("aria-expanded", "false"); modelDropdownEl?.remove(); modelDropdownEl = null; document.removeEventListener("click", closeModelDropdownOutside); }
  function closeModelDropdownOutside(event){ if (!event.target.closest(".ai-model-dropdown") && !event.target.closest(".ai-model-selector")) closeModelDropdown(); }

  function selectModel(id){
    if (!models.some(model => model.id === id)) return;
    state.model = id;
    if (!modelSupportsReasoning(findModel(id))) {
      state.effort = "off";
      localStorage.setItem(STORAGE_EFFORT, "off");
    }
    localStorage.setItem(STORAGE_MODEL, id);
    const active = getActive();
    if (active) {
      active.model = id;
      active.effort = currentEffort();
      active.updatedAt = Date.now();
      saveConversations();
      renderSidebar();
    }
    renderModelSelector();
  }

  function toggleCowork(){
    const active = getActive();
    const next = !(active ? !!active.cowork : state.cowork);
    state.cowork = next;
    localStorage.setItem(STORAGE_COWORK, String(state.cowork));
    if (active) { active.cowork = next; active.updatedAt = Date.now(); saveConversations(); }
    renderCoworkState();
  }

  function toggleSearch(){
    const active = getActive();
    const next = !(active ? !!active.search : state.search);
    state.search = next;
    localStorage.setItem(STORAGE_SEARCH, String(next));
    if (active) { active.search = next; active.updatedAt = Date.now(); saveConversations(); }
    renderSearchState();
  }
  function init(){ const panel = document.querySelector('[data-panel="ai"]'); if (!panel || panel.dataset.aiReady === "true") return; panel.dataset.aiReady = "true"; loadState(); buildShell(panel); }
  window.BlurGPT = Object.freeze({ ask: askFromChat, getDailyLimit: () => dailyLimit(), getDailyUsed: () => { loadDailyUsage(); return state.dailyCount; } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
