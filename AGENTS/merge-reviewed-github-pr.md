# Merge the reviewed GitHub PR

Confirm the PR still targets `main`, the required GitHub checks are green for its current head, and the reviewed base and head still match GitHub. If either SHA changed, rerun the gates and get a new review. Do not enable auto-merge, bypass a ruleset, push to `main`, or merge on the user's behalf.

Hand the user the PR link and `gh pr merge <number> --squash --match-head-commit <reviewed-head>` to run after verifying the base. Report deployment status only from an existing configured workflow, after the human merges; if there is none, say so. Do not create or trigger a separate deployment.
