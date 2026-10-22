---
name: code-archeology-and-anti-slop
description: Enforces rigorous anti-slop engineering and deep codebase archeology. Use when investigating unfamiliar legacy systems, determining historical architectural intent via git history, tracing blast radius before proposing complex edits, or purging AI-generated verbosity, ceremonial wrappers, and speculative abstractions. Use before making multi-module modifications to prove hypotheses with throwaway reality probes instead of guessing.
---

# Code Archeology and Anti-Slop Engineering

## Overview

A high-rigor engineering discipline inspired by `pstack` (`poteto-mode`) and senior staff engineering practices. Combines deep **code archeology** — understanding the historical "why" and architectural invariants of existing code before touching it — with an uncompromising **anti-slop filter** that eliminates AI-generated fluff, unnecessary abstraction layers, and unverified assumptions.

AI coding agents instinctively tend to generate bloated boilerplate, wrap simple functions in multi-tiered interfaces, and guess system behavior instead of proving it. This skill forces agents to act like senior systems architects: **read before writing, prove before claiming, and minimize the blast radius.**

## When to Use

- Approaching an unfamiliar, legacy, or undocumented codebase
- Investigating historical regressions where the original design intent is lost
- Planning non-trivial changes that cross module boundaries
- Purging AI-generated verbosity, conversational comments, and ceremonial wrapper classes
- Evaluating a PR or diff for architectural drift, over-abstraction, and speculative generality
- When tempted to ask the user questions about codebase mechanics that can be discovered by reading code or running a quick probe

## The Four Pillars

```
┌─────────────────────────────────────────────────────────────┐
│ RIGOROUS ENGINEERING CYCLE                                 │
│                                                             │
│ 1. ARCHEO-INVESTIGATE → Dig git history, invariants & blast │
│ 2. REALITY PROBE     → Run micro-probe before speculating   │
│ 3. ANTI-SLOP FILTER  → Strip all ceremonial boilerplate     │
│ 4. PROVE & INTERROGATE→ Verify behavior, not promises       │
└─────────────────────────────────────────────────────────────┘
```

### 1. Code Archeology: Understanding the "Why"

Never modify a line of non-trivial code without understanding why it was written in the first place (Chesterton's Fence).

**Investigation Protocol**:
1. **Trace the Commit History**:
   ```bash
   # Find every commit that touched the function or identifier
   git log -S "target_function_name" --patch --stat

   # Inspect the line-by-line lineage and associated commit messages
   git blame -L 120,160 path/to/file.ext
   ```
2. **Identify Invariants and Edge Cases**:
   Read the original commit message and related test suites. Look for clues about vendor quirks, race conditions, or specific platform workarounds that motivated the implementation.
3. **Map the Blast Radius**:
   Before modifying a data shape or method signature, search for all internal callers:
   ```bash
   # Search across entire repo for callers, tests, and configurations
   git grep -n "targetMethod"
   ```

### 2. Reality Probing: Prove It First

**Rule: Never ask the user a question that the codebase or a 5-line script can answer.**

When uncertain about how a third-party library, runtime API, or framework hook actually behaves:
- **Do NOT speculate in chat.**
- **Do NOT ask the user for confirmation.**
- **Write a throwaway reality probe.**

**Reality Probe Workflow**:
1. Create a minimal isolated script or node/python one-liner in the workspace.
2. Execute the probe and observe actual return values, error types, and side effects.
3. Record the observed result as concrete empirical evidence.
4. Clean up the throwaway probe.

*Example*: Instead of asking "Does this library method return `null` or throw on missing keys?", run:
```bash
node -e "const lib = require('./lib'); console.log(lib.find('non-existent'));"
```

### 3. The Anti-Slop Protocol

AI assistants frequently pad code with defensive layers, redundant comments, and premature abstractions. Strip them ruthlessly.

**The Slop Taxonomy & Removals**:

| AI Slop Anti-Pattern | Manifestation | The Anti-Slop Remedy |
|---|---|---|
| **Ceremonial Wrappers** | Creating a `UserManagerServiceFactoryProvider` to wrap a single database call. | Call the database query directly or use the simplest established pattern. |
| **Conversational Comments** | `// Now we will check if the user is null, and if so, return false` | Delete the comment. Self-documenting code with clear variable names needs no narration. |
| **Defensive Over-Checking** | Checking `if (!arr || !Array.isArray(arr) || arr.length === 0)` inside private internal helpers where types are known. | Rely on type definitions and assert invariants at the system perimeter only. |
| **Speculative Extensibility** | Adding generic configuration options, plugin systems, or abstract hooks for hypothetical future features. | Implement only what is required to satisfy the immediate verified requirement (YAGNI). |
| **Narrative Diffs** | Modifying whitespace, reordering unrelated imports, or reformatting neighboring functions. | Strict minimal diff. Touch ONLY the lines necessary to achieve the goal. |

### 4. Adversarial Self-Interrogation

Before reporting a task complete or requesting review, subject your solution to adversarial stress:

1. **The Skepticism Test**: "What unhandled failure mode would make a senior engineer reject this diff?"
2. **The Boundary Check**: What happens on empty inputs, network timeouts, zero-length arrays, and concurrent executions?
3. **The Proof Requirement**: Can you show terminal output proving tests ran and passed? A claim without execution output is treated as unverified.

## Common Rationalizations

| Rationalization | Reality | Counter-Argument |
|---|---|---|
| "Adding an abstraction layer makes the code more modular and future-proof." | Abstractions have an ongoing cognitive and maintenance cost. Speculative layers become technical debt. | Write the concrete implementation first. Abstract only when 3 or more distinct call sites require identical behavior. |
| "I should ask the user how this internal method behaves." | The user's time is scarce; the code and terminal are accessible to you right now. | Read the implementation, examine the tests, or run a reality probe. Return to the user with facts, not questions. |
| "I'll clean up formatting across the whole file while fixing the bug." | Broad cosmetic diffs obscure the real fix, complicate code review, and risk merge conflicts. | Keep diffs surgical. Separate cosmetic refactors into a distinct, dedicated commit. |
| "The tests pass, so the feature must work." | Tests only verify what they assert. If the assertions are shallow or mock everything away, the test proves nothing. | Verify behavior under real inputs. Probe edge cases and ensure failure paths actually fail. |

## Red Flags

- Asking questions that can be verified by running `git grep` or a node/python one-liner.
- Explaining code line-by-line with inline comments instead of writing self-explanatory code.
- Adding files with names ending in `Helper`, `Manager`, `Wrapper`, or `Util` for single-use logic.
- Diffs where lines of deleted boilerplate are outnumbered 5-to-1 by newly added abstractions.
- Declaring victory without running the test suite or presenting terminal logs.

## Verification

Every change passing through this skill must satisfy:

- [ ] **Historical Invariant Check**: Git history or blame examined for context on modified sections.
- [ ] **Empirical Proof**: Any uncertain runtime behavior was resolved with an actual probe execution, not speculation.
- [ ] **Anti-Slop Audit**: Zero ceremonial wrappers, zero conversational comments, zero speculative abstractions.
- [ ] **Minimal Diff Check**: `git diff` contains only changes directly relevant to the task.
- [ ] **Adversarial Test Run**: Automated test suite executed with real terminal output verifying success.
