import { getSessionHouseholdId } from "@/lib/api";
import DashboardAlerts from "./DashboardAlerts";
import DashboardPlanning from "./DashboardPlanning";
import DashboardReadinessCard from "./DashboardReadinessCard";
import DashboardTasks from "./DashboardTasks";

export default async function DashboardPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Household readiness overview</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardReadinessCard householdId={householdId} />
        <DashboardTasks householdId={householdId} />
      </div>

      {/* Planning horizons — client component so auth works reliably via BFF */}
      <DashboardPlanning householdId={householdId} />

      {/* Alerts section — client component so auth works reliably via BFF */}
      <DashboardAlerts householdId={householdId} />
    </div>
  );
}
