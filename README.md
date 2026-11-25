# skylershuman.com

Source for the consulting site at skylershuman.com. Astro builds a static landing page with one small browser script for Navigation Timing. No client-side framework, analytics, or benchmark requests.

## Landing page

```sh
pnpm dev             # http://localhost:4321
pnpm build           # static output in dist/
pnpm exec playwright install chromium
pnpm test            # Chromium acceptance tests
```

The page measures from navigation start through `loadEventEnd`. The comparison and countdown stay off while `src/data/benchmark.json` is `null`. [HTTP Archive's public onLoad histogram](https://httparchive.org/reports/loading-speed?start=2026_10_01#ol) uses WebPageTest's `docTime`, which [tracks `loadEventStart`](https://github.com/HTTPArchive/wptagent/blob/master/internal/support/devtools_parser.py), so it is not used as a substitute. To enable the comparison, supply a dated source (`label`, `url`) and `milliseconds` observations of the matching end-of-load metric.

## Quality gate

```sh
pnpm install
pnpm quality          # biome ci + comment gate + size budget (what CI runs)
pnpm quality:selftest # checks gate fixtures and Pi review behavior
lefthook install      # fast checks on commit, full gate on push
```

Rules and the review standard: `docs/code-style.md`. Decisions: `docs/decisions/`.

## Layout

```
src/pages/        routes; compose layouts and components; I/O happens only in frontmatter
src/layouts/      the Page layout
src/components/   pure: props in, HTML out; scoped styles live here
src/content/      Markdown you write (collections)
src/data/         typed content data (nav, services, site)
src/lib/          pure functions + tests; the only place that wraps astro:content
worker/           Cloudflare Worker for /api/*
quality/          GritQL rules, fixtures, budget
scripts/          the gate
docs/             code style, decisions
```

## Workflow

Start feature work with `/skill:feature` in Pi. Stage-specific instructions live in `AGENTS/` and are read on demand. In a trusted Pi session, run `/review` to walk the committed PR diff before you squash-merge it. The review stays in Pi; GitHub does not enforce it. AI-assisted commits carry `Assisted-by: <model>`.
