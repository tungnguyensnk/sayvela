import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
}));

describe("CheckoutButton", () => {
  beforeEach(() => {
    useSession.mockReset();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("redirects to login when user is not authenticated", async () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<CheckoutButton plan="pro" />);
    fireEvent.click(screen.getByRole("button", { name: "Nâng cấp Pro" }));

    await waitFor(() => {
      expect(window.location.href).toBe("/auth?mode=login");
    });
  });

  it("redirects to stripe checkout when session is created", async () => {
    useSession.mockReturnValue({
      data: {},
      status: "authenticated",
    });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://stripe/checkout" }),
    } as Response);

    render(<CheckoutButton plan="pro" interval="month" />);
    fireEvent.click(screen.getByRole("button", { name: "Nâng cấp Pro" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/proxy/billing/checkout-session",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(window.location.href).toBe("https://stripe/checkout");
    });
  });

  it("uses lite label when plan is lite", async () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<CheckoutButton plan="lite" />);
    expect(screen.getByRole("button", { name: "Nâng cấp Lite" })).not.toBeNull();
  });
});
