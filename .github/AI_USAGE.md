# AI Model Usage Governance — RP-Music-Radio

**Version 1.0** | **Last Updated**: 2026-05-02
**Status**: GOVERNANCE FILE — Protected by Rule 10 (`copilot-instructions.md`)
**Companion to**: `PLANNING.md`, `PR_MERGE_RULES.md`, `copilot-instructions.md`

---

## Core Purpose

Right-size AI model usage across the project: maximum capability where it matters (architecture, security, audits), minimum cost where it doesn't (boilerplate, CRUD, fixtures). This file defines **which model does what, when to escalate, and how reviews flow.**

**Read this in 2 minutes. Apply on every task.**

---

## The Three Models

| Model | Role | Strengths | Cost |
| --- | --- | --- | --- |
| **Haiku 4.5** | JR Developer | Fast iteration, simple coding, fixtures, CRUD | Lowest |
| **Sonnet 4.6** | SR Developer / Reviewer | Multi-file refactors, code review, moderately complex features | Mid |
| **Opus 4.7** | Architect / Auditor | Architecture, security audits, complex analysis, planning (Requires Nested Thinking) | Highest |

---

## 1. Decision Matrix (Task Type → Model)

| Task Type | Primary Model | Reviewer | Notes |
| --- | --- | --- | --- |
| Architecture / TDR updates | **Opus 4.7** | Human | Strategic; never delegate down. **Requires Nested Thinking**. |
| `PLANNING.md` / governance edits | **Opus 4.7** | Human | Rule 10 protected files. **Requires Nested Thinking**. |
| Security audits / threat modeling | **Opus 4.7** | Human | Always Opus, no exceptions |
| Performance optimization analysis | **Opus 4.7** | Sonnet | Opus identifies, Sonnet implements |
| Cross-cutting refactors (3+ files) | **Sonnet 4.6** | Opus | Sonnet executes, Opus audits |
| New feature implementation | **Sonnet 4.6** | Opus (critical) / Human (non-critical) | Sonnet handles state, integration |
| Code review of Haiku output | **Sonnet 4.6** | — | SR reviews JR |
| Code review of Sonnet output | **Opus 4.7** | — | Architect reviews SR (critical paths only) |
| Form fields / simple UI components | **Haiku 4.5** | Sonnet | Boilerplate-heavy |
| Simple CRUD endpoints | **Haiku 4.5** | Sonnet | Pattern-matching work |
| Test fixtures / test utilities | **Haiku 4.5** | Sonnet | Mechanical |
| Documentation / typo fixes | **Haiku 4.5** | Human | Lowest stakes |
| Dependency bumps / chore PRs | **Haiku 4.5** | Sonnet | If tests pass, ship it |
| Bug fix (single file, clear repro) | **Haiku 4.5** | Sonnet | Escalate if unclear |
| Bug fix (multi-file, unclear repro) | **Sonnet 4.6** | Opus | Investigation needed |

---

## 2. Escalation Criteria (Move Up the Stack)

**Haiku → Sonnet** — Escalate when ANY of:

- Change requires coordination across **2+ files**
- State management beyond local component state (Redux, Context, persistence)
- Touches API contracts, schema, or migrations
- Repro for a bug requires investigation (not obvious from issue)
- Haiku produced code on **second attempt** that still fails review
- Test coverage requires new mocking/fixturing strategy

**Sonnet → Opus** — Escalate when ANY of:

- Change touches **auth, payment, data integrity, or PII** paths
- Architectural decision required (new service, new dependency, schema redesign)
- Performance work where wrong choice has lasting cost (caching, indexing, queue topology)
- Cross-service contract changes (frontend ↔ backend ↔ worker)
- Security-sensitive code (input validation at trust boundary, crypto, secrets handling)
- Sonnet produced code on **second attempt** that still fails Opus audit
- Touching files in `.github/` (Rule 10 governance)

**Always Opus (no escalation needed — start there):**

- `ARCHITECTURE.md`, `PLANNING.md`, `copilot-instructions.md`, `REPO_CONFIG.md`
- TDR / architectural decision records
- Security audits (even if "small")
- Post-incident root-cause analysis
- AI API integration design (Gemini 3 / Lyria 3 / Nano Banana 2 contracts)

**Never Haiku (skip the JR tier):**

- Anything in the Always-Opus list above
- Celery task topology / queue design
- Database migration logic (writing a migration is fine; designing schema is not)
- Auth / session / cookie / CORS code

---

## 3. Code Review Flow

```text
                   ┌──────────────────────────────────────┐
                   │  Task scoped to a model (Section 1)  │
                   └──────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
       Haiku writes              Sonnet writes             Opus writes
            │                         │                         │
            ▼                         ▼                         ▼
       Sonnet reviews           Opus reviews              Human reviews
       (mandatory)              (if critical path)        (always)
            │                         │                         │
            ▼                         ▼                         │
       Pass? Ship it.          Pass? Ship it.                   │
       Fail? Sonnet            Fail? Sonnet revises             │
       revises or              under Opus guidance,             │
       escalates to Opus.      or Opus rewrites.                │
            │                         │                         │
            └─────────────────────────┴─────────────────────────┘
                                      │
                                      ▼
                              Human merges PR
                              (per PR_MERGE_RULES.md)
```

