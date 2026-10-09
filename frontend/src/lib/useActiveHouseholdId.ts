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

  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isAdmin) clearActiveHouseholdCookie();
    setHouseholdId(resolvedHouseholdId);
  }, [resolvedHouseholdId, user]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      if (user?.isAdmin) setHouseholdId(id || resolvedHouseholdId);
      else setHouseholdId(resolvedHouseholdId);
    });
  }, [resolvedHouseholdId, user]);

  return { householdId, isLoading, user };
}
