/* ============================================================
   AI APP — Sidebar + Chat Layout (Lucide AI Style)
   Model selector next to send button, sidebar with search
============================================================ */

(function() {

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const STORAGE_CONVOS = 'blur.ai.conversations';
    const STORAGE_MODEL  = 'blur.ai.model';
    const STORAGE_KEY    = 'blur.ai.key';
    const STORAGE_TOKENS = 'blur.ai.tokens';

    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

    // SVG icons for each model provider
    const PROVIDER_ICONS = {
        'DeepSeek': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
        'Meta': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
        'Google': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>`,
        'OpenAI': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z"/><path d="M12 7v10"/><path d="M7 12h10"/></svg>`,
        'Anthropic': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    };

    // Models with proper data
    const AI_MODELS = [
        { 
            id: 'deepseek/deepseek-chat', 
            name: 'DeepSeek Chat', 
            provider: 'DeepSeek', 
            icon: 'deepseek',
            tag: 'FREE',
            description: 'Fast general-purpose AI'
        },
        { 
            id: 'meta-llama/llama-3.3-70b-instruct', 
            name: 'Llama 3.3 70B', 
            provider: 'Meta', 
            icon: 'meta',
            tag: 'FREE',
            description: 'Powerful open-source model'
        },
        { 
            id: 'liquid/lfm-2.5-2.6b:free', 
            name: 'LFM 2.5 2.6B', 
            provider: 'Liquid AI', 
            icon: 'liquid',
            tag: 'FREE',
            description: 'Lightweight and ultra-fast'
        },
        { 
            id: 'openai/gpt-4o-mini', 
            name: 'GPT-4o Mini', 
            provider: 'OpenAI', 
            icon: 'openai',
            tag: 'FAST',
            description: 'Fast and capable everyday AI'
        },
        { 
            id: 'minimax/minimax-m2.7:free', 
            name: 'MiniMax M2.7', 
            provider: 'MiniMax', 
            icon: 'minimax',
            tag: 'FREE',
            description: 'Strong reasoning and coding'
        },
    ];

    const SUGGESTIONS = [
        { title: 'What\'s the difference between TCP and UDP?', prompt: 'Explain the difference between TCP and UDP' },
        { title: 'Recommend three sci-fi books', prompt: 'Recommend three great sci-fi books' },
        { title: 'Turn this idea into a to-do list', prompt: 'Turn this idea into a to-do list: ' },
        { title: 'Explain Docker like I\'m five', prompt: 'Explain Docker like I\'m five' },
    ];

    // ============================================================
    // STATE
    // ============================================================

    let state = {
        conversations: [],
        activeId: null,
        model: AI_MODELS[0].id,
        apiKey: '',
        tokensUsed: 0,
        sessionTokens: 0,
    };

    let els = {};
    let isSending = false;
    let modelDropdownOpen = false;
    let modelDropdownEl = null;
    let currentStream = null;

    // ============================================================
    // UTILITIES
    // ============================================================

    function uid() {
        return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function icon(path, extra = '') {
        return `<svg viewBox="0 0 24 24" ${extra}>${path}</svg>`;
    }

    function findModel(id) {
        return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
    }

    function getProviderIcon(providerKey) {
        return PROVIDER_ICONS[providerKey] || PROVIDER_ICONS['DeepSeek'];
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_CONVOS);
            state.conversations = raw ? JSON.parse(raw) : [];
        } catch (e) { state.conversations = []; }

        state.model = localStorage.getItem(STORAGE_MODEL) || AI_MODELS[0].id;
        state.apiKey = localStorage.getItem(STORAGE_KEY) || '';
        state.tokensUsed = parseInt(localStorage.getItem(STORAGE_TOKENS)) || 0;

        if (state.conversations.length) {
            state.activeId = state.conversations
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
        }
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_CONVOS, JSON.stringify(state.conversations));
    }

    function saveTokens() {
        localStorage.setItem(STORAGE_TOKENS, String(state.tokensUsed));
    }

    function getActive() {
        return state.conversations.find(c => c.id === state.activeId) || null;
    }

    function getConversationTitle(messages) {
        if (messages.length === 0) return 'New chat';
        const first = messages[0]?.content || 'New chat';
        return first.length > 35 ? first.slice(0, 35) + '…' : first;
    }

    function addTokens(amount) {
        state.tokensUsed += amount;
        state.sessionTokens += amount;
        saveTokens();
        updateTokens();
    }

    function updateTokens() {
        if (els.tokensToday) {
            els.tokensToday.textContent = `${state.tokensUsed} / 400k`;
        }
        if (els.tokensSession) {
            els.tokensSession.textContent = state.sessionTokens;
        }
    }

    // ============================================================
    // BUILD SHELL
    // ============================================================

    function buildShell(panel) {
        panel.innerHTML = '';

        const app = document.createElement('div');
        app.className = 'ai-app';

        // Left sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'ai-sidebar';
        sidebar.innerHTML = `
            <div class="ai-sidebar-header">
                <h2>Chats</h2>
                <button class="ai-sidebar-new ui-icon-button ui-icon-button--sm" title="New chat">
                    ${icon('<path d="M12 5v14M5 12h14"/>', 'width="18" height="18"')}
                </button>
            </div>
            <div class="ai-sidebar-search ui-field">
                ${icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', 'width="14" height="14"')}
                <input type="text" placeholder="Search chats..." id="aiSidebarSearch">
            </div>
            <div class="ai-sidebar-list" id="aiSidebarList"></div>
            <div class="ai-sidebar-footer">
                <div class="ai-token-row">
                    <span>Tokens today</span>
                    <span id="aiTokensToday">0 / 400k</span>
                </div>
                <div class="ai-token-row">
                    <span>This session</span>
                    <span id="aiTokensSession">0</span>
                </div>
                <button class="ai-upgrade-btn ui-button ui-button--secondary" id="aiUpgradeBtn">
                    Upgrade for 5M tokens/day
                </button>
            </div>
        `;
        app.appendChild(sidebar);

        // Main chat area
        const main = document.createElement('div');
        main.className = 'ai-main';
        main.innerHTML = `
            <div class="ai-chat-header">
                <h1 id="aiChatTitle">Greeting</h1>
            </div>
            <div class="ai-messages" id="aiMessages"></div>
            <div class="ai-composer-wrap">
                <div class="ai-composer ui-field">
                    <textarea rows="1" placeholder="Message Lucide AI" id="aiTextarea"></textarea>
                    <div class="ai-composer-right">
                        <div class="ai-model-selector" id="aiModelSelector">
                            <span class="ai-model-icon" id="aiModelIcon"></span>
                            <span class="ai-model-name" id="aiModelName">${AI_MODELS[0].name}</span>
                            <span class="ai-model-arrow">▼</span>
                        </div>
                        <button class="ai-send ui-icon-button" type="button" aria-label="Send" id="aiSendBtn" disabled>
                            ${icon('<path d="M12 19V5M5 12l7-7 7 7"/>', 'width="18" height="18"')}
                        </button>
                    </div>
                </div>
            </div>
        `;
        app.appendChild(main);

        panel.appendChild(app);

        // Initialize refs
        els.sidebarSearch = document.getElementById('aiSidebarSearch');
        els.sidebarList = document.getElementById('aiSidebarList');
        els.chatTitle = document.getElementById('aiChatTitle');
        els.messages = document.getElementById('aiMessages');
        els.textarea = document.getElementById('aiTextarea');
        els.sendBtn = document.getElementById('aiSendBtn');
        els.modelSelector = document.getElementById('aiModelSelector');
        els.modelName = document.getElementById('aiModelName');
        els.modelIcon = document.getElementById('aiModelIcon');
        els.tokensToday = document.getElementById('aiTokensToday');
        els.tokensSession = document.getElementById('aiTokensSession');
        els.upgradeBtn = document.getElementById('aiUpgradeBtn');

        // Sidebar new chat button
        document.querySelector('.ai-sidebar-new').addEventListener('click', () => createConversation(true));

        // Chat title click creates new chat
        els.chatTitle.addEventListener('click', () => createConversation(true));

        // Sidebar search
        els.sidebarSearch.addEventListener('input', renderSidebar);

        // Textarea events
        els.textarea.addEventListener('input', handleTextareaInput);
        els.textarea.addEventListener('keydown', handleTextareaKeydown);
        els.sendBtn.addEventListener('click', handleSend);

        // Model selector
        els.modelSelector.addEventListener('click', toggleModelDropdown);

        // Upgrade button
        els.upgradeBtn.addEventListener('click', () => {
            alert('Upgrade to 5M tokens/day - Coming soon!');
        });

        renderAll();
        setTimeout(() => els.textarea.focus(), 100);
        updateTokens();
    }

    // ============================================================
    // MODEL DROPDOWN - Like Lucide AI
    // ============================================================

    function toggleModelDropdown() {
        if (modelDropdownOpen) {
            closeModelDropdown();
            return;
        }

        modelDropdownOpen = true;
        els.modelSelector.classList.add('active');
        
        modelDropdownEl = document.createElement('div');
        modelDropdownEl.className = 'ai-model-dropdown';
        
        // Group models by provider
        const groups = {};
        AI_MODELS.forEach(m => {
            if (!groups[m.provider]) groups[m.provider] = [];
            groups[m.provider].push(m);
        });

        let html = '';
        Object.keys(groups).forEach(provider => {
            html += `<div class="ai-model-group-label">${provider}</div>`;
            groups[provider].forEach(m => {
                const isActive = m.id === state.model;
                const iconSvg = getProviderIcon(m.provider);
                html += `
                    <div class="ai-model-option ${isActive ? 'active' : ''}" data-id="${m.id}">
                        <span class="ai-model-option-icon">${iconSvg}</span>
                        <div class="ai-model-option-info">
                            <span class="ai-model-option-name">${escapeHtml(m.name)}</span>
                            <span class="ai-model-option-desc">${escapeHtml(m.description)}</span>
                        </div>
                        <div class="ai-model-option-tags">
                            <span class="ai-model-option-tag ${m.tag.toLowerCase()}">${escapeHtml(m.tag)}</span>
                            ${isActive ? `<span class="ai-model-option-check">✓</span>` : ''}
                        </div>
                    </div>
                `;
            });
        });

        modelDropdownEl.innerHTML = html;

        modelDropdownEl.addEventListener('click', (e) => {
            const option = e.target.closest('.ai-model-option');
            if (option) {
                selectModel(option.dataset.id);
                closeModelDropdown();
            }
        });

        document.body.appendChild(modelDropdownEl);

        // Position it
        const rect = els.modelSelector.getBoundingClientRect();
        modelDropdownEl.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        modelDropdownEl.style.right = (window.innerWidth - rect.right) + 'px';
        modelDropdownEl.style.width = Math.max(rect.width, 280) + 'px';
        modelDropdownEl.style.maxHeight = '320px';

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeModelDropdownOutside);
        }, 10);
    }

    function closeModelDropdown() {
        modelDropdownOpen = false;
        if (els.modelSelector) els.modelSelector.classList.remove('active');
        if (modelDropdownEl) {
            modelDropdownEl.remove();
            modelDropdownEl = null;
        }
        document.removeEventListener('click', closeModelDropdownOutside);
    }

    function closeModelDropdownOutside(e) {
        if (!e.target.closest('.ai-model-dropdown') && !e.target.closest('.ai-model-selector')) {
            closeModelDropdown();
        }
    }

    function selectModel(id) {
        state.model = id;
        localStorage.setItem(STORAGE_MODEL, id);
        const active = getActive();
        if (active && active.messages.length === 0) {
            active.model = id;
            saveConversations();
        }
        renderModelSelector();
    }

    function renderModelSelector() {
        const model = findModel(state.model);
        els.modelName.textContent = model.name;
        els.modelIcon.innerHTML = getProviderIcon(model.provider);
    }

    // ============================================================
    // RENDER
    // ============================================================

    function renderAll() {
        renderSidebar();
        renderActiveConversation();
        renderModelSelector();
        updateTokens();
    }

    function renderSidebar() {
        const q = (els.sidebarSearch.value || '').trim().toLowerCase();
        const sorted = state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
        const filtered = q ? sorted.filter(c => getConversationTitle(c.messages).toLowerCase().includes(q)) : sorted;

        els.sidebarList.innerHTML = '';

        if (filtered.length === 0) {
            els.sidebarList.innerHTML = `
                <div class="ai-sidebar-empty">
                    <span>${q ? 'No chats match your search.' : 'No conversations yet'}</span>
                </div>
            `;
            return;
        }

        filtered.forEach(c => {
            const item = document.createElement('div');
            item.className = 'ai-sidebar-item' + (c.id === state.activeId ? ' active' : '');
            const title = getConversationTitle(c.messages);
            item.innerHTML = `
                <span class="ai-sidebar-item-text">${escapeHtml(title)}</span>
                <button class="ai-sidebar-item-del" data-id="${c.id}" aria-label="Delete chat">
                    ${icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'width="12" height="12"')}
                </button>
            `;
            item.addEventListener('click', () => selectConversation(c.id));
            item.querySelector('.ai-sidebar-item-del').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(c.id);
            });
            els.sidebarList.appendChild(item);
        });
    }

    function renderActiveConversation() {
        const active = getActive();
        els.messages.innerHTML = '';

        if (!active) {
            els.chatTitle.textContent = 'Greeting';
            renderEmptyState();
            return;
        }

        els.chatTitle.textContent = getConversationTitle(active.messages);

        if (!active.messages.length) {
            renderEmptyState();
            return;
        }

        active.messages.forEach(msg => {
            els.messages.appendChild(buildMessageEl(msg));
        });

        scrollMessagesToBottom();
    }

    function renderEmptyState() {
        const wrap = document.createElement('div');
        wrap.className = 'ai-empty';
        wrap.innerHTML = `
            <div class="ai-empty-greeting">
                <h1>Greetings</h1>
                <p>How can I help?</p>
            </div>
            <div class="ai-suggest-grid"></div>
        `;

        const grid = wrap.querySelector('.ai-suggest-grid');
        SUGGESTIONS.forEach(s => {
            const card = document.createElement('div');
            card.className = 'ai-suggest-card ui-card ui-card--interactive';
            card.textContent = s.title;
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

    // ============================================================
    // MESSAGE ELEMENTS - No avatars, compact bubbles
    // ============================================================

    function buildMessageEl(msg) {
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg ' + msg.role;

        const body = document.createElement('div');
        body.className = 'ai-msg-body';

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.textContent = msg.content;

        body.appendChild(bubble);
        wrap.appendChild(body);
        return wrap;
    }

    function appendTyping() {
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg assistant';
        wrap.innerHTML = `
            <div class="ai-msg-body">
                <div class="ai-msg-bubble ai-typing-bubble">
                    <div class="ai-typing"><span></span><span></span><span></span></div>
                </div>
            </div>
        `;
        els.messages.appendChild(wrap);
        scrollMessagesToBottom();
        return wrap;
    }

    function appendError(message) {
        const wrap = document.createElement('div');
        wrap.className = 'ai-msg assistant';
        wrap.innerHTML = `
            <div class="ai-error-bubble">
                <strong>${escapeHtml(message)}</strong>
                <button class="ai-error-retry">Retry</button>
            </div>
        `;
        wrap.querySelector('.ai-error-retry').addEventListener('click', () => {
            wrap.remove();
            handleSend();
        });
        els.messages.appendChild(wrap);
        scrollMessagesToBottom();
    }

    function scrollMessagesToBottom() {
        setTimeout(() => {
            els.messages.scrollTop = els.messages.scrollHeight;
        }, 10);
    }

    // ============================================================
    // TEXTAREA HANDLERS
    // ============================================================

    function handleTextareaInput() {
        els.textarea.style.height = 'auto';
        els.textarea.style.height = Math.min(els.textarea.scrollHeight, 160) + 'px';
        els.sendBtn.disabled = !els.textarea.value.trim() || isSending;
    }

    function handleTextareaKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    // ============================================================
    // CONVERSATIONS
    // ============================================================

    function createConversation(focus) {
        if (currentStream) {
            clearTimeout(currentStream);
            currentStream = null;
        }
        
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
        renderAll();
        if (focus) setTimeout(() => els.textarea.focus(), 100);
    }

    function selectConversation(id) {
        if (currentStream) {
            clearTimeout(currentStream);
            currentStream = null;
        }
        
        state.activeId = id;
        renderAll();
        setTimeout(() => els.textarea.focus(), 100);
    }

    function deleteConversation(id) {
        state.conversations = state.conversations.filter(c => c.id !== id);
        if (state.activeId === id) {
            state.activeId = state.conversations.length ? state.conversations[0].id : null;
        }
        saveConversations();
        renderAll();
    }

    // ============================================================
    // STREAM MESSAGE (Character by character)
    // ============================================================

    function streamMessage(active, fullReply, typingEl) {
        typingEl.remove();

        const assistantMsg = { role: 'assistant', content: '', ts: Date.now() };
        active.messages.push(assistantMsg);

        const msgEl = buildMessageEl(assistantMsg);
        els.messages.appendChild(msgEl);

        const bubble = msgEl.querySelector('.ai-msg-bubble');
        let currentText = '';
        const chars = fullReply.split('');

        function streamChar() {
            if (chars.length === 0) {
                assistantMsg.content = fullReply;
                active.updatedAt = Date.now();
                saveConversations();
                renderSidebar();
                scrollMessagesToBottom();
                currentStream = null;
                return;
            }

            while (chars.length > 0 && chars[0] === '\n' && currentText === '') {
                chars.shift();
            }

            if (chars.length === 0) {
                assistantMsg.content = fullReply;
                active.updatedAt = Date.now();
                saveConversations();
                renderSidebar();
                scrollMessagesToBottom();
                currentStream = null;
                return;
            }

            currentText += chars.shift();
            bubble.textContent = currentText;
            scrollMessagesToBottom();

            const delay = 5 + Math.random() * 15;
            currentStream = setTimeout(streamChar, delay);
        }

        currentStream = setTimeout(streamChar, 10);
    }

    // ============================================================
    // SEND MESSAGE
    // ============================================================

    async function handleSend() {
        const text = els.textarea.value.trim();
        if (!text || isSending) return;

        if (currentStream) {
            clearTimeout(currentStream);
            currentStream = null;
        }

        let active = getActive();
        if (!active) {
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

        if (els.messages.querySelector('.ai-empty')) {
            els.messages.innerHTML = '';
        }

        const userMsg = { role: 'user', content: text, ts: Date.now() };
        active.messages.push(userMsg);
        active.updatedAt = Date.now();
        saveConversations();

        els.messages.appendChild(buildMessageEl(userMsg));
        scrollMessagesToBottom();

        els.textarea.value = '';
        els.textarea.style.height = 'auto';
        els.sendBtn.disabled = true;
        isSending = true;

        renderSidebar();
        if (els.chatTitle) els.chatTitle.textContent = getConversationTitle(active.messages);

        const apiKey = state.apiKey || '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';

        if (!apiKey) {
            appendError('No API key available. Add your OpenRouter key.');
            isSending = false;
            els.sendBtn.disabled = !els.textarea.value.trim();
            return;
        }

        const typingEl = appendTyping();

        try {
            const payload = {
                model: active.model,
                messages: active.messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                temperature: 0.7,
                max_tokens: 10000,
            };

            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Blur AI',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                typingEl.remove();
                const msg = data?.error?.message || `Request failed (${res.status})`;
                appendError(msg);
                isSending = false;
                els.sendBtn.disabled = !els.textarea.value.trim();
                return;
            }

            const reply = data?.choices?.[0]?.message?.content;
            if (!reply) {
                typingEl.remove();
                appendError('No reply came back.');
                isSending = false;
                els.sendBtn.disabled = !els.textarea.value.trim();
                return;
            }

const tokens = data?.usage?.total_tokens || 0;
addTokens(tokens);

            await streamMessage(active, reply.trim(), typingEl);

        } catch (err) {
            typingEl.remove();
            appendError('Couldn\'t reach the API. Check your connection.');
        }

        isSending = false;
        els.sendBtn.disabled = !els.textarea.value.trim();
    }

    // ============================================================
    // INIT
    // ============================================================

    function init() {
        const panel = document.querySelector('[data-panel="ai"]');
        if (!panel) return;

        loadState();
        buildShell(panel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
