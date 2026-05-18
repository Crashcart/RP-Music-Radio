# CLAUDE.md — AI-Friendly Form Field Contract + Claude Governance Rules

**Last Updated**: 2026-05-18  
**Version**: 4.0  
**Project**: AetherWave / RP-Music-Radio  
**Audience**: AI agents (ChatAssistant, automation systems, screen readers)  
**Status**: ACTIVE Governance File  
**Supplements**: `.github/copilot-instructions.md` v3.5 (Rules 1-13)

**IMPORTANT**: This document establishes Claude-specific governance rules and project-specific form field contracts. For general governance (Rules 1-13), see `.github/copilot-instructions.md`. For Claude-only rules, see this file (Rules 1.5, 12, 14, 15, 16, plus form field contract).

---

## Form Field Tagging Contract

All form fields across the application use semantic HTML attributes to enable AI systems and accessibility tools to understand and interact with forms reliably.

### Tagging Standard

Every form field MUST include these attributes:

```html
<label for="artist-name">Artist Name</label>
<input 
  id="artist-name"                      <!-- Unique, descriptive ID -->
  name="artist_name"                    <!-- API field name (snake_case) -->
  data-field="artist_name"              <!-- Maps to Artist.artist_name in DB -->
  data-section="identity"               <!-- Groups related fields -->
  data-type="artist"                    <!-- Entity being edited -->
  aria-label="Artist Name"              <!-- For screen readers + AI -->
  type="text"
  required
/>
```

### Attribute Meanings

| Attribute | Purpose | Format | Example |
|-----------|---------|--------|---------|
| `id` | Unique element ID | `kebab-case`, descriptive | `real-name` |
| `name` | Form field name | `snake_case`, API-compatible | `real_name` |
| `data-field` | Database column/API field | `snake_case` | `real_name` |
| `data-section` | Logical grouping | `snake_case` | `identity`, `music`, `lore` |
| `data-type` | Entity type | `singular, lowercase` | `artist`, `station`, `brand` |
| `aria-label` | Human-readable description | `Title Case` | `Real Name` |
| `type` | HTML5 input type | standard | `text`, `email`, `date`, `number` |

### Field Sections (data-section)

Forms are organized into semantic sections. AI systems use this to understand form structure:

**Artist Form:**
- `identity` — name, display_name, type (dj/host/musician)
- `personality` — personality traits, speaking_style, voice_description
- `quirks` — catchphrases, signature_sound
- `lore` — backstory, history
- `music` — genre, influences, signature_sound

**Station Form:**
- `identity` — name, frequency, call_letters
- `branding` — logo_url, color_primary
- `music` — genre, target_audience
- `lore` — backstory, market_position

**Brand Form:**
- `identity` — name, industry, tagline
- `market` — price_range, target_demographic
- `lore` — company_description, product_emphasis

### AI Targeting Pattern

When ChatAssistant proposes new entities, it uses `data-field` to map AI-generated data to form fields:

```python
# Gemini generates DJ data
dj_suggestion = {
    "artist_name": "Vance Rikard",
    "personality": "Mysterious synthwave enthusiast...",
    "voice_description": "Deep, laid-back",
    "catchphrases": "Keep it retro|Waves incoming"
}

# Frontend maps to form via data-field
for field_name, value in dj_suggestion.items():
    input_element = document.querySelector(f'[data-field="{field_name}"]')
    if input_element:
        input_element.value = value
```

### Example: Complete Artist Form

