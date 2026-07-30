/* =========================================================
   preview.js
   The overall "turned to the right" tilt on .preview is a
   fixed resting pose set in preview.css — this script doesn't
   touch it. Instead, each individual .game card gets its own
   local tilt that follows the cursor while it's hovered,
   like a stack of physical tiles you can nudge one at a time.
   ========================================================= */

(() => {

  const cards = document.querySelectorAll(".game");
  if (!cards.length) return;

  const MAX_TILT = 16;   // degrees of rotation at the card's edge
  const POP_Y = -4;      // px lift toward the viewer
  const POP_Z = 34;      // px pop out of the tilted wall
  const POP_SCALE = 1.05;

  cards.forEach(card => {

    let raf = null;

    function applyTilt(clientX, clientY) {

      const rect = card.getBoundingClientRect();

      const px = (clientX - rect.left) / rect.width;   // 0 -> 1
      const py = (clientY - rect.top) / rect.height;    // 0 -> 1

      const dx = Math.min(1, Math.max(0, px)) * 2 - 1;  // -1 -> 1
      const dy = Math.min(1, Math.max(0, py)) * 2 - 1;  // -1 -> 1

      const ry = dx * MAX_TILT;
      const rx = -dy * MAX_TILT;

      card.style.transform =
        `translateY(${POP_Y}px) translateZ(${POP_Z}px) scale(${POP_SCALE}) ` +
        `rotateX(${rx}deg) rotateY(${ry}deg)`;

    }

    card.addEventListener("mousemove", (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyTilt(e.clientX, e.clientY));
    });

    card.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "";
    });

  });

})();