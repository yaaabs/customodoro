const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");

function setupAchievementsHarness(storageBacking = {}) {
  const harness = createHarness({ repoRoot, storageBacking });
  harness.evaluate(`
    window.authService = {
      getCurrentUser() {
        return { username: "Jec Jec" };
      },
    };
  `);
  harness.loadScript("js/database-achievements.js");
  harness.evaluate(`
    const container = document.createElement("div");
    container.id = "achievements-container";
    document.body.appendChild(container);
    window.loadAchievements("achievements-container");
  `);
  return harness;
}

test("achievement badges remain unread until opened and persist as read", () => {
  const storage = {};
  const harness = setupAchievementsHarness(storage);

  assert.equal(harness.evaluate("document.querySelectorAll('.badge--unread').length"), 1);
  assert.equal(harness.evaluate("document.querySelector('.badge--unread').dataset.badgeUnread"), "true");

  harness.evaluate("document.querySelector('.badge--unread').dispatchEvent({ type: 'click' })");

  assert.equal(harness.evaluate("document.querySelectorAll('.badge--unread').length"), 0);
  assert.match(storage["customodoro-achievement-read-v1"], /Jec Jec/);

  const rerendered = setupAchievementsHarness(storage);
  assert.equal(rerendered.evaluate("document.querySelectorAll('.badge--unread').length"), 0);
});

test("persisted monthly awards merge with existing and first-time winner badges", () => {
  const existing = createHarness({ repoRoot });
  existing.evaluate(`
    window.authService = { getCurrentUser() { return { userId: "winner", username: "Jec Jec" }; } };
  `);
  existing.loadScript("js/database-achievements.js");
  existing.evaluate(`
    const container = document.createElement("div");
    container.id = "existing-awards";
    document.body.appendChild(container);
    window.loadAchievements("existing-awards", [{
      title: "Overall Champion", description: "August winner", icon: "images/badges/custom-badges/2026-08/aug-champion.webp", date: "2026-09-01"
    }]);
  `);
  assert.equal(existing.evaluate("document.querySelectorAll('.badge').length"), 2);
  assert.equal(existing.evaluate("document.querySelectorAll('.badge')[1].dataset.badgeTitle"), "Overall Champion");

  const firstTime = createHarness({ repoRoot });
  firstTime.evaluate(`
    window.authService = { getCurrentUser() { return { userId: "new-winner", username: "New Winner" }; } };
  `);
  firstTime.loadScript("js/database-achievements.js");
  firstTime.evaluate(`
    const container = document.createElement("div");
    container.id = "new-awards";
    document.body.appendChild(container);
    window.loadAchievements("new-awards", [{
      title: "Focus King", description: "August winner", icon: "images/badges/custom-badges/2026-08/aug-focus.webp", date: "2026-09-01"
    }]);
  `);
  assert.equal(firstTime.evaluate("document.querySelectorAll('.badge').length"), 1);
  assert.equal(firstTime.evaluate("document.querySelector('.badge').dataset.badgeTitle"), "Focus King");
});
