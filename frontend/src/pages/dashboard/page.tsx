import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import DashboardAlerts from "./DashboardAlerts";
import DashboardPlanning from "./DashboardPlanning";
import DashboardReadinessCard from "./DashboardReadinessCard";
import DashboardTasks from "./DashboardTasks";

export default function DashboardPage() {
  const { householdId, isLoading } = useActiveHouseholdId();

  if (isLoading) return <LoadingSpinner label="Loading session…" />;
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

      <DashboardPlanning householdId={householdId} />

      <DashboardAlerts householdId={householdId} />
    </div>
  );
}
