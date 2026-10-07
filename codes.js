// =============================
// CODES / REDEEM SYSTEM
// =============================

(function() {

    const toggle = document.getElementById('redeem-toggle');
    const overlay = document.getElementById('redeem-overlay');
    const closeBtn = document.getElementById('redeem-close');
    const form = document.getElementById('redeem-form');
    const input = document.getElementById('redeem-input');
    const submit = document.getElementById('redeem-submit');
    const status = document.getElementById('redeem-status');

    if (!toggle || !overlay) return;

    // =============================
    // VALID CODES
    // =============================

    const VALID_CODES = {
        'earlyaccess': {
            type: 'theme',
            themeId: 'earlyaccess',
            themeName: 'Early Access',
            themeDesc: 'Exclusive early access theme',
            themeDots: ['#0d0808', '#361c1c', '#ff6b6b'],
            accent: '#ff6b6b'
        },
        'atlasontop': {
            type: 'theme', themeId: 'atlas', themeName: 'Atlas',
            themeDesc: 'atlas on top🔝🔝',
            themeDots: ['#0b0b0b', '#d33b3b', '#f4f4f2'], accent: '#d33b3b'
        },
        'darqmarq': {
            type: 'theme', themeId: 'darqmarq', themeName: 'Darq Marq',
            themeDesc: 'woah darqmarq wow so cool',
            themeDots: ['#000000', '#ffe0b2', '#ff9b62'], accent: '#ff9b62'
        },
        'lalakers': {
            type: 'theme', themeId: 'lalakers', themeName: 'Lakers',
            themeDesc: 'An LA Lakers type theme',
            themeDots: ['#07050b', '#552583', '#FDB927'], accent: '#FDB927'
        },
        'pixelblur': {
            type: 'theme', themeId: 'pixelblur', themeName: 'Pixel Blur',
            themeDesc: 'Compact arcade-inspired controls',
            themeDots: ['#100e0d', '#d6f85b', '#ff795c'], accent: '#d6f85b'
        },
        'nonchalant': {
            type: 'setting',
            settingId: 'nonchalant',
            settingName: 'Nonchalant mode',
            settingDesc: 'A lowercase, slang-forward Blur voice.',
            themeDots: ['#0a0a09', '#242421', '#c9c39a']
        },
        'travelersdomain': {
            type: 'badge',
            badgeId: 'travelersdomain',
            badgeName: "Traveler's Domain",
            badgeDesc: 'A badge for travelers who found their way here.'
        },
    };

    // =============================
    // REDEEMED CODES STORAGE
    // =============================

    const REDEEMED_KEY = 'blur-redeemed-codes';

    function getRedeemedCodes() {
        try {
            return JSON.parse(localStorage.getItem(REDEEMED_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveRedeemedCode(code) {
        const redeemed = getRedeemedCodes();
        if (!redeemed.includes(code)) {
            redeemed.push(code);
            localStorage.setItem(REDEEMED_KEY, JSON.stringify(redeemed));
        }
    }

    function isCodeRedeemed(code) {
        return getRedeemedCodes().includes(code);
    }

    // =============================
    // NONCHALANT MODE (exclusive setting)
    // =============================

    const NONCHALANT_KEY = 'blur-nonchalant-mode';
    const nonchalantOriginals = new WeakMap();
    const nonchalantTransformed = new WeakMap();
    const nonchalantNodes = new Set();
    let nonchalantObserver = null;
    let nonchalantApplying = false;

    const NONCHALANT_REPLACEMENTS = Object.freeze([
        [/\bright now\b/gi, 'rn'],
        [/\byou are\b/gi, 'ur'],
        [/\byou're\b/gi, 'ur'],
        [/\byour\b/gi, 'ur'],
        [/\byou\b/gi, 'u'],
        [/\bare\b/gi, 'r'],
        [/\bplease\b/gi, 'pls'],
        [/\bbecause\b/gi, 'cuz'],
        [/\bsomething\b/gi, 'smth'],
        [/\bpeople\b/gi, 'ppl'],
        [/\bmessage(?:s)?\b/gi, 'msg'],
        [/\bnotifications\b/gi, 'notifs'],
        [/\bprobably\b/gi, 'prob'],
        [/\babout\b/gi, 'abt'],
        [/\bwithout\b/gi, 'w/o'],
        [/\bthough\b/gi, 'tho'],
        [/\breally\b/gi, 'rlly'],
        [/\bright\b/gi, 'fr'],
        [/\bokay\b/gi, 'ok'],
        [/\bthank you\b/gi, 'ty'],
        [/\bthanks\b/gi, 'thx']
    ]);

    function transformNonchalantText(value) {
        let text = String(value ?? '').toLowerCase();
        NONCHALANT_REPLACEMENTS.forEach(([pattern, replacement]) => {
            text = text.replace(pattern, replacement);
        });
        // Add the occasional signature "bro" without making every label or
        // sentence sound identical. A tiny text hash keeps the choice stable
        // across rerenders and reloads.
        if (text.length > 24 && /[.!?]$/.test(text) && !/\bbro[.!?]$/.test(text)) {
            let hash = 0;
            for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
            if (hash % 4 === 0) text = text.replace(/([.!?])$/, ' bro$1');
        }
        return text;
    }

    function nonchalantTextNodeAllowed(node) {
        const parent = node?.parentElement;
        if (!parent) return false;
        return !parent.closest('script, style, textarea, input, select, option, pre, code, [contenteditable="true"]');
    }

    function transformNonchalantNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE || !nonchalantTextNodeAllowed(node)) return;
        if (!nonchalantOriginals.has(node)) nonchalantOriginals.set(node, node.nodeValue);
        nonchalantNodes.add(node);
        const original = nonchalantOriginals.get(node);
        const transformed = transformNonchalantText(original);
        nonchalantTransformed.set(node, transformed);
        if (node.nodeValue !== transformed) {
            nonchalantApplying = true;
            node.nodeValue = transformed;
            nonchalantApplying = false;
        }
    }

    function scanNonchalant(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            transformNonchalantNode(root);
            return;
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) transformNonchalantNode(node);
    }

    function restoreNonchalantText() {
        nonchalantApplying = true;
        nonchalantNodes.forEach(node => {
            if (node.isConnected && nonchalantOriginals.has(node)) node.nodeValue = nonchalantOriginals.get(node);
        });
        nonchalantApplying = false;
        nonchalantNodes.clear();
    }

    function setNonchalantEnabled(enabled) {
        const next = Boolean(enabled);
        try { localStorage.setItem(NONCHALANT_KEY, String(next)); } catch { /* storage may be unavailable */ }
        document.documentElement.classList.toggle('nonchalant-mode', next);
        if (next) {
            scanNonchalant(document.body);
            if (!nonchalantObserver && document.body) {
                nonchalantObserver = new MutationObserver(mutations => {
                    // MutationObserver callbacks can still be queued while the
                    // mode is being turned off. Never re-transform restored
                    // text after the user disables the setting.
                    if (nonchalantApplying || !isNonchalantEnabled()) return;
                    mutations.forEach(mutation => {
                        if (mutation.type === 'characterData') {
                            // A real app update replaces the source text. Keep
                            // that new value as the restore point.
                            if (nonchalantTransformed.get(mutation.target) !== mutation.target.nodeValue) {
                                nonchalantOriginals.set(mutation.target, mutation.target.nodeValue);
                                nonchalantTransformed.delete(mutation.target);
                            }
                            transformNonchalantNode(mutation.target);
                        } else mutation.addedNodes.forEach(scanNonchalant);
                    });
                });
                nonchalantObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
            }
        } else {
            // Stop observing while disabled so restored text stays restored
            // and future UI updates are left untouched until re-enabled.
            if (nonchalantObserver) {
                nonchalantObserver.disconnect();
                nonchalantObserver = null;
            }
            restoreNonchalantText();
        }
        document.dispatchEvent(new CustomEvent('blur-nonchalant-change', { detail: next }));
    }

    function isNonchalantEnabled() {
        try { return localStorage.getItem(NONCHALANT_KEY) === 'true'; } catch { return false; }
    }

    function unlockNonchalantSetting() {
        const row = document.getElementById('settingsNonchalantRow');
        if (row) row.hidden = !isCodeRedeemed('nonchalant');
    }

    // =============================
    // BLUR BACKSTAGE (exclusive reward)
    // =============================

    const BACKSTAGE_BOARD_KEY = 'blur-backstage-board';
    const DEFAULT_BACKSTAGE_BOARD = Object.freeze({
        focus: 'Make the next release feel calmer, faster, and more intentional.',
        next: 'Polish the rough edges users notice first, then ship the smallest useful improvement.',
        later: 'Keep a place for the strange ideas that might become the next great Blur feature.',
        note: 'Small details compound. Keep the useful parts and let the noise fall away.'
    });

    function getBackstageBoard() {
        try {
            const saved = JSON.parse(localStorage.getItem(BACKSTAGE_BOARD_KEY) || '{}');
            return Object.fromEntries(Object.keys(DEFAULT_BACKSTAGE_BOARD).map(key => [
                key,
                typeof saved?.[key] === 'string' && saved[key].trim()
                    ? saved[key].trim().slice(0, 240)
                    : DEFAULT_BACKSTAGE_BOARD[key]
            ]));
        } catch {
            return { ...DEFAULT_BACKSTAGE_BOARD };
        }
    }

    function saveBackstageBoard(board) {
        try { localStorage.setItem(BACKSTAGE_BOARD_KEY, JSON.stringify(board)); } catch { /* local storage may be unavailable */ }
    }

    function canEditBackstage() {
        try {
            const profile = (typeof Account !== 'undefined' && Account.profile)
                || (typeof Chat !== 'undefined' && Chat.profile);
            return typeof Account !== 'undefined' && typeof Permissions !== 'undefined'
                && Permissions.hasRole(profile, 'owner');
        } catch {
            return false;
        }
    }

    function closeBlurArchive() {
        const overlay = document.getElementById('archiveOverlay');
        if (overlay) overlay.classList.remove('open');
    }

    function openBlurArchive() {
        let overlay = document.getElementById('archiveOverlay');
        if (!overlay) {
            overlay = buildArchiveModal();
            document.body.appendChild(overlay);
        }
        overlay.classList.add('open');
    }

    function buildArchiveModal() {
        const overlay = document.createElement('div');
        overlay.id = 'archiveOverlay';
        overlay.className = 'changelog-overlay ui-overlay';

        const changelog = window.blurChangelog || { version: '?', entries: [], devNote: '' };
        const board = getBackstageBoard();

        const shelved = [
            ['Recently Added', 'A Games shelf that was retired when provider dates proved too unreliable.'],
            ['The old Watch player', 'A fixed player frame that gave way to the calmer full-area view.'],
            ['Boxed settings', 'The early card-heavy settings layout before the open-space pass.'],
        ];

        const experiments = [
            ['Chat polish', 'A quieter pass on message actions, attachments, and long-running conversations.', 'in progress'],
            ['Discovery', 'Making the best parts of Blur easier to find without adding more noise.', 'exploring'],
            ['The next little thing', 'A blank slot for the idea that earns its way onto the build board.', 'unwritten'],
        ];

        const fieldNotes = [
            'The best ideas usually start as a tiny detail.',
            'Blur is built in passes: make it work, then make it feel right.',
            'If a feature needs a tour, the interface probably needs another pass.',
            'Keep the useful parts. Let the noise fall away.',
        ];

        const timeline = changelog.entries.length
            ? changelog.entries.map((text, index) =>
                `<div class="backstage-timeline-row"><span class="backstage-timeline-num">${String(index + 1).padStart(2, '0')}</span><span>${text}</span></div>`
            ).join('')
            : '<div class="backstage-empty">The next note is still being written.</div>';

        const shelvedBlock = shelved.map(([title, desc]) =>
            `<div class="backstage-item"><strong>${title}</strong><span>${desc}</span></div>`
        ).join('');

        const experimentsBlock = experiments.map(([title, desc, status]) =>
            `<div class="backstage-experiment"><div><strong>${title}</strong><span>${desc}</span></div><em>${status}</em></div>`
        ).join('');

        const note = fieldNotes[Math.floor(Math.random() * fieldNotes.length)];

        overlay.innerHTML = `
            <div class="changelog-modal backstage-modal ui-dialog">
                <button id="archiveClose" class="changelog-close" aria-label="Close">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <header class="backstage-head">
                    <div class="backstage-kicker">
                        <span class="backstage-kicker-mark"></span>
                        <span>Backstage pass</span>
                        <span class="backstage-build">v${changelog.version}</span>
                    </div>
                    <div class="backstage-title-row">
                        <div>
                            <h2>Inside Blur</h2>
                            <p>A quieter look at the builds, experiments, and decisions behind the surface.</p>
                        </div>
                        <div class="backstage-index" aria-hidden="true">
                            <span>PASS</span>
                            <strong>01</strong>
                        </div>
                    </div>
                </header>

                <div class="backstage-body">
                    <section class="backstage-latest">
                        <div class="backstage-section-heading">
                            <span>01</span>
                            <h3>Latest notes</h3>
                            <i></i>
                        </div>
                        <div class="backstage-timeline">${timeline}</div>
                    </section>

                    <section class="backstage-board-section">
                        <div class="backstage-section-heading">
                            <span>02</span>
                            <h3>Build board</h3>
                            <i></i>
                            ${canEditBackstage() ? '<div class="backstage-edit-actions"><button type="button" class="backstage-edit-btn" data-backstage-edit>Edit board</button><button type="button" class="backstage-edit-btn backstage-edit-cancel" data-backstage-cancel hidden>Cancel</button></div>' : ''}
                        </div>
                        <div class="backstage-board-grid">
                            <article class="backstage-board-card backstage-board-now"><span>Now</span><p data-backstage-value="focus">${escapeHtml(board.focus)}</p></article>
                            <article class="backstage-board-card"><span>Next</span><p data-backstage-value="next">${escapeHtml(board.next)}</p></article>
                            <article class="backstage-board-card"><span>Later</span><p data-backstage-value="later">${escapeHtml(board.later)}</p></article>
                        </div>
                    </section>

                    <div class="backstage-grid">
                        <section class="backstage-card">
                            <div class="backstage-section-heading compact">
                                <span>03</span>
                                <h3>Cutting room floor</h3>
                            </div>
                            <div class="backstage-items">${shelvedBlock}</div>
                        </section>

                        <section class="backstage-card backstage-note-card">
                            <div class="backstage-section-heading compact">
                                <span>04</span>
                                <h3>Field note</h3>
                            </div>
                            <blockquote data-backstage-value="note">“${escapeHtml(board.note || note)}”</blockquote>
                            <span class="backstage-note-caption">from the build desk</span>
                        </section>
                    </div>

                    <section class="backstage-card backstage-experiments-card">
                        <div class="backstage-section-heading compact">
                            <span>05</span>
                            <h3>Experiments in the room</h3>
                        </div>
                        <div class="backstage-experiments">${experimentsBlock}</div>
                    </section>

                    <div class="backstage-meta" aria-label="Backstage pass details">
                        <div><span>Access</span><strong>exclusive unlock</strong></div>
                        <div><span>Workspace</span><strong>editable build board</strong></div>
                        <div><span>Archive</span><strong>Blur / About</strong></div>
                    </div>
                </div>

                <footer class="backstage-footer">
                    <span><b></b> Keep exploring.</span>
                    <span class="backstage-footer-hint">Press Esc to close</span>
                </footer>
            </div>
        `;

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeBlurArchive();
        });
        overlay.querySelector('#archiveClose').addEventListener('click', closeBlurArchive);
        overlay.querySelector('[data-backstage-edit]')?.addEventListener('click', () => toggleBackstageEditor(overlay));
        overlay.querySelector('[data-backstage-cancel]')?.addEventListener('click', () => toggleBackstageEditor(overlay, true));
        document.addEventListener('keydown', function archiveEsc(e) {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                closeBlurArchive();
                document.removeEventListener('keydown', archiveEsc);
            }
        });

        return overlay;
    }

    function toggleBackstageEditor(overlay, cancel = false) {
        if (!overlay || !canEditBackstage()) return;
        const modal = overlay.querySelector('.backstage-modal');
        const edit = overlay.querySelector('[data-backstage-edit]');
        const cancelButton = overlay.querySelector('[data-backstage-cancel]');
        const fields = [...overlay.querySelectorAll('[data-backstage-value]')];
        const editing = modal.classList.contains('is-editing');
        if (editing && !cancel) {
            const board = getBackstageBoard();
            fields.forEach(field => {
                const key = field.dataset.backstageValue;
                const value = field.textContent.replace(/^“|”$/g, '').trim().slice(0, 240);
                if (key && value) board[key] = value;
            });
            saveBackstageBoard(board);
        }
        const nowEditing = cancel ? false : !editing;
        if (cancel) {
            const saved = getBackstageBoard();
            fields.forEach(field => {
                const key = field.dataset.backstageValue;
                if (key && saved[key]) field.textContent = key === 'note' ? `“${saved[key]}”` : saved[key];
            });
        }
        modal.classList.toggle('is-editing', nowEditing);
        fields.forEach(field => {
            field.contentEditable = nowEditing ? 'true' : 'false';
            field.classList.toggle('backstage-editable', nowEditing);
            if (!nowEditing && field.dataset.backstageValue === 'note' && !field.textContent.trim().startsWith('“')) {
                field.textContent = `“${field.textContent.trim()}”`;
            }
        });
        if (edit) edit.textContent = nowEditing ? 'Save board' : 'Edit board';
        if (cancelButton) cancelButton.hidden = !nowEditing;
    }

    // =============================
    // THEME SYSTEM INTEGRATION
    // =============================

    function addCustomTheme(theme) {
        let customThemes = [];
        try {
            customThemes = JSON.parse(localStorage.getItem('blur-custom-themes')) || [];
        } catch {
            customThemes = [];
        }

        const exists = customThemes.some(t => t.id === theme.themeId);
        if (!exists) {
            customThemes.push({
                id: theme.themeId,
                name: theme.themeName,
                desc: theme.themeDesc,
                dots: theme.themeDots,
                accent: theme.accent
            });
            localStorage.setItem('blur-custom-themes', JSON.stringify(customThemes));
        }
    }

    // Keep the selector swatches in sync when a redeemed theme receives a
    // visual refresh. Older browsers may already have the previous palette
    // saved in their custom-theme list.
    try {
        const savedThemes = JSON.parse(localStorage.getItem('blur-custom-themes') || '[]');
        const pixelTheme = savedThemes.find(theme => theme.id === 'pixelblur');
        if (pixelTheme) {
            pixelTheme.dots = ['#100e0d', '#d6f85b', '#ff795c'];
            pixelTheme.accent = '#d6f85b';
            pixelTheme.desc = 'Compact arcade-inspired controls';
            localStorage.setItem('blur-custom-themes', JSON.stringify(savedThemes));
        }
    } catch { /* storage may be unavailable */ }

    function applyThemeViaAttribute(themeId) {
        const html = document.documentElement;

        html.style.removeProperty('--bg');
        html.style.removeProperty('--sidebar');
        html.style.removeProperty('--surface');
        html.style.removeProperty('--surface-2');
        html.style.removeProperty('--surface-3');
        html.style.removeProperty('--accent');
        html.style.removeProperty('--accent-dim');

        html.setAttribute('data-theme', themeId);

        localStorage.setItem('blur-theme', themeId);

        if (window.renderThemeGrids) {
            window.renderThemeGrids();
        }
    }

    // =============================
    // STATUS HELPER
    // =============================

    function setStatus(message, type) {
        status.hidden = false;
        status.className = 'redeem-status ' + type;
        
        // Clear existing content
        status.innerHTML = '';
        
        // Icon
        const icon = document.createElement('span');
        icon.className = 'status-icon';
        
        if (type === 'success') {
            icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        } else if (type === 'error') {
            icon.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else {
            icon.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="4 4"/></svg>`;
        }
        
        status.appendChild(icon);
        status.appendChild(document.createTextNode(' ' + message));
    }

    // =============================
    // OPEN / CLOSE MODAL
    // =============================

    function openModal() {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 200);
        status.hidden = true;
        status.className = 'redeem-status';
        submit.disabled = false;
        submit.classList.remove('loading');
        input.value = '';
    }

    function closeModal() {
        overlay.classList.remove('open');
        status.hidden = true;
        status.className = 'redeem-status';
        submit.disabled = false;
        submit.classList.remove('loading');
        form.reset();
    }

    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    // =============================
    // FORM SUBMISSION
    // =============================

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const code = input.value.trim().toLowerCase();
            
            // Clear previous status
            status.hidden = true;
            
            if (!code) {
                setStatus('Please enter a code.', 'error');
                return;
            }

            submit.disabled = true;
            submit.classList.add('loading');
            setStatus('Checking code...', 'info');

            await new Promise(resolve => setTimeout(resolve, 600));

            const codeData = VALID_CODES[code];

            if (!codeData) {
                setStatus('Invalid code. Please try again.', 'error');
                submit.disabled = false;
                submit.classList.remove('loading');
                return;
            }

            if (isCodeRedeemed(code)) {
                setStatus('This code has already been redeemed.', 'error');
                submit.disabled = false;
                submit.classList.remove('loading');
                return;
            }

            // ===== REDEEM SUCCESS =====

            // Badge rewards are account-bound, so do not mark the code as
            // redeemed locally until Supabase confirms the profile update.
            if (codeData.type === 'badge') {
                if (typeof Account === 'undefined' || !Account.user?.id || typeof Profiles === 'undefined' || typeof Profiles.grantBadge !== 'function') {
                    setStatus('Sign in first to redeem this badge.', 'error');
                    submit.disabled = false;
                    submit.classList.remove('loading');
                    return;
                }
                try {
                    const updated = await Profiles.grantBadge(Account.user.id, codeData.badgeId);
                    Account.setProfile(updated);
                    saveRedeemedCode(code);
                    setStatus(`"${codeData.badgeName}" badge added to your profile!`, 'success');
                    input.value = '';
                    submit.disabled = false;
                    submit.classList.remove('loading');
                    setTimeout(() => closeModal(), 1800);
                } catch (error) {
                    console.error('Badge redemption failed:', error);
                    const detail = String(error?.message || '');
                    const schemaMissing = /badges.*schema cache|column.*badges|could not find the ['\"]badges/i.test(detail);
                    setStatus(schemaMissing
                        ? 'Badge storage is not enabled yet. Run the profile badges migration in Supabase, then try again.'
                        : (detail || 'Could not save that badge right now.'), 'error');
                    submit.disabled = false;
                    submit.classList.remove('loading');
                }
                return;
            }

            saveRedeemedCode(code);

            if (codeData.type === 'setting') {
                setNonchalantEnabled(true);
                unlockNonchalantSetting();
                setStatus(`"${codeData.settingName}" unlocked!`, 'success');
                input.value = '';
                submit.disabled = false;
                submit.classList.remove('loading');
                setTimeout(() => closeModal(), 1800);
                return;
            }

            addCustomTheme(codeData);
            applyThemeViaAttribute(codeData.themeId);

            setStatus(`"${codeData.themeName}" theme unlocked! 🎉`, 'success');
            input.value = '';
            submit.disabled = false;
            submit.classList.remove('loading');

            // Close modal after 2.5 seconds
            setTimeout(() => {
                closeModal();
            }, 2500);
        });
    }

    // =============================
    // EXPOSE FUNCTIONS FOR SETTINGS
    // =============================

    window.redeem = {
        getRedeemedCodes,
        isCodeRedeemed,
        VALID_CODES
    };

    window.blurNonchalant = Object.freeze({
        isUnlocked: () => isCodeRedeemed('nonchalant'),
        isEnabled: isNonchalantEnabled,
        setEnabled: setNonchalantEnabled,
        unlockSettings: unlockNonchalantSetting
    });

    // Restore the reward on every load. The setting remains reversible, while
    // the unlock itself stays tied to the redeemed code.
    setNonchalantEnabled(isNonchalantEnabled());
    unlockNonchalantSetting();

})();
