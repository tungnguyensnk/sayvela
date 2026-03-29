import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BillingSuccessGate } from "@/components/billing/BillingSuccessGate";

const { useSearchParams } = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams,
}));

vi.mock("@/components/billing/BillingSuccessRedirect", () => ({
  BillingSuccessRedirect: () => <span>5</span>,
}));

describe("BillingSuccessGate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSearchParams.mockReset();
  });

  it("renders error when session_id is missing", () => {
    useSearchParams.mockReturnValue({ get: () => null });

    render(<BillingSuccessGate accessToken="t1" />);

    expect(screen.getByText("Thiếu session_id")).not.toBeNull();
  });

  it("renders paid state after successful verification", async () => {
    useSearchParams.mockReturnValue({ get: () => "cs_test_1" });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ state: "paid" }),
    } as Response);

    render(<BillingSuccessGate accessToken="t1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/backend/billing/checkout-session/verify"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer t1",
          }),
        }),
      );
      expect(screen.getByText("Gói của bạn đã sẵn sàng")).not.toBeNull();
      expect(screen.getByText("5")).not.toBeNull();
    });
  });

  it("renders unpaid state and retries verification", async () => {
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

    render(<BillingSuccessGate accessToken="t1" />);

    await waitFor(() => {
      expect(screen.getByText("Thanh toán chưa hoàn tất")).not.toBeNull();
      expect(screen.getByRole("button", { name: "Thử lại" })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Gói của bạn đã sẵn sàng")).not.toBeNull();
    });
  });
});
