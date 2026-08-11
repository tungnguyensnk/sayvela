import { fireEvent, render, screen } from "@testing-library/react";
import { PricingCards } from "@/components/billing/PricingCards";
import { EntitlementProvider } from "@/lib/entitlement";
import { vi as messages } from "@/i18n/messages/vi";

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

    fireEvent.click(screen.getByRole("button", { name: messages.pricing.yearly }));

    expect(screen.getByText("288")).not.toBeNull();
    expect(screen.getByText("240")).not.toBeNull();
    expect(screen.getAllByText(messages.pricing.saveMonths(2)).length).toBeGreaterThan(0);
  });

  it("shows free signup CTA only when unauthenticated", () => {
    render(
      <EntitlementProvider>
        <PricingCards />
      </EntitlementProvider>,
    );

    const link = screen.getByRole("link", { name: messages.pricing.startFree });
    expect(link.getAttribute("href")).toBe("/auth?mode=register");
  });

  it("does not show upgrade CTA while entitlement is loading", () => {
    useSession.mockReturnValue({ data: { accessToken: "token" }, status: "authenticated" });

    const pendingFetch = new Promise(() => {});
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      pendingFetch,
    );

    render(
      <EntitlementProvider>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(
      screen.getAllByText(messages.pricing.checkingSubscription).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(messages.billing.checkout.upgradeTo(messages.plan.pro)),
    ).toBeNull();
  });

  it("shows current plan badge for free users", () => {
    useSession.mockReturnValue({ data: { accessToken: "token" }, status: "authenticated" });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.queryByText(messages.pricing.startFree)).toBeNull();
    expect(screen.getByText(messages.plan.free)).not.toBeNull();
    expect(screen.getByText(messages.plan.current)).not.toBeNull();
  });

  it("shows manage billing CTA when entitlement is pro", () => {
    useSession.mockReturnValue({ data: { accessToken: "token" }, status: "authenticated" });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "pro" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getByText(messages.common.manage)).not.toBeNull();
    expect(
      screen.queryByText(messages.billing.checkout.upgradeTo(messages.plan.pro)),
    ).toBeNull();
    expect(screen.queryByText(messages.pricing.startFree)).toBeNull();
    expect(screen.getByText(messages.plan.pro)).not.toBeNull();
    expect(screen.getByText(messages.plan.current)).not.toBeNull();
  });

  it("shows manage billing CTA when entitlement is lite", () => {
    useSession.mockReturnValue({ data: { accessToken: "token" }, status: "authenticated" });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "lite" }}>
        <PricingCards />
      </EntitlementProvider>,
    );

    expect(screen.getByText(messages.common.manage)).not.toBeNull();
    expect(screen.getByText(messages.plan.lite)).not.toBeNull();
    expect(screen.getByText(messages.plan.current)).not.toBeNull();
    expect(screen.queryByText(messages.pricing.startFree)).toBeNull();
  });
});
