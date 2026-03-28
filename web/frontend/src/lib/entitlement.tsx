"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { getPublicApiUrl } from "@/lib/api";

export type Entitlement = {
  plan: "free" | "lite" | "pro";
};

type EntitlementState =
  | { kind: "unauthenticated" }
  | { kind: "loading" }
  | { kind: "ready"; entitlement: Entitlement }
  | { kind: "error"; message: string };

type EntitlementContextValue = {
  state: EntitlementState;
  refresh: () => void;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({
  children,
  initialEntitlement,
}: {
  children: React.ReactNode;
  initialEntitlement?: Entitlement | null;
}) {
  const { data: session, status } = useSession();

  const accessToken = useMemo(() => {
    const value = (session as unknown as { accessToken?: string } | null)?.accessToken;
    return value ?? null;
  }, [session]);

  const initialEntitlementRef = useRef<Entitlement | null>(initialEntitlement ?? null);
  const tokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const [state, setState] = useState<EntitlementState>(() => {
    if (status === "authenticated" && accessToken && initialEntitlementRef.current) {
      return { kind: "ready", entitlement: initialEntitlementRef.current };
    }

    if (status === "authenticated" && accessToken) {
      return { kind: "loading" };
    }

    if (status === "loading") {
      return { kind: "loading" };
    }

    return { kind: "unauthenticated" };
  });

  const load = useCallback(async () => {
    if (!accessToken || inFlightRef.current) return;

    inFlightRef.current = true;
    setState({ kind: "loading" });
    try {
      const res = await fetch(getPublicApiUrl("/api/backend/billing/entitlement"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        setState({ kind: "error", message: "Không thể kiểm tra subscription." });
        return;
      }

      const data = (await res.json()) as Entitlement;
      setState({ kind: "ready", entitlement: data });
    } catch {
      setState({ kind: "error", message: "Không thể kiểm tra subscription." });
    } finally {
      inFlightRef.current = false;
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === "loading") {
      if (state.kind !== "ready") {
        setState({ kind: "loading" });
      }
      return;
    }

    if (status !== "authenticated" || !accessToken) {
      tokenRef.current = null;
      initialEntitlementRef.current = null;
      setState({ kind: "unauthenticated" });
      return;
    }

    if (tokenRef.current !== accessToken) {
      tokenRef.current = accessToken;
      if (initialEntitlementRef.current) {
        setState({ kind: "ready", entitlement: initialEntitlementRef.current });
        initialEntitlementRef.current = null;
        return;
      }
    }

    if (state.kind !== "ready") {
      load();
    }
  }, [accessToken, load, state.kind, status]);

  const refresh = useCallback(() => {
    if (status !== "authenticated" || !accessToken) return;
    load();
  }, [accessToken, load, status]);

  const value = useMemo<EntitlementContextValue>(() => ({ state, refresh }), [refresh, state]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const value = useContext(EntitlementContext);
  if (!value) {
    throw new Error("useEntitlement must be used within EntitlementProvider");
  }
  return value;
}