```html
<form>
  <!-- IDENTITY SECTION -->
  <section aria-label="Artist Identity">
    <label for="artist-name">Artist Name</label>
    <input 
      id="artist-name" name="artist_name" 
      data-field="artist_name" data-section="identity" data-type="artist"
      aria-label="Artist Name" type="text" required
    />

    <label for="display-name">Display Name</label>
    <input 
      id="display-name" name="display_name"
      data-field="display_name" data-section="identity" data-type="artist"
      aria-label="Display Name" type="text"
    />

    <label for="artist-type">Type</label>
    <select 
      id="artist-type" name="type"
      data-field="type" data-section="identity" data-type="artist"
      aria-label="Artist Type"
    >
      <option value="dj">DJ</option>
      <option value="host">Host</option>
      <option value="musician">Musician</option>
    </select>
  </section>

  <!-- PERSONALITY SECTION -->
  <section aria-label="Personality">
    <label for="personality">Personality</label>
    <textarea 
      id="personality" name="personality"
      data-field="personality" data-section="personality" data-type="artist"
      aria-label="Personality traits and quirks" placeholder="3-4 sentences..."
    ></textarea>

    <label for="voice-description">Voice Description</label>
    <textarea 
      id="voice-description" name="voice_description"
      data-field="voice_description" data-section="personality" data-type="artist"
      aria-label="Voice Description for audio synthesis" placeholder="How does this artist sound?"
    ></textarea>
  </section>

  <!-- QUIRKS SECTION -->
  <section aria-label="Quirks">
    <label for="catchphrases">Catchphrases</label>
    <input 
      id="catchphrases" name="catchphrases"
      data-field="catchphrases" data-section="quirks" data-type="artist"
      aria-label="Catchphrases (pipe-separated)" placeholder="Keep it retro|Waves incoming"
    />
  </section>

  <!-- LORE SECTION -->
  <section aria-label="Backstory">
    <label for="backstory">Backstory</label>
    <textarea 
      id="backstory" name="backstory"
      data-field="backstory" data-section="lore" data-type="artist"
      aria-label="DJ Backstory and history" placeholder="Tell the story of this DJ..."
    ></textarea>
  </section>
</form>
```

### AI-Generated Field Styling

When ChatAssistant stages a DJ with AI-generated data, fields are marked with `.form-ai-filled`:

```css
.form-ai-filled {
  background-color: rgba(251, 191, 36, 0.1);  /* Amber tint */
  border: 1px solid #fbbf24;
  position: relative;
}

.form-ai-filled::before {
  content: "AI-Generated";
  position: absolute;
  top: -20px;
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 600;
}
```

A warning banner above the form shows:
```
⚠️ AI-generated DJ. Please review and edit all fields before approving.
```

### Validation & Error Handling

All form fields are validated server-side via Pydantic schemas. Client-side errors are displayed with:

```html
<div class="form-field-error" aria-live="polite">
  Field error message here
</div>
```

### Accessibility Requirements

- ✅ All inputs have associated `<label>` elements
- ✅ All inputs have `aria-label` for screen readers
- ✅ All sections are `<section>` tags with `aria-label`
- ✅ Buttons have descriptive text (not just icons)
- ✅ Forms support keyboard navigation (Tab, Enter, Arrow keys)
- ✅ Form state changes announce via `aria-live="polite"`

### Testing AI Targeting

Verify a form is AI-friendly:

```bash
# 1. Open browser DevTools
# 2. Run in console:
document.querySelectorAll('[data-field]').forEach(el => {
  const field = el.getAttribute('data-field');
  const section = el.getAttribute('data-section');
  const type = el.getAttribute('data-type');
  const label = el.getAttribute('aria-label');
  console.log(`✓ ${field} (${section}) [${type}] → "${label}"`);
});

# 3. All form fields should print with data attributes
# 4. No field should print "null" or "undefined"
```

---

## Usage by ChatAssistant

When users ask ChatAssistant to "Create 3 DJs for this station":

1. **ChatAssistant receives station context** (name, frequency, genre)
2. **Gemini generates DJ data** with DJ_SUGGESTION blocks:
   ```
   DJ_SUGGESTION
   artist_name: Vance Rikard
   display_name: Vance
   type: dj
   personality: Mysterious synthwave enthusiast...
   voice_description: Deep, laid-back voice
   catchphrases: Keep it retro|Waves incoming
   backstory: Took over Nebula FM when...
   ```
3. **Frontend parses suggestions** and stages each DJ
4. **Form pre-fills via data-field mapping**:
   - Queries all `[data-field]` elements
   - Sets `.value` for inputs, `.textContent` for display-only
   - Marks fields with `.form-ai-filled` class
5. **User reviews** and approves/rejects

---

## 🤖 AI Agent Efficiency Guidelines

