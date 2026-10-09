import { createHmac } from "crypto";
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
        credentialsVersion: 1,
      },
      "secret-1",
      60
    );

    const claims = verifyApiToken(token, "secret-1");
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("user-1");
    expect(claims?.isAdmin).toBe(true);
    expect(claims?.credentialsVersion).toBe(1);
  });

  it("rejects tokens that omit credentialsVersion", () => {
    const token = issueApiToken(
      {
        sub: "user-1",
        username: "admin",
        householdId: "household-1",
        isAdmin: false,
        credentialsVersion: 1,
      },
      "secret-1",
      60
    );
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    delete payload.credentialsVersion;
    const header = token.split(".")[0];
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", "secret-1")
      .update(`${header}.${body}`)
      .digest("base64url");
    expect(verifyApiToken(`${header}.${body}.${signature}`, "secret-1")).toBeNull();
  });

  it("rejects tampered token signatures", () => {
    const token = issueApiToken(
      {
        sub: "user-1",
        username: "admin",
        householdId: "household-1",
        isAdmin: false,
        credentialsVersion: 1,
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
        credentialsVersion: 1,
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
