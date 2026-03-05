"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { onActiveHouseholdChange, resolveClientHouseholdId } from "@/lib/api";

type SessionUser = { householdId?: string; isAdmin?: boolean } | undefined;

export function useActiveHouseholdId() {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser;
  const [householdId, setHouseholdId] = useState<string | null>(() => resolveClientHouseholdId(user));

  useEffect(() => {
    setHouseholdId(resolveClientHouseholdId(user));
  }, [user?.householdId, user?.isAdmin]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      setHouseholdId(id || resolveClientHouseholdId(user));
    });
  }, [user?.householdId, user?.isAdmin]);

  return { householdId, status, user };
}
