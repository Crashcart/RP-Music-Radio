import { useState, useEffect } from "react";
import { useIsMobile } from "./hooks/useIsMobile";
import { Stations } from "./pages/Stations";
import { Artists } from "./pages/Artists";
import { Brands } from "./pages/Brands";
import { DraftingTable } from "./pages/DraftingTable";
// @ts-ignore - Suppress TS false positive, file exists
import { GenerationQueue } from "./pages/GenerationQueue";
import { SettingsPage } from "./pages/Settings";
import { ChatAssistant } from "./components/ChatAssistant";
import { api, type Draft, type Station } from "./api/client";

type Page = "stations" | "artists" | "brands" | "drafts" | "queue" | "settings";

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "stations", label: "Stations", icon: "📻" },
  { id: "artists", label: "Artists", icon: "🎤" },
  { id: "brands", label: "Brands", icon: "🏢" },
  { id: "drafts", label: "Drafts", icon: "📋" },
  { id: "queue", label: "Queue", icon: "⚡" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState<Page>("stations");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  /**
   * Currently selected station — set by Stations page via context callback.
   * ChatAssistant uses this to inject station-aware prompts.
   */
  const [activeStation, setActiveStation] = useState<Station | null>(null);

  useEffect(() => {
    api
      .health()
      .then(() => setApiOk(true))
      .catch((e) => {
        console.error("API health check failed:", e);
        setApiOk(false);
      });
  }, []);

  const refreshDrafts = () => {
    api
      .listDrafts()
      .then((res) => setDrafts(res.drafts))
      .catch((e) => console.error("Failed to load drafts:", e));
  };

  useEffect(() => {
    refreshDrafts();
    const interval = setInterval(refreshDrafts, 10000);
    return () => clearInterval(interval);
  }, []);

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
    <div className={`app-layout ${isMobile ? "mobile" : ""}`}>
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
            <div className="nav-section-title">System</div>
            <div className="stat-mini">
              <span
                className={`status-dot ${apiOk ? "online" : apiOk === false ? "offline" : "checking"}`}
              />
              <span
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              >
                API:{" "}
                {apiOk ? "Online" : apiOk === false ? "Offline" : "Checking..."}
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
          <span
            className={`status-dot ${apiOk ? "online" : "offline"}`}
            style={{ marginLeft: "auto" }}
          />
        </header>
      )}

      {/* Main Content */}
      <main className="main-content">
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
  );
}
