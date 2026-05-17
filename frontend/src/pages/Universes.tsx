import { useState, useEffect } from "react";
import { api, type Universe } from "../api/client";
import { useFormInitialData } from "../hooks/useFormInitialData";
import { useFormManager } from "../contexts/FormManagerContext";
import { useFormDirtyState } from "../contexts/FormDirtyStateContext";
import { useToast } from "../components/Toast";

interface UniversesProps {
  /** Called when a universe is created while in "gate" mode (no active universe). */
  onUniverseCreated?: () => void;
  /** Called when a universe is deleted; passes the deleted universe's id. */
  onUniverseDeleted?: (id: string) => void;
}

export function Universes({
  onUniverseCreated,
  onUniverseDeleted,
}: UniversesProps = {}) {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newUniverseName, setNewUniverseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [researching, setResearching] = useState<string | null>(null);
  const [genArt, setGenArt] = useState<string | null>(null);
  const [editing, setEditing] = useState<Universe | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const formManager = useFormManager();
  const toast = useToast();

  const refresh = () => {
    api
      .listUniverses()
      .then(setUniverses)
      .catch((e) => console.error("Failed to load universes:", e));
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (formManager.isOpen && formManager.request?.entityType === "universe") {
      setShowCreate(true);
    }
  }, [formManager.isOpen, formManager.request]);

  const handleCreateUniverse = async () => {
    if (!newUniverseName.trim()) {
      toast.error("Universe name required");
      return;
    }
    setCreating(true);
    try {
      const universe = await api.createUniverse({ name: newUniverseName });
      setNewUniverseName("");
      setShowCreate(false);
      formManager.confirmForm();
      refresh();
      // Auto-select the new universe for research
      setSelectedUniverse(universe);
      // Notify App-level gate that a universe now exists
      onUniverseCreated?.();
      toast.success(`Created ${universe.name} successfully!`);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to create universe: ${errorMsg}`);
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
      toast.success("Research completed successfully!");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Research failed: ${errorMsg}`);
    } finally {
      setResearching(null);
    }
  };

  const handleGenArt = async (universeId: string) => {
    setGenArt(universeId);
    try {
      await api.generateUniverseArt(universeId);
      refresh();
      // Update selectedUniverse if it's the one we just generated art for
      if (selectedUniverse?.id === universeId) {
        const updated = universes.find((u) => u.id === universeId);
        if (updated) setSelectedUniverse(updated);
      }
      toast.success("Universe art generated successfully!");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Art generation failed: ${errorMsg}`);
    } finally {
      setGenArt(null);
    }
  };

  const handleUpdateUniverse = async (universe: Universe) => {
    try {
      const updated = await api.updateUniverse(universe.id, universe);
      setSelectedUniverse(updated);
      setEditing(null);
      refresh();
      toast.success(`Updated ${universe.name}`);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Update failed: ${errorMsg}`);
    }
  };

  const handleDeleteUniverse = async (id: string) => {
    if (!confirm("Delete this universe? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.deleteUniverse(id);
      if (selectedUniverse?.id === id) setSelectedUniverse(null);
      onUniverseDeleted?.(id);
      refresh();
      toast.success("Universe deleted successfully!");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Delete failed: ${errorMsg}`);
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
        onGenArt={() => handleGenArt(selectedUniverse.id)}
        onEdit={() => setEditing(selectedUniverse)}
        onDelete={() => handleDeleteUniverse(selectedUniverse.id)}
        isResearching={researching === selectedUniverse.id}
        isGenArt={genArt === selectedUniverse.id}
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
        <UniverseCreateForm
          onCancel={() => {
            setShowCreate(false);
            setNewUniverseName("");
            formManager.closeForm();
          }}
          onSave={() => {
            setShowCreate(false);
            setNewUniverseName("");
            formManager.confirmForm();
            refresh();
            onUniverseCreated?.();
          }}
        />
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
                style={{ marginBottom: "var(--space-md)" }}
              >
                {u.art_path ? (
                  <img
                    src={u.art_path}
                    alt={u.name}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      minHeight: "160px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "3rem",
                    }}
                  >
                    🌍
                  </div>
                )}
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
  onGenArt: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isResearching: boolean;
  isGenArt: boolean;
  isDeleting: boolean;
}

function UniverseDetail({
  universe,
  onBack,
  onResearch,
  onGenArt,
  onEdit,
  onDelete,
  isResearching,
  isGenArt,
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

        {/* Artwork */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Artwork</h3>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            {universe.art_path ? (
              <div>
                <img
                  src={universe.art_path}
                  alt={universe.name}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "cover",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-md)",
                  }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={onGenArt}
                  disabled={isGenArt}
                >
                  {isGenArt ? "🎨 Generating..." : "🎨 Regenerate Artwork"}
                </button>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  No artwork generated yet. Click below to create visual art for
                  this universe.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={onGenArt}
                  disabled={isGenArt}
                >
                  {isGenArt ? "🎨 Generating..." : "🎨 Generate Artwork"}
                </button>
              </div>
            )}
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

/* ── Universe Create Form ────────────────────────────────────── */

interface UniverseCreateFormProps {
  onCancel: () => void;
  onSave: () => void;
}

function UniverseCreateForm({ onCancel, onSave }: UniverseCreateFormProps) {
  const { initialData, isAiGenerated } = useFormInitialData("universe");
  const { setDirty } = useFormDirtyState();
  const toast = useToast();

  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    genre_hints: initialData?.genre_hints || "",
    mood_hints: initialData?.mood_hints || "",
    setting: initialData?.setting || "",
    era: initialData?.era || "",
    publisher: initialData?.publisher || "",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setDirty(true);
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Universe name is required");
      return;
    }
    setSaving(true);
    try {
      await api.stageUniverse(form);
      toast.success(`Staged ${form.name} for review!`);
      setDirty(false);
      onSave();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to stage universe: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const aiFilled = isAiGenerated ? "form-ai-filled" : "";

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">🌍 New Universe</h3>
      </div>

      {isAiGenerated && (
        <div className="ai-review-banner" role="alert">
          ⚠️ AI-generated universe. Please review and edit before creating.
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">Basic Info</div>
        <div className="form-group">
          <label htmlFor="universe-name" className="form-label">
            Universe Name *
          </label>
          <input
            id="universe-name"
            name="name"
            data-field="name"
            data-section="identity"
            data-type="universe"
            className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Cyberpunk 2077"
            aria-label="Universe Name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="universe-publisher" className="form-label">
            Publisher / Creator
          </label>
          <input
            id="universe-publisher"
            name="publisher"
            data-field="publisher"
            data-section="identity"
            data-type="universe"
            className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
            value={form.publisher}
            onChange={set("publisher")}
            placeholder="CD Projekt Red, Blizzard, etc."
            aria-label="Publisher"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Description</div>
        <div className="form-group">
          <label htmlFor="universe-description" className="form-label">
            Description
          </label>
          <textarea
            id="universe-description"
            name="description"
            data-field="description"
            data-section="lore"
            data-type="universe"
            className={`form-input form-textarea${aiFilled ? ` ${aiFilled}` : ""}`}
            value={form.description}
            onChange={set("description")}
            placeholder="Full world description and context..."
            rows={4}
            aria-label="Description"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Atmosphere & Hints</div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="universe-genre-hints" className="form-label">
              Genre Hints (pipe-separated)
            </label>
            <input
              id="universe-genre-hints"
              name="genre_hints"
              data-field="genre_hints"
              data-section="music"
              data-type="universe"
              className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
              value={form.genre_hints}
              onChange={set("genre_hints")}
              placeholder="synthwave|cyberpunk|ambient"
              aria-label="Genre Hints"
            />
          </div>
          <div className="form-group">
            <label htmlFor="universe-mood-hints" className="form-label">
              Mood Hints (pipe-separated)
            </label>
            <input
              id="universe-mood-hints"
              name="mood_hints"
              data-field="mood_hints"
              data-section="music"
              data-type="universe"
              className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
              value={form.mood_hints}
              onChange={set("mood_hints")}
              placeholder="dark|mysterious|energetic"
              aria-label="Mood Hints"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="universe-setting" className="form-label">
              Setting
            </label>
            <input
              id="universe-setting"
              name="setting"
              data-field="setting"
              data-section="lore"
              data-type="universe"
              className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
              value={form.setting}
              onChange={set("setting")}
              placeholder="e.g. futuristic city"
              aria-label="Setting"
            />
          </div>
          <div className="form-group">
            <label htmlFor="universe-era" className="form-label">
              Era
            </label>
            <input
              id="universe-era"
              name="era"
              data-field="era"
              data-section="lore"
              data-type="universe"
              className={`form-input${aiFilled ? ` ${aiFilled}` : ""}`}
              value={form.era}
              onChange={set("era")}
              placeholder="e.g. futuristic, medieval"
              aria-label="Era"
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Creating..." : "Create Universe"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
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
  const { initialData, isAiGenerated } = useFormInitialData("universe");
  const { setDirty } = useFormDirtyState();
  const toast = useToast();

  const [form, setForm] = useState({
    ...universe,
    description: universe.description || initialData?.description || "",
    genre_hints: universe.genre_hints || initialData?.genre_hints || "",
    mood_hints: universe.mood_hints || initialData?.mood_hints || "",
    setting: universe.setting || initialData?.setting || "",
    era: universe.era || initialData?.era || "",
    publisher: universe.publisher || initialData?.publisher || "",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setDirty(true);
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave(form);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Edit Universe: {universe.name}</h2>
      </div>

      {/* AI-generated warning banner */}
      {isAiGenerated && (
        <div className="ai-review-banner" role="alert">
          ⚠️ AI-generated universe. Please review and edit before saving.
        </div>
      )}

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
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              data-field="description"
              data-section="lore"
              data-type="universe"
              className="form-input form-textarea"
              style={{ minHeight: "300px", fontFamily: "monospace" }}
              value={form.description}
              onChange={set("description")}
              placeholder="Full world description..."
              aria-label="Description"
            />
          </div>

          {/* Genre Hints */}
          <div>
            <label htmlFor="genre-hints" className="form-label">
              Genre Hints (pipe-separated)
            </label>
            <input
              id="genre-hints"
              name="genre_hints"
              data-field="genre_hints"
              data-section="music"
              data-type="universe"
              type="text"
              className="form-input"
              value={form.genre_hints}
              onChange={set("genre_hints")}
              placeholder="synthwave|cyberpunk|ambient"
              aria-label="Genre Hints"
            />
          </div>

          {/* Mood Hints */}
          <div>
            <label htmlFor="mood-hints" className="form-label">
              Mood Hints (pipe-separated)
            </label>
            <input
              id="mood-hints"
              name="mood_hints"
              data-field="mood_hints"
              data-section="music"
              data-type="universe"
              type="text"
              className="form-input"
              value={form.mood_hints}
              onChange={set("mood_hints")}
              placeholder="dark|mysterious|energetic"
              aria-label="Mood Hints"
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
              <label htmlFor="setting" className="form-label">
                Setting
              </label>
              <input
                id="setting"
                name="setting"
                data-field="setting"
                data-section="lore"
                data-type="universe"
                type="text"
                className="form-input"
                value={form.setting}
                onChange={set("setting")}
                placeholder="e.g. futuristic city"
                aria-label="Setting"
              />
            </div>
            <div>
              <label htmlFor="era" className="form-label">
                Era
              </label>
              <input
                id="era"
                name="era"
                data-field="era"
                data-section="lore"
                data-type="universe"
                type="text"
                className="form-input"
                value={form.era}
                onChange={set("era")}
                placeholder="e.g. futuristic"
                aria-label="Era"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              data-field="status"
              data-section="identity"
              data-type="universe"
              className="form-input"
              value={form.status}
              onChange={set("status")}
              aria-label="Status"
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
