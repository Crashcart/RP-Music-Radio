# Repository Configuration — RP-Music-Radio

> **Purpose**: Project-specific settings for AI agents and developers. Read this alongside `copilot-instructions.md`.  
> **Last Updated**: 2026-04-26  
> 🔒 **GOVERNANCE FILE** — Protected by Rule 10 in `copilot-instructions.md`. Follow full workflow when editing.

---

## PROJECT OVERVIEW

**Name**: RP-Music-Radio  
**Type**: Web application (TBD: Backend + Frontend stack)  
**Description**: Music radio application for Roleplay communities (RP)  
**Target Users**: Game servers, roleplay communities  
**Status**: Early development

---

## COMMANDS

| Action                    | Command                 |
| ------------------------- | ----------------------- |
| **Run tests**             | `npm test`              |
| **Lint (check)**          | `npm run lint:check`    |
| **Lint (fix)**            | `npm run lint`          |
| **Format (check)**        | `npm run format:check`  |
| **Format (fix)**          | `npm run format`        |
| **Security audit**        | `npm audit`             |
| **Start dev**             | `npm run dev`           |

*Note: Add project-specific commands as project structure solidifies.*

---

## FILES TO MONITOR

Read these before editing anything in the project.

### Governance (read first every session)

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `.github/copilot-instructions.md` | Universal agent rules                |
| `.github/REPO_CONFIG.md`          | This file — project-specific config  |
| `.github/TODO.md`                 | Active task list                     |
| `.github/PLANNING.md`             | Planning, context, and handoff notes |

### Core Application

| File             | Description                      | Conflict Risk |
| ---------------- | -------------------------------- | :-----------: |
| `package.json`   | Dependencies & scripts           |   🟡 MEDIUM   |
| `README.md`      | Project documentation            |   🟢 LOW      |
| `.env.example`   | Environment variable spec        |   🟢 LOW      |

*Note: Add core application files as project structure develops.*

---

## HIGH-CONFLICT FILES

These files are frequently edited. Check `PLANNING.md` before modifying.

| File                              |   Risk    | Why                          |
| --------------------------------- | :-------: | ---------------------------- |
| `.github/copilot-instructions.md` |  🔴 HIGH  | Governance rules             |
| `package.json`                    | 🟡 MEDIUM | Dependency version conflicts |
| `README.md`                       | 🟡 MEDIUM | Documentation updates        |

---

## PROJECT CONVENTIONS

- **TBD**: Define style guide, naming conventions, and architecture patterns
- **Testing**: All features must have unit tests
- **Documentation**: Public-facing changes require README updates
- **Commits**: Use conventional commit format (feat:, fix:, docs:, etc.)

---

## CI/CD WORKFLOWS

| Workflow             | Trigger       | Purpose                              |
| -------------------- | ------------- | ------------------------------------ |
| `test.yml`           | Push/PR       | Run unit tests, security audit       |
| `lint.yml`           | Push/PR       | ESLint + Prettier validation         |
| `code-review-gate.yml` | PR to main    | Conflict detection, static review    |

*Note: Add workflows as project CI/CD needs are defined.*

---

## BRANCH STRATEGY

| Branch         | Purpose                     |
| -------------- | --------------------------- |
| `main`         | Production-ready, protected |
| `feat/issue-N` | Feature branches            |
| `fix/issue-N`  | Bug fix branches            |
| `docs/name`    | Documentation branches      |
| `chore/name`   | Maintenance branches        |

---

## Development Checklist

Before submitting a PR, ensure:
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint:check`)
- [ ] Code formatting correct (`npm run format:check`)
- [ ] Security audit clean (`npm audit`)
- [ ] `.github/TODO.md` updated with completed subtasks
- [ ] `.github/PLANNING.md` updated with decisions and blockers
- [ ] `README.md` updated if public-facing changes
- [ ] PR title follows: `feat: <description> [Issue #N]`
- [ ] PR body includes context from `.github/PLANNING.md`

---

## Environment Variables

See `.env.example` for required variables. Create `.env.local` for development.

**Never commit sensitive keys.** Use GitHub Secrets for CI/CD.

---

## Questions or Clarifications?

If `REPO_CONFIG.md` is unclear or missing information about the project:
1. Post a question in the issue
2. Update `.github/PLANNING.md` with context
3. Escalate to human review for governance clarifications
