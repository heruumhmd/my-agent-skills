---
name: repo-workflow-and-triage
description: Standardizes repository workflows, issue triaging, and ticket specification by decoupling repo metadata from skill logic. Use when onboarding agents to a repository, organizing issue tracking in docs/agents/, converting user bug reports into actionable specifications, or triaging project tickets autonomously.
---

# Repository Workflow and Issue Triage

## Overview

When coding agents interact with repositories, coupling project-specific tracker details, domain terminology, and issue management directly into skill prompts causes brittle workflows and fragmentation across tools (GitHub Issues, Linear, GitLab, Jira, or local markdown files).

Standardized by `mattpocock/skills` (~300k+ stars), this skill establishes a portable repository operating layer. By decoupling repository-specific configuration (stored in `docs/agents/`) from skill logic, agents execute four core repository workflows autonomously: **Wayfinder** (repo orientation), **Issue Triage** (intake and labeling), **To-Spec** (turning raw issues into formal specifications), and **To-Tickets** (decomposing architecture plans into tracker-ready tickets).

## When to Use

- Onboarding an AI agent onto a new or existing repository
- Decoupling agent workflow logic from project-specific tracker vendors (GitHub, Linear, GitLab, Jira)
- Triaging incoming bug reports or feature requests, detecting duplicates, and assessing severity
- Converting vague user problem reports into formal, testable technical specifications
- Decomposing architectural plans or PRDs into atomic, tracker-ready tickets

**When NOT to use:**
- Writing actual feature code — use `incremental-implementation` or `test-driven-development`
- Writing system architecture decision records (ADRs) — use `documentation-and-adrs`
- Resolving complex git merge conflicts — use `git-workflow-and-versioning`

## The 4 Standard Workflow Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REPO WORKFLOW & TRIAGE PIPELINE                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Wayfinder  → Discover languages, build tools, entrypoints & context │
│ 2. Triage     → Intake issues, deduplicate, label blast radius/severity│
│ 3. To-Spec    → Convert raw issue into formal testable specification   │
│ 4. To-Tickets → Deconstruct spec into tracker-ready actionable tickets │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Wayfinder (Repository Orientation)
Before making changes, orient the agent using standard repository configuration:
- Read or initialize the repository orientation files in `docs/agents/`:
  - `docs/agents/issue-tracker.md`: Specifies tracker type (e.g., `github`, `linear`, `local-markdown`), issue URL templates, and required label taxonomies.
  - `docs/agents/domain.md`: Project glossary, domain models, ubiquitous language, and business boundary definitions.
  - `docs/agents/conventions.md`: Code style, linting rules, naming patterns, and testing conventions.
- Identify primary entrypoints (`main.go`, `src/index.ts`, `app/Providers`), build scripts, and package managers.

### 2. Issue Triage
Process incoming issue reports systematically:
1. **Intake & Normalization**: Parse the reported problem, environment details, and reproduction steps.
2. **Duplicate Detection**: Search existing open and closed issues for identical symptoms or overlapping components.
3. **Blast Radius & Severity Assessment**: Determine affected subsystems and assign severity:
   - `P0 / Blocker`: Production outage, data loss, or security compromise.
   - `P1 / High`: Core functionality broken without workaround.
   - `P2 / Medium`: Non-critical bug or feature enhancement.
   - `P3 / Low`: Cosmetic, typo, or minor polish.
4. **Tagging**: Apply appropriate module labels based on `docs/agents/issue-tracker.md`.

### 3. To-Spec (Issue to Formal Specification)
Transform an approved issue into a structured engineering specification:
- Output to `docs/specs/<issue-id>-<slug>.md`.
- Include:
  - **Context & Problem Statement**: Exact behavior observed vs expected.
  - **Proposed Solution**: High-level approach and affected interfaces.
  - **Acceptance Criteria**: Gherkin-style scenarios (`Given / When / Then`).
  - **Edge Cases & Failure Paths**: Invalid inputs, timeouts, network interruptions.
  - **Non-Goals**: Explicitly out-of-scope items.

### 4. To-Tickets (Spec to Actionable Work Items)
Decompose the approved specification into independent work tickets:
- Format each ticket according to `docs/agents/issue-tracker.md` conventions:
  ```markdown
  ### [Ticket Title]
  - **Objective**: Single concise goal
  - **Preconditions**: Dependent tickets or migrations
  - **Files to Modify**: Exact file paths
  - **Verification Steps**: Specific test commands to run
  ```
- Tickets are ordered so dependencies are completed before dependent items begin.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can implement the issue immediately without creating a spec or ticket." | Implementing directly from conversational bug reports leads to scope creep, missed edge cases, and incomplete acceptance testing. |
| "Hardcoding GitHub CLI commands into the skill is fine." | Hardcoding breaks when teams switch to Linear, GitLab, or local issue tracking. Decoupling configuration via `docs/agents/issue-tracker.md` keeps skills universal. |
| "Triage is just reading the issue title." | Triage requires duplicate checking, verifying reproducibility, assessing security/blast radius, and establishing priority. |

## Red Flags

- Executing implementation tasks from ambiguous, un-triaged problem descriptions
- Hardcoding vendor-specific issue tracker parameters inside skill files
- Creating tickets that lack reproducible verification steps or file targets
- Omitting negative test cases or non-goals in generated specifications
- Proceeding without inspecting existing `docs/agents/` domain glossaries

## Verification

Before concluding a repository triage or issue workflow task, confirm:

- [ ] Repository configuration (`docs/agents/`) was consulted or established
- [ ] Issue was deduplicated and assigned a concrete severity level
- [ ] Generated specification includes explicit acceptance criteria and edge cases
- [ ] Decomposed tickets have clear preconditions, target files, and test commands
- [ ] No vendor-specific issue tracker syntax was hardcoded into skill instructions
