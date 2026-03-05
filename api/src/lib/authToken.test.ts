import { describe, expect, it } from "bun:test";
import { bearerFromHeader, issueApiToken, verifyApiToken } from "./authToken";

describe("authToken", () => {
  it("issues and verifies a valid token", () => {
    const token = issueApiToken(
      {
        sub: "user-1",
        username: "admin",
        householdId: "household-1",
        isAdmin: true,
      },
      "secret-1",
      60
    );

    const claims = verifyApiToken(token, "secret-1");
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("user-1");
    expect(claims?.isAdmin).toBe(true);
  });

  it("rejects tampered token signatures", () => {
    const token = issueApiToken(
      {
        sub: "user-1",
        username: "admin",
        householdId: "household-1",
        isAdmin: false,
      },
      "secret-1",
      60
    );

    const tampered = `${token.slice(0, -1)}x`;
    expect(verifyApiToken(tampered, "secret-1")).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = issueApiToken(
      {
        sub: "user-1",
        username: "admin",
        householdId: "household-1",
        isAdmin: false,
      },
      "secret-1",
      -1
    );

    expect(verifyApiToken(token, "secret-1")).toBeNull();
  });

  it("parses bearer auth headers", () => {
    expect(bearerFromHeader("Bearer token-123")).toBe("token-123");
    expect(bearerFromHeader("bearer token-456")).toBe("token-456");
    expect(bearerFromHeader("Basic abc")).toBeNull();
    expect(bearerFromHeader(null)).toBeNull();
  });
});
