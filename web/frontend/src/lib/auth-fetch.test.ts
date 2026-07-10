import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "next-auth/react";
import { authFetch } from "./auth-fetch";

vi.mock("next-auth/react", () => ({ signOut: vi.fn(() => new Promise(() => undefined)) }));

describe("authFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("keeps the session for a successful response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    await authFetch("/api/proxy/test");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out once when requests are unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await Promise.all([authFetch("/api/proxy/one"), authFetch("/api/proxy/two")]);
    expect(signOut).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/auth?mode=login" });
  });
});
