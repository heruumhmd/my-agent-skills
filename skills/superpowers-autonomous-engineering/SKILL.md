---
name: superpowers-autonomous-engineering
description: Executes multi-hour autonomous software engineering through disciplined worktree isolation, granular task slicing, and test-driven development. Use when building complex features autonomously, running disciplined TDD cycles that delete unverified code, orchestrating subagent-driven workflows, or enforcing git worktree sandboxing.
---

# Superpowers Autonomous Engineering

## Overview

Pure "vibe coding" without guardrails quickly collapses when engineering non-trivial systems: agents take speculative shortcuts, skip unit tests, hallucinate undocumented dependencies, and introduce subtle breaking regressions.

Based on `obra/superpowers` (ranked #2 globally among agent skills) and Spec-Driven Development autonomous execution frameworks, this skill transforms AI agents into a disciplined, self-correcting engineering team capable of operating autonomously for multi-hour sessions. It enforces a strict invariant cycle: **Brainstorming** → **Git Worktree Isolation** → **Granular Task Slicing** → **Strict Test-Driven Development (Red-Green-Refactor with code deletion)** → **Subagent-Driven Execution with Automated Cross-Review**.

## When to Use

- Building substantial, multi-module features or entire applications autonomously
- Running unattended, multi-hour agent engineering sessions without drift
- Enforcing strict test-first discipline (where code written before tests is deleted)
- Sandboxing feature development in separate git worktrees to keep the main branch pristine
- Coordinating subagents where each task slice is implemented by one subagent and reviewed by another

**When NOT to use:**
- Quick single-line typos or trivial documentation edits — use standard edit tools
- Exploratory conversational brainstorming without implementation — use `idea-refine`
- Deploying to production infrastructure — use `shipping-and-launch`

## The 5-Stage Autonomous Engineering Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SUPERPOWERS AUTONOMOUS WORKFLOW                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Brainstorming     → Socratic requirement discovery & spec signoff   │
│ 2. Worktree Sandbox  → git worktree add .worktrees/<task> -b <branch> │
│ 3. 2-5 Min Slices    → Deconstruct plan into bite-sized verifiable tasks│
│ 4. Strict TDD Loop   → Red -> Green -> Refactor (delete unverified code│
│ 5. Subagent Dispatch → Worker subagent builds; reviewer subagent audits│
└────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Brainstorming and Socratic Specification
Never write implementation code directly from an ambiguous user prompt:
- Cross-examine requirements, explore alternative architectural patterns, and clarify boundary conditions.
- Produce a structured specification artifact (`docs/specs/<feature>.md`) covering user stories, acceptance criteria, and explicit non-goals.
- Require unambiguous approval before proceeding to implementation.

### Stage 2: Git Worktree Isolation
Never execute multi-turn autonomous feature engineering directly in the main repository tree:
- Create an isolated git worktree:
  ```bash
  git worktree add -b feature/auth-refresh .worktrees/auth-refresh
  ```
- The main branch and working directory remain clean, buildable, and ready for hotfixes while autonomous agents operate in the isolated tree.

### Stage 3: Granular Task Slicing (2–5 Minute Bites)
Never attempt large, monolithic implementation steps. Break the spec into micro-tasks:
- Each task slice must represent a single vertical capability that can be written, tested, and verified in under 5 minutes.
- Tasks are ordered by dependency: foundation types → domain core → integrations → consumer endpoints.

### Stage 4: Strict Test-Driven Development (The Iron Rule)
Follow the Red-Green-Refactor cycle with zero exceptions:
1. **Red**: Write an automated test asserting the expected behavior. Run the test suite and verify it fails with the expected error message.
2. **Green**: Write the minimal production code necessary to pass the test. Run the test suite and verify it passes.
3. **Refactor**: Clean up duplication and improve readability while keeping tests green.
4. **The Iron Rule**: Any production code written *before* its corresponding test existed must be deleted immediately. No rationalization or retroactive test writing is permitted.

### Stage 5: Subagent-Driven Execution with Cross-Review
For each task slice:
1. **Fresh Worker Subagent**: Spawn a fresh subagent with a clean context window containing only the current task slice description and necessary type definitions.
2. **Execution & Evidence**: The worker executes the TDD cycle, runs the test suite, and captures terminal evidence.
3. **Reviewer Subagent**: Spawn an adversarial reviewer subagent to audit the worker's diff against requirements, edge cases, and code standards.
4. **Merge**: Once approved, commit the atomic slice to the worktree branch.

Upon completion of all slices, merge the worktree branch into main, remove the worktree, and run the complete test suite.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This feature is simple, I'll write the code first and add tests later." | Retroactive tests test what the code *does*, not what it *should do*, and miss edge cases. Code written before tests must be deleted. |
| "Creating a git worktree is unnecessary overhead for this change." | Without worktree isolation, a stalled or failed agent session leaves a dirty working tree, broken builds, and untracked artifacts. |
| "One agent can implement and review its own code." | Agents suffer from confirmation bias and overlook their own subtle oversights. An adversarial reviewer subagent catches hidden flaws. |

## Red Flags

- Writing production code before running a failing test
- Modifying files in the main checkout instead of an isolated git worktree
- Slices larger than 100 lines of change or spanning multiple distinct responsibilities
- Subagents marking tasks complete without terminal proof of passing tests
- Retroactively adjusting tests to match unexpected code outputs

## Verification

Before declaring an autonomous feature complete, confirm:

- [ ] Feature specification was documented and verified before code was written
- [ ] Work was executed in an isolated git worktree
- [ ] Every functional slice was implemented via strict Red-Green-Refactor cycles
- [ ] Code written without tests was identified and deleted
- [ ] Reviewer subagent approved the changes with zero unresolved red flags
- [ ] Full repository test suite passes cleanly after worktree branch merge
