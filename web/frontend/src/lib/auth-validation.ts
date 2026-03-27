export const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export type AuthMode = "login" | "register";

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  confirmPassword: string;
}

export type AuthErrors<T extends object> = Partial<
  Record<keyof T | "form", string>
>;

export function normalizeAuthMode(value?: string): AuthMode {
  return value === "register" ? "register" : "login";
}

export function validateEmail(email: string) {
  if (!email.trim()) {
    return "Vui lòng nhập email.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return "Email không đúng định dạng.";
  }

  return "";
}

export function validatePassword(password: string, mode: AuthMode) {
  if (!password) {
    return "Vui lòng nhập mật khẩu.";
  }

  if (mode === "register" && password.length < 8) {
    return "Mật khẩu phải có ít nhất 8 ký tự.";
  }

  if (mode === "register" && !passwordPattern.test(password)) {
    return "Mật khẩu cần chữ hoa, chữ thường, số và ký tự đặc biệt.";
  }

  return "";
}

export function validateLoginValues(
  values: LoginValues,
): AuthErrors<LoginValues> {
  const errors: AuthErrors<LoginValues> = {};
  const emailError = validateEmail(values.email);
  const passwordError = validatePassword(values.password, "login");

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function validateRegisterValues(
  values: RegisterValues,
): AuthErrors<RegisterValues> {
  const errors: AuthErrors<RegisterValues> = {
    ...validateLoginValues(values),
  };

  const passwordError = validatePassword(values.password, "register");
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
  }

  return errors;
}

export function getAuthErrorMessage(input: string) {
  const error = input.toLowerCase();

  if (error.includes("email already exists")) {
    return "Email này đã được sử dụng.";
  }

  if (
    error.includes("invalid credentials") ||
    error.includes("credentials") ||
    error.includes("unauthorized")
  ) {
    return "Email hoặc mật khẩu không chính xác.";
  }

  if (error.includes("failed to fetch") || error.includes("network")) {
    return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
  }

  return "Đã xảy ra lỗi. Vui lòng thử lại sau.";
}
