import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthForm } from "@/components/auth/AuthForm";
import { vi as messages } from "@/i18n/messages/vi";

const t = messages.auth;

const { push, replace, refresh, signIn } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    refresh,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn,
}));

function submitButton(name: string) {
  const matches = screen.getAllByRole("button", { name });
  return matches[matches.length - 1];
}

describe("AuthForm", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    refresh.mockReset();
    signIn.mockReset();
    vi.restoreAllMocks();
  });

  it("shows validation errors for invalid register input", async () => {
    render(<AuthForm initialMode="register" />);

    fireEvent.click(submitButton(t.submitSignUp));

    expect(await screen.findByText(t.validation.emailRequired)).not.toBeNull();
    expect(screen.getByText(t.validation.passwordRequired)).not.toBeNull();
    expect(screen.getByText(t.validation.confirmRequired)).not.toBeNull();
  });

  it("submits register form and switches back to login", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    render(<AuthForm initialMode="register" />);

    fireEvent.change(screen.getByLabelText(t.email), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText(t.password), {
      target: { value: "Admin@1234!" },
    });
    fireEvent.change(screen.getByLabelText(t.confirmPassword), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(submitButton(t.submitSignUp));

    expect(await screen.findByText(t.registered)).not.toBeNull();
    expect(replace).toHaveBeenCalledWith("/auth?mode=login");
  });

  it("submits login form successfully", async () => {
    signIn.mockResolvedValue({ ok: true, error: null, url: "/" });

    render(<AuthForm initialMode="login" />);

    fireEvent.change(screen.getByLabelText(t.email), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText(t.password), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(submitButton(t.submitSignIn));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "demo@sayvela.local",
        password: "Admin@1234!",
        redirect: false,
        callbackUrl: "/",
      });
      expect(push).toHaveBeenCalledWith("/");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("submits login form with callbackUrl when provided", async () => {
    signIn.mockResolvedValue({ ok: true, error: null, url: "/settings/billing" });

    render(<AuthForm initialMode="login" callbackUrl="/settings/billing" />);

    fireEvent.change(screen.getByLabelText(t.email), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText(t.password), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(submitButton(t.submitSignIn));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "demo@sayvela.local",
        password: "Admin@1234!",
        redirect: false,
        callbackUrl: "/settings/billing",
      });
      expect(push).toHaveBeenCalledWith("/settings/billing");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows login error from auth provider", async () => {
    signIn.mockResolvedValue({ ok: false, error: "invalid credentials", url: null });

    render(<AuthForm initialMode="login" />);

    fireEvent.change(screen.getByLabelText(t.email), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText(t.password), {
      target: { value: "wrong-password" },
    });

    fireEvent.click(submitButton(t.submitSignIn));

    expect(await screen.findByText(t.validation.badCredentials)).not.toBeNull();
  });
});
