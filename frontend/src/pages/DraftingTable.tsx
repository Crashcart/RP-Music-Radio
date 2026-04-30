import { useState } from 'react';
import { api, type Draft } from '../api/client';

interface IngestRow {
  station_name: string;
  artist_name: string;
  genre: string;
  mood: string;
  items: string;
}

interface Props {
  drafts: Draft[];
  onRefresh: () => void;
}

export function DraftingTable({ drafts, onRefresh }: Props) {
  const [showIngest, setShowIngest] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const committable = drafts.filter(d => d.status === 'draft' || d.status === 'fleshed_out');
    if (selected.size === committable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(committable.map(d => d.id)));
    }
  };

  const handleCommit = async () => {
    if (selected.size === 0) return;
    try {
      await api.commitDrafts(Array.from(selected));
      setSelected(new Set());
      onRefresh();
    } catch (err) {
      alert(`Commit failed: ${err}`);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'badge-draft',
      fleshed_out: 'badge-fleshed',
      committed: 'badge-committed',
      generating: 'badge-generating',
      completed: 'badge-completed',
      failed: 'badge-failed',
    };
    return (
      <span className={`badge ${map[status] || 'badge-draft'}`}>
        <span className="badge-dot" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2>📋 Drafting Table</h2>
          <p>Stage, edit, and commit your radio content seeds</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {selected.size > 0 && (
            <button className="btn btn-primary" onClick={handleCommit}>
              ⚡ Commit {selected.size} Draft{selected.size > 1 ? 's' : ''}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowIngest(true)}>
            ＋ Add Seeds
          </button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-title">No drafts yet</div>
            <div className="empty-description">
              Upload a CSV or manually add station seeds to get started.
            </div>
            <button className="btn btn-primary" onClick={() => setShowIngest(true)}>
              ＋ Add Your First Seeds
            </button>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <div className="table-header">
            <h3>{drafts.length} Draft{drafts.length !== 1 ? 's' : ''}</h3>
            <button className="btn btn-sm btn-secondary" onClick={selectAll}>
              {selected.size > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Mobile: card layout */}
          <div className="draft-cards-mobile">
            {drafts.map(draft => (
              <div key={draft.id} className={`draft-card-mobile ${selected.has(draft.id) ? 'selected' : ''}`}>
                <div className="draft-card-top">
                  {(draft.status === 'draft' || draft.status === 'fleshed_out') && (
                    <input
                      type="checkbox"
                      checked={selected.has(draft.id)}
                      onChange={() => toggleSelect(draft.id)}
                      className="draft-checkbox"
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{draft.artist_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{draft.station_name}</div>
                  </div>
                  {statusBadge(draft.status)}
                </div>
                <div className="draft-card-meta">
                  {draft.genre && <span className="meta-tag">{draft.genre}</span>}
                  {draft.mood && <span className="meta-tag">{draft.mood}</span>}
                  {draft.items && <span className="meta-tag">{draft.items.split('|').length} items</span>}
                </div>
                {draft.script && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {draft.script.slice(0, 100)}...
                  </div>
                )}
                <div className="draft-card-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(draft.id)}>Edit</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <table className="data-table draft-table-desktop">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Artist / DJ</th>
                <th>Station</th>
                <th>Genre</th>
                <th>Mood</th>
                <th>Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(draft => (
                <tr key={draft.id}>
                  <td>
                    {(draft.status === 'draft' || draft.status === 'fleshed_out') && (
                      <input
                        type="checkbox"
                        checked={selected.has(draft.id)}
                        onChange={() => toggleSelect(draft.id)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{draft.artist_name}</td>
                  <td>{draft.station_name}</td>
                  <td><span className="meta-tag">{draft.genre || '—'}</span></td>
                  <td>{draft.mood || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {draft.items ? draft.items.split('|').length : 0}
                  </td>
                  <td>{statusBadge(draft.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(draft.id)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ingest Modal */}
      {showIngest && (
        <IngestModal
          onClose={() => setShowIngest(false)}
          onSuccess={() => { setShowIngest(false); onRefresh(); }}
        />
      )}

      {/* Edit Modal */}
      {editingId && (
        <EditModal
          draft={drafts.find(d => d.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSave={() => { setEditingId(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ── Ingest Modal ───────────────────────────────────────────────── */

function IngestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [rows, setRows] = useState<IngestRow[]>([
    { station_name: '', artist_name: '', genre: '', mood: '', items: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const updateRow = (i: number, field: keyof IngestRow, value: string) => {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, { station_name: '', artist_name: '', genre: '', mood: '', items: '' }]);
  };

  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.station_name && r.artist_name);
    if (valid.length === 0) return;
    setLoading(true);
    try {
      await api.ingest(valid);
      onSuccess();
    } catch (err) {
      alert(`Ingest failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">📡 Add Station Seeds</h3>

        {rows.map((row, i) => (
          <div key={i} style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Seed #{i + 1}</span>
              {rows.length > 1 && (
                <button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>✕</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor={`station-name-${i}`}>Station Name *</label>
                <input id={`station-name-${i}`} name={`station_name_${i}`} aria-label="Station Name" className="input" placeholder="Nebula FM 99.8" value={row.station_name} onChange={e => updateRow(i, 'station_name', e.target.value)} autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`artist-name-${i}`}>Artist / DJ *</label>
                <input id={`artist-name-${i}`} name={`artist_name_${i}`} aria-label="Artist / DJ" className="input" placeholder="Vance Rikard" value={row.artist_name} onChange={e => updateRow(i, 'artist_name', e.target.value)} autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`genre-${i}`}>Genre</label>
                <input id={`genre-${i}`} name={`genre_${i}`} aria-label="Genre" className="input" placeholder="synthwave" value={row.genre} onChange={e => updateRow(i, 'genre', e.target.value)} autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`mood-${i}`}>Mood</label>
                <input id={`mood-${i}`} name={`mood_${i}`} aria-label="Mood" className="input" placeholder="energetic" value={row.mood} onChange={e => updateRow(i, 'mood', e.target.value)} autoComplete="off" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`items-${i}`}>Items (pipe-separated)</label>
              <input id={`items-${i}`} name={`items_${i}`} aria-label="Items" className="input" placeholder="Fusion Core|Med-Kit|Ammo" value={row.items} onChange={e => updateRow(i, 'items', e.target.value)} autoComplete="off" />
            </div>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addRow} style={{ width: '100%', justifyContent: 'center' }}>
          ＋ Add Another Seed
        </button>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Ingesting...' : `Ingest ${rows.filter(r => r.station_name && r.artist_name).length} Seed(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ─────────────────────────────────────────────────── */

function EditModal({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ ...draft });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateDraft(draft.id, {
        station_name: form.station_name,
        artist_name: form.artist_name,
        genre: form.genre,
        mood: form.mood,
        items: form.items,
        script: form.script,
        backstory: form.backstory,
        market_research: form.market_research,
      });
      onSave();
    } catch (err) {
      alert(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h3 className="modal-title">✏️ Edit Draft</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-station">Station</label>
            <input id="edit-station" name="station_name" aria-label="Station" className="input" value={form.station_name} onChange={e => setForm({ ...form, station_name: e.target.value })} autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-artist">Artist / DJ</label>
            <input id="edit-artist" name="artist_name" aria-label="Artist / DJ" className="input" value={form.artist_name} onChange={e => setForm({ ...form, artist_name: e.target.value })} autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-genre">Genre</label>
            <input id="edit-genre" name="genre" aria-label="Genre" className="input" value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-mood">Mood</label>
            <input id="edit-mood" name="mood" aria-label="Mood" className="input" value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })} autoComplete="off" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-items">Items</label>
          <input id="edit-items" name="items" aria-label="Items" className="input" value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} autoComplete="off" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-script">Script</label>
          <textarea id="edit-script" name="script" aria-label="Script" className="input" rows={6} value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} placeholder="AI-generated or hand-written DJ script..." />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-backstory">Backstory</label>
          <textarea id="edit-backstory" name="backstory" aria-label="Backstory" className="input" rows={3} value={form.backstory} onChange={e => setForm({ ...form, backstory: e.target.value })} placeholder="Character backstory..." />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-market-research">Market Research</label>
          <textarea id="edit-market-research" name="market_research" aria-label="Market Research" className="input" rows={2} value={form.market_research} onChange={e => setForm({ ...form, market_research: e.target.value })} placeholder="In-universe ad copy..." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
