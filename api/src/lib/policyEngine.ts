/**
 * lib/policyEngine.ts
 *
 * Resolves effective planning targets using the three-tier precedence:
 *   1) household + scenario override  (scenario_policies)
 *   2) household global override      (household_policies)
 *   3) system defaults                (policy_defaults)
 *
 * Also resolves effective people count:
 *   1) manual session override (passed in)
 *   2) active scenario-bound profile (auto-switch)
 *   3) active household default profile
 *   4) households.target_people
 */

import { db } from "../db/client";
import {
  policyDefaults,
  householdPolicies,
  scenarioPolicies,
  households,
  householdPeopleProfiles,
} from "../db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

export type Scenario = "shelter_in_place" | "evacuation";

export interface EffectivePolicy {
  waterLitersPerPersonPerDay: number;
  caloriesKcalPerPersonPerDay: number;
  alertUpcomingDays: number;
  alertGraceDays: number;
}

export interface EffectivePeople {
  count: number;
  source: "manual_override" | "scenario_profile" | "default_profile" | "household_baseline";
  profileName?: string;
}

export interface PlanningTotals {
  people: EffectivePeople;
  policy: EffectivePolicy;
  totals: {
    h72: { water: number; calories: number };
    d14: { water: number; calories: number };
    d30: { water: number; calories: number };
    d90: { water: number; calories: number };
  };
}

const POLICY_KEYS = {
  WATER: "water_liters_per_person_per_day",
  CALORIES: "calories_kcal_per_person_per_day",
  ALERT_UPCOMING: "alert_upcoming_days",
  ALERT_GRACE: "alert_grace_days",
} as const;

const SYSTEM_DEFAULTS: Record<string, number> = {
  [POLICY_KEYS.WATER]: 4.0,
  [POLICY_KEYS.CALORIES]: 2200,
  [POLICY_KEYS.ALERT_UPCOMING]: 14,
  [POLICY_KEYS.ALERT_GRACE]: 3,
};

const ALL_KEYS = [
  POLICY_KEYS.WATER,
  POLICY_KEYS.CALORIES,
  POLICY_KEYS.ALERT_UPCOMING,
  POLICY_KEYS.ALERT_GRACE,
] as const;

type PolicyKey = (typeof ALL_KEYS)[number];

/**
 * Resolve all four policy values in 3 parallel DB round-trips instead of up
 * to 12 sequential ones (old: 4 keys × 3 sequential queries each).
 *
 * Strategy:
 *   1. Fetch all matching scenarioPolicies rows in one query   (inArray key)
 *   2. Fetch all matching householdPolicies rows in one query  (inArray key)
 *   3. Fetch all matching policyDefaults rows in one query     (inArray key)
 * Then resolve each key in-memory using the three-tier precedence.
 */
export async function resolvePolicy(
  householdId: string,
  scenario: Scenario
): Promise<EffectivePolicy> {
  const keys = [...ALL_KEYS];

  const [scenarioRows, householdRows, defaultRows] = await Promise.all([
    db.query.scenarioPolicies.findMany({
      where: and(
        eq(scenarioPolicies.householdId, householdId),
        eq(scenarioPolicies.scenario, scenario),
        inArray(scenarioPolicies.key, keys),
        isNull(scenarioPolicies.archivedAt)
      ),
    }),
    db.query.householdPolicies.findMany({
      where: and(
        eq(householdPolicies.householdId, householdId),
        inArray(householdPolicies.key, keys),
        isNull(householdPolicies.archivedAt)
      ),
    }),
    db.query.policyDefaults.findMany({
      where: inArray(policyDefaults.key, keys),
    }),
  ]);

  const scenarioMap = new Map(scenarioRows.map((r) => [r.key, r]));
  const householdMap = new Map(householdRows.map((r) => [r.key, r]));
  const defaultMap = new Map(defaultRows.map((r) => [r.key, r]));

  function resolveKey(key: PolicyKey): number {
    // 1. Scenario override
    const sRow = scenarioMap.get(key);
    if (sRow?.valueDecimal) return Number(sRow.valueDecimal);
    if (sRow?.valueInt !== null && sRow?.valueInt !== undefined) return sRow.valueInt;

    // 2. Household global override
    const hRow = householdMap.get(key);
    if (hRow?.valueDecimal) return Number(hRow.valueDecimal);
    if (hRow?.valueInt !== null && hRow?.valueInt !== undefined) return hRow.valueInt;

    // 3. System default from DB
    const dRow = defaultMap.get(key);
    if (dRow?.valueDecimal) return Number(dRow.valueDecimal);
    if (dRow?.valueInt !== null && dRow?.valueInt !== undefined) return dRow.valueInt;

    // 4. Hardcoded fallback
    return SYSTEM_DEFAULTS[key] ?? 0;
  }

  return {
    waterLitersPerPersonPerDay: resolveKey(POLICY_KEYS.WATER),
    caloriesKcalPerPersonPerDay: resolveKey(POLICY_KEYS.CALORIES),
    alertUpcomingDays: resolveKey(POLICY_KEYS.ALERT_UPCOMING),
    alertGraceDays: resolveKey(POLICY_KEYS.ALERT_GRACE),
  };
}

export async function resolveEffectivePeople(
  householdId: string,
  scenario: Scenario,
  manualOverride?: number
): Promise<EffectivePeople> {
  // 1. Manual override
  if (manualOverride && manualOverride > 0) {
    return { count: manualOverride, source: "manual_override" };
  }

  const household = await db.query.households.findFirst({
    where: and(eq(households.id, householdId), isNull(households.archivedAt)),
  });
  if (!household) throw new Error(`Household ${householdId} not found`);

  // 2. Scenario-bound profile (auto-switch)
  const scenarioProfile = await db.query.householdPeopleProfiles.findFirst({
    where: and(
      eq(householdPeopleProfiles.householdId, householdId),
      eq(householdPeopleProfiles.scenarioBound, scenario),
      isNull(householdPeopleProfiles.archivedAt)
    ),
  });
  if (scenarioProfile) {
    return {
      count: scenarioProfile.peopleCount,
      source: "scenario_profile",
      profileName: scenarioProfile.name,
    };
  }

  // 3. Default profile
  if (household.activeProfileId) {
    const activeProfile = await db.query.householdPeopleProfiles.findFirst({
      where: and(
        eq(householdPeopleProfiles.id, household.activeProfileId),
        isNull(householdPeopleProfiles.archivedAt)
      ),
    });
    if (activeProfile) {
      return {
        count: activeProfile.peopleCount,
        source: "default_profile",
        profileName: activeProfile.name,
      };
    }
  }

  // 4. Household baseline
  return { count: household.targetPeople, source: "household_baseline" };
}

function calcTotals(people: number, policy: EffectivePolicy) {
  const calc = (days: number) => ({
    water: Math.ceil(policy.waterLitersPerPersonPerDay * people * days * 100) / 100,
    calories: Math.ceil(policy.caloriesKcalPerPersonPerDay * people * days),
  });
  return { h72: calc(3), d14: calc(14), d30: calc(30), d90: calc(90) };
}

export async function resolvePlanningTotals(
  householdId: string,
  scenario: Scenario,
  manualPeopleOverride?: number
): Promise<PlanningTotals> {
  const [people, policy] = await Promise.all([
    resolveEffectivePeople(householdId, scenario, manualPeopleOverride),
    resolvePolicy(householdId, scenario),
  ]);
  return { people, policy, totals: calcTotals(people.count, policy) };
}
