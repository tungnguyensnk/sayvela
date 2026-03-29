const { getServerSession } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
}));

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/components/landing/LandingHeader", () => ({
  LandingHeader: () => null,
}));

vi.mock("@/components/billing/BillingSettingsDashboard", () => ({
  BillingSettingsDashboard: () => null,
}));

import BillingSettingsPage from "@/app/settings/billing/page";

describe("settings/billing page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getServerSession.mockReset();
    redirect.mockClear();
  });

  it("redirects to login when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(BillingSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth?mode=login&callbackUrl=%2Fsettings%2Fbilling");
  });
});

