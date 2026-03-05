import { describe, expect, it, mock } from "bun:test";

const defaultPolicyRows = [
  { valueDecimal: "4", valueInt: null },
  { valueDecimal: null, valueInt: 2200 },
  { valueDecimal: null, valueInt: 14 },
  { valueDecimal: null, valueInt: 3 },
];

mock.module("../db/client", () => {
  let defaultsCursor = 0;
  return {
    db: {
      query: {
        scenarioPolicies: {
          findFirst: async () => null,
        },
        householdPolicies: {
          findFirst: async () => null,
        },
        policyDefaults: {
          findFirst: async () => {
            const row = defaultPolicyRows[defaultsCursor] ?? null;
            defaultsCursor += 1;
            return row;
          },
        },
        households: {
          findFirst: async () => ({
            id: "household-1",
            targetPeople: 2,
            activeProfileId: null,
            archivedAt: null,
          }),
        },
        householdPeopleProfiles: {
          findFirst: async () => null,
        },
      },
    },
  };
});

const { resolveEffectivePeople, resolvePlanningTotals } = await import("./policyEngine");

describe("policyEngine", () => {
  it("uses manual people override when provided", async () => {
    const people = await resolveEffectivePeople("household-1", "shelter_in_place", 6);
    expect(people.count).toBe(6);
    expect(people.source).toBe("manual_override");
  });

  it("computes planning totals from effective people and defaults", async () => {
    const result = await resolvePlanningTotals("household-1", "shelter_in_place");

    expect(result.people.count).toBe(2);
    expect(result.people.source).toBe("household_baseline");
    expect(result.policy.waterLitersPerPersonPerDay).toBe(4);
    expect(result.policy.caloriesKcalPerPersonPerDay).toBe(2200);
    expect(result.totals.h72.water).toBe(24);
    expect(result.totals.h72.calories).toBe(13200);
    expect(result.totals.d14.water).toBe(112);
    expect(result.totals.d30.calories).toBe(132000);
  });
});
