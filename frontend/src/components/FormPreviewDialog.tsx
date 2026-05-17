import { FormEntitySuggestion } from "../utils/entitySuggestions";
import type { FormEntityType } from "../contexts/FormManagerContext";

interface FormPreviewDialogProps {
  suggestion: FormEntitySuggestion;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Dialog shown before opening a form with AI-generated data.
 * Allows user to review what will be created and confirm before form opens.
 *
 * Major entities (Station, Brand, Universe) show confirmation dialog.
 * Quick-create entities (DJ, Jingle, Draft) may skip this.
 */
export function FormPreviewDialog({
  suggestion,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: FormPreviewDialogProps) {
  if (!isOpen) return null;

  const entityLabel = entityTypeLabel(suggestion.type);
  const summary = buildSummary(suggestion);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review AI-Generated {entityLabel}</h2>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-warning">
            ⚠️ AI generated this {entityLabel.toLowerCase()}. Please review the
            details below before confirming.
          </p>

          <div className="modal-summary">{summary}</div>

          {suggestion.confidence && suggestion.confidence !== "high" && (
            <div className="modal-confidence">
              <small>
                Confidence: <strong>{suggestion.confidence}</strong>
                {suggestion.confidence === "low" && (
                  <span>
                    {" "}
                    — You may want to edit the form after opening it.
                  </span>
                )}
              </small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Opening..." : `Yes, fill in the form`}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Return human-readable label for entity type.
 */
function entityTypeLabel(type: FormEntityType): string {
  const labels: Record<FormEntityType, string> = {
    dj: "DJ",
    artist: "Artist",
    jingle: "Jingle",
    draft: "Track",
    station: "Station",
    brand: "Brand",
    universe: "Universe",
  };
  return labels[type] || type;
}

/**
 * Build a readable summary of the suggested entity based on its type.
 */
function buildSummary(suggestion: FormEntitySuggestion): React.ReactNode {
  const { type, data } = suggestion;

  switch (type) {
    case "station":
      return (
        <div>
          <p>
            <strong>Name:</strong> {data.name}
          </p>
          {data.frequency && (
            <p>
              <strong>Frequency:</strong> {data.frequency}
            </p>
          )}
          {data.genre && (
            <p>
              <strong>Genre:</strong> {data.genre}
            </p>
          )}
          {data.mood && (
            <p>
              <strong>Mood:</strong> {data.mood}
            </p>
          )}
          {data.backstory && (
            <p>
              <strong>Concept:</strong> {truncate(data.backstory, 120)}
            </p>
          )}
        </div>
      );

    case "brand":
      return (
        <div>
          <p>
            <strong>Name:</strong> {data.name}
          </p>
          {data.industry && (
            <p>
              <strong>Industry:</strong> {data.industry}
            </p>
          )}
          {data.tagline && (
            <p>
              <strong>Tagline:</strong> {data.tagline}
            </p>
          )}
          {data.company_description && (
            <p>
              <strong>Description:</strong>{" "}
              {truncate(data.company_description, 120)}
            </p>
          )}
        </div>
      );

    case "dj":
    case "artist":
      return (
        <div>
          <p>
            <strong>Name:</strong> {data.display_name || data.name}
          </p>
          {data.type && (
            <p>
              <strong>Type:</strong> {data.type}
            </p>
          )}
          {data.genre && (
            <p>
              <strong>Genre:</strong> {data.genre}
            </p>
          )}
          {data.personality && (
            <p>
              <strong>Personality:</strong> {truncate(data.personality, 120)}
            </p>
          )}
          {data.voice_description && (
            <p>
              <strong>Voice:</strong> {truncate(data.voice_description, 80)}
            </p>
          )}
        </div>
      );

    case "jingle":
      return (
        <div>
          <p>
            <strong>Title:</strong> {data.title || data.name}
          </p>
          {data.duration && (
            <p>
              <strong>Duration:</strong> {data.duration}
            </p>
          )}
          {data.style && (
            <p>
              <strong>Style:</strong> {data.style}
            </p>
          )}
          {data.description && (
            <p>
              <strong>Description:</strong> {truncate(data.description, 120)}
            </p>
          )}
        </div>
      );

    case "draft":
      return (
        <div>
          <p>
            <strong>Title:</strong> {data.title || data.name}
          </p>
          {data.artist && (
            <p>
              <strong>Artist:</strong> {data.artist}
            </p>
          )}
          {data.genre && (
            <p>
              <strong>Genre:</strong> {data.genre}
            </p>
          )}
          {data.description && (
            <p>
              <strong>Description:</strong> {truncate(data.description, 120)}
            </p>
          )}
        </div>
      );

    case "universe":
      return (
        <div>
          <p>
            <strong>Name:</strong> {data.name}
          </p>
          {data.genre && (
            <p>
              <strong>Genre/Theme:</strong> {data.genre}
            </p>
          )}
          {data.setting && (
            <p>
              <strong>Setting:</strong> {data.setting}
            </p>
          )}
          {data.lore && (
            <p>
              <strong>Lore:</strong> {truncate(data.lore, 120)}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div>
          <p>
            <strong>Name:</strong> {data.name || data.title}
          </p>
          {Object.entries(data)
            .filter(([k]) => k !== "name" && k !== "title")
            .slice(0, 3)
            .map(([key, value]) => (
              <p key={key}>
                <strong>{key}:</strong> {truncate(value, 100)}
              </p>
            ))}
        </div>
      );
  }
}

/**
 * Truncate text to max length, add ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
