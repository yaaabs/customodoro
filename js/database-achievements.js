/* js/database-achievements.js
   Enhanced with mobile-first full-screen modal and swipe navigation
*/

(function () {
  'use strict';

  // Hard-coded achievements map
  const hardcodedAchievements = {

    'Yabs': [
      { title: 'Customodoro Founder', icon: 'images/badges/custom-badges/founder.webp', description: 'Awarded to the awesome dev who co-founded and built Customodoro from the ground up! 🚀', date: '2025-11-01' },
    ], 

    'maceyslw': [
      { title: 'Streak Legend', icon: 'images/badges/custom-badges/2025-10/oct-streak.webp', description: 'Honored for holding the longest streak in October.', date: '2025-11-01' },
      { title: 'Streak Legend', icon: 'images/badges/custom-badges/2025-09/sept-streak.webp', description: 'Honored for holding the longest streak in September.', date: '2025-10-01' },
      { title: 'Overall Champion', icon: 'images/badges/custom-badges/2025-09/sept-champion.webp', description: 'Awarded for being the top overall performer with the highest average across all categories in September.', date: '2025-10-01' },
    ], 
    
    'bananasaurus': [
      { title: 'Session Master', icon: 'images/badges/custom-badges/2025-09/sept-session.webp', description: 'Recognized for completing the most sessions in September.', date: '2025-10-01' }
    ],
  
    'Clari': [
      { title: 'Overall Champion', icon: 'images/badges/custom-badges/2025-10/oct-champion.webp', description: 'Awarded for being the top overall performer with the highest average across all categories in October.', date: '2025-11-01' },
      { title: 'Focus King', icon: 'images/badges/custom-badges/2025-10/oct-focus_points.webp', description: 'Crowned for earning the highest Focus Points in October.', date: '2025-11-01' },
      { title: 'Focus King', icon: 'images/badges/custom-badges/2025-09/sept-focus_points.webp', description: 'Crowned for earning the highest Focus Points in September.', date: '2025-10-01' }
    ],

    'Tilen': [
      { title: 'Session Master', icon: 'images/badges/custom-badges/2025-10/oct-session.webp', description: 'Recognized for completing the most sessions in October.', date: '2025-11-01' }
    ]
  };

  // Convert username to proper case for lookup
  function findUserAchievements(username) {
    if (!username) return [];
    return hardcodedAchievements[username] || [];
  }

  function normalizeIdentity(u) {
    // If it's already a string (email or username), use it directly
    if (typeof u === 'string') {
      const s = u.trim();
      return s || null;
    }

    if (!u || typeof u !== 'object') return null;

    // First try to get the email (for backward compatibility)
    if (u.email) {
      const email = String(u.email).trim();
      // Check if this email exists in hardcodedAchievements
      if (hardcodedAchievements[email]) {
        return email;
      }
    }

    // Then try username
    if (u.username) {
      const username = String(u.username).trim();
      // Check if this username exists in hardcodedAchievements
      if (hardcodedAchievements[username]) {
        return username;
      }
    }

    // Try other possible identifiers
    const candidates = ['displayName', 'name', 'user'];
    for (const k of candidates) {
      if (u[k]) {
        const value = String(u[k]).trim();
        if (value && hardcodedAchievements[value]) {
          return value;
        }
      }
    }

    // If we still haven't found a match, try case-insensitive matching
    const userIdentifier = u.username || u.email || u.displayName || u.name || u.user;
    if (userIdentifier) {
      const normalizedIdentifier = String(userIdentifier).trim();
      // Find a case-insensitive match in hardcodedAchievements
      const achievementKey = Object.keys(hardcodedAchievements).find(
        key => key.toLowerCase() === normalizedIdentifier.toLowerCase()
      );
      if (achievementKey) {
        return achievementKey;
      }
    }

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
  <button class="badge-modal-close" aria-label="Close badge dialog">\u00d7</button>
  <button class="badge-modal-prev" aria-label="Previous badge" tabindex="0">&lt;</button>
  <button class="badge-modal-next" aria-label="Next badge" tabindex="0">&gt;</button>
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
    
    // Prev / Next buttons (for users who don't swipe or use arrow keys)
    const prevBtn = modalEl.querySelector('.badge-modal-prev');
    const nextBtn = modalEl.querySelector('.badge-modal-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (currentIndex > 0) showBadgeAtIndex(currentIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (currentIndex < currentBadges.length - 1) showBadgeAtIndex(currentIndex + 1);
      });
    }
    
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
      
      /* Prev/Next buttons for non-swipe users */
      .badge-modal-prev,
      .badge-modal-next {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.3);
        color: #fff;
        border: none;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10002;
        font-size: 18px;
        transition: background 0.15s ease, opacity 0.15s ease;
      }
      
      .badge-modal-prev { left: 14px; }
      .badge-modal-next { right: 14px; }
      
      .badge-modal-prev:hover, .badge-modal-next:hover { background: rgba(0,0,0,0.5); }
      .badge-modal-prev.disabled, .badge-modal-next.disabled {
        opacity: 0.35;
        pointer-events: none;
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
    const dateEl = el.querySelector('.badge-modal-date');
    if (badge.date) {
      dateEl.innerHTML = `<span style="font-weight:700;color:#FFD700;font-size:1.08em;">🏆 Unlocked on ${dateText}</span>`;
      dateEl.style.textAlign = 'left';
    } else {
      dateEl.textContent = dateText;
      dateEl.style.textAlign = 'left';
    }
    
    // Apply banner color
    const banner = el.querySelector('.badge-modal-banner');
    const body = el.querySelector('.badge-modal-body');
    const bannerColors = {
      'Focus King': '#FB2A1B',
      'Focus Points': '#56D364',
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
    
    // Update Prev/Next button states for accessibility
    try {
      const prevBtn = modalEl.querySelector('.badge-modal-prev');
      const nextBtn = modalEl.querySelector('.badge-modal-next');
      if (prevBtn) {
        const disabled = currentIndex <= 0;
        prevBtn.classList.toggle('disabled', disabled);
        if (disabled) {
          prevBtn.setAttribute('aria-disabled', 'true');
          prevBtn.setAttribute('tabindex', '-1');
        } else {
          prevBtn.setAttribute('aria-disabled', 'false');
          prevBtn.setAttribute('tabindex', '0');
        }
      }
      if (nextBtn) {
        const disabled = currentIndex >= currentBadges.length - 1;
        nextBtn.classList.toggle('disabled', disabled);
        if (disabled) {
          nextBtn.setAttribute('aria-disabled', 'true');
          nextBtn.setAttribute('tabindex', '-1');
        } else {
          nextBtn.setAttribute('aria-disabled', 'false');
          nextBtn.setAttribute('tabindex', '0');
        }
      }
    } catch (e) { /* ignore safely */ }
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
    p.textContent = '🏅 No badges collected yet. Keep it up to build your streaks and climb the Monthly Leaderboard!';
    container.appendChild(p);
  }

  /* ========== PAGINATION SYSTEM FOR BADGES ========== */
  let currentPage = 0;
  let lastBadgesPerPage = null;
  let currentContainer = null;
  let currentBadgesArray = null;
  
  function getBadgesPerPage() {
    // 4 badges per page on mobile (≤768px), 8 on desktop
    return window.innerWidth <= 768 ? 4 : 8;
  }
  
  function paginateBadges(badges) {
    const pages = [];
    const perPage = getBadgesPerPage();
    for (let i = 0; i < badges.length; i += perPage) {
      pages.push(badges.slice(i, i + perPage));
    }
    return pages;
  }
  
  // Handle window resize to adjust pagination
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const newPerPage = getBadgesPerPage();
      if (lastBadgesPerPage !== null && lastBadgesPerPage !== newPerPage && currentContainer && currentBadgesArray) {
        // Recalculate current page to keep similar position
        const oldFirstBadgeIndex = currentPage * lastBadgesPerPage;
        currentPage = Math.floor(oldFirstBadgeIndex / newPerPage);
        renderBadgesPage(currentContainer, currentBadgesArray, currentPage);
      }
    }, 250);
  });
  
  function renderBadgesPage(container, badges, pageIndex) {
    const pages = paginateBadges(badges);
    const totalPages = pages.length;
    
    if (pageIndex < 0 || pageIndex >= totalPages) pageIndex = 0;
    currentPage = pageIndex;
    
    // Store for resize handler
    currentContainer = container;
    currentBadgesArray = badges;
    lastBadgesPerPage = getBadgesPerPage();
    
    // Clear existing badges and pagination
    const existingRow = container.querySelector('.badges-row');
    const existingPagination = container.querySelector('.badges-pagination');
    const existingPageInfo = container.querySelector('.badges-page-info');
    if (existingRow) existingRow.remove();
    if (existingPagination) existingPagination.remove();
    if (existingPageInfo) existingPageInfo.remove();
    
    // Create badges row for current page
    const row = document.createElement('div');
    row.className = 'badges-row';
    
    const currentPageBadges = pages[currentPage];
    currentPageBadges.forEach((badge, idx) => {
      const globalIdx = currentPage * getBadgesPerPage() + idx;
      const badgeEl = createBadgeEl(badge, globalIdx);
      
      // Add fade-in animation
      badgeEl.style.cssText = `
        animation: fadeInBadge 0.3s ease forwards;
        animation-delay: ${idx * 0.05}s;
        opacity: 0;
      `;
      
      // Click handler to open modal
      badgeEl.addEventListener('click', () => openModal(badges, globalIdx));
      badgeEl.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(badges, globalIdx);
        }
      });
      
      row.appendChild(badgeEl);
    });
    
    container.appendChild(row);
    
    // Add pagination controls if more than one page
    if (totalPages > 1) {
      const pagination = document.createElement('div');
      pagination.className = 'badges-pagination';
      pagination.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 4px 6px;
        margin-top: 4px;
        transform: scale(0.8);
      `;
      
      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.innerHTML = '&lt;';
      prevBtn.className = 'pagination-btn pagination-prev';
      prevBtn.setAttribute('aria-label', 'Previous page');
      prevBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        ${currentPage === 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
      `;
      prevBtn.disabled = currentPage === 0;
      prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
          renderBadgesPage(container, badges, currentPage - 1);
        }
      });
      
      if (!prevBtn.disabled) {
        prevBtn.addEventListener('mouseenter', () => {
          prevBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          prevBtn.style.transform = 'scale(1.1)';
        });
        prevBtn.addEventListener('mouseleave', () => {
          prevBtn.style.background = 'rgba(255, 255, 255, 0.1)';
          prevBtn.style.transform = 'scale(1)';
        });
      }
      
      pagination.appendChild(prevBtn);
      
      // Page dots
      const dotsContainer = document.createElement('div');
      dotsContainer.style.cssText = `
        display: flex;
        gap: 3px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        transform: scale(0.6);
      `;
      
      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = 'pagination-dot';
        dot.setAttribute('aria-label', `Go to page ${i + 1}`);
        dot.setAttribute('aria-current', i === currentPage ? 'true' : 'false');
        
        // Modern pagination: active dot is slightly larger, all are circular
        const isActive = i === currentPage;
        dot.style.cssText = `
          width: ${isActive ? '3px' : '2px'};
          height: ${isActive ? '3px' : '2px'};
          border-radius: 50%;
          background: ${isActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.2)'};
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          padding: 0;
          box-shadow: none;
        `;
        
        dot.addEventListener('click', () => {
          renderBadgesPage(container, badges, i);
        });
        
        if (!isActive) {
          dot.addEventListener('mouseenter', () => {
            dot.style.background = 'rgba(255, 255, 255, 0.6)';
            dot.style.transform = 'scale(1.15)';
          });
          dot.addEventListener('mouseleave', () => {
            dot.style.background = 'rgba(255, 255, 255, 0.35)';
            dot.style.transform = 'scale(1)';
          });
        }
        
        dotsContainer.appendChild(dot);
      }
      pagination.appendChild(dotsContainer);
      
      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.innerHTML = '&gt;';
      nextBtn.className = 'pagination-btn pagination-next';
      nextBtn.setAttribute('aria-label', 'Next page');
      nextBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        ${currentPage === totalPages - 1 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
      `;
      nextBtn.disabled = currentPage === totalPages - 1;
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
          renderBadgesPage(container, badges, currentPage + 1);
        }
      });
      
      if (!nextBtn.disabled) {
        nextBtn.addEventListener('mouseenter', () => {
          nextBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          nextBtn.style.transform = 'scale(1.1)';
        });
        nextBtn.addEventListener('mouseleave', () => {
          nextBtn.style.background = 'rgba(255, 255, 255, 0.1)';
          nextBtn.style.transform = 'scale(1)';
        });
      }
      
      pagination.appendChild(nextBtn);
      container.appendChild(pagination);
      
      // Add page info text
      const pageInfo = document.createElement('div');
      pageInfo.className = 'badges-page-info';
      pageInfo.style.cssText = `
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        padding: 6px 10px 8px;
        margin-top: 2px;
      `;
      pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages} • ${badges.length} badge${badges.length !== 1 ? 's' : ''}`;
      container.appendChild(pageInfo);
    }
    
    // Add fade in animation keyframes if not already present
    if (!document.getElementById('badge-fade-animation')) {
      const style = document.createElement('style');
      style.id = 'badge-fade-animation';
      style.textContent = `
        @keyframes fadeInBadge {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // --- Frontend-only productivity helpers (safe, non-destructive) ---
  function getFrontendProductivityStats() {
    try {
      if (window.userStatsManager && typeof window.userStatsManager.getAllProductivityData === 'function') {
        return window.userStatsManager.getAllProductivityData() || {};
      }
    } catch (e) {}

    try {
      const raw = localStorage.getItem('customodoroStatsByDay');
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {}

    // Also support embedded productivity stats placed into streaks by sync-manager
    try {
      const streaks = JSON.parse(localStorage.getItem('customodoro-streaks') || '{}');
      if (streaks && streaks.productivityStatsByDay) return streaks.productivityStatsByDay || {};
    } catch (e) {}

    return {};
  }

  function toIsoDateKey(k) {
    if (!k) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return k;
    try {
      const d = new Date(k);
      if (isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (e) { return null; }
  }

  // Returns { maxStreak: Number, unlocks: {dayCount: isoDate, ...} }
  function computeStreakInfoFromStats(statsByDay, supportedSteps) {
    const activeDates = [];
    Object.entries(statsByDay || {}).forEach(([k, v]) => {
      const iso = toIsoDateKey(k);
      if (!iso) return;
      const minutes = Number(v && (v.total_minutes || 0)) || 0;
      const sessions = Number(v && ((v.classic || 0) + (v.reverse || 0))) || 0;
      if (minutes > 0 || sessions > 0) activeDates.push(iso);
    });

    if (activeDates.length === 0) return { maxStreak: 0, unlocks: {} };

    const uniq = Array.from(new Set(activeDates)).sort();
    const dates = uniq.map(d => new Date(d + 'T00:00:00'));

    const resultUnlocks = {};
    supportedSteps = supportedSteps || [3,5,8,10,15,20,25,30,35,50,75,100];
    const sortedTargets = Array.from(new Set(supportedSteps)).map(Number).sort((a,b)=>a-b);
    sortedTargets.forEach(t => { resultUnlocks[t] = null; });

    let maxRun = 1;
    let runLen = 1;

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) { runLen = 1; }
      else {
        const prev = dates[i-1];
        const cur = dates[i];
        const diff = Math.round((cur - prev) / (24 * 60 * 60 * 1000));
        if (diff === 1) runLen += 1;
        else if (diff === 0) {/* duplicate day */}
        else runLen = 1;
      }

      if (runLen > maxRun) maxRun = runLen;

      // Assign unlock dates for any targets reached at this index
      for (let ti = 0; ti < sortedTargets.length; ti++) {
        const t = sortedTargets[ti];
        if (!resultUnlocks[t] && runLen >= t) {
          const d = dates[i];
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          resultUnlocks[t] = `${y}-${m}-${day}`;
        }
      }
    }

    return { maxStreak: maxRun, unlocks: resultUnlocks };
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

    const rawBadges = findUserAchievements(identityKey);
    // Note: don't early-return when there are no hardcoded badges for this user.
    // We will still compute streak badges from frontend productivity stats and render them.

    // Frontend stats (localStorage or embedded streaks) — compute streak info
    const stats = getFrontendProductivityStats();
    const supportedSteps = [3,5,8,10,15,20,25,30,35,50,75,100];
    const streakInfo = computeStreakInfoFromStats(stats, supportedSteps);

    // Build final badge list: always include non-Streak badges; include Streak badges only if day <= maxStreak
    const finalBadges = [];
    const existingStreakDays = new Set();

    rawBadges.forEach(b => {
      if (!b || !b.title) return;
      if (b.title !== 'Streak') {
        finalBadges.push(b);
        return;
      }

      // parse days from icon/description
      const m = /([0-9]{1,3})\s*-?\s*Day/i.exec(b.icon || '') || /([0-9]{1,3})\s*-?\s*Day/i.exec(b.description || '');
      const days = (m && m[1]) ? Number(m[1]) : null;
      if (days && days <= streakInfo.maxStreak) {
        // apply computed unlock date if available
        if (streakInfo.unlocks && streakInfo.unlocks[days]) {
          b.date = streakInfo.unlocks[days];
        }
        finalBadges.push(b);
        existingStreakDays.add(days);
      }
    });

    // Add any missing streak levels that user earned (but not hardcoded) up to maxStreak
    supportedSteps.forEach(step => {
      if (step <= streakInfo.maxStreak && !existingStreakDays.has(step)) {
        const d = (streakInfo.unlocks && streakInfo.unlocks[step]) ? streakInfo.unlocks[step] : null;
        finalBadges.push({ title: 'Streak', icon: `images/badges/streak/${step}-day-streak.webp`, description: `Unlocked a ${step}-day streak!`, date: d });
      }
    });

    // --- Focus Points Badge: Only show the single highest-achieved Focus Points badge ---
    try {
      // Compute total minutes from available frontend stats and embedded streaks
      const statsByDay = stats || {};
      const dayEntries = Object.entries(statsByDay).map(([k, v]) => {
        const iso = toIsoDateKey(k);
        const minutes = Number(v && (v.total_minutes || 0)) || 0;
        return { iso, minutes };
      }).filter(e => e.iso).sort((a,b) => new Date(a.iso) - new Date(b.iso));

      // Cumulative minutes -> Focus Points (1 FP = 5 minutes)
      let cumulativeMinutes = 0;
      dayEntries.forEach(d => { cumulativeMinutes += d.minutes; });
      const totalFocusPoints = Math.floor(cumulativeMinutes / 5);

      // Available focus badge steps (match filenames under images/badges/Focus_Points)
      const focusSteps = [100,500,750,1000,1500,2000,3000,4000,5000,7500,10000];
      // Find highest achieved step (single badge)
      let achieved = null;
      for (let i = focusSteps.length - 1; i >= 0; i--) {
        if (totalFocusPoints >= focusSteps[i]) { achieved = focusSteps[i]; break; }
      }

      if (achieved) {
        // Determine unlock date by walking days until cumulative FP >= achieved
        let cum = 0;
        let unlockIso = null;
        for (const e of dayEntries) {
          cum += e.minutes;
          const cumFP = Math.floor(cum / 5);
          if (cumFP >= achieved) { unlockIso = e.iso; break; }
        }

        const iconPath = `images/badges/focus-points/${achieved}-fp.webp`;
        finalBadges.push({ title: 'Focus Points', icon: iconPath, description: `Earned ${achieved} Focus Points`, date: unlockIso });
      }
    } catch (focusErr) {
      console.warn('Failed to compute Focus Points badge:', focusErr);
    }

    // Render badges (monthly first, then streaks sorted ascending)
    const monthly = finalBadges.filter(b => b.title !== 'Streak');
    const streaks = finalBadges.filter(b => b.title === 'Streak').sort((a,b) => {
      const ma = /([0-9]{1,3})/.exec(a.icon||'');
      const mb = /([0-9]{1,3})/.exec(b.icon||'');
      return (ma && ma[1] ? Number(ma[1]) : 0) - (mb && mb[1] ? Number(mb[1]) : 0);
    });

    const badges = monthly.concat(streaks);

    // If after computation there are no badges, show fallback message
    if (!badges || badges.length === 0) {
      showNoBadges(container);
      return;
    }

    container.innerHTML = '';

    // Add call-to-action description
    const cta = document.createElement('div');
    cta.className = 'achievements-cta';
    cta.style.margin = '0 0 12px 0';
    cta.style.fontSize = '15px';
    cta.style.color = 'rgba(255,255,255,0.7)';
    cta.style.letterSpacing = '0.01em';
  cta.textContent = 'Tip: Click or tap a badge to view details and unlock info! You can also use arrow keys to navigate, or swipe on mobile.';
    container.appendChild(cta);

    // Use pagination system to render badges
    renderBadgesPage(container, badges, 0);
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