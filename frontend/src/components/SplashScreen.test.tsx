import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useState } from "react";
import { SplashScreen } from "./SplashScreen";

describe("SplashScreen — dismiss timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onDone after ~2.6s on a stable parent", () => {
    const onDone = vi.fn();
    render(<SplashScreen onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("still dismisses when the parent re-renders rapidly (new onDone each time)", () => {
    const done = vi.fn();

    // Parent that passes a NEW inline callback every render and re-renders
    // repeatedly during the splash window — mirrors App.tsx startup effects.
    function Parent() {
      const [, setTick] = useState(0);
      // expose a way to force re-renders from the test
      (globalThis as Record<string, unknown>).__bump = () =>
        setTick((t) => t + 1);
      return <SplashScreen onDone={() => done()} />;
    }

    render(<Parent />);

    // Hammer the parent with re-renders across the first 2 seconds.
    act(() => {
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(200);
        (
          globalThis as Record<string, unknown> & { __bump: () => void }
        ).__bump();
      }
      vi.advanceTimersByTime(1000);
    });

    // Despite ~10 parent re-renders with fresh onDone callbacks, the splash
    // must still dismiss exactly once.
    expect(done).toHaveBeenCalledTimes(1);
  });
});
