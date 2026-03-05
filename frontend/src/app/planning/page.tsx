import { apiFetch, HOUSEHOLD_ID } from "@/lib/api";
import { Droplets, Flame, Users } from "lucide-react";

type PlanningResult = {
  householdId: string;
  scenario: string;
  effectivePeople: number;
  effectiveWaterLPPD: number;
  effectiveCaloriesKcalPPD: number;
  horizons: Record<string, { days: number; waterLiters: number; caloriesKcal: number }>;
};

async function getPlanning(scenario: string): Promise<PlanningResult | null> {
  try {
    return await apiFetch<PlanningResult>(`/planning/${HOUSEHOLD_ID}/${scenario}`);
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

export default async function PlanningPage() {
  const [sip, evac] = await Promise.all([
    getPlanning("shelter_in_place"),
    getPlanning("evacuation"),
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
                </span>
                <span className="flex items-center gap-1">
                  <Flame size={13} className="text-orange-400" /> {data.effectiveCaloriesKcalPPD} kcal/p/day
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.horizons).map(([key, h]) => (
                  <div key={key} className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {HORIZON_LABELS[key] ?? key}
                    </p>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Droplets size={11} className="text-blue-400" /> Water
                      </p>
                      <p className="text-lg font-bold">{h.waterLiters.toLocaleString()} L</p>
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
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Unable to load planning data. Check API connection.</p>
          )}
        </section>
      ))}
    </div>
  );
}
