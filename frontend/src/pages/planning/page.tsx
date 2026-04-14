import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import {
  HORIZON_LABELS,
  litersToGallons,
  normalizePlanning,
  type PlanningApiResult,
  type PlanningResult,
} from "@/lib/planning";
import { Droplets, Flame, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

async function fetchPlanning(
  householdId: string,
  scenario: string
): Promise<PlanningResult | null> {
  try {
    const raw = await apiFetch<PlanningResult | PlanningApiResult>(
      `/planning/${householdId}/${scenario}`
    );
    return normalizePlanning(raw);
  } catch {
    return null;
  }
}

export default function PlanningPage() {
  const { householdId, isLoading } = useActiveHouseholdId();
  const [sip, setSip] = useState<PlanningResult | null>(null);
  const [evac, setEvac] = useState<PlanningResult | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    setDataLoading(true);
    Promise.all([
      fetchPlanning(householdId, "shelter_in_place"),
      fetchPlanning(householdId, "evacuation"),
    ])
      .then(([s, e]) => {
        setSip(s);
        setEvac(e);
      })
      .finally(() => setDataLoading(false));
  }, [householdId]);

  if (isLoading || dataLoading) return <LoadingSpinner label="Loading planning…" />;
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

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
