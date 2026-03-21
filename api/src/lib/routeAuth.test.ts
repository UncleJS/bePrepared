import { describe, expect, it } from "bun:test";
import type { ApiTokenClaims } from "./authToken";
import { requireAdmin, requireAuth, requireHouseholdScope } from "./routeAuth";
import { setRequestClaims } from "./authContext";

function makeClaims(
  partial?: Partial<Pick<ApiTokenClaims, "householdId" | "isAdmin" | "sub" | "username">>
): ApiTokenClaims {
  return {
    sub: partial?.sub ?? "user-1",
    username: partial?.username ?? "user",
    householdId: partial?.householdId ?? "household-a",
    isAdmin: partial?.isAdmin ?? false,
    iat: 1,
    exp: 9999999999,
  };
}

function makeRequest(claims?: ApiTokenClaims | null): Request {
  const request = new Request("http://localhost/test");
  if (claims !== undefined) setRequestClaims(request, claims);
  return request;
}

describe("routeAuth", () => {
  it("returns 401 when request claims are missing", () => {
    const set: { status?: number | string } = {};
    const claims = requireAuth(makeRequest(), set);

    expect(claims).toBeNull();
    expect(set.status).toBe(401);
  });

  it("accepts request-scoped claims", () => {
    const set: { status?: number | string } = {};
    const claims = requireAuth(makeRequest(makeClaims()), set);

    expect(claims?.sub).toBe("user-1");
    expect(set.status).toBeUndefined();
  });

  it("enforces household scope for non-admin users", () => {
    const set: { status?: number | string } = {};
    const claims = requireHouseholdScope(
      makeRequest(makeClaims({ householdId: "household-a" })),
      set,
      "household-b"
    );

    expect(claims).toBeNull();
    expect(set.status).toBe(403);
  });

  it("allows admins for household-scoped routes", () => {
    const set: { status?: number | string } = {};
    const claims = requireHouseholdScope(
      makeRequest(makeClaims({ isAdmin: true })),
      set,
      "household-b"
    );

    expect(claims?.isAdmin).toBe(true);
    expect(set.status).toBeUndefined();
  });

  it("denies non-admin users on admin routes", () => {
    const set: { status?: number | string } = {};
    const claims = requireAdmin(makeRequest(makeClaims({ isAdmin: false })), set);

    expect(claims).toBeNull();
    expect(set.status).toBe(403);
  });

  it("uses request-scoped claims when available", () => {
    const request = makeRequest();
    setRequestClaims(
      request,
      makeClaims({ sub: "user-2", username: "cached", householdId: "household-z", isAdmin: true })
    );

    const set: { status?: number | string } = {};
    const claims = requireAdmin(request, set);

    expect(claims?.sub).toBe("user-2");
    expect(claims?.isAdmin).toBe(true);
    expect(set.status).toBeUndefined();
  });
});
