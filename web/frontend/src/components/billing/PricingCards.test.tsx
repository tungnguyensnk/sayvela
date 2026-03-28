import { fireEvent, render, screen } from "@testing-library/react";
import { PricingCards } from "@/components/billing/PricingCards";
import { EntitlementProvider } from "@/lib/entitlement";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
}));

describe("PricingCards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ plan: "free" }),
      }),
    );
  });

  it("shows monthly pricing by default and switches to yearly with discount", () => {
    render(
      <EntitlementProvider>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getByText("24")).not.toBeNull();
    expect(
      screen.getByText("288").closest("[aria-hidden]")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      screen.getByText("240").closest("[aria-hidden]")?.getAttribute("aria-hidden"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Năm" }));

    expect(screen.getByText("288")).not.toBeNull();
    expect(screen.getByText("240")).not.toBeNull();
    expect(screen.getAllByText("tiết kiệm 2 tháng").length).toBeGreaterThan(0);
  });

  it("shows free signup CTA only when unauthenticated", () => {
    render(
      <EntitlementProvider>
        <PricingCards />
      </EntitlementProvider>,
    );

    const link = screen.getByRole("link", { name: "Bắt đầu miễn phí" });
    expect(link.getAttribute("href")).toBe("/auth?mode=register");
  });

  it("does not show upgrade CTA while entitlement is loading", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    const pendingFetch = new Promise(() => {});

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingFetch);

    render(
      <EntitlementProvider>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getAllByText("Đang kiểm tra subscription...").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nâng cấp Pro/)).toBeNull();
  });

  it("shows current plan CTA for free users", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.queryByText("Bắt đầu miễn phí")).toBeNull();
    expect(screen.getByText("Đang dùng Free")).not.toBeNull();
  });

  it("shows manage billing CTA when entitlement is pro", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "pro" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getByText("Quản lý subscription")).not.toBeNull();
    expect(screen.queryByText(/Nâng cấp Pro/)).toBeNull();
    expect(screen.queryByText("Bắt đầu miễn phí")).toBeNull();
    expect(screen.getByText("Đang dùng Pro")).not.toBeNull();
  });

  it("shows manage billing CTA when entitlement is lite", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "lite" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getByText("Quản lý subscription")).not.toBeNull();
    expect(screen.getByText("Đang dùng Lite")).not.toBeNull();
    expect(screen.queryByText("Bắt đầu miễn phí")).toBeNull();
  });
});
