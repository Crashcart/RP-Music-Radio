# PR Merge Rules & Standards — RP-Music-Radio

**Last Updated**: 2026-04-26

---

## Overview

This document establishes mandatory protocols for pull request merging, enforced through automated workflows and manual verification.

---

## Key Rules

### Rule 1: Test Completion Protocol

Every PR must pass a verification sequence:
1. All tests pass (`npm test`)
2. Linting passes (`npm run lint:check`)
3. Formatting correct (`npm run format:check`)
4. Security audit clean (`npm audit`)
5. Manual code review approval
6. Regression testing (no broken features)

### Rule 2: Green Status Requirement

The following automated checks must show passing before merge:
- ✅ Tests
- ✅ Lint & Formatting
- ✅ Security Audit
- ✅ Code Review Gate (conflict detection, static review)

### Rule 3: Documentation Updates

PRs with code changes must update (if applicable):
- `.github/TODO.md` (test results, completed subtasks)
- `.github/PLANNING.md` (decisions, blockers, log)
- `README.md` (if public-facing changes)
- Inline code comments (for non-obvious logic)

### Rule 4: No Premature Declarations

Contributors must wait for full protocol completion before announcing readiness. Only statements like "Protocol complete — all checks green, awaiting review" are acceptable.

### Rule 5: .github as Source of Truth

Official PR status and project state live exclusively in the `.github/` directory. Use `.github/TODO.md` for task tracking and `.github/PLANNING.md` for decisions.

### Rule 6: Human Review Required

Every PR must receive human review and approval before merge, regardless of CI/CD status.

---

## Enforcement Mechanisms

- **Automated checks** via GitHub Actions workflows
- **PR templates** enforcing documentation
- **Branch protection rules** blocking non-compliant merges
- **Human accountability** through explicit review requirements

---

## Violation Consequences

Non-compliance results in:
1. PR rejection with specific feedback
2. Requirement to complete protocol before re-submission
3. Escalation for repeated violations

---

## PR Submission Checklist

Before submitting a PR, verify:
- [ ] Branch created from latest `main`
- [ ] All local tests pass
- [ ] Linting passes
- [ ] Code formatted correctly
- [ ] Security audit clean
- [ ] `.github/TODO.md` updated with completed subtasks
- [ ] `.github/PLANNING.md` updated with context
- [ ] PR title follows conventional format: `feat: <description> [Issue #N]`
- [ ] PR body includes summary from `.github/PLANNING.md`
- [ ] No force pushes to the branch
- [ ] All commits pushed and verified via `git pull origin <branch>`

---

## Status

**ACTIVE** — Applies to all PRs with no exceptions  
**Last Updated**: 2026-04-26 UTC
