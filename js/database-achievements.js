/* js/database-achievements.js
   Enhanced with mobile-first full-screen modal and swipe navigation
*/

(function () {
  'use strict';

  // Hard-coded achievements map
  const hardcodedAchievements = {
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
  };

  // Keep email mirror in sync
  if (
    hardcodedAchievements['yabs'] &&
    hardcodedAchievements['yabs'].length &&
    (!hardcodedAchievements['yabs@gmail.com'] || hardcodedAchievements['yabs@gmail.com'].length === 0)
  ) {
    hardcodedAchievements['yabs@gmail.com'] = hardcodedAchievements['yabs'].slice();
  }

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
      banner.style.background = '';
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