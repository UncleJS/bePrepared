"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { onActiveHouseholdChange, resolveClientHouseholdId } from "@/lib/api";

type SessionUser = { householdId?: string; isAdmin?: boolean } | undefined;

export function useActiveHouseholdId() {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser;
  const resolvedHouseholdId = useMemo(() => resolveClientHouseholdId(user), [user]);
  const [householdId, setHouseholdId] = useState<string | null>(() => resolvedHouseholdId);

  useEffect(() => {
    setHouseholdId(resolvedHouseholdId);
  }, [resolvedHouseholdId]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      setHouseholdId(id || resolvedHouseholdId);
    });
  }, [resolvedHouseholdId]);

  return { householdId, status, user };
}
