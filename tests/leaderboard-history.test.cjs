const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/browser-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");

// Minimal stand-in for the Supabase query builder: every chain resolves to the table's rows.
function installFakeSupabase(harness, tables) {
  harness.evaluate(`
    window.__tables = ${JSON.stringify(tables)};
    window.__queries = [];
    window.supabase = {
      createClient() {
        return {
          from(table) {
            const filters = [];
            const builder = {
              select() { return builder; },
              order() { return builder; },
              range(start, end) { builder.slice = [start, end + 1]; return builder; },
              eq(column, value) { filters.push([column, value]); return builder; },
              maybeSingle() { builder.single = true; return builder; },
              then(resolve, reject) {
                window.__queries.push(table);
                const source = window.__tables[table];
                if (source && source.error) return Promise.resolve({ data: null, error: source.error }).then(resolve, reject);
                let rows = (source || []).filter((row) => filters.every(([column, value]) => row[column] === value));
                if (builder.slice) rows = rows.slice(...builder.slice);
                const data = builder.single ? rows[0] || null : rows;
                return Promise.resolve({ data, error: null }).then(resolve, reject);
              },
            };
            return builder;
          },
        };
      },
    };
    window.customodoroLogger = { error() {}, warn() {}, info() {}, log() {} };
    document.body.insertAdjacentHTML = () => {};
    window.timezoneManager = { getUserToday: () => new Date(2026, 9, 4) };
  `);
}

function day(minutes, sessions) {
  return { total_minutes: minutes, classic: sessions };
}

const users = [
  { user_id: "u1", username: "kookiejarfull", data: { productivityStatsByDay: { "2025-11-03": day(600, 20), "2026-08-02": day(900, 30) } } },
  { user_id: "u2", username: "Kumari", data: { productivityStatsByDay: { "2026-08-02": day(300, 40), "2026-08-03": day(300, 40) } } },
];

function loadLeaderboard(tables) {
  const harness = createHarness({ repoRoot });
  installFakeSupabase(harness, tables);
  harness.loadScript("js/database-leaderboard.js");
  return harness;
}

async function overview(harness) {
  return harness.evaluate("window.databaseLeaderboardModal.leaderboard.getMonthlyHistoryOverview()");
}

test("history shows past years and months even before any snapshot is finalized", async () => {
  const harness = loadLeaderboard({ users, monthly_leaderboard_snapshots: [] });
  const result = await overview(harness);

  assert.deepEqual(Array.from(result.years), [2026, 2025]);
  assert.equal(result.participantCounts["2025-11"], 1);
  assert.equal(result.participantCounts["2026-08"], 2);

  harness.evaluate("window.databaseLeaderboardModal.monthlyHistoryOverview = window.databaseLeaderboardModal.leaderboard.monthlyHistoryCache");
  assert.equal(harness.evaluate("window.databaseLeaderboardModal.getHistoryMonthState(2026, 7).status"), "available");
  assert.equal(harness.evaluate("window.databaseLeaderboardModal.getHistoryMonthState(2026, 9).status"), "current");
});

test("unfinalized months fall back to the live winners", async () => {
  const harness = loadLeaderboard({ users, monthly_leaderboard_snapshots: [] });
  const winners = await harness.evaluate("window.databaseLeaderboardModal.leaderboard.getMonthlyHistory(2026, 7)");

  assert.equal(winners.winners.total_focus.username, "kookiejarfull");
  assert.equal(winners.winners.total_sessions.username, "Kumari");
  assert.equal(winners.totalParticipants, 2);
});

test("a finalized snapshot wins over the live calculation", async () => {
  const snapshot = { month: "August", year: 2026, monthNumber: 8, totalParticipants: 7, winners: { total_focus: { username: "Picked", score: 1 } }, topByCategory: {} };
  const harness = loadLeaderboard({
    users,
    monthly_leaderboard_snapshots: [{ month_key: "2026-08", participant_count: 7, snapshot_data: snapshot }],
  });

  const result = await overview(harness);
  assert.equal(result.participantCounts["2026-08"], 7);
  assert.equal(result.participantCounts["2025-11"], 1);

  const winners = await harness.evaluate("window.databaseLeaderboardModal.leaderboard.getMonthlyHistory(2026, 7)");
  assert.equal(winners.winners.total_focus.username, "Picked");
});

test("history still works when the snapshot table cannot be read", async () => {
  const harness = loadLeaderboard({ users, monthly_leaderboard_snapshots: { error: { message: "relation does not exist" } } });

  const result = await overview(harness);
  assert.deepEqual(Array.from(result.years), [2026, 2025]);
  const winners = await harness.evaluate("window.databaseLeaderboardModal.leaderboard.getMonthlyHistory(2026, 7)");
  assert.equal(winners.winners.total_focus.username, "kookiejarfull");
});
