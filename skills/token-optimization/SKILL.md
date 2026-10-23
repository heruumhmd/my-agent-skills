---
name: token-optimization
description: Maximizes LLM token efficiency, prompt compression, and context budget economics. Use when reducing token consumption, compressing codebases or prompts, preventing context rot, maximizing static prompt cache hits, pruning verbose tool logs, or generating compact AST skeletons for LLM context.
---

# Token Optimization & Context Compression

## Overview

Stateless coding agents resend conversation history, tool outputs, and loaded files on every interaction turn. Unmanaged context burns hundreds of thousands of tokens within minutes, inflates API bills exponentially, and causes **context rot** — model reasoning degradation that occurs when context exceeds 40–60% capacity.

Token optimization is the disciplined engineering practice of maximizing information density per token. By combining **AST structural code skeletonization**, **strict prompt cache prefix stratification**, **dynamic tool output filtering**, and **session rolling horizons**, you achieve 70–85% token reduction and over 90% prompt cache hit rates.

## When to Use

- Reducing token consumption and controlling LLM API expenses
- Starting or maintaining long multi-turn agent sessions without hitting context limits
- Preparing large codebases or multi-file modules for agent context ingestion
- Experiencing "context rot" (hallucinated APIs, attention drift, contradicting earlier instructions)
- Tool outputs (build logs, test suites, git diffs) are flooding the conversation with verbose spam
- Aligning system prompts and rules for Anthropic or Google Gemini prompt caching (KV cache hits)

## Process

```
┌────────────────────────────────────────────────────────────────────────┐
│                        5-PILLAR TOKEN ECONOMY                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. AST Structural Skeletonization   → 70-85% smaller file context      │
│ 2. Prompt Cache Stratification     → 90%+ KV cache hit rate            │
│ 3. Dynamic Tool Output Masking      → Filter passing noise to summaries│
│ 4. 50% Capacity Compaction Horizon  → Prevent attention degradation    │
│ 5. Terse Diff-First Generation      → Zero sycophancy, dense output    │
└────────────────────────────────────────────────────────────────────────┘
```

### Pillar 1: AST Structural Code Skeletonization

Never dump raw, multi-thousand-line implementation files into prompt context. An agent doing architectural reasoning, dependency tracing, or debugging only needs interfaces, class structures, method signatures, types, and exported contracts.

1. **Skeletonize First**: For all reference files, dependencies, and surrounding modules, strip method/function bodies `{ ... }` while retaining signatures and type definitions.
   - Run the companion optimizer:
     ```bash
     node skills/token-optimization/scripts/token-optimizer.js skeletonize src/services/UserService.ts
     ```
   - Retain: `export interface`, `class headers`, `method(args): ReturnType`, decorators, and docstrings.
   - Strip: internal loops, private variable assignments, and helper logic.
2. **Targeted Expansion**: Only read full un-skeletonized implementations for the 1–2 specific files actively being edited in the current turn.

### Pillar 2: Prompt Cache Stratification (KV Cache Hit Optimization)

Anthropic Claude (prompt caching) and Google Gemini (context caching) require an **exact byte-for-byte static prefix** to reuse key-value (KV) attention states. A single dynamic token early in the prompt invalidates the entire cache downstream.

Structure every prompt into strict strata:

```
┌────────────────────────────────────────────────────────┐
│ [STATIC PREFIX - CACHED (Target 90%+ Hit Rate)]        │
│ 1. System Prompt & Tool Declarations (Invariant)       │
│ 2. Project Conventions & Rules (CLAUDE.md / AGENTS.md) │
│ 3. Core Architecture Map & Compressed AST Skeletons    │
├────────────────────────────────────────────────────────┤
│ [DYNAMIC SUFFIX - UNCACHED (Minimal Footprint)]        │
│ 4. Working Memory / Active Task State (Scratchpad)     │
│ 5. Current Turn Tool Results & User Command            │
└────────────────────────────────────────────────────────┘
```

**Rules for Cache Stability:**
- Never inject timestamps, random UUIDs, or changing session counters into the system prompt or early sections.
- Keep tool definitions identical across all requests in the session.
- Run `node skills/token-optimization/scripts/token-optimizer.js cache-audit` to detect cache-busting ordering.

