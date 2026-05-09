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

import { useState } from "react";
import { useFormInitialData } from "../hooks/useFormInitialData";

/**
 * Example: ArtistForm component updated to accept AI-generated data
 *
 * Usage:
 * - When FormManager.openForm({ entityType: "dj", initialData: {...} }) is called
 * - This component will receive the AI-generated data via the useFormInitialData hook
 * - Pre-fill all form fields with the initial data
 * - Show a warning banner if isAiGenerated is true
 * - User can edit any field before submitting
 */
export function ArtistFormExample() {
  const { initialData, isAiGenerated } = useFormInitialData("dj");
  const [name, setName] = useState(initialData?.name ?? "");
  const [personality, setPersonality] = useState(
    initialData?.personality ?? "",
  );

  return (
    <form>
      {isAiGenerated && (
        <div className="alert alert-warning">
          ⚠️ AI-generated DJ. Please review and edit all fields before saving.
        </div>
      )}

      <label htmlFor="name">Artist Name</label>
      <input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={isAiGenerated ? "form-ai-filled" : ""}
      />

      <label htmlFor="personality">Personality</label>
      <textarea
        id="personality"
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        className={isAiGenerated ? "form-ai-filled" : ""}
      />

      <button type="submit">Save DJ</button>
    </form>
  );
}

/**
 * Example: StationForm updated for AI-generated initial data
 */
export function StationFormExample() {
  const { initialData, isAiGenerated } = useFormInitialData("station");
  const [name, setName] = useState(initialData?.name ?? "");

  return (
    <form>
      {isAiGenerated && (
        <div className="alert alert-warning">
          ⚠️ AI-generated Station. Please review before saving.
        </div>
      )}

      <label htmlFor="station-name">Station Name</label>
      <input
        id="station-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={isAiGenerated ? "form-ai-filled" : ""}
      />

      <button type="submit">Create Station</button>
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
 * Key points:
 *
 * 1. useFormInitialData(entityType) returns { initialData, isAiGenerated, hasInitialData }
 * 2. Check isAiGenerated to show warning banner
 * 3. Pre-fill all form fields: useState(initialData?.fieldName ?? "")
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
 * - FormManager closes the form
 */
