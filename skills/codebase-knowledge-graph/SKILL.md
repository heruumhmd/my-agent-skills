---
name: codebase-knowledge-graph
description: Constructs and navigates interactive AST and semantic knowledge graphs for massive repositories (>100k LOC). Use when exploring unfamiliar legacy codebases, querying dependency call-graphs (.ua/), running multi-subagent codebase mapping pipelines, or making targeted changes without loading entire repositories into LLM context.
---

# Codebase Knowledge Graph

## Overview

Loading massive repositories (>100,000 lines of code) into LLM context windows is impossible or prohibitively expensive, leading to catastrophic context dilution and hallucinations. Traditional lexical search (grep) yields false positives and misses deep indirect dependencies.

Inspired by `Egonex-AI/Understand-Anything`, this skill builds and queries an interactive codebase knowledge graph stored locally (in `.ua/` or `.agents/graph/`). By decoupling deterministic structural extraction (via AST parsers like Tree-sitter) from semantic intent mapping (via parallel specialized subagents), agents query exact call hierarchies, data flows, and module contracts without reading whole files.

## When to Use

- Onboarding onto or refactoring legacy monoliths with >100k lines of code
- Tracing multi-hop dependency chains (e.g. caller -> controller -> service -> repository -> database model)
- Assessing the blast radius of a proposed public API or schema change
- Querying codebase relationships via structured graphs instead of broad text searches
- Maintaining an up-to-date repository map with automated post-commit hooks

**When NOT to use:**
- Small single-module repositories (<30 files) — use standard file search or `codebase-context-indexing`
- Local single-function logic debugging — use `debugging-and-error-recovery`
- General documentation writing — use `documentation-and-adrs`

## Process

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KNOWLEDGE GRAPH EXTRACTION PIPELINE                  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. AST Parser Pass     → Extract symbols, types, imports & call sites  │
│ 2. Subagent Pipeline   → 5-7 parallel workers annotate semantics       │
│ 3. Graph Assembly      → Persist node/edge index into .ua/graph.json   │
│ 4. Deterministic Query → Query callers, callees, dataflow & contracts  │
│ 5. Incremental Hook    → Re-index changed files via post-commit hook   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Structural AST Extraction

Parse the codebase deterministically using Tree-sitter or language-specific AST engines:
- **Nodes**: Modules, classes, interfaces, functions, variables, and database models.
- **Structural Edits**: Imports, function invocations, type references, inheritance trees.
- Store source coordinates (`file_path:start_line:end_line`) with each node.

### 2. Parallel Multi-Subagent Annotation Pipeline

Deploy 5–7 specialized subagents operating in parallel on distinct modules:
- **Agent 1 (Structural Boundary Mapper)**: Resolves internal cross-package import paths and module namespaces.
- **Agent 2 (Data Flow & Mutation Tracer)**: Maps variable mutations, pipeline stages, and database writes.
- **Agent 3 (API Contract Resolver)**: Maps external HTTP, gRPC, and message queue entry points to internal handlers.
- **Agent 4 (Semantic Business Intent)**: Summarizes domain purpose for core modules in 1–2 dense sentences.
- **Agent 5 (Test & Invariant Linker)**: Maps unit and integration test fixtures to the business code they exercise.

### 3. Graph Assembly and Storage (`.ua/`)

Assemble the extracted nodes and edges into an indexed graph format:

```json
{
  "version": 1,
  "nodes": {
    "auth.verifyToken": {
      "kind": "function",
      "file": "src/auth/jwt.ts",
      "lines": [42, 68],
      "signature": "verifyToken(token: string): Promise<Claims>",
      "summary": "Validates RSA-signed JWT and decodes claims."
    }
  },
  "edges": [
    {
      "from": "api.handleRequest",
      "to": "auth.verifyToken",
      "type": "calls"
    }
  ]
}
```

### 4. Querying the Knowledge Graph

Instead of reading files into context, query the local graph index:

```bash
# Query upstream callers of a function
ua-graph query --callers "auth.verifyToken"

# Query downstream dependencies of an endpoint
ua-graph query --callees "api.handleRequest"

# Trace blast radius for modifying an interface
ua-graph blast-radius "models.UserRecord"
```

The agent loads only the precise 10–20 lines containing the exact node definition.

### 5. Automated Incremental Synchronization

Configure a post-commit hook or file watcher to update the graph incrementally:
- Parse only files modified in the latest commit (`git diff --name-only HEAD~1`).
- Prune deleted nodes and re-link modified edges without rebuilding the entire graph.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can understand the codebase faster by grepping and opening 15 files." | Grepping misses transitive dependencies and blows token limits. Graph queries return the exact call tree in milliseconds with zero noise. |
| "A knowledge graph is too heavy for small edits." | For large repos (>100k LOC), querying an existing graph costs ~200 tokens versus 50k+ tokens for raw reads. |
| "AST parsing alone is sufficient without semantic annotation." | AST reveals syntax edges but misses business context and runtime intent. The hybrid AST + LLM pipeline provides complete comprehension. |

## Red Flags

- Reading entire multi-thousand-line legacy source files when only call hierarchy is needed
- Modifying a shared model or interface without inspecting its incoming graph edges (callers)
- Rebuilding the entire repository graph from scratch for single-line changes
- Querying broad keyword text searches across directories when graph symbol queries exist

## Verification

Before finishing a large codebase analysis or refactoring task, verify:

- [ ] Repository graph or symbol index (`.ua/` or `.agents/graph/`) was consulted
- [ ] Direct callers and indirect downstream callees were mapped
- [ ] Blast radius was calculated for all touched public interfaces
- [ ] Active read context stayed under surgical line bounds (<300 lines)
- [ ] Incremental index updates were triggered for touched modules
