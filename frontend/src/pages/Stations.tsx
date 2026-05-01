import { useState, useEffect } from 'react';
import { api, type Station, type Artist, type Jingle } from '../api/client';

interface Props {
  isMobile?: boolean;
}

export function Stations({ isMobile }: Props) {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [stationDJs, setStationDJs] = useState<Artist[]>([]);
  const [stationJingles, setStationJingles] = useState<Jingle[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    api.listStations().then(setStations).catch(e => console.error('Failed to load stations:', e));
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (selectedStation) {
      api.listArtists(selectedStation.id).then(setStationDJs).catch(() => {});
      api.listJingles(selectedStation.id).then(setStationJingles).catch(() => {});
    }
  }, [selectedStation]);

  if (selectedStation) {
    return (
      <StationDetail
        station={selectedStation}
        djs={stationDJs}
        jingles={stationJingles}
        onBack={() => setSelectedStation(null)}
        onRefresh={() => {
          api.getStation(selectedStation.id).then(s => setSelectedStation(s));
          api.listArtists(selectedStation.id).then(setStationDJs);
          api.listJingles(selectedStation.id).then(setStationJingles);
        }}
      />
    );
  }

  if (showCreate) {
    return (
      <StationForm
        onCancel={() => setShowCreate(false)}
        onSave={() => { setShowCreate(false); refresh(); }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📻 Stations</h2>
          <p>Manage your radio stations, DJs, and jingles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Station
        </button>
      </div>

      {stations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xxl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📻</div>
          <h3 style={{ color: 'var(--text-primary)' }}>No stations yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Create your first radio station to get started.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Station
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {stations.map(s => (
            <div key={s.id} className="card entity-card" onClick={() => setSelectedStation(s)}>
              <div className="entity-card-art">
                {s.art_path ? (
                  <img src={s.art_path} alt={s.name} />
                ) : (
                  <div className="entity-card-placeholder">📻</div>
                )}
              </div>
              <div className="entity-card-info">
                <h3>{s.name}</h3>
                {s.frequency && <span className="entity-card-sub">{s.frequency}</span>}
                {s.tagline && <p className="entity-card-tagline">{s.tagline}</p>}
                <div className="entity-card-tags">
                  {s.genre && <span className="tag">{s.genre}</span>}
                  {s.mood && <span className="tag">{s.mood}</span>}
                  {s.era && <span className="tag">{s.era}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ── Station Detail View ─────────────────────────────────────────── */

function StationDetail({
  station, djs, jingles, onBack, onRefresh,
}: {
  station: Station;
  djs: Artist[];
  jingles: Jingle[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [genArt, setGenArt] = useState(false);
  const [showAddDJ, setShowAddDJ] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddJingle, setShowAddJingle] = useState(false);
  const [jingleForm, setJingleForm] = useState({ name: '', jingle_type: 'intro' });

  const handleGenArt = async () => {
    setGenArt(true);
    try {
      await api.generateStationArt(station.id);
      onRefresh();
    } catch (e: any) {
      alert(`Art generation failed: ${e.message || 'Check your API key in Settings'}`);
    } finally {
      setGenArt(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!confirm('Delete this station? This cannot be undone.')) return;
    try {
      await api.deleteStation(station.id);
      onBack();
    } catch (e: any) {
      alert(`Deletion failed: ${e.message}`);
    }
  };

  if (showEdit) {
    return (
      <StationForm
        existing={station}
        onCancel={() => setShowEdit(false)}
        onSave={() => { setShowEdit(false); onRefresh(); }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <div>
            <h2>📻 {station.name}</h2>
            <p>{station.tagline || station.description || 'No description'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-secondary" onClick={handleGenArt} disabled={genArt}>
            {genArt ? 'Generating...' : '🎨 Generate Art'}
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--status-failed)' }} onClick={handleDeleteStation}>
            Delete
          </button>
        </div>
      </div>

      {/* Station info cards */}
      <div className="detail-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Identity</h3></div>
          <div className="detail-fields">
            <DetailField label="Frequency" value={station.frequency} />
            <DetailField label="Genre" value={station.genre} />
            <DetailField label="Sub-genres" value={station.sub_genres} />
            <DetailField label="Mood" value={station.mood} />
            <DetailField label="Era" value={station.era} />
            <DetailField label="Broadcast Style" value={station.broadcast_style} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Lore</h3></div>
          <div className="detail-fields">
            <DetailField label="Location" value={station.location} />
            <DetailField label="Founded" value={station.founded_year} />
            <DetailField label="Owner" value={station.owner} />
            <DetailField label="Notes" value={station.lore_notes} />
          </div>
        </div>
        {station.art_path && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Station Art</h3></div>
            <img src={station.art_path} alt={station.name} style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
          </div>
        )}
      </div>

      {/* DJs */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
          <h3>🎙️ DJs ({djs.length})</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddDJ(!showAddDJ)}>+ Add DJ</button>
        </div>
        {showAddDJ && (
          <ArtistForm
            defaultStationId={station.id}
            onCancel={() => setShowAddDJ(false)}
            onSave={() => { setShowAddDJ(false); onRefresh(); }}
          />
        )}
        {djs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No DJs assigned to this station yet.</p>
        ) : (
          <div className="entity-grid">
            {djs.map(dj => (
              <div key={dj.id} className="card entity-card small">
                <div className="entity-card-art small">
                  {dj.portrait_path ? (
                    <img src={dj.portrait_path} alt={dj.name} />
                  ) : (
                    <div className="entity-card-placeholder small">🎙️</div>
                  )}
                </div>
                <div className="entity-card-info">
                  <h4>{dj.display_name || dj.name}</h4>
                  <span className="entity-card-sub">{dj.artist_type}</span>
                  {dj.speaking_style && <span className="tag">{dj.speaking_style}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jingles */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
          <h3>🔔 Jingles ({jingles.length})</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddJingle(!showAddJingle)}>+ Add Jingle</button>
        </div>
        {showAddJingle && (
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <input
                type="text"
                placeholder="Jingle name..."
                value={jingleForm.name}
                onChange={(e) => setJingleForm(f => ({ ...f, name: e.target.value }))}
                className="form-input"
                style={{ flex: 1 }}
              />
              <select
                value={jingleForm.jingle_type}
                onChange={(e) => setJingleForm(f => ({ ...f, jingle_type: e.target.value }))}
                className="form-input"
              >
                <option value="intro">Intro</option>
                <option value="outro">Outro</option>
                <option value="bumper">Bumper</option>
                <option value="sting">Sting</option>
                <option value="transition">Transition</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!jingleForm.name.trim()) return alert('Jingle name required');
                  try {
                    await api.createJingle({
                      station_id: station.id,
                      name: jingleForm.name,
                      jingle_type: jingleForm.jingle_type,
                    });
                    setJingleForm({ name: '', jingle_type: 'intro' });
                    setShowAddJingle(false);
                    onRefresh();
                  } catch (e: any) {
                    alert(`Failed to create jingle: ${e.message}`);
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}
        {jingles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No jingles yet.</p>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Duration</th><th></th></tr></thead>
              <tbody>
                {jingles.map(j => (
                  <tr key={j.id}>
                    <td>{j.name}</td>
                    <td><span className="tag">{j.jingle_type}</span></td>
                    <td><span className={`badge badge-${j.status}`}><span className="badge-dot" />{j.status}</span></td>
                    <td>{j.duration_seconds ? `${j.duration_seconds}s` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}
                        onClick={async () => {
                          if (!confirm('Delete this jingle?')) return;
                          try {
                            await api.deleteJingle(j.id);
                            onRefresh();
                          } catch (e: any) {
                            alert(`Failed to delete jingle: ${e.message}`);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Station Create/Edit Form ────────────────────────────────────── */

function StationForm({
  existing, onCancel, onSave,
}: {
  existing?: Station;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    tagline: existing?.tagline || '',
    description: existing?.description || '',
    frequency: existing?.frequency || '',
    genre: existing?.genre || '',
    sub_genres: existing?.sub_genres || '',
    mood: existing?.mood || '',
    era: existing?.era || '',
    broadcast_style: existing?.broadcast_style || '',
    color_palette: existing?.color_palette || '',
    location: existing?.location || '',
    founded_year: existing?.founded_year || '',
    owner: existing?.owner || '',
    lore_notes: existing?.lore_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Station name is required');
    setSaving(true);
    try {
      if (existing) {
        await api.updateStation(existing.id, form);
      } else {
        await api.createStation(form);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">📻 {existing ? 'Edit Station' : 'New Station'}</h3>
      </div>

      <div className="form-section">
        <div className="form-section-title">Identity</div>
        <div className="form-row">
          <FormField label="Station Name *" value={form.name} onChange={set('name')} placeholder="Nebula FM 99.8" />
          <FormField label="Frequency" value={form.frequency} onChange={set('frequency')} placeholder="99.8 FM" />
        </div>
        <FormField label="Tagline" value={form.tagline} onChange={set('tagline')} placeholder="The sound of tomorrow" />
        <FormTextarea label="Description" value={form.description} onChange={set('description')} placeholder="Full station description and lore..." />
      </div>

      <div className="form-section">
        <div className="form-section-title">Style & Sound</div>
        <div className="form-row">
          <FormField label="Genre" value={form.genre} onChange={set('genre')} placeholder="synthwave" />
          <FormField label="Sub-genres" value={form.sub_genres} onChange={set('sub_genres')} placeholder="darksynth|retrowave|cyberpunk" />
        </div>
        <div className="form-row">
          <FormField label="Mood" value={form.mood} onChange={set('mood')} placeholder="energetic" />
          <FormField label="Era" value={form.era} onChange={set('era')} placeholder="retro-future" />
        </div>
        <div className="form-row">
          <FormSelect label="Broadcast Style" value={form.broadcast_style} onChange={set('broadcast_style')}
            options={['', 'professional', 'pirate', 'underground', 'corporate', 'community', 'military', 'rebel']} />
          <FormField label="Color Palette" value={form.color_palette} onChange={set('color_palette')} placeholder="#00f5d4|#7b2ff7|#ff006e" />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Worldbuilding</div>
        <div className="form-row">
          <FormField label="Location" value={form.location} onChange={set('location')} placeholder="Orbital Platform Sigma-7" />
          <FormField label="Founded" value={form.founded_year} onChange={set('founded_year')} placeholder="2187" />
        </div>
        <FormField label="Owner / Corporation" value={form.owner} onChange={set('owner')} placeholder="Nexus Media Corp" />
        <FormTextarea label="Lore Notes" value={form.lore_notes} onChange={set('lore_notes')} placeholder="Additional worldbuilding details..." />
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Station'}
        </button>
      </div>
    </div>
  );
}


/* ── Artist Create Form (used inline in Station detail) ──────────── */

export function ArtistForm({
  existing, defaultStationId, onCancel, onSave,
}: {
  existing?: Artist;
  defaultStationId?: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [form, setForm] = useState({
    name: existing?.name || '',
    display_name: existing?.display_name || '',
    artist_type: existing?.artist_type || 'dj',
    station_id: existing?.station_id || defaultStationId || '',
    bio: existing?.bio || '',
    personality: existing?.personality || '',
    catchphrases: existing?.catchphrases || '',
    quirks: existing?.quirks || '',
    speaking_style: existing?.speaking_style || '',
    accent: existing?.accent || '',
    age: existing?.age || '',
    gender: existing?.gender || '',
    voice_description: existing?.voice_description || '',
    appearance: existing?.appearance || '',
    genre: existing?.genre || '',
    influences: existing?.influences || '',
    signature_sound: existing?.signature_sound || '',
    rivals: existing?.rivals || '',
    allies: existing?.allies || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listStations().then(setStations).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Name is required');
    setSaving(true);
    try {
      const payload = { ...form, station_id: form.station_id || undefined };
      if (existing) {
        await api.updateArtist(existing.id, payload);
      } else {
        await api.createArtist(payload);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">🎙️ {existing ? 'Edit Artist' : 'New Artist / DJ'}</h3>
      </div>

      <div className="form-section">
        <div className="form-section-title">Identity</div>
        <div className="form-row">
          <FormField label="Real Name *" value={form.name} onChange={set('name')} placeholder="Marcus Chen" />
          <FormField label="On-Air Name" value={form.display_name} onChange={set('display_name')} placeholder="DJ Vortex" />
        </div>
        <div className="form-row">
          <FormSelect label="Type" value={form.artist_type} onChange={set('artist_type')}
            options={['dj', 'musician', 'narrator', 'host', 'caller', 'guest']} />
          <FormSelectWithData label="Station" value={form.station_id} onChange={set('station_id')}
            options={stations}
            emptyLabel="— No station —"
          />
        </div>
        <div className="form-row">
          <FormField label="Age" value={form.age} onChange={set('age')} placeholder="34" />
          <FormField label="Gender" value={form.gender} onChange={set('gender')} placeholder="male" />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Personality & Voice</div>
        <FormTextarea label="Bio / Backstory" value={form.bio} onChange={set('bio')} placeholder="Full character backstory — where they came from, how they got into radio..." />
        <FormTextarea label="Personality" value={form.personality} onChange={set('personality')} placeholder="Charismatic, slightly paranoid, loves conspiracy theories..." />
        <div className="form-row">
          <FormField label="Speaking Style" value={form.speaking_style} onChange={set('speaking_style')} placeholder="fast-talking, excitable" />
          <FormField label="Accent" value={form.accent} onChange={set('accent')} placeholder="Brooklyn, robotic, Southern drawl" />
        </div>
        <FormField label="Catchphrases" value={form.catchphrases} onChange={set('catchphrases')} placeholder="Stay tuned, space cadets!|That's the frequency!" />
        <FormField label="Quirks / Habits" value={form.quirks} onChange={set('quirks')} placeholder="clicks pen|hums between segments|talks to equipment" />
        <FormTextarea label="Voice Description" value={form.voice_description} onChange={set('voice_description')} placeholder="Deep baritone with a slight gravel, warm and inviting..." />
      </div>

      <div className="form-section">
        <div className="form-section-title">Appearance (for AI Portrait)</div>
        <FormTextarea label="Physical Description" value={form.appearance} onChange={set('appearance')} placeholder="Tall, weathered face, neon-blue cybernetic eye, leather jacket with station patches..." />
      </div>

      <div className="form-section">
        <div className="form-section-title">Music & Relationships</div>
        <div className="form-row">
          <FormField label="Genre" value={form.genre} onChange={set('genre')} placeholder="synthwave" />
          <FormField label="Signature Sound" value={form.signature_sound} onChange={set('signature_sound')} placeholder="Analog synth with heavy reverb" />
        </div>
        <FormField label="Influences" value={form.influences} onChange={set('influences')} placeholder="Kraftwerk|Vangelis|Tangerine Dream" />
        <div className="form-row">
          <FormField label="Rivals" value={form.rivals} onChange={set('rivals')} placeholder="DJ Phantom|The Voice" />
          <FormField label="Allies" value={form.allies} onChange={set('allies')} placeholder="Luna Ray|Captain Frequency" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Artist'}
        </button>
      </div>
    </div>
  );
}


/* ── Shared Form Helpers ─────────────────────────────────────────── */

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function fieldId(label: string) {
  return label.toLowerCase().replace(/[\s*/\\]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+$/, '');
}

function FormField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} name={id} className="form-input" value={value} onChange={onChange} placeholder={placeholder} autoComplete="on" />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <textarea id={id} name={id} className="form-input form-textarea" value={value} onChange={onChange} placeholder={placeholder} rows={3} autoComplete="on" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} name={id} className="form-input" value={value} onChange={onChange} autoComplete="on">
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    </div>
  );
}

interface FormSelectWithDataProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id: string; name: string }>;
  emptyLabel?: string;
}

function FormSelectWithData({ label, value, onChange, options, emptyLabel = '— No selection —' }: FormSelectWithDataProps) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} name={id} className="form-input" value={value} onChange={onChange} autoComplete="on">
        <option value="">{emptyLabel}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
