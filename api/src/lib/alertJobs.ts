/**
 * api/src/lib/alertJobs.ts
 *
 * Alert job logic extracted from the worker so the API can:
 *  1. Trigger a fire-and-forget run on user login
 *  2. Expose POST /alerts/run-job for admin-triggered runs
 *
 * Uses the API's existing DB client (api/src/db/client.ts).
 */

import { db } from "../db/client";
import * as schema from "../db/schema";
import { eq, isNull, and, lte, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const {
  inventoryLots,
  equipmentItems,
  maintenanceSchedules,
  alerts,
  households,
  policyDefaults,
  householdPolicies,
} = schema;

// ---------------------------------------------------------------------------
// Severity helpers (inlined from worker/src/lib/alertSeverity.ts)
// ---------------------------------------------------------------------------

type AlertSeverity = "upcoming" | "due" | "overdue";
type AlertUpsertResult = "inserted" | "escalated" | "unchanged";

const severityRank: Record<AlertSeverity, number> = {
  upcoming: 0,
  due: 1,
  overdue: 2,
};

function computeAlertSeverity(dueAt: Date, today: Date = new Date()): AlertSeverity {
  const due = dueAt.toISOString().slice(0, 10);
  const now = today.toISOString().slice(0, 10);
  if (due < now) return "overdue";
  if (due === now) return "due";
  return "upcoming";
}

function resolveAlertUpsertResult(
  existing: AlertSeverity | null,
  incoming: AlertSeverity
): AlertUpsertResult {
  if (!existing) return "inserted";
  if (severityRank[incoming] > severityRank[existing]) return "escalated";
  return "unchanged";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobCounters = {
  inserted: number;
  escalated: number;
  skipped: number;
  errors: number;
};

export type RunMetrics = {
  expiry: JobCounters;
  replacement: JobCounters;
  maintenance: JobCounters;
};

function emptyCounters(): JobCounters {
  return { inserted: 0, escalated: 0, skipped: 0, errors: 0 };
}

function createRunMetrics(): RunMetrics {
  return {
    expiry: emptyCounters(),
    replacement: emptyCounters(),
    maintenance: emptyCounters(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUpcomingDays(householdId: string): Promise<number> {
  const row = await db.query.householdPolicies.findFirst({
    where: and(
      eq(householdPolicies.householdId, householdId),
      eq(householdPolicies.key, "alert_upcoming_days"),
      isNull(householdPolicies.archivedAt)
    ),
  });
  if (row?.valueInt) return row.valueInt;
  const def = await db.query.policyDefaults.findFirst({
    where: eq(policyDefaults.key, "alert_upcoming_days"),
  });
  return def?.valueInt ?? 14;
}

async function upsertAlert(data: {
  householdId: string;
  severity: AlertSeverity;
  category: string;
  entityType: string;
  entityId: string;
  title: string;
  detail?: string;
  dueAt?: Date;
}): Promise<AlertUpsertResult> {
  const existing = await db.query.alerts.findFirst({
    where: and(
      eq(alerts.householdId, data.householdId),
      eq(alerts.entityType, data.entityType),
      eq(alerts.entityId, data.entityId),
      eq(alerts.isResolved, false),
      isNull(alerts.archivedAt)
    ),
  });
  if (existing) {
    const decision = resolveAlertUpsertResult(existing.severity, data.severity);
    if (decision === "escalated") {
      await db
        .update(alerts)
        .set({ severity: data.severity, updatedAt: new Date() })
        .where(eq(alerts.id, existing.id));
      return decision;
    }
    return decision;
  }
  await db.insert(alerts).values({
    id: randomUUID(),
    householdId: data.householdId,
    severity: data.severity,
    category: data.category as any,
    entityType: data.entityType,
    entityId: data.entityId,
    title: data.title,
    detail: data.detail,
    dueAt: data.dueAt,
  });
  return "inserted";
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

async function processInventoryExpiry(metrics: JobCounters) {
  console.log("[alertJobs] Processing inventory expiry...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + upcomingDays);

    const lots = await db.query.inventoryLots.findMany({
      where: and(
        eq(inventoryLots.householdId, hh.id),
        isNull(inventoryLots.archivedAt),
        isNotNull(inventoryLots.expiresAt),
        lte(inventoryLots.expiresAt, upcoming)
      ),
    });

    for (const lot of lots) {
      if (!lot.expiresAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const expStr = lot.expiresAt.toString().slice(0, 10);
        const severity = computeAlertSeverity(lot.expiresAt, today);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "expiry",
          entityType: "inventory_lot",
          entityId: lot.id,
          title: `Lot expiring: ${lot.batchRef ?? lot.id}`,
          detail: `Expires: ${expStr}`,
          dueAt: new Date(expStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        console.error("[alertJobs] Expiry alert upsert failed", { lotId: lot.id, err });
      }
    }
  }
}

async function processInventoryReplacement(metrics: JobCounters) {
  console.log("[alertJobs] Processing inventory replacement cycles...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + upcomingDays);

    const lots = await db.query.inventoryLots.findMany({
      where: and(
        eq(inventoryLots.householdId, hh.id),
        isNull(inventoryLots.archivedAt),
        isNotNull(inventoryLots.nextReplaceAt),
        lte(inventoryLots.nextReplaceAt, upcoming)
      ),
    });

    for (const lot of lots) {
      if (!lot.nextReplaceAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const repStr = lot.nextReplaceAt.toString().slice(0, 10);
        const severity = computeAlertSeverity(lot.nextReplaceAt, today);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "replacement",
          entityType: "inventory_lot",
          entityId: lot.id,
          title: `Lot replacement due: ${lot.batchRef ?? lot.id}`,
          detail: `Replace by: ${repStr}`,
          dueAt: new Date(repStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        console.error("[alertJobs] Replacement alert upsert failed", { lotId: lot.id, err });
      }
    }
  }
}

async function processMaintenanceSchedules(metrics: JobCounters) {
  console.log("[alertJobs] Processing maintenance schedules...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + upcomingDays);

    const scheduleRows = await db
      .select({
        schedule: maintenanceSchedules,
        equipment: equipmentItems,
      })
      .from(maintenanceSchedules)
      .innerJoin(equipmentItems, eq(maintenanceSchedules.equipmentItemId, equipmentItems.id))
      .where(
        and(
          eq(equipmentItems.householdId, hh.id),
          isNull(equipmentItems.archivedAt),
          isNull(maintenanceSchedules.archivedAt),
          eq(maintenanceSchedules.isActive, true),
          isNotNull(maintenanceSchedules.nextDueAt),
          lte(maintenanceSchedules.nextDueAt, upcoming)
        )
      );

    for (const { schedule: sched } of scheduleRows) {
      if (!sched.nextDueAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const dueStr = sched.nextDueAt.toString().slice(0, 10);
        const severity = computeAlertSeverity(sched.nextDueAt, today);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "maintenance",
          entityType: "maintenance_schedule",
          entityId: sched.id,
          title: `Maintenance due: ${sched.name}`,
          detail: `Due: ${dueStr}`,
          dueAt: new Date(dueStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        console.error("[alertJobs] Maintenance alert upsert failed", { scheduleId: sched.id, err });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point — returns metrics so callers can report results
// ---------------------------------------------------------------------------

export async function runAllJobs(): Promise<RunMetrics> {
  const start = Date.now();
  const metrics = createRunMetrics();
  console.log(`[alertJobs] Run started at ${new Date().toISOString()}`);
  try {
    await processInventoryExpiry(metrics.expiry);
    await processInventoryReplacement(metrics.replacement);
    await processMaintenanceSchedules(metrics.maintenance);
    console.log("[alertJobs] Run metrics", metrics);
    console.log(`[alertJobs] Run complete in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[alertJobs] Error during job run:", err);
  }
  return metrics;
}
