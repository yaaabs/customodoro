(function () {
  "use strict";

  function normalizePath(pathname) {
    const cleanPath = pathname
      .replace(/\/(?:index)?\.html$/i, "/")
      .replace(/\.html$/i, "")
      .replace(/\/$/, "");
    return cleanPath || "/";
  }

  function markCurrentPage(footer) {
    const currentPath = normalizePath(window.location.pathname);
    footer.querySelectorAll('.footer-nav a[href^="/"]').forEach((link) => {
      const targetPath = normalizePath(new URL(link.href, window.location.href).pathname);
      if (targetPath === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function renderSiteFooter() {
    const footer = document.querySelector(".footer");
    if (!footer) return;

    const hasLocalAboutModal = Boolean(
      document.getElementById("about-info-modal-overlay"),
    );
    const aboutHref = hasLocalAboutModal ? "#about" : "/#about";
    const aboutId = hasLocalAboutModal ? ' id="about-link-footer"' : "";

    footer.setAttribute("role", "contentinfo");
    footer.setAttribute("aria-label", "Customodoro footer");

    // Clearance for the floating action button is a stylesheet concern:
    // this script is deferred and runs before radial-menu.js builds the
    // button, so it cannot reliably detect one here.
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-top">
          <a class="footer-brand" href="/">
            <img class="footer-brand-mark" src="favicon/android-chrome-192x192.png" width="28" height="28" alt="" decoding="async" />
            <span class="footer-brand-name">Customodoro</span>
          </a>
          <nav class="footer-nav" aria-label="Site links">
            <a href="/">Home</a>
            <a href="/reverse">Reverse</a>
            <a href="/pomodoro">Guide</a>
            <a href="${aboutHref}"${aboutId}>About</a>
            <a href="/feedback">Feedback</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <div class="footer-bottom">
          <p class="footer-copy">&copy; <span class="copyright-year">2026</span> YabuTech &middot; Customodoro v3.7.12</p>
          <p class="footer-meta">
            <a href="https://www.linkedin.com/in/brian-yabut/" target="_blank" rel="noopener noreferrer">Built by Brian Yabut</a>
            <a href="mailto:brianyabutech@gmail.com">Contact</a>
            <a href="https://wakey2x.vercel.app/" target="_blank" rel="noopener noreferrer">Try Wakey</a>
            <a href="https://github.com/yaaabs/customodoro" target="_blank" rel="noopener noreferrer">MIT License</a>
          </p>
        </div>
      </div>
    `;

    markCurrentPage(footer);

    if (typeof window.updateCopyrightYears === "function") {
      window.updateCopyrightYears();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSiteFooter, {
      once: true,
    });
  } else {
    renderSiteFooter();
  }
})();
