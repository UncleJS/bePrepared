import { describe, expect, it } from "bun:test";
import { shouldRedirectToLogin } from "./authGuard";

describe("authGuard", () => {
  it("redirects when auth is missing", () => {
    expect(shouldRedirectToLogin(undefined)).toBe(true);
    expect(shouldRedirectToLogin(null)).toBe(true);
  });

  it("redirects when user is absent", () => {
    expect(shouldRedirectToLogin({})).toBe(true);
  });

  it("allows when user is present", () => {
    expect(shouldRedirectToLogin({ user: { id: "u1" } })).toBe(false);
  });
});
