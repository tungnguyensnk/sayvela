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

vi.mock("@/components/billing/BillingSuccessGate", () => ({
  BillingSuccessGate: () => null,
}));

import BillingSuccessPage from "@/app/billing/success/page";

describe("billing/success page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getServerSession.mockReset();
    redirect.mockClear();
  });

  it("redirects to login and preserves full query string when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(
      BillingSuccessPage({
        searchParams: Promise.resolve({ session_id: "cs_test_1", foo: "bar" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith(
      `/auth?mode=login&callbackUrl=${encodeURIComponent("/billing/success?session_id=cs_test_1&foo=bar")}`,
    );
  });
});

