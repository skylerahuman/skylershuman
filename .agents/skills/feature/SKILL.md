---

name: feature
description: Plan and deliver a repository feature through a user-approved spec, requirement tests, red-green-refactor, quality checks, human code review, and a GitHub merge handoff. Use for feature requests or to resume one of these stages.
---

# Feature delivery

From the repo root, read the one `AGENTS/` file for your current stage. Read the next only when you reach it.

1. `plan-feature-requirements.md` — agree on a spec in chat; wait for approval before editing.
2. `test-feature-requirements.md` — map every requirement to a behavior test and observe red.
3. `build-feature-red-green-refactor.md` — make tests green and refactor.
4. `check-feature-quality-gates.md` — run the full gates; failures return to build.
5. `review-feature-diff-in-pi.md` — ask the human to launch `/review`; requested changes return to build, then gates and review again.
6. `merge-reviewed-github-pr.md` — hand off the exact reviewed commit for a human squash merge.

On resume, use the approved spec, test results, Git state, and actual review outcome. If evidence for a stage is missing or stale, go back to that stage. Never infer approval from silence or a passing check.
