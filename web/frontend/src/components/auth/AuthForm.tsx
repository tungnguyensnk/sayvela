"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/form/Field";
import { FormMessage } from "@/components/auth/form/FormMessage";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { useI18n } from "@/i18n/client";
import type { ValidationKey } from "@/lib/auth-validation";

interface AuthFormProps {
  initialMode?: string;
  callbackUrl?: string;
  desktop?: boolean;
  desktopCode?: string;
}

export function AuthForm({ initialMode, callbackUrl, desktop, desktopCode }: AuthFormProps) {
  const router = useRouter();
  const { m } = useI18n();
  const t = m.auth;
  const {
    mode,
    loginValues,
    registerValues,
    loginErrors,
    registerErrors,
    registered,
    isSubmitting,
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

  const say = (key?: ValidationKey) => (key ? t.validation[key] : undefined);

  const tabClass = (active: boolean) =>
    `flex-1 rounded-sm px-4 py-1.5 font-display text-sm font-medium transition-colors ${
      active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
    }`;

  return (
    <div className="card w-full max-w-md p-6 sm:p-7">
      {desktop ? (
        <p className="mb-5 border border-ai-line bg-ai-soft px-3 py-2.5 text-sm text-ai">
          {t.desktopNotice}
        </p>
      ) : null}

      <div
        role="group"
        aria-label={t.modeGroup}
        className="flex border border-line bg-raised p-0.5"
      >
        <button
          type="button"
          className={tabClass(mode === "login")}
          aria-pressed={mode === "login"}
          onClick={() => switchMode("login")}
        >
          {t.tabSignIn}
        </button>
        <button
          type="button"
          className={tabClass(mode === "register")}
          aria-pressed={mode === "register"}
          onClick={() => switchMode("register")}
        >
          {t.tabSignUp}
        </button>
      </div>

      <div className="mt-6">
        <h1 className="text-2xl">{mode === "login" ? t.signInTitle : t.signUpTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "login" ? t.signInLede : t.signUpLede}
        </p>
      </div>

      {registered ? (
        <p
          role="status"
          className="mt-5 border border-ok/30 bg-ok-soft px-3 py-2.5 text-sm text-ok"
        >
          {t.registered}
        </p>
      ) : null}

      {mode === "login" ? (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleLoginSubmit}>
          <Field
            label={t.email}
            type="email"
            autoComplete="email"
            value={loginValues.email}
            error={say(loginErrors.email)}
            onChange={(value) => {
              setLoginValues((current) => ({ ...current, email: value }));
              setLoginErrors((current) => ({
                ...current,
                email: undefined,
                form: undefined,
              }));
            }}
          />

          <Field
            label={t.password}
            type="password"
            autoComplete="current-password"
            value={loginValues.password}
            error={say(loginErrors.password)}
            onChange={(value) => {
              setLoginValues((current) => ({ ...current, password: value }));
              setLoginErrors((current) => ({
                ...current,
                password: undefined,
                form: undefined,
              }));
            }}
          />

          {loginErrors.form ? (
            <FormMessage tone="danger">{t.validation[loginErrors.form]}</FormMessage>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block mt-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.submitSignInBusy : t.submitSignIn}
          </button>
        </form>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleRegisterSubmit}>
          <Field
            label={t.email}
            type="email"
            autoComplete="email"
            value={registerValues.email}
            error={say(registerErrors.email)}
            onChange={(value) => {
              setRegisterValues((current) => ({ ...current, email: value }));
              setRegisterErrors((current) => ({
                ...current,
                email: undefined,
                form: undefined,
              }));
            }}
          />

          <Field
            label={t.password}
            type="password"
            autoComplete="new-password"
            value={registerValues.password}
            hint={t.passwordHint}
            error={say(registerErrors.password)}
            onChange={(value) => {
              setRegisterValues((current) => ({ ...current, password: value }));
              setRegisterErrors((current) => ({
                ...current,
                password: undefined,
                confirmPassword: undefined,
                form: undefined,
              }));
            }}
          />

          <Field
            label={t.confirmPassword}
            type="password"
            autoComplete="new-password"
            value={registerValues.confirmPassword}
            error={say(registerErrors.confirmPassword)}
            onChange={(value) => {
              setRegisterValues((current) => ({ ...current, confirmPassword: value }));
              setRegisterErrors((current) => ({
                ...current,
                confirmPassword: undefined,
                form: undefined,
              }));
            }}
          />

          {registerErrors.form ? (
            <FormMessage tone="danger">{t.validation[registerErrors.form]}</FormMessage>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block mt-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.submitSignUpBusy : t.submitSignUp}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted">
        {mode === "login" ? t.noAccount : t.hasAccount}{" "}
        <button
          type="button"
          className="font-display font-semibold text-accent hover:underline"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t.switchToSignUp : t.switchToSignIn}
        </button>
      </p>

      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-faint">
        {t.legal}{" "}
        <Link href="/" className="text-muted hover:text-ink">
          {t.backHome}
        </Link>
      </p>
    </div>
  );
}
