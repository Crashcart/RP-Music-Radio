# CLAUDE.md — AI-Friendly Form Field Contract

**Last Updated**: 2026-05-02  
**Project**: AetherWave / RP-Music-Radio  
**Audience**: AI agents (ChatAssistant, automation systems, screen readers)

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

### Token Efficiency Principles

1. **Read First, Ask Later**
   - Use Read tool to access existing code before asking for changes
   - Avoid explaining what you're about to do if you already have the context
   - Don't re-read files you just edited (tools auto-verify)

2. **Parallel Operations**
   - When independent tasks can run simultaneously, batch them in a single tool call
   - Example: Run 3 grep commands in parallel, not sequentially
   - Reduces round-trip latency significantly

3. **Avoid Redundant Tool Calls**
   - Search once with comprehensive queries, don't search multiple times
   - Use grep/find with good patterns rather than making multiple passes
   - Combine related operations (e.g., grep + git in one Bash call)

4. **Direct to Solution**
   - Identify the actual problem, not the symptom
   - Make targeted edits rather than broad refactors
   - Document decisions in code comments only when WHY is non-obvious

5. **Scope Discipline**
   - Don't fix unrelated bugs while fixing a target bug
   - Don't add abstractions beyond what's required
   - Don't implement features for "what if" scenarios

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

### Token Budget Awareness

This codebase uses approximately:
- 150 tokens per 100 lines of code
- 100 tokens per Read tool call (averages)
- 50 tokens per simple Bash call
- 1000 tokens per context window compression

**Strategy**: Compress early and often. Use references to summaries rather than re-reading when context grows large.

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

**Last Reviewed**: 2026-05-02  
**Status**: ACTIVE  
**Owner**: Repository maintainers
