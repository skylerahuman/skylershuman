import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const ROOT = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "");

const TS_LIKE = new Set([".ts", ".mts", ".js", ".mjs", ".grit"]);

export const DIRECTIVES = [
  { kind: "tsExpectError", test: /^@ts-expect-error\s+\S/ },
  { kind: "biomeIgnore", test: /^biome-ignore\s+lint\/[\w-]+\/[\w-]+\s*:\s*\S/ },
  { kind: "adr", test: /^ADR-\d+$/ },
  { kind: "reference", test: /^<reference\s/ },
];

export function classify(comment) {
  return DIRECTIVES.find((directive) => directive.test.test(comment))?.kind ?? "prose";
}

export function scanText(path, text) {
  const ranges = commentRanges(path, text);
  return {
    path,
    text,
    comments: ranges.map(([start, end]) => describe(text, start, end)),
    codeLines: countCodeLines(text, ranges),
  };
}

export async function readText(path) {
  const text = await readFile(join(ROOT, path), "utf8");
  return text;
}

export async function readPaths(roots, accept) {
  const lists = await Promise.all(roots.map((root) => readRoot(root, accept)));
  return lists.flat().sort();
}

async function readRoot(root, accept) {
  const entries = await readdir(join(ROOT, root), { recursive: true, withFileTypes: true }).catch(
    () => [],
  );
  const paths = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)));
  return paths.filter(accept);
}

function commentRanges(path, text) {
  const extension = extname(path);
  if (TS_LIKE.has(extension)) {
    return tsComments(text);
  }
  if (extension === ".css") {
    return blockComments(text, 0);
  }
  if (extension === ".astro" || extension === ".svelte") {
    return componentComments(text);
  }
  return [];
}

function componentComments(text) {
  const ranges = [];
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (frontmatter) {
    ranges.push(
      ...tsComments(frontmatter[1], frontmatter.index + frontmatter[0].indexOf("\n") + 1),
    );
  }
  for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    ranges.push(...tsComments(match[1], match.index + match[0].indexOf(">") + 1));
  }
  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    ranges.push(...blockComments(match[1], match.index + match[0].indexOf(">") + 1));
  }
  for (const match of text.matchAll(/<!--[\s\S]*?-->/g)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

function blockComments(text, offset) {
  return [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => [
    offset + match.index,
    offset + match.index + match[0].length,
  ]);
}

function tsComments(text, offset = 0) {
  const source = ts.createSourceFile(
    "file.ts",
    text,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const ranges = new Map();
  function add(list) {
    for (const range of list ?? []) {
      ranges.set(range.pos, [offset + range.pos, offset + range.end]);
    }
  }
  function visit(node) {
    add(ts.getLeadingCommentRanges(text, node.getFullStart()));
    add(ts.getTrailingCommentRanges(text, node.getEnd()));
    ts.forEachChild(node, visit);
  }
  visit(source);
  add(ts.getLeadingCommentRanges(text, source.endOfFileToken.getFullStart()));
  return [...ranges.values()].sort((a, b) => a[0] - b[0]);
}

function describe(text, start, end) {
  return { line: lineOf(text, start), text: commentText(text.slice(start, end)) };
}

function commentText(raw) {
  return raw.replace(/^\/\*|\*\/$|^<!--|-->$|^\/+|\/\//g, "").trim();
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function countCodeLines(text, ranges) {
  let lines = 0;
  let offset = 0;
  for (const line of text.split("\n")) {
    const start = offset;
    offset += line.length + 1;
    if (hasCode(line, start, ranges)) {
      lines += 1;
    }
  }
  return lines;
}

function hasCode(line, start, ranges) {
  for (let i = 0; i < line.length; i += 1) {
    const at = start + i;
    const insideComment = ranges.some(([from, to]) => from <= at && at < to);
    if (!(insideComment || /\s/.test(line[i]))) {
      return true;
    }
  }
  return false;
}
