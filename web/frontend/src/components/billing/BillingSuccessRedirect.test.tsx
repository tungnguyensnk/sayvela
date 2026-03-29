import { act, render, screen } from "@testing-library/react";
import { BillingSuccessRedirect } from "@/components/billing/BillingSuccessRedirect";

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

describe("BillingSuccessRedirect", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects to billing settings after 5 seconds by default", async () => {
    render(<BillingSuccessRedirect />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("5")).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("4")).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(replace).toHaveBeenCalledWith("/settings/billing");
  });

  it("uses custom delay when provided", async () => {
    render(<BillingSuccessRedirect delayMs={1200} />);

    expect(screen.getByText("2")).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1199);
    });

    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(replace).toHaveBeenCalledWith("/settings/billing");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("0")).not.toBeNull();
  });
});
