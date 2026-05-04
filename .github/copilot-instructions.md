# Enterprise AI Agent Instructions for RP-Music-Radio

**Version 2.1** | **Last Updated**: 2026-04-26  
**Status**: 🔒 GOVERNANCE FILE — Protected by Rule 10. Follow full workflow when editing.

---

## Core Purpose

This document establishes mandatory rules for all AI agents (Claude, etc.) working in the RP-Music-Radio repository, ensuring consistent workflow discipline and preventing cascading failures in multi-agent environments.

---

## Entity Relationship Constraints

**CRITICAL DATA MODEL RULE**:
- **DJs/Artists** MUST be linked to stations (via `station_id` foreign key or context).
- **All other entities (Brands, Stations, Jingles)** MUST NOT be linked to a station or have a `station_id` field.
- This rule prevents data model corruption and ensures clean entity relationships across the codebase.
- When writing AI prompts, ChatAssistant, or API validation, enforce this constraint strictly.

---

## The 10 Non-Negotiable Rules

### Rule 1: Never Push to Main
- **REQUIREMENT**: All development work happens on feature branches (e.g., `feat/`, `fix/`, `docs/`, `chore/`)
- **ENFORCEMENT**: Branch protection rules block direct commits to `main`
- **CONSEQUENCE**: PR rejection; manual escalation required

### Rule 2: Never Close Issues Without Human Approval
- **REQUIREMENT**: Only humans close issues
- **EXCEPTION**: Sub-task tracking within `.github/TODO.md` may be auto-updated
- **CONSEQUENCE**: Revert and escalate to human review

### Rule 3: Never Auto-Merge Without Explicit Testing
- **REQUIREMENT**: Full test suite must pass before any merge consideration
- **ENFORCEMENT**: Three-phase validation (tests → linting → security audit)
- **CONSEQUENCE**: PR blocked until all checks pass

### Rule 4: Never Skip Tests or Linting
- **REQUIREMENT**: All tests must execute; linting violations must be fixed
- **ENFORCEMENT**: CI/CD gates enforce this automatically
- **CONSEQUENCE**: PR blocked at merge gate

### Rule 5: Always Create Feature Branches
- **REQUIREMENT**: One feature branch per task; branch naming: `feat/issue-N`, `fix/issue-N`, etc.
- **FORMAT**: `{type}/{issue-N}-{slug}` e.g., `feat/issue-42-add-streaming`
- **CONSEQUENCE**: Commits on `main` trigger escalation

### Rule 6: Always Update Documentation
- **REQUIREMENT**: Changes to code require updates to:
  - `.github/TODO.md` (track task progress)
  - `.github/PLANNING.md` (log decisions, dependencies)
  - `README.md` (if public-facing changes)
  - Inline code comments (for non-obvious logic)
- **CONSEQUENCE**: PR blocked until docs updated

### Rule 7: Always Check for Conflicts After Every Push
- **REQUIREMENT**: After pushing, verify via `git pull origin <branch>` that no remote conflicts exist
- **ENFORCEMENT**: Automated conflict detection in `code-review-gate.yml`
- **CONSEQUENCE**: Must resolve before next action
- **AI AGENT EXCEPTION (Windows Sandbox)**: If the AI agent is running in a local environment where terminal access is blocked or sandboxed (e.g., `run_command` fails), the AI MUST explicitly request the USER to fetch, pull, and identify conflicts. The AI is exempt from running `git` commands directly but remains responsible for guiding the user through conflict resolution.

### Rule 8: Never Ignore Pre-Commit Hooks
- **REQUIREMENT**: Git hooks (ESLint, Prettier, conventional commits) must pass
- **ENFORCEMENT**: Hooks block commit if violations exist
- **CONSEQUENCE**: Fix violations and retry commit

### Rule 9: Always Maintain Planning Documentation
- **REQUIREMENT**: Every task must be:
  - Broken into subtasks in `.github/TODO.md`
  - Logged in `.github/PLANNING.md` with decisions and blockers
  - Committed to the feature branch
- **CONSEQUENCE**: Subtask escalation required for undocumented work

### Rule 10: Governance Files Are Self-Protecting
- **REQUIREMENT**: Any edit to `.github/` files (especially this one) requires:
  - Full pull request review (human approval)
  - Complete testing protocol execution
  - Explicit justification in PR body
  - Governance file protection workflow enforcement
- **CONSEQUENCE**: PR rejection; requires escalation to repository maintainers
- **NOTE**: "Never weaken a constraint" — removals must be justified and approved

---

## The A-to-Z Workflow (4 Phases)

