/* =========================
   AI APP (OpenRouter powered)
========================= */

(function(){

    const STORAGE_CONVOS = 'blur.ai.conversations';
    const STORAGE_MODEL  = 'blur.ai.model';
    const STORAGE_KEY    = 'blur.ai.key';

    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

    // Your OpenRouter key, used automatically for any model marked free:true below.
    // IMPORTANT: this is visible to anyone who views your site's source — do NOT
    // paste your main key here. Create a separate key at openrouter.ai/keys and
    // set a spending limit on it (e.g. $5) so a leaked key can't run up a big bill.
    const OWNER_KEY = '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';

    // Curated model list. Add/remove freely — every OpenRouter slug works here.
    // free:true  = paid for automatically by OWNER_KEY above.
    // free:false = visitor must enter their own OpenRouter key.
    const AI_MODELS = [
        { id:'deepseek/deepseek-chat',             name:'DeepSeek Chat',      provider:'DeepSeek',  mono:'D', free:true  },
        { id:'meta-llama/llama-3.3-70b-instruct',  name:'Llama 3.3 70B',      provider:'Meta',      mono:'M', free:true  },

        { id:'openai/gpt-4o-mini',                 name:'GPT-4o Mini',        provider:'OpenAI',    mono:'O', free:false },
        { id:'openai/gpt-4o',                      name:'GPT-4o',             provider:'OpenAI',    mono:'O', free:false },
        { id:'anthropic/claude-3.7-sonnet',        name:'Claude 3.7 Sonnet',  provider:'Anthropic', mono:'A', free:false },
        { id:'anthropic/claude-3.5-haiku',         name:'Claude 3.5 Haiku',   provider:'Anthropic', mono:'A', free:false },
        { id:'google/gemini-2.0-flash-001',        name:'Gemini 2.0 Flash',   provider:'Google',    mono:'G', free:false },
        { id:'google/gemini-pro-1.5',              name:'Gemini 1.5 Pro',     provider:'Google',    mono:'G', free:false },
        { id:'google/gemma-4-26b-a4b-it:free',     name:'Gemma 4 26B A4B',    provider:'Google',    mono:'G', free:true  },
        { id:'mistralai/mistral-large',            name:'Mistral Large',      provider:'Mistral',   mono:'M', free:false },
        { id:'x-ai/grok-2',                        name:'Grok 2',             provider:'xAI',       mono:'X', free:false },
    ];

    const SUGGESTIONS = [
        { title:'Explain a concept',  sub:'Break something complex into plain terms', prompt:'Explain ' },
        { title:'Debug this error',   sub:'Paste a stack trace or describe the bug',   prompt:'Help me debug this error: ' },
        { title:'Draft something',    sub:'Emails, posts, messages, a first pass',     prompt:'Write a draft for ' },
        { title:'Compare options',    sub:'Pros, cons, and a straight answer',         prompt:'What are the pros and cons of ' },
    ];

    let state = {
        conversations: [],   // { id, title, model, messages:[{role,content,ts}], updatedAt }
        activeId: null,
        model: AI_MODELS[0].id,
        apiKey: '',
    };

    let els = {};
    let pendingController = null;

    function uid(){
        return Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    }

    function loadState(){
        try{
            const raw = localStorage.getItem(STORAGE_CONVOS);
            state.conversations = raw ? JSON.parse(raw) : [];
        }catch(e){ state.conversations = []; }

        state.model  = localStorage.getItem(STORAGE_MODEL) || AI_MODELS[0].id;
        state.apiKey = localStorage.getItem(STORAGE_KEY) || '';

        if(state.conversations.length){
            state.activeId = state.conversations
                .slice()
                .sort((a,b)=>b.updatedAt-a.updatedAt)[0].id;
        }
    }

    function saveConversations(){
        localStorage.setItem(STORAGE_CONVOS, JSON.stringify(state.conversations));
    }

    function getActive(){
        return state.conversations.find(c => c.id === state.activeId) || null;
    }

    function findModel(id){
        return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
    }

    /* ---------- building the shell ---------- */

    function buildShell(panel){
        panel.innerHTML = '';

        const app = document.createElement('div');
        app.className = 'ai-app';

        app.appendChild(buildRailBackdrop());
        app.appendChild(buildRail());
        app.appendChild(buildMain());

        panel.appendChild(app);
    }

    function buildRailBackdrop(){
        const div = document.createElement('div');
        div.className = 'ai-rail-backdrop';
        div.addEventListener('click', () => setRailOpen(false));
        els.railBackdrop = div;
        return div;
    }

    function icon(path, extra){
        return `<svg viewBox="0 0 24 24" ${extra||''}>${path}</svg>`;
    }

    function buildRail(){
        const rail = document.createElement('div');
        rail.className = 'ai-rail';

        rail.innerHTML = `
            <div class="ai-rail-top">
                <div class="ai-rail-heading">
                    <strong>Conversations</strong>
                    <button class="ai-rail-close" type="button" aria-label="Close">
                        ${icon('<path d="M6 6l12 12M18 6L6 18"/>')}
                    </button>
                </div>
                <button class="ai-new-chat" type="button">
                    ${icon('<path d="M12 5v14M5 12h14"/>')}
                    New chat
                </button>
                <div class="ai-search">
                    ${icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}
                    <input type="text" placeholder="Search chats" autocomplete="off">
                </div>
            </div>
            <div class="ai-history"></div>
            <div class="ai-rail-bottom">
                <div class="ai-model-select">
                    <button class="ai-model-current" type="button"></button>
                    <div class="ai-model-dropdown">
                        <div class="ai-model-search">
                            ${icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}
                            <input type="text" placeholder="Search models" autocomplete="off">
                        </div>
                        <div class="ai-model-list"></div>
                    </div>
                </div>
                <div class="ai-key-row">
                    <div class="ai-key-label-row">
                        <span>OpenRouter API key</span>
                        <div class="ai-key-status"><span class="ai-key-dot"></span><span class="ai-key-status-text">not set</span></div>
                    </div>
                    <div class="ai-key-input-wrap">
                        <input type="password" placeholder="sk-or-..." autocomplete="off" spellcheck="false">
                        <button class="ai-key-save" type="button" aria-label="Save key">
                            ${icon('<path d="M20 6L9 17l-5-5"/>')}
                        </button>
                    </div>
                    <p class="ai-key-hint">Free-tagged models work automatically. Everything else needs your own OpenRouter key — stored only in this browser.</p>
                </div>
            </div>
        `;

        els.rail          = rail;
        els.history       = rail.querySelector('.ai-history');
        els.searchInput   = rail.querySelector('.ai-search input');
        els.newChatBtn    = rail.querySelector('.ai-new-chat');
        els.railClose     = rail.querySelector('.ai-rail-close');

        els.modelSelect   = rail.querySelector('.ai-model-select');
        els.modelCurrent  = rail.querySelector('.ai-model-current');
        els.modelDropdown = rail.querySelector('.ai-model-dropdown');
        els.modelSearch   = rail.querySelector('.ai-model-search input');
        els.modelList     = rail.querySelector('.ai-model-list');

        els.keyStatus     = rail.querySelector('.ai-key-status');
        els.keyStatusText = rail.querySelector('.ai-key-status-text');
        els.keyInput      = rail.querySelector('.ai-key-input-wrap input');
        els.keySave       = rail.querySelector('.ai-key-save');

        els.newChatBtn.addEventListener('click', () => createConversation(true));
        els.railClose.addEventListener('click', () => setRailOpen(false));
        els.searchInput.addEventListener('input', renderHistory);

        els.modelCurrent.addEventListener('click', () => toggleModelDropdown());
        els.modelSearch.addEventListener('input', renderModelList);
        document.addEventListener('click', (e) => {
            if(!els.modelSelect.contains(e.target)) toggleModelDropdown(false);
        });

        els.keyInput.value = state.apiKey;
        els.keySave.addEventListener('click', saveApiKey);
        els.keyInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') saveApiKey();
        });

        renderModelCurrent();
        renderModelList();
        renderKeyStatus();

        return rail;
    }

    function buildMain(){
        const main = document.createElement('div');
        main.className = 'ai-main';

        main.innerHTML = `
            <div class="ai-main-header">
                <button class="ai-rail-toggle" type="button" aria-label="Open conversations">
                    ${icon('<path d="M4 6h16M4 12h16M4 18h16"/>')}
                </button>
                <div class="ai-main-title">
                    <strong class="ai-main-title-text">New chat</strong>
                    <span class="ai-badge ai-current-badge"></span>
                </div>
                <button class="ai-clear-btn" type="button" aria-label="Delete conversation">
                    ${icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>')}
                </button>
            </div>
            <div class="ai-messages"></div>
            <div class="ai-composer-wrap">
                <div class="ai-composer">
                    <textarea rows="1" placeholder="Message the model..."></textarea>
                    <button class="ai-send" type="button" aria-label="Send" disabled>
                        ${icon('<path d="M12 19V5M5 12l7-7 7 7"/>')}
                    </button>
                </div>
                <p class="ai-composer-footer">Responses come from the model you picked on OpenRouter — check anything important.</p>
            </div>
        `;

        els.main          = main;
        els.messages      = main.querySelector('.ai-messages');
        els.titleText     = main.querySelector('.ai-main-title-text');
        els.currentBadge  = main.querySelector('.ai-current-badge');
        els.railToggle    = main.querySelector('.ai-rail-toggle');
        els.clearBtn      = main.querySelector('.ai-clear-btn');
        els.textarea      = main.querySelector('.ai-composer textarea');
        els.sendBtn       = main.querySelector('.ai-send');

        els.railToggle.addEventListener('click', () => setRailOpen(true));
        els.clearBtn.addEventListener('click', deleteActiveConversation);

        els.textarea.addEventListener('input', () => {
            els.textarea.style.height = 'auto';
            els.textarea.style.height = Math.min(els.textarea.scrollHeight, 160) + 'px';
            els.sendBtn.disabled = !els.textarea.value.trim();
        });

        els.textarea.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && !e.shiftKey){
                e.preventDefault();
                handleSend();
            }
        });

        els.sendBtn.addEventListener('click', handleSend);

        return main;
    }

    function setRailOpen(open){
        els.rail.classList.toggle('open', open);
        els.railBackdrop.classList.toggle('open', open);
    }

    /* ---------- model picker ---------- */

    function toggleModelDropdown(force){
        const open = typeof force === 'boolean' ? force : !els.modelDropdown.classList.contains('open');
        els.modelDropdown.classList.toggle('open', open);
        els.modelSelect.classList.toggle('open', open);
        if(open){
            els.modelSearch.value = '';
            renderModelList();
            setTimeout(() => els.modelSearch.focus(), 50);
        }
    }

    function renderModelCurrent(){
        const m = findModel(state.model);
        els.modelCurrent.innerHTML = `
            <div class="ai-model-mono">${m.mono}</div>
            <div class="ai-model-labels">
                <strong>${escapeHtml(m.name)} ${m.free ? '<span class="ai-free-tag">Free</span>' : ''}</strong>
                <span>${escapeHtml(m.id)}</span>
            </div>
            ${icon('<path d="M6 9l6 6 6-6"/>', 'class="ai-model-arrow"')}
        `;
        renderCurrentBadge();
    }

