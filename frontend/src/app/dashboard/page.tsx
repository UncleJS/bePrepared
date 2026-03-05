import { apiFetch, fmtTs, HOUSEHOLD_ID } from "@/lib/api";
import { AlertTriangle, CheckCircle2, Package, Wrench, Droplets, Flame } from "lucide-react";

type Alert = { id: string; title: string; severity: string; alertType: string; dueDate?: string; status: string };
type PlanningHorizon = { days: number; waterLiters: number; caloriesKcal: number };
type PlanningResult = {
  effectivePeople: number;
  effectiveWaterLPPD: number;
  effectiveCaloriesKcalPPD: number;
  horizons: Record<string, PlanningHorizon>;
};

async function getData() {
  const [alerts, planning] = await Promise.allSettled([
    apiFetch<Alert[]>(`/alerts/${HOUSEHOLD_ID}?status=active`),
    apiFetch<PlanningResult>(`/planning/${HOUSEHOLD_ID}/shelter_in_place`),
  ]);

  return {
    alerts:   alerts.status   === "fulfilled" ? alerts.value   : [],
    planning: planning.status === "fulfilled" ? planning.value : null,
  };
}

export default async function DashboardPage() {
  const { alerts, planning } = await getData();

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning  = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Household readiness overview</p>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Critical Alerts"
          value={critical}
          icon={<AlertTriangle size={18} className="text-destructive" />}
          highlight={critical > 0}
        />
        <StatCard
          label="Warnings"
          value={warning}
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
        />
        <StatCard
          label="People (SIP)"
          value={planning?.effectivePeople ?? "—"}
          icon={<CheckCircle2 size={18} className="text-primary" />}
        />
        <StatCard
          label="Water L/p/day"
          value={planning?.effectiveWaterLPPD ?? "—"}
          icon={<Droplets size={18} className="text-blue-400" />}
        />
      </div>

      {/* Planning horizons */}
      {planning && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Planning Targets (Shelter in Place)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(planning.horizons).map(([key, h]) => (
              <div key={key} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{key.toUpperCase()}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Droplets size={14} className="text-blue-400" />
                  <span><strong>{h.waterLiters.toLocaleString()}</strong> L water</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Flame size={14} className="text-orange-400" />
                  <span><strong>{h.caloriesKcal.toLocaleString()}</strong> kcal</span>
                </div>
              </div>
            ))}
          </div>
        </section>
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
                  a.severity === "critical"
                    ? "border-destructive/50 bg-destructive/10"
                    : a.severity === "warning"
                    ? "border-yellow-600/40 bg-yellow-900/20"
                    : "border-border bg-card"
                }`}
              >
                <AlertTriangle
                  size={15}
                  className={
                    a.severity === "critical"
                      ? "text-destructive mt-0.5"
                      : a.severity === "warning"
                      ? "text-yellow-400 mt-0.5"
                      : "text-muted-foreground mt-0.5"
                  }
                />
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.dueDate && (
                    <p className="text-xs text-muted-foreground">Due: {a.dueDate}</p>
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
