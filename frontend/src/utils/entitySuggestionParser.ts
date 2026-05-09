/**
 * Generic parser for ENTITY_SUGGESTION blocks from AI responses.
 * Supports multiple entity types: DJ, Jingle, Draft, Station, Brand, Universe
 */

export type EntityType =
  | "dj"
  | "jingle"
  | "draft"
  | "station"
  | "brand"
  | "universe";

export interface EntitySuggestion {
  type: EntityType;
  data: Record<string, string>;
  confidence?: "high" | "medium" | "low";
}

/**
 * Parse ENTITY_SUGGESTION blocks from AI response text.
 * Format (same structure for all entity types):
 *
 * ENTITY_SUGGESTION
 * type: dj
 * name: Vance Rikard
 * display_name: DJ Vex
 * personality: Mysterious synthwave enthusiast...
 * ...
 * ENTITY_SUGGESTION
 *
 * Returns array of parsed suggestions with all fields.
 */
export const parseEntitySuggestions = (
  text: string,
  entityType?: EntityType,
): EntitySuggestion[] => {
  const suggestions: EntitySuggestion[] = [];

  // Split on ENTITY_SUGGESTION sentinel
  const parts = text.split(/ENTITY_SUGGESTION/g);

  // parts[0] is text before first sentinel; skip it
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const fields: Record<string, string> = {};

    for (const line of block.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (key && value) {
        fields[key] = value;
      }
    }

    // Determine entity type from parsed data or function parameter
    let detectedType: EntityType =
      (fields["type"] as EntityType) || entityType || "dj";

    // Validate type is known
    const validTypes: EntityType[] = [
      "dj",
      "jingle",
      "draft",
      "station",
      "brand",
      "universe",
    ];
    if (!validTypes.includes(detectedType)) {
      detectedType = "dj"; // Default fallback
    }

    // Only add if we found at least a name/title
    if (fields["name"] || fields["title"]) {
      suggestions.push({
        type: detectedType,
        data: fields,
        confidence: fields["confidence"]
          ? (fields["confidence"] as "high" | "medium" | "low")
          : "high",
      });
    }
  }

  return suggestions;
};

/**
 * Parse DJ-specific suggestions (legacy format, for backward compatibility).
 * These use the old DJ_SUGGESTION sentinel.
 */
export const parseDJSuggestions = (text: string): EntitySuggestion[] => {
  const suggestions: EntitySuggestion[] = [];
  const parts = text.split(/DJ_SUGGESTION/g);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const fields: Record<string, string> = {};

    for (const line of block.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (key && value) {
        fields[key] = value;
      }
    }

    if (fields["name"]) {
      suggestions.push({
        type: "dj",
        data: {
          name: fields["name"] ?? "",
          display_name: fields["display_name"] ?? "",
          type: fields["type"] ?? "dj",
          personality: fields["personality"] ?? "",
          speaking_style: fields["speaking_style"] ?? "",
          voice_description: fields["voice_description"] ?? "",
          catchphrases: fields["catchphrases"] ?? "",
          genre: fields["genre"] ?? "",
          signature_sound: fields["signature_sound"] ?? "",
          backstory: fields["backstory"] ?? "",
        },
      });
    }
  }

  return suggestions;
};

/**
 * Strip entity suggestion blocks from visible text.
 * Removes both ENTITY_SUGGESTION and DJ_SUGGESTION blocks so they don't appear in chat.
 */
export const stripEntityBlocks = (text: string): string => {
  return text
    .replace(/ENTITY_SUGGESTION[\s\S]*?(?=\nENTITY_SUGGESTION|\s*$)/g, "")
    .replace(/DJ_SUGGESTION[\s\S]*?(?=\nDJ_SUGGESTION|\s*$)/g, "")
    .trim();
};
