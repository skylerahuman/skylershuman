import { classify, DIRECTIVES, readPaths, readText, scanText } from "./scan.mjs";

const SURFACES = {
  engine: {
    roots: ["src"],
    accept: (path) => /\.(?:[cm]?ts|astro|svelte)$/.test(path) && !path.includes("src/content/"),
  },
  css: { roots: ["src"], accept: (path) => path.endsWith(".css") },
  worker: { roots: ["worker"], accept: (path) => /\.ts$/.test(path) },
  tooling: {
    roots: ["scripts", "quality"],
    accept: (path) => /\.(?:mjs|ts|grit)$/.test(path) && !path.includes("fixtures/"),
  },
};

async function readBudget() {
  return JSON.parse(await readText("quality/budget.json"));
}

async function readSurface(name) {
  const { roots, accept } = SURFACES[name];
  const directives = zeroCounts();
  let lines = 0;
  const files = await readPaths(roots, accept);
  for (const path of files) {
    const result = scanText(path, await readText(path));
    lines += result.codeLines;
    countDirectives(result.comments, directives);
  }
  return { name, files: files.length, lines, directives };
}

function zeroCounts() {
  return Object.fromEntries(DIRECTIVES.map((directive) => [directive.kind, 0]));
}

function countDirectives(comments, counts) {
  for (const comment of comments) {
    const kind = classify(comment.text);
    if (kind !== "prose") {
      counts[kind] += 1;
    }
  }
}

function isOver(result, budget) {
  const limit = budget[result.name];
  return limit === undefined || result.lines > limit;
}

function formatLine(result, budget) {
  const limit = budget[result.name] ?? "?";
  const flag = isOver(result, budget) ? "  ✖ over" : "";
  return `${result.name.padEnd(10)} ${String(result.files).padStart(5)}  ${String(result.lines).padStart(5)} / ${limit}${flag}`;
}

function reportLines(results, budget) {
  console.log("surface    files   lines / budget");
  for (const line of results.map((result) => formatLine(result, budget))) {
    console.log(line);
  }
  return results.some((result) => isOver(result, budget));
}

function sumDirectives(results) {
  const totals = zeroCounts();
  for (const result of results) {
    for (const [kind, count] of Object.entries(result.directives)) {
      totals[kind] = (totals[kind] ?? 0) + count;
    }
  }
  return totals;
}

function reportDirectives(results, budget) {
  const totals = sumDirectives(results);
  let failed = false;
  for (const [kind, limit] of Object.entries(budget)) {
    const used = totals[kind] ?? 0;
    if (used > limit) {
      failed = true;
    }
    console.log(
      `comments   ${kind.padEnd(14)} ${used} / ${limit}${used > limit ? "  ✖ over (raising quality/budget.json requires an ADR)" : ""}`,
    );
  }
  return failed;
}

const budget = await readBudget();
const results = await Promise.all(Object.keys(SURFACES).map(readSurface));
if (reportLines(results, budget) || reportDirectives(results, budget.comments ?? {})) {
  process.exitCode = 1;
}
