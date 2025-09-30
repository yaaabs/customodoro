/* js/database-achievements.js
   Enhanced with mobile-first full-screen modal and swipe navigation
*/

(function () {
  'use strict';

  // Hard-coded achievements map
  const hardcodedAchievements = {

    'yabs@gmail.com': [
      { title: 'Streak Legend', icon: 'images/badges/sept_streak.png', description: 'Honored for holding the longest streak in September.', date: '2025-10-01' },
      { title: 'Overall Champion', icon: 'images/badges/sept_champion.png', description: 'Awarded for being the top overall performer with the highest average across all categories in September.', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/3-Day Streak.png', description: 'Unlocked a 3-day streak — keep the momentum going!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/5-Day Streak.png', description: 'Unlocked a 5-day streak — great consistency!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/8-Day Streak.png', description: 'Unlocked an 8-day streak — impressive dedication!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/10-Day Streak.png', description: 'Unlocked a 10-day streak — double digits achievement!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/15-Day Streak.png', description: 'Unlocked a 15-day streak — outstanding persistence!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/20-Day Streak.png', description: 'Unlocked a 20-day streak — consistency is paying off!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/25-Day Streak.png', description: 'Unlocked a 25-day streak — phenomenal focus!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/30-Day Streak.png', description: 'Unlocked a 30-day streak — a month of steady progress!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/35-Day Streak.png', description: 'Unlocked a 35-day streak — incredible dedication!', date: '2025-10-01' },
      { title: 'Streak', icon: 'images/badges/Streak/50-Day Streak.png', description: 'Unlocked a 50-day streak — legendary commitment!', date: '2025-10-01' },      
    ], 
    
    'test6@example.com': [
      { title: 'Session Master', icon: 'images/badges/sept_session.png', description: 'Recognized for completing the most sessions in September.', date: '2025-10-01' }
    ],
  
    'clarissuhpascual@gmail.com': [
      { title: 'Focus King', icon: 'images/badges/sept_focus_points.png', description: 'Crowned for earning the highest Focus Points in September.', date: '2025-10-01' }
    ]
  };

  // Ensure username <-> email aliases exist for hardcoded entries
  // If a key contains an '@', also create a local-part alias (e.g. 'yabs@gmail.com' -> 'yabs')
  Object.keys(hardcodedAchievements).forEach((k) => {
    try {
      if (typeof k === 'string' && k.indexOf('@') !== -1) {
        const local = k.split('@')[0].trim().toLowerCase();
        if (local && !hardcodedAchievements[local]) {
          // copy array shallowly to avoid shared mutation issues
          hardcodedAchievements[local] = hardcodedAchievements[k].slice();
        }
      }
    } catch (e) {
      // ignore malformed keys
    }
  });

  function normalizeIdentity(u) {
    if (!u && u !== 0) return null;
    if (typeof u === 'string') {
      const s = u.trim();
      return s ? s.toLowerCase() : null;
    }
    const candidates = ['email', 'username', 'user', 'name', 'displayName', 'fullName'];
    for (let i = 0; i < candidates.length; i++) {
      const k = candidates[i];
      if (u[k]) {
        try {
          const v = String(u[k]).trim().toLowerCase();
          if (v) return v;
        } catch (e) {}
      }
    }
    if (u.id) try { return String(u.id).trim().toLowerCase(); } catch (e) {}
    return null;
  }

  function createBadgeEl(badge, index) {
    const wrap = document.createElement('div');
    wrap.className = 'badge';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');

    const img = document.createElement('img');
    img.className = 'badge-icon';
    img.src = badge.icon;
    img.alt = badge.title;
    img.title = badge.title;
    wrap.appendChild(img);
    
    wrap.dataset.badgeIndex = index;
    wrap.dataset.badgeTitle = badge.title;
    wrap.dataset.badgeDesc = badge.description;
    wrap.dataset.badgeDate = badge.date;
    
    return wrap;
  }

  /* ---------- Enhanced Mobile Modal Implementation ---------- */
  let modalEl = null;
  let currentBadges = [];
  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let isDragging = false;

  function createModalIfNeeded() {
    if (modalEl) return modalEl;
    
    modalEl = document.createElement('div');
    modalEl.className = 'badge-modal-overlay';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="badge-modal-fullscreen" role="dialog" aria-modal="true" aria-label="Badge details">
        <button class="badge-modal-close" aria-label="Close badge dialog">×</button>
        <div class="badge-modal-container">
          <div class="badge-modal-content">
            <div class="badge-modal-banner">
              <img class="badge-modal-icon" src="" alt="" />
            </div>
            <div class="badge-modal-body">
              <h2 class="badge-modal-title"></h2>
              <p class="badge-modal-desc"></p>
              <p class="badge-modal-date"></p>
            </div>
          </div>
        </div>
        <div class="badge-modal-dots"></div>
      </div>
    `;
    
    // Inject styles
    injectStyles();
    
    document.body.appendChild(modalEl);

    // Event listeners
    const closeBtn = modalEl.querySelector('.badge-modal-close');
    closeBtn.addEventListener('click', closeModal);
    
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });
    
    document.addEventListener('keydown', handleKeydown);
    
    // Touch events for swipe
    const container = modalEl.querySelector('.badge-modal-container');
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return modalEl;
  }

  function injectStyles() {
    if (document.getElementById('badge-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'badge-modal-styles';
    style.textContent = `
      .badge-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      
      .badge-modal-overlay.open {
        opacity: 1;
        visibility: visible;
      }
      
      .badge-modal-fullscreen {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .badge-modal-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 32px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        transition: background 0.2s ease;
      }
      
      .badge-modal-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .badge-modal-container {
        width: 100%;
        max-width: 500px;
        height: auto;
        max-height: 80vh;
        touch-action: pan-y;
        overflow: hidden;
      }
      
      .badge-modal-content {
        width: 100%;
        background: #1a1a1a;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        transition: transform 0.3s ease;
      }
      
      .badge-modal-content.swipe-left {
        transform: translateX(-100px);
        opacity: 0.5;
      }
      
      .badge-modal-content.swipe-right {
        transform: translateX(100px);
        opacity: 0.5;
      }
      
      .badge-modal-banner {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 60px 20px 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .badge-modal-icon {
        width: 180px;
        height: 180px;
        object-fit: contain;
        filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3));
      }
      
      .badge-modal-body {
        padding: 30px 24px;
        background: #141414;
        color: white;
      }
      
      .badge-modal-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 16px 0;
        color: white;
      }
      
      .badge-modal-desc {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 20px 0;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .badge-modal-date {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
      }
      
      .badge-modal-dots {
        display: flex;
        gap: 8px;
        margin-top: 24px;
        justify-content: center;
      }
      
      .badge-modal-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
      }
      
      .badge-modal-dot.active {
        background: white;
        width: 24px;
        border-radius: 4px;
      }
      
      @media (max-width: 768px) {
        .badge-modal-fullscreen {
          padding: 0;
        }
        
        .badge-modal-container {
          max-width: 100%;
          max-height: 100vh;
        }
        
        .badge-modal-content {
          border-radius: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .badge-modal-banner {
          flex: 0 0 auto;
          padding: 80px 20px 60px;
        }
        
        .badge-modal-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .badge-modal-close {
          top: 16px;
          right: 16px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  function handleTouchStart(e) {
    if (currentBadges.length <= 1) return;
    touchStartX = e.touches[0].clientX;
    isDragging = true;
  }

  function handleTouchMove(e) {
    if (!isDragging || currentBadges.length <= 1) return;
    
    touchEndX = e.touches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    const content = modalEl.querySelector('.badge-modal-content');
    
    if (Math.abs(diff) > 10) {
      e.preventDefault();
      
      if (diff > 0) {
        content.classList.add('swipe-right');
        content.classList.remove('swipe-left');
      } else {
        content.classList.add('swipe-left');
        content.classList.remove('swipe-right');
      }
    }
  }

  function handleTouchEnd() {
    if (!isDragging || currentBadges.length <= 1) return;
    
    const diff = touchEndX - touchStartX;
    const threshold = 50;
    
    const content = modalEl.querySelector('.badge-modal-content');
    content.classList.remove('swipe-left', 'swipe-right');
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) {
        // Swipe right - previous badge
        showBadgeAtIndex(currentIndex - 1);
      } else if (diff < 0 && currentIndex < currentBadges.length - 1) {
        // Swipe left - next badge
        showBadgeAtIndex(currentIndex + 1);
      }
    }
    
    isDragging = false;
    touchStartX = 0;
    touchEndX = 0;
  }

  function handleKeydown(e) {
    if (!modalEl || modalEl.getAttribute('aria-hidden') === 'true') return;
    
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      showBadgeAtIndex(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < currentBadges.length - 1) {
      showBadgeAtIndex(currentIndex + 1);
    }
  }

  function openModal(badges, startIndex = 0) {
    currentBadges = badges;
    currentIndex = startIndex;
    
    const el = createModalIfNeeded();
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('open');
    
    showBadgeAtIndex(currentIndex);
    updateDots();
    
    // Focus close button
    setTimeout(() => {
      const closeBtn = el.querySelector('.badge-modal-close');
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  function showBadgeAtIndex(index) {
    if (index < 0 || index >= currentBadges.length) return;
    
    currentIndex = index;
    const badge = currentBadges[index];
    
    const el = modalEl;
    const img = el.querySelector('.badge-modal-icon');
    img.src = badge.icon || '';
    img.alt = badge.title || '';
    
    el.querySelector('.badge-modal-title').textContent = badge.title || '';
    el.querySelector('.badge-modal-desc').textContent = badge.description || '';
    
    const dateText = badge.date ? formatDateLocal(badge.date) : 'Unlocked: Unknown';
    el.querySelector('.badge-modal-date').textContent = badge.date ? `Unlocked on ${dateText}` : dateText;
    
    // Apply banner color
    const banner = el.querySelector('.badge-modal-banner');
    const body = el.querySelector('.badge-modal-body');
    const bannerColors = {
      'Focus King': '#FB2A1B',
      'Session Master': '#46648E',
      'Streak Legend': '#FEB713',
      'Overall Champion': '#18B4A0'
    };

    if (badge.title && bannerColors[badge.title]) {
      banner.style.background = bannerColors[badge.title];
    } else {
      // For streak badges, compute a gold gradient based on day count
      if (badge.title === 'Streak') {
        // try to extract days from icon filename first, fallback to description
        let days = null;
        try {
          const m = /([0-9]{1,3})\s*-?\s*Day/i.exec(badge.icon || '') || /([0-9]{1,3})\s*-?\s*Day/i.exec(badge.description || '');
          if (m && m[1]) days = parseInt(m[1], 10);
        } catch (e) { days = null; }
        if (!days) days = 3; // default
        const cols = streakGoldColorsFor(days);
        banner.style.background = `linear-gradient(135deg, ${cols.base} 0%, ${cols.dark} 100%)`;
      } else {
        banner.style.background = '';
      }
    }

    if (badge.title === 'Streak Legend') {
      body.style.background = '#141414';
    } else {
      body.style.background = '';
    }
    
    updateDots();
  }

  function updateDots() {
    if (!modalEl) return;
    
    const dotsContainer = modalEl.querySelector('.badge-modal-dots');
    dotsContainer.innerHTML = '';
    
    if (currentBadges.length <= 1) {
      dotsContainer.style.display = 'none';
      return;
    }
    
    dotsContainer.style.display = 'flex';
    
    currentBadges.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = 'badge-modal-dot';
      if (idx === currentIndex) {
        dot.classList.add('active');
      }
      dotsContainer.appendChild(dot);
    });
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('open');
    currentBadges = [];
    currentIndex = 0;
  }

  function formatDateLocal(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  // Helpers to compute gold shades for streak badges
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
  }
  function rgbToHex(r,g,b) {
    const toHex = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function interpHex(a, b, t) {
    const ra = hexToRgb(a), rb = hexToRgb(b);
    const r = ra[0] + (rb[0]-ra[0]) * t;
    const g = ra[1] + (rb[1]-ra[1]) * t;
    const bl = ra[2] + (rb[2]-ra[2]) * t;
    return rgbToHex(r,g,bl);
  }
  // More perceptually-distinct gold steps for streak badges.
  // Use a discrete mapping keyed to the common badge days so nearby badges are easier to distinguish.
  function hslToRgb(h, s, l) {
    // h: 0-360, s/l: 0-1
    const c = (1 - Math.abs(2*l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
    else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
    else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
    else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
    else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const m = l - c/2;
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function streakGoldColorsFor(days) {
    // Discrete badge days we support (keeps mapping stable):
    const steps = [3,5,8,10,15,20,25,30,35,50,75,100];
    // Find nearest step index
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (days <= steps[i]) { idx = i; break; }
      if (i === steps.length - 1) idx = i;
    }
    // normalize index to t in [0,1]
    const t = idx / Math.max(1, steps.length - 1);
    // We'll vary saturation and lightness to make each step perceptually distinct
    // base hue around 44-52 (gold-ish)
    const hue = 48;
    const satMin = 0.28, satMax = 0.95; // saturation
    const lightMin = 0.92, lightMax = 0.45; // lightness (pale -> rich)
    const s = satMin + (satMax - satMin) * t;
    const l = lightMin + (lightMax - lightMin) * t;
    const baseRgb = hslToRgb(hue, s, l);
    const darkRgb = hslToRgb(hue, Math.max(0.2, s - 0.15), Math.max(0.35, l - 0.28));
    const base = rgbToHex(baseRgb[0], baseRgb[1], baseRgb[2]);
    const dark = rgbToHex(darkRgb[0], darkRgb[1], darkRgb[2]);
    return { base, dark };
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
    p.textContent = 'No badges collected yet. 🏅 Aim for the monthly leaderboard to unlock one!';
    container.appendChild(p);
  }

  function loadAchievements(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let userObj = null;
    try {
      if (window.authService && typeof window.authService.getCurrentUser === 'function') {
        userObj = window.authService.getCurrentUser();
      } else if (window.authService && typeof window.authService.getUser === 'function') {
        userObj = window.authService.getUser();
      }
    } catch (e) {}

    if (!userObj && window.currentUser) {
      userObj = window.currentUser;
    }

    if (!userObj) {
      try {
        const el = document.getElementById('user-stats-title') || document.querySelector('.user-stats-title');
        if (el && el.textContent) {
          const txt = el.textContent.trim();
          const lower = txt.toLowerCase();
          if (txt && !/stats|my stats|user's stats|my stats:/.test(lower)) {
            userObj = txt;
          }
        }
      } catch (e) {}
    }

    if (!userObj) {
      showNoLogin(container);
      return;
    }

    const identityKey = normalizeIdentity(userObj);

    if (!identityKey) {
      showNoLogin(container);
      return;
    }

    const badges = hardcodedAchievements[identityKey] || [];

    if (!badges || !Array.isArray(badges) || badges.length === 0) {
      showNoBadges(container);
      return;
    }

    // Render badges
    container.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'badges-row';

    badges.forEach((badge, idx) => {
      const badgeEl = createBadgeEl(badge, idx);
      
      // Click handler opens modal with all badges, starting at clicked index
      badgeEl.addEventListener('click', () => openModal(badges, idx));
      badgeEl.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(badges, idx);
        }
      });
      
      row.appendChild(badgeEl);
    });

    container.appendChild(row);
  }

  window.addAchievementForUser = function (identity, badge) {
    if (!identity || !badge) return false;
    const key = normalizeIdentity(identity);
    if (!key) return false;
    if (!hardcodedAchievements[key]) hardcodedAchievements[key] = [];
    hardcodedAchievements[key].push(badge);
    return true;
  };

  window.loadAchievements = loadAchievements;
})();