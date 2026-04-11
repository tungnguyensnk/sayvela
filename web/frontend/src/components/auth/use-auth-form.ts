import { signIn } from "next-auth/react";
import { useMemo, useState, type FormEvent } from "react";
import { getPublicApiUrl } from "@/lib/api";
import {
  type AuthErrors,
  type AuthMode,
  type LoginValues,
  type RegisterValues,
  getAuthErrorMessage,
  normalizeAuthMode,
  validateLoginValues,
  validateRegisterValues,
} from "@/lib/auth-validation";

type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
};

const defaultLoginValues: LoginValues = {
  email: "",
  password: "",
};

const defaultRegisterValues: RegisterValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export function useAuthForm({
  initialMode,
  callbackUrl,
  desktop,
  desktopCode,
  router,
}: {
  initialMode?: string;
  callbackUrl?: string;
  desktop?: boolean;
  desktopCode?: string;
  router: RouterLike;
}) {
  const [mode, setMode] = useState<AuthMode>(normalizeAuthMode(initialMode));
  const [loginValues, setLoginValues] = useState(defaultLoginValues);
  const [registerValues, setRegisterValues] = useState(defaultRegisterValues);
  const [loginErrors, setLoginErrors] = useState<AuthErrors<LoginValues>>({});
  const [registerErrors, setRegisterErrors] = useState<AuthErrors<RegisterValues>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const safeCallbackUrl = callbackUrl?.trim() ? callbackUrl.trim() : "/";

  const passwordHint = useMemo(
    () => "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
    [],
  );

  const switchMode = (nextMode: AuthMode, preserveMessage = false) => {
    setMode(nextMode);
    if (!preserveMessage) {
      setSuccessMessage("");
    }
    const nextCallbackParam = safeCallbackUrl === "/" ? "" : `&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
    router.replace(`/auth?mode=${nextMode}${nextCallbackParam}`);
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
        callbackUrl: safeCallbackUrl,
      });

      if (!result || result.error || result.ok === false) {
        setLoginErrors({
          form: getAuthErrorMessage(result?.error ?? "invalid credentials"),
        });
        return;
      }

      // desktop flow: navigate to callback page, which will fetch the token itself
      if (desktop) {
        if (desktopCode) {
          // post token to backend under the code, desktop will poll for it
          try {
            await fetch("/api/proxy/auth/pending-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: desktopCode }),
            });
          } catch {}
          router.push(`/auth/desktop-callback?code=${encodeURIComponent(desktopCode)}`);
        } else {
          router.push("/auth/desktop-callback");
        }
        return;
      }

      const destination = safeCallbackUrl !== "/" ? safeCallbackUrl : (result.url ?? "/");
      router.push(destination);
      router.refresh();
    } catch (error) {
      setLoginErrors({
        form: getAuthErrorMessage(error instanceof Error ? error.message : "unknown error"),
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
      setSuccessMessage("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.");
      switchMode("login", true);
    } catch (error) {
      setRegisterErrors({
        form: getAuthErrorMessage(error instanceof Error ? error.message : "network error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
