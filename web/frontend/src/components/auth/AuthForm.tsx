"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/form/Field";
import { FormMessage } from "@/components/auth/form/FormMessage";
import { useAuthForm } from "@/components/auth/use-auth-form";

interface AuthFormProps {
  initialMode?: string;
  callbackUrl?: string;
  desktop?: boolean;
  desktopCode?: string;
}

export function AuthForm({ initialMode, callbackUrl, desktop, desktopCode }: AuthFormProps) {
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
    desktop,
    desktopCode,
    router: {
      push: (href) => router.push(href),
      replace: (href) => router.replace(href),
      refresh: () => router.refresh(),
    },
  });

  return (
    <div className="glass-panel w-full max-w-xl p-7 sm:p-8">
      {desktop ? (
        <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
          Sign in from the Sayvela desktop app. You will automatically return to the app after signing in.
        </div>
      ) : null}
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
          Sign in
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
          Sign up
        </button>
      </div>

      <div className="mt-6">
        <div className="section-eyebrow">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          {mode === "login"
            ? "Sign in to continue with Sayvela"
            : "Sign up to start your multilingual workflow"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-white/68">
          {mode === "login"
            ? "Continue with your account to access real-time translation and transcripts."
            : "Create an account with a strong password to sync transcripts, translations, and privacy settings."}
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
            label="Password"
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
            {isSubmitting ? "Signing in..." : "Sign in"}
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
            label="Password"
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
            label="Confirm password"
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      <div className="mt-6 text-sm text-white/64">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-cyan-200 transition hover:text-cyan-100"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Sign up now" : "Sign in"}
        </button>
      </div>

      <div className="mt-4 text-sm leading-7 text-white/50">
        By continuing, you agree to Sayvela&apos;s data protection and secure authentication practices.
        <span className="mx-2 text-white/25">•</span>
        <Link href="/" className="text-white/70 transition hover:text-white">
          Back to the landing page
        </Link>
      </div>
    </div>
  );
}
