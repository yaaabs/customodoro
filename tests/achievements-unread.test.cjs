const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");
const FIXTURE_BADGE = `window.addAchievementForUser("Fixture User", { title: "Streak Legend", icon: "images/badges/custom-badges/2026-07/july-streak.webp", description: "Fixture badge.", date: "2026-08-01" });`;

function setupAchievementsHarness(storageBacking = {}) {
  const harness = createHarness({ repoRoot, storageBacking });
  harness.evaluate(`
    window.authService = {
      getCurrentUser() {
        return { username: "Fixture User" };
      },
    };
  `);
  harness.loadScript("js/database-achievements.js");
  // A made-up user with one badge, so real monthly awards never change these counts.
  harness.evaluate(FIXTURE_BADGE);
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
  assert.match(storage["customodoro-achievement-read-v1"], /Fixture User/);

  const rerendered = setupAchievementsHarness(storage);
  assert.equal(rerendered.evaluate("document.querySelectorAll('.badge--unread').length"), 0);
});

test("a signed-in user with no hardcoded badges sees the empty state", () => {
  const harness = createHarness({ repoRoot });
  harness.evaluate(`
    window.authService = { getCurrentUser() { return { userId: "new-user", username: "Nobody Yet" }; } };
  `);
  harness.loadScript("js/database-achievements.js");
  harness.evaluate(`
    const container = document.createElement("div");
    container.id = "empty-awards";
    document.body.appendChild(container);
    window.loadAchievements("empty-awards");
  `);
  assert.equal(harness.evaluate("document.querySelectorAll('.badge').length"), 0);
  assert.match(harness.evaluate("document.querySelector('.no-badge').textContent"), /No badges collected yet/);
});
