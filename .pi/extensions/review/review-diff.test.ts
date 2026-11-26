import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import { promisify } from "node:util";
import { type ReadGit, readReview } from "./review-diff.ts";

function prepare(t: TestContext): [ReadGit, string] {
  const cwd = mkdtempSync(join(tmpdir(), "pi-review-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const readGit: ReadGit = async (args: string[]): Promise<string> => {
    const { stdout } = await promisify(execFile)(
      "git",
      ["-c", "commit.gpgSign=false", "-c", "core.hooksPath=/dev/null", ...args],
      { cwd },
    );
    return stdout;
  };
  return [readGit, cwd];
}

async function saveRepo(git: ReadGit): Promise<string> {
  await git(["init", "-b", "main"]);
  await git(["config", "user.name", "Reviewer"]);
  await git(["config", "user.email", "reviewer@example.com"]);
  await git(["commit", "--allow-empty", "-m", "Base"]);
  await git(["update-ref", "refs/remotes/origin/main", "HEAD"]);
  const base = (await git(["rev-parse", "HEAD"])).trim();
  await git(["switch", "-c", "feature"]);
  return base;
}

test("review binds the branch diff to the exact base and head", async (t: TestContext) => {
  const [git, cwd] = prepare(t);
  const base = await saveRepo(git);
  writeFileSync(join(cwd, "feature.txt"), "first\nsecond\n");
  await git(["add", "."]);
  await git(["commit", "-m", "Feature"]);
  const review = await readReview(git);
  assert.equal(review.base, base);
  assert.equal(review.head, (await git(["rev-parse", "HEAD"])).trim());
  assert.match(review.patch, /\+first\n\+second\n/);
});

test("uncommitted work, stale branches, and empty diffs cannot be reviewed", async (t: TestContext) => {
  const [git, cwd] = prepare(t);
  await saveRepo(git);
  await assert.rejects(readReview(git), /No changes/);
  writeFileSync(join(cwd, "untracked.txt"), "not in the diff");
  await assert.rejects(readReview(git), /working tree/);
  rmSync(join(cwd, "untracked.txt"));
  await git(["switch", "main"]);
  await assert.rejects(readReview(git), /feature branch/);
  await git(["commit", "--allow-empty", "-m", "New base"]);
  await git(["update-ref", "refs/remotes/origin/main", "HEAD"]);
  await git(["switch", "feature"]);
  await assert.rejects(readReview(git), /origin\/main/);
});

test("binary changes cannot pass a text review", async (t: TestContext) => {
  const [git, cwd] = prepare(t);
  await saveRepo(git);
  writeFileSync(join(cwd, "binary"), Buffer.from([0, 1, 2]));
  await git(["add", "."]);
  await git(["commit", "-m", "Binary"]);
  await assert.rejects(readReview(git), /not a text diff/);
});
