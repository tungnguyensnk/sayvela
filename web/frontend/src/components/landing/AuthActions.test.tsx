import { render, screen } from "@testing-library/react";
import { AuthActions } from "@/components/landing/AuthActions";
import { vi as messages } from "@/i18n/messages/vi";

const { useSession, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession,
  signOut,
}));

describe("AuthActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.mockReset();
    signOut.mockReset();
  });

  it("does not show login actions while session is loading", () => {
    useSession.mockReturnValue({ data: null, status: "loading" });

    render(<AuthActions />);

    expect(screen.queryByText(messages.nav.signIn)).toBeNull();
    expect(screen.queryByText(messages.nav.createAccount)).toBeNull();
    expect(screen.getByText(messages.nav.checkingSession)).not.toBeNull();
  });

  it("shows the signed-in state with a sign-out action", () => {
    useSession.mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });

    render(<AuthActions />);

    expect(
      screen.getByText(messages.nav.activeSession("user@example.com")),
    ).not.toBeNull();
    expect(screen.getByText(messages.nav.signOutShort)).not.toBeNull();
  });

  it("offers sign in and sign up when signed out", () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<AuthActions />);

    expect(
      screen.getByRole("link", { name: messages.nav.signIn }).getAttribute("href"),
    ).toBe("/auth?mode=login");
    expect(
      screen.getByRole("link", { name: messages.nav.createAccount }).getAttribute("href"),
    ).toBe("/auth?mode=register");
  });
});
