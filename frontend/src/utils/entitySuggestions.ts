/**
 * Generic entity suggestion parser and mappers.
 * Supports all 6 entity types: Station, Brand, Artist/DJ, Jingle, Draft, Universe.
 * Maintains backward compatibility with DJ_SUGGESTION blocks.
 */

export type EntityType =
  | "station"
  | "brand"
  | "artist"
  | "jingle"
  | "draft"
  | "universe";

export interface EntitySuggestion {
  entityType: EntityType;
  confidence: "high" | "medium" | "low";
  fields: Record<string, string>;
  aiGenerated: true;
}

export interface FormEntitySuggestion {
  type: EntityType;
  data: Record<string, string>;
  confidence: "high" | "medium" | "low";
}

/**
 * Parse generic ENTITY_SUGGESTION blocks from AI response.
 * Format:
 *   ENTITY_SUGGESTION
 *   type: station
 *   confidence: high
 *   name: Nebula FM
 *   frequency: 99.8
 *   genre: synthwave
 *   ...
 */
export const parseEntitySuggestions = (text: string): EntitySuggestion[] => {
  const suggestions: EntitySuggestion[] = [];
  const parts = text.split(/ENTITY_SUGGESTION/g);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const fields: Record<string, string> = {};
    let entityType: EntityType = "station"; // default
    let confidence: "high" | "medium" | "low" = "medium";

    for (const line of block.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (!key || !value) continue;

      if (key === "type") {
        entityType = (value as EntityType) || "station";
      } else if (key === "confidence") {
        confidence = (value as "high" | "medium" | "low") || "medium";
      } else {
        fields[key] = value;
      }
    }

    // Require at least a name or title to consider it valid
    const nameField = fields.name || fields.title;
    if (nameField) {
      suggestions.push({
        entityType,
        confidence,
        fields,
        aiGenerated: true,
      });
    }
  }

  return suggestions;
};

/**
 * Strip ENTITY_SUGGESTION blocks from text for display.
 * Returns text with all ENTITY_SUGGESTION blocks removed.
 */
export const stripEntitySuggestions = (text: string): string => {
  return text
    .replace(/\n?ENTITY_SUGGESTION[\s\S]*?(?=\n\n|\nENTITY_SUGGESTION|$)/g, "")
    .trim();
};

/**
 * Map entity suggestion fields to Station API payload.
 * Required: name, frequency, genre
 * Optional: mood, description, backstory, logo_url
 */
export const mapStationSuggestion = (
  fields: Record<string, string>,
): Record<string, string> => ({
  name: fields.name || "",
  frequency: fields.frequency || "",
  genre: fields.genre || "",
  mood: fields.mood || "",
  description: fields.description || "",
  backstory: fields.backstory || "",
  logo_url: fields.logo_url || "",
});

/**
 * Map entity suggestion fields to Brand API payload.
 * Required: name, industry
 * Optional: tagline, description, target_demographic, price_range, logo_url
 */
export const mapBrandSuggestion = (
  fields: Record<string, string>,
): Record<string, string> => ({
  name: fields.name || "",
  industry: fields.industry || "",
  tagline: fields.tagline || "",
  description: fields.description || "",
  target_demographic: fields.target_demographic || "",
  price_range: fields.price_range || "",
  logo_url: fields.logo_url || "",
});

/**
 * Map entity suggestion fields to Artist/DJ API payload.
 * Required: name
 * Optional: display_name, type, personality, speaking_style, voice_description, etc.
 */
export const mapArtistSuggestion = (
  fields: Record<string, string>,
  stationId?: string,
): Record<string, string> => ({
  name: fields.name || "",
  display_name: fields.display_name || fields.name || "",
  artist_type: ([
    "dj",
    "musician",
    "narrator",
    "host",
    "caller",
    "guest",
  ].includes(fields.type)
    ? fields.type
    : "dj") as string,
  bio: fields.backstory || fields.bio || "",
  personality: fields.personality || "",
  catchphrases: fields.catchphrases || "",
  speaking_style: fields.speaking_style || "",
  voice_description: fields.voice_description || "",
  genre: fields.genre || "",
  signature_sound: fields.signature_sound || "",
  ...(stationId && { station_id: stationId }),
});

/**
 * Map entity suggestion fields to Jingle API payload.
 * Required: title, description
 * Optional: mood, duration, lyrics_snippet, audio_url
 */
export const mapJingleSuggestion = (
  fields: Record<string, string>,
): Record<string, string> => ({
  title: fields.title || "",
  description: fields.description || "",
  mood: fields.mood || "",
  duration: fields.duration || "",
  lyrics_snippet: fields.lyrics_snippet || "",
  audio_url: fields.audio_url || "",
});

/**
 * Map entity suggestion fields to Draft/Track API payload.
 * Required: title
 * Optional: description, genre, mood, tempo, notes, audio_url
 */
export const mapDraftSuggestion = (
  fields: Record<string, string>,
): Record<string, string> => ({
  title: fields.title || "",
  description: fields.description || "",
  genre: fields.genre || "",
  mood: fields.mood || "",
  tempo: fields.tempo || "",
  notes: fields.notes || "",
  audio_url: fields.audio_url || "",
});

/**
 * Map entity suggestion fields to Universe API payload.
 * Required: name, description
 * Optional: setting, key_features, inspiration
 */
export const mapUniverseSuggestion = (
  fields: Record<string, string>,
): Record<string, string> => ({
  name: fields.name || "",
  description: fields.description || "",
  setting: fields.setting || "",
  key_features: fields.key_features || "",
  inspiration: fields.inspiration || "",
});

/**
 * Generic mapper that routes to the correct entity type mapper.
 */
export const mapSuggestionByType = (
  suggestion: EntitySuggestion,
  stationId?: string,
): Record<string, string> => {
  switch (suggestion.entityType) {
    case "station":
      return mapStationSuggestion(suggestion.fields);
    case "brand":
      return mapBrandSuggestion(suggestion.fields);
    case "artist":
      return mapArtistSuggestion(suggestion.fields, stationId);
    case "jingle":
      return mapJingleSuggestion(suggestion.fields);
    case "draft":
      return mapDraftSuggestion(suggestion.fields);
    case "universe":
      return mapUniverseSuggestion(suggestion.fields);
    default:
      return {};
  }
};

/**
 * Convert EntitySuggestion to FormEntitySuggestion for FormManager.
 * This is a simple format conversion between parser interface and form interface.
 */
export const toFormSuggestion = (
  suggestion: EntitySuggestion,
): FormEntitySuggestion => ({
  type: suggestion.entityType,
  data: suggestion.fields,
  confidence: suggestion.confidence,
});