### Phase 0: Orientation (Before Writing Code)
1. Read all `.github/` governance files
2. Review issue context and requirements
3. Check `PLANNING.md` for related work
4. Identify dependencies and blockers
5. **STOP** — ask human if unclear on any requirement

### Phase 1: Planning (Immediate)
1. Break task into 3–5 subtasks
2. Update `.github/TODO.md` with all subtasks marked `pending`
3. Update `.github/PLANNING.md` with:
   - Task context and goal
   - Dependencies identified
   - High-level approach
4. Create feature branch: `git checkout -b feat/issue-N-slug`
5. **PUSH IMMEDIATELY** — do not wait to accumulate commits
6. Run: `git pull origin <branch>` — verify no remote conflicts

### Phase 2: Implementation (Per Subtask)
1. Read existing code patterns and architecture
2. Make targeted changes (single concern per commit)
3. Run full test suite: `npm test` (or project equivalent)
4. Commit with conventional prefix: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`
5. **PUSH IMMEDIATELY** — do not batch changes
6. Verify: `git pull origin <branch>` — check for conflicts
7. Update `.github/TODO.md` — mark subtask `in_progress` → `completed`
8. Update `.github/PLANNING.md` — log decision/output for each subtask

### Phase 3: Verification (Before PR Submission)
1. Run full test suite: ensure all tests pass
2. Run linting: `npm run lint:check` (or project equivalent)
3. Run security audit: `npm audit` (or project equivalent)
4. Run any build/validation steps: `npm run build` (if applicable)
5. Regression testing: manually verify features still work
6. Update `.github/PLANNING.md` with final verification checklist
7. **Final push**: ensure all local changes committed and pushed

### Phase 4: Submission & Handoff (PR Creation)
1. Create pull request with:
   - Title: `feat: Add streaming support [Issue #N]`
   - Body: Copy `.github/PLANNING.md` content as PR description
   - Reference issue: `Closes #N` or `Fixes #N`
2. Post completion comment: "Protocol complete — awaiting review" (ONLY after Phase 3 done)
3. **WAIT FOR HUMAN REVIEW** — do not proceed without approval
4. Address review comments by repeating Phase 2 (code change) → Phase 3 (verification) → push

---

## Conflict Detection Protocol

**AFTER EVERY PUSH:**
```bash
git pull origin <branch-name>
```

If conflicts appear:
1. DO NOT FORCE PUSH
2. Resolve conflicts manually in editor
3. Run tests after resolution
4. Commit: `git commit -m "resolve: merge conflicts with origin/<branch>"`
5. Push: `git push origin <branch-name>`
6. Escalate if unresolvable

---

## Multi-Repo Coordination

If working across multiple Crashcart repositories:
1. Use **separate feature branches per repository**
   - `feat/issue-N-slug` in RP-Music-Radio
   - `feat/issue-M-slug` in another repo (different issue number)
2. Apply **identical governance rules** to all repos
3. Maintain **separate commit logs** (no cross-repo commits)
4. Coordinate timing via `.github/PLANNING.md` in each repo

---

## Escalation Triggers

**STOP and escalate to human immediately if:**
- Merge conflicts cannot be resolved
- Tests fail and root cause is unclear
- Security audit flags issues
- Architectural changes needed
- Governance file edits required
- Issue requirements are ambiguous
- Dependencies are blocked

**HOW TO ESCALATE:**
1. Post summary comment in issue/PR
2. Reference specific failure/blocker
3. Include error messages and logs
4. **WAIT FOR HUMAN RESPONSE** — do not proceed

---

## Governance File Protection

### Protected Files
- `.github/copilot-instructions.md` (this file)
- `.github/REPO_CONFIG.md`
- `.github/PR_MERGE_RULES.md`
- `.github/BRANCH_PROTECTION_SETUP.md`

### Edit Workflow for Protected Files
If you MUST edit a governance file:
1. Justify the edit in `.github/PLANNING.md`
2. Create PR with `[GOVERNANCE]` prefix in title
3. Full PR review required before merge
4. Complete all four workflow phases
5. **NEVER remove a rule without human approval**
6. **NEVER weaken a constraint**

---

## Status

**ACTIVE** — Applies to all commits and PRs with no exceptions  
**Last Updated**: 2026-04-26 UTC  
**Enforced By**: Branch protection, workflow automations, human review gates

---

## Questions or Conflicts?

- **Ambiguous requirement?** → Post in issue; escalate to human
- **Workflow unclear?** → Reference Phase 0–4 section above
- **Need exception?** → Human approval required; document in `PLANNING.md`
- **Rule conflict?** → Escalate immediately
