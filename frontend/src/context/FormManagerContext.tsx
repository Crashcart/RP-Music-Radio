/**
 * FormManager Context for Feature 2.
 * Enables opening forms with pre-filled AI-generated data.
 * Routes form open events to appropriate pages and passes initial data.
 */

import React, { createContext, useContext, useState } from "react";

export type FormEntityType =
  | "station"
  | "brand"
  | "artist"
  | "jingle"
  | "draft"
  | "universe";

export interface FormOpenEvent {
  entityType: FormEntityType;
  initialData: Record<string, any>;
  aiGenerated: boolean;
  sourceUniverse?: string;
}

interface FormManagerContextType {
  pendingForm: FormOpenEvent | null;
  request: FormOpenEvent | null;
  isOpen: boolean;
  openForm: (event: FormOpenEvent) => void;
  closeForm: () => void;
}

export const FormManagerContext = createContext<
  FormManagerContextType | undefined
>(undefined);

export function FormManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingForm, setPendingForm] = useState<FormOpenEvent | null>(null);

  const openForm = (event: FormOpenEvent) => {
    setPendingForm(event);
  };

  const closeForm = () => {
    setPendingForm(null);
  };

  return (
    <FormManagerContext.Provider
      value={{
        pendingForm,
        request: pendingForm,
        isOpen: pendingForm !== null,
        openForm,
        closeForm,
      }}
    >
      {children}
    </FormManagerContext.Provider>
  );
}

export function getFormPageRoute(entityType: FormEntityType): string {
  const routes: Record<FormEntityType, string> = {
    station: "/stations",
    brand: "/brands",
    artist: "/artists",
    jingle: "/jingles",
    draft: "/drafts",
    universe: "/universes",
  };
  return routes[entityType];
}

/**
 * Hook to access FormManager context.
 * Use this in page components to check for pending form opens with AI data.
 */
export function useFormManager(): FormManagerContextType {
  const context = useContext(FormManagerContext);
  if (!context) {
    throw new Error("useFormManager must be used within FormManagerProvider");
  }
  return context;
}

/**
 * Hook to handle form initialization from AI data.
 * Automatically applies AI-generated initial data to form fields.
 *
 * Usage:
 *   const initialData = useFormInitialData();
 *   const [formData, setFormData] = useState<Station>(initialData || {});
 */
export function useFormInitialData<T extends Record<string, any>>(
  expectedEntityType: FormEntityType,
): T | null {
  const { pendingForm, closeForm } = useFormManager();

  // Only return data if it matches the expected entity type
  if (pendingForm && pendingForm.entityType === expectedEntityType) {
    // Close the pending form so it doesn't interfere with other form opens
    const data = pendingForm.initialData;
    closeForm();
    return data as T;
  }

  return null;
}

/**
 * Determines if an entity type requires a preview dialog before form opening.
 * Major entities (station, brand, artist, universe) show preview.
 * Quick-create entities (jingle, draft) auto-open without preview.
 */
export function requiresFormPreview(entityType: FormEntityType): boolean {
  const previewRequired = ["station", "brand", "artist", "universe"];
  return previewRequired.includes(entityType);
}

/**
 * Normalizes entity type strings to FormEntityType.
 * Maps artist subtypes (dj, host, musician, narrator, etc.) to "artist".
 */
export function normalizeEntityType(type: string): FormEntityType {
  const artistTypes = ["dj", "host", "musician", "narrator", "caller", "guest"];
  if (artistTypes.includes(type.toLowerCase())) {
    return "artist";
  }
  return type as FormEntityType;
}
