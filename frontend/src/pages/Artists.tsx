import { useState, useEffect } from 'react';
import { api, type Artist } from '../api/client';
import { ArtistForm } from './Stations';

export function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [genPortrait, setGenPortrait] = useState<string | null>(null);

  const refresh = () => {
    api.listArtists().then(setArtists).catch(e => console.error('Failed to load artists:', e));
  };

  useEffect(() => { refresh(); }, []);

  const handleGenPortrait = async (id: string) => {
    setGenPortrait(id);
    try {
      await api.generatePortrait(id);
      refresh();
      if (selected?.id === id) {
        api.getArtist(id).then(setSelected);
      }
    } catch (e: any) {
      alert(`Portrait generation failed: ${e.message || 'Check your API key'}`);
    } finally {
      setGenPortrait(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this artist?')) return;
    await api.deleteArtist(id);
    if (selected?.id === id) setSelected(null);
    refresh();
  };

  if (showCreate) {
    return (
      <div>
        <div className="page-header">
          <h2>🎤 New Artist</h2>
        </div>
        <ArtistForm
          onCancel={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); refresh(); }}
        />
      </div>
    );
  }

  if (showEdit && selected) {
    return (
      <div>
        <div className="page-header">
          <h2>🎤 Edit: {selected.display_name || selected.name}</h2>
        </div>
        <ArtistForm
          existing={selected}
          onCancel={() => setShowEdit(false)}
          onSave={() => {
            setShowEdit(false);
            refresh();
            api.getArtist(selected.id).then(setSelected);
          }}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>← Back</button>
            <div>
              <h2>🎤 {selected.display_name || selected.name}</h2>
              <p>{selected.artist_type} {selected.genre && `• ${selected.genre}`}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>Edit</button>
            <button className="btn btn-secondary" onClick={() => handleGenPortrait(selected.id)}
              disabled={genPortrait === selected.id}>
              {genPortrait === selected.id ? 'Generating...' : '🎨 Generate Portrait'}
            </button>
            <button className="btn btn-ghost" style={{ color: 'var(--status-failed)' }}
              onClick={() => handleDelete(selected.id)}>Delete</button>
          </div>
        </div>

        <div className="detail-grid">
          {/* Portrait */}
          <div className="card" style={{ textAlign: 'center' }}>
            {selected.portrait_path ? (
              <img src={selected.portrait_path} alt={selected.name}
                style={{ width: '100%', maxWidth: 300, borderRadius: 'var(--radius-lg)', margin: '0 auto' }} />
            ) : (
              <div style={{ padding: 'var(--space-xxl)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '4rem' }}>🎤</div>
                <p>No portrait yet</p>
                <button className="btn btn-secondary" onClick={() => handleGenPortrait(selected.id)}>
                  Generate Portrait
                </button>
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Identity</h3></div>
            <div className="detail-fields">
              <DetailField label="Real Name" value={selected.name} />
              <DetailField label="On-Air Name" value={selected.display_name} />
              <DetailField label="Type" value={selected.artist_type} />
              <DetailField label="Age" value={selected.age} />
              <DetailField label="Gender" value={selected.gender} />
              <DetailField label="Genre" value={selected.genre} />
              <DetailField label="Tracks" value={String(selected.total_tracks)} />
            </div>
          </div>

          {/* Personality */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Personality & Voice</h3></div>
            <div className="detail-fields">
              <DetailField label="Bio" value={selected.bio} />
              <DetailField label="Personality" value={selected.personality} />
              <DetailField label="Speaking Style" value={selected.speaking_style} />
              <DetailField label="Accent" value={selected.accent} />
              <DetailField label="Catchphrases" value={selected.catchphrases} />
              <DetailField label="Quirks" value={selected.quirks} />
              <DetailField label="Voice" value={selected.voice_description} />
              <DetailField label="Voice Seed" value={selected.voice_seed} />
            </div>
          </div>

          {/* Appearance */}
          {selected.appearance && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Appearance</h3></div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selected.appearance}</p>
            </div>
          )}

          {/* Relationships */}
          {(selected.influences || selected.rivals || selected.allies) && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Relationships & Influences</h3></div>
              <div className="detail-fields">
                <DetailField label="Influences" value={selected.influences} />
                <DetailField label="Signature Sound" value={selected.signature_sound} />
                <DetailField label="Rivals" value={selected.rivals} />
                <DetailField label="Allies" value={selected.allies} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🎤 Artists & DJs</h2>
          <p>Create and manage your radio personalities</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Artist
        </button>
      </div>

      {artists.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xxl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎤</div>
          <h3 style={{ color: 'var(--text-primary)' }}>No artists yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Create your first DJ or artist to get started.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Artist
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {artists.map(a => (
            <div key={a.id} className="card entity-card" onClick={() => setSelected(a)}>
              <div className="entity-card-art portrait">
                {a.portrait_path ? (
                  <img src={a.portrait_path} alt={a.name} />
                ) : (
                  <div className="entity-card-placeholder">🎤</div>
                )}
              </div>
              <div className="entity-card-info">
                <h3>{a.display_name || a.name}</h3>
                <span className="entity-card-sub">{a.artist_type}</span>
                {a.bio && <p className="entity-card-tagline">{a.bio.substring(0, 80)}{a.bio.length > 80 ? '...' : ''}</p>}
                <div className="entity-card-tags">
                  {a.genre && <span className="tag">{a.genre}</span>}
                  {a.speaking_style && <span className="tag">{a.speaking_style}</span>}
                  {a.accent && <span className="tag">{a.accent}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}