**Applies to**: Claude (all variants), other AI agents working on this codebase  
**Purpose**: Maximize productivity while minimizing token consumption (cost + latency)  
**Core Philosophy**: **Great code > Fast code**. Take longer if needed to use fewer tokens and produce sustainable, maintainable solutions. Token efficiency is about working smarter, not faster.

### The Efficiency Principle

**Token Efficiency ≠ Speed**
- ❌ Don't: Rush to code → Discover bugs → Re-read code → Fix → Re-test (token waste)
- ✅ Do: Read first → Plan → Code once → Test once (token efficiency)

**Sustainable Code**
- ❌ Don't: Write code that "works now" but creates technical debt
- ✅ Do: Write code that's efficient to maintain, test, and extend

**Metrics That Matter**
- Tokens per feature: Lower is better
- Lines changed per bug fix: Fewer is better  
- Test-to-code ratio: Comprehensive is better
- Time to review: Understandable code reviews faster
- Maintenance burden: Simple code costs less to maintain

---

### Rule 16: All User-Requested Tasks Must Be Planned Before Implementation (CRITICAL)

**REQUIREMENT**: Every task given by the user — whether a new feature, bug fix, refactor, documentation update, or investigation — MUST have a detailed plan documented in `.github/` BEFORE implementation begins. **NO EXCEPTIONS.**

**PLANNING DOCUMENTS**:
- Primary: `.github/TODO.md` — Add task with description, subtasks, effort estimate
- Secondary: `.github/PLANNING.md` — Document approach, decisions, dependencies
- Complex: `.github/{TASK_NAME}_PLAN.md` (e.g., FEATURE2_PLAN.md)

**PLAN REQUIREMENTS**:
1. Clear Objective — What problem does this solve? What's the user's intent?
2. Subtasks — Break into 3-5 concrete steps (not vague)
3. Database Schema Changes — If applicable, document new tables/columns
4. API Endpoints — If applicable, list routes with methods
5. Frontend Components — If applicable, list new files and integration points
6. Integration Points — How does this connect to existing systems?
7. Effort Estimate — Days/hours with breakdown per subtask
8. Dependencies — What must exist before this work starts?
9. Success Criteria — What does "done" look like?
10. Risks — Known blockers or technical challenges

**ENFORCEMENT**:
- ✅ ALLOWED: Start implementation immediately after plan is written and committed
- ❌ BLOCKED: Implementation without written plan in `.github/` files
- ✅ ALLOWED: Update plan during implementation as learnings emerge
- ✅ ALLOWED: Other AI agents to read, comment on, and edit plans

**CONSEQUENCE**: Attempting to implement without a documented plan = escalate to human and wait for plan approval before coding.

**APPLIES TO**: ALL tasks, including:
- New features and enhancements
- Bug fixes and debugging sessions
- Refactoring and code cleanup
- Documentation updates
- Performance investigations
- Security audits
- Integration testing
- Database migrations
- Configuration changes

**NO EXCEPTIONS**: Plan-first applies universally to every user directive.

---

### Rule 1.5: Session Work ONLY to Designated Branch (CRITICAL)

**REQUIREMENT**: All commits during an active session MUST push to the designated branch specified in the session header. NO exceptions for governance, documentation, or planning.

**SESSION BRANCH IDENTIFICATION**: Read session header at start for designated branch (e.g., `alpha`, `claude/issue-N`, etc.). This is the ONLY branch where session work is pushed. If unclear, STOP and ask human.

**ENFORCEMENT CHECKPOINT**: Before EVERY push, verify branch:
- Run: `git branch -vv`
- Confirm current branch matches session designation
- If wrong: `git checkout <correct-branch>` then push

**SCOPE**: Applies to ALL changes (code, governance files, documentation, planning)

**CONSEQUENCE**: Commits to wrong branch = blocker; must revert and re-push to correct branch

**RATIONALE**: Prevents accidental merges of unfinished work; keeps session work isolated until human review; ensures correct review gates

---

### Rule 12: Continuous PR Monitoring with Escalating Fixes (Never Stop at First Green)

**CORE PRINCIPLE**: When a PR has failures, continue working through ALL issues until the entire PR is ALL GREEN. Do NOT stop when one issue is fixed.

