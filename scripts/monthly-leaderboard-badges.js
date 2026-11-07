#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SLUGS = ["jan", "feb", "march", "april", "may", "june", "july", "aug", "sept", "oct", "nov", "dec"];
const CATEGORY_META = {
  total_focus: { title: "Focus King", suffix: "focus", description: (month) => `Crowned for earning the highest Focus Points in ${month}.` },
  total_sessions: { title: "Session Master", suffix: "session", description: (month) => `Recognized for completing the most sessions in ${month}.` },
  longest_streak: { title: "Streak Legend", suffix: "streak", description: (month) => `Honored for holding the longest streak in ${month}.` },
  overall_champion: { title: "Overall Champion", suffix: "champion", description: (month) => `Awarded for being the top overall performer with the highest average across all categories in ${month}.` },
};

function previousMonthKey(today = new Date()) {
  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(value, today = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) throw new Error("Month must use YYYY-MM.");
  const [year, oneBasedMonth] = value.split("-").map(Number);
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (value >= currentKey) throw new Error("Only completed months can be finalized.");
  return { key: value, year, month: oneBasedMonth - 1, monthName: MONTH_NAMES[oneBasedMonth - 1], slug: MONTH_SLUGS[oneBasedMonth - 1] };
}

function getBadgeAssets(month, root = ROOT) {
  const directory = path.join(root, "images", "badges", "custom-badges", month.key);
  const assets = {};
  Object.entries(CATEGORY_META).forEach(([category, meta]) => {
    const filename = `${month.slug}-${meta.suffix}.webp`;
    const absolutePath = path.join(directory, filename);
    if (!fs.existsSync(absolutePath)) throw new Error(`Missing badge asset: ${path.relative(root, absolutePath)}`);
    assets[category] = `images/badges/custom-badges/${month.key}/${filename}`;
  });
  return assets;
}

function extractProductivityStats(data) {
  if (!data || typeof data !== "object") return {};
  if (data.streaks && data.streaks.productivityStatsByDay) return data.streaks.productivityStatsByDay;
  if (data.productivityStatsByDay) return data.productivityStatsByDay;
  return Object.keys(data).some((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)) ? data : {};
}

function longestStreak(stats, startKey, endKey) {
  const dates = Object.keys(stats).filter((key) => key >= startKey && key <= endKey && Number(stats[key]?.total_minutes || 0) > 0).sort();
  let best = 0, current = 0, previous = null;
  dates.forEach((key) => {
    const consecutive = previous && (Date.UTC(...key.split("-").map((part, i) => Number(part) - (i === 1 ? 1 : 0))) - Date.UTC(...previous.split("-").map((part, i) => Number(part) - (i === 1 ? 1 : 0)))) === 86400000;
    current = consecutive ? current + 1 : 1;
    best = Math.max(best, current); previous = key;
  });
  return best;
}

