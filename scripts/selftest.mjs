import { execFile } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { classify, ROOT, readPaths, readText, scanText } from "./scan.mjs";

const FIXTURES = "quality/fixtures";
const LINT_EXPECTED = {
  "async-requires-io-verb.ts": ["Async means I/O"],
  "io-verbs-are-async.ts": ["are I/O verbs and must be async"],
  "no-vague-verbs.ts": ["Vague verb"],
  "no-compound-verbs.ts": ["Two verbs"],
  "no-field-getters.ts": ["only reads a property"],
  "no-options-parameter.ts": ["No options bag"],
  "no-explicit-any.ts": ["any"],
  "ok.ts": [],
};
const PROSE_EXPECTED = { "prose-comment.ts": 1, "ProseComment.astro": 2 };

async function saveFixtures(dir, fixtures) {
  for (const file of fixtures) {
    await copyFile(join(ROOT, file), join(dir, basename(file)));
  }
}

async function saveTempConfig(dir) {
  const config = JSON.parse(await readText("biome.json"));
  config.plugins = config.plugins.map((plugin) => join(ROOT, plugin.path));
  config.overrides = [];
  config.vcs = { enabled: false, useIgnoreFile: false };
  config.files = { includes: ["**"], ignoreUnknown: true };
  config.linter.rules.correctness.noUnusedVariables = "off";
  config.linter.rules.correctness.noUnusedImports = "off";
  config.linter.rules.correctness.noUnusedFunctionParameters = "off";
  await writeFile(join(dir, "biome.json"), JSON.stringify(config));
}

async function readDiagnostics(dir) {
  const run = promisify(execFile);
  const args = ["lint", "--config-path", dir, "--max-diagnostics=500", "--reporter=json", dir];
  try {
    const { stdout } = await run(join(ROOT, "node_modules/.bin/biome"), args, {
      maxBuffer: 1 << 24,
    });
    return JSON.parse(stdout).diagnostics;
  } catch (error) {
    if (error.stdout) {
      return JSON.parse(error.stdout).diagnostics;
    }
    throw error;
  }
}

function judge(file, expected, actual) {
  const missing = expected.filter((text) => !actual.some((message) => message.includes(text)));
  const unexpected = expected.length === 0 ? actual : [];
  const ok = missing.length === 0 && unexpected.length === 0;
  const detail = [
    missing.length ? `missing ${missing.join(" | ")}` : "",
    unexpected.length ? `unexpected ${unexpected.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  console.log(
    `${ok ? "✓" : "✖"} ${file}: ${actual.length} diagnostic(s)${detail ? `, ${detail}` : ""}`,
  );
  return ok;
}

function judgeLint(diagnostics) {
  const messages = {};
  for (const diagnostic of diagnostics) {
    const file = basename(diagnostic.location?.path ?? "");
    messages[file] = [
      ...(messages[file] ?? []),
      diagnostic.message ?? diagnostic.description ?? "",
    ];
  }
  return Object.entries(LINT_EXPECTED)
    .map(([file, expected]) => judge(file, expected, messages[file] ?? []))
    .some((ok) => !ok);
}

async function readProseCounts() {
  const counts = {};
  for (const file of Object.keys(PROSE_EXPECTED)) {
    const { comments } = scanText(file, await readText(`${FIXTURES}/${file}`));
    counts[file] = comments.filter((comment) => classify(comment.text) === "prose").length;
  }
  return counts;
}

function judgeProse(counts) {
  let failed = false;
  for (const [file, expected] of Object.entries(PROSE_EXPECTED)) {
    const ok = counts[file] === expected;
    if (!ok) {
      failed = true;
    }
    console.log(
      `${ok ? "✓" : "✖"} ${file}: ${counts[file]} prose comment(s), expected ${expected}`,
    );
  }
  return failed;
}

const dir = await mkdtemp(join(tmpdir(), "quality-"));
try {
  const fixtures = await readPaths([FIXTURES], () => true);
  await saveFixtures(dir, fixtures);
  await saveTempConfig(dir);
  const lintFailed = judgeLint(await readDiagnostics(dir));
  const proseFailed = judgeProse(await readProseCounts());
  const failed = fixtures.length === 0 || lintFailed || proseFailed;
  console.log(
    failed ? "selftest: FAILED" : "selftest: every rule fires and the clean fixture passes",
  );
  process.exitCode = failed ? 1 : 0;
} finally {
  await rm(dir, { recursive: true, force: true });
}
