# Agent Skill-First Execution Rules

These rules enforce a skill-first execution model across all conversations and tasks in Antigravity.

## Core Rules

1. **Mandatory Skill Check Before Action**:
   - Before executing code changes, debugging, refactoring, planning, or running complex workflows, you MUST identify if an applicable agent skill exists.
   - If a skill applies to the task (even partially), invoke and consult that skill's instructions first before taking implementation actions.
   - Never implement directly if a skill applies.

2. **Strict Workflow Adherence**:
   - Always follow the skill instructions thoroughly; do not partially apply them or bypass established steps.
   - Maintain the exit criteria and verification checks specified in each skill.

3. **Intent to Skill Mapping**:
   - Starting a task / Unclear requirements → `using-agent-skills` or `interview-me`
   - Defining a new feature / spec → `spec-driven-development`
   - Planning and task breakdown → `planning-and-task-breakdown`
   - Incremental implementation → `incremental-implementation`
   - Writing or fixing tests → `test-driven-development`
   - Bugs / Errors / Diagnostic recovery → `debugging-and-error-recovery`
   - Legacy codebase investigation / Archeology & Reality probing → `code-archeology-and-anti-slop`
   - Reverse engineering / Binary analysis / Protocol reversing → `reverse-engineering-and-binary-analysis`
   - Rigorous structural code review & eliminating cognitive debt → `thermonuclear-code-review`
   - Multi-axis code review & pre-merge checklist → `code-review-and-quality`
   - Deslopping text / Removing AI tells & fluff from documentation & code → `unslop-code-and-prose`
   - Refactoring & simplification → `code-simplification`
   - Frontend & UI engineering → `frontend-ui-engineering`
   - Security auditing & hardening → `security-and-hardening`
   - Performance optimization → `performance-optimization`
   - Deployment / Shipping / Final verification → `shipping-and-launch`

4. **Anti-Rationalization**:
   The following thoughts are violations of the workflow and MUST be rejected:
   - "This task is too small or simple for a skill"
   - "I will just quickly write the code and skip the skill"
   - "I'll do the implementation first and check the skill later"
   
   Always check and consult the skill first.
