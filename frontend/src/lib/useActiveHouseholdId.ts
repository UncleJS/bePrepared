"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  onActiveHouseholdChange,
  readActiveHouseholdCookie,
  resolveClientHouseholdId,
} from "@/lib/api";

type SessionUser = { householdId?: string; isAdmin?: boolean } | undefined;

export function useActiveHouseholdId() {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser;
  const resolvedHouseholdId = useMemo(() => resolveClientHouseholdId(user), [user]);

  // Initialise immediately from the cookie so pages can fetch before the
  // session has finished hydrating.  Falls back to the session-derived value
  // once the session loads (via the useEffect below).
  const [householdId, setHouseholdId] = useState<string | null>(
    () => readActiveHouseholdCookie() ?? resolvedHouseholdId
  );

  useEffect(() => {
    if (resolvedHouseholdId) setHouseholdId(resolvedHouseholdId);
  }, [resolvedHouseholdId]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      setHouseholdId(id || resolvedHouseholdId);
    });
  }, [resolvedHouseholdId]);

  return { householdId, status, user };
}
