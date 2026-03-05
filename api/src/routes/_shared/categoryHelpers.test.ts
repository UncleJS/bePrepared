import { describe, expect, it } from "bun:test";
import {
  isAllowedCategoryForHousehold,
  isCustomCategoryForHousehold,
  requireAllowedCategoryForHousehold,
  requireCustomCategoryForHousehold,
  validateCategoryReplacementInput,
} from "./categoryHelpers";

const base = {
  householdId: "house-1",
  isSystem: false,
  archivedAt: null,
};

describe("categoryHelpers", () => {
  it("checks allowed and custom access", () => {
    expect(isAllowedCategoryForHousehold(base, "house-1")).toBe(true);
    expect(isCustomCategoryForHousehold(base, "house-1")).toBe(true);
    expect(
      isAllowedCategoryForHousehold({ ...base, isSystem: true, householdId: null }, "house-2")
    ).toBe(true);
    expect(isCustomCategoryForHousehold({ ...base, isSystem: true }, "house-1")).toBe(false);
  });

  it("applies status codes when requiring access", () => {
    const setA: { status?: number | string } = {};
    const okA = requireAllowedCategoryForHousehold(null, "house-1", setA);
    expect(okA).toBe(false);
    expect(setA.status).toBe(400);

    const setB: { status?: number | string } = {};
    const okB = requireCustomCategoryForHousehold({ ...base, isSystem: true }, "house-1", setB);
    expect(okB).toBe(false);
    expect(setB.status).toBe(404);
  });

  it("validates replacement category input", () => {
    const set: { status?: number | string } = {};
    expect(validateCategoryReplacementInput(undefined, "cat-1", set)).toEqual({ ok: true });
    expect(validateCategoryReplacementInput("cat-1", "cat-1", set)).toEqual({
      ok: false,
      error: "replacementCategoryId must be different from archived category",
    });
    expect(set.status).toBe(400);
  });
});
