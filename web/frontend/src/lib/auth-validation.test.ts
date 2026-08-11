import {
  getAuthErrorKey,
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
      email: "emailInvalid",
      password: "passwordRequired",
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
      password: "passwordWeak",
      confirmPassword: "confirmMismatch",
    });
  });

  it("maps backend errors to message keys", () => {
    expect(getAuthErrorKey("email already exists")).toBe("emailTaken");
    expect(getAuthErrorKey("invalid credentials")).toBe("badCredentials");
    expect(getAuthErrorKey("failed to fetch")).toBe("network");
    expect(getAuthErrorKey("teapot")).toBe("unknown");
  });
});