function renderCurrentBadge(){
    if (!els.currentBadge) return;

    const m = findModel(getActive() ? getActive().model : state.model);
    els.currentBadge.textContent = m.id;
}

    function renderModelList(){
        const q = els.modelSearch.value.trim().toLowerCase();
        const filtered = AI_MODELS.filter(m =>
            !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
        );

        if(!filtered.length){
            els.modelList.innerHTML = `<div class="ai-model-empty">No models match "${escapeHtml(q)}"</div>`;
            return;
        }

        const groups = {};
        filtered.forEach(m => {
            groups[m.provider] = groups[m.provider] || [];
            groups[m.provider].push(m);
        });

        els.modelList.innerHTML = '';
        Object.keys(groups).forEach(provider => {
            const label = document.createElement('div');
            label.className = 'ai-model-group-label';
            label.textContent = provider;
            els.modelList.appendChild(label);

            groups[provider].forEach(m => {
                const opt = document.createElement('div');
                opt.className = 'ai-model-option' + (m.id === state.model ? ' selected' : '');
                opt.innerHTML = `
                    <div class="ai-model-mono">${m.mono}</div>
                    <div class="ai-model-option-text">
                        <strong>${escapeHtml(m.name)} ${m.free ? '<span class="ai-free-tag">Free</span>' : ''}</strong>
                        <span>${escapeHtml(m.id)}</span>
                    </div>
                    ${icon('<path d="M20 6L9 17l-5-5"/>', 'class="ai-model-option-check"')}
                `;
                opt.addEventListener('click', () => {
                    state.model = m.id;
                    localStorage.setItem(STORAGE_MODEL, m.id);
                    const active = getActive();
                    if(active && active.messages.length === 0){
                        active.model = m.id;
                        saveConversations();
                    }
                    renderModelCurrent();
                    renderModelList();
                    toggleModelDropdown(false);
                });
                els.modelList.appendChild(opt);
            });
        });
    }

    /* ---------- api key ---------- */

    function renderKeyStatus(){
        const has = !!state.apiKey;
        els.keyStatus.classList.toggle('connected', has);
        els.keyStatusText.textContent = has ? 'connected' : 'not set';
    }

    function saveApiKey(){
        state.apiKey = els.keyInput.value.trim();
        localStorage.setItem(STORAGE_KEY, state.apiKey);
        renderKeyStatus();
    }

    /* ---------- conversations ---------- */

    function createConversation(focus){
        const convo = {
            id: uid(),
            title: 'New chat',
            model: state.model,
            messages: [],
            updatedAt: Date.now(),
        };
        state.conversations.unshift(convo);
        state.activeId = convo.id;
        saveConversations();
        renderHistory();
        renderActiveConversation();
        setRailOpen(false);
        if(focus) setTimeout(() => els.textarea.focus(), 60);
    }

    function selectConversation(id){
        state.activeId = id;
        renderHistory();
        renderActiveConversation();
        setRailOpen(false);
    }

    function deleteConversation(id, evt){
        if(evt) evt.stopPropagation();
        state.conversations = state.conversations.filter(c => c.id !== id);
        if(state.activeId === id){
            state.activeId = state.conversations.length ? state.conversations[0].id : null;
        }
        saveConversations();
        renderHistory();
        renderActiveConversation();
    }

    function deleteActiveConversation(){
        const active = getActive();
        if(!active) return;
        deleteConversation(active.id);
    }

    function dayLabel(ts){
        const d = new Date(ts);
        const now = new Date();
        const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
        if(diff <= 0) return 'Today';
        if(diff === 1) return 'Yesterday';
        if(diff <= 7) return 'Previous 7 days';
        return 'Older';
    }

    function renderHistory(){
        const q = (els.searchInput.value || '').trim().toLowerCase();
        const sorted = state.conversations.slice().sort((a,b) => b.updatedAt - a.updatedAt);
        const filtered = q ? sorted.filter(c => c.title.toLowerCase().includes(q)) : sorted;

        els.history.innerHTML = '';

        if(!filtered.length){
            const empty = document.createElement('div');
            empty.className = 'ai-history-empty';
            empty.textContent = q ? 'No chats match your search.' : 'No conversations yet — start one above.';
            els.history.appendChild(empty);
            return;
        }

        const order = ['Today','Yesterday','Previous 7 days','Older'];
        const groups = {};
        filtered.forEach(c => {
            const label = dayLabel(c.updatedAt);
            groups[label] = groups[label] || [];
            groups[label].push(c);
        });

        order.forEach(label => {
            if(!groups[label]) return;
            const groupEl = document.createElement('div');
            groupEl.className = 'ai-history-group';

            const labelEl = document.createElement('div');
            labelEl.className = 'ai-history-label';
            labelEl.textContent = label;
            groupEl.appendChild(labelEl);

            groups[label].forEach(c => {
                const m = findModel(c.model);
                const item = document.createElement('div');
                item.className = 'ai-chat-item' + (c.id === state.activeId ? ' active' : '');
                item.innerHTML = `
                    <div class="ai-chat-mono">${m.mono}</div>
                    <div class="ai-chat-text"><strong>${escapeHtml(c.title)}</strong></div>
                    <button class="ai-chat-del" type="button" aria-label="Delete chat">
                        ${icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>')}
                    </button>
                `;
                item.addEventListener('click', () => selectConversation(c.id));
                item.querySelector('.ai-chat-del').addEventListener('click', (e) => deleteConversation(c.id, e));
                groupEl.appendChild(item);
            });

            els.history.appendChild(groupEl);
        });
    }

    /* ---------- messages ---------- */

    function renderActiveConversation(){
        const active = getActive();
        els.messages.innerHTML = '';

        if(!active){
            els.titleText.textContent = 'New chat';
            renderCurrentBadge();
            renderEmptyState();
            return;
        }

        els.titleText.textContent = active.title;
        els.currentBadge.textContent = findModel(active.model).id;

        if(!active.messages.length){
            renderEmptyState();
            return;
        }

        active.messages.forEach(msg => els.messages.appendChild(buildMessageEl(msg, active.model)));
        scrollMessagesToBottom();
    }

    function renderEmptyState(){
        const wrap = document.createElement('div');
        wrap.className = 'ai-empty';
        wrap.innerHTML = `
            <div class="ai-empty-mark">${icon('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>')}</div>
            <h1>Ask anything.</h1>
            <p>Pick a model on the left, then start typing below. Every chat is saved so you can pick it back up later.</p>
            <div class="ai-suggest-grid"></div>
        `;

        const grid = wrap.querySelector('.ai-suggest-grid');
        SUGGESTIONS.forEach(s => {
            const card = document.createElement('div');
            card.className = 'ai-suggest-card';
            card.innerHTML = `<strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.sub)}</span>`;
            card.addEventListener('click', () => {
                els.textarea.value = s.prompt;
                els.textarea.dispatchEvent(new Event('input'));
                els.textarea.focus();
                els.textarea.setSelectionRange(s.prompt.length, s.prompt.length);
            });
            grid.appendChild(card);
        });

        els.messages.appendChild(wrap);
    }

    function buildMessageEl(msg, modelId){
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg ' + msg.role;

        const avatar = document.createElement('div');
        avatar.className = 'ai-msg-avatar';
        avatar.textContent = msg.role === 'user' ? 'You' : findModel(modelId).mono;

        const body = document.createElement('div');
        body.className = 'ai-msg-body';

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.textContent = msg.content;

        const meta = document.createElement('div');
        meta.className = 'ai-msg-meta';
        meta.textContent = new Date(msg.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

        body.appendChild(bubble);
        body.appendChild(meta);
        wrap.appendChild(avatar);
        wrap.appendChild(body);
        return wrap;
    }

    function scrollMessagesToBottom(){
        els.messages.scrollTop = els.messages.scrollHeight;
    }

    /* ---------- sending ---------- */

    function handleSend(){
        const text = els.textarea.value.trim();
        if(!text) return;

        let active = getActive();
        if(!active){
            active = {
                id: uid(),
                title: 'New chat',
                model: state.model,
                messages: [],
                updatedAt: Date.now(),
            };
            state.conversations.unshift(active);
            state.activeId = active.id;
        }

        if(els.messages.querySelector('.ai-empty')){
            els.messages.innerHTML = '';
        }

        const userMsg = { role:'user', content:text, ts:Date.now() };
        active.messages.push(userMsg);
        if(active.messages.length === 1){
            active.title = text.length > 42 ? text.slice(0,42) + '…' : text;
            els.titleText.textContent = active.title;
        }
        active.updatedAt = Date.now();
        saveConversations();
        renderHistory();

        els.messages.appendChild(buildMessageEl(userMsg, active.model));
        scrollMessagesToBottom();

        els.textarea.value = '';
        els.textarea.style.height = 'auto';
        els.sendBtn.disabled = true;

        const model = findModel(active.model);
        if(!model.free && !state.apiKey){
            appendError('This model needs your own key.', 'Add an OpenRouter API key in the sidebar, or switch to a model tagged "Free".');
            return;
        }

        callOpenRouter(active);
    }

    function appendTyping(){
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg assistant ai-typing-wrap';
        wrap.innerHTML = `
            <div class="ai-msg-avatar">${findModel(getActive().model).mono}</div>
            <div class="ai-msg-body"><div class="ai-msg-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div></div>
        `;
        els.messages.appendChild(wrap);
        scrollMessagesToBottom();
        return wrap;
    }

    function appendError(title, detail){
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg assistant';
        wrap.innerHTML = `<div class="ai-error-bubble"><strong>${escapeHtml(title)}</strong><br>${escapeHtml(detail)}</div>`;
        els.messages.appendChild(wrap);
        scrollMessagesToBottom();
    }

    async function callOpenRouter(active){
        const typingEl = appendTyping();

        const model = findModel(active.model);
const payloadMessages = [
    {
        role:"system",
        content:`
You are Blur AI.

${localStorage.getItem("blur-ai-personality") || `
Be helpful, friendly, and concise.
`}
        `
    },

    ...active.messages.map(m=>({
        role:m.role,
        content:m.content
    }))
];
        // Visitor's own key always wins if they've set one (keeps the owner key's usage down).
        // Otherwise, free-tagged models fall back to the embedded owner key.
        const key = state.apiKey || (model.free ? OWNER_KEY : '');

        try{
            const res = await fetch(OPENROUTER_URL, {
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    'Authorization':'Bearer ' + key,
                    'HTTP-Referer': window.location.href,
                    'X-Title':'Blur AI',
                },
                body: JSON.stringify({
                    model: active.model,
                    messages: payloadMessages,
                }),
            });

            const data = await res.json();
            typingEl.remove();

            if(!res.ok){
                const msg = (data && data.error && data.error.message) ? data.error.message : ('Request failed (' + res.status + ')');
                appendError('OpenRouter couldn\'t complete that.', msg);
                return;
            }

            const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if(!reply){
                appendError('No reply came back.', 'The response didn\'t include any message content.');
                return;
            }

            const assistantMsg = { role:'assistant', content: reply.trim(), ts: Date.now() };
            active.messages.push(assistantMsg);
            active.updatedAt = Date.now();
            saveConversations();
            renderHistory();

            els.messages.appendChild(buildMessageEl(assistantMsg, active.model));
            scrollMessagesToBottom();

        }catch(err){
            typingEl.remove();
            appendError('Couldn\'t reach OpenRouter.', 'Check your connection and API key, then try again.');
        }
    }

    /* ---------- utils ---------- */

    function escapeHtml(str){
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    /* ---------- init ---------- */

    function init(){
        const panel = document.querySelector('[data-panel="ai"]');
        if(!panel) return;

        loadState();
        buildShell(panel);
        renderHistory();
        renderActiveConversation();
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    }else{
        init();
    }

})();