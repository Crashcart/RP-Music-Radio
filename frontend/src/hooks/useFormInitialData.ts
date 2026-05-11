import { useEffect, useState } from "react";
import {
  useFormManager,
  type FormEntityType,
} from "../contexts/FormManagerContext";

/**
 * Hook for form components to access AI-generated initial data.
 *
 * Usage in a form component:
 * ```tsx
 * const { initialData, isAiGenerated } = useFormInitialData("artist");
 * // Then pre-fill form fields with initialData values
 * // And show warning if isAiGenerated is true
 * ```
 */
export function useFormInitialData(expectedEntityType: FormEntityType) {
  const { request } = useFormManager();
  const [initialData, setInitialData] = useState<Record<string, string> | null>(
    null,
  );
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  useEffect(() => {
    // Check if there's a form request for this entity type
    if (request && request.entityType === expectedEntityType) {
      setInitialData(request.initialData);
      setIsAiGenerated(request.aiGenerated ?? false);
    } else {
      // Clear data if request is for a different entity type
      setInitialData(null);
      setIsAiGenerated(false);
    }
  }, [request, expectedEntityType]);

  return {
    initialData,
    isAiGenerated,
    hasInitialData: initialData !== null,
  };
}

/**
 * Hook to get a specific field value from initial data.
 *
 * Usage:
 * ```tsx
 * const name = useFormField("name");
 * // Returns the value or empty string
 * ```
 */
export function useFormField(
  expectedEntityType: FormEntityType,
  fieldName: string,
) {
  const { initialData } = useFormInitialData(expectedEntityType);
  return initialData?.[fieldName] ?? "";
}
