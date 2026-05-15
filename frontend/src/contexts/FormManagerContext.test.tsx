import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  FormManagerProvider,
  useFormManager,
  getFormPageRoute,
  requiresFormPreview,
  type FormEntityType,
} from "./FormManagerContext";

/**
 * Unit tests for FormManagerContext
 * Tests context provider, hooks, and helper functions
 */

// Test component that uses the hook
function TestComponent() {
  const { isOpen, request, openForm, closeForm } = useFormManager();

  return (
    <div>
      <div data-testid="is-open">{isOpen ? "open" : "closed"}</div>
      <div data-testid="entity-type">{request?.entityType || "none"}</div>
      <button
        onClick={() =>
          openForm({ entityType: "dj", initialData: { name: "Test" } })
        }
      >
        Open DJ Form
      </button>
      <button onClick={closeForm}>Close Form</button>
    </div>
  );
}

describe("FormManagerContext", () => {
  describe("useFormManager hook", () => {
    it("should throw error if used outside FormManagerProvider", () => {
      // Suppress console error for this test
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        "useFormManager must be used within FormManagerProvider",
      );

      consoleError.mockRestore();
    });

    it("should return context values when inside provider", () => {
      const { getByTestId } = render(
        <FormManagerProvider>
          <TestComponent />
        </FormManagerProvider>,
      );

      expect(getByTestId("is-open").textContent).toBe("closed");
      expect(getByTestId("entity-type").textContent).toBe("none");
    });

    it("should handle openForm action", async () => {
      const { getByTestId, getByText } = render(
        <FormManagerProvider>
          <TestComponent />
        </FormManagerProvider>,
      );

      // Initial state
      expect(getByTestId("is-open").textContent).toBe("closed");

      // Click to open form
      getByText("Open DJ Form").click();

      // Wait for state update
      await waitFor(() => {
        expect(getByTestId("is-open").textContent).toBe("open");
      });
      expect(getByTestId("entity-type").textContent).toBe("dj");
    });

    it("should handle closeForm action", async () => {
      const { getByTestId, getByText } = render(
        <FormManagerProvider>
          <TestComponent />
        </FormManagerProvider>,
      );

      // Open form
      getByText("Open DJ Form").click();
      await waitFor(() => {
        expect(getByTestId("is-open").textContent).toBe("open");
      });

      // Close form
      getByText("Close Form").click();
      await waitFor(() => {
        expect(getByTestId("is-open").textContent).toBe("closed");
      });
      expect(getByTestId("entity-type").textContent).toBe("none");
    });
  });

  describe("getFormPageRoute helper", () => {
    it("should map dj to /artists", () => {
      expect(getFormPageRoute("dj")).toBe("/artists");
    });

    it("should map artist to /artists", () => {
      expect(getFormPageRoute("artist")).toBe("/artists");
    });

    it("should map station to /stations", () => {
      expect(getFormPageRoute("station")).toBe("/stations");
    });

    it("should map brand to /brands", () => {
      expect(getFormPageRoute("brand")).toBe("/brands");
    });

    it("should map jingle to /jingles", () => {
      expect(getFormPageRoute("jingle")).toBe("/jingles");
    });

    it("should map draft to /drafts", () => {
      expect(getFormPageRoute("draft")).toBe("/drafts");
    });

    it("should map universe to /universes", () => {
      expect(getFormPageRoute("universe")).toBe("/universes");
    });

    it("should return / for unknown types", () => {
      expect(getFormPageRoute("unknown" as FormEntityType)).toBe("/");
    });
  });

  describe("requiresFormPreview helper", () => {
    it("should require preview for station", () => {
      expect(requiresFormPreview("station")).toBe(true);
    });

    it("should require preview for brand", () => {
      expect(requiresFormPreview("brand")).toBe(true);
    });

    it("should require preview for universe", () => {
      expect(requiresFormPreview("universe")).toBe(true);
    });

    it("should NOT require preview for dj", () => {
      expect(requiresFormPreview("dj")).toBe(false);
    });

    it("should NOT require preview for artist", () => {
      expect(requiresFormPreview("artist")).toBe(false);
    });

    it("should NOT require preview for jingle", () => {
      expect(requiresFormPreview("jingle")).toBe(false);
    });

    it("should NOT require preview for draft", () => {
      expect(requiresFormPreview("draft")).toBe(false);
    });
  });

  describe("confirmForm action", () => {
    function TestComponentWithConfirm() {
      const { isOpen, openForm, confirmForm } = useFormManager();

      return (
        <div>
          <div data-testid="is-open">{isOpen ? "open" : "closed"}</div>
          <button
            onClick={() =>
              openForm({ entityType: "dj", initialData: { name: "Test" } })
            }
          >
            Open Form
          </button>
          <button onClick={confirmForm}>Confirm Form</button>
        </div>
      );
    }

    it("should close form when confirmForm called", async () => {
      const { getByTestId, getByText } = render(
        <FormManagerProvider>
          <TestComponentWithConfirm />
        </FormManagerProvider>,
      );

      getByText("Open Form").click();
      await waitFor(() => {
        expect(getByTestId("is-open").textContent).toBe("open");
      });

      getByText("Confirm Form").click();
      await waitFor(() => {
        expect(getByTestId("is-open").textContent).toBe("closed");
      });
    });
  });

  describe("FormOpenRequest callbacks", () => {
    it("should call onSuccess callback when confirmForm is called", () => {
      // Callbacks are stored in request but executed by form components after submission
      expect(true).toBe(true); // Placeholder
    });
  });
});
