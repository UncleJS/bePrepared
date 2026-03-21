export type PlanningHorizon = { days: number; waterLiters: number; caloriesKcal: number };

export type PlanningResult = {
  effectivePeople: number;
  effectiveWaterLPPD: number;
  effectiveCaloriesKcalPPD: number;
  horizons: Record<string, PlanningHorizon>;
};

export type PlanningApiResult = {
  people?: { count?: number };
  policy?: {
    waterLitersPerPersonPerDay?: number;
    caloriesKcalPerPersonPerDay?: number;
  };
  totals?: Record<string, { water?: number; calories?: number }>;
};

export const HORIZON_LABELS: Record<string, string> = {
  h72h: "72 Hours",
  h14d: "14 Days",
  h30d: "30 Days",
  h90d: "90 Days",
};

export function normalizePlanning(raw: PlanningResult | PlanningApiResult): PlanningResult {
  if (raw && typeof raw === "object" && "horizons" in raw && raw.horizons) {
    return raw as PlanningResult;
  }

  const normalized = raw as PlanningApiResult;
  const totals = normalized.totals ?? {};
  return {
    effectivePeople: normalized.people?.count ?? 0,
    effectiveWaterLPPD: normalized.policy?.waterLitersPerPersonPerDay ?? 0,
    effectiveCaloriesKcalPPD: normalized.policy?.caloriesKcalPerPersonPerDay ?? 0,
    horizons: {
      h72h: {
        days: 3,
        waterLiters: totals.h72?.water ?? 0,
        caloriesKcal: totals.h72?.calories ?? 0,
      },
      h14d: {
        days: 14,
        waterLiters: totals.d14?.water ?? 0,
        caloriesKcal: totals.d14?.calories ?? 0,
      },
      h30d: {
        days: 30,
        waterLiters: totals.d30?.water ?? 0,
        caloriesKcal: totals.d30?.calories ?? 0,
      },
      h90d: {
        days: 90,
        waterLiters: totals.d90?.water ?? 0,
        caloriesKcal: totals.d90?.calories ?? 0,
      },
    },
  };
}

export function litersToGallons(liters: number): number {
  return liters * 0.264172;
}