function calculateMonthlyWinners(users, month) {
  const startKey = `${month.key}-01`;
  const endKey = `${month.key}-${String(new Date(month.year, month.month + 1, 0).getDate()).padStart(2, "0")}`;
  // A re-registered account carries a copy of the old account's days. Oldest account wins; the copy is skipped.
  // ponytail: only exact day-by-day copies with 3+ active days are caught; a copy that drifted still counts twice.
  const seenCopies = new Set();
  const byAge = [...users].sort((a, b) => String(a.created_at || "9999").localeCompare(String(b.created_at || "9999")));
  const stats = byAge.map((user) => {
    const productivity = extractProductivityStats(user.data);
    let minutes = 0, sessions = 0, activeDays = 0;
    const days = Object.keys(productivity).filter((key) => key >= startKey && key <= endKey).sort();
    days.forEach((key) => {
      const day = productivity[key] || {}; minutes += Number(day.total_minutes || 0); sessions += Number(day.classic || 0) + Number(day.reverse || 0);
      if (Number(day.total_minutes || 0) > 0) activeDays += 1;
    });
    const fingerprint = JSON.stringify(days.map((key) => [key, productivity[key]]));
    return { userId: user.user_id, username: user.username, totalFocusPoints: Math.floor(minutes / 5), totalSessions: sessions, longestStreak: longestStreak(productivity, startKey, endKey), activeDays, fingerprint };
  }).filter((entry) => entry.username && (entry.totalFocusPoints > 0 || entry.totalSessions > 0 || entry.longestStreak > 0))
    .filter((entry) => {
      if (entry.activeDays < 3) return true;
      if (seenCopies.has(entry.fingerprint)) return false;
      seenCopies.add(entry.fingerprint); return true;
    });
  const rank = (key) => [...stats].sort((a, b) => b[key] - a[key] || a.username.localeCompare(b.username));
  const focus = rank("totalFocusPoints"), sessions = rank("totalSessions"), streak = rank("longestStreak");
  const rankMaps = [focus, sessions, streak].map((entries) => new Map(entries.map((entry, index) => [entry.userId, index + 1])));
  const champion = [...stats].sort((a, b) => {
    const averageA = rankMaps.reduce((sum, map) => sum + map.get(a.userId), 0) / 3;
    const averageB = rankMaps.reduce((sum, map) => sum + map.get(b.userId), 0) / 3;
    return averageA - averageB || a.username.localeCompare(b.username);
  })[0] || null;
  const topByCategory = {
    total_focus: focus.slice(0, 3).map((entry) => ({ username: entry.username, score: entry.totalFocusPoints, userId: entry.userId })),
    total_sessions: sessions.slice(0, 3).map((entry) => ({ username: entry.username, score: entry.totalSessions, userId: entry.userId })),
    longest_streak: streak.slice(0, 3).map((entry) => ({ username: entry.username, score: entry.longestStreak, userId: entry.userId })),
    overall_champion: champion ? [{ username: champion.username, score: Number((rankMaps.reduce((sum, map) => sum + map.get(champion.userId), 0) / 3).toFixed(2)), userId: champion.userId }] : [],
  };
  return { month: month.monthName, year: month.year, monthNumber: month.month + 1, topByCategory, winners: Object.fromEntries(Object.keys(topByCategory).map((key) => [key, topByCategory[key][0] || null])), totalParticipants: stats.length, generatedAt: new Date().toISOString() };
}

const WINNER_KEYS = { focus: "total_focus", session: "total_sessions", sessions: "total_sessions", streak: "longest_streak", champion: "overall_champion" };

function parseWinnersFile(text) {
  const picks = {};
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim(); if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([a-z]+)\s*:\s*(.*)$/i); const category = match && WINNER_KEYS[match[1].toLowerCase()];
    if (!category) throw new Error(`winners.txt line ${index + 1} must look like "focus: username" (focus, session, streak, champion).`);
    if (match[2].trim()) picks[category] = match[2].trim();
  });
  const missing = Object.keys(CATEGORY_META).filter((category) => !picks[category]);
  if (missing.length) throw new Error(`winners.txt is missing: ${missing.map((category) => CATEGORY_META[category].suffix).join(", ")}.`);
  return picks;
}

function applyManualWinners(computed, picks, users, month) {
  Object.entries(picks).forEach(([category, name]) => {
    const matches = users.filter((user) => (user.username || "").trim().toLowerCase() === name.toLowerCase());
    if (matches.length !== 1) throw new Error(matches.length ? `Username "${name}" matches ${matches.length} accounts.` : `No account has the username "${name}".`);
    const user = matches[0]; const existing = computed.topByCategory[category].find((entry) => entry.userId === user.user_id);
    const own = calculateMonthlyWinners([user], month).winners[category];
    const entry = existing || { username: user.username, score: category === "overall_champion" ? null : (own ? own.score : 0), userId: user.user_id };
    computed.topByCategory[category] = [entry, ...computed.topByCategory[category].filter((other) => other.userId !== user.user_id)].slice(0, category === "overall_champion" ? 1 : 3);
    computed.winners[category] = entry;
  });
  computed.manualWinners = true;
  return computed;
}

function buildAwards(winners, month, assets) {
  // Badges are dated the 1st of the following month, the day winners are announced.
  const next = new Date(month.year, month.month + 1, 1);
  const awardedOn = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  return Object.entries(CATEGORY_META).map(([category, meta]) => {
    const winner = winners.winners[category]; if (!winner) throw new Error(`No ${category} winner exists for ${month.key}.`);
    return { username: winner.username, title: meta.title, description: meta.description(month.monthName), icon_path: assets[category], awarded_on: awardedOn };
  });
}

const ACHIEVEMENTS_FILE = path.join(ROOT, "js", "database-achievements.js");
const SEPARATOR = "    //================================================================//";

