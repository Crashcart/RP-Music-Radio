import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposal?: {
    action: string;
    entity: 'station' | 'brand' | 'artist';
    data: any;
  };
  proposalStatus?: 'pending' | 'success' | 'error';
}

const SYSTEM_INTRO = "Hi! I'm AetherWave's AI assistant. I can help you brainstorm station concepts, create DJ personas, design fictional brands, and build your radio universe. What would you like to create?";

export function ChatAssistant() {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role, content: m.content,
          })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.reply,
        proposal: data.proposal,
        proposalStatus: data.proposal ? 'pending' : undefined
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect to the AI. Make sure your Google API key is set in Settings.",
      }]);
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

  const confirmProposal = async (index: number, proposal: NonNullable<ChatMessage['proposal']>) => {
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
        copy[index].proposalStatus = 'success';
        return copy;
      });
      // Force a full page reload so other components see the new data
      window.location.reload();
    } catch (err: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[index].proposalStatus = 'error';
        return copy;
      });
      alert(`Failed to create ${proposal.entity}: ${err.message}`);
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
        <h3>✨ AetherWave AI</h3>
        <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.content}
            {msg.proposal && (
              <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ margin: '0 0 var(--space-sm) 0', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                  ✨ AI proposes a new {msg.proposal.entity}: <strong>{msg.proposal.data.name}</strong>
                </p>
                {msg.proposalStatus === 'pending' && (
                  <button className="btn btn-primary" onClick={() => confirmProposal(i, msg.proposal!)}>
                    Confirm & Create {msg.proposal.entity.charAt(0).toUpperCase() + msg.proposal.entity.slice(1)}
                  </button>
                )}
                {msg.proposalStatus === 'success' && (
                  <span style={{ color: 'var(--success-color)' }}>✅ Created successfully!</span>
                )}
                {msg.proposalStatus === 'error' && (
                  <span style={{ color: 'var(--error-color)' }}>❌ Failed to create</span>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant" style={{ opacity: 0.6 }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about stations, DJs, brands..."
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          →
        </button>
      </div>
    </div>
  );
}
