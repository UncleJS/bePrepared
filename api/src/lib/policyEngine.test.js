import { describe, expect, it, mock } from "bun:test";

const defaultPolicyRows = [
  { key: "water_liters_per_person_per_day", valueDecimal: "4", valueInt: null },
  { key: "calories_kcal_per_person_per_day", valueDecimal: null, valueInt: 2200 },
  { key: "alert_upcoming_days", valueDecimal: null, valueInt: 14 },
  { key: "alert_grace_days", valueDecimal: null, valueInt: 3 },
];

const scenarioPolicyRows = [];
const householdPolicyRows = [];

mock.module("../db/client", () => {
  return {
    db: {
      query: {
        scenarioPolicies: {
          findFirst: async () => null,
          findMany: async () => scenarioPolicyRows,
        },
        householdPolicies: {
          findFirst: async () => null,
          findMany: async () => householdPolicyRows,
        },
        policyDefaults: {
          findFirst: async () => null,
          findMany: async () => defaultPolicyRows,
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
  it("prefers scenario policy overrides over household and defaults", async () => {
    scenarioPolicyRows.splice(
      0,
      scenarioPolicyRows.length,
      { key: "water_liters_per_person_per_day", valueDecimal: "5.5", valueInt: null },
      { key: "alert_grace_days", valueDecimal: null, valueInt: 9 }
    );
    householdPolicyRows.splice(
      0,
      householdPolicyRows.length,
      { key: "water_liters_per_person_per_day", valueDecimal: "4.5", valueInt: null },
      { key: "alert_grace_days", valueDecimal: null, valueInt: 6 }
    );

    const result = await resolvePlanningTotals("household-1", "shelter_in_place");

    expect(result.policy.waterLitersPerPersonPerDay).toBe(5.5);
    expect(result.policy.alertGraceDays).toBe(9);

    scenarioPolicyRows.splice(0, scenarioPolicyRows.length);
    householdPolicyRows.splice(0, householdPolicyRows.length);
  });

  it("falls back to household overrides when no scenario override exists", async () => {
    householdPolicyRows.splice(
      0,
      householdPolicyRows.length,
      { key: "calories_kcal_per_person_per_day", valueDecimal: null, valueInt: 2500 },
      { key: "alert_upcoming_days", valueDecimal: null, valueInt: 21 }
    );

    const result = await resolvePlanningTotals("household-1", "evacuation");

    expect(result.policy.caloriesKcalPerPersonPerDay).toBe(2500);
    expect(result.policy.alertUpcomingDays).toBe(21);

    householdPolicyRows.splice(0, householdPolicyRows.length);
  });

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
