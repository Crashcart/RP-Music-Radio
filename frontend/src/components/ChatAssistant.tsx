import { useState, useRef, useEffect } from "react";
import { api, type Station } from "../api/client";
import {
  parseEntitySuggestions,
  mapSuggestionByType,
  type EntitySuggestion,
} from "../utils/entitySuggestions";
import { EntitySuggestionCard } from "./EntitySuggestionCard";
import { FormPreviewDialog } from "./FormPreviewDialog";
import {
  useFormManager,
  requiresFormPreview,
  normalizeEntityType,
} from "../context/FormManagerContext";
import type { EntitySuggestion as EntitySuggestionNew } from "../utils/entitySuggestionParser";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  proposal?: {
    action: string;
    entity: "station" | "brand" | "artist";
    data: Record<string, string>;
  };
  proposalStatus?: "pending" | "success" | "error";
  djSuggestions?: DJSuggestion[];
  djStagingStatuses?: Record<number, "idle" | "staging" | "staged" | "error">;
  djEditingIndex?: number | null;
  djEditingData?: Record<string, string>;
  entitySuggestions?: EntitySuggestion[];
  entityStagingStatuses?: Record<
    number,
    "idle" | "staging" | "staged" | "error"
  >;
}

/** Parsed fields from a DJ_SUGGESTION block in the AI response. */
interface DJSuggestion {
  name: string;
  display_name: string;
  type: string;
  personality: string;
  speaking_style: string;
  voice_description: string;
  catchphrases: string;
  genre: string;
  signature_sound: string;
  backstory: string;
  [key: string]: string;
}

const SYSTEM_INTRO =
  "Hi! I'm AetherWave's AI assistant. I can help you brainstorm station concepts, create DJ personas, design fictional brands, and build your radio universe. What would you like to create?";

const parseApiError = (error: string): string => {
  if (error.includes("RESOURCE_EXHAUSTED") || error.includes("quota")) {
    return "Google API quota exceeded. Try again in a few moments, or upgrade your plan.";
  }
  if (
    error.includes("API key") ||
    error.includes("401") ||
    error.includes("unauthorized")
  ) {
    return "API key is missing or invalid. Check your API key in Settings.";
  }
  if (error.includes("timeout")) {
    return "Request timed out. Try again in a moment.";
  }
  if (error.includes("rate limit")) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  return "Something went wrong. Please try again.";
};

/**
 * Parse DJ_SUGGESTION blocks from Gemini's response text.
 *
 * Each block has the form:
 *   ```
 *   DJ_SUGGESTION
 *   name: Zara Vex
 *   display_name: DJ Vex
 *   ...
 *   ```
 * Tolerant of extra blank lines and whitespace within blocks.
 */
const parseDJSuggestions = (text: string): DJSuggestion[] => {
  const suggestions: DJSuggestion[] = [];
  // Split on DJ_SUGGESTION sentinel — handles leading/trailing whitespace
  const parts = text.split(/DJ_SUGGESTION/g);
  // parts[0] is text before the first sentinel; skip it
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
      });
    }
  }
  return suggestions;
};

/**
 * Build the station-aware system prompt injected into each chat message.
 * Guides AI in generating properly structured entity suggestions for all 6 types.
 */
