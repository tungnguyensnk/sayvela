import { render, screen } from "@testing-library/react";
import { BillingSettingsDashboard } from "@/components/billing/BillingSettingsDashboard";
import { EntitlementProvider } from "@/lib/entitlement";
import { vi as messages } from "@/i18n/messages/vi";
import { formatLongDate } from "@/lib/format";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
}));

describe("BillingSettingsDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ plan: "free" }),
      }),
    );
  });

  it("renders nothing when unauthenticated", () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(
      <EntitlementProvider>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(screen.queryByText(messages.billing.manageTitle)).toBeNull();
  });

  it("shows the upgrade card for free users", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(
      screen.getByText(messages.billing.currentPlan(messages.plan.free)),
    ).not.toBeNull();
    expect(screen.getByText(messages.plan.current)).not.toBeNull();
    expect(screen.getByText(messages.billing.upgrade.toLite)).not.toBeNull();
  });

  it("formats the quota reset date consistently", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider
        initialEntitlement={{
          plan: "free",
          cycleEndsAt: "2026-04-28T17:00:00.000Z",
        }}
      >
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    const date = formatLongDate("2026-04-28T17:00:00.000Z", "vi");
    expect(date).toBe("29 thg 4, 2026");
    expect(screen.getByText(messages.billing.resetOn(date!))).not.toBeNull();
  });

  it("explains that minutes carry over when upgrading lite to pro", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "lite" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(
      screen.getByText(messages.billing.currentPlan(messages.plan.lite)),
    ).not.toBeNull();
    expect(screen.getByText(messages.billing.upgrade.keepMinutes)).not.toBeNull();
  });

  it("does not show the upgrade card for pro users", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "pro" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(
      screen.getByText(messages.billing.currentPlan(messages.plan.pro)),
    ).not.toBeNull();
    expect(screen.queryByText(messages.billing.upgrade.toLite)).toBeNull();
    expect(screen.queryByText(messages.billing.upgrade.toPro)).toBeNull();
  });
});