**MONITORING WINDOW**: 8 minutes maximum
- Check PR status **once per minute** (not continuously/obsessively)
- After 8 minutes, escalate remaining issues to human as blocker
- Rationale: Ensures progress without creating endless loops

**ESCALATION LEVELS**:
- **Jr** (Junior): Minor issues, 1-minute fix (docs, lint, config)
- **Sr** (Senior): Major issues, 5-30 min fix (code logic, architecture)
- **Cr** (Critical): Blockers, escalate to human (blocked dependencies, env issues)

**FIX WORKFLOW** (Per Issue):
1. Create/update subtask in `.github/TODO.md` with issue ID and severity
2. Document fix approach in `.github/PLANNING.md`
3. Implement fix on feature branch
4. Run full verification (build, test, lint, audit)
5. Commit with conventional prefix: `fix:`, `refactor:`, `docs:`
6. Push immediately
7. Update `.github/TODO.md` with completion status
8. Update `.github/PLANNING.md` with fix summary
9. Add PR comment: "Fixed [Jr-1, Sr-2] in cycle N"

**REPEAT UNTIL ALL GREEN**:
- After each fix, pause 1 minute for CI to update
- Immediately re-check ALL checks (not just the one you fixed)
- Check for regressions or newly revealed issues
- If ANY check still failing → continue to next issue
- If ALL checks green → verify stability, then STOP

**SUCCESS CRITERIA** — PR Ready to Merge Only When:
- ✅ All CI checks green (verify, build, test-frontend, test-backend, lint, audit, security)
- ✅ 0 failed checks (no red ✗)
- ✅ 0 blockers (mergeable_state = "clean")
- ✅ All issues fixed and documented in governance files
- ✅ PR comment added: "All checks passing — ready to merge"

---

### Rule 14: Autocompact Threshold for Multi-Session Stability

**REQUIREMENT**: Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` to trigger context compaction at 50% capacity instead of default 85%.

**PURPOSE**: 
- Prevents context window bloat in long-running sessions
- Enables cleaner handoffs between AI agents
- Avoids token exhaustion near 100% limit
- Maintains predictable compaction cycles

**CONFIGURATION**:
- **Global User Setting** (`~/.claude/settings.json`):
  ```json
  {
    "env": {
      "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
    }
  }
  ```
- **Project Setting** (`.claude/settings.json` in repo):
  ```json
  {
    "env": {
      "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
    }
  }
  ```

**VERIFICATION**:
- Run: `echo $CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- Expected output: `50`

**RATIONALE**: At 50% threshold, context compacts before reaching danger zone. Prevents bloat in long sessions with multiple agent handoffs.

---

### Rule 15: Claude-Only Credential Storage (Local Files Only)

**REQUIREMENT**: Store all sensitive credentials (GitHub tokens, API keys, etc.) **locally in user files only** — NEVER embed in git URLs, config files, or tracked repository files.

**STORAGE METHOD**:
- **GitHub tokens**: `~/.git-credentials` (local user file, not tracked by git)
- **API keys**: Environment variables or `.env.local` (git-ignored)
- **SSH keys**: `~/.ssh/` (local user directory)

**ENFORCEMENT**:
- ✅ DO: Store token in `~/.git-credentials`, use git credential helper
- ✅ DO: Store token in environment variable for runtime use
- ❌ DON'T: Embed token in git remote URL (e.g., `https://token@github.com/...`)
- ❌ DON'T: Commit token to `.git/config` or any config file
- ❌ DON'T: Store token in git history

**GIT CREDENTIAL HELPER**:
```bash
# Store token locally
cat > ~/.git-credentials <<'EOF'
https://x-access-token:YOUR_TOKEN@github.com
https://YOUR_TOKEN@github.com
EOF
chmod 600 ~/.git-credentials

# Git automatically uses it for all operations
git push origin branch  # No token visible in URL
```

**RATIONALE**: Other AI agents (ChatGPT, Copilot, etc.) do NOT have access to local `~/.git-credentials` files. Keeping credentials local-only ensures they remain Claude-exclusive.

---

### Best Practices for Excellent Code

