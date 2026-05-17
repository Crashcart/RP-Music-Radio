import { useState, useCallback } from "react";

interface FormDirtyState {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

export function useFormDirtyState(): FormDirtyState {
  const [isDirty, setDirty] = useState(false);

  const reset = useCallback(() => {
    setDirty(false);
  }, []);

  return { isDirty, setDirty, reset };
}
