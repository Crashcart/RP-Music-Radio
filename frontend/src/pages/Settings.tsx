import { useState, useEffect } from "react";
import { api } from "../api/client";

interface SettingsProps {
  apiOk: boolean | null;
}

export function SettingsPage({ apiOk }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [googleProject, setGoogleProject] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current settings from localStorage
    const saved = localStorage.getItem("google_api_key");
    if (saved) {
      setApiKey(saved);
    }
    const project = localStorage.getItem("google_project");
    if (project) {
      setGoogleProject(project);
    }
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    setError("");
    setSavedMessage("");

    try {
      // Save API key to localStorage (client-side only)
      if (apiKey) {
        localStorage.setItem("google_api_key", apiKey);
      }
      if (googleProject) {
        localStorage.setItem("google_project", googleProject);
      }

      // Validate API key with backend if provided
      if (apiKey) {
        const response = await api.setApiKey(apiKey);
        if (response.valid) {
          setSavedMessage("✅ API key validated and saved successfully");
        } else {
          setError("⚠️ API key validation failed. Please check your key.");
        }
      } else {
        setSavedMessage("✅ Settings saved (API key is optional)");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(
        "Failed to save settings. Check console for details. API key saved locally.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearSettings = () => {
    if (confirm("Are you sure? This will clear all saved settings.")) {
      localStorage.removeItem("google_api_key");
      localStorage.removeItem("google_project");
      setApiKey("");
      setGoogleProject("");
      setSavedMessage("Settings cleared");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>⚙️ Settings</h1>
        <p>Configure API keys and system preferences</p>
      </div>

      <div className="settings-grid">
        {/* API Key Section */}
        <section className="settings-section">
          <h2>Google Cloud API</h2>

          {/* Status Indicator */}
          <div
            className={`api-status ${apiOk ? "online" : apiOk === false ? "offline" : "checking"}`}
          >
            <span
              className={`status-dot ${apiOk ? "online" : apiOk === false ? "offline" : "checking"}`}
            />
            <span>
              API Status:{" "}
              {apiOk
                ? "✅ Online"
                : apiOk === false
                  ? "❌ Offline"
                  : "🔄 Checking..."}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">Google API Key</label>
            <input
              id="api-key"
              name="api_key"
              type="password"
              placeholder="Paste your Google Cloud API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="form-input"
            />
            <p className="hint">
              Get your API key from{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Cloud Console
              </a>
              . Your key is stored locally in your browser (not on our servers).
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="project-id">
              Google Cloud Project ID (Optional)
            </label>
            <input
              id="project-id"
              name="project_id"
              type="text"
              placeholder="your-project-id"
              value={googleProject}
              onChange={(e) => setGoogleProject(e.target.value)}
              className="form-input"
            />
            <p className="hint">
              Used for billing and quota tracking. Leave blank to use default.
            </p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {savedMessage && (
            <div className="alert alert-success">{savedMessage}</div>
          )}

          <div className="button-group">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "⏳ Saving..." : "💾 Save Settings"}
            </button>
            <button onClick={handleClearSettings} className="btn btn-secondary">
              🗑️ Clear Settings
            </button>
          </div>
        </section>

        {/* System Info Section */}
        <section className="settings-section">
          <h2>System Information</h2>

          <div className="info-grid">
            <div className="info-item">
              <span className="label">Application</span>
              <span className="value">AetherWave v1.0.4</span>
            </div>
            <div className="info-item">
              <span className="label">API Status</span>
              <span
                className={`value ${apiOk ? "success" : apiOk === false ? "error" : "pending"}`}
              >
                {apiOk
                  ? "✅ Online"
                  : apiOk === false
                    ? "❌ Offline"
                    : "🔄 Checking..."}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Storage</span>
              <span className="value">Browser LocalStorage</span>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section className="settings-section">
          <h2>Help & Documentation</h2>
          <div className="help-content">
            <h3>🚀 Getting Started</h3>
            <ol>
              <li>
                <strong>Set API Key:</strong> Add your Google API key above
              </li>
              <li>
                <strong>Create a Station:</strong> Go to Stations and click "New
                Station"
              </li>
              <li>
                <strong>Add DJs:</strong> Click "Add DJ" to create artists
              </li>
              <li>
                <strong>Generate Art:</strong> Use the 🔄 buttons to create art
                for station and DJs
              </li>
              <li>
                <strong>Create Draft:</strong> Go to Drafts and create a new
                broadcast
              </li>
              <li>
                <strong>Monitor Queue:</strong> Watch progress in the Queue tab
              </li>
            </ol>

            <h3>❓ FAQ</h3>
            <details>
              <summary>Where do I get a Google API key?</summary>
              <p>
                Visit{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Cloud Console
                </a>
                , create a new API key, and enable the Gemini, Lyria, and Nano
                Banana 2 APIs.
              </p>
            </details>

            <details>
              <summary>Is my API key secure?</summary>
              <p>
                Your API key is stored only in your browser's local storage. It
                is never sent to any external servers (except Google Cloud
                directly).
              </p>
            </details>

            <details>
              <summary>What if the API is offline?</summary>
              <p>
                You can still create stations, DJs, and drafts. Art generation
                and audio synthesis will fail gracefully and show an error
                message. Fix your API key and try again.
              </p>
            </details>
          </div>
        </section>
      </div>

      <style>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--space-lg);
          margin-top: var(--space-lg);
        }

        .settings-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: var(--space-md);
        }

        .settings-section h2 {
          margin: 0 0 var(--space-md) 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .settings-section h3 {
          margin: var(--space-md) 0 var(--space-sm) 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .form-group {
          margin-bottom: var(--space-md);
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: monospace;
          font-size: 0.875rem;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .hint {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }

        .hint a {
          color: var(--accent-color);
          text-decoration: none;
        }

        .hint a:hover {
          text-decoration: underline;
        }

        .button-group {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--border-radius);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-color-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
          background: var(--border-color);
          transform: translateY(-2px);
        }

        .alert {
          padding: 1rem;
          border-radius: var(--border-radius);
          margin: var(--space-md) 0;
          font-size: 0.95rem;
        }

        .alert-success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .api-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
          margin-bottom: var(--space-md);
          font-weight: 600;
        }

        .status-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.online {
          background: #22c55e;
        }

        .status-dot.offline {
          background: #ef4444;
          animation: none;
        }

        .status-dot.checking {
          background: #f59e0b;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .info-grid {
          display: grid;
          gap: var(--space-sm);
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm);
          background: var(--bg-primary);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
        }

        .info-item .label {
          color: var(--text-secondary);
          font-weight: 600;
        }

        .info-item .value {
          color: var(--text-primary);
          font-weight: 500;
        }

        .info-item .value.success {
          color: #22c55e;
        }

        .info-item .value.error {
          color: #ef4444;
        }

        .info-item .value.pending {
          color: #f59e0b;
        }

        .help-content {
          padding-top: var(--space-md);
        }

        .help-content ol {
          margin: var(--space-md) 0;
          padding-left: 1.5rem;
          color: var(--text-primary);
        }

        .help-content li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .help-content details {
          margin: var(--space-sm) 0;
          cursor: pointer;
        }

        .help-content summary {
          font-weight: 600;
          color: var(--text-primary);
          padding: 0.5rem;
          background: var(--bg-primary);
          border-radius: var(--border-radius);
          user-select: none;
        }

        .help-content summary:hover {
          background: var(--border-color);
        }

        .help-content p {
          margin: var(--space-sm) 0 var(--space-sm) 1.5rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .help-content a {
          color: var(--accent-color);
          text-decoration: none;
        }

        .help-content a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }

          .button-group {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
