// useAuth — manages authentication state using browser-based polling flow
import { useState, useCallback, useEffect, useRef } from "react";
import {
  openBrowserLogin,
  startPolling,
  logout as logoutService,
  getStoredAuth,
  saveAuth,
} from "../services/authService";

// decode jwt payload (base64) without verification — only for display purposes
function parseJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stopPollRef = useRef(null);

  // cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (stopPollRef.current) stopPollRef.current();
    };
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError("");

    let code;
    try {
      code = await openBrowserLogin();
    } catch (e) {
      setError(e.message || "failed to open browser");
      setLoading(false);
      return;
    }

    // start polling backend for the token exchange
    const stop = startPolling(
      code,
      (token) => {
        const payload = { token, user: parseJwtPayload(token) };
        saveAuth(payload);
        setAuth(payload);
        setLoading(false);
        setError("");
        stopPollRef.current = null;
      },
      (msg) => {
        setError(msg);
        setLoading(false);
        stopPollRef.current = null;
      },
    );
    stopPollRef.current = stop;
  }, []);

  const logout = useCallback(() => {
    if (stopPollRef.current) {
      stopPollRef.current();
      stopPollRef.current = null;
    }
    logoutService();
    setAuth(null);
  }, []);

  return {
    auth,
    user: auth?.user ?? null,
    isAuthenticated: Boolean(auth?.token),
    loading,
    error,
    login,
    logout,
  };
}
