# Test feature requirements

Write at least one behavior test for each approved requirement. Map requirement IDs to named test cases; a shared setup is fine, but each requirement needs a specific assertion. Exercise observable outcomes through the smallest public surface that exposes them. Do not test a private function merely because it exists or assert an implementation detail the spec does not promise.

Run the new tests before implementing the feature. Record the command and why each new behavior fails. A broken import, fixture, or test runner is not evidence of red: fix the harness and rerun. If a test already passes, verify that it distinguishes a violation of the requirement and record the behavior as already satisfied. If something cannot be automated, agree on a repeatable manual acceptance test with the user before building.
