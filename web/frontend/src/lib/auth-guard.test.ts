import { buildPathWithQuery, getLoginUrl } from "@/lib/auth-guard-utils";

describe("auth-guard", () => {
  it("builds path without query when params are empty", () => {
    expect(buildPathWithQuery("/settings/billing")).toBe("/settings/billing");
    expect(buildPathWithQuery("/settings/billing", {})).toBe("/settings/billing");
  });

  it("builds path with query params", () => {
    expect(
      buildPathWithQuery("/billing/success", {
        session_id: "cs_test_1",
        foo: "bar",
      }),
    ).toBe("/billing/success?session_id=cs_test_1&foo=bar");
  });

  it("supports array params", () => {
    expect(
      buildPathWithQuery("/pricing", {
        a: ["1", "2"],
      }),
    ).toBe("/pricing?a=1&a=2");
  });

  it("builds login url with encoded callbackUrl", () => {
    expect(getLoginUrl("/billing/success?session_id=cs_test_1")).toBe(
      `/auth?mode=login&callbackUrl=${encodeURIComponent("/billing/success?session_id=cs_test_1")}`,
    );
  });
});
