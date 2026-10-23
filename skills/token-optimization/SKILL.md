---
name: token-optimization
description: Maximizes LLM token efficiency, prompt compression, and context budget economics. Use when reducing token consumption, compressing codebases or prompts, preventing context rot, maximizing static prompt cache hits, pruning verbose tool logs, generating compact AST skeletons, or optimizing token usage (menghemat token, kurangi token, optimasi token, kompresi prompt).
---

# Token Optimization & Context Compression

## Overview

Stateless coding agents resend conversation history, tool outputs, and loaded files on every interaction turn. Unmanaged context burns hundreds of thousands of tokens within minutes, inflates API bills exponentially, and causes **context rot** — model reasoning degradation that occurs when context exceeds 40–60% capacity.

Token optimization is the disciplined engineering practice of maximizing information density per token. By combining **multi-language AST structural code skeletonization**, **strict prompt cache prefix stratification**, **dynamic tool output filtering**, **MCP/tool JSON slimming**, **multi-turn observation pruning**, and **surgical diff-first generation**, you achieve 70–85% token reduction and over 90% prompt cache hit rates.

## When to Use

- Reducing token consumption and controlling LLM API expenses (menghemat token, efisiensi context)
- Starting or maintaining long multi-turn agent sessions without hitting context limits
- Preparing large codebases or multi-file modules for agent context ingestion
- Experiencing "context rot" (hallucinated APIs, attention drift, contradicting earlier instructions)
- Tool outputs (build logs, test suites, git diffs, JSON payloads) are flooding the conversation with verbose spam
- Aligning system prompts and rules for Anthropic (prompt caching) or Google Gemini (context caching)
- Deciding between whole-file rewrites versus surgical chunk edits

## Process

```
┌────────────────────────────────────────────────────────────────────────┐
│                        6-PILLAR TOKEN ECONOMY                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Multi-Language AST Skeletonization → 70-85% smaller file context    │
│ 2. Prompt Cache Stratification       → 90%+ KV cache hit rate          │
│ 3. Dynamic Tool Output Masking        → Filter passing noise to stubs   │
│ 4. Tool Call & MCP JSON Slimming      → Strip nulls & empty collections │
│ 5. Multi-Turn Observation Pruning     → Replace stale outputs with stubs│
│ 6. Terse Diff-First Generation        → Surgical edits, dense rationale │
└────────────────────────────────────────────────────────────────────────┘
```

### Pillar 1: Multi-Language AST Structural Code Skeletonization

Never dump raw, multi-thousand-line implementation files into prompt context. An agent doing architectural reasoning, dependency tracing, or debugging only needs interfaces, class structures, method signatures, types, and exported contracts.

1. **Skeletonize First**: For all reference files, dependencies, and surrounding modules, strip method/function bodies `{ ... }` while retaining signatures and type definitions.
   - Run the companion optimizer:
     ```bash
     node skills/token-optimization/scripts/token-optimizer.js skeletonize src/services/UserService.ts
     ```
   - Supports: JavaScript, TypeScript, Python, Go, and Rust.
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
- Note platform cache thresholds: Anthropic caches prefixes >= 1,024 tokens; Gemini caches prefixes >= 32,768 tokens.

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

### Pillar 4: Tool Call & MCP Output JSON Slimming

Tool responses often return deeply nested JSON with dozens of null fields, empty arrays, redundant metadata, and giant item lists.

1. **Strip Nulls & Empty Collections**: Remove `null`, `undefined`, `{}`, and `[]`.
2. **Truncate Oversized Item Lists**: If an API or tool returns 100 items, keep the first 5 and emit a token-efficient truncation notice:
   ```bash
   node skills/token-optimization/scripts/token-optimizer.js slim-json tool-response.json
   ```
3. Saves 50–75% of tool-call tokens without losing structural schema.

### Pillar 5: Multi-Turn Observation Pruning & 50% Capacity Horizon

