import {
  getAuthErrorMessage,
  normalizeAuthMode,
  validateLoginValues,
  validateRegisterValues,
} from "@/lib/auth-validation";

describe("auth-validation", () => {
  it("normalizes mode safely", () => {
    expect(normalizeAuthMode("register")).toBe("register");
    expect(normalizeAuthMode("anything")).toBe("login");
    expect(normalizeAuthMode()).toBe("login");
  });

  it("validates login values", () => {
    expect(
      validateLoginValues({
        email: "bad-email",
        password: "",
      }),
    ).toEqual({
      email: "Email không đúng định dạng.",
      password: "Vui lòng nhập mật khẩu.",
    });
  });

  it("validates register values against backend password rules", () => {
    expect(
      validateRegisterValues({
        email: "hello@example.com",
        password: "weakpass",
        confirmPassword: "different",
      }),
    ).toEqual({
      password: "Mật khẩu cần chữ hoa, chữ thường, số và ký tự đặc biệt.",
      confirmPassword: "Mật khẩu xác nhận chưa khớp.",
    });
  });

  it("maps auth errors to user-friendly messages", () => {
    expect(getAuthErrorMessage("email already exists")).toBe(
      "Email này đã được sử dụng.",
    );
    expect(getAuthErrorMessage("invalid credentials")).toBe(
      "Email hoặc mật khẩu không chính xác.",
    );
    expect(getAuthErrorMessage("failed to fetch")).toBe(
      "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
    );
  });
});
