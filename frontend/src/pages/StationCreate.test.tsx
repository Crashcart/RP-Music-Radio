import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { Stations } from "./Stations";
import {
  FormManagerProvider,
  useFormManager,
} from "../contexts/FormManagerContext";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    listStations: vi.fn().mockResolvedValue([]),
    createStation: vi.fn().mockResolvedValue({ id: "new-1", name: "X" }),
    listArtists: vi.fn().mockResolvedValue([]),
    listJingles: vi.fn().mockResolvedValue([]),
    getStation: vi.fn(),
    updateStation: vi.fn(),
  },
}));

describe("Station creation — full user flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens form, accepts input, and calls createStation on save", async () => {
    render(
      <FormManagerProvider>
        <Stations />
      </FormManagerProvider>,
    );

    // Wait for initial list load
    await waitFor(() => screen.getByText("+ New Station"));

    // Click "+ New Station"
    fireEvent.click(screen.getByText("+ New Station"));

    // Form should render
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Nebula FM 99.8")).toBeTruthy();
    });

    // Type a station name
    const nameInput = screen.getByPlaceholderText(
      "Nebula FM 99.8",
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "My New Station" } });
    expect(nameInput.value).toBe("My New Station");

    // Click "Create Station"
    const createBtn = screen.getByText("Create Station");
    await act(async () => {
      fireEvent.click(createBtn);
    });

    // api.createStation MUST have been called with the name
    await waitFor(() => {
      expect(api.createStation).toHaveBeenCalledTimes(1);
    });
    const callArg = (api.createStation as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArg.name).toBe("My New Station");
  });

  it("AI flow: openForm pre-fills station fields", async () => {
    let openFormFn:
      | ((req: {
          entityType: string;
          initialData: Record<string, string>;
          aiGenerated: boolean;
        }) => void)
      | null = null;

    function Capture() {
      const mgr = useFormManager();
      openFormFn = mgr.openForm;
      return null;
    }

    render(
      <FormManagerProvider>
        <Capture />
        <Stations />
      </FormManagerProvider>,
    );

    await waitFor(() => screen.getByText("+ New Station"));

    // Simulate ChatAssistant calling openForm with AI data
    act(() => {
      openFormFn?.({
        entityType: "station",
        initialData: { name: "AI Station", genre: "synthwave" },
        aiGenerated: true,
      });
    });

    // Form should appear pre-filled
    await waitFor(() => {
      const nameInput = screen.queryByPlaceholderText(
        "Nebula FM 99.8",
      ) as HTMLInputElement | null;
      expect(nameInput?.value).toBe("AI Station");
    });

    const genreInput = screen.getByPlaceholderText(
      "synthwave",
    ) as HTMLInputElement;
    expect(genreInput.value).toBe("synthwave");

    // AI banner should show
    expect(screen.queryByText(/AI-generated station/i)).toBeTruthy();
  });
});
