# Heru Agent Skills

**Production-grade engineering, research, and ML workflows for AI coding agents.**

Skills encode the workflows, quality gates, and best practices that senior engineers use when building software. This public distribution combines the upstream Agent Skills lifecycle with Heru's research, ML, agent-engineering, and Windows automation extensions.

Maintained by [Muhammad Heru](https://github.com/heruu-1) and derived from [Addy Osmani's Agent Skills](https://github.com/addyosmani/agent-skills) under the MIT license.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## Commands

9 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

| What you're doing | Command | Key principle |
|-------------------|---------|---------------|
| Define what to build | `/spec` | Spec before code |
| Plan how to build it | `/plan` | Small, atomic tasks |
| Build incrementally | `/build` | One slice at a time |
| Prove it works | `/test` | Tests are proof |
| Set the quality bar | `/constraints` | Decide it once, enforce it everywhere |
| Review before merge | `/review` | Improve code health |
| Audit web performance | `/webperf` | Measure before you optimize |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Faster is safer |

In Claude Code these install as plugin commands. Where a built-in command has the same name, as `/review` does, use the namespaced form: `/agent-skills:review`.

Want fewer manual steps once the spec exists? **`/build auto`** generates the plan and implements every task in a single approved pass — you approve the plan once, then it runs autonomously. It removes the human stepping *between* tasks, not the verification: every task is still test-driven and committed individually, and it pauses on failures or risky steps.

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`, and so on.

---

## Quick Start

**Fastest path — any agent, one command.** The open [skills CLI](https://github.com/vercel-labs/skills) installs into 70+ agents (Claude Code, Cursor, Codex, Copilot, Cline, and more):

```bash
npx skills add heruu-1/my-agent-skills            # install all 53 skills
npx skills add heruu-1/my-agent-skills --list     # browse before installing
```

Or grab individual skills:

```bash
npx skills add heruu-1/my-agent-skills --skill code-review-and-quality   # five-axis review before merge
npx skills add heruu-1/my-agent-skills --skill interview-me              # requirements interrogation, one question at a time
npx skills add heruu-1/my-agent-skills --skill test-driven-development   # red-green-refactor, enforced
```

> **Installing one skill?** A per-skill `npx` install copies only
> `skills/<name>/`, not the repo-level `references/` directory. The skill still
> works, but paths to supplementary shared checklists are unavailable. Use a
> whole-repo integration, clone the repository, or copy the needed checklist into
> a `references/` directory inside the installed skill. This portability gap is
> tracked in [#361](https://github.com/addyosmani/agent-skills/issues/361).

Prefer a native integration? Pick your tool below.

<details>
<summary><b>Claude Code (recommended)</b></summary>

**Marketplace install:**

```
/plugin marketplace add heruu-1/my-agent-skills
/plugin install agent-skills@addy-agent-skills
```

> **SSH errors?** The marketplace clones repos via SSH. If you don't have SSH keys set up on GitHub, either [add your SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) or use the full HTTPS URL to force HTTPS cloning during the marketplace-add step:
> ```bash
> /plugin marketplace add https://github.com/heruu-1/my-agent-skills.git
> /plugin install agent-skills@addy-agent-skills
> ```
>
> If `/plugin install` still fails with `git@github.com: Permission denied (publickey)` on Windows or macOS, the recommended workaround is to configure Git once to rewrite GitHub SSH URLs to HTTPS for subprocess clones:
> ```bash
> git config --global url."https://github.com/".insteadOf git@github.com:
> ```

**Local / development:**

```bash
git clone https://github.com/heruu-1/my-agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

</details>

<details>
<summary><b>Cursor</b></summary>

Put workflow skills under `.cursor/skills/` (sync from `agent-skills/skills/`) and short policies in `.cursor/rules/*.mdc` — do not paste full skills into rules. Both directories live in your project; this repo does not ship a `.cursor/` folder. See [docs/cursor-setup.md](docs/cursor-setup.md).

</details>

<details>
<summary><b>Antigravity CLI</b></summary>

Install as a native plugin for skills, subagents, and slash commands. See [docs/antigravity-setup.md](docs/antigravity-setup.md).

**Install from the repo:**

```bash
agy plugin install https://github.com/heruu-1/my-agent-skills.git
```

**Install from a local clone:**

```bash
git clone https://github.com/heruu-1/my-agent-skills.git
agy plugin install ./agent-skills
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

Install as native skills for auto-discovery, or add to `GEMINI.md` for persistent context. See [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md).

**Install from the repo:**

```bash
gemini skills install https://github.com/heruu-1/my-agent-skills.git --path skills
```

**Install from a local clone:**

```bash
gemini skills install ./agent-skills/skills/
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add skill contents to your Windsurf rules configuration. See [docs/windsurf-setup.md](docs/windsurf-setup.md).

</details>

<details>
<summary><b>OpenCode</b></summary>

Copy skills to `.opencode/skills/` (or `~/.config/opencode/skills/`), add a project-local `AGENTS.md`, and use the built-in `skill` tool for agent-driven execution. Optional slash commands can be added under `.opencode/commands/`.

See [docs/opencode-setup.md](docs/opencode-setup.md).

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

Use agent definitions from `agents/` as Copilot personas and skill content in `.github/copilot-instructions.md`. The lifecycle slash commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`) are Claude Code commands and do not appear in Copilot; invoke the skills by name (`/spec-driven-development`, …) instead. See [docs/copilot-setup.md](docs/copilot-setup.md).

</details>

<details>
<summary><b>Kiro IDE & CLI</b></summary>

Skills for Kiro reside under `.kiro/skills/` and can be stored at the Project or Global level. Kiro also supports `AGENTS.md`. See [Kiro skills documentation](https://kiro.dev/docs/skills/).

</details>

<details>
<summary><b>Codex</b></summary>

Install as a native Codex plugin (Codex CLI v0.122+):

```bash
codex plugin marketplace add heruu-1/my-agent-skills
codex plugin add agent-skills@agent-skills
```

The first command registers the marketplace; the second installs the plugin. Codex reads the root `skills/` directory directly through `.codex-plugin/plugin.json`. Once installed, invoke skills in chat using `@` (e.g., `@spec-driven-development`). See [docs/codex-setup.md](docs/codex-setup.md) for local installation and troubleshooting.

</details>

<details>
<summary><b>Command Code</b></summary>

Install natively with the built-in `cmd skills` command. Command Code clones the repo, discovers every `SKILL.md`, and installs into `.commandcode/skills/`:

```bash
cmd skills add heruu-1/my-agent-skills            # pick skills to install (project)
cmd skills add heruu-1/my-agent-skills --global   # install for all projects (~/.commandcode/skills/)
cmd skills add heruu-1/my-agent-skills -s spec-driven-development  # install a specific skill
```

Installed skills show up in the TUI slash menu, e.g. `/spec-driven-development`. See [docs/commandcode-setup.md](docs/commandcode-setup.md).

</details>

<details>
<summary><b>Other Agents</b></summary>

Skills are plain Markdown - they work with any agent that accepts system prompts or instruction files. See [docs/getting-started.md](docs/getting-started.md). Hosts that install the pack but aren't listed above are in [docs/other-hosts.md](docs/other-hosts.md).

</details>



---

## Adoption

Already installed? How you roll the pack out depends on your codebase. The **[Adoption Guide](docs/adoption-guide.md)** covers two paths: the full lifecycle from day one for a greenfield project, or an incremental, verification-first rollout for an established codebase.

---

## All 53 Skills

The commands above are entry points. This distribution includes 53 skills total: 25 upstream lifecycle skills plus 28 Heru extensions for research, ML, reverse engineering, agent architecture, and web tooling. Each skill is a structured workflow with steps, verification gates, and anti-rationalization tables. You can also reference any skill directly.

### Core Development Lifecycle (25 Skills)

#### Meta — Discover which skill applies

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [using-agent-skills](skills/using-agent-skills/SKILL.md) | Maps incoming work to the right skill workflow and defines shared operating rules | Starting a session or deciding which skill applies |

#### Define — Clarify what to build

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [interview-me](skills/interview-me/SKILL.md) | One-question-at-a-time interview extracting underlying user requirements until ~95% confidence | The ask is underspecified, or when you invoke "interview me" / "grill me" |
| [idea-refine](skills/idea-refine/SKILL.md) | Structured divergent/convergent thinking turning vague concepts into concrete proposals | You have a rough idea needing exploration before committing |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | Write a PRD covering objectives, commands, structure, code style, testing, and boundaries | Starting a new project, feature, or significant architecture change |
| [constraint-driven-development](skills/constraint-driven-development/SKILL.md) | Establishes quality bar in CONSTRAINTS.md and prevents agents from lowering standards | Defining quality thresholds or preventing skipped tests and suppressions |

#### Plan — Break it down

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | Decomposes specs into small, verifiable tasks with acceptance criteria and dependency order | You have a spec and need atomic implementable units |

#### Build — Write the code

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | Thin vertical slices — implement, test, verify, commit. Rollback-friendly changes | Any change touching more than one file |
| [test-driven-development](skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), DAMP over DRY, Beyonce Rule | Implementing logic, fixing bugs, or changing runtime behavior |
| [context-engineering](skills/context-engineering/SKILL.md) | Feeds agents the right context at the right time — rules files, context packing, MCP setups | Starting a session, switching tasks, or when agent output drifts |
| [source-driven-development](skills/source-driven-development/SKILL.md) | Grounds every framework decision in official documentation — verify and cite sources | Building with any framework or library where correctness matters |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | Adversarial fresh-context review of every non-trivial decision in-flight | High-stakes decisions (production auth, migrations, irreversible ops) |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | Component architecture, design systems, state management, and WCAG 2.1 AA accessibility | Building or modifying user-facing web interfaces |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, error semantics, and boundary checks | Designing APIs, module boundaries, or public contracts |

#### Verify — Prove it works

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP for live runtime data — DOM inspection, console logs, network traces | Building or debugging anything that runs in a browser |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | Five-step triage: reproduce, localize, reduce, fix, guard. Stop-the-line rule | Tests fail, builds break, or runtime behavior is unexpected |

#### Review — Quality gates before merge

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | Five-axis review, change sizing (~100 lines), severity labels, review speed norms | Before merging any pull request or code change |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduces complexity while preserving exact behavior | Code works but is harder to read, maintain, or extend than needed |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 prevention, auth patterns, secrets management, dependency auditing | Handling user input, auth, data storage, or external integrations |
| [performance-optimization](skills/performance-optimization/SKILL.md) | Measure-first approach — Core Web Vitals targets, profiling workflows, bundle analysis | Performance requirements exist or you suspect regressions |

#### Ship — Deploy with confidence

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, atomic commits, commit-as-save-point pattern | Making any code change (always active) |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, automated quality gate pipelines | Setting up or modifying build and deployment pipelines |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | Code-as-liability mindset, compulsory vs advisory deprecation, safe schema migrations | Removing old systems, migrating users, or sunsetting features |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records (ADRs), API docs, inline documentation standards | Making architectural decisions, changing APIs, or shipping features |
| [observability-and-instrumentation](skills/observability-and-instrumentation/SKILL.md) | Structured logging, RED/USE metrics, OpenTelemetry tracing, symptom-based alerting | Adding telemetry or shipping code that runs in production |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | Pre-launch checklists, feature flag lifecycle, staged rollouts, rollback procedures | Preparing to deploy changes to production |

---

### Heru Extension Skills (28 Skills across 3 Bundles)

#### Agent Architecture & Autonomous Engineering (18 skills · `heru-agent-engineering`)

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [agent-memory-and-instincts](skills/agent-memory-and-instincts/SKILL.md) | Enforces persistent architectural habits, distills lessons, and manages long-term agent memory | Preventing repeated agent mistakes across sessions |
| [agent-runtime-and-containerization](skills/agent-runtime-and-containerization/SKILL.md) | Packages agent skills into hardened OCI containers, Kubernetes jobs, A2A endpoints, and REST APIs (`POST /run`) | Packaging skills for containerized production or MCP gateways |
| [agentic-harness-patterns](skills/agentic-harness-patterns/SKILL.md) | Production agent harness engineering to prevent context rot via Select-Writeback-Compress-Isolate and mutex locks | Designing long-running agent loops or consolidating tool schemas |
| [code-archeology-and-anti-slop](skills/code-archeology-and-anti-slop/SKILL.md) | Deep git history archeology, reality probing, and purging AI ceremonial boilerplate | Investigating unfamiliar legacy code or testing API behavior with probes |
| [codebase-context-indexing](skills/codebase-context-indexing/SKILL.md) | Multi-file codebase indexing, local semantic code search, and pinpoint symbol definition retrieval | Managing large repos or retrieving symbol dependencies for agents |
| [codebase-knowledge-graph](skills/codebase-knowledge-graph/SKILL.md) | Interactive AST and semantic knowledge graphs for massive repositories (>100k LOC) | Querying dependency call-graphs (.ua/) or multi-agent repository mapping |
| [hyper-efficient-agent-architecture](skills/hyper-efficient-agent-architecture/SKILL.md) | 4-Engine hyper-efficient agent architecture: CodeAct, Actor-Critic, LangGraph state machines, speculative drafting | Building high-throughput, low-latency multi-agent systems |
| [langgraph-stateful-agent-design](skills/langgraph-stateful-agent-design/SKILL.md) | Multi-agent state machines, cyclical agent workflows, human-in-the-loop gates, and persistent checkpoints | Implementing complex cyclic graphs or multi-agent orchestration |
| [mcp-server-and-tool-integration](skills/mcp-server-and-tool-integration/SKILL.md) | Builds, tests, and deploys Model Context Protocol (MCP) servers with stdio and SSE transports | Creating custom MCP servers or integrating tools into AI workflows |
| [pydantic-ai-structured-agents](skills/pydantic-ai-structured-agents/SKILL.md) | Production-ready, type-safe AI agents with strict schema validation and structured output models | Building type-safe agents with PydanticAI and dependency injection |
| [repo-workflow-and-triage](skills/repo-workflow-and-triage/SKILL.md) | Standardizes repo workflows, issue triaging, and ticket specification decoupled from skill logic | Onboarding agents to repositories or triaging issues into specs |
| [reverse-engineering-and-binary-analysis](skills/reverse-engineering-and-binary-analysis/SKILL.md) | Static decompilation, dynamic tracing (Frida/GDB), protocol reversing, and firmware unpacking | Disassembling native binaries (ELF/PE/Mach-O) or decompiling bytecodes |
| [smolagents-code-first-agents](skills/smolagents-code-first-agents/SKILL.md) | Ultra-lightweight, code-first AI agents that think in code using Hugging Face smolagents | Implementing lightweight agents that execute code directly |
| [subagent-orchestration-and-delegation](skills/subagent-orchestration-and-delegation/SKILL.md) | Multi-agent orchestration delegating focused tasks (research, security, review) to specialized workers | Orchestrating parallel workers or multi-perspective reviews |
| [superpowers-autonomous-engineering](skills/superpowers-autonomous-engineering/SKILL.md) | Multi-hour autonomous software engineering via git worktree isolation, granular task slicing, and strict TDD | Running autonomous engineering loops that delete unverified code |
| [thermonuclear-code-review](skills/thermonuclear-code-review/SKILL.md) | Uncompromising structural critique, code-judo reframing, and 1000-line boundary enforcement | Reviewing complex PRs to delete architectural bloat and cognitive debt |
| [token-optimization](skills/token-optimization/SKILL.md) | 5-pillar token economy: AST structural code skeletonization, KV cache prefix stratification, log filtering, compaction | Minimizing token costs, compressing prompts/code, preventing context rot |
| [unslop-code-and-prose](skills/unslop-code-and-prose/SKILL.md) | Eliminates AI writing tells, chatbot idioms, sycophancy, and filler from docs and code | Editing PR descriptions, documentation, ADRs, commit logs, or comments |

#### Research & Machine Learning (5 skills · `heru-research-ml`)

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [academic-journal-latex-workflow](skills/academic-journal-latex-workflow/SKILL.md) | Professional LaTeX drafting, structuring, formatting, and BibTeX debugging for academic journals | Writing papers to IEEE, ACM, Springer, Elsevier, or Scopus standards |
| [applied-ml-system-design](skills/applied-ml-system-design/SKILL.md) | ML system architecture, model selection (heuristics vs ML vs LLM), and production inference pipelines | Designing end-to-end ML architectures and real-time inference systems |
| [ml-data-preprocessing-and-leakage-prevention](skills/ml-data-preprocessing-and-leakage-prevention/SKILL.md) | Rigorous data preparation, missing value strategies, feature scaling, and strict train-test leakage prevention | Preparing datasets or verifying data pipeline splits before training |
| [ml-model-evaluation-and-metrics](skills/ml-model-evaluation-and-metrics/SKILL.md) | Multi-metric model evaluation, confusion matrix diagnostics, ROC/PR curves, and error analysis | Benchmarking models, tuning classification thresholds, or validating metrics |
| [neural-network-training-recipe](skills/neural-network-training-recipe/SKILL.md) | Karpathy training recipe: loss baselines, overfitting single batches, learning rate schedules, PyTorch optimization | Developing, debugging, and training deep learning neural networks |

#### Modern Web, Frontend & Infrastructure (5 skills · `heru-web-tooling`)

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [agent-browser-automation](skills/agent-browser-automation/SKILL.md) | Browser automation using native Rust CDP clients and accessibility-tree snapshots (`@eN` references) | Token-efficient web scraping, form submission, and browser QA |
| [impeccable-frontend-design](skills/impeccable-frontend-design/SKILL.md) | Purges generic AI frontend patterns; enforces bespoke typography, deliberate palettes, and visual hierarchy | Polishing web UI, banning default Inter fonts & purple-blue gradients |
| [laravel-service-action-architecture](skills/laravel-service-action-architecture/SKILL.md) | Production Laravel & PHP backend patterns: Thin Controllers, Fat Actions, and Service-Action architecture | Structuring maintainable, decoupled business logic in Laravel apps |
| [shadcn-ui-engineering](skills/shadcn-ui-engineering/SKILL.md) | Production-ready React & Next.js frontend engineering using Radix UI primitives and shadcn/ui components | Building accessible, composable component systems in TailwindCSS |
| [uv-python-package-manager](skills/uv-python-package-manager/SKILL.md) | High-speed Python package and virtualenv management using Astral `uv` | Configuring fast virtualenvs, running standalone scripts, or locking dependencies |

---

## Heru Extension Bundles

For modular deployments, the 28 Heru extension skills are packaged into three independently buildable bundles:

| Bundle | Focus Area | Skills Count |
|--------|------------|--------------|
| `heru-agent-engineering` | Agent architecture, memory, context, code archeology, reverse engineering, and orchestration | 18 skills |
| `heru-research-ml` | Academic LaTeX writing, ML system design, data leakage prevention, evaluation, and PyTorch training | 5 skills |
| `heru-web-tooling` | Laravel Service-Action architecture, modern React/shadcn UI, browser automation, and `uv` package management | 5 skills |

Build any bundle into a clean standalone distribution:

```bash
node scripts/build-bundle.js --bundle heru-research-ml --out ./dist/heru-research-ml
```

---

## Agent Personas

Pre-configured specialist personas for targeted reviews and specialized engineering tasks:

| Agent | Role | Perspective |
|-------|------|-------------|
| [academic-paper-writer](agents/academic-paper-writer.md) | Academic LaTeX Specialist | Drafting, structuring, and formatting journal and conference papers to IEEE/ACM/Springer/Elsevier standards |
| [code-reviewer](agents/code-reviewer.md) | Senior Staff Engineer | Five-axis code review with "would a staff engineer approve this?" standard |
| [ml-research-engineer](agents/ml-research-engineer.md) | Senior ML Engineer | Dataset audits, leakage inspection, neural network training verification, and metric evaluation |
| [security-auditor](agents/security-auditor.md) | Security Engineer | Vulnerability detection, threat modeling, OWASP assessment, and security-focused review |
| [test-engineer](agents/test-engineer.md) | QA Specialist | Test strategy, coverage analysis, and the Prove-It pattern |
| [web-performance-auditor](agents/web-performance-auditor.md) | Web Performance Engineer | Core Web Vitals audit with Quick/Deep modes and a metric-honesty rule; run it via `/webperf` |

See [docs/agents.md](docs/agents.md) for the decision matrix, orchestration rules, and how personas compose with skills and slash commands.

---

## Reference Checklists

Quick-reference material that skills pull in when needed:

| Reference | Covers |
|-----------|--------|
| [definition-of-done.md](references/definition-of-done.md) | Project-wide standing bar every change clears, contrasted with per-task acceptance criteria |
| [testing-patterns.md](references/testing-patterns.md) | Test structure, naming, mocking, React/API/E2E examples, anti-patterns (JavaScript/TypeScript) |
| [security-checklist.md](references/security-checklist.md) | Pre-commit checks, auth, input validation, headers, CORS, OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals targets, frontend/backend checklists, measurement commands |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Keyboard nav, screen readers, visual design, ARIA, testing tools |
| [observability-checklist.md](references/observability-checklist.md) | On-call questions, structured logging, RED/USE metrics, tracing, symptom-based alerting, pre-launch gate |
| [orchestration-patterns.md](references/orchestration-patterns.md) | Endorsed multi-persona orchestration patterns, anti-patterns, and the "personas don't invoke personas" rule |

---

## How Skills Work

Every skill follows a consistent anatomy:

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**Key design choices:**

- **Process, not prose.** Skills are workflows agents follow, not reference docs they read. Each has steps, checkpoints, and exit criteria.
- **Anti-rationalization.** Every skill includes a table of common excuses agents use to skip steps (e.g., "I'll add tests later") with documented counter-arguments.
- **Verification is non-negotiable.** Every skill ends with evidence requirements - tests passing, build output, runtime data. "Seems right" is never sufficient.
- **Progressive disclosure.** The `SKILL.md` is the entry point. Supporting references load only when needed, keeping token usage minimal.

---

## Project Structure

```
agent-skills/
├── skills/                            # 53 skills (25 upstream + 28 Heru extensions)
│   ├── interview-me/                  #   Define
│   ├── idea-refine/                   #   Define
│   ├── spec-driven-development/       #   Define
│   ├── constraint-driven-development/ #   Define
│   ├── planning-and-task-breakdown/   #   Plan
│   ├── incremental-implementation/    #   Build
│   ├── context-engineering/           #   Build
│   ├── source-driven-development/     #   Build
│   ├── doubt-driven-development/      #   Build
│   ├── frontend-ui-engineering/       #   Build
│   ├── test-driven-development/       #   Build
│   ├── api-and-interface-design/      #   Build
│   ├── browser-testing-with-devtools/ #   Verify
│   ├── debugging-and-error-recovery/  #   Verify
│   ├── code-review-and-quality/       #   Review
│   ├── code-simplification/           #   Review
│   ├── security-and-hardening/        #   Review
│   ├── performance-optimization/      #   Review
│   ├── git-workflow-and-versioning/   #   Ship
│   ├── ci-cd-and-automation/          #   Ship
│   ├── deprecation-and-migration/     #   Ship
│   ├── documentation-and-adrs/        #   Ship
│   ├── observability-and-instrumentation/ # Ship
│   ├── shipping-and-launch/           #   Ship
│   ├── using-agent-skills/            #   Meta: how to use this pack
│   └── ...                            #   28 Heru extensions across 3 bundles
├── agents/                            # 6 specialist personas
├── bundles/                           # 3 buildable Heru extension bundles
├── references/                        # 7 supplementary checklists
├── hooks/                             # Session lifecycle hooks
├── .claude/commands/                  # 9 slash commands (Claude Code)
├── .gemini/commands/                  # 9 slash commands (Gemini CLI)
├── commands/                          # 9 slash commands (Antigravity CLI)
├── plugin.json                        # Antigravity plugin manifest
└── docs/                              # Setup guides per tool
```

---

## Why Agent Skills?

AI coding agents default to the shortest path - which often means skipping specs, tests, security reviews, and the practices that make software reliable. Agent Skills gives agents structured workflows that enforce the same discipline senior engineers bring to production code.

Each skill encodes hard-won engineering judgment: *when* to write a spec, *what* to test, *how* to review, and *when* to ship. These aren't generic prompts - they're the kind of opinionated, process-driven workflows that separate production-quality work from prototype-quality work.

Skills bake in best practices from Google's engineering culture — including concepts from [Software Engineering at Google](https://abseil.io/resources/swe-book) and Google's [engineering practices guide](https://google.github.io/eng-practices/). You'll find Hyrum's Law in API design, the Beyonce Rule and test pyramid in testing, change sizing and review speed norms in code review, Chesterton's Fence in simplification, trunk-based development in git workflow, Shift Left and feature flags in CI/CD, and a dedicated deprecation skill treating code as a liability. These aren't abstract principles — they're embedded directly into the step-by-step workflows agents follow.

---

## How it compares

Wondering how this stacks up against [Superpowers](https://github.com/obra/superpowers) or [Matt Pocock's skills](https://github.com/mattpocock/skills)? See **[docs/comparison.md](docs/comparison.md)** for an honest, side-by-side look at how the three are shaped differently and when to reach for each — including a link to a controlled [head-to-head experiment](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/).

---

## Contributing

Skills should be **specific** (actionable steps, not vague advice), **verifiable** (clear exit criteria with evidence requirements), **battle-tested** (based on real workflows), and **minimal** (only what's needed to guide the agent).

See [docs/skill-anatomy.md](docs/skill-anatomy.md) for the format specification, [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and [docs/advanced-per-agent-configuration.md](docs/advanced-per-agent-configuration.md) for applying model routing, tool restrictions, and other per-agent runtime controls without breaking the portable `SKILL.md` frontmatter.

---

## Repository governance

`main` is designed to require the Linux and Windows CI checks. Preview the protection payload with:

```powershell
.\configure-github-protection.ps1 -WhatIf
```

After authenticating GitHub CLI with repository administration access, apply it with `.\configure-github-protection.ps1`.

---

## Maintainer and upstream contributors

agent-skills is built and maintained by:

| | Name | GitHub | Role |
|---|------|--------|------|
| <img src="https://github.com/heruu-1.png?size=120" width="60" height="60" alt="Muhammad Heru"> | **Muhammad Heru** | [@heruu-1](https://github.com/heruu-1) | Distribution maintainer |
| <img src="https://github.com/addyosmani.png?size=120" width="60" height="60" alt="Addy Osmani"> | **Addy Osmani** | [@addyosmani](https://github.com/addyosmani) | Creator |
| <img src="https://github.com/federicobartoli.png?size=120" width="60" height="60" alt="Federico Bartoli"> | **Federico Bartoli** | [@federicobartoli](https://github.com/federicobartoli) | Collaborator |
| <img src="https://github.com/nucliweb.png?size=120" width="60" height="60" alt="Joan León"> | **Joan León** | [@nucliweb](https://github.com/nucliweb) | Collaborator |

---

## License

MIT - use these skills in your projects, teams, and tools.
