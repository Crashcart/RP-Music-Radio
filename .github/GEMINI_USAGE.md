# Gemini Model Usage Governance — RP-Music-Radio

**Version 1.0** | **Last Updated**: 2026-05-03
**Status**: GOVERNANCE FILE — Protected by Rule 10 (`copilot-instructions.md`)
**Companion to**: `PLANNING.md`, `PR_MERGE_RULES.md`, `copilot-instructions.md`, `AI_USAGE.md`

---

## Core Purpose

Right-size AI model usage across the project when utilizing the Gemini API suite: maximum capability where it matters (architecture, security, audits), minimum cost where it doesn't (boilerplate, CRUD, fixtures). This file defines **which Gemini model does what, when to escalate, and how reviews flow.**

This document provides a Gemini-specific equivalent to the Anthropic rules found in `AI_USAGE.md`.

---

## The Three Models

| Model | Role | Strengths | Cost |
|-------|------|-----------|------|
| **Gemini 3.1 Flash** | JR Developer | Fast iteration, simple coding, fixtures, CRUD | Lowest |
| **Gemini 3.1 Pro** | SR Developer / Reviewer | Multi-file refactors, code review, moderately complex features | Mid |
| **Gemini 3.1 Pro (High)** | Architect / Auditor | Architecture, security audits, complex analysis, planning (Requires Nested Thinking) | Highest |

---

## 1. Decision Matrix (Task Type → Model)

| Task Type | Primary Model | Reviewer | Notes |
|-----------|--------------|----------|-------|
| Architecture / TDR updates | **Pro (High)** | Human | Strategic; never delegate down. **Requires Nested Thinking**. |
| `PLANNING.md` / governance edits | **Pro (High)** | Human | Rule 10 protected files. **Requires Nested Thinking**. |
| Security audits / threat modeling | **Pro (High)** | Human | Always Pro (High), no exceptions |
| Performance optimization analysis | **Pro (High)** | Pro | Pro (High) identifies, Pro implements |
| Cross-cutting refactors (3+ files) | **Pro** | Pro (High) | Pro executes, Pro (High) audits |
| New feature implementation | **Pro** | Pro (High) (critical) / Human (non-critical) | Pro handles state, integration |
| Code review of Flash output | **Pro** | — | SR reviews JR |
| Code review of Pro output | **Pro (High)** | — | Architect reviews SR (critical paths only) |
| Form fields / simple UI components | **Flash** | Pro | Boilerplate-heavy |
| Simple CRUD endpoints | **Flash** | Pro | Pattern-matching work |
| Test fixtures / test utilities | **Flash** | Pro | Mechanical |
| Documentation / typo fixes | **Flash** | Human | Lowest stakes |
| Dependency bumps / chore PRs | **Flash** | Pro | If tests pass, ship it |
| Bug fix (single file, clear repro) | **Flash** | Pro | Escalate if unclear |
| Bug fix (multi-file, unclear repro) | **Pro** | Pro (High) | Investigation needed |

---

## 2. Escalation Criteria (Move Up the Stack)

**Flash → Pro** — Escalate when ANY of:
- Change requires coordination across **2+ files**
- State management beyond local component state (Redux, Context, persistence)
- Touches API contracts, schema, or migrations
- Repro for a bug requires investigation (not obvious from issue)
- Flash produced code on **second attempt** that still fails review
- Test coverage requires new mocking/fixturing strategy

**Pro → Pro (High)** — Escalate when ANY of:
- Change touches **auth, payment, data integrity, or PII** paths
- Architectural decision required (new service, new dependency, schema redesign)
- Performance work where wrong choice has lasting cost (caching, indexing, queue topology)
- Cross-service contract changes (frontend ↔ backend ↔ worker)
- Security-sensitive code (input validation at trust boundary, crypto, secrets handling)
- Pro produced code on **second attempt** that still fails Pro (High) audit
- Touching files in `.github/` (Rule 10 governance)

**Always Pro (High) (no escalation needed — start there):**
- `ARCHITECTURE.md`, `PLANNING.md`, `copilot-instructions.md`, `REPO_CONFIG.md`, `GEMINI_USAGE.md`
- TDR / architectural decision records
- Security audits (even if "small")
- Post-incident root-cause analysis
- AI API integration design (Gemini 3 / Lyria 3 / Nano Banana 2 contracts)

**Never Flash (skip the JR tier):**
- Anything in the Always-Pro (High) list above
- Celery task topology / queue design
- Database migration logic (writing a migration is fine; designing schema is not)
- Auth / session / cookie / CORS code

---

## 3. Code Review Flow

