/**
 * EXAMPLE: How to integrate AI-generated initial data into form components.
 *
 * This file shows the pattern for updating form components (ArtistForm, StationForm, etc.)
 * to accept and display AI-generated initial data from FormManager.
 *
 * Pattern:
 * 1. Import useFormInitialData hook
 * 2. In component, call hook with expected entity type
 * 3. Pre-fill form fields with initialData
 * 4. Show warning banner if isAiGenerated is true
 * 5. Apply visual styling to AI-filled fields
 */

import { useFormInitialData } from "../hooks/useFormInitialData";

/**
 * Example: ArtistForm component updated to accept AI-generated data
 */
export function ArtistFormExample() {
  const { initialData, isAiGenerated, hasInitialData } =
    useFormInitialData("artist");
  const [formData, setFormData] = React.useState(() => ({
    name: initialData?.name ?? "",
    display_name: initialData?.display_name ?? "",
    personality: initialData?.personality ?? "",
    voice_description: initialData?.voice_description ?? "",
    catchphrases: initialData?.catchphrases ?? "",
    genre: initialData?.genre ?? "",
    // ... other fields
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Create artist via API
    // Then call formManager.confirmForm() to close the form
  };

  return (
    <form onSubmit={handleSubmit}>
      {isAiGenerated && (
        <div className="alert alert-warning">
          ⚠️ AI-generated DJ. Please review and edit all fields before saving.
        </div>
      )}

      <div className={isAiGenerated ? "form-ai-filled" : ""}>
        <label htmlFor="artist-name">Artist Name</label>
        <input
          id="artist-name"
          name="artist_name"
          data-field="name"
          data-section="identity"
          data-type="artist"
          aria-label="Artist Name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className={isAiGenerated ? "form-ai-filled" : ""}>
        <label htmlFor="display-name">Display Name</label>
        <input
          id="display-name"
          name="display_name"
          data-field="display_name"
          data-section="identity"
          data-type="artist"
          aria-label="Display Name"
          value={formData.display_name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, display_name: e.target.value }))
          }
        />
      </div>

      <div className={isAiGenerated ? "form-ai-filled" : ""}>
        <label htmlFor="personality">Personality</label>
        <textarea
          id="personality"
          name="personality"
          data-field="personality"
          data-section="personality"
          data-type="artist"
          aria-label="Personality traits and quirks"
          value={formData.personality}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, personality: e.target.value }))
          }
        />
      </div>

      {/* Additional fields... */}

      <button type="submit">Create Artist</button>
    </form>
  );
}

/**
 * CSS for AI-generated field styling:
 *
 * .form-ai-filled {
 *   background-color: rgba(251, 191, 36, 0.1);  // Amber tint
 *   border: 1px solid #fbbf24;
 *   padding: var(--space-md);
 *   border-radius: var(--radius-sm);
 *   margin-bottom: var(--space-md);
 * }
 *
 * .form-ai-filled::before {
 *   content: "AI-Generated";
 *   display: block;
 *   font-size: 0.75rem;
 *   color: #92400e;
 *   font-weight: 600;
 *   margin-bottom: var(--space-sm);
 * }
 *
 * .alert-warning {
 *   background-color: #fef3c7;
 *   border: 1px solid #fbbf24;
 *   color: #92400e;
 *   padding: var(--space-md);
 *   border-radius: var(--radius-sm);
 *   margin-bottom: var(--space-md);
 * }
 */

/**
 * Example: StationForm updated for AI-generated initial data
 */
export function StationFormExample() {
  const { initialData, isAiGenerated } = useFormInitialData("station");
  const [formData, setFormData] = React.useState(() => ({
    name: initialData?.name ?? "",
    frequency: initialData?.frequency ?? "",
    genre: initialData?.genre ?? "",
    backstory: initialData?.backstory ?? "",
    // ... other fields
  }));

  // Same pattern as ArtistForm
  // Pre-fill form fields from initialData
  // Show warning if isAiGenerated
  // Apply form-ai-filled styling
}

/**
 * Key points:
 *
 * 1. useFormInitialData("artist") returns { initialData, isAiGenerated, hasInitialData }
 * 2. Check isAiGenerated to show warning banner
 * 3. Pre-fill all form fields: value={initialData?.fieldName ?? ""}
 * 4. Apply form-ai-filled class to fields for visual distinction
 * 5. User can edit any field before saving
 * 6. On submit, create entity via API
 * 7. Call formManager.confirmForm() to close form and refresh parent page
 *
 * Integration with FormManager:
 * - FormManager.openForm() navigates to the form page
 * - Form component reads initial data from context via hook
 * - Form pre-fills fields and shows warning
 * - User edits and submits
 * - Form calls formManager.confirmForm() on success
 * - FormManager navigates back and closes dialog
 */
