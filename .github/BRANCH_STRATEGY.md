# Branch Strategy — AetherWave / RP-Music-Radio

**Effective Date**: 2026-05-02  
**Status**: ACTIVE

---

## Branch Hierarchy

```
main  ← Stable production releases
  ↑
beta  ← Release candidates (RC) — tested, ready for production
  ↑
alpha ← Pre-release & experimental features — active development
```

---

## Branch Descriptions

### main (Production)
- **Purpose**: Stable, production-ready code
- **Stability**: HIGH — only merged from beta after testing
- **Deployment**: Automatic to production
- **Protection**: Requires PR review + passing CI/CD
- **Merge Source**: beta branch only
- **Audience**: End users, production deployments

### beta (Release Candidate)
- **Purpose**: Features tested and ready for release
- **Stability**: MEDIUM — vetted features, no breaking changes expected
- **Deployment**: Staging/pre-production
- **Protection**: Requires PR review + passing CI/CD
- **Merge Sources**: alpha (features), hotfixes from main
- **Audience**: QA, beta testers, internal stakeholders

### alpha (Development)
- **Purpose**: Active development, experimentation, feature branches
- **Stability**: LOW — features may be incomplete or buggy
- **Deployment**: Development/testing only
- **Protection**: Minimal — allow rapid iteration
- **Merge Sources**: Feature branches, bug fixes, experimental code
- **Audience**: Developers, internal testing

---

## Workflow

### Typical Feature Development

```
1. Create feature branch from alpha
   git checkout alpha
   git pull origin alpha
   git checkout -b feature/xyz

2. Develop, test, commit
   git add .
   git commit -m "..."
   git push origin feature/xyz

3. Create PR to alpha
   PR: feature/xyz → alpha
   Reviewers: team leads
   CI/CD: Must pass tests

4. Merge to alpha
   (After review + approval)
   git checkout alpha
   git pull origin alpha
   git merge --squash feature/xyz

5. Promote to beta when ready
   PR: alpha → beta (release candidate)
   Reviewers: maintainers
   CI/CD: Full integration tests

6. Merge to main when released
   PR: beta → main (production)
   Reviewers: maintainers
   CI/CD: Smoke tests + health check
```

### Hotfix Workflow

```
1. Create hotfix branch from main
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug

2. Fix and test
   git commit -m "Fix: critical issue..."
   git push origin hotfix/critical-bug

3. Create PR to main (or beta if not urgent)
   PR: hotfix/... → main
   Reviewers: maintainers

4. Backport to beta and alpha
   git checkout beta
   git pull origin beta
   git cherry-pick hotfix/...
   git push origin beta

   git checkout alpha
   git pull origin alpha
   git cherry-pick hotfix/...
   git push origin alpha
```

---

## Merge Rules

| From ↓ To → | alpha | beta | main |
|---|---|---|---|
| **Feature branch** | ✅ PR + review | ❌ Not direct | ❌ Not direct |
| **alpha** | N/A | ✅ PR + review | ❌ Not direct |
| **beta** | N/A | N/A | ✅ PR + review |
| **hotfix** | ✅ cherry-pick | ✅ cherry-pick | ✅ direct |

---

## Protection Rules

### main
- ✅ Require pull request reviews (1 minimum)
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date
- ✅ Dismiss stale reviews when new commits pushed
- ✅ Require signed commits
- ❌ Do NOT allow force push
- ❌ Do NOT allow deletion

### beta
- ✅ Require pull request reviews (1 minimum)
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date
- ❌ Allow force push (for maintainers fixing CI)
- ❌ Do NOT allow deletion

### alpha
- ⚠️ Minimal protection — allow rapid iteration
- ✅ Require CI/CD to pass
- ❌ No review required
- ❌ Allow force push (for rebasing)
- ❌ Do NOT allow deletion

---

## Branch Management Scripts

Located in `scripts/`:

```bash
./scripts/pull-main.sh    # Switch to main (stable)
./scripts/pull-beta.sh    # Switch to beta (RC)
./scripts/pull-alpha.sh   # Switch to alpha (dev)
./scripts/branch-status.sh # Show branch status & workflow
```

---

## Version Tagging

Tags are created on `main` for releases:

```
v1.0.0  — Stable release on main
v1.0.1  — Patch on main (from beta)
v2.0.0-rc.1 — Release candidate on beta
v2.0.0-alpha.1 — Alpha feature on alpha
```

---

## CI/CD Integration

| Branch | Pipeline | Checks |
|--------|----------|--------|
| alpha | Quick build | TypeScript, Python syntax |
| beta | Full integration | Build + unit tests + smoke tests |
| main | Production | Build + full tests + health check + deploy |

---

## Review Checklist

### For PR to alpha
- [ ] Code compiles without errors
- [ ] Unit tests added (if applicable)
- [ ] No console errors or warnings
- [ ] Follows code style guidelines

### For PR to beta
- [ ] Passes all CI/CD checks
- [ ] E2E tests passing
- [ ] No regressions in existing features
- [ ] Documentation updated

### For PR to main
- [ ] All beta tests passing
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Release notes written

---

## Examples

### Promoting a feature to production

```bash
# 1. Feature developed on alpha
git checkout alpha
git pull origin alpha

# 2. Create release candidate PR
# PR: alpha → beta
# After review:
git merge feature/xyz
git push origin beta

# 3. Wait for RC testing (7 days typical)

# 4. Merge to production
# PR: beta → main
# After approval:
git checkout main
git pull origin main
git merge beta
git tag v1.1.0
git push origin main --tags
```

### Emergency hotfix

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/crash-fix

# 2. Fix and push
git commit -m "Fix: production crash"
git push origin hotfix/crash-fix

# 3. Emergency PR to main
# PR: hotfix/crash-fix → main
# Fast-track approval due to severity

# 4. Backport to beta and alpha
git checkout beta
git cherry-pick hotfix/crash-fix
git push origin beta

git checkout alpha
git cherry-pick hotfix/crash-fix
git push origin alpha
```

---

## FAQ

**Q: Can I merge directly to main?**  
A: No. All changes must flow through alpha → beta → main (or hotfix path).

**Q: Can I force-push to main?**  
A: No. Force push is disabled on main for safety.

**Q: Can I force-push to alpha?**  
A: Yes, alpha allows force push for rebasing and cleanup.

**Q: When should I branch from main vs alpha?**  
A: Features → alpha. Hotfixes → main (then backport to beta/alpha).

**Q: How long does a feature stay in alpha?**  
A: Until it's tested and ready for beta (days to weeks depending on complexity).

**Q: How long does a release stay in beta?**  
A: Typically 7 days (1 week) of testing before merging to main.

---

## Responsibilities

| Role | Permissions | Duties |
|------|-----------|--------|
| **Developer** | Push to feature branches, PR to alpha | Create features, test locally |
| **Lead** | Merge to alpha, review PRs | Review code quality, manage alpha branch |
| **Maintainer** | Merge to beta/main, cut releases | Promote to production, manage releases |

---

**Last Updated**: 2026-05-02  
**Maintained By**: Repository maintainers  
**Questions?**: Contact the team lead

https://claude.ai/code/session_016f5Rxo4bLV2gCqkQQCf6uE
