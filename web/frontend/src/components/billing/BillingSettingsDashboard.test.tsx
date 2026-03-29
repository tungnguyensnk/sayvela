import { render, screen } from "@testing-library/react";
import { BillingSettingsDashboard } from "@/components/billing/BillingSettingsDashboard";
import { EntitlementProvider } from "@/lib/entitlement";

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

    expect(screen.queryByRole("link", { name: "Đăng nhập" })).toBeNull();
  });

  it("shows upgrade to lite for free users", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(screen.getByText(/Gói hiện tại: Free/)).not.toBeNull();
    expect(screen.getByText("đang dùng")).not.toBeNull();
    expect(screen.getByText("Nâng cấp lên Lite")).not.toBeNull();
  });

  it("formats reset quota date consistently", () => {
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

    expect(screen.getByText("Reset quota vào 29 thg 4, 2026.")).not.toBeNull();
  });

  it("shows preserve minutes copy when upgrading lite to pro", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "lite" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(screen.getByText(/Gói hiện tại: Lite/)).not.toBeNull();
    expect(screen.getByText("Nâng Lite → Pro sẽ giữ lại số phút còn lại của chu kỳ hiện tại.")).not.toBeNull();
  });

  it("does not show upgrade card for pro users", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "pro" }}>
        <BillingSettingsDashboard />
      </EntitlementProvider>,
    );

    expect(screen.getByText(/Gói hiện tại: Pro/)).not.toBeNull();
    expect(screen.queryByText(/Nâng cấp lên/)).toBeNull();
  });
});
