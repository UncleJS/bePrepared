import { afterEach, describe, expect, it } from "bun:test";
import { issueApiToken, type ApiTokenClaims } from "./authToken";
import { requireAdmin, requireAuth, requireHouseholdScope } from "./routeAuth";
import { setRequestClaims } from "./authContext";

const originalAuthSecret = process.env.AUTH_SECRET;
const originalApiAuthSecret = process.env.API_AUTH_SECRET;

afterEach(() => {
  if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalAuthSecret;

  if (originalApiAuthSecret === undefined) delete process.env.API_AUTH_SECRET;
  else process.env.API_AUTH_SECRET = originalApiAuthSecret;
});

function makeToken(partial?: Partial<Pick<ApiTokenClaims, "householdId" | "isAdmin">>): string {
  return issueApiToken(
    {
      sub: "user-1",
      username: "user",
      householdId: partial?.householdId ?? "household-a",
      isAdmin: partial?.isAdmin ?? false,
    },
    "test-secret",
    60
  );
}

function makeRequest(token?: string): Request {
  return new Request("http://localhost/test", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("routeAuth", () => {
  it("returns 401 when auth token is missing", () => {
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.API_AUTH_SECRET;

    const set: { status?: number | string } = {};
    const claims = requireAuth(makeRequest(), set);

    expect(claims).toBeNull();
    expect(set.status).toBe(401);
  });

  it("accepts valid bearer token claims", () => {
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.API_AUTH_SECRET;

    const set: { status?: number | string } = {};
    const claims = requireAuth(makeRequest(makeToken()), set);

    expect(claims?.sub).toBe("user-1");
    expect(set.status).toBeUndefined();
  });

  it("enforces household scope for non-admin users", () => {
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.API_AUTH_SECRET;

    const set: { status?: number | string } = {};
    const claims = requireHouseholdScope(
      makeRequest(makeToken({ householdId: "household-a" })),
      set,
      "household-b"
    );

    expect(claims).toBeNull();
    expect(set.status).toBe(403);
  });

  it("allows admins for household-scoped routes", () => {
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.API_AUTH_SECRET;

    const set: { status?: number | string } = {};
    const claims = requireHouseholdScope(
      makeRequest(makeToken({ isAdmin: true })),
      set,
      "household-b"
    );

    expect(claims?.isAdmin).toBe(true);
    expect(set.status).toBeUndefined();
  });

  it("denies non-admin users on admin routes", () => {
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.API_AUTH_SECRET;

    const set: { status?: number | string } = {};
    const claims = requireAdmin(makeRequest(makeToken({ isAdmin: false })), set);

    expect(claims).toBeNull();
    expect(set.status).toBe(403);
  });

  it("uses request-scoped claims when available", () => {
    process.env.AUTH_SECRET = "different-secret";
    delete process.env.API_AUTH_SECRET;

    const request = makeRequest();
    setRequestClaims(request, {
      sub: "user-2",
      username: "cached",
      householdId: "household-z",
      isAdmin: true,
      iat: 1,
      exp: 9999999999,
    });

    const set: { status?: number | string } = {};
    const claims = requireAdmin(request, set);

    expect(claims?.sub).toBe("user-2");
    expect(claims?.isAdmin).toBe(true);
    expect(set.status).toBeUndefined();
  });
});
