import { useState, useEffect, useContext, useCallback } from "react";
import { useIsMobile } from "./hooks/useIsMobile";
import {
  FormManagerProvider,
  FormManagerContext,
  getFormPageRoute,
} from "./context/FormManagerContext";
import { Stations } from "./pages/Stations";
import { Artists } from "./pages/Artists";
import { Brands } from "./pages/Brands";
import { Universes } from "./pages/Universes";
import { DraftingTable } from "./pages/DraftingTable";
import { GenerationQueue } from "./pages/GenerationQueue";
import { SettingsPage } from "./pages/Settings";
import { ChatAssistant } from "./components/ChatAssistant";
import { SplashScreen } from "./components/SplashScreen";
import { api, type Draft, type Station, type Universe } from "./api/client";

type Page =
  | "stations"
  | "artists"
  | "brands"
  | "universes"
  | "drafts"
  | "queue"
  | "settings";

/**
 * FormNavigator — listens to FormManager and updates the page state.
 * Handles navigation to form pages when AI-generated entities are being created.
 */
function FormNavigator({
  onPageChange,
}: {
  onPageChange: (page: Page) => void;
}) {
  const formManager = useContext(FormManagerContext);

  useEffect(() => {
    if (formManager && formManager.isOpen && formManager.request) {
      const route = getFormPageRoute(formManager.request.entityType);
      // Map route to page type
      const pageMap: Record<string, Page> = {
        "/stations": "stations",
        "/artists": "artists",
        "/brands": "brands",
        "/universes": "universes",
        "/drafts": "drafts",
      };
      const page = pageMap[route];
      if (page) {
        onPageChange(page);
      }
    }
  }, [formManager?.isOpen, formManager?.request, onPageChange]);

  return null; // This component doesn't render anything
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "stations", label: "Stations", icon: "📻" },
  { id: "artists", label: "Artists", icon: "🎤" },
  { id: "brands", label: "Brands", icon: "🏢" },
  { id: "universes", label: "Universes", icon: "🌍" },
  { id: "drafts", label: "Drafts", icon: "📋" },
  { id: "queue", label: "Queue", icon: "⚡" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const isMobile = useIsMobile();
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState<Page>("stations");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  /** Active universe — set on startup, cleared if all universes are deleted. */
  const [activeUniverse, setActiveUniverse] = useState<Universe | null>(null);
  /** True while the startup universe check is running (blocks nav to stations). */
  const [universeCheckDone, setUniverseCheckDone] = useState(false);

  // ── Health check ──────────────────────────────────────────────────
  useEffect(() => {
    api
      .health()
      .then(() => setApiOk(true))
      .catch((e) => {
        console.error("API health check failed:", e);
        setApiOk(false);
      });
  }, []);

  // ── Universe gate — runs once after API comes online ──────────────
  useEffect(() => {
    if (apiOk !== true) return; // wait for health check

    api
      .listUniverses()
      .then(async (universes) => {
        if (universes.length === 0) {
          // No universe exists → force user to Universes page to create one
          setPage("universes");
          setUniverseCheckDone(true);
          return;
        }

        // Universe(s) exist — pick the first as the active one
        const first = universes[0];
        setActiveUniverse(first);

        // TEMP: auto-attach first universe to unlinked stations for pre-existing DBs.
        // Remove this block (and the endpoint) once all DBs are universe-gated from creation.
        try {
          await api.autoAttachUniverse();
        } catch {
          // Non-fatal: silently skip if all stations are already linked
        }

        setUniverseCheckDone(true);
      })
      .catch((e) => {
        console.error("Universe startup check failed:", e);
        setUniverseCheckDone(true); // don't block the app on error
      });
  }, [apiOk]);

  const refreshDrafts = useCallback(() => {
    api
      .listDrafts()
      .then((res) => setDrafts(res.drafts))
      .catch((e) => console.error("Failed to load drafts:", e));
  }, []);

  useEffect(() => {
    refreshDrafts();
    const interval = setInterval(refreshDrafts, 10000);
    return () => clearInterval(interval);
  }, [refreshDrafts]);

  const stats = {
    total: drafts.length,
    pending: drafts.filter(
      (d) => d.status === "draft" || d.status === "fleshed_out",
    ).length,
    generating: drafts.filter(
      (d) => d.status === "generating" || d.status === "committed",
    ).length,
    completed: drafts.filter((d) => d.status === "completed").length,
  };

  // Called when user creates a universe from the gate page
  const handleUniverseCreated = useCallback(() => {
    api
      .listUniverses()
      .then((universes) => {
        if (universes.length > 0) {
          setActiveUniverse(universes[0]);
          setPage("stations");
        }
      })
      .catch(() => {});
  }, []);

  const renderPage = () => {
    switch (page) {
      case "stations":
        return (
          <Stations isMobile={isMobile} onStationSelect={setActiveStation} />
        );
      case "artists":
        return <Artists />;
      case "brands":
        return <Brands />;
      case "universes":
        return (
          <Universes
            onUniverseCreated={
              !activeUniverse ? handleUniverseCreated : undefined
            }
          />
        );
      case "drafts":
        return <DraftingTable drafts={drafts} onRefresh={refreshDrafts} />;
      case "queue":
        return (
          <GenerationQueue
            drafts={drafts.filter((d) =>
              ["committed", "generating", "completed", "failed"].includes(
                d.status,
              ),
            )}
          />
        );
      case "settings":
        return <SettingsPage apiOk={apiOk} />;
      default:
        return null;
    }
  };

  return (
    <FormManagerProvider>
      <FormNavigator onPageChange={setPage} />
      <div className={`app-layout ${isMobile ? "mobile" : ""}`}>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-icon">A</div>
              <div>
                <h1>AetherWave</h1>
              </div>
              <span className="version">v1.0.4</span>
            </div>

            <nav className="nav-section">
              <div className="nav-section-title">Navigation</div>
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.id === "drafts" && stats.total > 0 && (
                    <span className="nav-badge">{stats.total}</span>
                  )}
                  {item.id === "queue" && stats.generating > 0 && (
                    <span className="nav-badge">{stats.generating}</span>
                  )}
                </div>
              ))}
            </nav>

            <div style={{ marginTop: "auto" }}>
              {/* Active universe indicator */}
              {activeUniverse && (
                <div
                  className="stat-mini"
                  style={{ marginBottom: "var(--space-sm)", cursor: "pointer" }}
                  onClick={() => setPage("universes")}
                  title={`Active universe: ${activeUniverse.name}`}
                >
                  <span style={{ fontSize: "0.9rem" }}>🌍</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activeUniverse.name}
                  </span>
                </div>
              )}
              {!activeUniverse && universeCheckDone && (
                <div
                  className="stat-mini"
                  style={{
                    marginBottom: "var(--space-sm)",
                    cursor: "pointer",
                    color: "var(--status-warning, #f59e0b)",
                  }}
                  onClick={() => setPage("universes")}
                  title="No universe set — click to create one"
                >
                  <span style={{ fontSize: "0.9rem" }}>⚠️</span>
                  <span style={{ fontSize: "0.75rem" }}>No universe set</span>
                </div>
              )}
              <div className="nav-section-title">System</div>
              <div className="stat-mini">
                <span
                  className={`status-dot ${apiOk ? "online" : apiOk === false ? "offline" : "checking"}`}
                />
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                >
                  API:{" "}
                  {apiOk
                    ? "Online"
                    : apiOk === false
                      ? "Offline"
                      : "Checking..."}
                </span>
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <header className="mobile-header">
            <div
              className="logo-icon"
              style={{ width: 28, height: 28, fontSize: "0.8rem" }}
            >
              A
            </div>
            <h1
              style={{
                fontSize: "1rem",
                background:
                  "linear-gradient(135deg, var(--accent), hsl(260,70%,60%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AetherWave
            </h1>
            {activeUniverse && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  marginLeft: "var(--space-sm)",
                }}
              >
                🌍 {activeUniverse.name}
              </span>
            )}
            <span
              className={`status-dot ${apiOk ? "online" : "offline"}`}
              style={{ marginLeft: "auto" }}
            />
          </header>
        )}

        {/* Universe setup banner — shown when no universe exists and user is on stations page */}
        {universeCheckDone && !activeUniverse && page === "universes" && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
              color: "#fff",
              padding: "0.6rem 1.5rem",
              textAlign: "center",
              fontSize: "0.875rem",
            }}
          >
            🌍 Create a universe first to get started — your stations will live
            inside it.
          </div>
        )}

        {/* Main Content */}
        <main
          className="main-content"
          style={
            universeCheckDone && !activeUniverse && page === "universes"
              ? { paddingTop: "2.5rem" }
              : undefined
          }
        >
          {/* Stats bar — only show on drafts/queue pages */}
          {(page === "drafts" || page === "queue") && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon cyan">📋</div>
                <div>
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total Drafts</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">✏️</div>
                <div>
                  <div className="stat-value">{stats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">⚡</div>
                <div>
                  <div className="stat-value">{stats.generating}</div>
                  <div className="stat-label">Generating</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">✅</div>
                <div>
                  <div className="stat-value">{stats.completed}</div>
                  <div className="stat-label">Completed</div>
                </div>
              </div>
            </div>
          )}

          {renderPage()}
        </main>

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <nav className="mobile-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* AI Chat Assistant — receives station context when user is in a station detail view */}
        <ChatAssistant
          onEntityCreated={refreshDrafts}
          currentStationId={activeStation?.id}
          selectedStation={activeStation}
        />
      </div>
    </FormManagerProvider>
  );
}
