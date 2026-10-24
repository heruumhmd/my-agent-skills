# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Antigravity, etc.) when working with code in this repository.

> **Scope:** This file configures agents working on the [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) repository itself. It is not meant to be copied into other projects or into a global agent configuration; the reusable assets are the skills in `skills/`, not this file.

## Repository Overview

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `/skills` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)
- **Universal Ambient Token Economy**: In every interaction, preserve context by default: use targeted file line bounds, pinpoint surgical diffs, concise responses without filler, and compact AST signatures instead of dumping raw file contents. NEVER sacrifice code correctness, architectural depth, security, testing, or completeness; only eliminate noise and filler.

### Intent → Skill Mapping

The agent should automatically map user intent (in English, Indonesian, or mixed) to skills:

- **Requirements, Clarification & Ideation**:
  - Starting a task / Unclear requirements / Tanya-jawab requirement → `using-agent-skills` or `interview-me`
  - Ideation / Concept refining / Socratic stress-testing → `idea-refine`
  - Enforce project quality bar / CONSTRAINTS.md / Jaga standar mutu → `constraint-driven-development`
  - Official documentation verification / Cek dokumentasi resmi → `source-driven-development`

- **Design & Architecture**:
  - Feature / spec definition / PRD → `spec-driven-development`
  - Planning / breakdown / Pecah task implementasi → `planning-and-task-breakdown`
  - API / endpoint / contract design / Desain interface → `api-and-interface-design`
  - Subagent delegation / Multi-agent research / Delegasi subagent → `subagent-orchestration-and-delegation`
  - Autonomous engineering loop / Obra Superpowers / Git worktree isolation / 2-5 min task slicing / Strict TDD red-green-refactor / Subagent per task → `superpowers-autonomous-engineering`

- **Implementation & Testing**:
  - Incremental slices / Perubahan bertahap → `incremental-implementation`
  - Test-Driven Development (TDD) / Red-Green-Refactor → `test-driven-development`
  - Frontend UI / Accessibility / Responsive layouts → `frontend-ui-engineering`
  - Anti-slop frontend / Impeccable design / UI taste / Typography polish / Ban Inter font & purple-blue gradients → `impeccable-frontend-design`
  - Modern React & Next.js UI / shadcn/ui → `shadcn-ui-engineering`
  - Laravel & PHP backend / Service-Action architecture → `laravel-service-action-architecture`

- **Reverse Engineering, Systems & Binary Analysis**:
  - Reverse engineering / morluto/rea / REA setup / Ghidra & IDA MCP / Binary triage (ELF, PE, Mach-O) / ASAR & Electron / Decompilation / Protocol reversing / Clean-room feature porting / Bongkar file biner → `reverse-engineering-and-binary-analysis`
  - Legacy codebase investigation / Git archeology & reality probing / Blast radius → `code-archeology-and-anti-slop`

- **Code Review, Quality & Deslopping**:
  - Thermonuclear structural code review / Cognitive debt elimination / 1000-line file limit → `thermonuclear-code-review`
  - Multi-axis code review / Pre-merge checklist → `code-review-and-quality`
  - Removing AI slop / Text & doc deslopping / Bersihkan AI fluff → `unslop-code-and-prose`
  - Refactoring / simplification → `code-simplification`
  - Adversarial interrogation / Doubt assumptions / Uji keraguan keputusan non-sepele → `doubt-driven-development`

- **Debugging, Reliability & Maintenance**:
  - Bug / failure / unexpected behavior / Diagnostic recovery → `debugging-and-error-recovery`
  - Browser testing & DevTools inspection → `browser-testing-with-devtools`
  - Browser automation via Rust CDP / Accessibility-tree snapshots (@eN) / Token-efficient scraping & QA / vercel agent-browser → `agent-browser-automation`
  - Security auditing & hardening / OWASP protection → `security-and-hardening`
  - Performance optimization / Bottleneck tuning → `performance-optimization`
  - Observability / Instrumentation / Logging, metrics & tracing → `observability-and-instrumentation`
  - Deprecation & safe database migrations (expand/contract) → `deprecation-and-migration`

