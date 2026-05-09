import { createContext, useContext, useState, ReactNode } from "react";
import type { EntityType } from "../utils/entitySuggestionParser";

export type FormEntityType = EntityType | "jingle" | "draft";

export interface FormOpenRequest {
  entityType: FormEntityType;
  initialData: Record<string, string>;
  aiGenerated?: boolean;
  sourceUniverse?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormManagerContextType {
  // Current form state
  isOpen: boolean;
  request: FormOpenRequest | null;

  // Actions
  openForm: (request: FormOpenRequest) => void;
  closeForm: () => void;
  confirmForm: () => void;
}

const FormManagerContext = createContext<FormManagerContextType | undefined>(
  undefined,
);

/**
 * FormManager Provider — manages form state across all pages.
 * Enables AI-generated data to be passed to forms without direct staging.
 *
 * Usage in App.tsx:
 * <FormManagerProvider>
 *   <Router>...</Router>
 *   <ChatAssistant />
 * </FormManagerProvider>
 */
export function FormManagerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<FormOpenRequest | null>(null);

  const openForm = (req: FormOpenRequest) => {
    setRequest(req);
    setIsOpen(true);
  };

  const closeForm = () => {
    // Call onCancel if provided
    if (request?.onCancel) {
      request.onCancel();
    }
    setIsOpen(false);
    setRequest(null);
  };

  const confirmForm = () => {
    // Call onSuccess if provided (form submission handled by the form component itself)
    if (request?.onSuccess) {
      request.onSuccess();
    }
    setIsOpen(false);
    setRequest(null);
  };

  const value: FormManagerContextType = {
    isOpen,
    request,
    openForm,
    closeForm,
    confirmForm,
  };

  return (
    <FormManagerContext.Provider value={value}>
      {children}
    </FormManagerContext.Provider>
  );
}

/**
 * Hook to access FormManager from any component.
 * Use in forms and other components that need to open forms.
 */
export function useFormManager() {
  const context = useContext(FormManagerContext);
  if (context === undefined) {
    throw new Error("useFormManager must be used within FormManagerProvider");
  }
  return context;
}

/**
 * Map entity type to the page route where the form lives.
 */
export function getFormPageRoute(entityType: FormEntityType): string {
  const routes: Record<FormEntityType, string> = {
    dj: "/artists",
    artist: "/artists",
    station: "/stations",
    brand: "/brands",
    jingle: "/jingles",
    draft: "/drafts",
    universe: "/universes",
  };
  return routes[entityType] || "/";
}

/**
 * Determine if a form should show the preview dialog (confirmation required).
 * Major entities: Station, Brand, Universe require preview.
 * Quick-create entities: DJ, Jingle, Draft can auto-open.
 */
export function requiresFormPreview(entityType: FormEntityType): boolean {
  const majorEntities: FormEntityType[] = ["station", "brand", "universe"];
  return majorEntities.includes(entityType);
}
