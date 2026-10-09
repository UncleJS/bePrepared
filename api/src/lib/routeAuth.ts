import type { ApiTokenClaims } from "./authToken";
import { getRequestClaims } from "./authContext";

type MutableSet = { status?: number | string };

function claimsFromRequest(request: Request): ApiTokenClaims | null {
  const cached = getRequestClaims(request);
  if (cached === undefined) return null;
  return cached;
}

export function requireAuth(request: Request, set: MutableSet): ApiTokenClaims | null {
  const auth = claimsFromRequest(request);
  if (!auth) {
    set.status = 401;
    return null;
  }
  return auth;
}

async function householdArchivedForMember(householdId: string): Promise<boolean> {
  const { db } = await import("../db/client");
  const { households } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const row = await db.query.households.findFirst({
    where: eq(households.id, householdId),
    columns: { archivedAtUTC: true },
  });
  return !row || row.archivedAtUTC != null;
}

export async function requireHouseholdScope(
  request: Request,
  set: MutableSet,
  householdId: string
): Promise<ApiTokenClaims | null> {
  const claims = requireAuth(request, set);
  if (!claims) return null;
  if (!claims.isAdmin && claims.householdId !== householdId) {
    set.status = 403;
    return null;
  }
  if (!claims.isAdmin && (await householdArchivedForMember(householdId))) {
    set.status = 403;
    return null;
  }
  return claims;
}

export function requireAdmin(request: Request, set: MutableSet): ApiTokenClaims | null {
  const claims = requireAuth(request, set);
  if (!claims) return null;
  if (claims.isAdmin) return claims;
  set.status = 403;
  return null;
}
