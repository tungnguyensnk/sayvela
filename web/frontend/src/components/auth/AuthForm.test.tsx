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

    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByText("Vui lòng nhập email.")).not.toBeNull();
    expect(
      screen.getByText("Vui lòng nhập mật khẩu."),
    ).not.toBeNull();
    expect(
      screen.getByText("Vui lòng xác nhận mật khẩu."),
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
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "Admin@1234!" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(
      await screen.findByText("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ."),
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
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "Admin@1234!" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Đăng nhập" })[1]);

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
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "wrong-password" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Đăng nhập" })[1]);

    expect(
      await screen.findByText("Email hoặc mật khẩu không chính xác."),
    ).not.toBeNull();
  });
});
