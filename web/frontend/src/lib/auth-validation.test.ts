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
      email: "Enter a valid email address.",
      password: "Please enter your password.",
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
      password: "Password must include uppercase and lowercase letters, a number, and a special character.",
      confirmPassword: "Passwords do not match.",
    });
  });

  it("maps auth errors to user-friendly messages", () => {
    expect(getAuthErrorMessage("email already exists")).toBe(
      "This email is already in use.",
    );
    expect(getAuthErrorMessage("invalid credentials")).toBe(
      "Incorrect email or password.",
    );
    expect(getAuthErrorMessage("failed to fetch")).toBe(
      "Unable to connect to the server. Please try again.",
    );
  });
});
