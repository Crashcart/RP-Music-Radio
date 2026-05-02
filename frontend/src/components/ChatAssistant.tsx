import { useState, useRef, useEffect } from 'react';
import { api, type Station } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposal?: {
    action: string;
    entity: 'station' | 'brand' | 'artist';
    data: Record<string, string>;
  };
  proposalStatus?: 'pending' | 'success' | 'error';
  djSuggestions?: DJSuggestion[];
  djStagingStatuses?: Record<number, 'idle' | 'staging' | 'staged' | 'error'>;
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
  if (error.includes('RESOURCE_EXHAUSTED') || error.includes('quota')) {
    return 'Google API quota exceeded. Try again in a few moments, or upgrade your plan.';
  }
  if (error.includes('API key') || error.includes('401') || error.includes('unauthorized')) {
    return 'API key is missing or invalid. Check your API key in Settings.';
  }
  if (error.includes('timeout')) {
    return 'Request timed out. Try again in a moment.';
  }
  if (error.includes('rate limit')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  return 'Something went wrong. Please try again.';
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
    for (const line of block.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      if (key && value) {
        fields[key] = value;
      }
    }
    if (fields['name']) {
      suggestions.push({
        name: fields['name'] ?? '',
        display_name: fields['display_name'] ?? '',
        type: fields['type'] ?? 'dj',
        personality: fields['personality'] ?? '',
        speaking_style: fields['speaking_style'] ?? '',
        voice_description: fields['voice_description'] ?? '',
        catchphrases: fields['catchphrases'] ?? '',
        genre: fields['genre'] ?? '',
        signature_sound: fields['signature_sound'] ?? '',
        backstory: fields['backstory'] ?? '',
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
    'You are AetherWave AI, a creative assistant for building fictional radio stations. ' +
    'Help users brainstorm station concepts, DJ personas, fictional brands, and lore.';

  if (currentStationId && selectedStation) {
    prompt += `

The user is currently editing the station "${selectedStation.name}"` +
      (selectedStation.frequency ? ` (frequency: ${selectedStation.frequency})` : '') +
      (selectedStation.genre ? `, genre: ${selectedStation.genre}` : '') +
      (selectedStation.mood ? `, mood: ${selectedStation.mood}` : '') +
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
    { role: 'system', content: SYSTEM_INTRO },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(currentStationId, selectedStation);
      const data = await api.chat({
        message: text,
        system_prompt: systemPrompt,
        history: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const replyText: string = data.reply ?? '';
      const djSuggestions = parseDJSuggestions(replyText);

      // Strip DJ_SUGGESTION blocks from the visible reply so the card UI
      // is the sole presentation for structured suggestions.
      const visibleReply = djSuggestions.length > 0
        ? replyText.replace(/DJ_SUGGESTION[\s\S]*?(?=\nDJ_SUGGESTION|\s*$)/g, '').trim()
        : replyText;

      const newMsg: ChatMessage = {
        role: 'assistant',
        content: visibleReply,
        proposal: data.proposal,
        proposalStatus: data.proposal ? 'pending' : undefined,
        djSuggestions: djSuggestions.length > 0 ? djSuggestions : undefined,
        djStagingStatuses: djSuggestions.length > 0
          ? Object.fromEntries(djSuggestions.map((_, idx) => [idx, 'idle']))
          : undefined,
      };
      setMessages(prev => [...prev, newMsg]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      const userFriendlyMsg = parseApiError(errorMsg);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${userFriendlyMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /** Stage a single AI-suggested DJ and update the message's staging statuses. */
  const handleStageDJ = async (
    msgIndex: number,
    djIndex: number,
    suggestion: DJSuggestion,
  ) => {
    if (!currentStationId) return;

    // Mark as staging
    setMessages(prev => {
      const copy = [...prev];
      copy[msgIndex] = {
        ...copy[msgIndex],
        djStagingStatuses: {
          ...copy[msgIndex].djStagingStatuses,
          [djIndex]: 'staging',
        },
      };
      return copy;
    });

    try {
      await api.stageArtist({
        name: suggestion.name,
        display_name: suggestion.display_name || suggestion.name,
        artist_type: (['dj', 'musician', 'narrator', 'host', 'caller', 'guest'].includes(suggestion.type)
          ? suggestion.type
          : 'dj') as string,
        station_id: currentStationId,
        bio: suggestion.backstory,
        personality: suggestion.personality,
        catchphrases: suggestion.catchphrases,
        speaking_style: suggestion.speaking_style,
        voice_description: suggestion.voice_description,
        genre: suggestion.genre,
        signature_sound: suggestion.signature_sound,
      });

      setMessages(prev => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          djStagingStatuses: {
            ...copy[msgIndex].djStagingStatuses,
            [djIndex]: 'staged',
          },
        };
        return copy;
      });

      // Notify parent (Stations page) to refresh its pending DJs section
      if (onEntityCreated) {
        onEntityCreated();
      }
    } catch (err: unknown) {
      setMessages(prev => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          djStagingStatuses: {
            ...copy[msgIndex].djStagingStatuses,
            [djIndex]: 'error',
          },
        };
        return copy;
      });

      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      // Surface user-friendly error — rate limit is the most common failure
      if (errMsg.includes('429') || errMsg.includes('Rate limit') || errMsg.includes('Too many')) {
        alert('Rate limit: too many pending DJs. Approve or reject existing drafts first.');
      } else {
        alert(`Failed to stage ${suggestion.name}: ${errMsg}`);
      }
    }
  };

  /** Confirm a manual proposal (existing Station / Brand / Artist creation flow). */
  const confirmProposal = async (
    index: number,
    proposal: NonNullable<ChatMessage['proposal']>,
  ) => {
    try {
      if (proposal.entity === 'station') {
        await api.createStation(proposal.data);
      } else if (proposal.entity === 'brand') {
        await api.createBrand(proposal.data);
      } else if (proposal.entity === 'artist') {
        await api.createArtist(proposal.data);
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], proposalStatus: 'success' };
        return copy;
      });
      if (onEntityCreated) {
        onEntityCreated();
      }
    } catch (err: unknown) {
      setMessages(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], proposalStatus: 'error' };
        return copy;
      });

      const entityName =
        proposal.entity.charAt(0).toUpperCase() + proposal.entity.slice(1);
      let message = `Couldn't create the ${entityName}.`;

      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('Network')) {
        message = 'Network error. Check your connection and try again.';
      } else if (errMsg.includes('429') || errMsg.includes('quota')) {
        message = 'API quota exceeded. Wait a moment and try again.';
      } else if (errMsg.includes('409') || errMsg.includes('already exists')) {
        message = `A ${proposal.entity} with this name already exists.`;
      }

      alert(message);
    }
  };

  if (!open) {
    return (
      <button className="chat-toggle" onClick={() => setOpen(true)} title="AI Assistant">
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
                fontSize: '0.75em',
                fontWeight: 'normal',
                color: 'var(--text-secondary)',
                marginLeft: '0.5em',
              }}
            >
              — {selectedStation.name}
            </span>
          )}
        </h3>
        <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, msgIdx) => (
          <div key={msgIdx} className={`chat-message ${msg.role}`}>
            {msg.content}

            {/* Structured DJ suggestion cards */}
            {msg.djSuggestions && msg.djSuggestions.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                {msg.djSuggestions.map((dj, djIdx) => {
                  const status = msg.djStagingStatuses?.[djIdx] ?? 'idle';
                  return (
                    <div
                      key={djIdx}
                      style={{
                        marginBottom: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--accent)',
                      }}
                    >
                      <div style={{ marginBottom: 'var(--space-xs)' }}>
                        <strong>{dj.display_name || dj.name}</strong>
                        {dj.display_name && dj.name !== dj.display_name && (
                          <span
                            style={{
                              fontSize: '0.8em',
                              color: 'var(--text-secondary)',
                              marginLeft: '0.4em',
                            }}
                          >
                            ({dj.name})
                          </span>
                        )}
                        <span
                          style={{
                            marginLeft: '0.5em',
                            fontSize: '0.75em',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {dj.type || 'dj'}
                        </span>
                      </div>
                      {dj.personality && (
                        <p
                          style={{
                            fontSize: '0.82em',
                            color: 'var(--text-secondary)',
                            margin: '0 0 var(--space-xs) 0',
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
                            fontSize: '0.75em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: 'var(--space-xs)',
                          }}
                        >
                          Genre: {dj.genre}
                        </span>
                      )}

                      {status === 'idle' && currentStationId && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 'var(--space-xs)' }}
                          onClick={() => handleStageDJ(msgIdx, djIdx, dj)}
                        >
                          Stage DJ
                        </button>
                      )}
                      {status === 'staging' && (
                        <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                          Staging…
                        </span>
                      )}
                      {status === 'staged' && (
                        <span style={{ fontSize: '0.85em', color: 'var(--success-color, #4ade80)' }}>
                          ✅ Staged — check Pending AI DJs
                        </span>
                      )}
                      {status === 'error' && (
                        <div>
                          <span style={{ fontSize: '0.85em', color: 'var(--error-color, #f87171)' }}>
                            ❌ Staging failed
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginLeft: 'var(--space-sm)', fontSize: '0.8em' }}
                            onClick={() => handleStageDJ(msgIdx, djIdx, dj)}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {status === 'idle' && !currentStationId && (
                        <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
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
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 var(--space-sm) 0',
                    fontSize: '0.9em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ✨ AI proposes a new {msg.proposal.entity}:{' '}
                  <strong>{msg.proposal.data.name}</strong>
                </p>
                {msg.proposalStatus === 'pending' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => confirmProposal(msgIdx, msg.proposal!)}
                  >
                    Confirm & Create{' '}
                    {msg.proposal.entity.charAt(0).toUpperCase() +
                      msg.proposal.entity.slice(1)}
                  </button>
                )}
                {msg.proposalStatus === 'success' && (
                  <span style={{ color: 'var(--success-color)' }}>✅ Created successfully!</span>
                )}
                {msg.proposalStatus === 'error' && (
                  <span style={{ color: 'var(--error-color)' }}>
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
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            currentStationId && selectedStation
              ? `Ask about ${selectedStation.name}...`
              : 'Ask me about stations, DJs, brands...'
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
