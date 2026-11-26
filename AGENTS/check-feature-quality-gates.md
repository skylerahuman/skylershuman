# Check feature quality gates

Run the requirement tests, `pnpm quality` (includes Biome), `pnpm quality:selftest`, and the build if the project defines one. Put repeatable requirement tests in CI, not just in the transcript. Report commands, results, and the LoC delta per affected surface. If any check fails or a budget is exceeded, return to build. Do not skip checks or relax rules to make the branch pass.

Commit on the feature branch, then open or update a small PR targeting `main`. Include what, why, the requirement-to-test mapping, verification, and size. Review the exact PR head; if updating against `origin/main` changes it, rerun the checks. Follow `docs/code-style.md` for PR and commit conventions.
