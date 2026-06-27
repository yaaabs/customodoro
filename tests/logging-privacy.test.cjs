const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const repoRoot = path.resolve(__dirname, "..");
const scannedTargets = [
  "js",
  "index.html",
  "reverse.html",
  "pomodoro.html",
  "feedback.html",
  "sw.js",
  "extensions/pomodoro",
];

function listSourceFiles(target) {
  const absolute = path.join(repoRoot, target);
  if (!fs.existsSync(absolute)) return [];
  if (!fs.statSync(absolute).isDirectory()) return [absolute];

  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(absolute, entry.name);
      return entry.isDirectory()
        ? listSourceFiles(path.relative(repoRoot, child))
        : /\.(?:js|html)$/.test(entry.name)
          ? [child]
          : [];
    });
}

describe("production logging privacy", () => {
  test("only approved logger implementations access the console", () => {
    const violations = [];
    const approvedConsoleAccess =
      /^\s*const nativeError = console\.error\.bind\(console\);\s*$/gm;

    for (const file of scannedTargets.flatMap(listSourceFiles)) {
      const relative = path.relative(repoRoot, file).replace(/\\/g, "/");
      const source = fs
        .readFileSync(file, "utf8")
        .replace(approvedConsoleAccess, "");
      if (/\bconsole\s*\./.test(source)) {
        violations.push(relative);
      }
    }

    assert.deepEqual(violations, []);
  });

  test("frontend error calls use fixed literal codes without payloads", () => {
    const violations = [];
    const callPattern =
      /(?:customodoroLogger|swLogger|extensionLogger)\.error\(([^)]*)\)/g;

    for (const file of scannedTargets.flatMap(listSourceFiles)) {
      if (path.basename(file) === "app-logger.js") continue;
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(callPattern)) {
        if (!/^"[A-Z][A-Z0-9_]{2,63}"$/.test(match[1].trim())) {
          violations.push(
            `${path.relative(repoRoot, file)}: ${match[0].slice(0, 100)}`,
          );
        }
      }
    }

    assert.deepEqual(violations, []);
  });

  test("logger emits only a code and allowlisted HTTP status", () => {
    const output = [];
    const context = {
      console: { error: (message) => output.push(message) },
      window: {},
    };
    vm.runInNewContext(
      fs.readFileSync(path.join(repoRoot, "js/app-logger.js"), "utf8"),
      context,
    );

    context.window.customodoroLogger.error("AUTH_LOGIN_FAILED", {
      status: 401,
      email: "private@example.com",
      url: "https://private.example/account",
      tasks: ["secret"],
      error: new Error("private stack"),
    });
    context.window.customodoroLogger.error("AUTH_LOGIN_FAILED", {
      status: 401,
    });
    context.window.customodoroLogger.error("invalid code", {
      status: 500,
    });
    context.window.customodoroLogger.error("SYNC_PUSH_FAILED", {
      status: 999,
      userId: "private-user-id",
    });

    assert.deepEqual(output, [
      "[Customodoro] AUTH_LOGIN_FAILED status=401",
      "[Customodoro] SYNC_PUSH_FAILED",
    ]);
    assert.equal(
      output.some((line) =>
        /private|example\.com|secret|user-id|stack/i.test(line),
      ),
      false,
    );
  });

  test("production debug globals are absent from source", () => {
    const forbidden =
      /window\.(?:debug\w*|testTimezone\w*|testContributionConnection|addTestSession|simulateUser\w*|toggleUserStatsDebug)\s*=/;
    const violations = [];

    for (const file of scannedTargets.flatMap(listSourceFiles)) {
      if (forbidden.test(fs.readFileSync(file, "utf8"))) {
        violations.push(path.relative(repoRoot, file));
      }
    }

    assert.deepEqual(violations, []);
  });
});
