import { createContext, useContext, useState, ReactNode } from "react";

interface FormDirtyStateContextType {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

const FormDirtyStateContext = createContext<
  FormDirtyStateContextType | undefined
>(undefined);

export function FormDirtyStateProvider({ children }: { children: ReactNode }) {
  const [isDirty, setDirty] = useState(false);

  const reset = () => {
    setDirty(false);
  };

  const value: FormDirtyStateContextType = {
    isDirty,
    setDirty,
    reset,
  };

  return (
    <FormDirtyStateContext.Provider value={value}>
      {children}
    </FormDirtyStateContext.Provider>
  );
}

export function useFormDirtyState() {
  const context = useContext(FormDirtyStateContext);
  if (context === undefined) {
    throw new Error(
      "useFormDirtyState must be used within FormDirtyStateProvider",
    );
  }
  return context;
}
