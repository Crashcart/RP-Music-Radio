# Enterprise AI Agent Instructions for RP-Music-Radio

**Version 3.3** | **Last Updated**: 2026-05-09  
**Status**: 🔒 GOVERNANCE FILE — Protected by Rule 10. Follow full workflow when editing.  
**Changes in v3.3**: Added Rule 14 (Autocompact Threshold for Multi-Session Stability) to enable aggressive context compaction at 70% in long-running sessions across multiple AI agents.
**Previous (v3.2)**: Added Rule 13 (Log Archiving for Multi-AI Access) to enable shared log storage in `.github/logs/` for other AIs and developers to access without manual re-passing.
**Previous (v3.1)**: Added Rule 1.5 (Session Branch Enforcement) to prevent accidental pushes to non-designated branches; updated Phase 0 and Phase 2 with checkpoints.
**Previous (v3.0)**: Consolidated Rules 12-P1 and Rule 12; fixed entity constraint in database schema; added explicit escalation procedures.

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

## The Governance Rules (14 Rules + 1 Sub-rule)

**Summary**: 14 rules establish mandatory workflow discipline across all AI agents working on this project. Rules 1-11 define base requirements (branch protection, documentation, testing, conflict handling, hook compliance, branch switching). Rule 1.5 adds session-specific branch enforcement. Rule 12 unifies PR monitoring with escalating fixes and the "never stop at first green" principle. Rule 13 enables multi-AI coordination via shared log storage. Rule 14 ensures context stability across long-running sessions.

### Rule 1: Never Push to Main
- **REQUIREMENT**: All development work happens on feature branches (e.g., `feat/`, `fix/`, `docs/`, `chore/`)
- **ENFORCEMENT**: Branch protection rules block direct commits to `main`
- **CONSEQUENCE**: PR rejection; manual escalation required

### Rule 1.5: Session Work ONLY to Designated Branch (CRITICAL)
- **REQUIREMENT**: All commits during active session MUST push to the designated branch specified in session header. NO exceptions for governance, documentation, or planning.
- **SESSION BRANCH IDENTIFICATION**: Read session header at start for designated branch (e.g., `alpha`, `claude/issue-N`, etc.). This is the ONLY branch where session work is pushed. If unclear, STOP and ask human.
- **ENFORCEMENT CHECKPOINT**: Before EVERY push, verify branch:
  - Run: `git branch -vv`
  - Confirm current branch matches session designation
  - If wrong: `git checkout <correct-branch>` then push
- **SCOPE**: Applies to ALL changes (code, governance files, documentation, planning)
- **CONSEQUENCE**: Commits to wrong branch = Cr-level blocker; must revert and re-push to correct branch
- **RATIONALE**: Prevents accidental merges of unfinished work; keeps session work isolated until human review; ensures correct review gates

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

### Rule 12: Continuous PR Monitoring with Escalating Fixes (Never Stop at First Green)

**CORE PRINCIPLE**: AI must continue working through ALL issues until the entire PR is ALL GREEN. Do NOT stop when one issue is fixed. Treat each green issue as a checkpoint, not a finish line.

#### Monitoring & Escalation Process

- **MONITORING WINDOW**: 8 minutes maximum
  - Check PR status **once per minute** (not continuously/obsessively)
  - After 8 minutes, escalate remaining issues as Cr-level blockers to human
  - Rationale: Ensures progress without creating endless loops

- **CONTINUOUS MONITORING** (Every 1 Minute, up to 8 total):
  1. **Check PR status** — CI results, comments, review requests, mergeable state
  2. **Identify NEW issues** — As they appear (newly failed checks, comments, etc.)
  3. **Categorize by Severity** — Assign level based on impact and fix time:
     - **Jr** (Junior): Minor issues, 1-minute fix (docs, lint, config)
     - **Sr** (Senior): Major issues, 5-30 min fix (code logic, architecture)
     - **Cr** (Critical): Blockers, escalate to human (blocked dependencies, env issues)

#### Issue Fix Workflow (Per Issue)

