import { bearerFromHeader, verifyApiToken, type ApiTokenClaims } from "./authToken";

type MutableSet = { status?: number | string };

function claimsFromRequest(request: Request): ApiTokenClaims | null {
  const secret = process.env.API_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;
  const token = bearerFromHeader(request.headers.get("authorization"));
  if (!token) return null;
  return verifyApiToken(token, secret);
}

export function requireAuth(request: Request, set: MutableSet): ApiTokenClaims | null {
  const auth = claimsFromRequest(request);
  if (!auth) {
    set.status = 401;
    return null;
  }
  return auth;
}

export function requireHouseholdScope(
  request: Request,
  set: MutableSet,
  householdId: string
): ApiTokenClaims | null {
  const claims = requireAuth(request, set);
  if (!claims) return null;
  if (claims.isAdmin || claims.householdId === householdId) return claims;
  set.status = 403;
  return null;
}

export function requireAdmin(request: Request, set: MutableSet): ApiTokenClaims | null {
  const claims = requireAuth(request, set);
  if (!claims) return null;
  if (claims.isAdmin) return claims;
  set.status = 403;
  return null;
}
