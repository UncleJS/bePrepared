import { describe, expect, it } from "bun:test";
import { isProtectedPath } from "./routeProtection";

describe("routeProtection", () => {
  it("marks app routes as protected", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/tasks")).toBe(true);
    expect(isProtectedPath("/settings/inventory-categories")).toBe(true);
  });

  it("marks public auth/static routes as unprotected", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/api/auth/session")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/_next/static/chunk.js")).toBe(false);
    expect(isProtectedPath("/_next/image")).toBe(false);
    expect(isProtectedPath("/favicon.ico")).toBe(false);
  });
});
