import { render, screen } from "@testing-library/react";
import { PricingComparisonTable } from "@/components/billing/PricingComparisonTable";
import { EntitlementProvider } from "@/lib/entitlement";
import { vi as messages } from "@/i18n/messages/vi";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
}));

describe("PricingComparisonTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("renders the comparison table", () => {
    render(
      <EntitlementProvider>
        <PricingComparisonTable />
      </EntitlementProvider>,
    );

    expect(screen.getByText(messages.pricing.comparison.title)).not.toBeNull();
    expect(screen.getByText(messages.pricing.comparison.rows.minutes)).not.toBeNull();
  });

  it("shows the upgrade hint when entitlement is free", () => {
    useSession.mockReturnValue({ data: { accessToken: "token" }, status: "authenticated" });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <PricingComparisonTable />
      </EntitlementProvider>,
    );

    expect(
      screen.getByRole("link", { name: messages.pricing.comparison.upgradeCta }),
    ).not.toBeNull();
  });
});
