const path = require("path");
const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");

function setupClassicHarness(storage = {}) {
  const harness = createHarness({
    repoRoot,
    initialStorage: storage,
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

function setupReverseHarness(storage = {}) {
  const harness = createHarness({
    repoRoot,
    initialStorage: storage,
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

function advanceActiveTimerBy(harness, milliseconds) {
  harness.evaluate("clearInterval(timerInterval)");
  mock.timers.tick(milliseconds);
  harness.evaluate("updateTimerFromTimestamp()");
}

function flushAutoStartDelay() {
  mock.timers.tick(700);
}

describe("Customodoro smoke tests", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["Date", "setTimeout", "setInterval"] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  test("classic work completion advances to short break", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "2",
      longBreakTime: "3",
      sessionsCount: "4",
      autoBreak: "false",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.evaluate("updateTimerFromTimestamp()");

    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), false);
    assert.equal(harness.evaluate("currentSeconds"), 120);
    assert.equal(harness.evaluate("completedPomodoros"), 1);
  });

  test("classic auto-break starts the break timer automatically", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "2",
      longBreakTime: "3",
      sessionsCount: "4",
      autoBreak: "true",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.evaluate("updateTimerFromTimestamp()");

    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), true);
    assert.equal(harness.evaluate("startButton.textContent"), "PAUSE");
    assert.equal(harness.evaluate("currentSeconds"), 120);
  });

  test("classic completion is recorded once across repeated restore events", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "2",
      longBreakTime: "3",
      sessionsCount: "4",
      autoBreak: "true",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.dispatch("document", "visibilitychange");
    harness.dispatch("window", "focus");
    harness.dispatch("window", "pageshow");

    assert.equal(harness.evaluate("completedPomodoros"), 1);
    assert.equal(harness.evaluate("window.__sessions.length"), 1);
    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), true);
  });

  test("classic phase transition survives a local session side-effect failure", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "2",
      sessionsCount: "4",
      autoBreak: "true",
    });
    harness.evaluate(`
      window.addCustomodoroSession = function () {
        throw new Error("simulated storage failure");
      };
    `);

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.evaluate("updateTimerFromTimestamp()");

    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), true);
    assert.equal(harness.evaluate("completedPomodoros"), 1);
  });

  test("classic completion guard resets after a phase-transition exception", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "1",
      sessionsCount: "4",
      autoBreak: "true",
      autoPomodoro: "false",
    });
    harness.evaluate(`
      window.lockedInMode = {
        isActive() { return true; },
        update() { throw new Error("simulated Locked-In render failure"); },
      };
      toggleTimer();
      clearInterval(timerInterval);
    `);
    mock.timers.tick(60_000);

    assert.throws(
      () => harness.evaluate("updateTimerFromTimestamp()"),
      /simulated Locked-In render failure/,
    );
    assert.equal(harness.evaluate("isCompletingTimer"), false);

    harness.evaluate(`
      window.lockedInMode = { isActive() { return false; } };
      resetTimer();
      toggleTimer();
      clearInterval(timerInterval);
    `);
    mock.timers.tick(60_000);
    harness.evaluate("updateTimerFromTimestamp()");

    assert.equal(harness.evaluate("currentMode"), "pomodoro");
    assert.equal(harness.evaluate("isCompletingTimer"), false);
  });

  test("classic pause and resume preserve elapsed time", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "2",
      shortBreakTime: "1",
      longBreakTime: "3",
      sessionsCount: "4",
      autoBreak: "false",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    mock.timers.tick(30_000);
    harness.evaluate("toggleTimer()");

    const pausedSeconds = harness.evaluate("currentSeconds");
    mock.timers.tick(45_000);
    assert.equal(harness.evaluate("currentSeconds"), pausedSeconds);

    harness.evaluate("toggleTimer()");
    mock.timers.tick(pausedSeconds * 1000 + 100);

    assert.equal(harness.evaluate("currentMode"), "shortBreak");
    assert.equal(harness.evaluate("isRunning"), false);
  });

  test("classic configured cycle count triggers long break", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "1",
      shortBreakTime: "2",
      longBreakTime: "5",
      sessionsCount: "1",
      autoBreak: "false",
      autoPomodoro: "false",
    });

    harness.evaluate("toggleTimer()");
    harness.evaluate("clearInterval(timerInterval)");
    mock.timers.tick(60_000);
    harness.evaluate("updateTimerFromTimestamp()");

    assert.equal(harness.evaluate("currentMode"), "longBreak");
    assert.equal(harness.evaluate("currentSeconds"), 300);
  });

  test("classic real scenario follows 25/5/15 timing and lands on long break after configured sessions", () => {
    const harness = setupClassicHarness({
      pomodoroTime: "25",
      shortBreakTime: "5",
      longBreakTime: "15",
      sessionsCount: "4",
      autoBreak: "true",
      autoPomodoro: "true",
    });

    for (let cycle = 1; cycle <= 4; cycle += 1) {
      if (!harness.evaluate("isRunning")) {
        harness.evaluate("toggleTimer()");
      }

      assert.equal(harness.evaluate("currentMode"), "pomodoro");
      assert.equal(harness.evaluate("isRunning"), true);

      advanceActiveTimerBy(harness, 25 * 60_000);
      flushAutoStartDelay();

      assert.equal(harness.evaluate("completedPomodoros"), cycle);

      if (cycle < 4) {
        assert.equal(harness.evaluate("currentMode"), "shortBreak");
        assert.equal(harness.evaluate("isRunning"), true);
        assert.equal(harness.evaluate("initialSeconds"), 5 * 60);

        advanceActiveTimerBy(harness, 5 * 60_000);
        flushAutoStartDelay();

        assert.equal(harness.evaluate("currentMode"), "pomodoro");
        assert.equal(harness.evaluate("isRunning"), true);
        assert.equal(harness.evaluate("initialSeconds"), 25 * 60);
      } else {
        assert.equal(harness.evaluate("currentMode"), "longBreak");
        assert.equal(harness.evaluate("isRunning"), true);
        assert.equal(harness.evaluate("initialSeconds"), 15 * 60);
        assert.equal(harness.evaluate("currentSeconds <= initialSeconds"), true);
      }
    }
  });

  test("reverse real scenario completes a 60-minute work block and auto-starts the earned 30-minute break", () => {
    const harness = setupReverseHarness({
      breakLogicMode: "default",
      reverseMaxTime: "60",
      reverseBreak1: "2",
      reverseBreak2: "5",
      reverseBreak3: "10",
      reverseBreak4: "15",
      reverseBreak5: "30",
      autoBreak: "true",
      lockedInModeEnabled: "true",
      focusModeEnabled: "true",
    });

    harness.evaluate("toggleTimer()");
    advanceActiveTimerBy(harness, 60 * 60_000);
    flushAutoStartDelay();

    assert.equal(harness.evaluate("currentMode"), "break");
    assert.equal(harness.evaluate("earnedBreakTime"), 30);
    assert.equal(harness.evaluate("initialSeconds"), 30 * 60);
    assert.equal(harness.evaluate("isRunning"), true);
    assert.equal(harness.evaluate("window.lockedInMode.isEnabled()"), true);

    advanceActiveTimerBy(harness, 30 * 60_000);

    assert.equal(harness.evaluate("currentMode"), "reverse");
    assert.equal(harness.evaluate("isRunning"), false);
    assert.equal(harness.evaluate("timerState"), "idle");
    assert.equal(harness.evaluate("currentSeconds"), 0);
  });

  const reverseMatrix = [
    { lockedIn: false, autoBreak: false },
    { lockedIn: false, autoBreak: true },
    { lockedIn: true, autoBreak: false },
    { lockedIn: true, autoBreak: true },
  ];

  reverseMatrix.forEach(({ lockedIn, autoBreak }) => {
    test(`reverse mode completion transitions correctly (lockedIn=${lockedIn}, autoBreak=${autoBreak})`, () => {
      const harness = setupReverseHarness({
        breakLogicMode: "dynamic",
        reverseMaxTime: "1",
        reverseBreak1: "1",
        reverseBreak2: "1",
        reverseBreak3: "1",
        reverseBreak4: "1",
        reverseBreak5: "1",
        autoBreak: String(autoBreak),
        lockedInModeEnabled: String(lockedIn),
        focusModeEnabled: String(lockedIn),
      });

      harness.evaluate("toggleTimer()");

      if (lockedIn) {
        assert.equal(harness.evaluate("window.lockedInMode.isEnabled()"), true);
      }

      harness.evaluate("clearInterval(timerInterval)");
      mock.timers.tick(60_000);
      harness.evaluate("updateTimerFromTimestamp()");

      if (autoBreak) {
        mock.timers.tick(700);
      }

      assert.equal(harness.evaluate("currentMode"), "break");
      assert.equal(harness.evaluate("earnedBreakTime"), 1);
      assert.equal(harness.evaluate("isRunning"), autoBreak);

      if (lockedIn && autoBreak) {
        assert.equal(harness.evaluate("window.lockedInMode.isEnabled()"), true);
      }
    });
  });
});
