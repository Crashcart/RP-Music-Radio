# GitHub Repository Rules

**Last Updated**: 2026-05-02  
**Status**: ACTIVE

---

## Branch Protection Rules

These rules are enforced at the GitHub repository level. They prevent accidental commits to critical branches and ensure code quality.

### main (Production)
**Status**: 🔒 **PROTECTED**

| Rule | Setting | Reason |
|------|---------|--------|
| Require pull request reviews | ✅ YES (1 review) | Prevent accidental merges |
| Require status checks to pass | ✅ YES | CI/CD must pass before merge |
| Require branches to be up to date | ✅ YES | Prevent merge conflicts |
| Dismiss stale reviews | ✅ YES | New commits require fresh review |
| Require signed commits | ✅ YES | Verify author identity |
| Include administrators | ✅ YES | Rules apply to maintainers too |
| Require conversation resolution | ✅ YES | All review comments must be resolved |
| Restrict who can push | ✅ Maintainers only | Only authorized users can push |
| Allow force push | ❌ NO | Prevent history rewriting |
| Allow deletions | ❌ NO | Prevent branch deletion |

**Bypass Permissions**: Only repository administrators (crashcart)

### beta (Release Candidate)
**Status**: 🟡 **SEMI-PROTECTED**

| Rule | Setting | Reason |
|------|---------|--------|
| Require pull request reviews | ✅ YES (1 review) | Ensure quality before release |
| Require status checks to pass | ✅ YES | CI/CD must pass |
| Require branches to be up to date | ✅ YES | Prevent conflicts |
| Dismiss stale reviews | ✅ YES | Fresh review required |
| Require signed commits | ⚠️ Optional | Recommended for traceability |
| Restrict who can push | ✅ Maintainers | Controlled merge process |
| Allow force push | ✅ YES (admins only) | Allow fixing CI issues |
| Allow deletions | ❌ NO | Prevent accidental deletion |

**Bypass Permissions**: Maintainers for emergency fixes

### alpha (Development)
**Status**: 🟢 **MINIMAL PROTECTION**

| Rule | Setting | Reason |
|------|---------|--------|
| Require pull request reviews | ❌ NO | Rapid iteration |
| Require status checks to pass | ✅ YES | Catch obvious errors |
| Require branches to be up to date | ❌ NO | Allow direct pushes |
| Require signed commits | ❌ NO | Not enforced in dev |
| Restrict who can push | ❌ NO | All developers can push |
| Allow force push | ✅ YES | Allow rebasing and cleanup |
| Allow deletions | ✅ YES | Allow branch management |

**Note**: Alpha is for rapid development. Code quality is validated by CI/CD and team review before promotion to beta.

---

## Merge Rules

### Merge Strategy

| Branch | Merge Method | Reason |
|--------|--------------|--------|
| **alpha** | Squash | Clean history, easy rebasing |
| **beta** | Merge commit | Preserve feature branches |
| **main** | Merge commit | Full history for production |

### Commit Message Format

All commits should follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test addition/update
- `chore`: Build, deps, CI config
- `ci`: CI/CD changes

**Examples**:
```
feat(chat): Add CSRF protection to ChatAssistant
fix(middleware): Change CSRF cookie to samesite=lax
docs: Update branch strategy guide
```

---

## PR Requirements

### Before Merge

- [ ] ✅ All CI checks passing (build, tests, linting)
- [ ] ✅ Code review approval
- [ ] ✅ Conversations resolved
- [ ] ✅ Branch is up to date with base

### Code Review Checklist

- [ ] Code is readable and well-structured
- [ ] No hardcoded secrets or credentials
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] No breaking changes to public API

### Automated Checks

**CI/CD Pipeline** runs on every PR:
- TypeScript compilation (frontend)
- Python linting & type checking (backend)
- Unit tests
- Build verification
- Security scanning

**Status must be**: ✅ All checks passed

---

## Permissions & Access

### Repository Roles

| Role | Branch Access | Can Merge |
|------|---------------|-----------|
| **Administrator** | All branches | Yes (all branches) |
| **Maintainer** | alpha, beta, main | Yes (alpha, beta, main) |
| **Developer** | Feature branches, alpha | Yes (alpha only via PR) |
| **Contributor** | Feature branches | Via PR review |

### maintainer-only actions
- Merge to beta
- Merge to main
- Create releases
- Manage branch protection
- Manage CI/CD secrets

---

## Tag & Release Rules

### Version Numbering

Follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

**Examples**:
- `v1.0.0` — First stable release
- `v1.1.0` — New features added
- `v1.1.1` — Bug fix
- `v2.0.0` — Breaking changes

### Tag Protection

Production tags (`v*`) are created on `main` branch only.

---

## Enforcement & Exceptions

### When Rules Can Be Bypassed

**Only for**:
- Critical security issues
- Production outages
- Data loss prevention

**Process**:
1. Request bypass from maintainers
2. Provide justification
3. Document in PR body: `[EMERGENCY BYPASS: reason]`
4. Post-merge: File issue to document exception

### Audit Trail

All bypass requests are logged and reviewed:
- Who requested
- When
- Justification
- Outcome

---

## FAQ

**Q: Why is signing commits required for main?**  
A: Verify that commits come from authorized developers.

**Q: Can I force push to main?**  
A: No. Force push is disabled to prevent history rewriting.

**Q: How do I update a PR if CI fails?**  
A: Push new commits; stale reviews are automatically dismissed and need fresh review.

**Q: What if my branch is behind main?**  
A: GitHub won't allow merge until your branch is updated. Click "Update branch" in the PR.

**Q: Can I merge without review on alpha?**  
A: Yes, but you should request review. CI checks must still pass.

---

## Related Documentation

- [BRANCH_STRATEGY.md](.github/BRANCH_STRATEGY.md) — Branch workflow & merge process
- [CODEOWNERS](.github/CODEOWNERS) — Code ownership & auto-review assignments

**Last Reviewed**: 2026-05-02  
**Maintained By**: Repository maintainers