**Review responsibilities:**

- **Sonnet reviewing Haiku**: Check correctness, idiomatic patterns, test coverage, that the change matches the issue scope.
- **Opus reviewing Sonnet**: Check architectural fit, security implications, performance, cross-cutting concerns, that the abstraction is right (not just that it works).
- **Human reviewing Opus**: Strategic alignment, business fit, governance compliance.

**Two-strike rule**: If a model fails review twice on the same task, **escalate up one tier**. Don't loop indefinitely.

---

## 4. Exception Handling

**Skip the normal flow when:**

| Situation | Action |
| --- | --- |
| Production incident / hotfix | Opus diagnoses + writes, human reviews, ship. Skip JR tier. |
| Trivial typo / comment fix | Any model. Skip review. Single commit. |
| Pure mechanical refactor (rename across repo) | Haiku does it, Sonnet spot-checks. Skip Opus. |
| Spike / proof-of-concept (won't merge) | Use whatever is fastest. Mark PR `[SPIKE]`. No review required. |
| User explicitly requests a model | Honor the request; log rationale in PR body. |
| Disagreement between Sonnet and Opus reviewers | Human breaks the tie. Document in `PLANNING.md`. |

**Never skip review for:**

- Anything touching `.github/` files
- Anything in the "Always Opus" list
- Anything matching escalation triggers from Section 2

**PR Completion Rule:**

- **Always finish a PR before running out of tokens** — Once a PR is created, see it through to completion (merged, closed, or documented for next session). If approaching token limits, prioritize: (1) auto-fix CI failures, (2) address review comments, (3) push final state even if unfinished. Never leave a PR hanging mid-implementation without committing progress and documenting next steps in a final commit message or PR comment.

**Governance File Update Rule:**

- **Always update `.github/` files before token exhaustion** — Governance files (`.github/PLANNING.md`, `.github/TODO.md`, `.github/AI_USAGE.md`, `.github/copilot-instructions.md`, `.github/ARCHITECTURE.md`) must be kept in sync with actual implementation state. If approaching token limits, prioritize: (1) commit any outstanding `.github/` changes, (2) push to branch, (3) document incomplete work in `PLANNING.md` for next session. This ensures continuity across sessions and prevents governance drift.

---

## 5. Examples From Current Session

These illustrate the rules in practice (current session: 2026-05-02):

### Example A — Architecture Audit (Opus, correct)

- Task: Audit governance setup, design AI usage rules
- Model: Opus 4.7
- Why: Strategic, governance-touching, requires holistic view
- Outcome: This document. Matches "Always Opus" rule.

### Example B — Implementation + Review Pattern (Sonnet → Opus, correct)

- Task: Implement feature, then audit
- Flow: Sonnet 4.6 wrote code; Opus 4.7 reviewed
- Why: Feature was non-trivial but not architectural; Opus caught issues SR-tier missed
- Outcome: Matches "new feature implementation" row in decision matrix.

### Example C — Untested Path (Haiku, candidate)

- Task: Form field additions, simple CRUD endpoints, test fixtures
- Recommended: Haiku 4.5 → Sonnet 4.6 review
- Why: Boilerplate-heavy, pattern-matching work; right tier for cost efficiency
- Status: Not yet exercised in this project — try on next qualifying task.

---

## 6. Logging Model Usage

Per Rule 9 (`copilot-instructions.md`), every task is logged in `PLANNING.md`. **Add a `Models Used` line** to each session entry:

```markdown
### Session N: <Title> (<date>)
**Models Used**:
- Planning: Opus 4.7 with Nested Thinking
- Implementation: Haiku 4.5 (subtasks 1-3), Sonnet 4.6 (subtask 4)
- Review: Sonnet 4.6 (Haiku output), Opus 4.7 (Sonnet output, security check)
**Rationale**: <one line — why this mix>
```

This creates an audit trail for cost/quality calibration over time.

---

## 7. Quick Reference Card

```text
ARCHITECTURE / SECURITY / GOVERNANCE  → Opus 4.7
COMPLEX FEATURE / CROSS-FILE WORK     → Sonnet 4.6  → Opus reviews if critical
SIMPLE CODE / CRUD / FIXTURES / DOCS  → Haiku 4.5   → Sonnet reviews

ESCALATE UP if: 2nd-attempt review failure, scope grew, security/auth touched
SKIP TIERS if:  hotfix, typo, spike, user override
ALWAYS OPUS:    .github/*, ARCHITECTURE.md, security audits, AI API design
NEVER HAIKU:    auth, migrations design, queue topology, governance files
```

---

## Status

**ACTIVE** — Applies to all model selection decisions
**Enforced By**: PR description (`Models Used` block), human review at merge
**Review Cadence**: Revisit quarterly or when a new model tier is added
**Owner**: Repository maintainers (governance edits require Rule 10 workflow)
