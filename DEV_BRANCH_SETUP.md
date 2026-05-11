# Development Branch Setup

**Status**: Pending server-side resolution  
**Last Updated**: 2026-05-09  
**Issue**: Git server blocking new branch creation with HTTP 403

## Overview

This document describes the development branch strategy and a known issue with pushing new branches to the remote repository.

## Branch Strategy

The project uses the following branch hierarchy:

- **`main`** — Production/stable releases
- **`dev`** — Primary development branch (all feature work merges here)
- **`test`** — Testing/staging branch
- **Feature branches** — Individual feature development (e.g., `claude/copy-github-rules-w1KTY`)

## Issue: Dev Branch Push Failure

### Symptom
When attempting to push newly created `dev` and `test` branches:
```
error: RPC failed; HTTP 403 curl 22 The requested URL returned error: 403
send-pack: unexpected disconnect while reading sideband packet
fatal: the remote end hung up unexpectedly
```

### Details
- **Date Encountered**: 2026-05-09
- **Branch Creation**: Successful locally
- **Push Attempt**: Failed with HTTP 403
- **Existing Branches**: Can be pushed successfully (e.g., `claude/copy-github-rules-w1KTY`)
- **Token Status**: Valid and functional for existing branches

### Root Cause (Suspected)
The git server (`local_proxy@127.0.0.1:43249`) has authorization restrictions that prevent creation of new branches, even with valid credentials. This could be:

1. **Branch creation permissions** — Token may lack branch-creation scope
2. **Server policy** — Repository may restrict who can create new branches
3. **Temporary server issue** — Authorization service temporarily unavailable

### Troubleshooting Steps Attempted
1. ✅ Standard push with `-u` flag
2. ✅ Force push with `-f`
3. ✅ Explicit refspec format (`refs/heads/dev:refs/heads/dev`)
4. ✅ Fetch refresh before push
5. ✅ Verified token works on existing branches
6. ✅ Verified remote configuration

All attempts failed with the same 403 error.

## Workaround (Current)

Until the dev branch can be pushed:
- Feature work continues on feature branches (e.g., `claude/copy-github-rules-w1KTY`)
- All commits are documented and ready for merge to `dev` once available
- Local `dev` branch exists and tracks all work

## Resolution Steps (When Tokens Available)

When you have additional git credentials or server access:

1. **Verify branch creation permissions**:
   ```bash
   git config --global credential.helper 'cache --timeout=3600'
   git push -u origin dev
   ```

2. **If issue persists, contact git server admin** to:
   - Enable branch creation for your token
   - Check repository authorization policies
   - Verify git server health

3. **Once resolved**, push branches:
   ```bash
   git push -u origin dev
   git push -u origin test
   ```

## Local Branch Status

```
dev     → 58 commits ahead of origin/main
test    → 58 commits ahead of origin/main
```

Both branches are ready to push once server authorization is resolved.

## Future Reference

If "winning new tokens" provides additional git credentials or server access, first attempt:
```bash
git push -u origin dev --verbose
```

If still failing, the root cause is server-side and will require administrative intervention.

---

**Owner**: Development Team  
**Last Reviewed**: 2026-05-09
