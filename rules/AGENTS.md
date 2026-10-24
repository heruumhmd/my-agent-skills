# Agent Skill-First Execution Rules

These rules enforce a skill-first execution model across all conversations and tasks in Antigravity and Gemini.

## Core Rules

1. **Mandatory Skill Check Before Action**:
   - Before executing code changes, debugging, refactoring, planning, or running complex workflows, you MUST identify if an applicable agent skill exists.
   - If a skill applies to the task (even partially), invoke and consult that skill's instructions first before taking implementation actions.
   - Never implement directly if a skill applies.

2. **Strict Workflow Adherence**:
   - Always follow the skill instructions thoroughly; do not partially apply them or bypass established steps.
   - Maintain the exit criteria and verification checks specified in each skill.

3. **Universal Ambient Token Economy (Always Active Across All Tasks)**:
   - Regardless of whether the user explicitly mentions token optimization, the agent MUST automatically apply token-saving discipline on every interaction to prevent context rot:
     - **Targeted Reading**: Never read entire large files without line bounds (`StartLine`/`EndLine`); inspect only relevant symbols and ranges.
     - **Surgical Edits**: Prefer pinpoint search-and-replace edits over rewriting full files.
     - **AST Skeletons for Multi-File Context**: When analyzing architecture across multiple files, maintain structural signatures (classes, functions, types) rather than loading entire implementation bodies into context.
     - **Concise Responses**: Be direct and code-focused; avoid sycophantic conversational filler, AI throat-clearing, and repeating entire code files back to the user.
     - **Output Pruning**: Avoid dumping large raw terminal/tool outputs or unbounded JSON payloads into context.
     - **Zero Quality Degradation**: Token economy MUST NEVER sacrifice code correctness, architectural depth, security, thorough testing, or implementation completeness. Never use lazy stubs (`// TODO`, unwritten bodies), never skip edge cases, and never cut corners on critical logic. Only eliminate noise, repetitive raw data, and conversational filler.

