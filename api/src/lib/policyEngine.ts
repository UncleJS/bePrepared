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
import { eq, and, isNull } from "drizzle-orm";

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
    h72:  { water: number; calories: number };
    d14:  { water: number; calories: number };
    d30:  { water: number; calories: number };
    d90:  { water: number; calories: number };
  };
}

const POLICY_KEYS = {
  WATER:           "water_liters_per_person_per_day",
  CALORIES:        "calories_kcal_per_person_per_day",
  ALERT_UPCOMING:  "alert_upcoming_days",
  ALERT_GRACE:     "alert_grace_days",
} as const;

const SYSTEM_DEFAULTS: Record<string, number> = {
  [POLICY_KEYS.WATER]:           4.0,
  [POLICY_KEYS.CALORIES]:        2200,
  [POLICY_KEYS.ALERT_UPCOMING]:  14,
  [POLICY_KEYS.ALERT_GRACE]:     3,
};

async function resolveKey(
  householdId: string,
  scenario: Scenario,
  key: string
): Promise<number> {
  // 1. Scenario override
  const scenarioRow = await db.query.scenarioPolicies.findFirst({
    where: and(
      eq(scenarioPolicies.householdId, householdId),
      eq(scenarioPolicies.scenario, scenario),
      eq(scenarioPolicies.key, key),
      isNull(scenarioPolicies.archivedAt)
    ),
  });
  if (scenarioRow?.valueDecimal) return Number(scenarioRow.valueDecimal);
  if (scenarioRow?.valueInt !== null && scenarioRow?.valueInt !== undefined)
    return scenarioRow.valueInt;

  // 2. Household global override
  const householdRow = await db.query.householdPolicies.findFirst({
    where: and(
      eq(householdPolicies.householdId, householdId),
      eq(householdPolicies.key, key),
      isNull(householdPolicies.archivedAt)
    ),
  });
  if (householdRow?.valueDecimal) return Number(householdRow.valueDecimal);
  if (householdRow?.valueInt !== null && householdRow?.valueInt !== undefined)
    return householdRow.valueInt;

  // 3. System default
  const defaultRow = await db.query.policyDefaults.findFirst({
    where: eq(policyDefaults.key, key),
  });
  if (defaultRow?.valueDecimal) return Number(defaultRow.valueDecimal);
  if (defaultRow?.valueInt !== null && defaultRow?.valueInt !== undefined)
    return defaultRow.valueInt;

  // 4. Hardcoded fallback
  return SYSTEM_DEFAULTS[key] ?? 0;
}

export async function resolvePolicy(
  householdId: string,
  scenario: Scenario
): Promise<EffectivePolicy> {
  const [water, calories, alertUpcoming, alertGrace] = await Promise.all([
    resolveKey(householdId, scenario, POLICY_KEYS.WATER),
    resolveKey(householdId, scenario, POLICY_KEYS.CALORIES),
    resolveKey(householdId, scenario, POLICY_KEYS.ALERT_UPCOMING),
    resolveKey(householdId, scenario, POLICY_KEYS.ALERT_GRACE),
  ]);
  return {
    waterLitersPerPersonPerDay:  water,
    caloriesKcalPerPersonPerDay: calories,
    alertUpcomingDays:           alertUpcoming,
    alertGraceDays:              alertGrace,
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
      count:       scenarioProfile.peopleCount,
      source:      "scenario_profile",
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
        count:       activeProfile.peopleCount,
        source:      "default_profile",
        profileName: activeProfile.name,
      };
    }
  }

  // 4. Household baseline
  return { count: household.targetPeople, source: "household_baseline" };
}

function calcTotals(people: number, policy: EffectivePolicy) {
  const calc = (days: number) => ({
    water:    Math.ceil(policy.waterLitersPerPersonPerDay * people * days * 100) / 100,
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