1. Create/update subtask in `.github/TODO.md` with issue ID and severity
2. Document fix approach in `.github/PLANNING.md`
3. Implement fix on feature branch (Phase 2)
4. Run full verification (Phase 3: build, test, lint, audit)
5. Commit with conventional prefix: `fix:`, `refactor:`, `docs:`
6. Push immediately
7. Update `.github/TODO.md` with completion status
8. Update `.github/PLANNING.md` with fix summary
9. Add PR comment: "Fixed [Jr-1, Sr-2] in cycle N per governance process"

#### Repeat Until All Green (The "Never Stop" Requirement)

- After each fix, pause **1 minute for CI to update**
- **Immediately re-check ALL checks** (not just the one you fixed)
- Check for regressions or newly revealed issues
- **If ANY check still failing** → continue to next issue
- **If ALL checks green** → verify stability, then STOP
- **CRITICAL**: Do NOT stop when one issue becomes green — escalate as Cr-level violation if you do

#### Escalation Strategy

If an issue persists across check cycles:
- Cycle 1 (Jr-level): Try quick fix
- Cycle 2 (Sr-level): Attempt deeper investigation & fix
- Cycle 3+ (Cr-level): Document and escalate to human review

#### Success Criteria — PR Ready to Merge Only When:

- ✅ All CI checks green (verify, build, test-frontend, test-backend, lint, audit, security)
- ✅ 0 failed checks (no red ✗)
- ✅ 0 blockers (mergeable_state = "clean")
- ✅ All issues fixed and documented in governance files
- ✅ PR comment added: "All checks passing [Jr-X, Sr-Y fixed] — ready to merge"

#### Why This Matters

- **Quick wins first**: Jr issues fixed fast, unblocking other work
- **Systematic investigation**: Sr issues get deeper analysis and root cause fixes
- **Human safety valve**: Cr issues escalate to human experts
- **Continuous progress**: No stalled PRs or one-issue-at-a-time fixes
- **Auditability**: Every fix documented per cycle for review
- **Quality gate**: All green = production-ready code

---

### Rule 13: Archive Logs in Shared Directory for Multi-AI Access

**REQUIREMENT**: When AI agents receive logs (error outputs, build logs, test failures, API responses, etc.), save them in pure form to `.github/logs/` with a descriptive filename for other AIs and developers to access directly.

**LOG STORAGE**:
- Directory: `.github/logs/`
- Filename format: `{YYYY-MM-DD}-{type}-{description}.log` (e.g., `2026-05-09-error-api-deadlock.log`)
- File format: Pure/original text — no markdown, filtering, or sanitization (preserve full context)
- When: Any log >5 lines or representing failure/blocker
- Exclusions: Single-line status messages; sensitive data (sanitize API keys/passwords before saving)

**REFERENCE IN DOCUMENTATION**:
- In `.github/PLANNING.md`: "See `.github/logs/2026-05-09-error-api-startup.log`"
- In PR comments: Link to the log file
- In TODO.md: Reference logs for context

**BENEFIT**:
- Other AIs can `git clone` and read logs directly without manual re-passing
- Developers can review logs asynchronously
- Searchable archive of all issues/errors
- Historical debugging reference for future sessions

**ENFORCEMENT**: Escalate as Jr-level issue if logs received but not archived

#### Enforcement & Consequences

- **PR cannot merge until**:
  - ✅ All CI checks green (mandatory)
  - ✅ All identified issues fixed (mandatory)
  - ✅ Governance files updated (mandatory)
- **Violations**:
  - Any failed check = continue fixing (Jr → Sr → Cr escalation)
  - Stopping at first green = Cr-level violation, escalate to human
  - Unresolved blockers after Cr escalation = human review required
- **TIMING**: Continuous 1-minute check cycles until ALL GREEN or Cr escalation triggered

---

### Rule 14: Autocompact Threshold for Multi-Session Stability

**REQUIREMENT**: Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` to trigger context compaction at 70% capacity instead of default 85%.

**PURPOSE**: 
- Prevents context window bloat in long-running sessions
- Enables cleaner handoffs between AI agents/bots
- Avoids token exhaustion near 100% limit
- Maintains predictable compaction cycles

**CONFIGURATION**:
- **Global User Setting** (`~/.claude/settings.json`):
  ```json
  {
    "env": {
      "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "70"
    }
  }
  ```
- **Project Setting** (`.claude/settings.json` in repo):
  ```json
  {
    "env": {
      "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "70"
    }
  }
  ```

**VERIFICATION**:
- Run: `echo $CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- Expected output: `70`
- Check timing: Context should compact when reaching ~70% of limit, not 85%