4. **Intent to Skill Mapping (Automatic Zero-Command Selection)**:
   Match user prompts (in English, Indonesian, or mixed) automatically to the appropriate skill without requiring slash commands:

   - **Requirements, Ideation & Clarification**:
     - Starting a task / Unclear requirements / Tanya-jawab requirement → `using-agent-skills` or `interview-me`
     - Ideation / Concept refining / Socratic stress-testing / Ide liar jadi konsep tajam → `idea-refine`
     - Project constraints / Enforce quality bar / CONSTRAINTS.md / Jaga standar mutu → `constraint-driven-development`
     - Grounding in official documentation / Cek dokumentasi resmi sebelum implementasi → `source-driven-development`

   - **Design & Architecture**:
     - Defining a new feature / PRD / Spec-driven design → `spec-driven-development`
     - API & endpoint design / Module boundaries & data contracts / Desain interface & endpoint → `api-and-interface-design`
     - Planning & task breakdown / Pecah task implementasi → `planning-and-task-breakdown`
     - Subagent orchestration / Delegasi worker paralel / Multi-agent research → `subagent-orchestration-and-delegation`
     - Autonomous engineering loop / Obra Superpowers / Git worktree isolation / 2-5 min task slicing / Strict TDD red-green-refactor / Subagent per task → `superpowers-autonomous-engineering`

   - **Implementation & Testing**:
     - Incremental implementation / Slices / Kirim perubahan bertahap → `incremental-implementation`
     - Test-Driven Development (TDD) / Red-Green-Refactor / Tulis unit test dulu → `test-driven-development`
     - Frontend UI / Responsive, accessible components / Tailwind / Desain antarmuka → `frontend-ui-engineering`
     - Anti-slop frontend / Impeccable design / UI taste / Typography polish / Ban Inter font & purple-blue gradients → `impeccable-frontend-design`
     - Modern React & Next.js UI / shadcn/ui / Radix primitives → `shadcn-ui-engineering`
     - Laravel & PHP backend / Thin Controller Fat Action / Service-Action architecture → `laravel-service-action-architecture`

   - **Reverse Engineering, Systems & Binary Analysis**:
     - Reverse engineering / morluto/rea / REA setup / Ghidra & IDA MCP / Binary triage (ELF, PE, Mach-O) / ASAR & Electron / Static decompilation / Dynamic tracing (Frida, GDB) / Protocol reversing / Clean-room feature porting / Bongkar file biner atau protokol → `reverse-engineering-and-binary-analysis`
     - Legacy codebase archeology / Git blame & log archeology / Reality probing / Blast radius mapping / Investigasi kode lama & asal-usul → `code-archeology-and-anti-slop`

   - **Code Review, Quality & Deslopping**:
     - Rigorous structural code review / Eliminate cognitive debt / Code-judo reframing / 1000-line file limit / Review arsitektur mendalam → `thermonuclear-code-review`
     - Multi-axis code review / Pre-merge 5-axis checklist (correctness, security, perf, architecture, readability) → `code-review-and-quality`
     - Deslopping text & code / Purge AI tells, sycophancy, and filler / Bersihkan kata-kata AI slop dari dokumen & kode → `unslop-code-and-prose`
     - Code simplification / Refactoring for clarity / Simplifikasi kode tanpa ubah behavior → `code-simplification`
     - Adversarial interrogation / Doubt assumptions / Cross-examine decisions / Uji keraguan & stress-test keputusan non-sepele → `doubt-driven-development`

   - **Debugging, Reliability & Maintenance**:
     - Root-cause debugging / Bug hunting / Diagnostic recovery / Cari akar masalah & perbaiki error → `debugging-and-error-recovery`
     - Browser testing & DevTools DOM/network/console inspection / Uji web di browser asli → `browser-testing-with-devtools`
     - Browser automation via Rust CDP / Accessibility-tree snapshots (@eN) / Token-efficient scraping & QA / vercel agent-browser → `agent-browser-automation`
     - Security auditing / Hardening / OWASP vulnerabilities / Audit keamanan & sanitasi input untrusted → `security-and-hardening`
     - Performance optimization / Query tuning / Slow bottlenecks / Optimasi kecepatan & memori → `performance-optimization`
     - Observability / Instrumentation / Logging, metrics & distributed tracing → `observability-and-instrumentation`
     - System deprecation / Safe database schema migrations (expand/contract) / Pensiunkan modul lama → `deprecation-and-migration`

   - **Git, Automation, CI/CD & Launch**:
     - Git workflow / Atomic commits / Conflict resolution / Release tagging & changelogs → `git-workflow-and-versioning`
     - Repo workflow / Issue triage / Matt Pocock skills standard / Wayfinder / docs/agents/ / To-spec & to-tickets → `repo-workflow-and-triage`
     - Architecture Decision Records (ADRs) & system documentation / Tulis keputusan arsitektur → `documentation-and-adrs`
     - CI/CD automation / Build pipelines & automated quality gates → `ci-cd-and-automation`
     - Agent skill containerization / OCI Docker / Kubernetes / Microservice REST API (POST /run) / initializ/forge / skrun-dev/skrun / A2A endpoints / Paketkan skill ke kontainer → `agent-runtime-and-containerization`
     - Deployment / Pre-launch checklist / Staged rollout & shipping / Siap rilis ke produksi → `shipping-and-launch`

   - **AI Agents, Frameworks & Machine Learning**:
     - Persistent agent memory / Habits & instincts / Hindari kesalahan berulang agen → `agent-memory-and-instincts`
     - Context window engineering / Session optimization / Startup rules setup → `context-engineering`
     - Agentic harness patterns / Select-Writeback-Compress-Isolate / Memory persistence with mutex lock / Tool schema consolidation / keli-wen harness patterns → `agentic-harness-patterns`
     - Model Context Protocol / MCP server / MCP builder / Stdio & SSE transport / Custom MCP connector / modelcontextprotocol/servers / Buat server MCP atau integrasi tool → `mcp-server-and-tool-integration`
     - Token optimization / Prompt compression / Kurangi penggunaan token / Hemat token / Menghemat token / Optimasi token / Kompresi prompt / Context compression / AST skeletons, prompt caching, repomix --compress & cache optimization → `token-optimization`
     - Local codebase indexing / Vector code search / Context retrieval → `codebase-context-indexing`
     - Codebase knowledge graph / Understand-Anything (.ua/) / AST + semantic graph / Navigasi codebase raksasa (>100k LOC) → `codebase-knowledge-graph`
     - 4-Engine hyper-efficient agent architecture (CodeAct, Actor-Critic, Speculative Drafting) → `hyper-efficient-agent-architecture`
     - PydanticAI / Type-safe structured agents & tool calling → `pydantic-ai-structured-agents`
     - Smolagents / Hugging Face code-first lightweight agents → `smolagents-code-first-agents`
     - LangGraph / Multi-agent state machines & cyclical workflows → `langgraph-stateful-agent-design`
     - Applied ML system design / Model selection & inference pipelines → `applied-ml-system-design`
     - ML data preprocessing / Leakage prevention & feature scaling → `ml-data-preprocessing-and-leakage-prevention`
     - ML model evaluation / Metrics & confusion matrix analysis → `ml-model-evaluation-and-metrics`
     - Neural network training recipe / PyTorch deep learning workflow → `neural-network-training-recipe`
     - UV Python package manager / Fast virtualenvs & script execution → `uv-python-package-manager`
     - Academic LaTeX paper drafting / Journal styling & bibtex debugging → `academic-journal-latex-workflow`

5. **Anti-Rationalization**:
   The following thoughts are violations of the workflow and MUST be rejected:
   - "This task is too small or simple for a skill"
   - "I will just quickly write the code and skip the skill"
   - "I'll do the implementation first and check the skill later"
   
   Always check and consult the skill first.
