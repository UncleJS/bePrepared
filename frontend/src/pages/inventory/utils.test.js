import { describe, expect, it } from "bun:test";
import { asNumberOrUndef } from "./utils.ts";

describe("asNumberOrUndef (lot qty validation)", () => {
  it("parses finite quantities", () => {
    expect(asNumberOrUndef("3")).toBe(3);
    expect(asNumberOrUndef("0")).toBe(0);
    expect(asNumberOrUndef(" 1.5 ")).toBe(1.5);
  });

  it("rejects empty and NaN input", () => {
    expect(asNumberOrUndef("")).toBeUndefined();
    expect(asNumberOrUndef("   ")).toBeUndefined();
    expect(asNumberOrUndef("abc")).toBeUndefined();
  });
});
