import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFormManager,
  getFormPageRoute,
} from "../contexts/FormManagerContext";

/**
 * Listens to FormManager requests and navigates to the appropriate form page.
 * Place this component near the root of your app (inside FormManagerProvider).
 *
 * When ChatAssistant calls formManager.openForm(), this component:
 * 1. Navigates to the correct page (e.g., /artists for DJ)
 * 2. Passes initial data via FormManager context
 * 3. Forms access data via useFormInitialData() hook
 */
export function AIFormNavigator() {
  const navigate = useNavigate();
  const { isOpen, request } = useFormManager();

  useEffect(() => {
    if (isOpen && request) {
      const route = getFormPageRoute(request.entityType);
      // Navigation happens, form will read data from context
      navigate(route);
    }
  }, [isOpen, request, navigate]);

  // This component doesn't render anything; it just handles navigation
  return null;
}
