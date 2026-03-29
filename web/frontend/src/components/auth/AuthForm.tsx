"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/form/Field";
import { FormMessage } from "@/components/auth/form/FormMessage";
import { useAuthForm } from "@/components/auth/use-auth-form";

interface AuthFormProps {
  initialMode?: string;
  callbackUrl?: string;
}

export function AuthForm({ initialMode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const {
    mode,
    loginValues,
    registerValues,
    loginErrors,
    registerErrors,
    successMessage,
    isSubmitting,
    passwordHint,
    setLoginValues,
    setRegisterValues,
    setLoginErrors,
    setRegisterErrors,
    switchMode,
    handleLoginSubmit,
    handleRegisterSubmit,
  } = useAuthForm({
    initialMode,
    callbackUrl,
    router: {
      push: (href) => router.push(href),
      replace: (href) => router.replace(href),
      refresh: () => router.refresh(),
    },
  });

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
