"use client";

import { useSession } from "next-auth/react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertRow } from "./AlertRow";
import { useAlertActions } from "./useAlertActions";
import { useAlertsData } from "./useAlertsData";

export default function AlertsPage() {
  const { householdId, status } = useActiveHouseholdId();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin ?? false;

  const { alerts, loading, error, load } = useAlertsData(householdId);
  const actions = useAlertActions({ householdId, reload: load });

  if (status === "loading") return <LoadingSpinner label="Loading session…" />;
  if (!householdId)
    return (
      <EmptyState
        title="No household in session"
        description="Select a household to review alerts."
      />
    );
  if (loading) return <LoadingSpinner label="Loading alerts…" />;

  const active = alerts.filter((a) => !a.isResolved);
  const resolved = alerts.filter((a) => a.isResolved);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} active · {resolved.length} resolved
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={actions.runJob}
            disabled={actions.refreshing}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw size={14} className={actions.refreshing ? "animate-spin" : ""} />
            {actions.refreshing ? "Refreshing…" : "Refresh Alerts"}
          </button>
        )}
      </div>

      {error ? <ErrorBanner message={error} retry={() => void load()} /> : null}
      {actions.error ? <ErrorBanner message={actions.error} retry={() => void load()} /> : null}

      {active.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <CheckCircle2 size={32} className="text-primary mx-auto mb-2" />
          <p className="font-medium">All clear!</p>
          <p className="text-muted-foreground text-sm mt-1">No active alerts.</p>
        </div>
      )}

      <div className="space-y-2">
        {active.map((a) => (
          <AlertRow
            key={a.id}
            alert={a}
            onMarkRead={actions.markRead}
            onResolve={actions.resolve}
          />
        ))}
      </div>

      {resolved.length > 0 ? (
        <section className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resolved
            </h2>
          </div>
          {resolved.slice(0, 10).map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm opacity-70"
            >
              <p className="font-medium">{a.title}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
