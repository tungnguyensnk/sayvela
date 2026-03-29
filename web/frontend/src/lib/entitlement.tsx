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
  const { data: session, status } = useSession();

  const accessToken = useMemo(() => {
    const value = (session as unknown as { accessToken?: string } | null)?.accessToken;
    return value ?? null;
  }, [session]);

  const initialEntitlementRef = useRef<unknown>(initialEntitlement ?? null);
  const tokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const [state, setState] = useState<EntitlementState>(() => {
    if (status === "authenticated" && accessToken && initialEntitlementRef.current) {
      return { kind: "ready", entitlement: normalizeEntitlement(initialEntitlementRef.current) };
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
      setState({ kind: "ready", entitlement: normalizeEntitlement(data) });
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
        setState({
          kind: "ready",
          entitlement: normalizeEntitlement(initialEntitlementRef.current),
        });
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