**APPLIES TO**: All Claude Code agents/bots working on RP-Music-Radio project

**RATIONALE**: At 70% threshold, context remains clean and compactable. Default 85% risks exhaustion in long sessions where multiple agents hand off work.

---

## The A-to-Z Workflow (4 Phases)

### Phase 0: Orientation (Before Writing Code)
1. Read all `.github/` governance files
2. **Identify Session Branch** (Rule 1.5): Read session header for designated branch name. Write it down. Never assume.
3. Review issue context and requirements
4. Check `PLANNING.md` for related work
5. Identify dependencies and blockers
6. Run `./scripts/branch-status.sh` to verify current branch and available commands
7. **Verify you are on correct branch**: `git branch -vv` → confirm matches session designation
8. **STOP** — ask human if unclear on any requirement or branch designation

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
5. **Verify Branch Before Push** (Rule 1.5): Run `git branch -vv` → confirm current branch matches session designation. If wrong, `git checkout <correct-branch>`.
6. **PUSH IMMEDIATELY** — do not batch changes
7. Verify: `git pull origin <branch>` — check for conflicts
8. Update `.github/TODO.md` — mark subtask `in_progress` → `completed`
9. Update `.github/PLANNING.md` — log decision/output for each subtask

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

## Escalation Triggers & Procedures

**STOP and escalate to human immediately if:**
- Merge conflicts cannot be resolved after multiple attempts
- Tests fail and root cause is unclear (Jr & Sr investigation exhausted)
- Security audit flags critical vulnerabilities
- Architectural changes needed (beyond scope of PR)
- Governance file edits required (Rule 10 protection)
- Issue requirements are ambiguous or contradictory
- Dependencies are blocked by external systems
- Rule 12 monitoring window (8 minutes) has elapsed with unresolved Cr issues

**HOW TO ESCALATE (Detailed Process):**

1. **Document the Issue**
   - Create detailed summary of blocker with error messages
   - Identify exact file, line number, and failure output
   - Note what you've already tried (Jr & Sr fixes attempted)
   - Include timestamps and cycle count

2. **Update Governance Files**
   - Add escalation note to `.github/PLANNING.md` with full context
   - Update `.github/TODO.md` with blocker status and Cr-level flag
   - Include copy of error output in a code block

3. **Post GitHub Comment on PR or Issue**
   - Mention `@maintainers` or `@human-reviewer` tag if available
   - Use format:
     ```
     ## 🚨 Escalation Required (Cr-Level)
     
     **Issue**: [Brief title]
     **Blocker**: [What's blocking progress]
     **Root Cause**: [If known, or investigation results]
     **Steps Taken**: 
     - [Jr-level attempts and results]
     - [Sr-level investigation and findings]
     
     **Error Output**:
     \`\`\`
     [Full error message/log]
     \`\`\`
     
     **Next Steps**: Awaiting human review and guidance.
     ```

4. **Wait for Human Response**
   - Do NOT continue with workarounds or force-pushes
   - Do NOT attempt to weaken constraints or skip checks
   - Monitor PR for human comments (typically within 30 minutes)
   - Be ready to provide additional context if requested

5. **Resume When Unblocked**
   - Once human provides guidance, implement fix or adjustment
   - Loop back to normal fix workflow (Phase 2 → Phase 3 → Push)
   - Reference the escalation in commit message and PR comment

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
**Version**: 3.0  
**Last Updated**: 2026-05-03 UTC  
**Enforced By**: Branch protection, workflow automations, human review gates, AI escalation procedures  
**Recent Changes**: Consolidated Rules 12-P1 and 12; added explicit escalation procedures; enforced entity constraints (Artist.station_id NOT NULL)

---

## Questions or Conflicts?

- **Ambiguous requirement?** → Post in issue; escalate to human
- **Workflow unclear?** → Reference Phase 0–4 section above
- **Need exception?** → Human approval required; document in `PLANNING.md`
- **Rule conflict?** → Escalate immediately
