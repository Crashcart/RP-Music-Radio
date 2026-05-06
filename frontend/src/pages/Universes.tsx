import { useState, useEffect } from "react";
import { api, type Universe } from "../api/client";

export function Universes() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newUniverseName, setNewUniverseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [researching, setResearching] = useState<string | null>(null);
  const [editing, setEditing] = useState<Universe | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = () => {
    api
      .listUniverses()
      .then(setUniverses)
      .catch((e) => console.error("Failed to load universes:", e));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreateUniverse = async () => {
    if (!newUniverseName.trim()) return alert("Universe name required");
    setCreating(true);
    try {
      const universe = await api.createUniverse({ name: newUniverseName });
      setNewUniverseName("");
      setShowCreate(false);
      refresh();
      // Auto-select the new universe for research
      setSelectedUniverse(universe);
    } catch (e: unknown) {
      alert(
        `Failed to create universe: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const handleResearch = async (universeId: string) => {
    setResearching(universeId);
    try {
      const researched = await api.researchUniverse(universeId);
      setSelectedUniverse(researched);
      refresh();
    } catch (e: unknown) {
      alert(`Research failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResearching(null);
    }
  };

  const handleUpdateUniverse = async (universe: Universe) => {
    try {
      const updated = await api.updateUniverse(universe.id, universe);
      setSelectedUniverse(updated);
      setEditing(null);
      refresh();
    } catch (e: unknown) {
      alert(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDeleteUniverse = async (id: string) => {
    if (!confirm("Delete this universe? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.deleteUniverse(id);
      if (selectedUniverse?.id === id) setSelectedUniverse(null);
      refresh();
    } catch (e: unknown) {
      alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleting(null);
    }
  };

  if (editing) {
    return (
      <UniverseEditForm
        universe={editing}
        onSave={handleUpdateUniverse}
        onCancel={() => setEditing(null)}
      />
    );
  }

  if (selectedUniverse) {
    return (
      <UniverseDetail
        universe={selectedUniverse}
        onBack={() => setSelectedUniverse(null)}
        onResearch={() => handleResearch(selectedUniverse.id)}
        onEdit={() => setEditing(selectedUniverse)}
        onDelete={() => handleDeleteUniverse(selectedUniverse.id)}
        isResearching={researching === selectedUniverse.id}
        isDeleting={deleting === selectedUniverse.id}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🌍 Game Worlds & Universes</h2>
          <p>Create universes to influence DJ personalities, songs, and ads</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Universe
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1 }}>
              <label htmlFor="universe-name" style={{ display: "block" }}>
                Game / World Name
              </label>
              <input
                id="universe-name"
                type="text"
                className="form-input"
                placeholder="e.g. Cyberpunk 2077, The Witcher 3, Skyrim"
                value={newUniverseName}
                onChange={(e) => setNewUniverseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateUniverse();
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={creating}
              onClick={handleCreateUniverse}
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setShowCreate(false);
                setNewUniverseName("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {universes.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "var(--space-xxl)" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>
            🌍
          </div>
          <h3>No universes yet</h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Create a game world and let AI research its lore, atmosphere, and
            unique features.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Universe
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {universes.map((u) => (
            <div
              key={u.id}
              className="card entity-card"
              onClick={() => setSelectedUniverse(u)}
              style={{ cursor: "pointer" }}
            >
              <div
                className="entity-card-art"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  minHeight: "150px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-md)",
                }}
              >
                <span style={{ fontSize: "3rem" }}>🌍</span>
              </div>
              <div className="entity-card-info">
                <h3>{u.name}</h3>
                {u.publisher && (
                  <span className="entity-card-sub">
                    Publisher: {u.publisher}
                  </span>
                )}
                <div className="entity-card-tags">
                  <span className={`tag badge-${u.status}`}>{u.status}</span>
                  {u.era && <span className="tag">{u.era}</span>}
                  {u.setting && <span className="tag">{u.setting}</span>}
                </div>
                {u.description && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginTop: "var(--space-sm)",
                    }}
                  >
                    {u.description.substring(0, 80)}
                    {u.description.length > 80 ? "…" : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Universe Detail View ────────────────────────────────────── */

interface UniverseDetailProps {
  universe: Universe;
  onBack: () => void;
  onResearch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isResearching: boolean;
  isDeleting: boolean;
}

function UniverseDetail({
  universe,
  onBack,
  onResearch,
  onEdit,
  onDelete,
  isResearching,
  isDeleting,
}: UniverseDetailProps) {
  return (
    <div>
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
          }}
        >
          <button className="btn btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <div>
            <h2>🌍 {universe.name}</h2>
            <p>{universe.publisher || "Unknown publisher"}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {universe.status === "draft" && (
            <button
              className="btn btn-primary"
              onClick={onResearch}
              disabled={isResearching}
            >
              {isResearching ? "⏳ Researching..." : "🔍 Research"}
            </button>
          )}
          {universe.status !== "draft" && (
            <button className="btn btn-secondary" onClick={onEdit}>
              Edit
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ color: "var(--status-failed)" }}
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Status</h3>
          </div>
          <div className="detail-fields">
            <div style={{ marginBottom: "var(--space-md)" }}>
              <span className={`badge badge-${universe.status}`}>
                <span className="badge-dot" />
                {universe.status}
              </span>
            </div>
            <DetailField label="Name" value={universe.name} />
            <DetailField label="Publisher" value={universe.publisher} />
            <DetailField label="Setting" value={universe.setting} />
            <DetailField label="Era" value={universe.era} />
          </div>
        </div>

        {/* Content Hints */}
        {(universe.genre_hints || universe.mood_hints) && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Content Hints</h3>
            </div>
            <div className="detail-fields">
              {universe.genre_hints && (
                <div style={{ marginBottom: "var(--space-md)" }}>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Genre
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-sm)",
                      flexWrap: "wrap",
                    }}
                  >
                    {universe.genre_hints.split("|").map((g) => (
                      <span key={g} className="tag">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {universe.mood_hints && (
                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Mood
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-sm)",
                      flexWrap: "wrap",
                    }}
                  >
                    {universe.mood_hints.split("|").map((m) => (
                      <span key={m} className="tag">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {universe.description && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <div className="card-header">
            <h3 className="card-title">World Description</h3>
          </div>
          <div style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
            {universe.description}
          </div>
        </div>
      )}

      {/* Research Summary */}
      {universe.research_summary && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <div className="card-header">
            <h3 className="card-title">Quick Reference</h3>
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {universe.research_summary}
          </div>
        </div>
      )}

      {/* Research Links */}
      {universe.research_links && (
        <div className="card" style={{ marginTop: "var(--space-lg)" }}>
          <div className="card-header">
            <h3 className="card-title">Research Links</h3>
          </div>
          <div>
            {/* Parse and display research links from JSON */}
            {(() => {
              try {
                const links = JSON.parse(universe.research_links);
                if (Array.isArray(links) && links.length > 0) {
                  return (
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {links.map((link, idx) => (
                        <li
                          key={idx}
                          style={{ marginBottom: "var(--space-sm)" }}
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--link-color)" }}
                          >
                            {link.title || link.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  );
                }
              } catch {
                // Invalid JSON
              }
              return <p style={{ color: "var(--text-muted)" }}>No links yet</p>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Universe Edit Form ──────────────────────────────────────── */

interface UniverseEditFormProps {
  universe: Universe;
  onSave: (universe: Universe) => void;
  onCancel: () => void;
}

function UniverseEditForm({
  universe,
  onSave,
  onCancel,
}: UniverseEditFormProps) {
  const [form, setForm] = useState(universe);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Edit Universe: {universe.name}</h2>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
          }}
        >
          {/* Description */}
          <div>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-input"
              style={{ minHeight: "300px", fontFamily: "monospace" }}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Full world description..."
            />
          </div>

          {/* Genre Hints */}
          <div>
            <label htmlFor="genre-hints">Genre Hints (pipe-separated)</label>
            <input
              id="genre-hints"
              type="text"
              className="form-input"
              value={form.genre_hints}
              onChange={(e) =>
                setForm({ ...form, genre_hints: e.target.value })
              }
              placeholder="synthwave|cyberpunk|ambient"
            />
          </div>

          {/* Mood Hints */}
          <div>
            <label htmlFor="mood-hints">Mood Hints (pipe-separated)</label>
            <input
              id="mood-hints"
              type="text"
              className="form-input"
              value={form.mood_hints}
              onChange={(e) => setForm({ ...form, mood_hints: e.target.value })}
              placeholder="dark|mysterious|energetic"
            />
          </div>

          {/* Setting & Era */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-md)",
            }}
          >
            <div>
              <label htmlFor="setting">Setting</label>
              <input
                id="setting"
                type="text"
                className="form-input"
                value={form.setting}
                onChange={(e) => setForm({ ...form, setting: e.target.value })}
                placeholder="e.g. futuristic city"
              />
            </div>
            <div>
              <label htmlFor="era">Era</label>
              <input
                id="era"
                type="text"
                className="form-input"
                value={form.era}
                onChange={(e) => setForm({ ...form, era: e.target.value })}
                placeholder="e.g. futuristic"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              className="form-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Field Component ──────────────────────────────────── */

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "var(--space-md)" }}>
      <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
        {label}
      </label>
      <p style={{ margin: "var(--space-xs) 0 0 0" }}>{value}</p>
    </div>
  );
}
