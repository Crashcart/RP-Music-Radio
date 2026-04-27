import { useState, useEffect } from 'react';

interface Persona {
  persona_id: string;
  display_name: string;
  voice_seed: string;
  persona_type: string;
  backstory: string;
  habits: string[];
  rivals: string[];
  history: string[];
  total_tracks_generated: number;
  created_at: string;
  last_updated: string;
}

export function PersonaGallery() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load from the DNA manager API (future endpoint)
    // For now, show a beautiful placeholder
    setLoading(false);
    setPersonas([]);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>🎙️ Persona Gallery</h2>
        <p>Your DJs, artists, and narrators with persistent voice DNA</p>
      </div>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'pulse-badge 2s ease-in-out infinite' }}>⏳</div>
            <div className="empty-title">Loading personas...</div>
          </div>
        </div>
      ) : personas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <div className="empty-title">No personas yet</div>
            <div className="empty-description">
              Personas are created automatically when you commit drafts.
              Each DJ gets a unique voice seed that ensures vocal consistency across all their tracks.
            </div>
          </div>
        </div>
      ) : (
        <div className="persona-grid">
          {personas.map(persona => (
            <div key={persona.persona_id} className="card persona-card">
              <div className="persona-avatar">
                {persona.display_name.charAt(0)}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4 }}>
                {persona.display_name}
              </h3>
              <span className="badge badge-fleshed" style={{ marginBottom: 'var(--space-sm)' }}>
                {persona.persona_type}
              </span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                {persona.backstory || 'No backstory yet...'}
              </p>

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {persona.total_tracks_generated}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tracks</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {persona.habits.length}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quirks</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {persona.rivals.length}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rivals</div>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                Voice: {persona.voice_seed.slice(0, 8)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
