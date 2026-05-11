/**
 * Generic entity suggestion card component.
 * Renders a card for any entity type (Station, Brand, Artist, Jingle, Draft, Universe).
 * Shows entity data with action buttons: Edit, Stage/Approve, Reject.
 */

import { EntitySuggestion } from "../utils/entitySuggestions";

interface EntitySuggestionCardProps {
  suggestion: EntitySuggestion;
  index: number;
  status: "idle" | "staging" | "staged" | "error";
  onEdit: () => void;
  onStage: () => void;
  onReject?: () => void;
  loading?: boolean;
}

const getEntityIcon = (type: string): string => {
  switch (type) {
    case "station":
      return "📻";
    case "brand":
      return "🏢";
    case "artist":
      return "🎙️";
    case "jingle":
      return "🎵";
    case "draft":
      return "📝";
    case "universe":
      return "🌌";
    default:
      return "✨";
  }
};

const getEntityLabel = (type: string): string => {
  switch (type) {
    case "artist":
      return "DJ/Artist";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "staging":
      return "var(--accent, #fbbf24)";
    case "staged":
      return "var(--success-color, #10b981)";
    case "error":
      return "var(--error-color, #f87171)";
    default:
      return "rgba(255,255,255,0.1)";
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case "staging":
      return "Staging...";
    case "staged":
      return "✓ Staged";
    case "error":
      return "⚠ Error";
    default:
      return "";
  }
};

export function EntitySuggestionCard({
  suggestion,
  index,
  status,
  onEdit,
  onStage,
  onReject,
  loading = false,
}: EntitySuggestionCardProps) {
  const { entityType, confidence, fields } = suggestion;
  const title =
    fields.name ||
    fields.title ||
    `${getEntityLabel(entityType)} #${index + 1}`;
  const description =
    fields.description || fields.personality || fields.backstory || "";

  return (
    <div
      style={{
        marginBottom: "var(--space-md)",
        padding: "var(--space-md)",
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${getStatusColor(status)}`,
        borderRadius: "var(--radius-sm)",
        opacity: status === "error" ? 0.7 : 1,
      }}
    >
      {/* Header with icon, title, and status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-sm)",
          gap: "var(--space-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span style={{ fontSize: "1.5em" }}>{getEntityIcon(entityType)}</span>
          <div>
            <div style={{ fontWeight: "600", fontSize: "0.95em" }}>{title}</div>
            <div
              style={{
                fontSize: "0.8em",
                color: "var(--text-secondary)",
                marginTop: "0.25em",
              }}
            >
              {getEntityLabel(entityType)}
              {confidence !== "medium" && (
                <span style={{ marginLeft: "0.5em" }}>
                  • Confidence: {confidence}
                </span>
              )}
            </div>
          </div>
        </div>
        {status !== "idle" && (
          <div
            style={{
              fontSize: "0.8em",
              color: getStatusColor(status),
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            {getStatusText(status)}
          </div>
        )}
      </div>

      {/* Description preview */}
      {description && (
        <div
          style={{
            fontSize: "0.85em",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-md)",
            lineHeight: "1.4",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </div>
      )}

      {/* Key fields preview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          fontSize: "0.8em",
        }}
      >
        {Object.entries(fields)
          .slice(0, 4)
          .map(([key, value]) => {
            if (
              key === "description" ||
              key === "personality" ||
              key === "backstory"
            )
              return null;
            return (
              <div key={key}>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    fontSize: "0.7em",
                    letterSpacing: "0.05em",
                    marginBottom: "0.25em",
                  }}
                >
                  {key}
                </div>
                <div style={{ color: "var(--text-primary)" }}>{value}</div>
              </div>
            );
          })}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {status === "error" && (
          <button
            onClick={onReject}
            disabled={loading}
            style={{
              padding: "0.4em 0.8em",
              fontSize: "0.85em",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Discard
          </button>
        )}

        {status === "idle" && (
          <>
            <button
              onClick={onEdit}
              disabled={loading}
              style={{
                padding: "0.4em 0.8em",
                fontSize: "0.85em",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                cursor: "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Edit
            </button>
            <button
              onClick={onStage}
              disabled={loading}
              style={{
                padding: "0.4em 0.8em",
                fontSize: "0.85em",
                background: "var(--accent, #fbbf24)",
                color: "var(--dark, #1f2937)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: "600",
                cursor: "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "Staging..." : "Stage"}
            </button>
          </>
        )}

        {status === "staged" && (
          <button
            onClick={onReject}
            disabled={loading}
            style={{
              padding: "0.4em 0.8em",
              fontSize: "0.85em",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
