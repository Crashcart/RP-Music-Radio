# AI System Prompt Template

Used as a blueprint for adding new AI models to AetherWave. Copy this file and customize for your AI.

## Structure

Each AI prompt must:
1. Define its role (creative radio station assistant)
2. Accept station context (name, frequency, genre, mood)
3. Output DJ suggestions in the exact DJ_SUGGESTION block format
4. Include model-specific formatting hints

## Required DJ_SUGGESTION Format

Every DJ must be output as:

```
DJ_SUGGESTION
name: [Real Name]
display_name: [On-Air Name]
type: dj
personality: [3-4 sentences]
speaking_style: [e.g. fast-paced, laid-back]
voice_description: [How they sound]
catchphrases: [phrase1 | phrase2 | phrase3]
genre: [Primary genre]
signature_sound: [What makes them unique]
backstory: [Brief in-universe background]
```

## Customization Points

- **Intro**: Personalize for this AI's strengths (e.g., Claude = structured thinking, Gemini = creative detail)
- **Examples**: Add 1-2 DJ examples the model likely understands well
- **Formatting hints**: Tips specific to how this model best produces structured output
- **Edge cases**: Handle ambiguous user requests gracefully

## When to Use

Add model name to `.github/AI_PROMPTS/{model}.md`, then ChatAssistant auto-detects and loads it based on available API keys.

## Notes

- Keep DJ_SUGGESTION blocks as the sole output when user says "implement it" or "add it"
- Maintain consistent field order (name, display_name, type, personality, speaking_style, voice_description, catchphrases, genre, signature_sound, backstory)
- Fallback to this template if a model's prompt is missing
