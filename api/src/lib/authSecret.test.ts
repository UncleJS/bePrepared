import { describe, expect, it } from "bun:test";
import { assertAcceptableAuthSecret } from "./authSecret";

const STRONG = "a".repeat(32);

describe("assertAcceptableAuthSecret", () => {
  it("rejects a missing secret", () => {
    expect(() => assertAcceptableAuthSecret(undefined, "production")).toThrow(/not set/);
  });

  it("rejects short secrets and placeholders outside test", () => {
    expect(() => assertAcceptableAuthSecret("short-secret", "production")).toThrow(/32/);
    expect(() => assertAcceptableAuthSecret("replace-with-a-random-secret", "development")).toThrow(
      /placeholder/
    );
    expect(() => assertAcceptableAuthSecret("e2e-auth-secret", "production")).toThrow(
      /placeholder/
    );
    expect(() => assertAcceptableAuthSecret(STRONG, "production")).not.toThrow();
  });

  it("allows the e2e secret when NODE_ENV is test", () => {
    expect(() => assertAcceptableAuthSecret("e2e-auth-secret", "test")).not.toThrow();
  });
});