**Before You Code** (Rule 16: Planning is Mandatory)
- [ ] **VERIFY PLAN EXISTS**: Every user-requested task MUST have a plan in `.github/` (TODO.md, PLANNING.md, or {TASK}_PLAN.md) BEFORE coding starts. See Rule 16 above for requirements.
- [ ] **Read the plan**: Understand objective, subtasks, dependencies, success criteria
- [ ] Read 2-3 similar functions to understand patterns in this codebase
- [ ] Identify the existing approach, not your preferred approach
- [ ] Ask: "What would someone familiar with this codebase write?"
- [ ] Plan the implementation (2-3 bullet points) — this is documented in `.github/`
- [ ] Identify test cases before writing code

**While You Code**
- [ ] Write for readability, not cleverness
- [ ] Use established patterns and conventions
- [ ] One logical change per commit
- [ ] Include tests alongside code (not after)
- [ ] Keep functions under 20 lines (refactor if longer)

**After You Code**
- [ ] Review your own code as if you didn't write it
- [ ] Check for edge cases: null checks, empty lists, error handling
- [ ] Verify database constraints match validation
- [ ] Run tests locally before committing
- [ ] Ensure error messages are user-friendly, not programmer-friendly

**Token Efficiency in Action**
- ✅ Spend 30 min reading before coding (saves 200 tokens on rework)
- ✅ Write one test per feature (saves 150 tokens on debugging)
- ✅ Keep functions small (saves 100 tokens on code review)
- ✅ Use established patterns (saves 75 tokens on design discussion)
- **Total savings: 525 tokens per feature** (compared to fast, buggy code)

### Token Efficiency Principles

1. **Read First, Ask Later**
   - Use Read tool to access existing code before asking for changes
   - Avoid explaining what you're about to do if you already have the context
   - Don't re-read files you just edited (tools auto-verify)
   - ✅ **Result**: Fewer context setup tokens, more focused work

2. **Parallel Operations**
   - When independent tasks can run simultaneously, batch them in a single tool call
   - Example: Run 3 grep commands in parallel, not sequentially
   - Reduces round-trip latency significantly
   - ✅ **Result**: 3x faster execution, same token budget

3. **Avoid Redundant Tool Calls**
   - Search once with comprehensive queries, don't search multiple times
   - Use grep/find with good patterns rather than making multiple passes
   - Combine related operations (e.g., grep + git in one Bash call)
   - ✅ **Result**: Fewer round-trips, more information per call

4. **Direct to Solution**
   - Identify the actual problem, not the symptom
   - Make targeted edits rather than broad refactors
   - Document decisions in code comments only when WHY is non-obvious
   - ✅ **Result**: Surgical changes, easier reviews, less debugging

5. **Scope Discipline**
   - Don't fix unrelated bugs while fixing a target bug (save for separate task)
   - Don't add abstractions beyond what's required (three similar lines is fine)
   - Don't implement features for "what if" scenarios
   - ✅ **Result**: Focused commits, clear intent, zero technical debt creep

### Context Management Strategy

When approaching a new task:

1. **Rapid Assessment** (Read + Bash)
   - Read relevant files to understand structure
   - Run grep/find to locate specific code
   - Identify exact location of changes needed

2. **Surgical Changes** (Edit only)
   - Make minimal, targeted edits
   - One logical change per commit
   - Update only what's necessary

3. **Test Verification** (Bash)
   - Run tests to confirm changes work
   - Don't assume; verify behavior
   - Fail fast on errors rather than proceeding

### Code Review as AI

When reviewing code you wrote:

- Focus on logic correctness, not style
- Check for edge cases (null checks, empty lists, error handling)
- Verify database constraints match schema validation
- Ensure error messages are user-friendly
- Look for missing try/except blocks around external APIs

### Performance Considerations for AIs

| Operation | Tokens | Time | Prefer When |
|-----------|--------|------|-------------|
| Read 2000 lines | ~1K | <100ms | Getting context, finding code |
| Bash find/grep | ~50 | <500ms | Searching, locating patterns |
| Bash full test | ~500 | 5-60s | Validating changes |
| Bash git operations | ~100 | <1s | Committing, pushing |
| Agent spawn | ~1K | 10-30s | Complex multi-step research |

