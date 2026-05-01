import { useState, useEffect } from 'react';
import { useIsMobile } from './hooks/useIsMobile';
import { Stations } from './pages/Stations';
import { Artists } from './pages/Artists';
import { Brands } from './pages/Brands';
import { DraftingTable } from './pages/DraftingTable';
// @ts-ignore - Suppress TS false positive, file exists
import { GenerationQueue } from './pages/GenerationQueue';
import { ChatAssistant } from './components/ChatAssistant';
import { api, type Draft } from './api/client';

type Page = 'stations' | 'artists' | 'brands' | 'drafts' | 'queue' | 'settings';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'stations', label: 'Stations',  icon: '📻' },
  { id: 'artists',  label: 'Artists',   icon: '🎤' },
  { id: 'brands',   label: 'Brands',    icon: '🏢' },
  { id: 'drafts',   label: 'Drafts',    icon: '📋' },
  { id: 'queue',    label: 'Queue',     icon: '⚡' },
  { id: 'settings', label: 'Settings',  icon: '⚙️' },
];

export default function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState<Page>('stations');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  const refreshDrafts = () => {
    api.listDrafts()
      .then(res => setDrafts(res.drafts))
      .catch(() => {});
  };

  useEffect(() => {
    refreshDrafts();
    const interval = setInterval(refreshDrafts, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: drafts.length,
    pending: drafts.filter(d => d.status === 'draft' || d.status === 'fleshed_out').length,
    generating: drafts.filter(d => d.status === 'generating' || d.status === 'committed').length,
    completed: drafts.filter(d => d.status === 'completed').length,
  };

  const renderPage = () => {
    switch (page) {
      case 'stations':
        return <Stations isMobile={isMobile} />;
      case 'artists':
        return <Artists />;
      case 'brands':
        return <Brands />;
      case 'drafts':
        return <DraftingTable drafts={drafts} onRefresh={refreshDrafts} />;
      case 'queue':
        return <GenerationQueue drafts={drafts.filter(d => ['committed', 'generating', 'completed', 'failed'].includes(d.status))} />;
      case 'settings':
        return <SettingsPage apiOk={apiOk} />;
      default:
        return null;
    }
  };

  return (
    <div className={`app-layout ${isMobile ? 'mobile' : ''}`}>
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
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.id === 'drafts' && stats.total > 0 && (
                  <span className="nav-badge">{stats.total}</span>
                )}
                {item.id === 'queue' && stats.generating > 0 && (
                  <span className="nav-badge">{stats.generating}</span>
                )}
              </div>
            ))}
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <div className="nav-section-title">System</div>
            <div className="stat-mini">
              <span className={`status-dot ${apiOk ? 'online' : apiOk === false ? 'offline' : 'checking'}`} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                API: {apiOk ? 'Online' : apiOk === false ? 'Offline' : 'Checking...'}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="mobile-header">
          <div className="logo-icon" style={{ width: 28, height: 28, fontSize: '0.8rem' }}>A</div>
          <h1 style={{ fontSize: '1rem', background: 'linear-gradient(135deg, var(--accent), hsl(260,70%,60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AetherWave
          </h1>
          <span className={`status-dot ${apiOk ? 'online' : 'offline'}`} style={{ marginLeft: 'auto' }} />
        </header>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Stats bar — only show on drafts/queue pages */}
        {(page === 'drafts' || page === 'queue') && (
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
          {NAV_ITEMS.slice(0, 5).map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      )}

      {/* AI Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}

/* ── Settings Page ─────────────────────────────────────────────── */

function SettingsPage({ apiOk }: { apiOk: boolean | null }) {
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ configured: boolean; masked_key: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    api.checkApiKey().then(setKeyStatus).catch(() => {});
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.setApiKey(apiKey.trim());
      setTestResult(result);
      if (result.valid) {
        api.checkApiKey().then(setKeyStatus);
        setApiKey('');
      }
    } catch (err: any) {
      setTestResult({ valid: false, message: err?.message || 'Failed to validate' });
    } finally {
      setTesting(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aetherwave_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.stations || !data.artists || !data.brands) {
        throw new Error('Invalid backup file format');
      }

      alert('⚠️ Import support is coming soon. For now, use the export for backup and manual restoration.');
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Invalid file format'}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ Settings</h2>
        <p>System configuration and API status</p>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header">
          <h3 className="card-title">🔑 Google API Key</h3>
          {keyStatus && (
            <span className={`badge ${keyStatus.configured ? 'badge-completed' : 'badge-failed'}`}>
              <span className="badge-dot" />
              {keyStatus.configured ? 'Configured' : 'Not Set'}
            </span>
          )}
        </div>
        {keyStatus?.configured && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)', fontFamily: 'var(--font-mono)' }}>
            Current key is configured and saved securely.
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">API Key</label>
            <input
              className="form-input"
              type="text"
              id="api-key"
              name="api-key"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              autoComplete="off"
              placeholder="AIzaSy..." />
            <div style={{ marginTop: 'var(--space-xs)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Get your free Gemini 2.0 API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Google AI Studio</a>.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveKey} disabled={testing || !apiKey.trim()}
            style={{ height: 42, marginBottom: 20 }}>
            {testing ? 'Testing...' : 'Save & Test'}
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
            background: testResult.valid ? 'hsl(160, 60%, 15%)' : 'hsl(0, 60%, 15%)',
            color: testResult.valid ? 'var(--status-completed)' : 'var(--status-failed)',
          }}>
            {testResult.valid ? '✅ ' : '❌ '}{testResult.message}
          </div>
        )}
      </div>

      {/* API Connection */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header">
          <h3 className="card-title">API Connection</h3>
          <span className={`badge ${apiOk ? 'badge-completed' : 'badge-failed'}`}>
            <span className="badge-dot" />
            {apiOk ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          The AetherWave API is currently routed through your active network connection.
          Make sure the Docker stack is running: <code>docker compose up -d</code>
        </p>
      </div>

      {/* Data Backup */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header">
          <h3 className="card-title">💾 Data Backup & Restore</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
          Export your entire relational database (Stations, DJs, Brands, Jingles, and Drafts) to a JSON file.
          Keep this file safe as a backup of your entire universe.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            📥 Download Backup
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            📤 Import Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
              aria-label="Import backup file"
            />
          </label>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">About AetherWave</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
          AetherWave is a headless Media Factory that generates procedural, lore-heavy radio
          content for game environments. It transforms user-defined seeds into self-contained
          Lore-Shard MP3s with embedded album art, scripts, backstories, and persistent AI
          voice signatures.
        </p>
        <div style={{ marginTop: 'var(--space-md)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Version 1.0.4 • Built with FastAPI, React, and Google Cloud AI
        </div>
      </div>
    </div>
  );
}
