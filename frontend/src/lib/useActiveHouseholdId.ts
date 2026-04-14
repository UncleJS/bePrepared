import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  onActiveHouseholdChange,
  readActiveHouseholdCookie,
  resolveClientHouseholdId,
} from "@/lib/api";

export function useActiveHouseholdId() {
  const { state } = useAuth();
  const user = state.status === "authenticated" ? state.user : undefined;
  const isLoading = state.status === "loading";

  const resolvedHouseholdId = useMemo(() => resolveClientHouseholdId(user), [user]);

  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    setHouseholdId(readActiveHouseholdCookie() ?? resolvedHouseholdId);
  }, [resolvedHouseholdId]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      setHouseholdId(id || resolvedHouseholdId);
    });
  }, [resolvedHouseholdId]);

  return { householdId, isLoading, user };
}
