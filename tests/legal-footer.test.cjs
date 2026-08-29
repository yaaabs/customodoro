const fs = require("fs");
const path = require("path");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const repoRoot = path.resolve(__dirname, "..");
const publicPages = [
  "index.html",
  "reverse.html",
  "pomodoro.html",
  "feedback.html",
  "privacy.html",
  "terms.html",
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("legal pages and responsive footer", () => {
  test("every public page links to both legal routes", () => {
    for (const page of publicPages) {
      const html = read(page);
      assert.match(html, /href="\/privacy"/, `${page} is missing /privacy`);
      assert.match(html, /href="\/terms"/, `${page} is missing /terms`);
    }
  });

  test("legal documents expose canonical metadata and the approved date", () => {
    const expectations = [
      ["privacy.html", "Privacy Policy", "/privacy"],
      ["terms.html", "Terms and Conditions", "/terms"],
    ];

    for (const [page, heading, route] of expectations) {
      const html = read(page);
      assert.match(html, new RegExp(`<title>${heading} \\| Customodoro<\\/title>`));
      assert.match(html, new RegExp(`<h1>${heading}<\\/h1>`));
      assert.match(
        html,
        new RegExp(`rel="canonical" href="https:\\/\\/www\\.customodoro\\.app${route}"`),
      );
      assert.match(html, /Last modified: August 30, 2026/);
      assert.match(html, /mailto:brianyabutech@gmail\.com/);
      assert.match(html, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
    }
  });

  test("privacy and terms include the app-specific disclosures", () => {
    const privacy = read("privacy.html");
    const terms = read("terms.html");

    for (const disclosure of [
      "localStorage",
      "NoteForms",
      "Vercel",
      "Supabase",
      "Render",
      "24 months",
    ]) {
      assert.ok(privacy.includes(disclosure), `Privacy Policy is missing ${disclosure}`);
    }

    for (const disclosure of [
      "at least 13",
      "guardian",
      "MIT License",
      "Philippines",
    ]) {
      assert.ok(terms.includes(disclosure), `Terms are missing ${disclosure}`);
    }
  });

  test("both documents describe cloud features as live, and say the leaderboard is public", () => {
    const privacy = read("privacy.html");
    const terms = read("terms.html");

    // The teardown wording must not outlive the teardown itself.
    for (const stale of [
      "Cloud migration notice",
      "Cloud features are paused",
      "temporarily unavailable",
      "legacy cloud",
      "Legacy cloud",
      "pending administrative suspension",
    ]) {
      assert.ok(!privacy.includes(stale), `Privacy Policy still says "${stale}"`);
      assert.ok(!terms.includes(stale), `Terms still say "${stale}"`);
    }

    assert.match(privacy, /<strong>The leaderboard is public\.<\/strong>/);
    assert.match(privacy, /never shown on the leaderboard/);
    assert.match(privacy, /Account, sync, and leaderboard data/);
    assert.match(terms, /The leaderboard is public/);
  });

  test("legal pages stay plain documents without reading chrome", () => {
    for (const page of ["privacy.html", "terms.html"]) {
      const html = read(page);
      for (const chrome of [
        "legal-toc",
        "legal-progress",
        "legal-eyebrow",
        "legal-meta",
        "legal-actions",
        "legal-outro",
        "legal-to-top",
        "legal-page.js",
      ]) {
        assert.ok(!html.includes(chrome), `${page} still carries ${chrome}`);
      }
      assert.match(html, /<p class="legal-updated">Last modified: August 30, 2026<\/p>/);
      assert.match(html, /<main class="legal-main" id="legal-content">/);
      assert.doesNotMatch(html, /<h2>\d+\. /);
    }

    assert.ok(!fs.existsSync(path.join(repoRoot, "js/legal-page.js")));
    assert.doesNotMatch(read("terms.html"), /Governed by Philippine law/);
  });

  test("shared footer renders one compact accessible row on every page", () => {
    const script = read("js/site-footer.js");
    const shell = read("css/site-shell.css");

    for (const label of [
      "Home",
      "Reverse",
      "Guide",
      "About",
      "Feedback",
      "Privacy",
      "Terms",
    ]) {
      assert.match(script, new RegExp(`>${label}</a>`));
    }
    // The licence is fine print, not a destination alongside real pages.
    assert.doesNotMatch(script, /class="footer-nav"[\s\S]*?>License<[\s\S]*?<\/nav>/);
    assert.match(
      script,
      /<a href="https:\/\/github\.com\/yaaabs\/customodoro"[^>]*>MIT License<\/a>/,
    );
    assert.match(script, /role", "contentinfo"/);
    assert.match(script, /aria-label", "Customodoro footer"/);
    assert.match(script, /class="footer-nav" aria-label="Site links"/);
    assert.match(script, /link\.setAttribute\("aria-current", "page"\)/);
    assert.doesNotMatch(script, /footer-group|footer-link-list|<details/);

    assert.match(shell, /\.footer-nav a\s*\{[^}]*min-height:\s*44px/s);
    // Clearance for the FAB must not depend on script order (both are deferred).
    assert.match(
      shell,
      /body:has\(\.radial-menu-container\) \.footer\s*\{[^}]*padding-bottom:\s*5\.5rem/s,
    );
    assert.doesNotMatch(script, /footer--action-safe/);

    // Everything reads as one centred column at every width.
    assert.match(shell, /\.footer\s*\{[^}]*text-align:\s*center/s);
    assert.match(shell, /\.footer-inner\s*\{[^}]*align-items:\s*center/s);
    assert.match(shell, /\.footer-nav\s*\{[^}]*justify-content:\s*center/s);
    assert.match(shell, /\.footer-bottom\s*\{[^}]*align-items:\s*center/s);
    assert.match(shell, /\.footer-meta\s*\{[^}]*justify-content:\s*center/s);
    assert.doesNotMatch(shell, /align-items:\s*flex-start/);
    assert.match(shell, /@media \(prefers-reduced-motion: reduce\)/);
    assert.doesNotMatch(read("css/style.css"), /\.footer(?:-|\s*\{)/);
  });

  test("the real app icon is the brand mark in the footer and on legal pages", () => {
    const icon = "favicon/android-chrome-192x192.png";
    assert.ok(fs.existsSync(path.join(repoRoot, "favicon/android-chrome-192x192.png")));

    const script = read("js/site-footer.js");
    assert.ok(script.includes(`class="footer-brand-mark" src="${icon}"`));
    assert.doesNotMatch(script, /footer-heart|footer-social|Made with/);

    for (const page of ["privacy.html", "terms.html"]) {
      const html = read(page);
      assert.ok(html.includes(`class="brand-mark" src="${icon}"`), `${page} lacks the app icon`);
      assert.doesNotMatch(html, /legal-home-mark/);
    }
  });

  test("the floating action button repaints itself over the band", () => {
    const script = read("js/radial-menu.js");
    const shell = read("css/site-shell.css");

    assert.match(script, /classList\.toggle\("is-over-outro"/);
    assert.match(script, /querySelector\("\.page-outro"\)/);
    // scroll can originate from <body>, which does not bubble
    assert.match(script, /capture: true/);

    // Contrast comes from inverting the band's own tokens, not per-theme rules.
    assert.match(
      shell,
      /\.radial-menu-container\.is-over-outro \.radial-menu-toggle\s*\{[^}]*background:\s*var\(--outro-text\)/s,
    );
    assert.match(
      shell,
      /\.radial-menu-container\.is-over-outro \.radial-menu-toggle svg\s*\{[^}]*color:\s*var\(--outro-surface\)/s,
    );
  });

  test("the outro band carries the article, FAQ, and footer full bleed", () => {
    const shell = read("css/site-shell.css");
    assert.match(shell, /\.page-outro\s*\{[^}]*width:\s*100vw/s);
    assert.match(shell, /\.page-outro\s*\{[^}]*margin-left:\s*calc\(50% - 50vw\)/s);
    assert.match(shell, /body:has\(\.page-outro\)\s*\{[^}]*padding-bottom:\s*0/s);
    assert.match(shell, /body\.focus-mode-active \.page-outro/);

    for (const page of publicPages) {
      const html = read(page);
      assert.match(html, /<div class="page-outro">/, `${page} has no outro band`);
      assert.match(html, /site-shell\.css/, `${page} does not load the shell styles`);
      assert.ok(
        html.indexOf('<div class="page-outro">') < html.indexOf('<footer class="footer"'),
        `${page} keeps the footer outside the band`,
      );
    }

    for (const page of ["index.html", "reverse.html"]) {
      const html = read(page);
      assert.match(html, /<div class="page-outro-inner">/);
      assert.ok(
        html.indexOf('<div class="page-outro-inner">') <
          html.indexOf('class="pomodoro-preview"'),
      );
    }
  });

  test("feedback requires an intentional visit to NoteForms", () => {
    const feedback = read("feedback.html");
    assert.doesNotMatch(feedback, /<iframe\b/i);
    assert.doesNotMatch(feedback, /noteforms\.com\/widgets/i);
    assert.match(feedback, /href="https:\/\/noteforms\.com\/forms\//);
    assert.match(feedback, /target="_blank"/);
    assert.match(feedback, /rel="noopener noreferrer"/);
  });

  test("public pages do not request Google Fonts", () => {
    for (const page of publicPages) {
      const html = read(page);
      assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/i);
    }
  });

  test("the timer pages still wire up accounts, sync, and the leaderboard", () => {
    for (const page of ["index.html", "reverse.html"]) {
      const html = read(page);
      assert.match(html, /unpkg\.com\/@supabase/i, `${page} lost the Supabase client`);
      for (const module of [
        "auth-service",
        "sync-manager",
        "sync-ui",
        "header-profile",
        "leaderboard-integration",
        "database-leaderboard",
      ]) {
        assert.match(
          html,
          new RegExp(`<script[^>]+${module}\\.js`, "i"),
          `${page} is missing ${module}.js`,
        );
      }
      assert.match(html, /id="leaderboard-btn"/);
      assert.match(html, /id="user-profile"/);
    }
  });

  test("routing, discovery, and offline caches include both legal routes", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const sitemap = read("sitemap.xml");
    const sw = read("sw.js");
    const llms = read("llms.txt");

    for (const route of ["privacy", "terms"]) {
      assert.ok(
        vercel.redirects.some(
          (entry) => entry.source === `/${route}.html` && entry.destination === `/${route}`,
        ),
      );
      assert.ok(
        vercel.redirects.some(
          (entry) => entry.source === `/${route}/` && entry.destination === `/${route}`,
        ),
      );
      assert.ok(vercel.headers.some((entry) => entry.source === `/${route}`));
      assert.match(sitemap, new RegExp(`<loc>https:\\/\\/www\\.customodoro\\.app\\/${route}<\\/loc>`));
      assert.match(sw, new RegExp(`"\\/${route}"`));
      assert.match(sw, new RegExp(`"\\/${route}\\.html"`));
      assert.match(llms, new RegExp(`https:\\/\\/www\\.customodoro\\.app\\/${route}`));
    }

    assert.match(sw, /"\/css\/legal\.css"/);
    assert.match(sw, /"\/css\/site-shell\.css"/);
    assert.match(sw, /"\/js\/site-footer\.js"/);
    assert.doesNotMatch(sw, /"\/js\/legal-page\.js"/);
    for (const module of [
      "auth-service",
      "sync-manager",
      "sync-ui",
      "header-profile",
      "leaderboard-integration",
      "database-leaderboard",
    ]) {
      assert.match(sw, new RegExp(`"\\/js\\/${module}\\.js"`), `sw.js no longer caches ${module}.js`);
    }
  });
});
