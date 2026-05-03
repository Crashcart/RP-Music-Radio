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

### Rule 11: Always Use Branch Switching Scripts
- **REQUIREMENT**: Use provided branch switching scripts for all branch operations:
  - **Pull from main (stable)**: `./scripts/pull-main.sh`
  - **Pull from beta (RC)**: `./scripts/pull-beta.sh`
  - **Pull from alpha (pre-release)**: `./scripts/pull-alpha.sh`
  - **Interactive switcher**: `./scripts/switch-branch.sh [main|beta|alpha]`
  - **View branch status**: `./scripts/branch-status.sh`
- **WHY**: These scripts automatically:
  - Stash/restore uncommitted changes (prevents data loss)
  - Fetch latest from remote (keeps local in sync)
  - Validate branch transitions (prevents accidental merges)
  - Show branch descriptions and next steps (prevents confusion)
- **ENFORCEMENT**: Enforce via pre-commit hooks; manual verification required
- **CONSEQUENCE**: If using raw `git checkout`, re-run appropriate script to ensure proper state
- **WORKFLOW**: 
  - **Development**: Always work on feature branches (feat/, fix/, docs/)
  - **Testing**: `./scripts/pull-alpha.sh` to test new features
  - **RC validation**: `./scripts/pull-beta.sh` to test release candidates
  - **Production**: `./scripts/pull-main.sh` to deploy stable releases

### Rule 12: Continuous PR Issue Detection & Escalating Fixes
- **REQUIREMENT**: After creating a PR, continuously monitor and fix issues using escalating severity levels and governance process
- **CONTINUOUS MONITORING** (Every 1 Minute):
  1. **Check PR status** — CI results, comments, review requests, mergeable state
  2. **Identify NEW issues** — As they appear (newly failed checks, comments, etc.)
  3. **Categorize by Severity** — Assign level based on impact:
     - **Jr** (Junior): Minor issues, 1-minute fix (docs, lint, config)
     - **Sr** (Senior): Major issues, 5-30 min fix (code logic, architecture)
     - **Cr** (Critical): Blockers, escalate to human (blocked dependencies, env issues)
- **ESCALATION STRATEGY** — If issue persists across check cycles:
  - Cycle 1 (Jr-level): Try quick fix
  - Cycle 2 (Sr-level): Attempt deeper investigation & fix
  - Cycle 3+ (Cr-level): Document and escalate to human review
- **FIX WORKFLOW** (Per Issue):
  1. Create/update subtask in `.github/TODO.md` with issue ID and severity
  2. Document fix approach in `.github/PLANNING.md`
  3. Implement fix on feature branch (Phase 2)
  4. Run full verification (Phase 3: build, test, lint, audit)
  5. Commit with conventional prefix: `fix:`, `refactor:`, `docs:`
  6. Push immediately
  7. Update `.github/TODO.md` with completion status
  8. Update `.github/PLANNING.md` with fix summary
  9. Add PR comment: "Fixed [Jr-1, Sr-2] in cycle N per governance process"
- **REPEAT UNTIL ALL FIXED**: Loop monitoring → identify → fix → update → re-check
  - After each fix, pause 1 minute for CI to update
  - Check for regressions or new issues
  - Continue until PR is mergeable (0 blockers)
- **WHY**: Escalating severity ensures:
  - Quick wins first (Jr issues fixed fast)
  - Systematic investigation (Sr issues get deeper analysis)
  - Human safety valve (Cr issues get escalated)
  - Continuous progress (no stalled PRs)
  - Auditability (every fix documented per cycle)
- **ENFORCEMENT**: PR cannot merge until all issues fixed and 0 blockers remain
- **CONSEQUENCE**: Unresolved blockers → escalate to human (Cr-level)
- **TIMING**: Continuous 1-minute check cycles until PR mergeable or Cr escalation triggered

---

## The A-to-Z Workflow (4 Phases)

### Phase 0: Orientation (Before Writing Code)
1. Read all `.github/` governance files
2. Review issue context and requirements
3. Check `PLANNING.md` for related work
4. Identify dependencies and blockers
5. Run `./scripts/branch-status.sh` to verify current branch and available commands
6. **STOP** — ask human if unclear on any requirement

### Phase 1: Planning (Immediate)
1. Break task into 3–5 subtasks
2. Update `.github/TODO.md` with all subtasks marked `pending`
3. Update `.github/PLANNING.md` with:
   - Task context and goal
   - Dependencies identified
   - High-level approach
4. Ensure you're on a feature branch: `./scripts/pull-alpha.sh` (or appropriate branch for task scope)
5. Create feature branch: `git checkout -b feat/issue-N-slug`
6. **PUSH IMMEDIATELY** — do not wait to accumulate commits
7. Verify branch state: `./scripts/branch-status.sh` — confirm you're on correct feature branch

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
