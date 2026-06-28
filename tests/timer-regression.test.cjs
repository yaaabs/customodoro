const path = require("path");
const fs = require("fs");
const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");

function setupClassicHarness(storageBacking) {
  const harness = createHarness({
    repoRoot,
    storageBacking,
  });
  harness.loadScript("js/script.js");
  harness.evaluate(`
    if (typeof renderContributionGraph !== "undefined") {
      renderContributionGraph = function () {};
      window.renderContributionGraph = renderContributionGraph;
    }
    if (typeof setupThemeSync !== "undefined") {
      setupThemeSync = function () {};
      window.setupThemeSync = setupThemeSync;
    }
    if (typeof updateStreakStatsCard !== "undefined") {
      updateStreakStatsCard = function () {};
      window.updateStreakStatsCard = updateStreakStatsCard;
    }
    if (typeof renderStreakDisplay !== "undefined") {
      renderStreakDisplay = function () {};
      window.renderStreakDisplay = renderStreakDisplay;
    }
  `);
  harness.fireDOMContentLoaded();
  return harness;
}

function setupReverseHarness(storageBacking) {
  const harness = createHarness({
    repoRoot,
    storageBacking,
  });
  harness.loadScript("js/reversePomodoro.js");
  harness.loadScript("js/lockedin-mode.js");
  harness.evaluate(`
    if (typeof renderContributionGraph !== "undefined") {
      renderContributionGraph = function () {};
      window.renderContributionGraph = renderContributionGraph;
    }
    if (typeof setupThemeSync !== "undefined") {
      setupThemeSync = function () {};
      window.setupThemeSync = setupThemeSync;
    }
    if (typeof updateStreakStatsCard !== "undefined") {
      updateStreakStatsCard = function () {};
      window.updateStreakStatsCard = updateStreakStatsCard;
    }
    if (typeof renderStreakDisplay !== "undefined") {
      renderStreakDisplay = function () {};
      window.renderStreakDisplay = renderStreakDisplay;
    }
  `);
  harness.fireDOMContentLoaded();
  return harness;
}

