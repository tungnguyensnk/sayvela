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
    return "Please enter your email.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return "Enter a valid email address.";
  }

  return "";
}

export function validatePassword(password: string, mode: AuthMode) {
  if (!password) {
    return "Please enter your password.";
  }

  if (mode === "register" && password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (mode === "register" && !passwordPattern.test(password)) {
    return "Password must include uppercase and lowercase letters, a number, and a special character.";
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
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function getAuthErrorMessage(input: string) {
  const error = input.toLowerCase();

  if (error.includes("email already exists")) {
    return "This email is already in use.";
  }

  if (
    error.includes("invalid credentials") ||
    error.includes("credentials") ||
    error.includes("unauthorized")
  ) {
    return "Incorrect email or password.";
  }

  if (error.includes("failed to fetch") || error.includes("network")) {
    return "Unable to connect to the server. Please try again.";
  }

  return "Something went wrong. Please try again later.";
}
