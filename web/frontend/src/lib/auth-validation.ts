export const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export type AuthMode = "login" | "register";

/**
 * Việc kiểm tra dữ liệu trả về khóa thông báo, không trả về câu chữ — nhờ vậy
 * cùng một quy tắc dùng được cho cả ba ngôn ngữ giao diện.
 */
export type ValidationKey =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordWeak"
  | "confirmRequired"
  | "confirmMismatch"
  | "emailTaken"
  | "badCredentials"
  | "network"
  | "unknown";

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  confirmPassword: string;
}

export type AuthErrors<T extends object> = Partial<
  Record<keyof T | "form", ValidationKey>
>;

export function normalizeAuthMode(value?: string): AuthMode {
  return value === "register" ? "register" : "login";
}

export function validateEmail(email: string): ValidationKey | null {
  if (!email.trim()) return "emailRequired";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return "emailInvalid";

  return null;
}

export function validatePassword(
  password: string,
  mode: AuthMode,
): ValidationKey | null {
  if (!password) return "passwordRequired";
  if (mode === "register" && password.length < 8) return "passwordTooShort";
  if (mode === "register" && !passwordPattern.test(password)) return "passwordWeak";
  return null;
}

export function validateLoginValues(values: LoginValues): AuthErrors<LoginValues> {
  const errors: AuthErrors<LoginValues> = {};
  const emailError = validateEmail(values.email);
  const passwordError = validatePassword(values.password, "login");

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateRegisterValues(
  values: RegisterValues,
): AuthErrors<RegisterValues> {
  const errors: AuthErrors<RegisterValues> = {
    ...validateLoginValues(values),
  };

  const passwordError = validatePassword(values.password, "register");
  if (passwordError) errors.password = passwordError;

  if (!values.confirmPassword) {
    errors.confirmPassword = "confirmRequired";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "confirmMismatch";
  }

  return errors;
}

/** Ánh xạ lỗi thô từ backend sang khóa thông báo hiển thị được. */
export function getAuthErrorKey(input: string): ValidationKey {
  const error = input.toLowerCase();

  if (error.includes("email already exists")) return "emailTaken";

  if (
    error.includes("invalid credentials") ||
    error.includes("credentials") ||
    error.includes("unauthorized")
  ) {
    return "badCredentials";
  }

  if (error.includes("failed to fetch") || error.includes("network")) {
    return "network";
  }

  return "unknown";
}
