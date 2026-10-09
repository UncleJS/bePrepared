import { describe, expect, it } from "bun:test";
import { isHttpsUrl, safeCallbackUrl } from "./safeCallbackUrl";

describe("safeCallbackUrl", () => {
  it("keeps same-app paths", () => {
    expect(safeCallbackUrl("/tasks")).toBe("/tasks");
    expect(safeCallbackUrl("/settings/users?tab=1")).toBe("/settings/users?tab=1");
  });

  it("rejects open redirects", () => {
    expect(safeCallbackUrl("//evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(safeCallbackUrl(null)).toBe("/dashboard");
  });
});

describe("isHttpsUrl", () => {
  it("allows only https URLs", () => {
    expect(isHttpsUrl("https://img.shields.io/badge/a-b-blue")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });
});
