import { fireEvent, render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { vi as messages } from "@/i18n/messages/vi";

const { useSession, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

const { usePathname, useRouter } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const { useEntitlement } = vi.hoisted(() => ({
  useEntitlement: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
  signOut,
}));

vi.mock("next/navigation", () => ({
  usePathname,
  useRouter,
}));

vi.mock("@/lib/entitlement", () => ({
  useEntitlement,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    signOut.mockReset();
    usePathname.mockReset();
    useEntitlement.mockReset();
  });

  it("shows a session placeholder while the session is loading", () => {
    usePathname.mockReturnValue("/");
    useSession.mockReturnValue({ data: null, status: "loading" });
    useEntitlement.mockReturnValue({ state: { kind: "unauthenticated" }, refresh: vi.fn() });

    render(<SiteHeader />);

    expect(screen.getByText(messages.nav.checkingSession)).not.toBeNull();
    expect(screen.queryByText(messages.nav.signIn)).toBeNull();
    expect(screen.queryByText(messages.nav.createAccount)).toBeNull();
  });

  it("renders the app navigation, quota chip and user menu when authenticated", () => {
    usePathname.mockReturnValue("/settings/billing");
    useSession.mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });
    useEntitlement.mockReturnValue({
      state: {
        kind: "ready",
        entitlement: {
          plan: "free",
          minutesPerMonth: 60,
          minutesUsed: 10,
          minutesRemaining: 50,
          usagePercentage: 17,
          cycleStartedAt: null,
          cycleEndsAt: null,
          upgradeRecommendation: "lite",
          features: {},
        },
      },
      refresh: vi.fn(),
    });

    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: messages.nav.dashboard }).getAttribute("href"),
    ).toBe("/dashboard");
    expect(
      screen.getByRole("link", { name: messages.nav.billing }).getAttribute("href"),
    ).toBe("/settings/billing");

    expect(
      screen.getByText(`${messages.plan.free} · ${messages.plan.usage(10, 60)}`),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "user@example.com" }));
    expect(screen.getByText(messages.nav.signOut)).not.toBeNull();
  });
});
