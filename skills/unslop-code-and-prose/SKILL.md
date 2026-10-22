---
name: unslop-code-and-prose
description: Removes artificial AI writing tells, chatbot idioms, sycophancy, and filler from technical writing and code comments. Use when editing pull request descriptions, documentation, ADRs, commit messages, or code docstrings to eliminate AI cliches, passive fluff, superficial ing phrases, and empty abstract metaphors in favor of concrete mechanisms and direct active prose.
---

# Unslop Code and Prose

## Overview

A strict editorial deslopping workflow for software engineering writing. Modern LLM-assisted development frequently generates telltale prose filler: sycophantic praise, abstract metaphors, forced triads, superficial participle clauses, and decorative commentary that obscures technical substance. This skill inspects and strips AI writing patterns from technical specifications, architecture decision records (ADRs), pull request summaries, commit logs, and code comments, replacing fluff with concrete numbers, explicit invariants, and plain active voice.

## When to Use

- Polishing pull request descriptions, commit messages, or release notes before team review
- Editing architecture decision records (ADRs), system designs, RFCs, or technical specifications
- Cleaning up code comments and docstrings that merely restate what the code already expresses
- Purging chatbot artifacts ("Certainly!", "I hope this helps!", "Great question!") from engineering documents
- Replacing abstract marketing metaphors ("synergistic flywheel", "foundational tapestry") with technical reality

**When NOT to use:**

- Architectural simplification of runtime source code logic — use `code-simplification` or `thermonuclear-code-review`
- Brainstorming or clarifying user requirements through an interactive interview — use `interview-me`
- Initial drafting of academic journal papers in LaTeX — use `academic-journal-latex-workflow`

## The Anti-Slop Taxonomy

Review every paragraph and comment against the five core slop categories:

```
[Category 1: Vocabulary & Cliché Blacklist]
       │ "crucial", "delve", "testament", "tapestry", "landscape", "pivotal"
       ▼
[Category 2: Structural & Rhetorical Tells]
       │ superficial -ing phrases, forced rule of three, false ranges, em-dash floods
       ▼
[Category 3: Tone & Chatbot Artifacts]
       │ sycophancy, conversational pleasantries, generic conclusions
       ▼
[Category 4: Jargon & Empty Metaphors]
       │ "substrate", "nexus", "locus", "bedrock", "flywheel", "north star"
       ▼
[Category 5: Code Comment Invariants]
       │ delete comments that restate code; keep only non-obvious invariants
```

### 1. Vocabulary Blacklist

AI models gravitate toward a recognizable palette of decorative adjectives and verbs. Strip and replace them:

| AI Vocabulary Tell | Replace With | Example Fix |
|---|---|---|
| `delve` / `delve into` | `examine`, `inspect`, `analyze` | "Let's delve into the logs" → "We inspected the error logs" |
| `crucial` / `pivotal` | `essential`, or state the concrete risk | "A crucial step" → "Required to prevent data loss" |
| `testament to` | `demonstrates`, `proves`, `shows` | "A testament to performance" → "Benchmark proved 4x throughput" |
| `tapestry` / `landscape` | Name the actual architecture | "In today's cloud landscape" → "In Kubernetes clusters" |
| `foster` / `enhance` | `improve`, `accelerate`, `enable` | "To foster developer efficiency" → "To speed up local builds" |
| `stands as` / `boasts` | `is`, `has` | "The service boasts zero downtime" → "The service had zero downtime" |
| `seamlessly` / `effortlessly` | Delete, or provide measured latency | "Seamlessly transitions" → "Transitions within 50ms" |

### 2. Structural Patterns to Strip

- **Superficial `-ing` Participle Tails:**
  Clauses like "..., ensuring optimal resource allocation", "..., highlighting the need for caution", or "..., fostering better collaboration" append artificial gravitas. Delete the tail or state the verifiable mechanism.
- **Forced Rule of Three:**
  Do not shoehorn lists into triplets. If there are two items, state two. If there are four, state four.
- **False Ranges:**
  Phrases like "from simple scripts to complex enterprise architectures" combine non-scalar categories for rhetorical flourish. Replace with the explicit list.
- **Em-Dash Overuse:**
  Avoid em-dash (`—`) chains that interrupt thought progression. Use standard periods or commas to enforce concise sentences.
- **Faux Contrast:**
  "Not only X, but also Y" slows reading. State the primary point directly.

### 3. Jargon and Empty Metaphors

Purge abstract corporate metaphors:

- `bedrock` / `substrate` → base, foundation, underlying system
- `nexus` / `locus` → center, connection point, module
- `flywheel` / `north star` → operational cycle, primary goal
- `ratchet` (when used metaphorically) → monotonic threshold, strict upper bound

### 4. Code Comment and Docstring Deslopping

Code comments must explain **why** and **what invariants hold**, never **what the next line does**:

```typescript
// ✗ SLOP COMMENT (Restating code line):
// This function gets the user by ID and returns the user object
function getUser(id: string): User { ... }

// ✗ SLOP COMMENT (Decorative AI narration):
// Crucial helper ensuring the data is seamlessly sanitized and valid
function cleanInput(str: string): string { ... }

// ✓ CLEAN & RIGOROUS (Invariant & hardware/protocol context):
// Strips trailing null bytes mandated by the legacy hardware firmware (v1.2).
// Max length is constrained to 32 bytes to fit the CAN bus packet payload.
function cleanInput(str: string): string { ... }
```

### 5. Plain Technical Truth (Say What It Does)

Instead of expressing how the technology *feels*, write what the technology *does*:

- **Feeling (Reject):** "Provides intuitive, lightning-fast database interactions that developers will love."
- **Mechanism (Enforce):** "Wraps PostgreSQL queries in prepared statements with typed return schemas, reducing p95 query latency to 8ms."

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The text sounds more professional and polished with these adjectives." | Polished technical writing values precision, density, and clarity. Fluffy adjectives signal an absence of concrete facts. |
| "Comments explaining what each line does help junior developers." | Redundant comments add visual noise and rot the moment code changes. Junior developers learn faster from clear variable names and typed contracts. |
| "A friendly, conversational chatbot tone makes the documentation inviting." | Engineering documents are reference tools, not conversational partners. Readers want facts, commands, and schemas without pleasantries. |
| "Using em-dashes makes the sentence flow naturally." | Frequent em-dashes fragment sentences and distract from the core assertion. Split into two crisp sentences instead. |

## Red Flags

- Pull request descriptions opening with "In this PR, we delve into..." or "This PR serves as a pivotal improvement..."
- ADRs or design proposals containing conversational filler ("I hope this addresses your feedback!")
- Functions annotated with multi-paragraph docstrings that repeat the function's name in five different synonyms
- Technical documents containing decorative emojis in section headings or bullet lists
- Passive voice constructions ("it was observed that the bug was triggered by...") hiding who or what executed the action

## Verification

Before finalizing deslopped text or documentation:

- [ ] Every occurrence of blacklisted terms (`delve`, `crucial`, `testament`, `tapestry`, `landscape`, `foster`) has been eliminated
- [ ] Chatbot pleasantries and conversational openings/closings have been removed
- [ ] Superficial `-ing` tails have been pruned or replaced with concrete mechanisms
- [ ] All code comments document non-obvious invariants, constraints, or bug workarounds rather than restating the code
- [ ] Descriptive claims are backed by numbers, measurements, or explicit facts rather than emotional qualifiers
