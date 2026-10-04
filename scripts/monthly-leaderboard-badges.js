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
  const stats = users.map((user) => {
    const productivity = extractProductivityStats(user.data);
    let minutes = 0, sessions = 0;
    Object.keys(productivity).filter((key) => key >= startKey && key <= endKey).forEach((key) => {
      const day = productivity[key] || {}; minutes += Number(day.total_minutes || 0); sessions += Number(day.classic || 0) + Number(day.reverse || 0);
    });
    return { userId: user.user_id, username: user.username, totalFocusPoints: Math.floor(minutes / 5), totalSessions: sessions, longestStreak: longestStreak(productivity, startKey, endKey) };
  }).filter((entry) => entry.username && (entry.totalFocusPoints > 0 || entry.totalSessions > 0 || entry.longestStreak > 0));
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
  const awardedOn = `${month.key}-${String(new Date(month.year, month.month + 1, 1).getDate()).padStart(2, "0")}`;
  return Object.entries(CATEGORY_META).map(([category, meta]) => {
    const winner = winners.winners[category]; if (!winner) throw new Error(`No ${category} winner exists for ${month.key}.`);
    return { user_id: winner.userId, username: winner.username, category, title: meta.title, description: meta.description(month.monthName), icon_path: assets[category], awarded_on: awardedOn };
  });
}

function readEnv(file = path.join(ROOT, ".env")) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ""); });
}

function request(url, options, body) {
  return new Promise((resolve, reject) => { const req = https.request(url, options, (res) => { let data = ""; res.on("data", (chunk) => data += chunk); res.on("end", () => { if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Supabase request failed (${res.statusCode}): ${data}`)); try { resolve(data ? JSON.parse(data) : null); } catch (error) { reject(error); } }); }); req.on("error", reject); if (body) req.write(JSON.stringify(body)); req.end(); });
}

async function run(argv = process.argv.slice(2)) {
  const force = argv.includes("--force-correct"); const monthArg = argv.find((arg) => !arg.startsWith("--"));
  const dryRun = argv.includes("--dry-run");
  const month = parseMonthKey(monthArg); const assets = getBadgeAssets(month);
  readEnv(); const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const users = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const batch = await request(`${url}/rest/v1/users?select=user_id,username,data`, {
      method: "GET",
      headers: { ...headers, Range: `${start}-${start + pageSize - 1}` },
    });
    users.push(...(batch || []));
    if (!batch || batch.length < pageSize) break;
  }
  const winnersFile = path.join(ROOT, "images", "badges", "custom-badges", month.key, "winners.txt");
  const computed = calculateMonthlyWinners(users, month);
  const winners = fs.existsSync(winnersFile) ? applyManualWinners(computed, parseWinnersFile(fs.readFileSync(winnersFile, "utf8")), users, month) : computed;
  if (winners.manualWinners) console.log(`Using winners from ${path.relative(ROOT, winnersFile)}`);
  const awards = buildAwards(winners, month, assets);
  const summary = Object.entries(CATEGORY_META).map(([category, meta]) => `${meta.title} → ${winners.winners[category]?.username || "none"}`).join(", ");
  if (dryRun) { console.log(`Dry run ${month.key} (${winners.totalParticipants} participants): ${summary}`); return null; }
  const result = await request(`${url}/rest/v1/rpc/finalize_monthly_badges`, { method: "POST", headers }, { p_month_key: month.key, p_participant_count: winners.totalParticipants, p_snapshot_data: winners, p_awards: awards, p_force_correct: force });
  console.log(`${force ? "Corrected" : "Finalized"} ${month.key}: ${summary}`);
  return result;
}

if (require.main === module) run().catch((error) => { console.error(`Monthly badge awards failed: ${error.message}`); process.exitCode = 1; });
module.exports = { parseMonthKey, getBadgeAssets, calculateMonthlyWinners, buildAwards, extractProductivityStats, longestStreak, parseWinnersFile, applyManualWinners };
