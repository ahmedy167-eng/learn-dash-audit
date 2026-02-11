import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Clock } from "@/components/admin/Clock";

describe("Clock component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render the clock icon", () => {
    render(<Clock />);
    const clockSvg = document.querySelector('svg.lucide-clock');
    expect(clockSvg).toBeInTheDocument();
  });

  it("should display the current date and time", () => {
    const mockDate = new Date("2026-02-11T15:45:30");
    vi.setSystemTime(mockDate);

    render(<Clock />);

    // Check if date is displayed
    expect(screen.getByText(/February 11, 2026/i)).toBeInTheDocument();
    // Check if time is displayed (format: 3:45:30 PM)
    expect(screen.getByText(/3:45:30 PM/i)).toBeInTheDocument();
  });

  it("should update the time every second", () => {
    const mockDate = new Date("2026-02-11T15:45:30");
    vi.setSystemTime(mockDate);

    const { container } = render(<Clock />);

    // Get initial time text
    const initialTimeText = container.textContent;
    expect(initialTimeText).toContain("3:45:30 PM");

    // Advance time by 2 seconds
    act(() => {
      vi.setSystemTime(new Date("2026-02-11T15:45:32"));
      vi.advanceTimersByTime(2000);
    });

    // Get updated time text
    const updatedTimeText = container.textContent;
    
    // Verify the time has changed and no longer shows the initial time
    expect(updatedTimeText).not.toContain("3:45:30 PM");
    // Verify it contains a valid time format
    expect(updatedTimeText).toMatch(/\d+:\d+:\d+ (AM|PM)/);
  });

  it("should clean up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = render(<Clock />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
