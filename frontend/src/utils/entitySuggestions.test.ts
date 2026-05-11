import { describe, it, expect } from "vitest";
import {
  parseEntitySuggestions,
  stripEntitySuggestions,
  mapStationSuggestion,
  mapBrandSuggestion,
  mapArtistSuggestion,
  mapJingleSuggestion,
  mapDraftSuggestion,
  mapUniverseSuggestion,
  mapSuggestionByType,
  type EntitySuggestion,
} from "./entitySuggestions";

/**
 * Comprehensive tests for entity suggestion parsing and mapping
 * Tests all 6 entity types: Station, Brand, Artist, Jingle, Draft, Universe
 */

describe("parseEntitySuggestions", () => {
  it("should parse single station ENTITY_SUGGESTION block", () => {
    const text = `
      ENTITY_SUGGESTION
      type: station
      confidence: high
      name: Nebula FM
      frequency: 94.2
      genre: synthwave
      mood: nostalgic
      description: Retro synthwave station
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].entityType).toBe("station");
    expect(suggestions[0].confidence).toBe("high");
    expect(suggestions[0].fields.name).toBe("Nebula FM");
    expect(suggestions[0].fields.frequency).toBe("94.2");
    expect(suggestions[0].fields.genre).toBe("synthwave");
    expect(suggestions[0].aiGenerated).toBe(true);
  });

  it("should parse multiple ENTITY_SUGGESTION blocks", () => {
    const text = `
      ENTITY_SUGGESTION
      type: station
      confidence: high
      name: Station 1
      frequency: 88.1
      genre: rock

      ENTITY_SUGGESTION
      type: brand
      confidence: medium
      name: Brand 1
      industry: electronics

      ENTITY_SUGGESTION
      type: artist
      confidence: high
      name: Artist 1
      artist_type: dj
      personality: Cool person
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].entityType).toBe("station");
    expect(suggestions[1].entityType).toBe("brand");
    expect(suggestions[2].entityType).toBe("artist");
  });

  it("should parse artist with pipe-separated catchphrases", () => {
    const text = `
      ENTITY_SUGGESTION
      type: artist
      confidence: high
      name: DJ Echo
      catchphrases: Keep it real|Spin it right|That's the vibe
      personality: Energetic and passionate
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fields.catchphrases).toBe(
      "Keep it real|Spin it right|That's the vibe",
    );
  });

  it("should handle missing optional fields", () => {
    const text = `
      ENTITY_SUGGESTION
      type: jingle
      confidence: medium
      title: Morning Bump
      description: Station ID jingle
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fields.title).toBe("Morning Bump");
    expect(suggestions[0].fields.mood).toBeUndefined();
  });

  it("should default to station type if not specified", () => {
    const text = `
      ENTITY_SUGGESTION
      confidence: high
      name: Default Station
      frequency: 99.9
      genre: pop
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions[0].entityType).toBe("station");
  });

  it("should default to medium confidence if not specified", () => {
    const text = `
      ENTITY_SUGGESTION
      type: brand
      name: Brand Name
      industry: tech
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions[0].confidence).toBe("medium");
  });

  it("should skip blocks without name or title", () => {
    const text = `
      ENTITY_SUGGESTION
      type: station
      frequency: 88.1
      genre: rock

      ENTITY_SUGGESTION
      type: artist
      name: Valid Artist
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fields.name).toBe("Valid Artist");
  });

  it("should handle whitespace-heavy blocks", () => {
    const text = `
      ENTITY_SUGGESTION


      type: station


      name: Spaced Station

      frequency: 77.7


      genre: jazz

    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fields.name).toBe("Spaced Station");
  });

  it("should parse universe ENTITY_SUGGESTION", () => {
    const text = `
      ENTITY_SUGGESTION
      type: universe
      confidence: high
      name: Cyberpunk 2087
      description: Near-future megacity
      setting: Year 2087
      key_features: AI, corporate power, resistance
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].entityType).toBe("universe");
    expect(suggestions[0].fields.name).toBe("Cyberpunk 2087");
  });

  it("should parse draft ENTITY_SUGGESTION", () => {
    const text = `
      ENTITY_SUGGESTION
      type: draft
      confidence: high
      title: Neon Streets
      description: Synthwave instrumental
      genre: synthwave
      tempo: 95
      mood: melancholic
    `;

    const suggestions = parseEntitySuggestions(text);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].entityType).toBe("draft");
    expect(suggestions[0].fields.tempo).toBe("95");
  });
});

describe("stripEntitySuggestions", () => {
  it("should remove ENTITY_SUGGESTION blocks from text", () => {
    const text = `Here's a station I created:
ENTITY_SUGGESTION
type: station
name: Cool FM
frequency: 99.9
genre: rock

I hope you like it!`;

    const stripped = stripEntitySuggestions(text);
    expect(stripped).not.toContain("ENTITY_SUGGESTION");
    expect(stripped).not.toContain("Cool FM");
    expect(stripped).toContain("I hope you like it!");
  });

  it("should handle multiple blocks", () => {
    const text = `First entity:
ENTITY_SUGGESTION
type: station
name: Station 1
frequency: 88.1
genre: rock

Second entity:
ENTITY_SUGGESTION
type: brand
name: Brand 1
industry: tech

Done!`;

    const stripped = stripEntitySuggestions(text);
    expect(stripped).not.toContain("ENTITY_SUGGESTION");
    expect(stripped).toContain("First entity:");
    expect(stripped).toContain("Second entity:");
    expect(stripped).toContain("Done!");
  });

  it("should trim whitespace", () => {
    const text = `
      ENTITY_SUGGESTION
      type: station
      name: Test
      frequency: 88.1
      genre: rock

    `;

    const stripped = stripEntitySuggestions(text);
    expect(stripped.trim()).toBe("");
  });
});

describe("Field Mapping Functions", () => {
  describe("mapStationSuggestion", () => {
    it("should map station fields correctly", () => {
      const fields = {
        name: "Nebula FM",
        frequency: "94.2",
        genre: "synthwave",
        mood: "nostalgic",
        description: "Retro station",
      };

      const mapped = mapStationSuggestion(fields);
      expect(mapped.name).toBe("Nebula FM");
      expect(mapped.frequency).toBe("94.2");
      expect(mapped.genre).toBe("synthwave");
      expect(mapped.mood).toBe("nostalgic");
    });

    it("should provide empty strings for missing required fields", () => {
      const fields = { genre: "rock" };
      const mapped = mapStationSuggestion(fields);
      expect(mapped.name).toBe("");
      expect(mapped.frequency).toBe("");
      expect(mapped.genre).toBe("rock");
    });
  });

  describe("mapBrandSuggestion", () => {
    it("should map brand fields correctly", () => {
      const fields = {
        name: "TechCorp",
        industry: "electronics",
        tagline: "Future tech today",
        price_range: "premium",
      };

      const mapped = mapBrandSuggestion(fields);
      expect(mapped.name).toBe("TechCorp");
      expect(mapped.industry).toBe("electronics");
      expect(mapped.tagline).toBe("Future tech today");
      expect(mapped.price_range).toBe("premium");
    });
  });

  describe("mapArtistSuggestion", () => {
    it("should map artist fields with dj type", () => {
      const fields = {
        name: "Marcus Chen",
        display_name: "DJ Chen",
        type: "dj",
        personality: "Cool person",
        voice_description: "Deep voice",
        catchphrases: "Keep it real|Spin it right",
      };

      const mapped = mapArtistSuggestion(fields);
      expect(mapped.name).toBe("Marcus Chen");
      expect(mapped.display_name).toBe("DJ Chen");
      expect(mapped.artist_type).toBe("dj");
      expect(mapped.personality).toBe("Cool person");
      expect(mapped.catchphrases).toBe("Keep it real|Spin it right");
    });

    it("should default to dj type if invalid", () => {
      const fields = {
        name: "Artist",
        type: "invalid_type",
      };

      const mapped = mapArtistSuggestion(fields);
      expect(mapped.artist_type).toBe("dj");
    });

    it("should accept valid artist types", () => {
      const validTypes = [
        "dj",
        "musician",
        "narrator",
        "host",
        "caller",
        "guest",
      ];

      for (const type of validTypes) {
        const mapped = mapArtistSuggestion({ name: "Test", type });
        expect(mapped.artist_type).toBe(type);
      }
    });

    it("should include station_id when provided", () => {
      const fields = { name: "Artist" };
      const mapped = mapArtistSuggestion(fields, "station-123");
      expect(mapped.station_id).toBe("station-123");
    });
  });

  describe("mapJingleSuggestion", () => {
    it("should map jingle fields correctly", () => {
      const fields = {
        title: "Morning Bump",
        description: "Energetic station ID",
        mood: "uplifting",
        duration: "15",
        lyrics_snippet: "Wake up!",
      };

      const mapped = mapJingleSuggestion(fields);
      expect(mapped.title).toBe("Morning Bump");
      expect(mapped.description).toBe("Energetic station ID");
      expect(mapped.mood).toBe("uplifting");
      expect(mapped.duration).toBe("15");
    });
  });

  describe("mapDraftSuggestion", () => {
    it("should map draft fields correctly", () => {
      const fields = {
        title: "Neon Streets",
        description: "Synthwave track",
        genre: "synthwave",
        mood: "nostalgic",
        tempo: "95",
        notes: "Vintage synths",
      };

      const mapped = mapDraftSuggestion(fields);
      expect(mapped.title).toBe("Neon Streets");
      expect(mapped.genre).toBe("synthwave");
      expect(mapped.tempo).toBe("95");
    });
  });

  describe("mapUniverseSuggestion", () => {
    it("should map universe fields correctly", () => {
      const fields = {
        name: "Cyberpunk 2087",
        description: "Near-future megacity",
        setting: "Year 2087",
        key_features: "AI, corporate power",
        inspiration: "Blade Runner, Cyberpunk",
      };

      const mapped = mapUniverseSuggestion(fields);
      expect(mapped.name).toBe("Cyberpunk 2087");
      expect(mapped.description).toBe("Near-future megacity");
      expect(mapped.setting).toBe("Year 2087");
    });
  });
});

describe("mapSuggestionByType", () => {
  it("should route station suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "station",
      confidence: "high",
      fields: { name: "Test Station", frequency: "88.1", genre: "rock" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.name).toBe("Test Station");
    expect(mapped.frequency).toBe("88.1");
  });

  it("should route brand suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "brand",
      confidence: "high",
      fields: { name: "TechCorp", industry: "electronics" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.name).toBe("TechCorp");
    expect(mapped.industry).toBe("electronics");
  });

  it("should route artist suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "artist",
      confidence: "high",
      fields: { name: "DJ Test", type: "dj" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.name).toBe("DJ Test");
  });

  it("should route artist suggestions with station context", () => {
    const suggestion: EntitySuggestion = {
      entityType: "artist",
      confidence: "high",
      fields: { name: "DJ Test", type: "dj" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion, "station-123");
    expect(mapped.station_id).toBe("station-123");
  });

  it("should route jingle suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "jingle",
      confidence: "high",
      fields: { title: "Jingle", description: "Test jingle" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.title).toBe("Jingle");
  });

  it("should route draft suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "draft",
      confidence: "high",
      fields: { title: "Track", description: "Test track" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.title).toBe("Track");
  });

  it("should route universe suggestions correctly", () => {
    const suggestion: EntitySuggestion = {
      entityType: "universe",
      confidence: "high",
      fields: { name: "Universe", description: "Test universe" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped.name).toBe("Universe");
  });

  it("should return empty object for unknown entity type", () => {
    const suggestion: EntitySuggestion = {
      entityType: "unknown" as any,
      confidence: "high",
      fields: { name: "Test" },
      aiGenerated: true,
    };

    const mapped = mapSuggestionByType(suggestion);
    expect(mapped).toEqual({});
  });
});

describe("End-to-End Parsing Workflows", () => {
  it("should parse and map station suggestion", () => {
    const aiResponse = `
      I created a station for you:
      ENTITY_SUGGESTION
      type: station
      confidence: high
      name: Rebel FM
      frequency: 91.5
      genre: punk
      description: Underground punk radio
    `;

    const suggestions = parseEntitySuggestions(aiResponse);
    expect(suggestions).toHaveLength(1);

    const mapped = mapSuggestionByType(suggestions[0]);
    expect(mapped.name).toBe("Rebel FM");
    expect(mapped.frequency).toBe("91.5");
    expect(mapped.genre).toBe("punk");
  });

  it("should parse multiple suggestions and map each", () => {
    const aiResponse = `
Here are 3 entities:

ENTITY_SUGGESTION
type: station
confidence: high
name: Station 1
frequency: 88.1
genre: rock

ENTITY_SUGGESTION
type: artist
confidence: high
name: DJ Rock
artist_type: dj
personality: Energetic

ENTITY_SUGGESTION
type: brand
confidence: medium
name: Brand 1
industry: music
    `;

    const suggestions = parseEntitySuggestions(aiResponse);
    expect(suggestions).toHaveLength(3);

    const mapped = suggestions.map((s) => mapSuggestionByType(s));
    expect(mapped[0].name).toBe("Station 1");
    expect(mapped[1].name).toBe("DJ Rock");
    expect(mapped[2].name).toBe("Brand 1");
  });

  it("should strip and parse simultaneously", () => {
    const aiResponse = `Let me create some entities for you.

ENTITY_SUGGESTION
type: station
confidence: high
name: Test Station
frequency: 95.0
genre: electronic

Hope you like this station!`;

    const suggestions = parseEntitySuggestions(aiResponse);
    const stripped = stripEntitySuggestions(aiResponse);

    expect(suggestions).toHaveLength(1);
    expect(stripped).toContain("Hope you like this station!");
    expect(stripped).not.toContain("ENTITY_SUGGESTION");
  });
});
