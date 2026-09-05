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
        }
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

            saveRedeemedCode(code);
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

})();