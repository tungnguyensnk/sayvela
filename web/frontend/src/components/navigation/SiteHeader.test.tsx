import { createElement, type ImgHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/navigation/SiteHeader";

const { useSession, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(),
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
}));

vi.mock("@/lib/entitlement", () => ({
  useEntitlement,
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const nextImageProps = { ...props };
    delete nextImageProps.priority;

    return createElement("img", {
      ...nextImageProps,
      alt: props.alt ?? "",
    });
  },
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    signOut.mockReset();
    usePathname.mockReset();
    useEntitlement.mockReset();
  });

  it("shows skeleton while session is loading", () => {
    usePathname.mockReturnValue("/");
    useSession.mockReturnValue({ data: null, status: "loading" });
    useEntitlement.mockReturnValue({ state: { kind: "unauthenticated" }, refresh: vi.fn() });

    render(<SiteHeader />);

    expect(screen.getByText("Checking session…")).not.toBeNull();
    expect(screen.queryByText("Sign in")).toBeNull();
    expect(screen.queryByText("Create account")).toBeNull();
  });

  it("renders app header with soon nav items and user menu when authenticated", () => {
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

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink.getAttribute("href")).toBe("/dashboard");
    const billingLink = screen.getByRole("link", { name: "Billing & usage" });
    expect(billingLink.getAttribute("href")).toBe("/settings/billing");

    expect(screen.getByText(/Free · 10\/60 phút/)).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Nâng cấp" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "user@example.com" }));
    expect(screen.getByText("Đăng xuất")).not.toBeNull();
  });
});
