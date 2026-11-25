# skylershuman.com

Source for the consulting site at skylershuman.com. Astro builds a static landing page with one small browser script for Navigation Timing. No client-side framework, analytics, or benchmark requests.

## Landing page

```sh
pnpm dev             # http://localhost:4321
pnpm build           # static output in dist/
pnpm exec playwright install chromium
pnpm test            # Chromium acceptance tests
```

The page measures from navigation start to `loadEventStart`, matching [HTTP Archive's onLoad benchmark](https://httparchive.org/reports/loading-speed?start=2026_10_01#ol). The benchmark is a synthetic crawl, not a real-user distribution. A browser device signal selects the desktop or mobile sample without using viewport width.

`src/data/benchmark.json` pins October 2026. Each `counts` index is the lower bound in seconds of a one-second bucket; the values are the published [histogram volumes](https://cdn.httparchive.org/v1/static/reports/2026_10_01/ol.json), with missing buckets stored as zero. Only buckets whose lower bound exceeds the unrounded timing count as slower, so the displayed whole percent is a conservative lower bound. The multiplier is the largest whole factor for which the same buckets are still strictly slower; factors below 2× are omitted. Countdown starting values come from the corresponding published [p50 values](https://cdn.httparchive.org/v1/static/reports/ol.json), converted to milliseconds.

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
