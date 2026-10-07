(() => {
  const STORAGE_KEY = "blur-responsible-use-v1";

  function getOverlay() {
    return document.getElementById("responsible-use-overlay");
  }

  function closeWelcome({ remember = true } = {}) {
    const overlay = getOverlay();
    if (!overlay) return;
    if (remember) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (error) {}
    }
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => { overlay.hidden = true; }, 180);
  }

  function openWelcome() {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => overlay.classList.add("open"));
  }

  function goToPolicy(event) {
    event.preventDefault();
    const target = event.currentTarget.dataset.welcomeTab;
    closeWelcome();
    if (target && typeof window.goToTab === "function") window.goToTab(target);
  }

  window.blurResponsibleUse = {
    open: openWelcome,
    close: closeWelcome,
    storageKey: STORAGE_KEY
  };

  document.addEventListener("DOMContentLoaded", () => {
    const overlay = getOverlay();
    if (!overlay) return;

    overlay.querySelector("[data-responsible-use-continue]")?.addEventListener("click", () => closeWelcome());
    overlay.querySelectorAll("[data-welcome-tab]").forEach(link => link.addEventListener("click", goToPolicy));

    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") openWelcome();
    } catch (error) {
      openWelcome();
    }
  });
})();
