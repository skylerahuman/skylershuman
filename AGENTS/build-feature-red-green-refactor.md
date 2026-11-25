# Build feature: red, green, refactor

Take a failing requirement test, make the smallest change that passes it, then simplify while keeping it green. Repeat and run the complete affected suite after refactoring. Keep behavior tests stable; fix faulty tests explicitly, but do not loosen assertions to accommodate the implementation. If scope or behavior changes, return to planning and get approval before changing the spec and tests.

For feedback from a failed gate or human review, fix the cause. If it exposes missing behavior coverage, add the regression test and observe red first. Then rerun the quality stage.
