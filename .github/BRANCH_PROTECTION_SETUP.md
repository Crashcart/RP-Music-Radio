# Branch Protection Setup Guide — RP-Music-Radio

**Last Updated**: 2026-04-26

---

## Overview & Purpose

This guide outlines how to establish branch protection rules on the RP-Music-Radio repository to enforce a CI/CD workflow. Protections ensure that:
- ✅ All code goes through PR review
- ✅ All automated checks pass before merge
- ✅ Governance rules are enforced

---

## Key Configuration Steps

### 1. Repository Access

Navigate to: `https://github.com/crashcart/rp-music-radio`

1. Go to Settings → Branches (under "Code and automation")
2. Click "Add rule" under "Branch protection rules"

### 2. Main Branch Protection

**Pattern to protect**: `main`

#### Pull Request Requirements
- ✅ Require a pull request before merging
- ✅ Require approvals: **1**
- ✅ Require review from code owners: (if CODEOWNERS file exists)
- ✅ Require approval of the most recent reviewable push

#### Status Checks
Require status checks to pass before merging:
- ✅ `Tests` (from test.yml workflow)
- ✅ `Lint & Format` (from lint.yml workflow)
- ✅ `Code Review Gate` (from code-review-gate.yml workflow)

#### Additional Rules
- ✅ Require branches to be up to date before merging
- ✅ Require linear history
- ✅ Allow auto-merge: **Squash and merge**

#### Restrictions
- ✅ Restrict who can push to matching branches
  - Allow: Only permit specific users/teams to push

### 3. Verification

Once configured, test the branch protection:
1. Create a test branch: `git checkout -b test/branch-protection`
2. Make a test commit and push
3. Submit a PR to `main`
4. Verify all required checks execute
5. Confirm PR cannot merge until:
   - All tests pass
   - At least 1 approval received
   - Branch is up to date
6. Once approved, verify auto-merge works (if enabled)

---

## GitHub CLI Setup (Alternative)

If using GitHub CLI, apply branch protection with:

```bash
gh api repos/crashcart/rp-music-radio/branches/main/protection \
  -X PUT \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f required_status_checks='{"strict":true,"contexts":["Tests","Lint & Format","Code Review Gate"]}' \
  -f restrictions='null' \
  -f enforce_admins=false
```

---

## Troubleshooting

### Workflows not appearing as status checks?
- Verify workflow files exist in `.github/workflows/`
- Check workflow has appropriate trigger (push/pull_request)
- Ensure workflow file syntax is valid (lint YAML)
- May take 5–10 minutes for GitHub to register workflow as check

### Auto-merge failing?
- Verify auto-merge permission is enabled in branch protection
- Check all required checks have passing status
- Ensure at least 1 approval received

### Cannot push to main despite being admin?
- Check "Restrict who can push to matching branches"
- Verify your user is in the allowed list
- Admins may still need to be in the allowlist for restrictions to apply

---

## Reference Table

| Setting | Main Branch | Test Branch |
| --- | --- | --- |
| **PR required** | Yes | Yes |
| **Approvals required** | 1 | 1 |
| **Status checks** | Tests, Lint, Review Gate | Tests, Lint |
| **Require up to date** | Yes | Yes |
| **Auto-merge** | Squash | Squash |
| **Linear history** | Yes | No |
| **Restrict pushes** | Yes (team) | Optional |

---

## Next Steps

1. Configure branch protection rules as described above
2. Create test branch to verify protections work
3. Document any custom status checks in this file
4. Share configuration link with team members
5. Monitor initial PRs to ensure smooth workflow
