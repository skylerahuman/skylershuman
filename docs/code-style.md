# Code style

Two sections. **Enforced** rules are machine-checked by `pnpm quality` (Biome + the comment and size gates); the config is the authority and this page only names it. **Judgment** rules are what review is for.

## Enforced

| Rule                                                                                                                                     | Where                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One verb per function; parameters are the nouns; a noun appears in the name only when parameters cannot carry it                         | `quality/rules/no-*.grit`, `useMaxParams` (3)                                                                     |
| `fetch*`, `read*`, `save*` are the only async verbs, and they must be async; everything else is synchronous                              | `async-requires-io-verb.grit`, `io-verbs-are-async.grit`, `useAwait`                                              |
| No vague verbs (`process`, `handle`, `manage`, `compute`, `run`, `execute`, `do`, `load`...), no `And` names                             | `no-vague-verbs.grit`, `no-compound-verbs.grit`                                                                   |
| Properties are not functions; no options bags                                                                                            | `no-field-getters.grit`, `no-options-parameter.grit`                                                              |
| Explicit parameter and return types on functions; no `any`; no `!`                                                                       | `useExplicitType`, `noExplicitAny`, `noNonNullAssertion`                                                          |
| Small functions and files: cognitive complexity ≤ 8, ≤ 40 lines per function, ≤ 300 per file                                             | `noExcessiveCognitiveComplexity`, `noExcessiveLinesPerFunction`, `noExcessiveLinesPerFile`                        |
| Function declarations over arrow constants; `T[]` over `Array<T>`; no `forEach`                                                          | `useConsistentFunctionStyle`, `useConsistentArrayType`, `noForEach`                                               |
| Names: camelCase functions and variables, PascalCase types and components, `_` for unused; files camelCase, PascalCase or kebab-case     | `useNamingConvention`, `useFilenamingConvention`                                                                  |
| Components are pure: `src/components/**` and `src/layouts/**` cannot import `astro:content` or `node:*`                                  | `overrides` in `biome.json`                                                                                       |
| Templates: no inline `style`, no `!important`, selector complexity capped, a11y rules on markup, no runtime default exports in `.astro`  | `noInlineStyles`, `noImportantStyles`, `noExcessiveSelectorComplexity`, `a11y/*`, `noAstroComponentDefaultExport` |
| No prose comments. Allowed: `@ts-expect-error <reason>`, `biome-ignore lint/<group>/<rule>: <reason>`, `ADR-N`; each count budgeted at 0 | `scripts/comments.mjs`, `quality/budget.json`                                                                     |
| Size budget: engine ≤ 800, css ≤ 300, worker ≤ 200, tooling ≤ 480, Pi extensions ≤ 230 source lines (non-blank, non-comment)             | `scripts/budget.mjs`, `quality/budget.json`                                                                       |
| Budgets move down freely; up only with a new record in `docs/decisions/`                                                                 | `.github/workflows/quality.yml`                                                                                   |

The gate proves itself: `pnpm quality:selftest` lints `quality/fixtures/` with the real config and asserts every rule fires and the clean fixture passes.

## Judgment

For naming and design, review asks three questions:

1. **Is the noun right?** Does the name say what the function operates on when the parameters cannot?
2. **Is the verb the right verb?** `get` is O(1) and synchronous; `find` is O(n); `fetch` is async; `parse` throws at build time, `tryParse` does not. A verb has a cost and an I/O contract.
3. **Is this one idea?** General over everything that exists today, nothing for what does not exist yet. Two similar components are one idea waiting to be noticed; an option nobody passes is complexity, not flexibility.

Name files so a reviewer can tell what they cover and when to open them without reading the contents. In `AGENTS/`, use action-and-subject names rather than numbers or catch-alls like `workflow.md`. Where a tool owns the filename, make the parent directory carry that meaning.

For components: a component is a noun; props are its adjectives; a page is the sentence built from them. You should be able to guess where a component goes and what it renders before reading its style.

If a comment seems necessary, the question is not "should I write it" but "what is it trying to say, and where does that belong": a name, a type, a test, an ADR, or an issue.

## Workflow

- The LLM never pushes to `main`. Every change is a PR that passes `pnpm quality`.
- PRs are one intent and under ~300 lines. The description states what, why, how it was verified, and the LoC delta per surface.
- Commits generated with AI assistance carry a trailer: `Assisted-by: <model>`.
- Dependency majors (Astro included) are individual PRs merged by a person after reading the changelog.
