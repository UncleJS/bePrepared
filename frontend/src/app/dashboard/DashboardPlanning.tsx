"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Droplets, Flame, Users } from "lucide-react";

type PlanningHorizon = { days: number; waterLiters: number; caloriesKcal: number };
type PlanningResult = {
  effectivePeople: number;
  effectiveWaterLPPD: number;
  effectiveCaloriesKcalPPD: number;
  horizons: Record<string, PlanningHorizon>;
};
type PlanningApiResult = {
  people?: { count?: number };
  policy?: {
    waterLitersPerPersonPerDay?: number;
    caloriesKcalPerPersonPerDay?: number;
  };
  totals?: Record<string, { water?: number; calories?: number }>;
};

function normalizePlanning(raw: PlanningResult | PlanningApiResult): PlanningResult {
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

function litersToGallons(liters: number) {
  return liters * 0.264172;
}

const HORIZON_LABELS: Record<string, string> = {
  h72h: "72 Hours",
  h14d: "14 Days",
  h30d: "30 Days",
  h90d: "90 Days",
};

function PlanningSection({ label, planning }: { label: string; planning: PlanningResult }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Planning Targets — {label}</h2>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1.5">
          <Users size={13} />
          {planning.effectivePeople} people
        </span>
        <span className="flex items-center gap-1.5">
          <Droplets size={13} className="text-blue-400" />
          {planning.effectiveWaterLPPD} L/p/day water
        </span>
        <span className="flex items-center gap-1.5">
          <Flame size={13} className="text-orange-400" />
          {planning.effectiveCaloriesKcalPPD} kcal/p/day
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(planning.horizons).map(([horizonKey, h]) => (
          <div key={horizonKey} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {HORIZON_LABELS[horizonKey] ?? horizonKey.toUpperCase()}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Droplets size={14} className="text-blue-400 shrink-0" />
              <span>
                <strong>{h.waterLiters.toLocaleString()}</strong>
                <span className="text-muted-foreground"> L</span>
                <span className="text-muted-foreground text-xs ml-1">
                  / {litersToGallons(h.waterLiters).toFixed(1)} gal
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Flame size={14} className="text-orange-400 shrink-0" />
              <span>
                <strong>{h.caloriesKcal.toLocaleString()}</strong>
                <span className="text-muted-foreground"> kcal</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPlanning({ householdId }: { householdId: string }) {
  const [sip, setSip] = useState<PlanningResult | null>(null);
  const [evac, setEvac] = useState<PlanningResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.allSettled([
      apiFetch<PlanningResult | PlanningApiResult>(`/planning/${householdId}/shelter_in_place`),
      apiFetch<PlanningResult | PlanningApiResult>(`/planning/${householdId}/evacuation`),
    ]).then(([sipRes, evacRes]) => {
      if (sipRes.status === "fulfilled") setSip(normalizePlanning(sipRes.value));
      if (evacRes.status === "fulfilled") setEvac(normalizePlanning(evacRes.value));
      setLoading(false);
    });
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted/40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sip && <PlanningSection label="Shelter in Place" planning={sip} />}
      {evac && <PlanningSection label="Evacuation" planning={evac} />}
    </div>
  );
}