Do not wait until the context window hits 80% or 100%. Research and benchmarks demonstrate that LLM recall and reasoning degrade significantly past **40–60% capacity** ("lost-in-the-middle" attention degradation).

1. **Prune Stale Tool Outputs**: Replace tool outputs older than 3 turns with lightweight execution receipts (e.g., `[Historical tool observation from turn 2 pruned: build succeeded with 0 errors]`).
2. **Measure Footprint**: Audit current context consumption:
   ```bash
   node skills/token-optimization/scripts/token-optimizer.js measure .
   ```
3. **Proactive Checkpointing**: At task boundaries or upon reaching 50% context:
   - Checkpoint current architecture decisions, modified file paths, and pending requirements into a durable markdown artifact (`tasks/session-state.md`).
   - Summarize past diagnostic iterations into one conclusion sentence (e.g. *"Auth issue traced to missing Bearer prefix in header — fixed in src/auth.ts"*).
   - Clear or compact transient history (`/compact` or fresh session restart) using the durable artifact as seed context.

### Pillar 6: Surgical Diff-First Generation & Replacement Token Economics

Output tokens cost 3x to 5x more than input tokens and slow generation speeds.

1. **Surgical Chunk Replacement vs Whole-File Rewriting**:
   - Replacing a 10-line block via `replace_file_content` costs ~50 output tokens.
   - Rewriting an entire 500-line file via `write_to_file` costs ~2,000 output tokens (40x more expensive and 10x slower).
   - **Rule**: If modifying <50 lines in a file >150 lines, ALWAYS use chunk replacement.
2. **Zero Sycophancy**: Ban conversational filler ("Sure, I would be happy to help you with that!").
3. **Dense Rationale**: State the root cause in 1–2 direct sentences followed immediately by the action.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The context window is 1M or 2M tokens, so token count doesn't matter" | Window capacity ≠ effective attention budget. Model reasoning, instruction following, and needle recall drop sharply past 50K-100K tokens. |
| "I should dump all related files so the agent has full context" | Context flooding fragments attention. Agents hallucinate more when overwhelmed with non-critical lines. AST skeletons provide complete interface knowledge at 80% token savings. |
| "Compacting context loses details" | Keeping raw debugging logs and failed trial code provides zero value; preserving the *decision* and *diff* preserves 100% of the value. |
| "Prompt caching happens automatically without careful prompt design" | Caching requires exact prefix byte matches. Moving a timestamp or dynamic variable into the header breaks cache hits for the entire conversation. |
| "Rewriting the whole file is safer than chunk replacement" | Whole-file rewrites waste thousands of expensive output tokens and frequently introduce accidental regressions or drop distant code blocks. |

## Red Flags

- File reads loading >500 lines when only one method or interface is referenced
- Multi-thousand-line test or build logs pasted uncompressed into the conversation
- Tool JSON outputs full of null fields and verbose schemas filling prompt context
- Static rules or architecture documentation placed *after* dynamic chat history
- Agent re-printing entire files to change a single line or import
- Sessions continuing past 60% token capacity without compaction or task checkpoints
- Historical tool observations from 10 turns ago lingering in full length

## Verification

Before completing any token-sensitive task, verify:

- [ ] Repository footprint measured: large token consumers identified via `token-optimizer.js measure`
- [ ] Reference files skeletonized: non-edited dependencies pruned to signatures and interfaces (JS/TS, Python, Go, Rust)
- [ ] Prompt cache verified: static instructions and rules positioned strictly at the prompt prefix
- [ ] Tool outputs compressed: test passes summarized to 1 line; failure logs stripped of noise
- [ ] Tool JSON slimmed: nulls, empty collections, and oversized arrays truncated via `token-optimizer.js slim-json`
- [ ] Stale observations pruned from multi-turn context
- [ ] Changes emitted via targeted diffs or surgical blocks rather than full-file echoes
