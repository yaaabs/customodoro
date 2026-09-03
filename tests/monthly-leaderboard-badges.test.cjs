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
} = require("../scripts/monthly-leaderboard-badges.js");

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
