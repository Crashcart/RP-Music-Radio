import {
  useFormManager,
  type FormEntityType,
} from "../contexts/FormManagerContext";

/**
 * Hook for form components to access AI-generated initial data.
 * Returns values synchronously from the FormManager request so that
 * the form's useState initializer captures real data on the first render.
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

  if (request && request.entityType === expectedEntityType) {
    return {
      initialData: request.initialData,
      isAiGenerated: request.aiGenerated ?? false,
      hasInitialData: true,
    };
  }

  return {
    initialData: null,
    isAiGenerated: false,
    hasInitialData: false,
  };
}

/**
 * Hook to get a specific field value from initial data.
 *
 * Usage:
 * ```tsx
 * const name = useFormField("artist", "name");
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
