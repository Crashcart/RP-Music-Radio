import { useState, useRef, useEffect } from "react";
import { api, type Station } from "../api/client";

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
 * When no station context is available, returns a generic prompt.
 */
const buildSystemPrompt = (
  currentStationId: string | undefined,
  selectedStation: Station | null,
): string => {
  let prompt =
    "You are AetherWave AI, a creative assistant for building fictional radio stations. " +
    "Help users brainstorm station concepts, DJ personas, fictional brands, and lore.";

  if (currentStationId && selectedStation) {
    prompt +=
      `

The user is currently editing the station "${selectedStation.name}"` +
      (selectedStation.frequency
        ? ` (frequency: ${selectedStation.frequency})`
        : "") +
      (selectedStation.genre ? `, genre: ${selectedStation.genre}` : "") +
      (selectedStation.mood ? `, mood: ${selectedStation.mood}` : "") +
      `.
When the user asks you to create DJs for this station, generate detailed, cohesive personalities that fit the station's vibe.

If the user says something like "Create 3 DJs for this station" or "Generate DJs", respond with:
1. A brief acknowledgment
2. The DJ suggestions in the structured format below

DJ Suggestion Format — use this EXACT structure (one block per DJ) so the system can parse it:

DJ_SUGGESTION
name: [DJ Real Name]
display_name: [On-Air Name]
type: dj
personality: [3-4 sentences about personality]
speaking_style: [e.g. fast-paced, laid-back, energetic]
voice_description: [What their voice sounds like]
catchphrases: [catchphrase1 | catchphrase2 | catchphrase3]
genre: [Primary music genre]
signature_sound: [What makes their sound unique]
backstory: [Brief in-universe backstory]

Repeat the DJ_SUGGESTION block once for each DJ. After all blocks you may add follow-up context.`;
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

      // Strip DJ_SUGGESTION blocks from the visible reply so the card UI
      // is the sole presentation for structured suggestions.
      const visibleReply =
        djSuggestions.length > 0
          ? replyText
              .replace(/DJ_SUGGESTION[\s\S]*?(?=\nDJ_SUGGESTION|\s*$)/g, "")
              .trim()
          : replyText;

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

  /** Stage a DJ with edited data */
  const handleStageDJWithEdits = async (
    msgIndex: number,
    djIndex: number,
    editedData: Record<string, string>,
  ) => {
    if (!currentStationId) return;

    // Mark as staging
    setMessages((prev) => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djStagingStatuses: {
          ...copy[msgIndex].djStagingStatuses,
          [djIndex]: "staging",
        },
        djEditingIndex: null,
        djEditingData: undefined,
      };
      return copy;
    });

    try {
      await api.stageArtist({
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
        bio: editedData.backstory,
        personality: editedData.personality,
        catchphrases: editedData.catchphrases,
        speaking_style: editedData.speaking_style,
        voice_description: editedData.voice_description,
        genre: editedData.genre,
        signature_sound: editedData.signature_sound,
      });

      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          djStagingStatuses: {
            ...copy[msgIndex].djStagingStatuses,
            [djIndex]: "staged",
          },
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
                              <label style={{ fontSize: "0.85em" }}>
                                Real Name
                              </label>
                              <input
                                type="text"
                                value={editData.name || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "name",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                On-Air Name
                              </label>
                              <input
                                type="text"
                                value={editData.display_name || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "display_name",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>Type</label>
                              <select
                                value={editData.type || "dj"}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "type",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Personality
                              </label>
                              <textarea
                                value={editData.personality || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "personality",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Speaking Style
                              </label>
                              <input
                                type="text"
                                value={editData.speaking_style || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "speaking_style",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Voice Description
                              </label>
                              <input
                                type="text"
                                value={editData.voice_description || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "voice_description",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Catchphrases (pipe-separated)
                              </label>
                              <input
                                type="text"
                                value={editData.catchphrases || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "catchphrases",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Genre
                              </label>
                              <input
                                type="text"
                                value={editData.genre || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "genre",
                                    e.target.value,
                                  )
                                }
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
                              <label style={{ fontSize: "0.85em" }}>
                                Signature Sound
                              </label>
                              <input
                                type="text"
                                value={editData.signature_sound || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    msgIdx,
                                    "signature_sound",
                                    e.target.value,
                                  )
                                }
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
                            <textarea
                              value={editData.backstory || ""}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  msgIdx,
                                  "backstory",
                                  e.target.value,
                                )
                              }
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
                            Edit & Stage
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginTop: "var(--space-xs)" }}
                            onClick={() => handleStageDJ(msgIdx, djIdx, dj)}
                          >
                            Stage as-is
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
