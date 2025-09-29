/* js/database-achievements.js
   Minimal manual achievements store and loader.
   - Only shows badges for user named "Yabs" (case-insensitive)
   - Shows a friendly fallback when no user is available (not logged in)
   - Keeps leaderboard logic untouched
*/

(function () {
  'use strict';

  // Hard-coded achievements map (keyed by normalized username OR email)
  // You can extend this map to add badges for other users.
  const hardcodedAchievements = {
    // Support both username 'yabs' and email 'yabs@gmail.com'
    'yabs': [
      { title: 'Streak Legend', icon: 'images/badges/sept_streak.png', description: 'Honored for holding the longest streak in September.', date: '2025-10-01' },
      { title: 'Overall Champion', icon: 'images/badges/sept_champion.png', description: 'Awarded for being the top overall performer with the highest average across all categories in September.', date: '2025-10-01' }
    ],
    'yabs@gmail.com': [
      { title: 'Streak Legend', icon: 'images/badges/sept_streak.png', description: 'Honored for holding the longest streak in September.', date: '2025-10-01' },
      { title: 'Overall Champion', icon: 'images/badges/sept_champion.png', description: 'Awarded for being the top overall performer with the highest average across all categories in September.', date: '2025-10-01' }
    ],
    'Sza': [
      { title: 'Session Master', icon: 'images/badges/sept_session.png', description: 'Recognized for completing the most sessions in September.', date: '2025-10-01' }
    ],    
    'test6@example.com': [
      { title: 'Session Master', icon: 'images/badges/sept_session.png', description: 'Recognized for completing the most sessions in September.', date: '2025-10-01' }
    ],
    'Clari': [
      { title: 'Focus King', icon: 'images/badges/sept_focus_points.png', description: 'Crowned for earning the highest Focus Points in September.', date: '2025-10-01' }
    ],    
    'clarissuhpascual@gmail.com': [
      { title: 'Focus King', icon: 'images/badges/sept_focus_points.png', description: 'Crowned for earning the highest Focus Points in September.', date: '2025-10-01' }
    ]
    // Add other users here, e.g.
    // 'bananasaurus': [{ title: 'Early Bird', icon: 'images/badges/early_bird.png', description: 'Woke up early to focus', date: '2025-09-01' }]
  };

  // Keep email mirror in sync for the default Yabs entries
  if (
    hardcodedAchievements['yabs'] &&
    hardcodedAchievements['yabs'].length &&
    (!hardcodedAchievements['yabs@gmail.com'] || hardcodedAchievements['yabs@gmail.com'].length === 0)
  ) {
    hardcodedAchievements['yabs@gmail.com'] = hardcodedAchievements['yabs'].slice();
  }

  // Robust identity normalization helper (reused by loader and API).
  // Accepts a string (username/email) or object with common identity fields
  // and always returns a lowercase trimmed key suitable for hardcodedAchievements.
  function normalizeIdentity(u) {
    if (!u && u !== 0) return null;
    // plain string
    if (typeof u === 'string') {
      const s = u.trim();
      return s ? s.toLowerCase() : null;
    }
    // common object shapes: { email, username, user, name, displayName, fullName }
    const candidates = ['email', 'username', 'user', 'name', 'displayName', 'fullName'];
    for (let i = 0; i < candidates.length; i++) {
      const k = candidates[i];
      if (u[k]) {
        try {
          const v = String(u[k]).trim().toLowerCase();
          if (v) return v;
        } catch (e) {
          // ignore and continue
        }
      }
    }
    // fallback: if object has id-like property
    if (u.id) try { return String(u.id).trim().toLowerCase(); } catch (e) {}
    return null;
  }

  function createBadgeEl(badge) {
    const wrap = document.createElement('div');
    wrap.className = 'badge';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');

    const img = document.createElement('img');
    img.className = 'badge-icon';
    img.src = badge.icon;
    img.alt = badge.title;
    // For now render only the badge image; textual details will be shown
    // in a modal later. Keep alt/title for accessibility.
    img.title = badge.title;
    wrap.appendChild(img);
    // store metadata for modal (safe, non-exposed index)
    if (badge && badge.title) wrap.dataset.badgeTitle = badge.title;
    if (badge && badge.description) wrap.dataset.badgeDesc = badge.description;
    if (badge && badge.date) wrap.dataset.badgeDate = badge.date;
    return wrap;
  }

  /* ---------- Modal Implementation ---------- */
  let modalEl = null;

  function createModalIfNeeded() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'badge-modal-overlay';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="badge-modal" role="dialog" aria-modal="true" aria-label="Badge details">
        <button class="badge-modal-close" aria-label="Close badge dialog">×</button>
        <div class="badge-modal-banner">
          <img class="badge-modal-icon" src="" alt="" />
        </div>
        <div class="badge-modal-body">
          <h2 class="badge-modal-title"></h2>
          <p class="badge-modal-desc"></p>
          <p class="badge-modal-date"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // event listeners
    modalEl.querySelector('.badge-modal-close').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (!modalEl) return;
      if (e.key === 'Escape' && modalEl.getAttribute('aria-hidden') === 'false') closeModal();
    });

    return modalEl;
  }

  function openModal({ icon, title, description, date }) {
    const el = createModalIfNeeded();
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('open');
    const img = el.querySelector('.badge-modal-icon');
    img.src = icon || '';
    img.alt = title || '';
    el.querySelector('.badge-modal-title').textContent = title || '';
    el.querySelector('.badge-modal-desc').textContent = description || '';
    const dateText = date ? formatDateLocal(date) : 'Unlocked: Unknown';
    el.querySelector('.badge-modal-date').textContent = date ? `Unlocked on ${dateText}` : dateText;
    // Per-badge banner color mapping (use majority badge color as header)
    const banner = el.querySelector('.badge-modal-banner');
    const body = el.querySelector('.badge-modal-body');
    const bannerColors = {
      'Focus King': '#FB2A1B',
      'Session Master': '#46648E',
      'Streak Legend': '#FEB713',
      'Overall Champion': '#18B4A0' // teal/green for champion
    };

    // Apply banner color when available; otherwise let CSS default (reset inline style)
    if (title && bannerColors[title]) {
      // Use a subtle gradient from the chosen color to a slightly darker tone for depth
      const base = bannerColors[title];
      banner.style.background = base;
    } else {
      banner.style.background = '';
    }

    // For Streak Legend specifically, keep the description/body background as #141414 per request
    if (title === 'Streak Legend') {
      body.style.background = '#141414';
    } else {
      body.style.background = '';
    }
    // trap focus on open
    setTimeout(() => {
      const closeBtn = el.querySelector('.badge-modal-close');
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('open');
  }

  function formatDateLocal(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }


  function showNoLogin(container) {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'no-badge';
    p.textContent = 'Sign in to view achievements 🏅';
    container.appendChild(p);
  }

  function showNoBadges(container) {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'no-badge';
    p.textContent = 'No badges collected yet 🏅. Aim for the monthly leaderboard to unlock one!';
    container.appendChild(p);
  }

  function loadAchievements(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Resolve current user conservatively and robustly:
    // 1. Try window.authService.getCurrentUser() (object with username/email)
    // 2. Try window.currentUser (can be a string or object)
    // 3. null => show sign-in fallback
    let userObj = null;
    try {
      if (window.authService && typeof window.authService.getCurrentUser === 'function') {
        userObj = window.authService.getCurrentUser();
      } else if (window.authService && typeof window.authService.getUser === 'function') {
        // older API fallback
        userObj = window.authService.getUser();
      }
    } catch (e) {
      // ignore
    }

    if (!userObj && window.currentUser) {
      userObj = window.currentUser;
    }

    // Final UI fallback: if the page renders a user name in the header, try to use it.
    // This covers the case where `js/user-stats.js` updates the visible title like "Yabs".
    if (!userObj) {
      try {
        const el = document.getElementById('user-stats-title') || document.querySelector('.user-stats-title');
        if (el && el.textContent) {
          const txt = el.textContent.trim();
          // ignore generic labels like "User's Stats" or "My Stats :"
          const lower = txt.toLowerCase();
          if (txt && !/stats|my stats|user's stats|my stats:/.test(lower)) {
            userObj = txt;
          }
        }
      } catch (e) {
        // ignore DOM access failures
      }
    }

    if (!userObj) {
      showNoLogin(container);
      return;
    }

    // Normalize identity key (prefer email if available) using shared helper
    const identityKey = normalizeIdentity(userObj);

    if (!identityKey) {
      showNoLogin(container);
      return;
    }

    // Get badges for this identity (support username or email keys)
    const badges = hardcodedAchievements[identityKey] || [];

    if (!badges || !Array.isArray(badges) || badges.length === 0) {
      showNoBadges(container);
      return;
    }

    // Render badges for this user
    container.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'badges-row';

    badges.forEach(b => {
      const badgeEl = createBadgeEl(b);
      // add click handler to open modal with metadata
      badgeEl.addEventListener('click', () => openModal(b));
      badgeEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(b); });
      row.appendChild(badgeEl);
    });

    container.appendChild(row);
  }

  // Runtime API: add a hard-coded badge for a user (username or email)
  window.addAchievementForUser = function (identity, badge) {
    if (!identity || !badge) return false;
    const key = normalizeIdentity(identity);
    if (!key) return false;
    if (!hardcodedAchievements[key]) hardcodedAchievements[key] = [];
    hardcodedAchievements[key].push(badge);
    return true;
  };

  // Expose a safe global function for inline init
  window.loadAchievements = loadAchievements;
})();
