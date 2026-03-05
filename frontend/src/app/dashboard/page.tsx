import { apiFetch, getSessionHouseholdId } from "@/lib/api";
import { AlertTriangle, CheckCircle2, Droplets, Flame } from "lucide-react";

type Alert = {
  id: string;
  title: string;
  detail?: string | null;
  severity: "upcoming" | "due" | "overdue";
  dueAt?: string | null;
  isResolved: boolean;
};
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

async function getData(householdId: string) {
  const [alerts, sip, evac] = await Promise.allSettled([
    apiFetch<Alert[]>(`/alerts/${householdId}?status=active`),
    apiFetch<PlanningResult | PlanningApiResult>(`/planning/${householdId}/shelter_in_place`),
    apiFetch<PlanningResult | PlanningApiResult>(`/planning/${householdId}/evacuation`),
  ]);

  const sipPlanning = sip.status === "fulfilled" ? normalizePlanning(sip.value) : null;
  const evacPlanning = evac.status === "fulfilled" ? normalizePlanning(evac.value) : null;

  return {
    alerts: alerts.status === "fulfilled" ? alerts.value : [],
    sipPlanning,
    evacPlanning,
  };
}

function litersToGallons(liters: number): number {
  return liters * 0.264172;
}

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

export default async function DashboardPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  const { alerts, sipPlanning, evacPlanning } = await getData(householdId);

  const overdue = alerts.filter((a) => a.severity === "overdue").length;
  const due = alerts.filter((a) => a.severity === "due").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Household readiness overview</p>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Overdue Alerts"
          value={overdue}
          icon={<AlertTriangle size={18} className="text-destructive" />}
          highlight={overdue > 0}
        />
        <StatCard
          label="Due Alerts"
          value={due}
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
        />
        <StatCard
          label="People (SIP)"
          value={sipPlanning?.effectivePeople ?? "—"}
          icon={<CheckCircle2 size={18} className="text-primary" />}
        />
        <StatCard
          label="Water L/p/day (SIP)"
          value={sipPlanning?.effectiveWaterLPPD ?? "—"}
          icon={<Droplets size={18} className="text-blue-400" />}
        />
        <StatCard
          label="kcal/p/day (SIP)"
          value={sipPlanning?.effectiveCaloriesKcalPPD ?? "—"}
          icon={<Flame size={18} className="text-orange-400" />}
        />
      </div>

      {/* Planning horizons */}
      {[
        { key: "sip", label: "Shelter in Place", planning: sipPlanning },
        { key: "evac", label: "Evacuation", planning: evacPlanning },
      ].map(
        ({ key, label, planning }) =>
          planning?.horizons && (
            <section key={key}>
              <h2 className="text-lg font-semibold mb-3">Planning Targets ({label})</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <span>{planning.effectivePeople} people</span>
                <span>{planning.effectiveWaterLPPD} L/p/day</span>
                <span>{planning.effectiveCaloriesKcalPPD} kcal/p/day</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(planning.horizons).map(([horizonKey, h]) => (
                  <div
                    key={`${key}-${horizonKey}`}
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {horizonKey.toUpperCase()}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Droplets size={14} className="text-blue-400" />
                      <span>
                        <strong>{h.waterLiters.toLocaleString()}</strong> L
                        <span className="text-muted-foreground">
                          {" "}
                          / {litersToGallons(h.waterLiters).toFixed(1)} gal
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Flame size={14} className="text-orange-400" />
                      <span>
                        <strong>{h.caloriesKcal.toLocaleString()}</strong> kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
      )}

      {/* Active alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
          <div className="space-y-2">
            {alerts.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border px-4 py-3 flex items-start gap-3 text-sm ${
                  a.severity === "overdue"
                    ? "border-destructive/50 bg-destructive/10"
                    : a.severity === "due"
                      ? "border-yellow-600/40 bg-yellow-900/20"
                      : "border-border bg-card"
                }`}
              >
                <AlertTriangle
                  size={15}
                  className={
                    a.severity === "overdue"
                      ? "text-destructive mt-0.5"
                      : a.severity === "due"
                        ? "text-yellow-400 mt-0.5"
                        : "text-muted-foreground mt-0.5"
                  }
                />
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.dueAt && (
                    <p className="text-xs text-muted-foreground">Due: {a.dueAt.slice(0, 10)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 flex flex-col gap-2 ${
        highlight ? "border-destructive/60" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
