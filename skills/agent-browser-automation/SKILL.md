---
name: agent-browser-automation
description: Automates browser workflows using native Rust CDP clients and accessibility-tree snapshots. Use when scraping dynamic web pages, filling forms, running automated browser QA tests, or driving web sessions with compact @eN element references without raw DOM or screenshot token overhead.
---

# Agent Browser Automation

## Overview

Traditional AI browser automation dumps raw DOM trees, sprawling HTML snapshots, or full-viewport screenshots into LLM context. This exhausts token budgets within a few turns, pollutes context with unneeded layout styling, and degrades reasoning accuracy.

Based on `vercel-labs/agent-browser` architecture, this skill connects directly to Chrome/Chromium via Chrome DevTools Protocol (CDP) using a lightweight Rust native CLI. Instead of raw HTML, it generates compact **accessibility-tree snapshots** where every interactive node is mapped to a concise reference handle (`@e1`, `@e2`, ...). This yields a 75–90% reduction in context token consumption while providing deterministic execution for scraping, form interactions, and end-to-end QA validation.

## When to Use

- Interacting with dynamic single-page applications (React, Vue, Next.js, Svelte) requiring real rendering
- Performing automated end-to-end (E2E) smoke testing and user flow validation
- Submitting multi-step forms, testing authentication flows, or testing interactive web applications
- Extracting clean structured data from web pages without scraping massive HTML source
- Executing browser tasks with tight context token budgets

**When NOT to use:**
- Static public web pages where text extraction without JavaScript suffices — use standard HTTP fetch
- Deep browser performance profiling, memory leak tracking, or network waterfall inspection — use `browser-testing-with-devtools`
- Backend API testing that does not involve browser UI — use `api-and-interface-design` or `test-driven-development`

## Process

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CDP ACCESSIBILITY-TREE PIPELINE                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Launch & Connect    → Chrome CDP session (headless / debug port)    │
│ 2. Snapshot Tree       → Compact accessibility-tree with @eN handles   │
│ 3. Target & Act        → Dispatch click / fill / press using @eN ref   │
│ 4. Verify State Delta  → Inspect resulting URL, DOM delta, or console │
│ 5. Clean Close         → Terminate process & detach CDP gracefully     │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Launch and Session Initialization

Initialize the browser session using the native CDP client:

```bash
# Launch a headless Chrome instance with remote debugging port enabled
agent-browser launch --headless --port 9222

# Navigate to target endpoint
agent-browser open "https://app.example.com/login"
```

### 2. Capture Compact Accessibility-Tree Snapshot

Never request the full document HTML or send raw full-page screenshots to the agent. Capture the semantic accessibility tree:

```bash
# Extract interactive element hierarchy with deterministic @eN identifiers
agent-browser snapshot --interactive-only
```

Sample snapshot payload:
```
[root] document "Example Dashboard"
  [header] banner
    [@e1] button "Navigation Menu"
  [main] main
    [@e2] input[type="email"] "Email Address"
    [@e3] input[type="password"] "Password"
    [@e4] button[type="submit"] "Sign In"
  [footer] contentinfo
    [@e5] link "Forgot Password?"
```

Notice the high signal-to-noise ratio: zero CSS classes, zero inline SVG paths, zero script tags. Only actionable elements with unambiguous `@eN` references.

### 3. Targeted Action Dispatch

Dispatch actions directly against the concise `@eN` references:

```bash
# Populate inputs
agent-browser fill @e2 "testuser@example.com"
agent-browser fill @e3 "Secr3tPassword!2026"

# Submit form
agent-browser click @e4

# Wait for navigation or specific target element
agent-browser wait-for @e6 --timeout 5000
```

### 4. Deterministic State Verification

Verify that the expected action succeeded by inspecting the accessibility tree delta or target element state:

```bash
# Verify post-action accessibility tree
agent-browser snapshot --query "Welcome, testuser"

# Capture targeted screenshot only if visual verification is strictly necessary
agent-browser screenshot --element @e6 --out verification.png
```

### 5. Session Teardown

Always terminate browser sessions cleanly to prevent orphaned background Chrome processes:

```bash
agent-browser close
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Sending full HTML gives the LLM complete visibility." | Full HTML contains thousands of lines of Tailwind/CSS classes, SVGs, and scripts that eat 40k+ tokens and trigger attention rot. Accessibility trees contain 100% of the semantic intent at <2k tokens. |
| "I should send full-viewport screenshots on every turn." | Screenshots consume multimodal token quotas rapidly and lack deterministic selector coordinates. Accessibility trees provide exact node references with zero vision drift. |
| "I don't need to close the browser session between runs." | Leaving CDP sessions running leaks memory, exhausts ports, and causes lock contention in subsequent automation runs. |

## Red Flags

- Reading `document.documentElement.outerHTML` into LLM conversation context
- Requesting full screenshots when an accessibility tree snapshot confirms element presence
- Hardcoding fragile XPath or nested CSS selectors instead of stable `@eN` semantic handles
- Failing to handle page load or navigation delays before querying elements
- Leaving background Chrome or headless Chromium instances lingering after task completion

## Verification

Before marking a browser automation task complete, verify:

- [ ] Browser session launched and attached via CDP successfully
- [ ] Accessibility tree snapshot was utilized instead of raw HTML dump
- [ ] Target elements were addressed via semantic `@eN` handles
- [ ] Post-action state (URL, DOM change, or accessibility node) was verified
- [ ] Browser session closed cleanly without leaving orphaned processes
