const path = require("path");
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
});
