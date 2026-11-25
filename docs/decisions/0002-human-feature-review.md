# 0002 — Human feature review

Keep the Pi review command and its tests in the repo so they are versioned and checked together. Give `.pi/extensions/` a separate 230-line budget rather than raising the existing tooling budget. Site builds must not depend on Pi.

The command reviews a committed text diff and binds the verdict to its base and head. It has no GitHub write or merge capability. Paging and a reviewer-written note make skipping harder, but do not prove comprehension. GitHub checks and the human merge handoff are distinct gates; the Pi transcript is not a server-side approval rule.
