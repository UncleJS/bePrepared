/**
 * api/src/lib/alertJobs.ts
 *
 * Alert job logic extracted from the worker so the API can:
 *  1. Trigger a fire-and-forget run on user login
 *  2. Expose POST /admin/alerts/run-job for admin-triggered runs
 *
 * Uses the API's existing DB client (api/src/db/client.ts).
 */

import { db } from "../db/client";
import {
  computeAlertSeverity,
  resolveAlertUpsertResult,
  type AlertSeverity,
  type AlertUpsertResult,
} from "@beprepared/shared/alertSeverity";
import { logger } from "@beprepared/shared/logger";
import * as schema from "../db/schema";
import { eq, isNull, and, lte, isNotNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const {
  inventoryLots,
  inventoryItems,
  equipmentItems,
  maintenanceSchedules,
  alerts,
  households,
  policyDefaults,
  householdPolicies,
} = schema;

// Matches the DB enum in schema/alerts.ts
type AlertCategory = "expiry" | "replacement" | "maintenance" | "low_stock" | "task_due" | "policy";

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

type AlertPolicyForHousehold = {
  upcomingDays: number;
  graceDays: number;
};

/**
 * Fetch both alert policy values for a household in two parallel DB round-trips:
 *   1. All matching householdPolicies rows for the two keys at once (inArray)
 *   2. All matching policyDefaults rows for the two keys at once (inArray)
 *
 * Falls back to hardcoded defaults if neither layer has a value.
 */
async function getAlertPolicyForHousehold(householdId: string): Promise<AlertPolicyForHousehold> {
  const KEYS = ["alert_upcoming_days", "alert_grace_days"] as const;

  const [hhRows, defaultRows] = await Promise.all([
    db.query.householdPolicies.findMany({
      where: and(
        eq(householdPolicies.householdId, householdId),
        inArray(householdPolicies.key, [...KEYS]),
        isNull(householdPolicies.archivedAt)
      ),
    }),
    db.query.policyDefaults.findMany({
      where: inArray(policyDefaults.key, [...KEYS]),
    }),
  ]);

  const hhMap = new Map(hhRows.map((r) => [r.key, r]));
  const defMap = new Map(defaultRows.map((r) => [r.key, r]));

  function resolve(key: (typeof KEYS)[number], hardcodedDefault: number): number {
    const hhRow = hhMap.get(key);
    if (hhRow?.valueInt != null) return hhRow.valueInt;
    const defRow = defMap.get(key);
    if (defRow?.valueInt != null) return defRow.valueInt;
    return hardcodedDefault;
  }

  return {
    upcomingDays: resolve("alert_upcoming_days", 14),
    graceDays: resolve("alert_grace_days", 0),
  };
}

async function upsertAlert(data: {
  householdId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  entityType: string;
  entityId: string;
  title: string;
  detail?: string;
  dueAt?: Date;
}): Promise<AlertUpsertResult> {
  try {
    await db.insert(alerts).values({
      id: randomUUID(),
      householdId: data.householdId,
      severity: data.severity,
      category: data.category,
      entityType: data.entityType,
      entityId: data.entityId,
      title: data.title,
      detail: data.detail,
      dueAt: data.dueAt,
    });
    return "inserted";
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }

  const existing = await db.query.alerts.findFirst({
    where: and(
      eq(alerts.householdId, data.householdId),
      eq(alerts.entityType, data.entityType),
      eq(alerts.entityId, data.entityId),
      eq(alerts.isResolved, false),
      isNull(alerts.archivedAt)
    ),
  });
  if (!existing) {
    throw new Error(
      `Active alert disappeared during duplicate resolution for ${data.householdId}:${data.entityType}:${data.entityId}`
    );
  }

  const decision = resolveAlertUpsertResult(existing.severity, data.severity);
  if (decision === "escalated") {
    await db
      .update(alerts)
      .set({
        severity: data.severity,
        title: data.title,
        detail: data.detail,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, existing.id));
    return decision;
  }

  await db
    .update(alerts)
    .set({ title: data.title, detail: data.detail, updatedAt: new Date() })
    .where(eq(alerts.id, existing.id));
  return decision;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const mysqlError = error as Error & { code?: string; errno?: number };
  return mysqlError.code === "ER_DUP_ENTRY" || mysqlError.errno === 1062;
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

async function processInventoryExpiry(metrics: JobCounters) {
  logger.info("[alertJobs] Processing inventory expiry...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const { upcomingDays, graceDays } = await getAlertPolicyForHousehold(hh.id);
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

    // Build itemId → item map for this household (one query, not per-lot)
    const itemRows = await db.query.inventoryItems.findMany({
      where: and(eq(inventoryItems.householdId, hh.id), isNull(inventoryItems.archivedAt)),
    });
    const itemMap = new Map(itemRows.map((i) => [i.id, i]));

    for (const lot of lots) {
      if (!lot.expiresAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const expStr = new Date(lot.expiresAt).toISOString().slice(0, 10);
        const severity = computeAlertSeverity(new Date(lot.expiresAt), today, graceDays);
        const item = itemMap.get(lot.itemId);
        const itemName = item?.name ?? lot.batchRef ?? lot.id;
        const parts: string[] = [`Expires: ${expStr}`];
        if (item?.location) parts.push(`Location: ${item.location}`);
        if (lot.qty != null) parts.push(`Qty: ${lot.qty}${item?.unit ? " " + item.unit : ""}`);
        if (lot.batchRef) parts.push(`Batch: ${lot.batchRef}`);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "expiry",
          entityType: "inventory_lot",
          entityId: lot.id,
          title: `Lot expiring: ${itemName}`,
          detail: parts.join(" · "),
          dueAt: new Date(expStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        logger.error("[alertJobs] Expiry alert upsert failed", { lotId: lot.id, err: String(err) });
      }
    }
  }
}

async function processInventoryReplacement(metrics: JobCounters) {
  logger.info("[alertJobs] Processing inventory replacement cycles...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const { upcomingDays, graceDays } = await getAlertPolicyForHousehold(hh.id);
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

    // Build itemId → item map for this household (one query, not per-lot)
    const itemRows = await db.query.inventoryItems.findMany({
      where: and(eq(inventoryItems.householdId, hh.id), isNull(inventoryItems.archivedAt)),
    });
    const itemMap = new Map(itemRows.map((i) => [i.id, i]));

    for (const lot of lots) {
      if (!lot.nextReplaceAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const repStr = new Date(lot.nextReplaceAt).toISOString().slice(0, 10);
        const severity = computeAlertSeverity(new Date(lot.nextReplaceAt), today, graceDays);
        const item = itemMap.get(lot.itemId);
        const itemName = item?.name ?? lot.batchRef ?? lot.id;
        const parts: string[] = [`Replace by: ${repStr}`];
        if (item?.location) parts.push(`Location: ${item.location}`);
        if (lot.qty != null) parts.push(`Qty: ${lot.qty}${item?.unit ? " " + item.unit : ""}`);
        if (lot.batchRef) parts.push(`Batch: ${lot.batchRef}`);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "replacement",
          entityType: "inventory_lot",
          entityId: lot.id,
          title: `Replace: ${itemName}`,
          detail: parts.join(" · "),
          dueAt: new Date(repStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        logger.error("[alertJobs] Replacement alert upsert failed", {
          lotId: lot.id,
          err: String(err),
        });
      }
    }
  }
}

async function processMaintenanceSchedules(metrics: JobCounters) {
  logger.info("[alertJobs] Processing maintenance schedules...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const { upcomingDays } = await getAlertPolicyForHousehold(hh.id);
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

    for (const { schedule: sched, equipment: equip } of scheduleRows) {
      if (!sched.nextDueAt) {
        metrics.skipped += 1;
        continue;
      }
      try {
        const dueStr = new Date(sched.nextDueAt).toISOString().slice(0, 10);
        // Use the schedule's own grace_days (falls back to 0 if not set)
        const schedGraceDays = sched.graceDays ?? 0;
        const severity = computeAlertSeverity(new Date(sched.nextDueAt), today, schedGraceDays);
        const parts: string[] = [`Due: ${dueStr}`];
        if (equip.location) parts.push(`Location: ${equip.location}`);
        if (equip.model) parts.push(`Model: ${equip.model}`);
        const result = await upsertAlert({
          householdId: hh.id,
          severity,
          category: "maintenance",
          entityType: "maintenance_schedule",
          entityId: sched.id,
          title: `Maintenance: ${equip.name} — ${sched.name}`,
          detail: parts.join(" · "),
          dueAt: new Date(dueStr),
        });
        if (result === "inserted") metrics.inserted += 1;
        else if (result === "escalated") metrics.escalated += 1;
        else metrics.skipped += 1;
      } catch (err) {
        metrics.errors += 1;
        logger.error("[alertJobs] Maintenance alert upsert failed", {
          scheduleId: sched.id,
          err: String(err),
        });
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
  logger.info("[alertJobs] Run started", { ts: new Date().toISOString() });
  try {
    await processInventoryExpiry(metrics.expiry);
    await processInventoryReplacement(metrics.replacement);
    await processMaintenanceSchedules(metrics.maintenance);
    logger.info("[alertJobs] Run metrics", { metrics });
    logger.info("[alertJobs] Run complete", { ms: Date.now() - start });
  } catch (err) {
    logger.error("[alertJobs] Error during job run", { err: String(err) });
  }
  return metrics;
}
