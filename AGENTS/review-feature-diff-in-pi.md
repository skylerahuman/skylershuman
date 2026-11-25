# Review the feature diff in Pi

Fetch `origin/main` and confirm the checkout is clean, the PR targets `main`, and local HEAD matches the PR head. If the branch needs updating, return to build and quality first. Hand the user the PR link, requirement-to-test map, and any tricky paths to inspect. Pause and ask them to type `/review` in the trusted interactive Pi session. Use `/reload` if the command is newly installed.

Enter acknowledges the displayed page; Up goes back; `r` requests changes; Esc cancels. The final note identifies a verified behavior and its test. Read surrounding code where needed; the diff alone may not show a caller or rendered result. Binary and submodule changes need a separate explicit human review.

Requested changes return to build, quality, and a fresh review. Cancellation or missing approval stops the loop. Never generate a reviewer note or mark the user's review complete for them. An approval applies only to its recorded base and head.
