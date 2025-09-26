// most-used-pomodoro.js
// Renders a simple "Most Used Pomodoro" small card showing percent split between Classic and Reverse pomodoros.
(function(){
  'use strict';

  function getIntFromEl(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const n = parseInt(el.textContent.replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function computeAndRender() {
    const classic = getIntFromEl('user-classic-pomodoros');
    const reverse = getIntFromEl('user-reverse-pomodoros');
    const total = classic + reverse;
    const classicPct = total === 0 ? 0 : Math.round((classic / total) * 10000) / 100; // 2 decimal precision
    const reversePct = total === 0 ? 0 : Math.round((reverse / total) * 10000) / 100;

    const classicEl = document.getElementById('pomodoro-classic-percent');
    const reverseEl = document.getElementById('pomodoro-reverse-percent');

    if (classicEl) classicEl.textContent = `${classicPct}%`;
    if (reverseEl) reverseEl.textContent = `${reversePct}%`;

    // Accessibility: update aria-labels
    const card = document.getElementById('pomodoro-usage-card');
    if (card) {
      card.setAttribute('aria-label', `Most used pomodoro: classic ${classicPct} percent, reverse ${reversePct} percent`);
    }

    // Update segmented bar widths directly on segment elements for accurate visuals
    const segClassic = document.getElementById('pomodoro-segment-classic');
    const segReverse = document.getElementById('pomodoro-segment-reverse');
    if (segClassic && segReverse) {
      const c = Number.isFinite(classicPct) ? classicPct : 0;
      let cFixed = Math.round(c * 100) / 100;
      cFixed = Math.max(0, Math.min(100, cFixed));
      // Compute reverse as remaining to avoid rounding gaps
      let rFixed = Math.round((100 - cFixed) * 100) / 100;
      rFixed = Math.max(0, Math.min(100, rFixed));

      if (total === 0) {
        segClassic.style.width = '0%';
        segReverse.style.width = '0%';
        segClassic.classList.add('zero');
        segReverse.classList.add('zero');
      } else {
        segClassic.style.width = `${cFixed}%`;
        segReverse.style.width = `${rFixed}%`;
        // toggle zero class so tiny segments are visually hidden if 0
        segClassic.classList.toggle('zero', cFixed === 0);
        segReverse.classList.toggle('zero', rFixed === 0);
      }

      const desc = document.getElementById('pomodoro-segmented-desc');
      if (desc) desc.textContent = `Classic ${cFixed}% — Reverse ${rFixed}%`;
    }
  }

  // Listen for events that indicate totals may have changed
  document.addEventListener('DOMContentLoaded', () => {
    // Compute once at load
    computeAndRender();

    // Observe changes to the totals' textContent in case other scripts update them directly
    const classicNode = document.getElementById('user-classic-pomodoros');
    const reverseNode = document.getElementById('user-reverse-pomodoros');

    if (classicNode || reverseNode) {
      const obs = new MutationObserver(() => computeAndRender());
      if (classicNode) obs.observe(classicNode, { childList: true, characterData: true, subtree: true });
      if (reverseNode) obs.observe(reverseNode, { childList: true, characterData: true, subtree: true });
    }

    // Also listen for custom events from user-stats or other modules
    ['statsUpdated','contributionUpdated','pomodoroComplete','reverseComplete','sessionComplete','authStateChanged'].forEach(evt => {
      document.addEventListener(evt, () => {
        // small timeout to let other handlers update counts
        setTimeout(computeAndRender, 60);
      });
    });

    // Expose for manual refresh
    window.refreshMostUsedPomodoro = computeAndRender;
  });
})();
