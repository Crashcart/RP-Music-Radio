import { useState, useEffect, useRef, useCallback } from "react";
import { api, type Station, type Artist, type Jingle } from "../api/client";

/** Toast notification for undo after approve. */
interface UndoToast {
  /** Single artist ID, or 'bulk' for a multi-DJ approval. */
  artistId: string;
  artistName: string;
  expiresAt: number; // epoch ms
  /** IDs of all artists involved (populated for bulk approvals). */
  bulkIds?: string[];
}

export function Stations({
  isMobile: _isMobile,
  onStationSelect,
}: {
  isMobile?: boolean;
  /** Called whenever the user enters or leaves a station detail view.
   *  Parent (App.tsx) uses this to inject station context into ChatAssistant. */
  onStationSelect?: (station: Station | null) => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [stationDJs, setStationDJs] = useState<Artist[]>([]);
  const [stationJingles, setStationJingles] = useState<Jingle[]>([]);

  const refresh = () => {
    api
      .listStations()
      .then(setStations)
      .catch((e) => console.error("Failed to load stations:", e));
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      api
        .listArtists(selectedStation.id)
        .then(setStationDJs)
        .catch((e) => console.error("Failed to load station DJs:", e));
      api
        .listJingles(selectedStation.id)
        .then(setStationJingles)
        .catch((e) => console.error("Failed to load station jingles:", e));
    }
  }, [selectedStation]);

  /** Set selected station and notify parent (App.tsx) for ChatAssistant context. */
  const selectStation = (station: Station | null) => {
    setSelectedStation(station);
    onStationSelect?.(station);
  };

  if (selectedStation) {
    return (
      <StationDetail
        station={selectedStation}
        djs={stationDJs}
        jingles={stationJingles}
        onBack={() => selectStation(null)}
        onRefresh={() => {
          api
            .getStation(selectedStation.id)
            .then((updated) => selectStation(updated))
            .catch((e) => console.error("Failed to reload station:", e));
          api
            .listArtists(selectedStation.id)
            .then(setStationDJs)
            .catch((e) => console.error("Failed to reload DJs:", e));
          api
            .listJingles(selectedStation.id)
            .then(setStationJingles)
            .catch((e) => console.error("Failed to reload jingles:", e));
        }}
      />
    );
  }

  if (showCreate) {
    return (
      <StationForm
        onCancel={() => setShowCreate(false)}
        onSave={() => {
          setShowCreate(false);
          refresh();
        }}
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
        <div
          className="card"
          style={{ textAlign: "center", padding: "var(--space-xxl)" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>
            📻
          </div>
          <h3 style={{ color: "var(--text-primary)" }}>No stations yet</h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Create your first radio station to get started.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Station
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {stations.map((s) => (
            <div
              key={s.id}
              className="card entity-card"
              onClick={() => selectStation(s)}
            >
              <div className="entity-card-art">
                {s.art_path ? (
                  <img src={s.art_path} alt={s.name} />
                ) : (
                  <div className="entity-card-placeholder">📻</div>
                )}
              </div>
              <div className="entity-card-info">
                <h3>{s.name}</h3>
                {s.frequency && (
                  <span className="entity-card-sub">{s.frequency}</span>
                )}
                {s.tagline && (
                  <p className="entity-card-tagline">{s.tagline}</p>
                )}
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
  station,
  djs,
  jingles,
  onBack,
  onRefresh,
}: {
  station: Station;
  djs: Artist[];
  jingles: Jingle[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [genArt, setGenArt] = useState(false);
  const [generatingPortrait, setGeneratingPortrait] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [showAddDJ, setShowAddDJ] = useState(false);
  const [addDJMode, setAddDJMode] = useState<"manual" | "ai" | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddJingle, setShowAddJingle] = useState(false);
  const [jingleForm, setJingleForm] = useState({
    name: "",
    jingle_type: "intro",
  });
  const [savingJingle, setSavingJingle] = useState(false);
  const [deletingJingleId, setDeletingJingleId] = useState<string | null>(null);

  // Pending AI DJs state
  const [pendingDJs, setPendingDJs] = useState<Artist[]>([]);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(
    null,
  );
  const [editingPendingDJ, setEditingPendingDJ] = useState<Artist | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(30);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Load pending (draft) DJs for this station. */
  const refreshPendingDJs = useCallback(() => {
    api
      .listStagedArtists({ stationId: station.id })
      .then(setPendingDJs)
      .catch((e: Error) => console.error("Failed to load pending DJs:", e));
  }, [station.id]);

  useEffect(() => {
    refreshPendingDJs();
  }, [refreshPendingDJs]);

  /** Clear the countdown timer on unmount or toast dismiss. */
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  /** Start/restart the 30-second undo countdown for a toast. */
  const startUndoCountdown = (toast: UndoToast) => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setUndoToast(toast);
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((toast.expiresAt - Date.now()) / 1000),
      );
      setUndoCountdown(remaining);
      if (remaining <= 0) {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        setUndoToast(null);
      }
    };
    updateCountdown();
    undoTimerRef.current = setInterval(updateCountdown, 1000);
  };

  const handleApprovePendingDJ = async (djId: string) => {
    try {
      const updated = await api.publishArtist(djId);
      refreshPendingDJs();
      onRefresh();
      if (updated.undo_expires_at) {
        startUndoCountdown({
          artistId: djId,
          artistName: updated.display_name || updated.name,
          expiresAt: new Date(updated.undo_expires_at).getTime(),
        });
      }
    } catch (e: unknown) {
      alert(`Approve failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRejectPendingDJ = async (djId: string) => {
    if (!confirm("Reject and delete this draft DJ?")) return;
    try {
      await api.rejectArtist(djId);
      refreshPendingDJs();
    } catch (e: unknown) {
      alert(`Reject failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm(`Approve all ${pendingDJs.length} pending DJs?`)) return;
    const ids = pendingDJs.map((d) => d.id);
    try {
      const results = await api.bulkPublish(ids);
      refreshPendingDJs();
      onRefresh();
      if (results.length > 0 && results[0].undo_expires_at) {
        startUndoCountdown({
          artistId: "bulk",
          artistName: `${results.length} DJs`,
          expiresAt: new Date(results[0].undo_expires_at).getTime(),
          // Track the approved IDs so bulk undo can revert them precisely.
          bulkIds: results.map((r) => r.id),
        });
      }
    } catch (e: unknown) {
      alert(
        `Bulk approve failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const handleRejectAll = async () => {
    if (!confirm(`Reject and delete all ${pendingDJs.length} pending DJs?`))
      return;
    const ids = pendingDJs.map((d) => d.id);
    try {
      await api.bulkReject(ids);
      refreshPendingDJs();
    } catch (e: unknown) {
      alert(
        `Bulk reject failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const handleUndoApprove = async () => {
    if (!undoToast) return;
    const targetId = undoToast.artistId;
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setUndoToast(null);
    try {
      if (targetId === "bulk") {
        // Use the stored bulkIds to call the dedicated bulk-undo endpoint.
        const ids = undoToast.bulkIds ?? [];
        if (ids.length === 0) {
          alert(
            "No artist IDs to undo — the undo window may have already expired.",
          );
          return;
        }
        const result = await api.bulkUndo(ids);
        const skipped = ids.length - result.reverted_count;
        if (skipped > 0) {
          alert(
            `Reverted ${result.reverted_count} of ${ids.length} DJs. ` +
              `${skipped} could not be undone (undo window may have expired for those).`,
          );
        }
      } else {
        await api.undoPublish(targetId);
      }
      refreshPendingDJs();
      onRefresh();
    } catch (e: unknown) {
      alert(`Undo failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleGenArt = async () => {
    setGenArt(true);
    try {
      await api.generateStationArt(station.id);
      onRefresh();
    } catch (e: unknown) {
      alert(
        `Art generation failed: ${e instanceof Error ? e.message : "Check your API key in Settings"}`,
      );
    } finally {
      setGenArt(false);
    }
  };

  const handleGenerateArt = handleGenArt;

  const handleGeneratePortrait = async (djId: string) => {
    setGeneratingPortrait(djId);
    try {
      await api.generatePortrait(djId);
      onRefresh();
    } catch (e: unknown) {
      alert(
        `Portrait generation failed: ${e instanceof Error ? e.message : "Check your API key in Settings"}`,
      );
    } finally {
      setGeneratingPortrait(null);
    }
  };

  const handleDeleteStation = async () => {
    if (!confirm("Delete this station? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteStation(station.id);
      onBack();
    } catch (e: unknown) {
      alert(`Deletion failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleting(false);
    }
  };

  if (editingPendingDJ) {
    return (
      <div>
        <div className="page-header">
          <h2>
            🎙️ Edit Draft DJ:{" "}
            {editingPendingDJ.display_name || editingPendingDJ.name}
          </h2>
        </div>
        <ArtistForm
          existing={editingPendingDJ}
          defaultStationId={station.id}
          aiGenerated={true}
          onCancel={() => setEditingPendingDJ(null)}
          onSave={() => {
            setEditingPendingDJ(null);
            refreshPendingDJs();
          }}
        />
      </div>
    );
  }

  if (showEdit) {
    return (
      <StationForm
        existing={station}
        onCancel={() => setShowEdit(false)}
        onSave={() => {
          setShowEdit(false);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div>
      {/* Undo toast */}
      {undoToast && (
        <div className="undo-toast" role="status" aria-live="polite">
          <span>DJ approved: {undoToast.artistName}</span>
          <span className="undo-toast-countdown">{undoCountdown}s</span>
          <button className="btn btn-ghost btn-sm" onClick={handleUndoApprove}>
            Undo
          </button>
          <button
            className="btn btn-ghost btn-sm"
            aria-label="Dismiss"
            onClick={() => {
              if (undoTimerRef.current) clearInterval(undoTimerRef.current);
              setUndoToast(null);
            }}
          >
            ×
          </button>
        </div>
      )}

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
            <h2>📻 {station.name}</h2>
            <p>{station.tagline || station.description || "No description"}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>
            Edit
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleGenArt}
            disabled={genArt}
          >
            {genArt ? "Generating..." : "🎨 Generate Art"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: "var(--status-failed)" }}
            onClick={handleDeleteStation}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Station info cards */}
      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Identity</h3>
          </div>
          <div className="detail-fields">
            <DetailField label="Frequency" value={station.frequency} />
            <DetailField label="Genre" value={station.genre} />
            <DetailField label="Sub-genres" value={station.sub_genres} />
            <DetailField label="Mood" value={station.mood} />
            <DetailField label="Era" value={station.era} />
            <DetailField
              label="Broadcast Style"
              value={station.broadcast_style}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lore</h3>
          </div>
          <div className="detail-fields">
            <DetailField label="Location" value={station.location} />
            <DetailField label="Founded" value={station.founded_year} />
            <DetailField label="Owner" value={station.owner} />
            <DetailField label="Notes" value={station.lore_notes} />
          </div>
        </div>
        {/* Station Art with Regenerate */}
        <div className="card">
          <div
            className="card-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 className="card-title">🎨 Station Art</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleGenerateArt}
              disabled={genArt}
              title="Generate new station art"
            >
              {genArt ? "⏳ Generating..." : "🔄 Regenerate"}
            </button>
          </div>
          {station.art_path ? (
            <img
              src={station.art_path}
              alt={station.name}
              style={{
                width: "100%",
                borderRadius: "var(--radius-md)",
                minHeight: "200px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                padding: "var(--space-lg)",
                textAlign: "center",
                color: "var(--text-secondary)",
                minHeight: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              No station art yet. Click "Regenerate" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Pending AI DJs */}
      {pendingDJs.length > 0 && (
        <section
          aria-live="polite"
          aria-label="Pending AI DJs"
          style={{ marginTop: "var(--space-xl)" }}
        >
          <div
            className="page-header"
            style={{ marginBottom: "var(--space-md)" }}
          >
            <h3>🤖 Pending AI DJs ({pendingDJs.length})</h3>
            {pendingDJs.length > 1 && (
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleApproveAll}
                >
                  Approve All
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--error)" }}
                  onClick={handleRejectAll}
                >
                  Reject All
                </button>
              </div>
            )}
          </div>

          {/* Desktop grid (≥768px) */}
          <div className="pending-djs-grid">
            {pendingDJs.map((dj) => (
              <div key={dj.id} className="card pending-dj-card">
                <div style={{ marginBottom: "var(--space-sm)" }}>
                  <strong>{dj.display_name || dj.name}</strong>
                  <span
                    className="entity-card-sub"
                    style={{ marginLeft: "var(--space-sm)" }}
                  >
                    {dj.artist_type}
                  </span>
                </div>
                {dj.bio && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginBottom: "var(--space-sm)",
                    }}
                  >
                    {dj.bio.substring(0, 100)}
                    {dj.bio.length > 100 ? "…" : ""}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-sm)",
                    flexWrap: "wrap",
                    marginTop: "auto",
                  }}
                >
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px" }}
                    onClick={() => setEditingPendingDJ(dj)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ minHeight: "44px" }}
                    onClick={() => handleApprovePendingDJ(dj.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--error)", minHeight: "44px" }}
                    onClick={() => handleRejectPendingDJ(dj.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile accordion (<768px) */}
          <div className="pending-djs-accordion">
            {pendingDJs.map((dj) => (
              <div key={dj.id} className="accordion-item">
                <button
                  className="accordion-trigger"
                  aria-expanded={expandedPendingId === dj.id}
                  onClick={() =>
                    setExpandedPendingId(
                      expandedPendingId === dj.id ? null : dj.id,
                    )
                  }
                >
                  <span>{dj.display_name || dj.name}</span>
                  <span className="entity-card-sub">{dj.artist_type}</span>
                  <span className="accordion-chevron">
                    {expandedPendingId === dj.id ? "▲" : "▼"}
                  </span>
                </button>
                {expandedPendingId === dj.id && (
                  <div className="accordion-body">
                    {dj.bio && (
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginBottom: "var(--space-sm)",
                        }}
                      >
                        {dj.bio}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-sm)",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "44px" }}
                        onClick={() => setEditingPendingDJ(dj)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ minHeight: "44px" }}
                        onClick={() => handleApprovePendingDJ(dj.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--error)", minHeight: "44px" }}
                        onClick={() => handleRejectPendingDJ(dj.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DJs */}
      <div style={{ marginTop: "var(--space-xl)" }}>
        <div
          className="page-header"
          style={{ marginBottom: "var(--space-md)" }}
        >
          <h3>🎙️ DJs ({djs.length})</h3>
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddDJ((v) => !v)}
            >
              + Add DJ
            </button>
            {showAddDJ && addDJMode === null && (
              <div className="dj-mode-menu" role="menu">
                <button
                  className="btn btn-ghost"
                  role="menuitem"
                  onClick={() => {
                    setAddDJMode("manual");
                  }}
                >
                  Create Manually
                </button>
                <button
                  className="btn btn-ghost"
                  role="menuitem"
                  onClick={() => {
                    setShowAddDJ(false);
                    setAddDJMode(null);
                    // Scroll the chat toggle into view and open a hint overlay
                    const chatToggle =
                      document.querySelector<HTMLElement>(".chat-toggle");
                    if (chatToggle) {
                      chatToggle.click();
                      chatToggle.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }
                  }}
                >
                  Ask AI to Generate
                </button>
              </div>
            )}
          </div>
        </div>
        {showAddDJ && addDJMode === "manual" && (
          <ArtistForm
            defaultStationId={station.id}
            onCancel={() => {
              setShowAddDJ(false);
              setAddDJMode(null);
            }}
            onSave={() => {
              setShowAddDJ(false);
              setAddDJMode(null);
              onRefresh();
            }}
          />
        )}
        {djs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No DJs assigned to this station yet.
          </p>
        ) : (
          <div className="entity-grid">
            {djs.map((dj) => (
              <div
                key={dj.id}
                className="card entity-card small"
                style={{ position: "relative" }}
              >
                <div
                  className="entity-card-art small"
                  style={{ position: "relative" }}
                >
                  {dj.portrait_path ? (
                    <img src={dj.portrait_path} alt={dj.name} />
                  ) : (
                    <div className="entity-card-placeholder small">🎙️</div>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      background: "rgba(0,0,0,0.7)",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: 0.8,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.opacity = "0.8")
                    }
                    onClick={() => handleGeneratePortrait(dj.id)}
                    disabled={generatingPortrait === dj.id}
                    title="Regenerate portrait"
                  >
                    {generatingPortrait === dj.id ? "⏳" : "🔄"}
                  </button>
                </div>
                <div className="entity-card-info">
                  <h4>{dj.display_name || dj.name}</h4>
                  <span className="entity-card-sub">{dj.artist_type}</span>
                  {dj.speaking_style && (
                    <span className="tag">{dj.speaking_style}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jingles */}
      <div style={{ marginTop: "var(--space-xl)" }}>
        <div
          className="page-header"
          style={{ marginBottom: "var(--space-md)" }}
        >
          <h3>🔔 Jingles ({jingles.length})</h3>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (showAddJingle)
                setJingleForm({ name: "", jingle_type: "intro" });
              setShowAddJingle(!showAddJingle);
            }}
          >
            + Add Jingle
          </button>
        </div>
        {showAddJingle && (
          <div className="card" style={{ marginBottom: "var(--space-md)" }}>
            <div style={{ display: "flex", gap: "var(--space-md)" }}>
              <input
                type="text"
                placeholder="Jingle name..."
                value={jingleForm.name}
                onChange={(e) =>
                  setJingleForm((f) => ({ ...f, name: e.target.value }))
                }
                className="form-input"
                style={{ flex: 1 }}
              />
              <select
                value={jingleForm.jingle_type}
                onChange={(e) =>
                  setJingleForm((f) => ({ ...f, jingle_type: e.target.value }))
                }
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
                disabled={savingJingle}
                onClick={async () => {
                  if (!jingleForm.name.trim())
                    return alert("Jingle name required");
                  setSavingJingle(true);
                  try {
                    await api.createJingle({
                      station_id: station.id,
                      name: jingleForm.name,
                      jingle_type: jingleForm.jingle_type,
                    });
                    setJingleForm({ name: "", jingle_type: "intro" });
                    setShowAddJingle(false);
                    onRefresh();
                  } catch (e: unknown) {
                    alert(
                      `Failed to create jingle: ${e instanceof Error ? e.message : String(e)}`,
                    );
                  } finally {
                    setSavingJingle(false);
                  }
                }}
              >
                {savingJingle ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}
        {jingles.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No jingles yet.
          </p>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jingles.map((j) => (
                  <tr key={j.id}>
                    <td>{j.name}</td>
                    <td>
                      <span className="tag">{j.jingle_type}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${j.status}`}>
                        <span className="badge-dot" />
                        {j.status}
                      </span>
                    </td>
                    <td>
                      {j.duration_seconds ? `${j.duration_seconds}s` : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-ghost"
                        style={{
                          color: "var(--status-failed)",
                          fontSize: "0.85rem",
                        }}
                        disabled={deletingJingleId === j.id}
                        onClick={async () => {
                          if (!confirm("Delete this jingle?")) return;
                          setDeletingJingleId(j.id);
                          try {
                            await api.deleteJingle(j.id);
                            onRefresh();
                          } catch (e: unknown) {
                            alert(
                              `Failed to delete jingle: ${e instanceof Error ? e.message : String(e)}`,
                            );
                          } finally {
                            setDeletingJingleId(null);
                          }
                        }}
                      >
                        {deletingJingleId === j.id ? "…" : "Delete"}
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
  existing,
  onCancel,
  onSave,
}: {
  existing?: Station;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    tagline: existing?.tagline || "",
    description: existing?.description || "",
    frequency: existing?.frequency || "",
    genre: existing?.genre || "",
    sub_genres: existing?.sub_genres || "",
    mood: existing?.mood || "",
    era: existing?.era || "",
    broadcast_style: existing?.broadcast_style || "",
    color_palette: existing?.color_palette || "",
    location: existing?.location || "",
    founded_year: existing?.founded_year || "",
    owner: existing?.owner || "",
    lore_notes: existing?.lore_notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Station name is required");
    setSaving(true);
    try {
      if (existing) {
        await api.updateStation(existing.id, form);
      } else {
        await api.createStation(form);
      }
      onSave();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">
          📻 {existing ? "Edit Station" : "New Station"}
        </h3>
      </div>

      <div className="form-section">
        <div className="form-section-title">Identity</div>
        <div className="form-row">
          <FormField
            label="Station Name *"
            value={form.name}
            onChange={set("name")}
            placeholder="Nebula FM 99.8"
          />
          <FormField
            label="Frequency"
            value={form.frequency}
            onChange={set("frequency")}
            placeholder="99.8 FM"
          />
        </div>
        <FormField
          label="Tagline"
          value={form.tagline}
          onChange={set("tagline")}
          placeholder="The sound of tomorrow"
        />
        <FormTextarea
          label="Description"
          value={form.description}
          onChange={set("description")}
          placeholder="Full station description and lore..."
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Style & Sound</div>
        <div className="form-row">
          <FormField
            label="Genre"
            value={form.genre}
            onChange={set("genre")}
            placeholder="synthwave"
          />
          <FormField
            label="Sub-genres"
            value={form.sub_genres}
            onChange={set("sub_genres")}
            placeholder="darksynth|retrowave|cyberpunk"
          />
        </div>
        <div className="form-row">
          <FormField
            label="Mood"
            value={form.mood}
            onChange={set("mood")}
            placeholder="energetic"
          />
          <FormField
            label="Era"
            value={form.era}
            onChange={set("era")}
            placeholder="retro-future"
          />
        </div>
        <div className="form-row">
          <FormSelect
            label="Broadcast Style"
            value={form.broadcast_style}
            onChange={set("broadcast_style")}
            options={[
              "",
              "professional",
              "pirate",
              "underground",
              "corporate",
              "community",
              "military",
              "rebel",
            ]}
          />
          <FormField
            label="Color Palette"
            value={form.color_palette}
            onChange={set("color_palette")}
            placeholder="#00f5d4|#7b2ff7|#ff006e"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Worldbuilding</div>
        <div className="form-row">
          <FormField
            label="Location"
            value={form.location}
            onChange={set("location")}
            placeholder="Orbital Platform Sigma-7"
          />
          <FormField
            label="Founded"
            value={form.founded_year}
            onChange={set("founded_year")}
            placeholder="2187"
          />
        </div>
        <FormField
          label="Owner / Corporation"
          value={form.owner}
          onChange={set("owner")}
          placeholder="Nexus Media Corp"
        />
        <FormTextarea
          label="Lore Notes"
          value={form.lore_notes}
          onChange={set("lore_notes")}
          placeholder="Additional worldbuilding details..."
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : existing ? "Save Changes" : "Create Station"}
        </button>
      </div>
    </div>
  );
}

/* ── Artist Create Form (used inline in Station detail) ──────────── */

export function ArtistForm({
  existing,
  defaultStationId,
  aiGenerated,
  onCancel,
  onSave,
}: {
  existing?: Artist;
  defaultStationId?: string;
  /** When true, shows an AI-review banner and highlights AI-filled fields. */
  aiGenerated?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [form, setForm] = useState({
    name: existing?.name || "",
    display_name: existing?.display_name || "",
    artist_type: existing?.artist_type || "dj",
    station_id: existing?.station_id || defaultStationId || "",
    bio: existing?.bio || "",
    personality: existing?.personality || "",
    catchphrases: existing?.catchphrases || "",
    quirks: existing?.quirks || "",
    speaking_style: existing?.speaking_style || "",
    accent: existing?.accent || "",
    age: existing?.age || "",
    gender: existing?.gender || "",
    voice_description: existing?.voice_description || "",
    appearance: existing?.appearance || "",
    genre: existing?.genre || "",
    influences: existing?.influences || "",
    signature_sound: existing?.signature_sound || "",
    rivals: existing?.rivals || "",
    allies: existing?.allies || "",
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .listStations()
      .then(setStations)
      .catch((e: Error) =>
        console.error("Failed to load stations for picker:", e),
      );
  }, []);

  /** Validate a single field on change; clear error when valid. */
  const validateField = (field: string, value: string): string => {
    if (field === "name" && !value.trim()) return "Name is required";
    return "";
  };

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
      const err = validateField(field, value);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    };

  const handleSave = async () => {
    const nameErr = validateField("name", form.name);
    if (nameErr) {
      setFieldErrors((prev) => ({ ...prev, name: nameErr }));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, station_id: form.station_id || undefined };
      if (existing) {
        await api.updateArtist(existing.id, payload);
      } else {
        await api.createArtist(payload);
      }
      onSave();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const aiFilled = aiGenerated ? "form-ai-filled" : "";

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">
          🎙️ {existing ? "Edit Artist" : "New Artist / DJ"}
        </h3>
      </div>

      {/* AI-generated warning banner */}
      {aiGenerated && (
        <div className="ai-review-banner" role="alert">
          ⚠️ AI-generated DJ. Please review and edit before approving.
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">Identity</div>
        <div className="form-row">
          <FormField
            label="Real Name *"
            value={form.name}
            onChange={set("name")}
            placeholder="Marcus Chen"
            dataField="name"
            dataSection="identity"
            dataType="text"
            error={fieldErrors["name"]}
            className={aiFilled}
          />
          <FormField
            label="On-Air Name"
            value={form.display_name}
            onChange={set("display_name")}
            placeholder="DJ Vortex"
            dataField="display_name"
            dataSection="identity"
            dataType="text"
            className={aiFilled}
          />
        </div>
        <div className="form-row">
          <FormSelect
            label="Type"
            value={form.artist_type}
            onChange={set("artist_type")}
            options={["dj", "musician", "narrator", "host", "caller", "guest"]}
            dataField="artist_type"
            dataSection="identity"
            dataType="select"
            className={aiFilled}
          />
          <FormSelectWithData
            label="Station"
            value={form.station_id}
            onChange={set("station_id")}
            options={stations}
            emptyLabel="— No station —"
            dataField="station_id"
            dataSection="identity"
            dataType="select"
          />
        </div>
        <div className="form-row">
          <FormField
            label="Age"
            value={form.age}
            onChange={set("age")}
            placeholder="34"
            dataField="age"
            dataSection="identity"
            dataType="text"
            className={aiFilled}
          />
          <FormField
            label="Gender"
            value={form.gender}
            onChange={set("gender")}
            placeholder="male"
            dataField="gender"
            dataSection="identity"
            dataType="text"
            className={aiFilled}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Personality & Voice</div>
        <FormTextarea
          label="Bio / Backstory"
          value={form.bio}
          onChange={set("bio")}
          placeholder="Full character backstory — where they came from, how they got into radio..."
          dataField="bio"
          dataSection="personality"
          dataType="textarea"
          className={aiFilled}
        />
        <FormTextarea
          label="Personality"
          value={form.personality}
          onChange={set("personality")}
          placeholder="Charismatic, slightly paranoid, loves conspiracy theories..."
          dataField="personality"
          dataSection="personality"
          dataType="textarea"
          className={aiFilled}
        />
        <div className="form-row">
          <FormField
            label="Speaking Style"
            value={form.speaking_style}
            onChange={set("speaking_style")}
            placeholder="fast-talking, excitable"
            dataField="speaking_style"
            dataSection="personality"
            dataType="text"
            className={aiFilled}
          />
          <FormField
            label="Accent"
            value={form.accent}
            onChange={set("accent")}
            placeholder="Brooklyn, robotic, Southern drawl"
            dataField="accent"
            dataSection="personality"
            dataType="text"
            className={aiFilled}
          />
        </div>
        <FormField
          label="Catchphrases"
          value={form.catchphrases}
          onChange={set("catchphrases")}
          placeholder="Stay tuned, space cadets!|That's the frequency!"
          dataField="catchphrases"
          dataSection="personality"
          dataType="text"
          className={aiFilled}
        />
        <FormField
          label="Quirks / Habits"
          value={form.quirks}
          onChange={set("quirks")}
          placeholder="clicks pen|hums between segments|talks to equipment"
          dataField="quirks"
          dataSection="personality"
          dataType="text"
          className={aiFilled}
        />
        <FormTextarea
          label="Voice Description"
          value={form.voice_description}
          onChange={set("voice_description")}
          placeholder="Deep baritone with a slight gravel, warm and inviting..."
          dataField="voice_description"
          dataSection="personality"
          dataType="textarea"
          className={aiFilled}
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Appearance (for AI Portrait)</div>
        <FormTextarea
          label="Physical Description"
          value={form.appearance}
          onChange={set("appearance")}
          placeholder="Tall, weathered face, neon-blue cybernetic eye, leather jacket with station patches..."
          dataField="appearance"
          dataSection="appearance"
          dataType="textarea"
          className={aiFilled}
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Music & Relationships</div>
        <div className="form-row">
          <FormField
            label="Genre"
            value={form.genre}
            onChange={set("genre")}
            placeholder="synthwave"
            dataField="genre"
            dataSection="music"
            dataType="text"
            className={aiFilled}
          />
          <FormField
            label="Signature Sound"
            value={form.signature_sound}
            onChange={set("signature_sound")}
            placeholder="Analog synth with heavy reverb"
            dataField="signature_sound"
            dataSection="music"
            dataType="text"
            className={aiFilled}
          />
        </div>
        <FormField
          label="Influences"
          value={form.influences}
          onChange={set("influences")}
          placeholder="Kraftwerk|Vangelis|Tangerine Dream"
          dataField="influences"
          dataSection="music"
          dataType="text"
          className={aiFilled}
        />
        <div className="form-row">
          <FormField
            label="Rivals"
            value={form.rivals}
            onChange={set("rivals")}
            placeholder="DJ Phantom|The Voice"
            dataField="rivals"
            dataSection="relationships"
            dataType="text"
            className={aiFilled}
          />
          <FormField
            label="Allies"
            value={form.allies}
            onChange={set("allies")}
            placeholder="Luna Ray|Captain Frequency"
            dataField="allies"
            dataSection="relationships"
            dataType="text"
            className={aiFilled}
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : existing ? "Save Changes" : "Create Artist"}
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

/** Generate a stable DOM id from a human-readable label string. */
function fieldId(label: string) {
  return label
    .toLowerCase()
    .replace(/[\s*/\\]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+$/, "");
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** data-field attribute for AI targeting */
  dataField?: string;
  /** data-section attribute for AI targeting */
  dataSection?: string;
  /** data-type attribute for AI targeting */
  dataType?: string;
  /** Validation error message to display below the field */
  error?: string;
  /** Extra CSS class(es) (e.g. form-ai-filled) */
  className?: string;
}

/** Text input with AI-targeting data attributes and inline validation error. */
function FormField({
  label,
  value,
  onChange,
  placeholder,
  dataField,
  dataSection,
  dataType,
  error,
  className,
}: FormFieldProps) {
  const id = fieldId(label);
  const ariaLabel = dataField ?? id;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={`form-input${className ? ` ${className}` : ""}${error ? " form-input-error" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="on"
        aria-label={ariaLabel}
        aria-invalid={!!error}
        data-field={dataField}
        data-section={dataSection}
        data-type={dataType}
      />
      {error && (
        <span className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  dataField?: string;
  dataSection?: string;
  dataType?: string;
  error?: string;
  className?: string;
}

/** Textarea with AI-targeting data attributes and inline validation error. */
function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  dataField,
  dataSection,
  dataType,
  error,
  className,
}: FormTextareaProps) {
  const id = fieldId(label);
  const ariaLabel = dataField ?? id;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        className={`form-input form-textarea${className ? ` ${className}` : ""}${error ? " form-input-error" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        autoComplete="on"
        aria-label={ariaLabel}
        aria-invalid={!!error}
        data-field={dataField}
        data-section={dataSection}
        data-type={dataType}
      />
      {error && (
        <span className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  dataField?: string;
  dataSection?: string;
  dataType?: string;
  error?: string;
  className?: string;
}

/** Select with AI-targeting data attributes. */
function FormSelect({
  label,
  value,
  onChange,
  options,
  dataField,
  dataSection,
  dataType,
  error,
  className,
}: FormSelectProps) {
  const id = fieldId(label);
  const ariaLabel = dataField ?? id;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        className={`form-input${className ? ` ${className}` : ""}${error ? " form-input-error" : ""}`}
        value={value}
        onChange={onChange}
        autoComplete="on"
        aria-label={ariaLabel}
        aria-invalid={!!error}
        data-field={dataField}
        data-section={dataSection}
        data-type={dataType}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "— Select —"}
          </option>
        ))}
      </select>
      {error && (
        <span className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface FormSelectWithDataProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id: string; name: string }>;
  emptyLabel?: string;
  dataField?: string;
  dataSection?: string;
  dataType?: string;
  error?: string;
}

/** Select with object options and AI-targeting data attributes. */
function FormSelectWithData({
  label,
  value,
  onChange,
  options,
  emptyLabel = "— No selection —",
  dataField,
  dataSection,
  dataType,
  error,
}: FormSelectWithDataProps) {
  const id = fieldId(label);
  const ariaLabel = dataField ?? id;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        className={`form-input${error ? " form-input-error" : ""}`}
        value={value}
        onChange={onChange}
        autoComplete="on"
        aria-label={ariaLabel}
        aria-invalid={!!error}
        data-field={dataField}
        data-section={dataSection}
        data-type={dataType}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {error && (
        <span className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** Standalone inline validation error — renders nothing when no error. */
export function FormFieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div
      style={{
        color: "var(--status-failed)",
        fontSize: "0.8rem",
        marginTop: "0.25rem",
      }}
    >
      ⚠️ {error}
    </div>
  );
}