function formatAchievement(award, monthName) {
  const description = JSON.stringify(award.description);
  const oneLine = `        description: ${description},`;
  return [
    `      // ${award.title} Badge for ${monthName}`,
    "      {",
    `        title: ${JSON.stringify(award.title)},`,
    `        icon: ${JSON.stringify(award.icon_path)},`,
    oneLine.length <= 80 ? oneLine : `        description:\n          ${description},`,
    `        date: ${JSON.stringify(award.awarded_on)},`,
    "      },",
  ].join("\n");
}

// Adds each award to the hardcodedAchievements map: appended to the user's existing block,
// or a new block below the last user. Awards whose icon is already listed for the user are skipped.
function addAwardsToSource(source, awards, monthName) {
  const start = source.indexOf("const hardcodedAchievements = {");
  const end = start < 0 ? -1 : source.indexOf("\n  };", start);
  if (end < 0) throw new Error("Could not find hardcodedAchievements in js/database-achievements.js.");
  let body = source.slice(start, end);
  const byUser = new Map();
  awards.forEach((award) => {
    const key = award.username.toLowerCase();
    if (!byUser.has(key)) byUser.set(key, { username: award.username, awards: [] });
    byUser.get(key).awards.push(award);
  });
  const added = [];
  for (const { username, awards: list } of byUser.values()) {
    const blocks = [...body.matchAll(/^    ("[^"\n]+"|[A-Za-z_$][\w$]*): \[\n/gm)];
    const existing = blocks.find((match) => match[1].replace(/^"|"$/g, "").toLowerCase() === username.toLowerCase());
    if (existing) {
      const blockStart = existing.index + existing[0].length;
      const close = body.indexOf("\n    ],", blockStart);
      const fresh = list.filter((award) => !body.slice(blockStart, close).includes(JSON.stringify(award.icon_path)));
      if (!fresh.length) continue;
      body = body.slice(0, close) + "\n\n" + fresh.map((award) => formatAchievement(award, monthName)).join("\n\n") + body.slice(close);
      added.push({ username, awards: fresh, newUser: false });
    } else {
      const last = blocks[blocks.length - 1];
      let insertAt = body.indexOf("\n    ],", last.index) + "\n    ],".length;
      if (body.slice(insertAt).startsWith("\n" + SEPARATOR)) insertAt += 1 + SEPARATOR.length;
      const key = /^[A-Za-z_$][\w$]*$/.test(username) ? username : JSON.stringify(username);
      const block = `\n\n${SEPARATOR}\n    ${key}: [\n${list.map((award) => formatAchievement(award, monthName)).join("\n\n")}\n    ],\n${SEPARATOR}`;
      body = body.slice(0, insertAt) + block + body.slice(insertAt);
      added.push({ username, awards: list, newUser: true });
    }
  }
  return { source: source.slice(0, start) + body + source.slice(end), added };
}

function syncAchievementsFile(awards, monthName, write, file = ACHIEVEMENTS_FILE) {
  const source = fs.readFileSync(file, "utf8");
  const { source: next, added } = addAwardsToSource(source, awards, monthName);
  if (write && next !== source) fs.writeFileSync(file, next);
  const verb = write ? "Added" : "Would add";
  added.forEach(({ username, awards: list, newUser }) => console.log(`${verb} to js/database-achievements.js: ${username}${newUser ? " (new user)" : ""} → ${list.map((award) => award.title).join(", ")}`));
  if (!added.length) console.log("js/database-achievements.js already has these badges.");
}

const TITLE_TO_CATEGORY = Object.fromEntries(Object.entries(CATEGORY_META).map(([category, meta]) => [meta.title, category]));

function announcedWinners(source, monthKey) {
  const start = source.indexOf("const hardcodedAchievements = {");
  const end = source.indexOf("\n  };", start);
  const sandbox = {};
  require("vm").runInNewContext(source.slice(start, end + 4).replace("const hardcodedAchievements =", "result ="), sandbox);
  const announced = {};
  Object.entries(sandbox.result).forEach(([username, badges]) => badges.forEach((badge) => {
    const category = TITLE_TO_CATEGORY[badge.title];
    if (category && String(badge.icon).includes(`custom-badges/${monthKey}/`)) announced[category] = username;
  }));
  return announced;
}

function readEnv(file = path.join(ROOT, ".env")) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ""); });
}

