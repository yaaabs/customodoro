const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMonthKey,
  getBadgeAssets,
  calculateMonthlyWinners,
  buildAwards,
  parseWinnersFile,
  applyManualWinners,
} = require("../scripts/monthly-leaderboard-badges.js");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");

function user(user_id, username, dates) {
  return { user_id, username, data: { productivityStatsByDay: dates } };
}

test("month parsing rejects current and future periods", () => {
  assert.throws(() => parseMonthKey("2026-09", new Date(2026, 8, 3)), /completed/);
  assert.throws(() => parseMonthKey("2026-13", new Date(2026, 8, 3)), /YYYY-MM/);
  assert.equal(parseMonthKey("2026-08", new Date(2026, 8, 3)).monthName, "August");
});

test("month-prefixed assets are required for every category", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "customodoro-badges-"));
  const directory = path.join(root, "images", "badges", "custom-badges", "2026-08");
  fs.mkdirSync(directory, { recursive: true });
  ["aug-focus.webp", "aug-session.webp", "aug-streak.webp", "aug-champion.webp"].forEach((name) => fs.writeFileSync(path.join(directory, name), "badge"));
  const assets = getBadgeAssets(parseMonthKey("2026-08", new Date(2026, 8, 3)), root);
  assert.equal(assets.total_focus, "images/badges/custom-badges/2026-08/aug-focus.webp");
  fs.unlinkSync(path.join(directory, "aug-champion.webp"));
  assert.throws(() => getBadgeAssets(parseMonthKey("2026-08", new Date(2026, 8, 3)), root), /aug-champion/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("August fixture selects the stated category winners", () => {
  const month = parseMonthKey("2026-08", new Date(2026, 8, 3));
  const users = [
    user("focus", "kookiejarfull", { "2026-08-01": { total_minutes: 12995, classic: 275 } }),
    user("sessions", "Kumari", { "2026-08-01": { total_minutes: 7605, classic: 424 } }),
    user("streak", "Jec Jec", Object.fromEntries(Array.from({ length: 31 }, (_, index) => [`2026-08-${String(index + 1).padStart(2, "0")}`, { total_minutes: 5, classic: 1 }]))),
  ];
  const winners = calculateMonthlyWinners(users, month);
  assert.equal(winners.winners.total_focus.username, "kookiejarfull");
  assert.equal(winners.winners.total_focus.score, 2599);
  assert.equal(winners.winners.total_sessions.username, "Kumari");
  assert.equal(winners.winners.total_sessions.score, 424);
  assert.equal(winners.winners.longest_streak.username, "Jec Jec");
  assert.equal(winners.winners.longest_streak.score, 31);
  assert.equal(buildAwards(winners, month, {
    total_focus: "focus.webp", total_sessions: "session.webp", longest_streak: "streak.webp", overall_champion: "champion.webp",
  }).length, 4);
});

test("ties use alphabetical username order", () => {
  const month = parseMonthKey("2026-08", new Date(2026, 8, 3));
  const winners = calculateMonthlyWinners([
    user("z", "Zed", { "2026-08-01": { total_minutes: 500, classic: 10 } }),
    user("a", "Amy", { "2026-08-01": { total_minutes: 500, classic: 10 } }),
  ], month);
  assert.equal(winners.winners.total_focus.username, "Amy");
  assert.equal(winners.winners.total_sessions.username, "Amy");
});

test("winners.txt picks override the calculated winners", () => {
  const month = parseMonthKey("2026-08", new Date(2026, 8, 3));
  const users = [
    user("a", "Amy", { "2026-08-01": { total_minutes: 900, classic: 20 } }),
    user("b", "Ben", { "2026-08-01": { total_minutes: 100, classic: 2 } }),
  ];
  const picks = parseWinnersFile("# August\nfocus: ben\nsession: Amy\nstreak: Ben\nchampion: Ben\n");
  const winners = applyManualWinners(calculateMonthlyWinners(users, month), picks, users, month);
  assert.equal(winners.winners.total_focus.username, "Ben");
  assert.equal(winners.winners.total_focus.score, 20);
  assert.equal(winners.topByCategory.total_focus[0].userId, "b");
  assert.equal(winners.winners.total_sessions.username, "Amy");
  assert.equal(winners.winners.overall_champion.userId, "b");
  assert.throws(() => parseWinnersFile("focus: Ben\n"), /missing: session, streak, champion/);
  assert.throws(() => applyManualWinners(calculateMonthlyWinners(users, month), { ...picks, total_focus: "Nobody" }, users, month), /No account/);
});

function renderedBadges(username) {
  const harness = createHarness({ repoRoot });
  harness.evaluate(`window.authService = { getCurrentUser() { return { username: ${JSON.stringify(username)} }; } };`);
  harness.loadScript("js/database-achievements.js");
  harness.evaluate(`
    const container = document.createElement("div");
    container.id = "achievements";
    document.body.appendChild(container);
    window.loadAchievements("achievements");
  `);
  return JSON.parse(harness.evaluate("JSON.stringify(Array.from(document.querySelectorAll('.badge')).map((el) => ({ title: el.dataset.badgeTitle, desc: el.dataset.badgeDesc, date: el.dataset.badgeDate })))"));
}

test("September 2026 winners receive their hardcoded badges", () => {
  const september = (badges) => badges.filter((badge) => badge.desc.endsWith("in September.") && badge.date === "2026-10-01").map((badge) => badge.title).sort();
  assert.deepEqual(september(renderedBadges("bb")), ["Focus King"]);
  assert.deepEqual(september(renderedBadges("Kumari")), ["Overall Champion", "Session Master", "Streak Legend"]);
});

test("every hardcoded custom badge icon exists on disk", () => {
  const source = fs.readFileSync(path.join(repoRoot, "js", "database-achievements.js"), "utf8");
  const icons = [...source.matchAll(/icon: "(images\/badges\/custom-badges\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(icons.length > 40);
  assert.deepEqual(icons.filter((icon) => !fs.existsSync(path.join(repoRoot, icon))), []);
});
