import { apiFetch, getSessionHouseholdId } from "@/lib/api";
import { Droplets, Flame, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type PlanningResult = {
  householdId: string;
  scenario: string;
  effectivePeople: number;
  effectiveWaterLPPD: number;
  effectiveCaloriesKcalPPD: number;
  horizons: Record<string, { days: number; waterLiters: number; caloriesKcal: number }>;
};

type PlanningApiResult = {
  people?: { count?: number };
  policy?: {
    waterLitersPerPersonPerDay?: number;
    caloriesKcalPerPersonPerDay?: number;
  };
  totals?: Record<string, { water?: number; calories?: number }>;
};

async function getPlanning(householdId: string, scenario: string): Promise<PlanningResult | null> {
  try {
    const raw = await apiFetch<PlanningResult | PlanningApiResult>(
      `/planning/${householdId}/${scenario}`
    );

    if (raw && typeof raw === "object" && "horizons" in raw && raw.horizons) {
      return raw as PlanningResult;
    }

    const normalized = raw as PlanningApiResult;
    const totals = normalized.totals ?? {};

    return {
      householdId,
      scenario,
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
  } catch {
    return null;
  }
}

const HORIZON_LABELS: Record<string, string> = {
  h72h: "72 Hours",
  h14d: "14 Days",
  h30d: "30 Days",
  h90d: "90 Days",
};

function litersToGallons(liters: number): number {
  return liters * 0.264172;
}

export default async function PlanningPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  const [sip, evac] = await Promise.all([
    getPlanning(householdId, "shelter_in_place"),
    getPlanning(householdId, "evacuation"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Planning Targets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Effective water and calorie totals across readiness horizons
        </p>
      </div>

      {[
        { label: "Shelter in Place", data: sip },
        { label: "Evacuation", data: evac },
      ].map(({ label, data }) => (
        <section key={label}>
          <h2 className="text-lg font-semibold mb-1">{label}</h2>
          {data ? (
            <>
              <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Users size={13} /> {data.effectivePeople} people
                </span>
                <span className="flex items-center gap-1">
                  <Droplets size={13} className="text-blue-400" /> {data.effectiveWaterLPPD} L/p/day
                  ({litersToGallons(data.effectiveWaterLPPD).toFixed(2)} gal/p/day)
                </span>
                <span className="flex items-center gap-1">
                  <Flame size={13} className="text-orange-400" /> {data.effectiveCaloriesKcalPPD}{" "}
                  kcal/p/day
                </span>
              </div>
              {data.horizons && Object.keys(data.horizons).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(data.horizons).map(([key, h]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-card p-4 space-y-3"
                    >
                      <p className="text-sm font-semibold text-muted-foreground">
                        {HORIZON_LABELS[key] ?? key}
                      </p>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Droplets size={11} className="text-blue-400" /> Water
                        </p>
                        <p className="text-lg font-bold">{h.waterLiters.toLocaleString()} L</p>
                        <p className="text-xs text-muted-foreground">
                          {litersToGallons(h.waterLiters).toFixed(1)} US gal
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame size={11} className="text-orange-400" /> Calories
                        </p>
                        <p className="text-lg font-bold">{h.caloriesKcal.toLocaleString()} kcal</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No planning horizon data available.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Unable to load planning data. Check API connection.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
