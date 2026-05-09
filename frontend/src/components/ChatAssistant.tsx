import { useState, useRef, useEffect } from "react";
import { api, type Station } from "../api/client";
import { FormPreviewDialog } from "./FormPreviewDialog";
import {
  useFormManager,
  requiresFormPreview,
} from "../contexts/FormManagerContext";
import {
  parseEntitySuggestions,
  parseDJSuggestions,
  stripEntityBlocks,
  type EntitySuggestion,
} from "../utils/entitySuggestionParser";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  proposal?: {
    action: string;
    entity: "station" | "brand" | "artist";
    data: Record<string, string>;
  };
  proposalStatus?: "pending" | "success" | "error";
  entitySuggestions?: EntitySuggestion[];
  entityStagingStatuses?: Record<
    number,
    "idle" | "staging" | "staged" | "error"
  >;
  // Legacy DJ suggestions (for backward compatibility)
  djSuggestions?: EntitySuggestion[];
  djStagingStatuses?: Record<number, "idle" | "staging" | "staged" | "error">;
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
  const [formPreviewOpen, setFormPreviewOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<EntitySuggestion | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

      // Parse both new generic ENTITY_SUGGESTION and legacy DJ_SUGGESTION blocks
      const entitySuggestions = parseEntitySuggestions(replyText);
      // Only try legacy DJ_SUGGESTION parsing if no new ENTITY_SUGGESTION blocks found
      const djSuggestions =
        entitySuggestions.length === 0 ? parseDJSuggestions(replyText) : [];

      // Strip all suggestion blocks from visible text
      const visibleReply = stripEntityBlocks(replyText);

      const newMsg: ChatMessage = {
        role: "assistant",
        content: visibleReply,
        proposal: data.proposal,
        proposalStatus: data.proposal ? "pending" : undefined,
        entitySuggestions:
          entitySuggestions.length > 0 ? entitySuggestions : undefined,
        entityStagingStatuses:
          entitySuggestions.length > 0
            ? Object.fromEntries(
                entitySuggestions.map((_, idx) => [idx, "idle"]),
              )
            : undefined,
        // Legacy support
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

  /** Stage a single AI-suggested DJ and update the message's staging statuses. */
  const handleStageDJ = async (
    msgIndex: number,
    djIndex: number,
    suggestion: EntitySuggestion,
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
      };
      return copy;
    });

    try {
      await api.stageArtist({
        name: suggestion.data.name,
        display_name: suggestion.data.display_name || suggestion.data.name,
        artist_type: ([
          "dj",
          "musician",
          "narrator",
          "host",
          "caller",
          "guest",
        ].includes(suggestion.type)
          ? suggestion.type
          : "dj") as string,
        station_id: currentStationId,
        bio: suggestion.data.backstory,
        personality: suggestion.data.personality,
        catchphrases: suggestion.data.catchphrases,
        speaking_style: suggestion.data.speaking_style,
        voice_description: suggestion.data.voice_description,
        genre: suggestion.data.genre,
        signature_sound: suggestion.data.signature_sound,
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
        alert(`Failed to stage ${suggestion.data.name}: ${errMsg}`);
      }
    }
  };

  /**
   * Handle opening an AI-suggested entity in a form (Phase 2).
   * Shows confirmation dialog for major entities (Station, Brand, Universe).
   * Auto-opens form for quick-create entities (DJ, Jingle, Draft).
   */
  const handleOpenFormForEntity = (suggestion: EntitySuggestion) => {
    // Check if this entity type requires preview dialog
    if (requiresFormPreview(suggestion.type)) {
      // Show preview dialog for major entities
      setSelectedSuggestion(suggestion);
      setFormPreviewOpen(true);
    } else {
      // Direct open for quick-create entities
      openFormWithSuggestion(suggestion);
    }
  };

  /** Open form with AI-generated data via FormManager. */
  const openFormWithSuggestion = (suggestion: EntitySuggestion) => {
    formManager.openForm({
      entityType: suggestion.type,
      initialData: suggestion.data,
      aiGenerated: true,
      onSuccess: () => {
        // Form created successfully
        if (onEntityCreated) {
          onEntityCreated();
        }
      },
      onCancel: () => {
        // User cancelled form
        setFormPreviewOpen(false);
        setSelectedSuggestion(null);
      },
    });
    setFormPreviewOpen(false);
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

            {/* Structured entity suggestion cards (new multi-entity format) */}
            {msg.entitySuggestions && msg.entitySuggestions.length > 0 && (
              <div style={{ marginTop: "var(--space-md)" }}>
                {msg.entitySuggestions.map((entity, entityIdx) => (
                  <div
                    key={entityIdx}
                    style={{
                      marginBottom: "var(--space-sm)",
                      padding: "var(--space-sm) var(--space-md)",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--accent)",
                    }}
                  >
                    <div style={{ marginBottom: "var(--space-xs)" }}>
                      <strong>{entity.data.name || entity.data.title}</strong>
                      <span
                        style={{
                          marginLeft: "0.5em",
                          fontSize: "0.75em",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {entity.type}
                      </span>
                      {entity.confidence && entity.confidence !== "high" && (
                        <span
                          style={{
                            marginLeft: "0.5em",
                            fontSize: "0.7em",
                            color: "var(--warning-color, #fbbf24)",
                          }}
                        >
                          {entity.confidence}
                        </span>
                      )}
                    </div>

                    {entity.data.description && (
                      <p
                        style={{
                          fontSize: "0.82em",
                          color: "var(--text-secondary)",
                          margin: "0 0 var(--space-xs) 0",
                        }}
                      >
                        {entity.data.description.length > 120
                          ? `${entity.data.description.slice(0, 120)}…`
                          : entity.data.description}
                      </p>
                    )}

                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: "var(--space-xs)" }}
                      onClick={() => handleOpenFormForEntity(entity)}
                    >
                      Open Form
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Structured DJ suggestion cards (legacy format for backward compatibility) */}
            {msg.djSuggestions && msg.djSuggestions.length > 0 && (
              <div style={{ marginTop: "var(--space-md)" }}>
                {msg.djSuggestions.map((dj, djIdx) => {
                  const status = msg.djStagingStatuses?.[djIdx] ?? "idle";
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
                        <strong>{dj.data.display_name || dj.data.name}</strong>
                        {dj.data.display_name &&
                          dj.data.name !== dj.data.display_name && (
                            <span
                              style={{
                                fontSize: "0.8em",
                                color: "var(--text-secondary)",
                                marginLeft: "0.4em",
                              }}
                            >
                              ({dj.data.name})
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
                      {dj.data.personality && (
                        <p
                          style={{
                            fontSize: "0.82em",
                            color: "var(--text-secondary)",
                            margin: "0 0 var(--space-xs) 0",
                          }}
                        >
                          {dj.data.personality.length > 120
                            ? `${dj.data.personality.slice(0, 120)}…`
                            : dj.data.personality}
                        </p>
                      )}
                      {dj.data.genre && (
                        <span
                          style={{
                            fontSize: "0.75em",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "var(--space-xs)",
                          }}
                        >
                          Genre: {dj.data.genre}
                        </span>
                      )}

                      {status === "idle" && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: "var(--space-xs)" }}
                          onClick={() => handleOpenFormForEntity(dj)}
                        >
                          Open Form
                        </button>
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

      {/* Form preview dialog for AI-suggested entities */}
      {selectedSuggestion && (
        <FormPreviewDialog
          suggestion={selectedSuggestion}
          isOpen={formPreviewOpen}
          onConfirm={() => openFormWithSuggestion(selectedSuggestion)}
          onCancel={() => {
            setFormPreviewOpen(false);
            setSelectedSuggestion(null);
          }}
        />
      )}
    </div>
  );
}
