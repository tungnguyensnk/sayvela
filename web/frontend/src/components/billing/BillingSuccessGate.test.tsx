import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BillingSuccessGate } from "@/components/billing/BillingSuccessGate";
import { vi as messages } from "@/i18n/messages/vi";

const { useSearchParams } = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams,
}));

vi.mock("@/components/billing/BillingSuccessRedirect", () => ({
  BillingSuccessRedirect: ({ render }: { render?: (seconds: number) => unknown }) => (
    <span>{render ? render(5) : 5}</span>
  ),
}));

const s = messages.billing.success;

describe("BillingSuccessGate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSearchParams.mockReset();
  });

  it("renders an error when session_id is missing", () => {
    useSearchParams.mockReturnValue({ get: () => null });

    render(<BillingSuccessGate />);

    expect(screen.getByText(s.missingTitle)).not.toBeNull();
  });

  it("renders the paid state after successful verification", async () => {
    useSearchParams.mockReturnValue({ get: () => "cs_test_1" });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ state: "paid" }),
    } as Response);

    render(<BillingSuccessGate />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/proxy/billing/checkout-session/verify?session_id=cs_test_1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(screen.getByText(s.paidTitle)).not.toBeNull();
      expect(screen.getByText(s.paidBody(5))).not.toBeNull();
    });
  });

  it("renders the unpaid state and retries verification", async () => {
    useSearchParams.mockReturnValue({ get: () => "cs_test_2" });

    const fetchMock = vi.spyOn(global, "fetch");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ state: "unpaid" }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ state: "paid" }),
    } as Response);

    render(<BillingSuccessGate />);

    await waitFor(() => {
      expect(screen.getByText(s.unpaidTitle)).not.toBeNull();
      expect(
        screen.getByRole("button", { name: messages.common.retry }),
      ).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: messages.common.retry }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText(s.paidTitle)).not.toBeNull();
    });
  });
});