function request(url, options, body) {
  return new Promise((resolve, reject) => { const req = https.request(url, options, (res) => { let data = ""; res.on("data", (chunk) => data += chunk); res.on("end", () => { if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Supabase request failed (${res.statusCode}): ${data}`)); try { resolve(data ? JSON.parse(data) : null); } catch (error) { reject(error); } }); }); req.on("error", reject); if (body) req.write(JSON.stringify(body)); req.end(); });
}

async function fetchUsers(url, headers) {
  const users = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const batch = await request(`${url}/rest/v1/users?select=user_id,username,created_at,data`, {
      method: "GET",
      headers: { ...headers, Range: `${start}-${start + pageSize - 1}` },
    });
    users.push(...(batch || []));
    if (!batch || batch.length < pageSize) break;
  }
  return users;
}

// Old months were announced already, so the posted winners (hardcoded achievements) are the truth.
// Pins each category the calculation disagrees with; applyManualWinners throws if that account is gone or ambiguous.
function keepAnnouncedWinners(winners, users, month) {
  const announced = announcedWinners(fs.readFileSync(ACHIEVEMENTS_FILE, "utf8"), month.key);
  const differs = Object.keys(announced).filter((category) => announced[category].toLowerCase() !== String(winners.winners[category]?.username || "").toLowerCase());
  differs.forEach((category) => console.log(`${month.key} ${CATEGORY_META[category].title}: calculated ${winners.winners[category]?.username || "none"}, keeping announced ${announced[category]}`));
  return differs.length ? applyManualWinners(winners, Object.fromEntries(differs.map((category) => [category, announced[category]])), users, month) : winners;
}

const summarize = (winners) => Object.entries(CATEGORY_META).map(([category, meta]) => `${meta.title} → ${winners.winners[category]?.username || "none"}`).join(", ");

async function run(argv = process.argv.slice(2)) {
  const force = argv.includes("--force-correct");
  const dryRun = argv.includes("--dry-run");
  const snapshotOnly = argv.includes("--snapshot-only");
  const month = parseMonthKey(argv.find((arg) => !arg.startsWith("--")) || previousMonthKey());
  const assets = snapshotOnly ? null : getBadgeAssets(month);
  readEnv(); const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const users = await fetchUsers(url, headers);

  const winnersFile = path.join(ROOT, "images", "badges", "custom-badges", month.key, "winners.txt");
  let winners = calculateMonthlyWinners(users, month);
  if (fs.existsSync(winnersFile)) {
    winners = applyManualWinners(winners, parseWinnersFile(fs.readFileSync(winnersFile, "utf8")), users, month);
    console.log(`Using winners from ${path.relative(ROOT, winnersFile)}`);
  }
  if (snapshotOnly) winners = keepAnnouncedWinners(winners, users, month);

  if (dryRun) {
    console.log(`Dry run ${month.key} (${winners.totalParticipants} participants): ${summarize(winners)}`);
    if (!snapshotOnly) syncAchievementsFile(buildAwards(winners, month, assets), month.monthName, false);
    return null;
  }

  // The snapshot is saved first: it freezes the month, so later duplicate accounts or renames cannot rewrite History.
  // No award rows are sent: badges live in js/database-achievements.js, and monthly_badge_awards.user_id is a uuid
  // column that cannot hold legacy ids like "user_1781452682597_...".
  const result = await request(`${url}/rest/v1/rpc/finalize_monthly_badges`, { method: "POST", headers }, { p_month_key: month.key, p_participant_count: winners.totalParticipants, p_snapshot_data: winners, p_awards: [], p_force_correct: force });
  // An already-saved month returns its stored snapshot; badges follow that, not a fresh calculation.
  const saved = result?.snapshot_data?.winners ? result.snapshot_data : winners;
  console.log(`${force ? "Corrected" : "Snapshot saved"} ${month.key}: ${summarize(saved)}`);
  if (!snapshotOnly) syncAchievementsFile(buildAwards(saved, month, assets), month.monthName, true);
  return result;
}

if (require.main === module) run().catch((error) => { console.error(`Monthly badge awards failed: ${error.message}`); process.exitCode = 1; });
module.exports = { parseMonthKey, getBadgeAssets, calculateMonthlyWinners, buildAwards, extractProductivityStats, longestStreak, parseWinnersFile, applyManualWinners, addAwardsToSource, announcedWinners };
