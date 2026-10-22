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

3. **Intent to Skill Mapping (Automatic Zero-Command Selection)**:
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

   - **Implementation & Testing**:
     - Incremental implementation / Slices / Kirim perubahan bertahap → `incremental-implementation`
     - Test-Driven Development (TDD) / Red-Green-Refactor / Tulis unit test dulu → `test-driven-development`
     - Frontend UI / Responsive, accessible components / Tailwind / Desain antarmuka → `frontend-ui-engineering`
     - Modern React & Next.js UI / shadcn/ui / Radix primitives → `shadcn-ui-engineering`
     - Laravel & PHP backend / Thin Controller Fat Action / Service-Action architecture → `laravel-service-action-architecture`

   - **Reverse Engineering, Systems & Binary Analysis**:
     - Reverse engineering / Binary triage (ELF, PE, Mach-O) / Static decompilation (Ghidra, IDA) / Dynamic tracing (Frida, GDB) / Protocol reversing / Bongkar file biner atau protokol → `reverse-engineering-and-binary-analysis`
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
     - Security auditing / Hardening / OWASP vulnerabilities / Audit keamanan & sanitasi input untrusted → `security-and-hardening`
     - Performance optimization / Query tuning / Slow bottlenecks / Optimasi kecepatan & memori → `performance-optimization`
     - Observability / Instrumentation / Logging, metrics & distributed tracing → `observability-and-instrumentation`
     - System deprecation / Safe database schema migrations (expand/contract) / Pensiunkan modul lama → `deprecation-and-migration`

   - **Git, Automation, CI/CD & Launch**:
     - Git workflow / Atomic commits / Conflict resolution / Release tagging & changelogs → `git-workflow-and-versioning`
     - Architecture Decision Records (ADRs) & system documentation / Tulis keputusan arsitektur → `documentation-and-adrs`
     - CI/CD automation / Build pipelines & automated quality gates → `ci-cd-and-automation`
     - Deployment / Pre-launch checklist / Staged rollout & shipping / Siap rilis ke produksi → `shipping-and-launch`

   - **AI Agents, Frameworks & Machine Learning**:
     - Persistent agent memory / Habits & instincts / Hindari kesalahan berulang agen → `agent-memory-and-instincts`
     - Context window engineering / Session optimization / Kurangi token waste → `context-engineering`
     - Local codebase indexing / Vector code search / Context retrieval → `codebase-context-indexing`
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

4. **Anti-Rationalization**:
   The following thoughts are violations of the workflow and MUST be rejected:
   - "This task is too small or simple for a skill"
   - "I will just quickly write the code and skip the skill"
   - "I'll do the implementation first and check the skill later"
   
   Always check and consult the skill first.