- **Git, Automation, CI/CD & Launch**:
  - Git workflow & atomic versioning / Release tagging → `git-workflow-and-versioning`
  - Repo workflow / Issue triage / Matt Pocock skills standard / Wayfinder / docs/agents/ / To-spec & to-tickets → `repo-workflow-and-triage`
  - Architecture Decision Records (ADRs) & documentation → `documentation-and-adrs`
  - CI/CD build pipelines & quality gates → `ci-cd-and-automation`
  - Shipping & production launch checklist → `shipping-and-launch`

- **AI Agents, Frameworks & Machine Learning**:
  - Agent memory & persistent habits → `agent-memory-and-instincts`
  - Context window optimization & session engineering → `context-engineering`
  - Agentic harness patterns / Select-Writeback-Compress-Isolate / Memory persistence with mutex lock / Tool schema consolidation / keli-wen harness patterns → `agentic-harness-patterns`
  - Token optimization, prompt caching, repomix --compress Tree-sitter packing & canonical fact compression / Hemat token / Menghemat token / Optimasi token → `token-optimization`
  - Codebase context indexing & vector search → `codebase-context-indexing`
  - Codebase knowledge graph / Understand-Anything (.ua/) / AST + semantic graph / Navigasi codebase raksasa (>100k LOC) → `codebase-knowledge-graph`
  - 4-Engine hyper-efficient agent architecture → `hyper-efficient-agent-architecture`
  - PydanticAI type-safe structured agents → `pydantic-ai-structured-agents`
  - Smolagents code-first lightweight agents → `smolagents-code-first-agents`
  - LangGraph stateful multi-agent workflows → `langgraph-stateful-agent-design`
  - Applied ML system design → `applied-ml-system-design`
  - ML data preprocessing & leakage prevention → `ml-data-preprocessing-and-leakage-prevention`
  - ML model evaluation & metrics analysis → `ml-model-evaluation-and-metrics`
  - Neural network training recipe (PyTorch) → `neural-network-training-recipe`
  - UV Python package manager & virtualenvs → `uv-python-package-manager`
  - Academic journal LaTeX drafting & formatting → `academic-journal-latex-workflow`

### Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/spec` or `/plan`.

Instead, the agent must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I’ll gather context first"

Correct behavior:

- Always check for and use skills first

This ensures OpenCode behaves similarly to Claude Code with full workflow enforcement.

## Orchestration: Personas, Skills, and Commands

This repo has three composable layers. They have different jobs and should not be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*. Mandatory hops when an intent matches.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/*.md`) — user-facing entry points. The *when*. The orchestration layer.

Composition rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas.** A persona may invoke skills.

The only multi-persona orchestration pattern this repo endorses is **parallel fan-out with a merge step** — used by `/ship` to run `code-reviewer`, `security-auditor`, and `test-engineer` concurrently and synthesize their reports. Do not build a "router" persona that decides which other persona to call; that's the job of slash commands and intent mapping.

See [docs/agents.md](docs/agents.md) for the decision matrix and [references/orchestration-patterns.md](references/orchestration-patterns.md) for the full pattern catalog.

**Claude Code interop:** the personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory) and as Agent Teams teammates (referenced by name when spawning). Two platform constraints align with our rules: subagents cannot spawn other subagents, and teams cannot nest. Plugin agents silently ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields.

## Creating a New Skill

> **Before you start:** run the pre-flight checks in [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill), search the catalog, check open PRs (`gh pr list --state open`), confirm the idea fits [docs/skill-anatomy.md](docs/skill-anatomy.md), and justify the gap in your PR description. Most new-skill ideas overlap an existing skill or an open PR; prefer extending an existing skill over adding a near-duplicate. CONTRIBUTING.md is the single source of truth for this workflow.

Skills in this repo are markdown-first: each lives at `skills/<kebab-case-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and follows the section anatomy (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification). Add a `scripts/` directory only when the skill ships runnable helpers; most skills are markdown only, and there are no per-skill zip packages.

For the full format, naming conventions, frontmatter rules, supporting-file thresholds, and writing principles, see [docs/skill-anatomy.md](docs/skill-anatomy.md), the single source of truth for skill structure. Do not restate that guidance here, link to it.
