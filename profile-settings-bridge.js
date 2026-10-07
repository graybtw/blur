/*
 * Profile settings bootstrap.
 *
 * Settings is intentionally a large, cacheable bundle. This small bridge
 * keeps the profile destination available while an older cached Settings
 * bundle is being replaced, and safely becomes a no-op when the main bundle
 * already exported the same helpers.
 */
(function () {
  const panel = document.querySelector('[data-panel="settings"]');
  if (!panel) return;

  // Older cached Settings bundles can contain the Profile tab without the
  // editor destination. Recreate that small destination instead of silently
  // leaving the tab blank.
  let profilePage = panel.querySelector('.settings-page[data-page="profile"]');
  if (!profilePage) {
    profilePage = document.createElement('div');
    profilePage.className = 'settings-page';
    profilePage.dataset.page = 'profile';
    panel.querySelector('.settings-scroll')?.append(profilePage);
  }

  let shell = profilePage.querySelector('.profile-settings-shell');
  if (!shell) {
    shell = document.createElement('div');
    shell.className = 'profile-settings-shell profile-settings-v2';
    profilePage.append(shell);
  }
  shell.classList.add('profile-settings-v2');

  // A stale Settings bundle can recreate the Profile shell without the
  // editor host. Keep this compatibility path focused on the editor only;
  // Profile Effects are managed directly inside Profile Settings now.
  // Profile is a single Settings destination now; remove stale subtabs from
  // older cached markup instead of recreating them.
  shell.querySelector('.profile-settings-subtabs')?.remove();

  let host = shell.querySelector('#settings-profile-editor');
  if (!host) {
    host = document.createElement('div');
    host.id = 'settings-profile-editor';
    host.className = 'profile-settings-editor';
    shell.append(host);
  }

  const buttons = [...panel.querySelectorAll('.settings-tabs button')];
  const pages = [...panel.querySelectorAll('.settings-page')];
  const title = panel.querySelector('#settings-page-title');
  const subtitle = panel.querySelector('#settings-page-subtitle');
  const meta = {
    appearance: ['Appearance', 'Tune the look and feel of Blur. Changes apply instantly and are saved on this device.'],
    config: ['Config', 'Set how Blur behaves, then manage the data saved on this device.'],
    profile: ['Profile settings', 'Customize how people see you across Blur.'],
    'settings-privacy': ['Privacy', 'Keep Blur quiet, private, and under your control.'],
    about: ['About', 'A little context about Blur and the people behind it.']
  };

  function currentAccount() {
    return typeof Account !== 'undefined' ? Account : null;
  }

  function currentAccountUI() {
    return typeof AccountUI !== 'undefined' ? AccountUI : null;
  }

  function renderProfileEditor() {
    const profilePage = panel.querySelector('.settings-page[data-page="profile"]');
    // Account/profile events can arrive while the user is on another main
    // tab or another Settings page. Never remount the inline editor into a
    // surface that is not currently visible.
    if (!panel.classList.contains('active') || !profilePage?.classList.contains('active')) {
      const active = currentAccountUI()?.activeEditor;
      if (active?.root && host.contains(active.root)) active.attemptClose();
      return;
    }
    const account = currentAccount();
    const ui = currentAccountUI();
    if (!account?.user || !account.profile || !ui?.renderProfileEditor) {
      const signedIn = Boolean(account?.user);
      const message = signedIn
        ? (account?.profileError || 'Your profile is still loading. Try again in a moment.')
        : 'Your profile settings will appear here after you sign in.';
      host.innerHTML = `<div class="settings-profile-empty"><strong>${signedIn ? 'Profile settings unavailable' : 'Sign in to customize your profile.'}</strong><span>${message.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</span>${signedIn ? '<button type="button" class="small-button ui-button ui-button--secondary ui-button--sm" data-profile-retry>Try again</button>' : '<button type="button" class="small-button ui-button ui-button--primary ui-button--sm" data-profile-signin>Sign in</button>'}</div>`;
      host.querySelector('[data-profile-signin]')?.addEventListener('click', () => currentAccountUI()?.openAuthOverlay?.('signin'));
      host.querySelector('[data-profile-retry]')?.addEventListener('click', () => account?.retryProfile?.());
      window.BlurCosmetics?.mountProfileSettings?.(host, account?.profile);
      return;
    }
    if (ui.activeEditor?.root && host.contains(ui.activeEditor.root)) return;
    host.replaceChildren();
    ui.renderProfileEditor(host, account.profile, {
      inline: true,
      onSaved: (updated) => account.setProfile?.(updated),
      onCancel: () => {}
    });
    window.BlurCosmetics?.mountProfileSettings?.(host, account.profile);
  }

  // Keep the destination useful even if the auth service initializes after
  // Settings. The main renderer replaces this placeholder as soon as account
  // state is available.
  if (!host.querySelector('.settings-profile-empty')) {
    host.innerHTML = '<div class="settings-profile-empty" data-profile-loading><strong>Profile settings</strong><span>Loading your profile settings…</span></div>';
  }

  function localActivate(target = 'appearance') {
    const next = buttons.some((button) => button.dataset.tab === target) ? target : 'appearance';
    buttons.forEach((button) => {
      const active = button.dataset.tab === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    pages.forEach((page) => page.classList.toggle('active', page.dataset.page === next));
    const copy = meta[next];
    if (copy) {
      title?.replaceChildren(document.createTextNode(copy[0]));
      subtitle?.replaceChildren(document.createTextNode(copy[1]));
    }
    if (next === 'profile') requestAnimationFrame(renderProfileEditor);
  }

  const baseActivate = window.activateSettingsTab || localActivate;
  const activate = (target = 'appearance') => {
    baseActivate(target);
    const next = buttons.some((button) => button.dataset.tab === target) ? target : 'appearance';
    // Also update a page that this bridge had to recreate for an older
    // cached Settings bundle; the original activator may not have captured it.
    profilePage.classList.toggle('active', next === 'profile');
    if (next === 'profile') requestAnimationFrame(renderProfileEditor);
  };
  window.activateSettingsTab = activate;
  // Always replace a renderer captured by an older cached Settings bundle.
  // That renderer may have closed over a missing editor host and otherwise
  // remains a silent no-op even after this bridge recreates the host.
  window.renderProfileSettingsEditor = renderProfileEditor;
  window.openProfileSettings = function () {
    if (typeof window.goToTab === 'function') window.goToTab('settings');
    activate('profile');
    requestAnimationFrame(renderProfileEditor);
  };

  buttons.forEach((button) => {
    if (button.dataset.profileBridgeBound) return;
    button.dataset.profileBridgeBound = 'true';
    button.addEventListener('click', () => {
      const ui = currentAccountUI();
      const editor = ui?.activeEditor;
      if (button.dataset.tab !== 'profile' && editor && !editor.attemptClose()) return;
      activate(button.dataset.tab);
      if (button.dataset.tab === 'profile') requestAnimationFrame(renderProfileEditor);
    });
  });

  currentAccount()?.onAuthStateChange?.(() => renderProfileEditor());
  currentAccount()?.onProfileChange?.(() => renderProfileEditor());
})();
