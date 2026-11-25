import { classify, DIRECTIVES, readPaths, readText, scanText } from "./scan.mjs";

const ROOTS = ["src", "worker", "scripts", "quality", ".pi/extensions"];
const CODE = /\.(?:[cm]?[jt]s|astro|svelte|css|grit)$/;

async function readComments(paths) {
  const result = { files: 0, violations: [], counts: zeroCounts() };
  const targets =
    paths.length > 0
      ? paths
      : await readPaths(ROOTS, (path) => CODE.test(path) && !path.includes("fixtures/"));
  for (const path of targets) {
    const { comments } = scanText(path, await readText(path));
    tally(path, comments, result);
    result.files += 1;
  }
  return result;
}

function zeroCounts() {
  return Object.fromEntries(DIRECTIVES.map((directive) => [directive.kind, 0]));
}

function tally(path, comments, result) {
  for (const comment of comments) {
    const kind = classify(comment.text);
    if (kind === "prose") {
      result.violations.push(`${path}:${comment.line}: ${comment.text.slice(0, 80)}`);
      continue;
    }
    result.counts[kind] += 1;
  }
}

function report(result) {
  for (const violation of result.violations) {
    console.error(
      `✖ ${violation}  ← prose comment; move it to a name, a type, a test, an ADR, or an issue`,
    );
  }
  const directives = Object.entries(result.counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${kind}=${count}`);
  console.log(
    `comments: ${result.files} files, ${result.violations.length} prose, ${directives.join(" ") || "no directives"}`,
  );
  return result.violations.length === 0 ? 0 : 1;
}

process.exitCode = report(await readComments(process.argv.slice(2)));