const buildSystemPrompt = (
  currentStationId: string | undefined,
  selectedStation: Station | null,
): string => {
  let prompt =
    "You are AetherWave AI, a creative assistant for building fictional radio stations. " +
    "Help users brainstorm stations, DJs, brands, jingles, tracks, and universes. " +
    "When asked to create entities, respond ONLY with structured suggestion blocks (no explanations).";

  // Phase 4: Detailed entity-specific generation guidance
  prompt += `

=== ENTITY GENERATION FORMATS ===

You can generate 6 entity types. For each, use ENTITY_SUGGESTION blocks with these REQUIRED fields:

STATION: name, frequency (99.5-107.9), genre
  Optional: mood, description, backstory, call_letters, era, broadcast_style
  Tips: Make frequency realistic. Include era (80s, 90s, modern, future). Describe station personality.
  Example:
  ENTITY_SUGGESTION
  type: station
  confidence: high
  name: Rebel Radio
  frequency: 88.3
  genre: punk
  mood: rebellious
  era: 1980s
  description: Underground punk station fighting the establishment
  backstory: Founded by a collective of musicians in a basement

BRAND: name, industry (required)
  Optional: tagline, description, price_range (budget, mid-range, premium, luxury), target_demographic
  Tips: Include clear industry (music, electronics, fashion, automotive, etc.). Price range adds authenticity.
  Example:
  ENTITY_SUGGESTION
  type: brand
  confidence: high
  name: NeonCore
  industry: electronics
  tagline: Future tech. Today.
  price_range: premium
  target_demographic: tech enthusiasts, cyberpunk fans
  description: Cutting-edge electronics brand with retro-futuristic design

ARTIST/DJ: name (required)
  Optional: display_name, artist_type (dj|host|musician|narrator|caller|guest), personality, speaking_style, voice_description, catchphrases, genre, signature_sound, backstory
  Tips: Personality should be 2-4 vivid sentences. Voice description helps TTS. Catchphrases separated by pipes (|).
  Example:
  ENTITY_SUGGESTION
  type: artist
  confidence: high
  name: Marcus Chen
  display_name: DJ Chen
  artist_type: dj
  personality: Smooth operator with dry wit. Always has a story about the underground scene. Surprisingly philosophical about music.
  voice_description: Deep, warm voice with slight accent. Deliberate pacing. Laughs often.
  catchphrases: Keep it real|Spin it right|That's the vibe
  genre: hip-hop
  signature_sound: Vintage soul samples over modern beats

JINGLE: title, description (required)
  Optional: mood, duration (in seconds, typical: 5-30), lyrics_snippet, audio_url
  Tips: Keep title catchy. Description should indicate mood and use. Duration helps production.
  Example:
  ENTITY_SUGGESTION
  type: jingle
  confidence: high
  title: Electric Morning Bump
  description: Energetic station ID for morning shows. Synthesizer-driven with vocal hook.
  mood: energetic, uplifting
  duration: 15
  lyrics_snippet: Electric morning, let's go!

DRAFT (Track/Content): title (required)
  Optional: description, genre, mood, tempo (BPM), notes, audio_url
  Tips: Tempo in BPM (60-180 typical). Notes field is great for production hints or inspiration.
  Example:
  ENTITY_SUGGESTION
  type: draft
  confidence: high
  title: Neon Streets
  description: Instrumental synthwave with lo-fi production. Perfect for late-night radio.
  genre: synthwave
  mood: melancholic, nostalgic
  tempo: 95
  notes: Vintage Korg synthesizers. Tape saturation. Vinyl crackle texture.

UNIVERSE (World/Setting): name, description (required)
  Optional: setting, key_features, inspiration
  Tips: Universe is the fictional world containing stations/characters. Description should be 2-3 sentences.
  Example:
  ENTITY_SUGGESTION
  type: universe
  confidence: high
  name: Cyberpunk 2087
  description: Near-future megacity with AI, corporate dominance, and underground resistance movements.
  setting: Year 2087, Earth megacities
  key_features: AI consciousness, corporate power, underground networks
  inspiration: Blade Runner, Cyberpunk 2077, Ghost in the Shell

=== CRITICAL RULES ===
1. Output ONLY ENTITY_SUGGESTION blocks. No explanations, no preamble, no postamble.
2. Each block = one entity. Multiple blocks OK in single response.
3. confidence: high (fully developed), medium (partial details), low (rough sketch)
4. Required fields are mandatory. Skip optional fields if you don't have good data.
5. Field format: key: value (no quotes needed)
6. Pipes (|) separate list items: phrase1 | phrase2 | phrase3
7. Always end with a blank line after each block`;

  if (currentStationId && selectedStation) {
    prompt += `

=== CURRENT CONTEXT ===
Station: "${selectedStation.name}"${
      selectedStation.frequency ? ` (${selectedStation.frequency})` : ""
    }${selectedStation.genre ? `, ${selectedStation.genre}` : ""}

When creating entities for this station, maintain consistency with its vibe and genre.`;
  } else {
    prompt += `

=== NO STATION CONTEXT ===
User is not editing a specific station. Generate universes, standalone brands, or generic tracks.`;
  }

  return prompt;
};

interface ChatAssistantProps {
  onEntityCreated?: () => void;
  currentStationId?: string;
  selectedStation?: Station | null;
}

