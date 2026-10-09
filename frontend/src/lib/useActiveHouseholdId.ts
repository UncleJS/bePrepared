import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearActiveHouseholdCookie,
  onActiveHouseholdChange,
  resolveClientHouseholdId,
} from "@/lib/api";

export function useActiveHouseholdId() {
  const { state } = useAuth();
  const user = state.status === "authenticated" ? state.user : undefined;
  const isLoading = state.status === "loading";

  const resolvedHouseholdId = useMemo(() => resolveClientHouseholdId(user), [user]);

  // Cookie overrides for admins; seed from the resolved id so the first paint
  // after auth does not flash "No household in session."
  const [cookieOverride, setCookieOverride] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isAdmin) clearActiveHouseholdCookie();
  }, [user]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      if (user?.isAdmin) setCookieOverride(id || null);
      else setCookieOverride(null);
    });
  }, [user]);

  const householdId =
    user?.isAdmin && cookieOverride ? cookieOverride : resolvedHouseholdId;

  return { householdId, isLoading, user };
}
