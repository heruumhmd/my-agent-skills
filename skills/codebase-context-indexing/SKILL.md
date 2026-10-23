---
name: codebase-context-indexing
description: Use when managing large codebases, indexing multi-file repositories, building local semantic code indexes, or retrieving pinpoint symbol definitions and dependencies for AI agents.
---

# Codebase Context Indexing & Semantic Retrieval

## Overview

Dumping entire repositories or massive directories into LLM context wastes tens of thousands of tokens and causes attention dispersion. Codebase context indexing creates structural, symbol, and semantic indexes of the codebase so agents retrieve only the exact functions, classes, and call-graphs needed for the task.

Pair this skill with `skills/token-optimization/SKILL.md` for AST skeletonization, prompt caching, and log filtering.

## When to Use

- Navigating large or unfamiliar multi-file repositories (>50 files)
- Finding where specific domain logic, interfaces, or models are implemented
- Constructing symbol dependency graphs (callers, callees, exported interfaces)
- Setting up local vector or symbol search indexes (e.g. SQLite FTS5, Milvus, Chroma)
- Locating pinpoint snippets without reading multi-thousand-line source files

## Process

```
┌────────────────────────────────────────────────────────────────────────┐
│                     2-TIER CODEBASE RETRIEVAL                          │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Semantic / Symbol Lookup   → Identify top 3-5 symbol matches   │
│ Tier 2: Targeted AST Extraction    → Load signatures & caller context  │
│ Tier 3: Surgical Line Range View   → Read only exact lines to modify   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Structural Chunking (AST Parsing)
- Never split code by arbitrary token or line counts. Arbitrary splits break function boundaries and syntax trees.
- Chunk strictly along AST nodes: classes, methods, top-level functions, interface blocks, and type declarations.
- Retain parent namespace metadata on each chunk (e.g. `module: auth -> class: TokenManager -> method: verifyToken`).

### 2. Tier 1: Dense / Semantic & Symbol Search
- Query the index for concepts, symbol names, or intent keywords rather than scanning file by file.
- Match user intent against the index to locate the candidate files and symbol coordinates (`file.ts:L45-L80`).
- If no dedicated vector database exists, use targeted symbol grep (`grep_search` / `find_by_name`) to establish candidate file anchors.

### 3. Tier 2: Dependency Expansion (Call-Graph Navigation)
- Read the matched symbol's immediate contract (arguments, return types, thrown errors).
- Trace direct callers and callees using `grep_search` for the symbol name across imports.
- Do not read entire caller files; use `token-optimizer.js skeletonize` to view the caller's structural shape at 80% token savings.

### 4. Tier 3: Surgical File Viewing
- Open only the precise lines required for implementation using slice boundaries (`StartLine` / `EndLine`).
- Restrict active read context to <300 lines total across the turn.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I need to read the whole file to understand the context" | Interfaces and method signatures provide 90% of architectural context. Implementation bodies of unrelated methods add cognitive debt and token burn. |
| "Grep is enough, no indexing strategy is required" | Unstructured grep returns hundreds of matches across tests, fixtures, and comments. AST and symbol boundaries filter out 95% of noise. |
| "Line-based chunking is fine for embeddings" | Splitting a function mid-body destroys embedding semantics and yields broken code retrieval. Always chunk by AST node. |

## Red Flags

- Reading more than 500 lines of source code in a single exploration turn
- Loading full files when only verifying a type signature or import path
- Chunking code using naive character/token sliding windows instead of AST nodes
- Forgetting to exclude `dist`, `build`, `node_modules`, or binary assets from index searches

## Verification

Before executing edits based on indexed retrieval:

- [ ] Candidate symbols identified via targeted search before opening source files
- [ ] Surrounding dependencies inspected via AST skeletons or signatures rather than full file dumps
- [ ] Target file read using bounded line ranges covering only the relevant implementation
- [ ] Context window usage remains lean (<30% occupied by exploratory reference code)
