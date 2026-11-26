export type ReadGit = (args: string[]) => Promise<string>;
export type ReviewRefs = { base: string; head: string };
export type Review = ReviewRefs & { patch: string };

const DIFF_FLAGS = ["--no-color", "--no-ext-diff", "--no-textconv", "--no-relative"];
const SUBMODULE_FLAGS = ["--submodule=short", "--ignore-submodules=none"];

export async function readRefs(git: ReadGit): Promise<ReviewRefs> {
  const branch = (await git(["branch", "--show-current"])).trim();
  if (!branch || branch === "main") {
    throw new Error("Check out a feature branch before reviewing.");
  }
  const status = await git(["status", "--porcelain=v1", "--ignore-submodules=none", "-uall"]);
  if (status) {
    throw new Error("Commit your changes and clean the working tree before reviewing.");
  }
  const refs = await git(["rev-parse", "HEAD", "refs/remotes/origin/main"]);
  const [head = "", base = ""] = refs.split("\n");
  return { base, head };
}

export async function readReview(git: ReadGit): Promise<Review> {
  const { base, head } = await readRefs(git);
  const fork = (await git(["merge-base", base, head])).trim();
  if (fork !== base) {
    throw new Error("Bring the branch up to date with origin/main before reviewing.");
  }
  const patch = await git(["diff", "-pM", ...DIFF_FLAGS, ...SUBMODULE_FLAGS, base, head, "--"]);
  if (!patch) {
    throw new Error("No changes to review against origin/main.");
  }
  if (/^(?:Binary files |[+-]Subproject commit )/m.test(patch)) {
    throw new Error("Binary or submodule change: not a text diff. Review it separately.");
  }
  return { base, head, patch };
}