### Pillar 3: Dynamic Tool Observation & Log Masking

Raw terminal logs from `npm test`, `pytest`, `cargo build`, or `git diff` can consume 5,000 to 20,000 tokens in a single command turn.

1. **Filter Passing Noise**: If all tests pass, collapse output into a single line:
   ```
   [Filtered 48 passing tests | 0 errors] All test suites passed in 1.4s.
   ```
2. **Isolate Failure Frames**: When commands fail, extract only the failing assertion, expected vs received values, and the top 3–5 stack trace frames. Strip third-party `node_modules` or library internals.
   - Pipe or process logs through the optimizer:
     ```bash
     node skills/token-optimization/scripts/token-optimizer.js compress-log test-output.log
     ```
3. **Range-Bounded Reads**: Never read whole files when inspecting an error. Read targeted slices with line offsets (`StartLine: 40`, `EndLine: 70`).

### Pillar 4: The 50% Capacity Compaction Horizon

Do not wait until the context window hits 80% or 100%. Research and benchmarks demonstrate that LLM recall and reasoning degrade significantly past **40–60% capacity** ("lost-in-the-middle" attention degradation).

1. **Measure Footprint**: Audit current context consumption:
   ```bash
   node skills/token-optimization/scripts/token-optimizer.js measure .
   ```
2. **Proactive Checkpointing**: At task boundaries or upon reaching 50% context:
   - Checkpoint current architecture decisions, modified file paths, and pending requirements into a durable markdown artifact (`tasks/session-state.md`).
   - Summarize past diagnostic iterations into one conclusion sentence (e.g. *"Auth issue traced to missing Bearer prefix in header — fixed in src/auth.ts"*).
   - Clear or compact transient history (`/compact` or fresh session restart) using the durable artifact as seed context.

### Pillar 5: Terse Diff-First Generation

Output tokens cost 3x to 5x more than input tokens and slow generation speeds.

- **Zero Sycophancy**: Ban conversational filler ("Sure, I would be happy to help you with that!").
- **Diff-First / Chunk Replacements**: Emit targeted replacements with minimal context lines rather than regurgitating entire 500-line files.
- **Dense Rationale**: State the root cause in 1–2 direct sentences followed immediately by the action.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The context window is 1M or 2M tokens, so token count doesn't matter" | Window capacity ≠ effective attention budget. Model reasoning, instruction following, and needle recall drop sharply past 50K-100K tokens. |
| "I should dump all related files so the agent has full context" | Context flooding fragments attention. Agents hallucinate more when overwhelmed with non-critical lines. AST skeletons provide complete interface knowledge at 80% token savings. |
| "Compacting context loses details" | Keeping raw debugging logs and failed trial code provides zero value; preserving the *decision* and *diff* preserves 100% of the value. |
| "Prompt caching happens automatically without careful prompt design" | Caching requires exact prefix byte matches. Moving a timestamp or dynamic variable into the header breaks cache hits for the entire conversation. |

## Red Flags

- File reads loading >500 lines when only one method or interface is referenced
- Multi-thousand-line test or build logs pasted uncompressed into the conversation
- Static rules or architecture documentation placed *after* dynamic chat history
- Agent re-printing entire files to change a single line or import
- Sessions continuing past 60% token capacity without compaction or task checkpoints
- Startup files (`CLAUDE.md`, rules) bloated with historical change notes instead of lean operational conventions

## Verification

Before completing any token-sensitive task, verify:

- [ ] Repository footprint measured: large token consumers identified via `token-optimizer.js measure`
- [ ] Reference files skeletonized: non-edited dependencies pruned to signatures and interfaces
- [ ] Prompt cache verified: static instructions and rules positioned strictly at the prompt prefix
- [ ] Tool outputs compressed: test passes summarized to 1 line; failure logs stripped of noise
- [ ] Long conversations compacted before reaching 60% capacity with decisions saved to disk
- [ ] Changes emitted via targeted diffs or surgical blocks rather than full-file echoes
