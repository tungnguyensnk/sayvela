import { useCallback, useEffect, useState } from "react";
import { fetchEntitlement } from "../services/entitlementService";

export function useEntitlement({ isAuthenticated, auth, onQuotaExceeded }) {
  const [entitlement, setEntitlement] = useState(null);

  const refreshEntitlement = useCallback(async () => {
    if (!isAuthenticated) { setEntitlement(null); return null; }
    const ent = await fetchEntitlement();
    setEntitlement(ent);
    return ent;
  }, [isAuthenticated]);

  const checkQuota = useCallback(async () => {
    if (!isAuthenticated) return true;
    const ent = await refreshEntitlement();
    if (!ent) return true;
    if (ent.minutesUsed >= ent.minutesPerMonth) {
      onQuotaExceeded?.();
      return false;
    }
    return true;
  }, [isAuthenticated, onQuotaExceeded, refreshEntitlement]);

  useEffect(() => {
    refreshEntitlement().catch(() => {});
  }, [auth, refreshEntitlement]);

  return { entitlement, refreshEntitlement, checkQuota };
}
