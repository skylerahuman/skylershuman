---

title: Quality gate
status: accepted
date: 2026-11-25
---

# 0001 — Quality gate before the first line of site code

## Context

This codebase is written mostly by an LLM and reviewed by one person. Linters prove code runs and is consistent; they do not prove it is simple, general over the present, or readable without comments. The reader's budget — a few thousand lines of code actually read — is the constraint that matters.

## Decision

1. **Biome is the only linter and formatter** (`.astro` files included via `html.experimentalFullSupportEnabled`). Config lives in `biome.json`; project-specific rules are GritQL plugins in `quality/rules/`.
2. **Functions are one verb applied to typed nouns.** Async is reserved for `fetch*`, `read*`, `save*`. Vague verbs, compound verbs, property-reading getters and options bags are lint errors.
3. **No prose comments in source.** Only tooling directives with a written reason (`@ts-expect-error`, `biome-ignore`) and ADR pointers, all counted. Everything else moves to a name, a type, a test, an ADR, or an issue.
4. **Size is budgeted.** `quality/budget.json` caps source lines per surface (engine 800, css 300, worker 200, tooling 480) and directive counts (0). A PR may lower a budget freely; raising one requires a new record in this folder, enforced in CI.
5. **The gate proves itself.** `scripts/selftest.mjs` lints `quality/fixtures/` with the real config and asserts that every rule fires and that the clean fixture passes.

## Consequences

- The agent gets the rule's text as a lint error in its own loop; human review is reserved for judgment (is the noun right, is the verb the right verb, should two things be one).
- Constraints push code toward small pure functions with I/O at the edges (page frontmatter, `src/lib/content.ts`), which is also what makes the site fast to reason about.
- Tooling costs 442 lines. That is accepted because the selftest caught a real rule bug (a regex that did not span lines) within minutes of being written.
