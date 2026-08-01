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