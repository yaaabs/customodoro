const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const {
  parseMonthKey,
  getBadgeAssets,
  calculateMonthlyWinners,
  buildAwards,
  parseWinnersFile,
  applyManualWinners,
  addAwardsToSource,
  announcedWinners,
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

test("addAwardsToSource appends to existing users and inserts new users below the last one", () => {
  const source = fs.readFileSync(path.join(repoRoot, "js", "database-achievements.js"), "utf8");
  const award = (username, title, suffix) => ({ username, title, description: `Test award for ${username} in October.`, icon_path: `images/badges/custom-badges/2026-10/oct-${suffix}.webp`, awarded_on: "2026-11-01" });
  const awards = [award("kumari", "Focus King", "focus"), award("Brand New", "Session Master", "session"), award("Zed", "Streak Legend", "streak")];
  const { source: next, added } = addAwardsToSource(source, awards, "October");
  assert.deepEqual(added.map((entry) => [entry.username, entry.newUser]), [["kumari", false], ["Brand New", true], ["Zed", true]]);
  const sandbox = {};
  vm.runInNewContext(next.match(/const hardcodedAchievements = \{[\s\S]*?\n  \};/)[0].replace("const hardcodedAchievements =", "result ="), sandbox);
  const original = {};
  vm.runInNewContext(source.match(/const hardcodedAchievements = \{[\s\S]*?\n  \};/)[0].replace("const hardcodedAchievements =", "result ="), original);
  assert.deepEqual(Object.keys(sandbox.result), [...Object.keys(original.result), "Brand New", "Zed"]);
  assert.equal(sandbox.result.Kumari.at(-1).icon, "images/badges/custom-badges/2026-10/oct-focus.webp");
  assert.equal(sandbox.result["Brand New"][0].date, "2026-11-01");
  assert.equal(addAwardsToSource(next, awards, "October").added.length, 0);
});

test("a re-registered copy of an account is counted once, keeping the older account", () => {
  const month = parseMonthKey("2026-07", new Date(2026, 7, 3));
  const days = { "2026-07-01": { total_minutes: 300, classic: 6 }, "2026-07-02": { total_minutes: 300, classic: 6 }, "2026-07-03": { total_minutes: 300, classic: 6 } };
  const users = [
    { ...user("new", "NewName", days), created_at: "2026-07-20T00:00:00" },
    { ...user("old", "OldName", days), created_at: "2025-09-01T00:00:00" },
    user("other", "Other", { "2026-07-01": { total_minutes: 50, classic: 1 } }),
  ];
  const winners = calculateMonthlyWinners(users, month);
  assert.equal(winners.totalParticipants, 2);
  assert.deepEqual(winners.topByCategory.total_focus.map((entry) => entry.username), ["OldName", "Other"]);
  // Two real people with one identical short day are not merged.
  const twins = calculateMonthlyWinners([user("a", "A", { "2026-07-01": { total_minutes: 25, classic: 1 } }), user("b", "B", { "2026-07-01": { total_minutes: 25, classic: 1 } })], month);
  assert.equal(twins.totalParticipants, 2);
});

test("announcedWinners reads each month's winners from the hardcoded achievements", () => {
  const source = fs.readFileSync(path.join(repoRoot, "js", "database-achievements.js"), "utf8");
  assert.deepEqual(announcedWinners(source, "2026-09"), { total_focus: "bb", total_sessions: "Kumari", longest_streak: "Kumari", overall_champion: "Kumari" });
});

test("badges are dated the 1st of the following month, rolling over the year", () => {
  const winner = { username: "A", userId: "a", score: 1 };
  const winners = { winners: { total_focus: winner, total_sessions: winner, longest_streak: winner, overall_champion: winner } };
  const assets = { total_focus: "f", total_sessions: "s", longest_streak: "l", overall_champion: "c" };
  assert.equal(buildAwards(winners, parseMonthKey("2026-10", new Date(2026, 10, 7)), assets)[0].awarded_on, "2026-11-01");
  assert.equal(buildAwards(winners, parseMonthKey("2025-12", new Date(2026, 10, 7)), assets)[0].awarded_on, "2026-01-01");
});

test("August and October 2026 winners are in the hardcoded achievements, dated the next month", () => {
  // Read the data directly: rendered badges are paged 8 at a time, so a 9th badge would not be in the DOM.
  const source = fs.readFileSync(path.join(repoRoot, "js", "database-achievements.js"), "utf8");
  assert.deepEqual(announcedWinners(source, "2026-08"), { total_focus: "kookiejarfull", total_sessions: "Kumari", longest_streak: "Jec Jec", overall_champion: "kookiejarfull" });
  assert.deepEqual(announcedWinners(source, "2026-10"), { total_focus: "tokubetsu", total_sessions: "tokubetsu", longest_streak: "tokubetsu", overall_champion: "tokubetsu" });
  const datesFor = (folder) => new Set([...source.matchAll(/icon: "([^"]+)",[\s\S]*?date: "([^"]+)"/g)].filter((match) => match[1].includes(`/${folder}/`)).map((match) => match[2]));
  assert.deepEqual([...datesFor("2026-08")], ["2026-09-01"]);
  assert.deepEqual([...datesFor("2026-10")], ["2026-11-01"]);
});