```
                   ┌──────────────────────────────────────┐
                   │  Task scoped to a model (Section 1)  │
                   └──────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
      Flash writes               Pro writes             Pro (High) writes
            │                         │                         │
            ▼                         ▼                         ▼
       Pro reviews           Pro (High) reviews         Human reviews
       (mandatory)              (if critical path)        (always)
            │                         │                         │
            ▼                         ▼                         │
       Pass? Ship it.          Pass? Ship it.                   │
       Fail? Pro               Fail? Pro revises                │
       revises or              under Pro (High) guidance,       │
       escalates to High.      or Pro (High) rewrites.          │
            │                         │                         │
            └─────────────────────────┴─────────────────────────┘
                                      │
                                      ▼
                              Human merges PR
                              (per PR_MERGE_RULES.md)
```

**Review responsibilities:**
- **Pro reviewing Flash**: Check correctness, idiomatic patterns, test coverage, that the change matches the issue scope.
- **Pro (High) reviewing Pro**: Check architectural fit, security implications, performance, cross-cutting concerns, that the abstraction is right (not just that it works).
- **Human reviewing Pro (High)**: Strategic alignment, business fit, governance compliance.

**Two-strike rule**: If a model fails review twice on the same task, **escalate up one tier**. Don't loop indefinitely.

---

## 4. Exception Handling

**Skip the normal flow when:**

| Situation | Action |
|-----------|--------|
| Production incident / hotfix | Pro (High) diagnoses + writes, human reviews, ship. Skip JR tier. |
| Trivial typo / comment fix | Any model. Skip review. Single commit. |
| Pure mechanical refactor (rename across repo) | Flash does it, Pro spot-checks. Skip Pro (High). |
| Spike / proof-of-concept (won't merge) | Use whatever is fastest. Mark PR `[SPIKE]`. No review required. |
| User explicitly requests a model | Honor the request; log rationale in PR body. |
| Disagreement between Pro and Pro (High) reviewers | Human breaks the tie. Document in `PLANNING.md`. |

**Never skip review for:**
- Anything touching `.github/` files
- Anything in the "Always Pro (High)" list
- Anything matching escalation triggers from Section 2

**PR Completion Rule:**
- **Always finish a PR before running out of tokens** — Once a PR is created, see it through to completion (merged, closed, or documented for next session). If approaching token limits, prioritize: (1) auto-fix CI failures, (2) address review comments, (3) push final state even if unfinished. Never leave a PR hanging mid-implementation without committing progress and documenting next steps in a final commit message or PR comment.

**Governance File Update Rule:**
- **Always update `.github/` files before token exhaustion** — Governance files (`.github/PLANNING.md`, `.github/TODO.md`, `.github/GEMINI_USAGE.md`, `.github/copilot-instructions.md`, `.github/ARCHITECTURE.md`) must be kept in sync with actual implementation state. If approaching token limits, prioritize: (1) commit any outstanding `.github/` changes, (2) push to branch, (3) document incomplete work in `PLANNING.md` for next session. This ensures continuity across sessions and prevents governance drift.

---

## 5. Logging Model Usage

Per Rule 9 (`copilot-instructions.md`), every task is logged in `PLANNING.md`. **Add a `Models Used` line** to each session entry:

```markdown
### Session N: <Title> (<date>)
**Models Used**:
- Planning: Gemini 3.1 Pro (High) with Nested Thinking
- Implementation: Gemini 3.1 Flash (subtasks 1-3), Gemini 3.1 Pro (subtask 4)
- Review: Gemini 3.1 Pro (Flash output), Gemini 3.1 Pro (High) (Pro output, security check)
**Rationale**: <one line — why this mix>
```

This creates an audit trail for cost/quality calibration over time.

---

## 6. Quick Reference Card

```
ARCHITECTURE / SECURITY / GOVERNANCE  → Gemini 3.1 Pro (High)
COMPLEX FEATURE / CROSS-FILE WORK     → Gemini 3.1 Pro  → Pro (High) reviews if critical
SIMPLE CODE / CRUD / FIXTURES / DOCS  → Gemini 3.1 Flash   → Pro reviews

ESCALATE UP if: 2nd-attempt review failure, scope grew, security/auth touched
SKIP TIERS if:  hotfix, typo, spike, user override
ALWAYS PRO (HIGH): .github/*, ARCHITECTURE.md, security audits, AI API design
NEVER FLASH:    auth, migrations design, queue topology, governance files
```

---

## Status

**ACTIVE** — Applies to all Gemini model selection decisions
**Enforced By**: PR description (`Models Used` block), human review at merge
**Review Cadence**: Revisit quarterly or when a new model tier is added
**Owner**: Repository maintainers (governance edits require Rule 10 workflow)
