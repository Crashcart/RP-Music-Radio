# Log Archive

This directory stores pure logs from development sessions for multi-AI and developer review.

## Purpose

Enable other AI agents and developers to analyze logs directly without manual passing or re-sending. This shared archive helps coordinate debugging across multiple AIs and sessions.

## Format

- **Filename**: `{YYYY-MM-DD}-{type}-{description}.{log|txt}`
  - Example: `2026-05-09-error-api-startup-deadlock.log`
  - Example: `2026-05-09-test-failed-chat-component.txt`
  - Example: `2026-05-08-docker-build-output.log`
- **Content**: Pure/original text from the output (no markdown, no formatting, no sanitization—exactly as received)
- **Purpose**: Preserve full context for analysis by other AIs and developers

## What to Archive

Archive when:
- Error stack traces (full output)
- Build/test failures (complete output)
- API responses (full JSON/XML)
- Docker logs (complete container output)
- Git/shell command outputs (when substantive)
- Any log >5 lines or representing a failure/blocker

Do NOT archive:
- Single-line status messages ("✅ tests passed")
- Sensitive data (API keys, passwords)—sanitize first
- Duplicate logs

## How to Reference

In documentation:
```markdown
See `.github/logs/2026-05-09-error-api-startup.log` for full error output
```

In PR comments:
```
Full build output in [logs/2026-05-08-docker-build.log](.github/logs/2026-05-08-docker-build.log)
```

In PLANNING.md:
```markdown
**Blocker**: Docker image build failed (see logs/2026-05-08-docker-build-output.log)
```

## Governance

See Rule 13 in `.github/copilot-instructions.md` for full requirements.

---

**Last Updated**: 2026-05-09  
**Related Rule**: Rule 13 (Log Archiving for Multi-AI Access)