**Guideline**: Use Read for code exploration, Bash for locating patterns, Agent only for irreducible complexity.

### Working with Large Codebases

1. **Leverage grep over Read**
   - `grep -r "pattern"` before reading full files
   - Find exact line numbers first
   - Read only the relevant sections

2. **Use Explore agent for discovery**
   - When searching for unknown file locations
   - When mapping dependencies across modules
   - When understanding codebase structure

3. **Chunked file reading**
   - Use `offset` and `limit` parameters for large files
   - Read 50-100 lines at a time around the target
   - Reduces token overhead for large files

### Commit Message Quality

Commits are small, focused, and describe the WHY:

```
fix: add IntegrityError handling for NOT NULL constraint

Artist.station_id cannot be null, but schema was allowing Optional[str].
Validate input and return helpful 400 error instead of 500 on constraint violation.

[Reference to context/issue if applicable]
```

Bad commits to avoid:
- "wip", "temp", "fix stuff"
- Changes that belong in separate commits bundled together
- Overly long messages that explain implementation details (that's what the code does)

### Great Code vs Fast Code

**The Paradox**: Taking time to understand and do things right USES FEWER TOKENS overall.

**Fast Code (❌ High Total Token Cost)**
```
Session 1: Write feature quickly (100 tokens)
  → Introduce bugs
Session 2: Debug and fix (150 tokens)
  → Design issues surface
Session 3: Refactor architecture (200 tokens)
  → Edge cases missed
Session 4: Security audit and fixes (180 tokens)
  → Performance problem found
Session 5: Optimize and fix (140 tokens)
─────────────────────────────
TOTAL: 770 tokens over 5 sessions
RESULT: Fragile, hard to maintain
```

**Great Code (✅ Lower Total Token Cost)**
```
Session 1: Read existing patterns (50 tokens)
         Plan design (30 tokens)
         Implement correctly (80 tokens)
         Write comprehensive tests (40 tokens)
         Document decisions (20 tokens)
─────────────────────────────
TOTAL: 220 tokens in 1 session
RESULT: Sustainable, tested, documented
NO future debug/fix sessions needed
```

**Why Great Code Uses Fewer Tokens**:
1. **Less context switching** - One focused session vs multiple re-reads
2. **Fewer bugs** - Proper implementation means no debug cycles
3. **Easier reviews** - Clean code reviews faster (fewer clarifying questions)
4. **Lower maintenance** - No technical debt to repay
5. **Confidence in changes** - Less uncertainty = less re-verification

**Guideline**: If a feature will take 4 hours to implement correctly vs 2 hours to hack, and there's any chance of bugs → do it right. Token math favors quality.

---

### Token Budget Awareness

This codebase uses approximately:
- 150 tokens per 100 lines of code
- 100 tokens per Read tool call (averages)
- 50 tokens per simple Bash call
- 1000 tokens per context window compression

**Strategy**: Compress early and often. Use references to summaries rather than re-reading when context grows large. Prioritize getting it right the first time over shipping fast.

---

## Multi-AI Governance

**For Human Operators**: Configure each AI agent with their own instance of this file with role-specific guidance:

```
/home/user/RP-Music-Radio/CLAUDE_<AGENT_NAME>.md
```

**Example**:
- `CLAUDE_CLAUDE.md` → Main development AI (this file)
- `CLAUDE_REVIEWER.md` → Code review AI (stricter rules)
- `CLAUDE_DOCS.md` → Documentation AI (verbose allowed)

Each AI follows their governance rules independently. Coordinating prompts should reference the appropriate rules file.

---

## Future Extensions

- [ ] Extend `data-field` tagging to other entity types (Jingles, Brands, Stations)
- [ ] Add `data-validation` for client-side rule expression (e.g., `min-length:3`)
- [ ] Support `data-enum` for restricted choice fields
- [ ] Document form field dependencies (e.g., "if type=musician, require genre")

---

**Last Reviewed**: 2026-05-18  
**Status**: ACTIVE Governance File (Protected)  
**Owner**: Repository maintainers  
**Editor**: Claude AI agents  
**Related Files**: `.github/copilot-instructions.md`, `.github/PLANNING.md`, `.github/TODO.md`