export function ChatAssistant({
  onEntityCreated,
  currentStationId,
  selectedStation = null,
}: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: SYSTEM_INTRO },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form preview dialog state
  const [selectedSuggestionForPreview, setSelectedSuggestionForPreview] =
    useState<EntitySuggestionNew | null>(null);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const formManager = useFormManager();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(currentStationId, selectedStation);
      const data = await api.chat({
        message: text,
        system_prompt: systemPrompt,
        history: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
      });

      const replyText: string = data.reply ?? "";
      const djSuggestions = parseDJSuggestions(replyText);
      const entitySuggestions = parseEntitySuggestions(replyText);

      // Strip both DJ_SUGGESTION and ENTITY_SUGGESTION blocks from visible reply
      let visibleReply = replyText;
      if (djSuggestions.length > 0) {
        visibleReply = visibleReply.replace(
          /DJ_SUGGESTION[\s\S]*?(?=\nDJ_SUGGESTION|\s*$)/g,
          "",
        );
      }
      if (entitySuggestions.length > 0) {
        visibleReply = visibleReply.replace(
          /ENTITY_SUGGESTION[\s\S]*?(?=\nENTITY_SUGGESTION|\s*$)/g,
          "",
        );
      }
      visibleReply = visibleReply.trim();

      const newMsg: ChatMessage = {
        role: "assistant",
        content: visibleReply,
        proposal: data.proposal,
        proposalStatus: data.proposal ? "pending" : undefined,
        djSuggestions: djSuggestions.length > 0 ? djSuggestions : undefined,
        djStagingStatuses:
          djSuggestions.length > 0
            ? Object.fromEntries(djSuggestions.map((_, idx) => [idx, "idle"]))
            : undefined,
        entitySuggestions:
          entitySuggestions.length > 0 ? entitySuggestions : undefined,
        entityStagingStatuses:
          entitySuggestions.length > 0
            ? Object.fromEntries(
                entitySuggestions.map((_, idx) => [idx, "idle"]),
              )
            : undefined,
      };
      setMessages((prev) => [...prev, newMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed";
      const userFriendlyMsg = parseApiError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${userFriendlyMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /** Open edit modal for a DJ suggestion */
  const handleEditDJ = (
    msgIndex: number,
    djIndex: number,
    suggestion: DJSuggestion,
  ) => {
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djEditingIndex: djIndex,
        djEditingData: { ...suggestion },
      };
      return copy;
    });
  };

  /** Cancel editing and clear edit state */
  const handleCancelEditDJ = (msgIndex: number) => {
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djEditingIndex: null,
        djEditingData: undefined,
      };
      return copy;
    });
  };

  /** Update a field in the edit form */
  const handleEditFieldChange = (
    msgIndex: number,
    field: string,
    value: string,
  ) => {
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djEditingData: {
          ...copy[msgIndex].djEditingData,
          [field]: value,
        },
      };
      return copy;
    });
  };

  /** Map AI DJ suggestion to artist payload, handling field name transformations. */
  const mapSuggestionToArtistPayload = (
    editedData: Record<string, string>,
  ) => ({
    name: editedData.name,
    display_name: editedData.display_name || editedData.name,
    artist_type: ([
      "dj",
      "musician",
      "narrator",
      "host",
      "caller",
      "guest",
    ].includes(editedData.type)
      ? editedData.type
      : "dj") as string,
    station_id: currentStationId,
    bio: editedData.backstory, // Note: backstory maps to bio in API
    personality: editedData.personality,
    catchphrases: editedData.catchphrases,
    speaking_style: editedData.speaking_style,
    voice_description: editedData.voice_description,
    genre: editedData.genre,
    signature_sound: editedData.signature_sound,
  });

  /** Stage a DJ with edited data */
  const handleStageDJWithEdits = async (
    msgIndex: number,
    djIndex: number,
    editedData: Record<string, string>,
  ) => {
    if (!currentStationId) return;

    // Validate required fields
    if (!editedData.name?.trim()) {
      alert("DJ name is required");
      return;
    }

    // Mark as staging (but preserve edit state in case of error)
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djStagingStatuses: {
          ...copy[msgIndex].djStagingStatuses,
          [djIndex]: "staging",
        },
      };
      return copy;
    });

    try {
      await api.stageArtist(mapSuggestionToArtistPayload(editedData));

      // Only clear edit state on successful staging
      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          djStagingStatuses: {
            ...copy[msgIndex].djStagingStatuses,
            [djIndex]: "staged",
          },
          djEditingIndex: null,
          djEditingData: undefined,
        };
        return copy;
      });

      // Notify parent (Stations page) to refresh its pending DJs section
      if (onEntityCreated) {
        onEntityCreated();
      }
    } catch (err: unknown) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          djStagingStatuses: {
            ...copy[msgIndex].djStagingStatuses,
            [djIndex]: "error",
          },
        };
        return copy;
      });

      const errMsg = err instanceof Error ? err.message : "Unknown error";
      // Surface user-friendly error — rate limit is the most common failure
      if (
        errMsg.includes("429") ||
        errMsg.includes("Rate limit") ||
        errMsg.includes("Too many")
      ) {
        alert(
          "Rate limit: too many pending DJs. Approve or reject existing drafts first.",
        );
      } else {
        alert(`Failed to stage DJ: ${errMsg}`);
      }
    }
  };

  /** Stage a single AI-suggested DJ without editing */
  const handleStageDJ = async (
    msgIndex: number,
    djIndex: number,
    suggestion: DJSuggestion,
  ) => {
    handleStageDJWithEdits(msgIndex, djIndex, suggestion);
  };

  /** Stage a generic entity suggestion (Station, Brand, Jingle, Draft, Universe) */
  const handleStageEntity = async (
    msgIndex: number,
    entityIndex: number,
    suggestion: EntitySuggestion,
  ) => {
    const payload = mapSuggestionByType(suggestion, currentStationId);

    // Mark as staging
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        entityStagingStatuses: {
          ...copy[msgIndex].entityStagingStatuses,
          [entityIndex]: "staging",
        },
      };
      return copy;
    });

    try {
      const { entityType } = suggestion;

      // Route to appropriate staging endpoint
      if (entityType === "station") {
        await api.stageStation(payload);
      } else if (entityType === "brand") {
        await api.stageBrand(payload);
      } else if (entityType === "artist") {
        await api.stageArtist(payload);
      } else if (entityType === "jingle") {
        await api.stageJingle(payload);
      } else if (entityType === "draft") {
        await api.stageDraft(payload);
      } else if (entityType === "universe") {
        await api.stageUniverse(payload);
      }

      // Mark as staged on success
      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          entityStagingStatuses: {
            ...copy[msgIndex].entityStagingStatuses,
            [entityIndex]: "staged",
          },
        };
        return copy;
      });

      if (onEntityCreated) {
        onEntityCreated();
      }
    } catch (err: unknown) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          entityStagingStatuses: {
            ...copy[msgIndex].entityStagingStatuses,
            [entityIndex]: "error",
          },
        };
        return copy;
      });

      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const entityLabel =
        suggestion.entityType.charAt(0).toUpperCase() +
        suggestion.entityType.slice(1);

      if (
        errMsg.includes("429") ||
        errMsg.includes("Rate limit") ||
        errMsg.includes("Too many")
      ) {
        alert(
          `Rate limit: too many pending ${suggestion.entityType}s. Approve or reject existing drafts first.`,
        );
      } else if (errMsg.includes("422") || errMsg.includes("validation")) {
        alert(
          `Validation error: ${entityLabel} data is incomplete. Please review the suggestion.`,
        );
      } else {
        alert(`Failed to stage ${entityLabel}: ${errMsg}`);
      }
    }
  };

  /** Reject/discard a staged entity suggestion */
  const handleRejectEntity = (msgIndex: number, entityIndex: number) => {
    setMessages((prev) => {
      const copy = [...prev];
      const msg = copy[msgIndex];
      if (msg.entitySuggestions) {
        msg.entitySuggestions = msg.entitySuggestions.filter(
          (_, idx) => idx !== entityIndex,
        );
        if (msg.entitySuggestions.length === 0) {
          msg.entitySuggestions = undefined;
          msg.entityStagingStatuses = undefined;
        } else {
          // Rebuild staging statuses for remaining entities
          msg.entityStagingStatuses = Object.fromEntries(
            msg.entitySuggestions.map((_, idx) => [
              idx,
              msg.entityStagingStatuses?.[idx] ?? "idle",
            ]),
          );
        }
      }
      return copy;
    });
  };

  /**
   * Handle opening a form for an entity suggestion.
   * Shows FormPreviewDialog for major entities (Station, Brand, Universe).
   * Auto-opens form for quick-creates (DJ, Jingle, Draft).
   */
  const handleOpenFormForEntity = async (
    suggestion: EntitySuggestion,
  ): Promise<void> => {
    // Normalize so "dj", "host", "musician" etc. all map to "artist"
    const entityType = normalizeEntityType(suggestion.entityType);

    // Convert to new format for FormManager
    const newFormatSuggestion: EntitySuggestionNew = {
      type: entityType as any,
      data: suggestion.fields,
      confidence: suggestion.confidence,
    };

    // Check if this entity type requires preview dialog
    const needsPreview = requiresFormPreview(entityType);

    if (needsPreview) {
      // Show preview dialog for major entities
      setSelectedSuggestionForPreview(newFormatSuggestion);
      setShowFormPreview(true);
    } else {
      // Auto-open form for quick-creates
      setPreviewLoading(true);
      try {
        formManager.openForm({
          entityType,
          initialData: suggestion.fields,
          aiGenerated: true,
          sourceUniverse: currentStationId,
        });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  /**
   * Handle form preview confirmation.
   * Called when user confirms in FormPreviewDialog.
   */
  const handleFormPreviewConfirm = async (): Promise<void> => {
    if (!selectedSuggestionForPreview) return;

    setPreviewLoading(true);
    try {
      formManager.openForm({
        entityType: normalizeEntityType(selectedSuggestionForPreview.type),
        initialData: selectedSuggestionForPreview.data,
        aiGenerated: true,
        sourceUniverse: currentStationId,
      });
      setShowFormPreview(false);
      setSelectedSuggestionForPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  /**
   * Handle form preview cancellation.
   */
  const handleFormPreviewCancel = (): void => {
    setShowFormPreview(false);
    setSelectedSuggestionForPreview(null);
  };

  /** Confirm a manual proposal (existing Station / Brand / Artist creation flow). */
  const confirmProposal = async (
    index: number,
    proposal: NonNullable<ChatMessage["proposal"]>,
  ) => {
    try {
      if (proposal.entity === "station") {
        await api.createStation(proposal.data);
      } else if (proposal.entity === "brand") {
        await api.createBrand(proposal.data);
      } else if (proposal.entity === "artist") {
        await api.createArtist(proposal.data);
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], proposalStatus: "success" };
        return copy;
      });
      if (onEntityCreated) {
        onEntityCreated();
      }
    } catch (err: unknown) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], proposalStatus: "error" };
        return copy;
      });

      const entityName =
        proposal.entity.charAt(0).toUpperCase() + proposal.entity.slice(1);
      let message = `Couldn't create the ${entityName}.`;

      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.includes("Network")) {
        message = "Network error. Check your connection and try again.";
      } else if (errMsg.includes("429") || errMsg.includes("quota")) {
        message = "API quota exceeded. Wait a moment and try again.";
      } else if (errMsg.includes("409") || errMsg.includes("already exists")) {
        message = `A ${proposal.entity} with this name already exists.`;
      }

      alert(message);
    }
  };

  if (!open) {
    return (
      <button
        className="chat-toggle"
        onClick={() => setOpen(true)}
        title="AI Assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>
          ✨ AetherWave AI
          {currentStationId && selectedStation && (
            <span
              style={{
                fontSize: "0.75em",
                fontWeight: "normal",
                color: "var(--text-secondary)",
                marginLeft: "0.5em",
              }}
            >
              — {selectedStation.name}
            </span>
          )}
        </h3>
        <button className="chat-close" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, msgIdx) => (
          <div key={msgIdx} className={`chat-message ${msg.role}`}>
            {msg.content}

            {/* Structured DJ suggestion cards with edit modal */}
            {msg.djSuggestions && msg.djSuggestions.length > 0 && (
              <div style={{ marginTop: "var(--space-md)" }}>
                {msg.djSuggestions.map((dj, djIdx) => {
                  const status = msg.djStagingStatuses?.[djIdx] ?? "idle";
                  const isEditing = msg.djEditingIndex === djIdx;
                  const editData = msg.djEditingData || {};

                  if (isEditing) {
                    // Edit form for AI-generated DJ
                    return (
                      <div
                        key={djIdx}
                        style={{
                          marginBottom: "var(--space-sm)",
                          padding: "var(--space-md)",
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        <h4
                          style={{
                            marginTop: 0,
                            marginBottom: "var(--space-md)",
                          }}
                        >
                          Edit DJ: {editData.display_name || editData.name}
                        </h4>

                        {/* Identity Section */}
                        <div
                          style={{
                            marginBottom: "var(--space-lg)",
                            paddingBottom: "var(--space-lg)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <h5
                            style={{
                              fontSize: "0.9em",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-secondary)",
                              marginBottom: "var(--space-sm)",
                            }}
                          >
                            Identity
                          </h5>
                          <div
                            style={{ display: "grid", gap: "var(--space-sm)" }}
                          >
                            <div>
                              <label
                                htmlFor={`dj-edit-name-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Real Name *
                              </label>
                              <input
                                id={`dj-edit-name-${msgIdx}`}
                                type="text"
                                value={editData.name || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                data-field="name"
                                data-section="identity"
                                data-type="artist"
                                aria-label="Real Name (required)"
                                required
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: !editData.name?.trim()
                                    ? "1px solid var(--error-color, #f87171)"
                                    : "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                              {!editData.name?.trim() && (
                                <span
                                  style={{
                                    fontSize: "0.75em",
                                    color: "var(--error-color, #f87171)",
                                    display: "block",
                                    marginTop: "0.25em",
                                  }}
                                >
                                  Name is required
                                </span>
                              )}
                            </div>
                            <div>
                              <label
                                htmlFor={`dj-edit-display-name-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                On-Air Name
                              </label>
                              <input
                                id={`dj-edit-display-name-${msgIdx}`}
                                type="text"
                                value={editData.display_name || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "display_name",
                                    e.target.value,
                                  )
                                }
                                data-field="display_name"
                                data-section="identity"
                                data-type="artist"
                                aria-label="On-Air Name"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`dj-edit-type-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Type
                              </label>
                              <select
                                id={`dj-edit-type-${msgIdx}`}
                                value={editData.type || "dj"}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "type",
                                    e.target.value,
                                  )
                                }
                                data-field="type"
                                data-section="identity"
                                data-type="artist"
                                aria-label="Artist Type"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                <option value="dj">DJ</option>
                                <option value="musician">Musician</option>
                                <option value="host">Host</option>
                                <option value="narrator">Narrator</option>
                                <option value="caller">Caller</option>
                                <option value="guest">Guest</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Personality Section */}
                        <div
                          style={{
                            marginBottom: "var(--space-lg)",
                            paddingBottom: "var(--space-lg)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <h5
                            style={{
                              fontSize: "0.9em",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-secondary)",
                              marginBottom: "var(--space-sm)",
                            }}
                          >
                            Personality & Voice
                          </h5>
                          <div
                            style={{ display: "grid", gap: "var(--space-sm)" }}
                          >
                            <div>
                              <label
                                htmlFor={`dj-edit-personality-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Personality
                              </label>
                              <textarea
                                id={`dj-edit-personality-${msgIdx}`}
                                value={editData.personality || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "personality",
                                    e.target.value,
                                  )
                                }
                                data-field="personality"
                                data-section="personality"
                                data-type="artist"
                                aria-label="Personality traits and characteristics"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  minHeight: "80px",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`dj-edit-speaking-style-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Speaking Style
                              </label>
                              <input
                                id={`dj-edit-speaking-style-${msgIdx}`}
                                type="text"
                                value={editData.speaking_style || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "speaking_style",
                                    e.target.value,
                                  )
                                }
                                data-field="speaking_style"
                                data-section="personality"
                                data-type="artist"
                                aria-label="Speaking Style"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`dj-edit-voice-description-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Voice Description
                              </label>
                              <input
                                id={`dj-edit-voice-description-${msgIdx}`}
                                type="text"
                                value={editData.voice_description || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "voice_description",
                                    e.target.value,
                                  )
                                }
                                data-field="voice_description"
                                data-section="personality"
                                data-type="artist"
                                aria-label="Voice Description for audio synthesis"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quirks Section */}
                        <div
                          style={{
                            marginBottom: "var(--space-lg)",
                            paddingBottom: "var(--space-lg)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <h5
                            style={{
                              fontSize: "0.9em",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-secondary)",
                              marginBottom: "var(--space-sm)",
                            }}
                          >
                            Quirks & Catchphrases
                          </h5>
                          <div
                            style={{ display: "grid", gap: "var(--space-sm)" }}
                          >
                            <div>
                              <label
                                htmlFor={`dj-edit-catchphrases-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Catchphrases (pipe-separated)
                              </label>
                              <input
                                id={`dj-edit-catchphrases-${msgIdx}`}
                                type="text"
                                value={editData.catchphrases || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "catchphrases",
                                    e.target.value,
                                  )
                                }
                                data-field="catchphrases"
                                data-section="quirks"
                                data-type="artist"
                                aria-label="Catchphrases (pipe-separated)"
                                placeholder="Keep it retro|Waves incoming"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Music Section */}
                        <div
                          style={{
                            marginBottom: "var(--space-lg)",
                            paddingBottom: "var(--space-lg)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <h5
                            style={{
                              fontSize: "0.9em",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-secondary)",
                              marginBottom: "var(--space-sm)",
                            }}
                          >
                            Music
                          </h5>
                          <div
                            style={{ display: "grid", gap: "var(--space-sm)" }}
                          >
                            <div>
                              <label
                                htmlFor={`dj-edit-genre-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Genre
                              </label>
                              <input
                                id={`dj-edit-genre-${msgIdx}`}
                                type="text"
                                value={editData.genre || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "genre",
                                    e.target.value,
                                  )
                                }
                                data-field="genre"
                                data-section="music"
                                data-type="artist"
                                aria-label="Music Genre"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`dj-edit-signature-sound-${msgIdx}`}
                                style={{
                                  fontSize: "0.85em",
                                  display: "block",
                                  marginBottom: "0.25em",
                                }}
                              >
                                Signature Sound
                              </label>
                              <input
                                id={`dj-edit-signature-sound-${msgIdx}`}
                                type="text"
                                value={editData.signature_sound || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "signature_sound",
                                    e.target.value,
                                  )
                                }
                                data-field="signature_sound"
                                data-section="music"
                                data-type="artist"
                                aria-label="Signature Sound"
                                style={{
                                  width: "100%",
                                  padding: "0.4em",
                                  fontSize: "0.9em",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Lore Section */}
                        <div style={{ marginBottom: "var(--space-lg)" }}>
                          <h5
                            style={{
                              fontSize: "0.9em",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-secondary)",
                              marginBottom: "var(--space-sm)",
                            }}
                          >
                            Backstory
                          </h5>
                          <div>
                            <label
                              htmlFor={`dj-edit-backstory-${msgIdx}`}
                              style={{
                                fontSize: "0.85em",
                                display: "block",
                                marginBottom: "0.25em",
                              }}
                            >
                              Full Story
                            </label>
                            <textarea
                              id={`dj-edit-backstory-${msgIdx}`}
                              value={editData.backstory || ""}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  msgIdx,
                                  "backstory",
                                  e.target.value,
                                )
                              }
                              data-field="backstory"
                              data-section="lore"
                              data-type="artist"
                              aria-label="DJ Backstory and history"
                              style={{
                                width: "100%",
                                padding: "0.4em",
                                fontSize: "0.9em",
                                minHeight: "100px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-primary)",
                                fontFamily: "inherit",
                                resize: "vertical",
                              }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{ display: "flex", gap: "var(--space-sm)" }}
                        >
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              handleStageDJWithEdits(msgIdx, djIdx, editData)
                            }
                            disabled={!editData.name?.trim()}
                            title={
                              !editData.name?.trim()
                                ? "DJ name is required"
                                : "Stage this DJ with the edited details"
                            }
                          >
                            Stage DJ
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCancelEditDJ(msgIdx)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Non-editing card view
                  return (
                    <div
                      key={djIdx}
                      style={{
                        marginBottom: "var(--space-sm)",
                        padding: "var(--space-sm) var(--space-md)",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: "3px solid var(--accent)",
                      }}
                    >
                      <div style={{ marginBottom: "var(--space-xs)" }}>
                        <strong>{dj.display_name || dj.name}</strong>
                        {dj.display_name && dj.name !== dj.display_name && (
                          <span
                            style={{
                              fontSize: "0.8em",
                              color: "var(--text-secondary)",
                              marginLeft: "0.4em",
                            }}
                          >
                            ({dj.name})
                          </span>
                        )}
                        <span
                          style={{
                            marginLeft: "0.5em",
                            fontSize: "0.75em",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {dj.type || "dj"}
                        </span>
                      </div>
                      {dj.personality && (
                        <p
                          style={{
                            fontSize: "0.82em",
                            color: "var(--text-secondary)",
                            margin: "0 0 var(--space-xs) 0",
                          }}
                        >
                          {dj.personality.length > 120
                            ? `${dj.personality.slice(0, 120)}…`
                            : dj.personality}
                        </p>
                      )}
                      {dj.genre && (
                        <span
                          style={{
                            fontSize: "0.75em",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "var(--space-xs)",
                          }}
                        >
                          Genre: {dj.genre}
                        </span>
                      )}

                      {status === "idle" && currentStationId && (
                        <div
                          style={{ display: "flex", gap: "var(--space-xs)" }}
                        >
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: "var(--space-xs)" }}
                            onClick={() => handleEditDJ(msgIdx, djIdx, dj)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginTop: "var(--space-xs)" }}
                            onClick={() => handleStageDJ(msgIdx, djIdx, dj)}
                          >
                            Stage Now
                          </button>
                        </div>
                      )}
                      {status === "staging" && (
                        <span
                          style={{
                            fontSize: "0.85em",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Staging…
                        </span>
                      )}
                      {status === "staged" && (
                        <span
                          style={{
                            fontSize: "0.85em",
                            color: "var(--success-color, #4ade80)",
                          }}
                        >
                          ✅ Staged — check Pending AI DJs
                        </span>
                      )}
                      {status === "error" && (
                        <div>
                          <span
                            style={{
                              fontSize: "0.85em",
                              color: "var(--error-color, #f87171)",
                            }}
                          >
                            ❌ Staging failed
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              marginLeft: "var(--space-sm)",
                              fontSize: "0.8em",
                            }}
                            onClick={() => handleStageDJ(msgIdx, djIdx, dj)}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {status === "idle" && !currentStationId && (
                        <span
                          style={{
                            fontSize: "0.8em",
                            color: "var(--text-muted)",
                          }}
                        >
                          Open a station to stage this DJ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Feature 2: Generic entity suggestion cards (Station, Brand, Jingle, Draft, Universe) */}
            {msg.entitySuggestions && msg.entitySuggestions.length > 0 && (
              <div style={{ marginTop: "var(--space-md)" }}>
                {msg.entitySuggestions.map((suggestion, entityIdx) => {
                  const status =
                    msg.entityStagingStatuses?.[entityIdx] ?? "idle";
                  return (
                    <EntitySuggestionCard
                      key={entityIdx}
                      suggestion={suggestion}
                      index={entityIdx}
                      status={status}
                      onEdit={() => handleOpenFormForEntity(suggestion)}
                      onStage={() =>
                        handleStageEntity(msgIdx, entityIdx, suggestion)
                      }
                      onReject={() => handleRejectEntity(msgIdx, entityIdx)}
                      loading={status === "staging"}
                    />
                  );
                })}
              </div>
            )}

            {/* Legacy single-entity proposal (Station / Brand / Artist) */}
            {msg.proposal && (
              <div
                style={{
                  marginTop: "var(--space-md)",
                  padding: "var(--space-sm)",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 var(--space-sm) 0",
                    fontSize: "0.9em",
                    color: "var(--text-secondary)",
                  }}
                >
                  ✨ AI proposes a new {msg.proposal.entity}:{" "}
                  <strong>{msg.proposal.data.name}</strong>
                </p>
                {msg.proposalStatus === "pending" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => confirmProposal(msgIdx, msg.proposal!)}
                  >
                    Confirm & Create{" "}
                    {msg.proposal.entity.charAt(0).toUpperCase() +
                      msg.proposal.entity.slice(1)}
                  </button>
                )}
                {msg.proposalStatus === "success" && (
                  <span style={{ color: "var(--success-color)" }}>
                    ✅ Created successfully!
                  </span>
                )}
                {msg.proposalStatus === "error" && (
                  <span style={{ color: "var(--error-color)" }}>
                    ❌ Creation failed — see the alert for details
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant" style={{ opacity: 0.6 }}>
            ✨ Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Preview Dialog for opening forms with AI-generated data */}
      {selectedSuggestionForPreview && (
        <FormPreviewDialog
          suggestion={selectedSuggestionForPreview}
          isOpen={showFormPreview}
          onConfirm={handleFormPreviewConfirm}
          onCancel={handleFormPreviewCancel}
          isLoading={previewLoading}
        />
      )}

      <div className="chat-input-row">
        <input
          id="chat-input"
          name="chat-message"
          aria-label="Chat message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            currentStationId && selectedStation
              ? `Ask about ${selectedStation.name}...`
              : "Ask me about stations, DJs, brands..."
          }
          disabled={loading}
          autoComplete="off"
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          →
        </button>
      </div>
    </div>
  );
}
