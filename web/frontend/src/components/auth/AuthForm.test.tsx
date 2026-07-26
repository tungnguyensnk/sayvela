import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthForm } from "@/components/auth/AuthForm";

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

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Please enter your email.")).not.toBeNull();
    expect(
      screen.getByText("Please enter your password."),
    ).not.toBeNull();
    expect(
      screen.getByText("Please confirm your password."),
    ).not.toBeNull();
  });

  it("submits register form and switches back to login", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    render(<AuthForm initialMode="register" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Admin@1234!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Account created successfully. You can sign in now."),
    ).not.toBeNull();

    expect(replace).toHaveBeenCalledWith("/auth?mode=login");
  });

  it("submits login form successfully", async () => {
    signIn.mockResolvedValue({
      ok: true,
      error: null,
      url: "/",
    });

    render(<AuthForm initialMode="login" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

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
    signIn.mockResolvedValue({
      ok: true,
      error: null,
      url: "/settings/billing",
    });

    render(<AuthForm initialMode="login" callbackUrl="/settings/billing" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

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
    signIn.mockResolvedValue({
      ok: false,
      error: "invalid credentials",
      url: null,
    });

    render(<AuthForm initialMode="login" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@sayvela.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    expect(
      await screen.findByText("Incorrect email or password."),
    ).not.toBeNull();
  });
});
