import type {
  ExtensionAPI,
  ExtensionCommandContext,
  KeybindingsManager,
  Theme,
} from "@earendil-works/pi-coding-agent";
import {
  type Component,
  matchesKey,
  type TUI,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { type ReadGit, type Review, readRefs, readReview } from "./review-diff.ts";

type ReviewUi = ExtensionCommandContext["ui"];
type Decision = "approve" | "reject" | "cancel";

function formatPatch(patch: string, width: number): string[] {
  const text = patch
    .replace(/\n$/, "")
    .replace(/(?!\n)[\p{Cc}\p{Cf}]/gu, (character) =>
      character === "\t" ? "⇥" : `\\u{${character.codePointAt(0)?.toString(16)}}`,
    );
  return wrapTextWithAnsi(text, width);
}

type ReviewScreen = [TUI, Theme, KeybindingsManager, (decision: Decision) => void];

type Page = { width: number; size: number; rows: string[]; start: number; seen: boolean };

function paint(page: Page, head: string, theme: Theme): string[] {
  const { width, size, rows, start } = page;
  const end = Math.min(start + size, rows.length);
  const title = page.seen
    ? `Review ${head.slice(0, 8)} · rows ${start + 1}–${end}/${rows.length}`
    : "Enlarge the terminal";
  return [
    truncateToWidth(theme.fg("accent", title), width),
    ...rows.slice(start, end),
    truncateToWidth("Enter: continue · ↑: back · r: reject · Esc: cancel", width),
  ];
}

function paginate(review: Review, [tui, theme, keys, done]: ReviewScreen): Component {
  let page: Page = { width: 0, size: 0, rows: [], start: 0, seen: false };

  function turn(direction: number): void {
    page.start = Math.max(0, page.start + direction * page.size);
    page.seen = false;
    tui.requestRender();
  }

  return {
    render(width: number): string[] {
      const size = Math.max(0, tui.terminal.rows - 6);
      if (width !== page.width || size !== page.size) {
        const rows = width >= 24 ? formatPatch(review.patch, width) : [];
        page = { width, size, rows, start: 0, seen: false };
      }
      page.seen = page.size > 0 && page.rows.length > 0;
      return paint(page, review.head, theme);
    },
    handleInput(data: string): void {
      switch (true) {
        case keys.matches(data, "tui.select.cancel"):
          done("cancel");
          break;
        case matchesKey(data, "r"):
          done("reject");
          break;
        case keys.matches(data, "tui.select.up"):
          turn(-1);
          break;
        case page.seen && keys.matches(data, "tui.select.confirm"):
          if (page.start + page.size >= page.rows.length) {
            done("approve");
          } else {
            turn(1);
          }
          break;
        default:
          break;
      }
    },
    invalidate: () => undefined,
  };
}

async function readGit(pi: ExtensionAPI, cwd: string, args: string[]): Promise<string> {
  const result = await pi.exec("git", ["--no-replace-objects", ...args], {
    cwd,
    timeout: 5000,
    maxBuffer: 256 * 1024,
  });
  if (result.code !== 0) {
    throw new Error(
      result.truncated
        ? "Diff too large. Split this change."
        : `Git ${args[0]} failed. Check the branch and fetch origin/main.`,
    );
  }
  return result.stdout;
}

async function readDecision(pi: ExtensionAPI, ui: ReviewUi, git: ReadGit): Promise<void> {
  const review = await readReview(git);
  const decision = await ui.custom<Decision>(
    (...screen: ReviewScreen) => paginate(review, screen),
    { blocked: { kind: "question", message: "Review the committed branch diff" } },
  );
  const prompt =
    decision === "approve"
      ? "To approve, name a behavior you verified and where it is tested."
      : "What needs to change? Name a file or behavior.";
  const note = decision === "cancel" ? undefined : (await ui.input(prompt))?.trim();
  if (!note) {
    ui.notify("No approval recorded.", "warning");
    return;
  }
  const { base, head } = await readRefs(git);
  if (base !== review.base || head !== review.head) {
    throw new Error("Base or head changed during review. Start a new review.");
  }
  const verdict = decision === "approve" ? "Approved" : "Changes requested";
  pi.sendMessage({
    customType: "branch-review",
    display: true,
    content: `${verdict} (Pi review)\n\nHead: \`${head}\`\n\nBase: \`${base}\`\n\n${note}`,
  });
}

export default function (pi: ExtensionAPI): void {
  pi.registerCommand("review", {
    description: "Walk the committed feature diff and record a human review",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      if (ctx.mode !== "tui" || !ctx.isIdle()) {
        throw new Error("Run /review in interactive Pi after the agent finishes.");
      }
      await readDecision(pi, ctx.ui, (args) => readGit(pi, ctx.cwd, args));
    },
  });
}
