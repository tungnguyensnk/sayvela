import { render, screen } from "@testing-library/react";
import { PricingComparisonTable } from "@/components/billing/PricingComparisonTable";
import { EntitlementProvider } from "@/lib/entitlement";

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

  it("renders comparison section", () => {
    render(
      <EntitlementProvider>
        <PricingComparisonTable />
      </EntitlementProvider>,
    );

    expect(screen.getByText("So sánh chi tiết các gói")).not.toBeNull();
    expect(screen.getByText("Phút mỗi tháng")).not.toBeNull();
  });

  it("shows upgrade hint when entitlement is free", () => {
    useSession.mockReturnValue({
      data: { accessToken: "token" },
      status: "authenticated",
    });

    render(
      <EntitlementProvider initialEntitlement={{ plan: "free" }}>
        <PricingComparisonTable />
      </EntitlementProvider>,
    );

    expect(screen.getByRole("link", { name: "Nâng cấp ngay" })).not.toBeNull();
  });
});

