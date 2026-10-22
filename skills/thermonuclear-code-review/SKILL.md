---
name: thermonuclear-code-review
description: Executes uncompromising structural critique to eliminate cognitive debt, enforce file modularity, and demand code-judo reframing. Use when conducting deep architectural code reviews on complex pull requests, when challenging high-cyclomatic branching and leaky abstraction boundaries, when diffs threaten file size thresholds over 1000 lines, or when seeking radical simplifications that delete unnecessary intermediate layers.
---

# Thermonuclear Code Review

## Overview

An uncompromising, structural code quality review workflow. Inspired by high-rigor engineering practices, thermonuclear review prioritizes architectural health over superficial stylistic nits. It treats every added layer of indirection as a tax, hunts down cognitive debt, enforces strict size and cohesion boundaries, and demands "code-judo" reframing—discovering the structural pivot that deletes whole categories of complexity.

## When to Use

- Reviewing substantial architectural changes, non-trivial diffs, or mission-critical pull requests
- A proposed PR adds complex branching, conditional chains, or one-off boolean flags to an existing flow
- A change enlarges a file or component past the 1,000-line modularity threshold
- An implementation introduces thin wrappers, generic abstractions, or unnecessary intermediate layers that do not earn their keep
- Spotting cognitive overload where a reader must keep more than three concepts in memory simultaneously
- A refactor claims to simplify code but merely rearranges complexity without eliminating it

**When NOT to use:**

- Standard multi-axis pre-merge checklist (covering formatting, linting, and basic tests) — use `code-review-and-quality`
- Behavioral test-driven verification before implementation — use `test-driven-development`
- Micro-refactoring a single function without altering boundaries — use `code-simplification`
- Security and threat modeling audits — use `security-and-hardening`

## The Thermonuclear Review Process

```
[Phase 1: Boundary & Blast Radius Audit]
       │ file sizes (>1000 lines), module responsibilities, boundary leaks
       ▼
[Phase 2: Cognitive Debt & Indirection Inspection]
       │ unearned wrappers, boolean flag sprawl, type-cast churn, state atomicity
       ▼
[Phase 3: Code-Judo Reframing Synthesis]
       │ search for the pivot that collapses branches into domain models
       ▼
[Phase 4: Layered High-Conviction Verdict]
       │ narrative summary, concrete code-judo proposals, zero cosmetic fluff
```

### Phase 1: Boundary and Blast Radius Audit

Examine structural contracts before reading line-level logic:

1. **The 1,000-Line File Threshold:**
   - Flag any change that pushes a file from under 1,000 lines to over 1,000 lines as a **presumptive blocker**.
   - Demand decomposition into focused cohesive modules before approving feature additions.

2. **Leaky Boundary Detection:**
   - Did feature-specific business logic leak into generic core utilities or shared database layers?
   - Did the diff expose internal implementation details across module borders instead of exposing a tight, minimal contract?

3. **Orchestration vs Business Logic Separation:**
   - Are async calls, side effects, and persistence tangled directly with domain validation?
   - Enforce pure business calculation separate from coordination layers.

### Phase 2: Cognitive Debt and Indirection Inspection

Audit the diff against cognitive antipatterns:

- **Unearned Abstractions & Identity Wrappers:**
  Flag any class, interface, or helper that simply delegates to an underlying call without adding validation, caching, or transformation. An abstraction must simplify comprehension, not multiply it.
- **Special-Case Branching Sprawl:**
  Detect one-off flags (e.g., `isLegacyClient`, `skipValidationForV2`, `enableSpecialTax`) bolted onto shared paths. Each flag doubles the cognitive test surface.
- **Contract Obscuration via Type Casting:**
  Flag `as any`, `unknown`, non-null assertions (`!`), or proliferating optional fields (`?`). If the types are ambiguous, the domain model is unsound.
- **Partial Mutation & Atomicity Gaps:**
  Verify that operations that update multiple resources execute atomically or roll back cleanly. Partial update states produce subtle runtime corruption.

### Phase 3: Code-Judo Reframing

Do not merely critique—engineer the simpler alternative. A **code-judo move** uses the problem's own invariants to eliminate complexity:

```
Complex Pattern (Reject):
  if (type === 'card') {
    if (isRecurring) { ... } else { ... }
  } else if (type === 'ach') {
    if (isVerified) { ... } else { ... }
  }

Code-Judo Reframing (Propose):
  Map payment methods to an explicit strategy or typed state transition.
  Instead of cascading conditionals, dispatch directly through polymorphic handlers.
```

When you find a structural issue, provide the exact reframing that makes the conditionals disappear.

### Phase 4: Output Expectations and Report Structure

Deliver findings in a layered structure (never a shallow list of disjointed nits):

1. **High-Conviction Summary:**
   - The overall verdict: `APPROVE`, `REQUEST STRUCTURAL REFACTOR`, or `BLOCK ON ARCHITECTURAL DEBT`.
   - The top 2-3 structural findings, written in clear narrative paragraphs.
   - The file size and blast radius accounting.

2. **Concrete Code-Judo Proposals:**
   - For each major finding, present the worked alternative: the proposed interface, data shape, and deletion of branches.

3. **Approval Bar Checklist:**
   An approval requires that:
   - No file exceeds 1,000 lines without documented decomposition.
   - No unearned abstraction layers were added.
   - No special-case branching was bolted onto shared core flows.
   - Independent operations are executed with optimal clarity and state atomicity.

## Review Tone and Phrasing

Be direct, rigorous, and demanding about architectural integrity. Do not soften fundamental architectural debt into mild suggestions:

- **Demand decomposition:** "This change pushes `order_service.py` to 1,120 lines. Decompose this into a dedicated payment settlement module before adding this flow."
- **Challenge wrappers:** "This wrapper class adds two layers of indirection to pass three arguments to the database. Delete the wrapper and call the canonical service directly."
- **Propose code-judo:** "We are adding four booleans to handle edge-case routing. If we model this as a state enum with valid transitions, all four conditionals disappear."

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works and all existing tests pass." | Tests verify that behavior works today; architectural review verifies the codebase remains maintainable tomorrow. |
| "We will refactor this in a follow-up PR." | Follow-up PRs rarely happen. Debt accepted into main branch becomes permanent precedent. |
| "This extra wrapper makes it more flexible for the future." | Speculative generality (YAGNI) creates immediate indirection costs for hypothetical futures. Build for today's concrete invariants. |
| "A 1,000-line file is normal for our service." | Large files obscure ownership, cause frequent merge conflicts, and invite god-object accumulation. Split by cohesion. |

## Red Flags

- Approving a PR solely because unit tests passed without evaluating cyclomatic complexity growth
- Softening a structural rejection into an "optional nit" to avoid pushing back
- Leaving 20 superficial cosmetic comments while ignoring a 400-line monolithic function
- Accepting `any` or loose casts because "the type definition was too difficult to construct"

## Verification

Before certifying a thermonuclear code review:

- [ ] All modified files were inspected for the 1,000-line threshold
- [ ] Every newly introduced abstraction was evaluated: does it delete cognitive overhead or add indirection?
- [ ] At least one concrete code-judo reframing was explored for any flagged branching complexity
- [ ] The review deliverable provides high-conviction narrative evidence rather than superficial cosmetic nits
- [ ] The verdict explicitly distinguishes between structural blockers and verified architectural sound design
