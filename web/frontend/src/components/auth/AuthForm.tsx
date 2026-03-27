"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getPublicApiUrl } from "@/lib/api";
import {
  AuthErrors,
  AuthMode,
  LoginValues,
  RegisterValues,
  getAuthErrorMessage,
  normalizeAuthMode,
  validateLoginValues,
  validateRegisterValues,
} from "@/lib/auth-validation";

interface AuthFormProps {
  initialMode?: string;
}

const defaultLoginValues: LoginValues = {
  email: "",
  password: "",
};

const defaultRegisterValues: RegisterValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(normalizeAuthMode(initialMode));
  const [loginValues, setLoginValues] = useState(defaultLoginValues);
  const [registerValues, setRegisterValues] = useState(defaultRegisterValues);
  const [loginErrors, setLoginErrors] = useState<AuthErrors<LoginValues>>({});
  const [registerErrors, setRegisterErrors] = useState<AuthErrors<RegisterValues>>(
    {},
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordHint = useMemo(
    () => "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
    [],
  );

  const switchMode = (nextMode: AuthMode, preserveMessage = false) => {
    setMode(nextMode);
    if (!preserveMessage) {
      setSuccessMessage("");
    }
    router.replace(`/auth?mode=${nextMode}`);
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLoginValues(loginValues);
    setLoginErrors(errors);
    setSuccessMessage("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: loginValues.email,
        password: loginValues.password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!result || result.error || result.ok === false) {
        setLoginErrors({
          form: getAuthErrorMessage(result?.error ?? "invalid credentials"),
        });
        return;
      }

      router.push(result.url ?? "/");
      router.refresh();
    } catch (error) {
      setLoginErrors({
        form: getAuthErrorMessage(
          error instanceof Error ? error.message : "unknown error",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateRegisterValues(registerValues);
    setRegisterErrors(errors);
    setSuccessMessage("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(getPublicApiUrl("/api/backend/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registerValues.email,
          password: registerValues.password,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        setRegisterErrors({ form: getAuthErrorMessage(message) });
        return;
      }

      setRegisterValues(defaultRegisterValues);
      setLoginValues((current) => ({
        ...current,
        email: registerValues.email,
      }));
      setRegisterErrors({});
      setSuccessMessage(
        "Tạo tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.",
      );
      switchMode("login", true);
    } catch (error) {
      setRegisterErrors({
        form: getAuthErrorMessage(
          error instanceof Error ? error.message : "network error",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-xl p-7 sm:p-8">
      <div className="inline-flex rounded-full border border-white/10 bg-white/6 p-1">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm transition ${
            mode === "login"
              ? "bg-white text-slate-950"
              : "text-white/68 hover:text-white"
          }`}
          onClick={() => switchMode("login")}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm transition ${
            mode === "register"
              ? "bg-white text-slate-950"
              : "text-white/68 hover:text-white"
          }`}
          onClick={() => switchMode("register")}
        >
          Đăng ký
        </button>
      </div>

      <div className="mt-6">
        <div className="section-eyebrow">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          {mode === "login"
            ? "Đăng nhập để tiếp tục với Sayvela"
            : "Đăng ký để bắt đầu workflow đa ngôn ngữ"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-white/68">
          {mode === "login"
            ? "Tiếp tục với tài khoản của bạn để truy cập phiên dịch và transcript theo thời gian thực."
            : "Tạo tài khoản mới với password mạnh để đồng bộ transcript, translation và privacy settings."}
        </p>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          {successMessage}
        </div>
      ) : null}

      {mode === "login" ? (
        <form className="mt-6 space-y-5" onSubmit={handleLoginSubmit}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={loginValues.email}
            error={loginErrors.email}
            onChange={(value) => {
              setLoginValues((current) => ({ ...current, email: value }));
              setLoginErrors((current) => ({ ...current, email: "", form: "" }));
            }}
          />

          <Field
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            value={loginValues.password}
            error={loginErrors.password}
            onChange={(value) => {
              setLoginValues((current) => ({ ...current, password: value }));
              setLoginErrors((current) => ({ ...current, password: "", form: "" }));
            }}
          />

          {loginErrors.form ? (
            <FormMessage tone="danger">{loginErrors.form}</FormMessage>
          ) : null}

          <button
            type="submit"
            className="primary-button w-full justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={handleRegisterSubmit}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={registerValues.email}
            error={registerErrors.email}
            onChange={(value) => {
              setRegisterValues((current) => ({ ...current, email: value }));
              setRegisterErrors((current) => ({ ...current, email: "", form: "" }));
            }}
          />

          <Field
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            value={registerValues.password}
            hint={passwordHint}
            error={registerErrors.password}
            onChange={(value) => {
              setRegisterValues((current) => ({ ...current, password: value }));
              setRegisterErrors((current) => ({
                ...current,
                password: "",
                confirmPassword: "",
                form: "",
              }));
            }}
          />

          <Field
            label="Xác nhận mật khẩu"
            type="password"
            autoComplete="new-password"
            value={registerValues.confirmPassword}
            error={registerErrors.confirmPassword}
            onChange={(value) => {
              setRegisterValues((current) => ({
                ...current,
                confirmPassword: value,
              }));
              setRegisterErrors((current) => ({
                ...current,
                confirmPassword: "",
                form: "",
              }));
            }}
          />

          {registerErrors.form ? (
            <FormMessage tone="danger">{registerErrors.form}</FormMessage>
          ) : null}

          <button
            type="submit"
            className="primary-button w-full justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        </form>
      )}

      <div className="mt-6 text-sm text-white/64">
        {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <button
          type="button"
          className="font-medium text-cyan-200 transition hover:text-cyan-100"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
        </button>
      </div>

      <div className="mt-4 text-sm leading-7 text-white/50">
        Bằng việc tiếp tục, bạn đồng ý với quy trình bảo vệ dữ liệu và xác thực an toàn của Sayvela.
        <span className="mx-2 text-white/25">•</span>
        <Link href="/" className="text-white/70 transition hover:text-white">
          Quay về landing page
        </Link>
      </div>
    </div>
  );
}

interface FieldProps {
  autoComplete?: string;
  error?: string;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}

function Field({
  autoComplete,
  error,
  hint,
  label,
  onChange,
  type = "text",
  value,
}: FieldProps) {
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-2 block text-sm font-medium text-white/82"
      >
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-3xl border bg-white/8 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 ${
          error
            ? "border-rose-300/50 shadow-[0_0_0_1px_rgba(251,113,133,0.35)]"
            : "border-white/12 focus:border-cyan-200/44 focus:bg-white/10"
        }`}
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-white/46">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FormMessage({
  children,
  tone,
}: {
  children: string;
  tone: "danger";
}) {
  return (
    <div
      role="alert"
      className={`rounded-3xl px-4 py-3 text-sm ${
        tone === "danger"
          ? "border border-rose-300/18 bg-rose-400/10 text-rose-100"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