describe("Customodoro timer regression tests", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["Date", "setTimeout", "setInterval"] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  test("classic settings persist across a simulated refresh", () => {
    const sharedStorage = {
      pomodoroTime: "45",
      shortBreakTime: "7",
      longBreakTime: "20",
      sessionsCount: "6",
      autoBreak: "true",
      autoPomodoro: "false",
    };

    const firstLoad = setupClassicHarness(sharedStorage);
    assert.equal(firstLoad.evaluate("pomodoroTime"), 45);
    assert.equal(firstLoad.evaluate("shortBreakTime"), 7);
    assert.equal(firstLoad.evaluate("longBreakTime"), 20);
    assert.equal(firstLoad.evaluate("maxSessions"), 6);

    const secondLoad = setupClassicHarness(sharedStorage);
    assert.equal(secondLoad.evaluate("pomodoroTime"), 45);
    assert.equal(secondLoad.evaluate("shortBreakTime"), 7);
    assert.equal(secondLoad.evaluate("longBreakTime"), 20);
    assert.equal(secondLoad.evaluate("maxSessions"), 6);
  });

  test("classic timer uses timestamp compensation after throttled background time", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "1",
      longBreakTime: "1",
      sessionsCount: "4",
      autoBreak: "false",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.dispatch("document", "visibilitychange");

    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), false);
  });

  test("reverse timer compensates after throttled background time", () => {
    const harness = setupReverseHarness({
      breakLogicMode: "dynamic",
      reverseMaxTime: "1",
      reverseBreak1: "1",
      reverseBreak2: "1",
      reverseBreak3: "1",
      reverseBreak4: "1",
      reverseBreak5: "1",
      autoBreak: "false",
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.dispatch("window", "focus");

    assert.equal(harness.evaluate("currentMode"), "break");
    assert.equal(harness.evaluate("earnedBreakTime"), 1);
    assert.equal(harness.evaluate("isRunning"), false);
  });

  test("reverse locked-in timer controls track real timer state", () => {
    const harness = setupReverseHarness({
      breakLogicMode: "dynamic",
      reverseMaxTime: "2",
      reverseBreak1: "1",
      reverseBreak2: "1",
      reverseBreak3: "1",
      reverseBreak4: "1",
      reverseBreak5: "1",
      autoBreak: "false",
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("window.lockedInMode.enter()");

    assert.equal(
      harness.evaluate("document.body.classList.contains('lockedin-mode-active')"),
      true,
    );
    assert.equal(harness.evaluate("window.timerControls.getState()"), "running");
    assert.equal(
      harness.evaluate("document.getElementById('lockedin-mode-toggle-btn').textContent"),
      "PAUSE",
    );

    harness.evaluate("window.timerControls.runPrimaryAction()");
    assert.equal(harness.evaluate("window.timerControls.getState()"), "paused");
    assert.equal(
      harness.evaluate("document.getElementById('lockedin-mode-toggle-btn').textContent"),
      "RESUME",
    );

    harness.evaluate("window.lockedInMode.exit()");
    assert.equal(
      harness.evaluate("document.body.classList.contains('lockedin-mode-active')"),
      false,
    );
  });

  test("locked-in mode hides and restores the radial menu", () => {
    const harness = setupReverseHarness({
      breakLogicMode: "dynamic",
      reverseMaxTime: "2",
      reverseBreak1: "1",
      reverseBreak2: "1",
      reverseBreak3: "1",
      reverseBreak4: "1",
      reverseBreak5: "1",
      autoBreak: "false",
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
    });

    harness.evaluate(`
      const radialMenuContainer = document.createElement("div");
      radialMenuContainer.className = "radial-menu-container";
      document.body.appendChild(radialMenuContainer);
      window.__radialMenuCloseCalls = 0;
      window.radialMenu = {
        close() {
          window.__radialMenuCloseCalls += 1;
        },
      };
    `);

    harness.evaluate("window.lockedInMode.enter()");
    assert.equal(
      harness.evaluate(
        "document.querySelector('.radial-menu-container').hidden",
      ),
      true,
    );
    assert.equal(
      harness.evaluate(
        "document.querySelector('.radial-menu-container').getAttribute('aria-hidden')",
      ),
      "true",
    );
    assert.equal(harness.evaluate("window.__radialMenuCloseCalls"), 1);

    harness.evaluate("window.lockedInMode.exit()");
    assert.equal(
      harness.evaluate(
        "document.querySelector('.radial-menu-container').hidden",
      ),
      false,
    );
    assert.equal(
      harness.evaluate(
        "document.querySelector('.radial-menu-container').getAttribute('aria-hidden')",
      ),
      "false",
    );
  });

  test("locked-in mode applies saved display preferences", () => {
    const harness = setupReverseHarness({
      breakLogicMode: "dynamic",
      reverseMaxTime: "2",
      reverseBreak1: "1",
      reverseBreak2: "1",
      reverseBreak3: "1",
      reverseBreak4: "1",
      reverseBreak5: "1",
      autoBreak: "false",
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
      lockedInModeVisibility: JSON.stringify({
        buttons: false,
        progress: false,
        session: true,
        exit: false,
      }),
    });

    harness.evaluate("window.lockedInMode.enter()");

    assert.deepEqual(
      JSON.parse(harness.evaluate(`JSON.stringify({
        buttons: document.querySelector(".lockedin-mode-overlay").dataset.showButtons,
        progress: document.querySelector(".lockedin-mode-overlay").dataset.showProgress,
        session: document.querySelector(".lockedin-mode-overlay").dataset.showSession,
        exit: document.querySelector(".lockedin-mode-overlay").dataset.showExit,
      })`)),
      {
        buttons: "false",
        progress: "false",
        session: "true",
        exit: "false",
      },
    );
  });

  test("locked-in mode rejects invalid saved display values", () => {
    const harness = setupReverseHarness({
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
      lockedInModeVisibility: JSON.stringify({
        buttons: "false",
        progress: null,
        session: false,
        exit: 0,
      }),
    });

    harness.evaluate("window.lockedInMode.enter()");

    assert.deepEqual(
      JSON.parse(harness.evaluate(`JSON.stringify({
        buttons: document.querySelector(".lockedin-mode-overlay").dataset.showButtons,
        progress: document.querySelector(".lockedin-mode-overlay").dataset.showProgress,
        session: document.querySelector(".lockedin-mode-overlay").dataset.showSession,
        exit: document.querySelector(".lockedin-mode-overlay").dataset.showExit,
      })`)),
      {
        buttons: "true",
        progress: "true",
        session: "false",
        exit: "true",
      },
    );
  });

  test("sync manager persists the latest offline snapshot and clears it after sync", async () => {
    const harness = createHarness({ repoRoot });
    harness.evaluate(`
      navigator.onLine = false;
      window.authService = {
        isLoggedIn() { return true; },
        getCurrentUser() { return { userId: "user_123", email: "u@example.com" }; },
        addEventListener() {},
      };
    `);
    harness.loadScript("js/sync-manager.js");

    assert.equal(
      harness.evaluate(
        `window.syncManager.queueSync({ productivityStats: { "2026-06-28": { classic: 1 } } })`,
      ),
      true,
    );
    harness.evaluate(
      `window.syncManager.queueSync({ productivityStats: { "2026-06-28": { classic: 2 } } })`,
    );

    const persisted = JSON.parse(
      harness.localStorage.getItem("customodoro-pending-sync"),
    );
    assert.equal(persisted.userId, "user_123");
    assert.equal(persisted.revision, 2);
    assert.equal(persisted.data.productivityStats["2026-06-28"].classic, 2);
    assert.equal(harness.evaluate("window.syncManager.syncQueue.length"), 1);

    harness.evaluate(`
      window.syncManager.isOnline = true;
      window.syncManager.manualSync = async function () {};
    `);
    await harness.evaluate("window.syncManager.processSyncQueue()");

    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );
    assert.equal(harness.evaluate("window.syncManager.syncQueue.length"), 0);
  });

  test("sync manager drains a newer snapshot queued during an in-flight sync", async () => {
    const harness = createHarness({ repoRoot });
    harness.evaluate(`
      navigator.onLine = false;
      window.authService = {
        isLoggedIn() { return true; },
        getCurrentUser() { return { userId: "user_123", email: "u@example.com" }; },
        addEventListener() {},
      };
    `);
    harness.loadScript("js/sync-manager.js");
    harness.evaluate(`
      window.__syncCalls = [];
      window.__syncResolvers = [];
      window.syncManager.manualSync = function () {
        this.syncInProgress = true;
        window.__syncCalls.push(this.syncQueue[this.syncQueue.length - 1].revision);
        return new Promise((resolve) => {
          window.__syncResolvers.push(() => {
            this.syncInProgress = false;
            resolve();
          });
        });
      };
      window.syncManager.queueSync({ version: 1 });
      window.syncManager.isOnline = true;
    `);

    const processing = harness.evaluate("window.syncManager.processSyncQueue()");
    await new Promise((resolve) => setImmediate(resolve));
    harness.evaluate("window.syncManager.queueSync({ version: 2 })");
    harness.evaluate("window.__syncResolvers[0]()");
    await new Promise((resolve) => setImmediate(resolve));

    let persisted = JSON.parse(
      harness.localStorage.getItem("customodoro-pending-sync"),
    );
    assert.equal(persisted.revision, 2);
    assert.equal(persisted.data.version, 2);

    harness.evaluate("window.__syncResolvers[1]()");
    assert.equal(await processing, true);
    assert.deepEqual(
      JSON.parse(harness.evaluate("JSON.stringify(window.__syncCalls)")),
      [1, 2],
    );
    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );
  });

  test("sync manager retains failed snapshots and normalizes legacy revisions", async () => {
    const pending = {
      userId: "user_123",
      timestamp: "2026-06-28T00:00:00.000Z",
      data: { version: 1 },
    };
    const harness = createHarness({
      repoRoot,
      initialStorage: {
        "customodoro-pending-sync": JSON.stringify(pending),
      },
    });
    harness.evaluate(`
      navigator.onLine = true;
      window.authService = {
        isLoggedIn() { return true; },
        getCurrentUser() { return { userId: "user_123", email: "u@example.com" }; },
        addEventListener() {},
      };
    `);
    harness.loadScript("js/sync-manager.js");
    harness.evaluate(`
      window.syncManager.manualSync = async function () {
        throw new Error("simulated network failure");
      };
    `);

    assert.equal(
      harness.evaluate("window.syncManager.syncQueue[0].revision"),
      1,
    );
    assert.equal(
      await harness.evaluate("window.syncManager.processSyncQueue()"),
      false,
    );
    assert.equal(
      JSON.parse(
        harness.localStorage.getItem("customodoro-pending-sync"),
      ).revision,
      1,
    );

    harness.evaluate("window.syncManager.clearSyncQueue()");
    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );
  });

  test("sync manager processes reconnects and clears user-scoped data on logout", async () => {
    const harness = createHarness({ repoRoot });
    harness.evaluate(`
      navigator.onLine = false;
      window.__authListener = null;
      window.authService = {
        isLoggedIn() { return true; },
        getCurrentUser() { return { userId: "user_123", email: "u@example.com" }; },
        addEventListener(callback) { window.__authListener = callback; },
      };
    `);
    harness.loadScript("js/sync-manager.js");
    harness.evaluate(`
      window.syncManager.queueSync({ version: 1 });
      window.syncManager.manualSync = async function () {};
    `);

    harness.dispatch("window", "online");
    mock.timers.tick(1100);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );

    harness.evaluate(`
      navigator.onLine = false;
      window.syncManager.isOnline = false;
      window.syncManager.queueSync({ version: 2 });
      window.authService.getCurrentUser = function () {
        return { userId: "user_456", email: "other@example.com" };
      };
      window.syncManager.isOnline = true;
    `);
    assert.equal(
      await harness.evaluate("window.syncManager.processSyncQueue()"),
      false,
    );
    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );

    harness.evaluate(`
      window.authService.getCurrentUser = function () {
        return { userId: "user_123", email: "u@example.com" };
      };
      window.syncManager.isOnline = false;
      window.syncManager.queueSync({ version: 3 });
      window.__authListener("logout");
    `);
    assert.equal(harness.evaluate("window.syncManager.syncQueue.length"), 0);
    assert.equal(
      harness.localStorage.getItem("customodoro-pending-sync"),
      null,
    );
  });
});

