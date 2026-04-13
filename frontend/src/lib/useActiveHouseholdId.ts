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

  // Start null so server and client render the same initial HTML (hydration
  // safe). After mount, pick up the cookie immediately so pages can fetch
  // before the session finishes hydrating; then track the session value.
  // readActiveHouseholdCookie() uses document.cookie — browser-only.
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    setHouseholdId(readActiveHouseholdCookie() ?? resolvedHouseholdId);
  }, [resolvedHouseholdId]);

  useEffect(() => {
    return onActiveHouseholdChange((id) => {
      setHouseholdId(id || resolvedHouseholdId);
    });
  }, [resolvedHouseholdId]);

  return { householdId, status, user };
}
