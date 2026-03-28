import { render, screen } from "@testing-library/react";
import { AuthActions } from "@/components/landing/AuthActions";

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

    expect(screen.queryByText("Đăng nhập")).toBeNull();
    expect(screen.queryByText("Tạo tài khoản")).toBeNull();
    expect(screen.getByText("Đang kiểm tra phiên…")).not.toBeNull();
  });

  it("shows logout actions when authenticated", () => {
    useSession.mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });

    render(<AuthActions />);

    expect(screen.getByText(/Phiên đang hoạt động/)).not.toBeNull();
    expect(screen.getByText("Đăng xuất")).not.toBeNull();
  });
});

