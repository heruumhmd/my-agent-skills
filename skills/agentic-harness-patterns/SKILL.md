---
name: agentic-harness-patterns
description: Applies production agent context harness engineering patterns to prevent context rot. Use when architecting long-running agent loops, managing working memory persistence with mutex locks, implementing Select-Writeback-Compress-Isolate operations, or consolidating tool schemas to save context tokens.
---

# Agentic Harness Patterns

## Overview

Naive agent execution models inject static monolithic system prompts, sprawling tool schemas, and unfiltered conversation histories into LLM context on every turn. In long-running autonomous workflows, this causes context poisoning, reasoning degradation, and token quota exhaustion.

Derived from production coding agent harness architectures (including internal Claude Code and Codex patterns compiled by `keli-wen/agentic-harness-patterns-skill`), this skill provides the 4 architectural primitives to preserve reasoning integrity across hundreds of interaction turns: **Select**, **Write-back**, **Compress**, and **Isolate**.

## When to Use

- Architecting or refining long-running autonomous agent loops and harness pipelines
- Designing memory persistence across agent sessions with concurrent access safeguards
- Preventing context rot when sessions span tens or hundreds of conversational turns
- Consolidating fragmented tool definitions into high-efficiency schemas
- Isolating exploratory sub-tasks into separate git worktrees to keep the primary context pristine

**When NOT to use:**
- Simple one-off questions or localized single-file edits — use standard prompt workflows
- General prompt tone or formatting adjustments — use `unslop-code-and-prose`
- Basic git branch creation without agent context sandboxing — use `git-workflow-and-versioning`

## The 4 Core Context Harness Operations

```
┌────────────────────────────────────────────────────────────────────────┐
│                    THE 4 CONTEXT HARNESS PRIMITIVES                    │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Select      → Just-in-Time dynamic loading of tools, skills & docs  │
│ 2. Write-back  → Tiered memory persistence with atomic file locks      │
│ 3. Compress    → Responsive compaction retaining error & fact pointers │
│ 4. Isolate     → Sandboxed subagents executing in git worktrees        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Select (Just-in-Time Loading)
Avoid frontloading all skills, tool schemas, and project documentation into the system prompt:
- **Progressive Disclosure**: Maintain lightweight metadata and index routes in initial context. Load full skill instructions or schemas only when explicitly activated by intent.
- **Dynamic Schema Projection**: Filter active tool schemas based on the current lifecycle phase (e.g., conceal deployment tools during exploration phases).
- Pair with `token-optimization` for AST skeletonization and strict prompt cache prefix stratification.

### 2. Write-back (Tiered Persistence with Mutex Locks)
Working memory must not depend exclusively on conversational context:
- **Structured File Persistence**: Persist working state, facts, architectural decisions, and task progress into structured files (such as `.agents/state.json` or `.agents/scratchpad.md`).
- **Atomic Concurrency Protection**: When parallel subagents or multi-agent loops operate concurrently, guard write operations using file-based mutex locks (`.lock` files with timeout horizons) to prevent state corruption.
- Combine with `agent-memory-and-instincts` to record reusable project conventions and lessons.

### 3. Compress (Responsive Compaction with Recovery Pointers)
When context utilization exceeds 50–60% of the model window:
- **Canonical Fact Extraction**: Transform verbose conversational exchanges and tool execution dumps into dense factual assertions, technical decisions, and error states.
- **Cryptographic & Line Recovery Pointers**: Retain deterministic reference pointers (e.g., `git-commit:a1b2c3d`, `file.go:L120-L145`, `log-id:402`) so the agent can reload exact ground-truth evidence on demand without carrying historical noise.

### 4. Isolate (Git Worktree Sandboxing)
Prevent experimental exploratory coding from polluting the primary context:
- **Worktree Sandboxing**: Spin up a throwaway git worktree (`git worktree add .worktrees/subtask -b task-branch`) for non-trivial investigations.
- **Fresh-Context Subagents**: Dispatch tasks to fresh subagents running inside the isolated worktree. The parent agent receives only the final verified diff and summary report.
- Upon completion or failure, prune the worktree (`git worktree remove`) to maintain a clean environment.

### 5. Tool Schema Consolidation
Narrow, repetitive tool schemas inflate token overhead on every turn. Consolidate related actions:
- Instead of 6 separate tools (`read_file`, `write_file`, `delete_file`, `create_dir`, `list_dir`, `file_stat`), provide unified multi-action interfaces with concise parameter contracts.
- Strip null properties and verbose description boilerplate from runtime tool declarations.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Loading all rules and tools at the start ensures the agent never misses anything." | Bloated initial contexts degrade model reasoning, increase hallucination rates, and invalidate prompt cache benefits. Progressive disclosure delivers higher accuracy. |
| "Subagents can just share the main working directory and branch." | Concurrent file mutations cause merge collisions, corrupted builds, and polluted working trees. Git worktree isolation ensures complete reproducibility. |
| "Conversational context is sufficient for memory." | Conversational context is volatile, subject to context truncation, and lost when switching sessions. File-backed persistent state survives restarts. |

## Red Flags

- Injecting full reference documentation or multi-megabyte schemas into the system prompt
- Spawning parallel subagents without write-back locks on shared state files
- Permitting conversational turn counts to climb without triggering responsive compaction
- Performing high-blast-radius exploratory changes directly in the main working tree
- Defining dozens of micro-tools with overlapping parameters and descriptions

## Verification

Before concluding a harness or workflow architectural task, verify:

- [ ] Select: Skills, tools, and docs are loaded on demand rather than monolithically
- [ ] Write-back: Persistent state files are locked or updated atomically
- [ ] Compress: Long-session compaction preserves key decisions, errors, and recovery pointers
- [ ] Isolate: Heavy exploratory work is isolated via git worktrees or fresh subagents
- [ ] Tool schemas are consolidated to minimize per-turn token overhead
