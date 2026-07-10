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
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { authFetch } from "./auth-fetch";
import {
  BILLING_PLAN_FEATURES,
  BILLING_PLAN_MINUTES,
  getUpgradeRecommendation,
  type BillingFeatures,
  type BillingPlan,
} from "@/lib/billing-catalog";

export type Entitlement = {
  plan: BillingPlan;
  minutesPerMonth: number;
  minutesUsed: number;
  minutesRemaining: number;
  usagePercentage: number;
  cycleStartedAt: string | null;
  cycleEndsAt: string | null;
  upgradeRecommendation: "lite" | "pro" | null;
  features: BillingFeatures;
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

function normalizeEntitlement(input: unknown): Entitlement {
  const value = input as Partial<Entitlement> & { plan?: BillingPlan };
  const plan = value.plan ?? "free";
  const minutesPerMonth = value.minutesPerMonth ?? BILLING_PLAN_MINUTES[plan];
  const minutesUsed = value.minutesUsed ?? 0;
  const minutesRemaining =
    value.minutesRemaining ?? Math.max(0, minutesPerMonth - minutesUsed);
  const usagePercentage =
    value.usagePercentage ??
    (minutesPerMonth <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((minutesUsed / minutesPerMonth) * 100))));

  return {
    plan,
    minutesPerMonth,
    minutesUsed,
    minutesRemaining,
    usagePercentage,
    cycleStartedAt: value.cycleStartedAt ?? null,
    cycleEndsAt: value.cycleEndsAt ?? null,
    upgradeRecommendation: value.upgradeRecommendation ?? getUpgradeRecommendation(plan),
    features: value.features ?? BILLING_PLAN_FEATURES[plan],
  };
}

export function EntitlementProvider({
  children,
  initialEntitlement,
}: {
  children: React.ReactNode;
  initialEntitlement?: (Partial<Entitlement> & { plan: BillingPlan }) | null;
}) {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const initialEntitlementRef = useRef<unknown>(initialEntitlement ?? null);
  const prevAuthenticatedRef = useRef<boolean>(false);
  const inFlightRef = useRef(false);
  const isReadyRef = useRef(false);
  const didInitRouteRefreshRef = useRef(false);
  const lastRouteRefreshAtRef = useRef(0);
  const [state, setState] = useState<EntitlementState>(() => {
    if (initialEntitlementRef.current) {
      isReadyRef.current = true;
      return { kind: "ready", entitlement: normalizeEntitlement(initialEntitlementRef.current) };
    }

    if (status === "unauthenticated") {
      return { kind: "unauthenticated" };
    }

    return { kind: "loading" };
  });

  const load = useCallback(async (options?: { keepPrevious?: boolean }) => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    if (!options?.keepPrevious) {
      setState({ kind: "loading" });
    }
    try {
      const res = await authFetch("/api/proxy/billing/entitlement", { cache: "no-store" });

      if (!res.ok) {
        if (!options?.keepPrevious) {
          setState({ kind: "error", message: "Không thể kiểm tra subscription." });
        }
        return;
      }

      const data = (await res.json()) as Entitlement;
      isReadyRef.current = true;
      setState({ kind: "ready", entitlement: normalizeEntitlement(data) });
    } catch {
      if (!options?.keepPrevious) {
        setState({ kind: "error", message: "Không thể kiểm tra subscription." });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      if (isReadyRef.current) return;
      prevAuthenticatedRef.current = false;
      initialEntitlementRef.current = null;
      isReadyRef.current = false;
      setState({ kind: "unauthenticated" });
      return;
    }

    prevAuthenticatedRef.current = true;

    if (isReadyRef.current) return;

    if (initialEntitlementRef.current) {
      isReadyRef.current = true;
      setState({
        kind: "ready",
        entitlement: normalizeEntitlement(initialEntitlementRef.current),
      });
      initialEntitlementRef.current = null;
      return;
    }

    load();
  }, [isAuthenticated, load, status]);

  useEffect(() => {
    if (!didInitRouteRefreshRef.current) {
      didInitRouteRefreshRef.current = true;
      return;
    }

    if (status !== "authenticated") return;
    if (!isReadyRef.current) return;

    const now = Date.now();
    if (now - lastRouteRefreshAtRef.current < 15_000) return;

    lastRouteRefreshAtRef.current = now;
    load({ keepPrevious: true });
  }, [load, pathname, status]);

  const refresh = useCallback(() => {
    if (status !== "authenticated") return;
    isReadyRef.current = false;
    load();
  }, [load, status]);

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