test("PWA copyright year uses the shared current-year updater", () => {
  const script = fs.readFileSync(
    path.join(repoRoot, "js", "copyright-year.js"),
    "utf8",
  );
  const serviceWorker = fs.readFileSync(path.join(repoRoot, "sw.js"), "utf8");
  const pages = ["index.html", "reverse.html", "pomodoro.html", "feedback.html"];

  assert.match(script, /const launchYear = 2025;/);
  assert.match(script, /new Date\(\)\.getFullYear\(\)/);
  assert.match(script, /querySelectorAll\("\.copyright-year"\)/);
  assert.match(serviceWorker, /\/js\/copyright-year\.js/);

  for (const page of pages) {
    const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
    assert.match(html, /class="copyright-year"/);
    assert.match(html, /js\/copyright-year\.js\?v=1\.0\.0/);
  }
});

test("service worker precaches and serves versioned core assets offline", () => {
  const serviceWorker = fs.readFileSync(path.join(repoRoot, "sw.js"), "utf8");
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"),
  );

  assert.doesNotMatch(serviceWorker, /\/js\/offline-sync\.js/);
  assert.doesNotMatch(serviceWorker, /\/js\/offline-fallback-ui\.js/);
  assert.match(serviceWorker, /Promise\.allSettled/);
  assert.match(serviceWorker, /corePathnames\.has\(requestUrl\.pathname\)/);
  assert.match(serviceWorker, /ignoreSearch:\s*true/);
  assert.match(serviceWorker, /requiredPrecacheUrls/);
  assert.match(serviceWorker, /forceUpdate:\s*false/);
  assert.match(serviceWorker, /"\/reverse"/);
  assert.equal(
    vercelConfig.headers.find((rule) => rule.source === "/sw.js").headers[0]
      .value,
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
});

test("locked-in mode keeps timer button sizing consistent", () => {
  const featuresCss = fs.readFileSync(
    path.join(repoRoot, "css", "features.css"),
    "utf8",
  );

  assert.match(featuresCss, /\.lockedin-mode-buttons button\s*{/);
  assert.match(featuresCss, /min-width:\s*120px;/);
  assert.match(featuresCss, /\.lockedin-mode-buttons \.primary-btn,/);
  assert.match(featuresCss, /width:\s*100%;/);
});

test("locked-in display options use a device-independent native checkbox pattern", () => {
  const lockedInScript = fs.readFileSync(
    path.join(repoRoot, "js", "lockedin-mode.js"),
    "utf8",
  );
  const featuresCss = fs.readFileSync(
    path.join(repoRoot, "css", "features.css"),
    "utf8",
  );

  assert.match(lockedInScript, /type="checkbox"/);
  assert.match(lockedInScript, /class="lockedin-checkbox-visual"/);
  assert.match(lockedInScript, /aria-hidden="true"/);
  assert.match(
    featuresCss,
    /input:checked \+ \.lockedin-checkbox-visual/,
  );
  assert.match(
    featuresCss,
    /input:focus-visible \+ \.lockedin-checkbox-visual/,
  );
});

test("PWA update dialogs contain and restore keyboard focus", () => {
  for (const page of ["index.html", "reverse.html"]) {
    const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
    assert.match(html, /const previouslyFocusedElement = document\.activeElement/);
    assert.match(html, /event\.key === "Tab"/);
    assert.match(html, /event\.preventDefault\(\)/);
    assert.match(
      html,
      /removeEventListener\("keydown", keepFocusInUpdateDialog\)/,
    );
    assert.match(html, /previouslyFocusedElement\?\.isConnected/);
  }
});

test("locked-in mode mobile display panel avoids the exit tap target", () => {
  const featuresCss = fs.readFileSync(
    path.join(repoRoot, "css", "features.css"),
    "utf8",
  );

  assert.match(featuresCss, /@media \(max-width:\s*480px\)/);
  assert.match(featuresCss, /\.lockedin-mode-exit\s*{[\s\S]*min-height:\s*44px;/);
  assert.match(featuresCss, /\.lockedin-mode-panel\s*{[\s\S]*top:\s*auto;/);
  assert.match(featuresCss, /bottom:\s*max\(16px,\s*env\(safe-area-inset-bottom\)\);/);
  assert.match(featuresCss, /transform:\s*translate\(-50%,\s*10px\);/);
});

test("locked-in mode suppresses account controls after sync updates", () => {
  const featuresCss = fs.readFileSync(
    path.join(repoRoot, "css", "features.css"),
    "utf8",
  );

  assert.match(featuresCss, /body\.lockedin-mode-active #user-profile,/);
  assert.match(
    featuresCss,
    /body\.lockedin-mode-active #user-profile \.user-actions/,
  );
  assert.match(featuresCss, /display:\s*none\s*!important;/);
  assert.match(featuresCss, /pointer-events:\s*none\s*!important;/);
});
