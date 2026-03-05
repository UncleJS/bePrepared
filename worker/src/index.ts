/**
 * worker/src/index.ts
 *
 * Scheduled job processor for:
 *  - Inventory expiry alerts
 *  - Inventory replacement due alerts
 *  - Maintenance schedule due alerts
 *  - Task overdue alerts
 *  - Low-stock alerts
 *
 * Runs every hour by default (configurable via WORKER_INTERVAL_MS).
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../api/src/db/schema";
import { eq, isNull, and, lte, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const {
  inventoryLots,
  inventoryItems,
  maintenanceSchedules,
  taskProgress,
  alerts,
  households,
  policyDefaults,
  householdPolicies,
} = schema;

const pool = await mysql.createPool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "beprepared",
  password: process.env.DB_PASSWORD ?? "beprepared",
  database: process.env.DB_NAME     ?? "beprepared",
  waitForConnections: true,
  connectionLimit: 5,
});

const db = drizzle(pool, { schema, mode: "default" });

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3600000); // 1 hour

async function getUpcomingDays(householdId: string): Promise<number> {
  // Resolve alert_upcoming_days from policy (simplified, direct query)
  const scenario = await db.query.households.findFirst({
    where: and(eq(households.id, householdId), isNull(households.archivedAt)),
  });
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
  severity:    "upcoming" | "due" | "overdue";
  category:    string;
  entityType:  string;
  entityId:    string;
  title:       string;
  detail?:     string;
  dueAt?:      Date;
}) {
  // Avoid duplicate active alerts for same entity
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
    // Update severity if escalated
    if (
      (existing.severity === "upcoming" && data.severity !== "upcoming") ||
      (existing.severity === "due"      && data.severity === "overdue")
    ) {
      await db.update(alerts)
        .set({ severity: data.severity, updatedAt: new Date() })
        .where(eq(alerts.id, existing.id));
    }
    return;
  }
  await db.insert(alerts).values({
    id:          randomUUID(),
    householdId: data.householdId,
    severity:    data.severity,
    category:    data.category as any,
    entityType:  data.entityType,
    entityId:    data.entityId,
    title:       data.title,
    detail:      data.detail,
    dueAt:       data.dueAt,
  });
}

async function processInventoryExpiry() {
  console.log("[worker] Processing inventory expiry...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const today = new Date();

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + upcomingDays);
    const upcomingStr = upcoming.toISOString().slice(0, 10);
    const todayStr    = today.toISOString().slice(0, 10);

    const lots = await db.query.inventoryLots.findMany({
      where: and(
        eq(inventoryLots.householdId, hh.id),
        isNull(inventoryLots.archivedAt),
        isNotNull(inventoryLots.expiresAt),
        lte(inventoryLots.expiresAt, upcoming)
      ),
    });

    for (const lot of lots) {
      if (!lot.expiresAt) continue;
      const expStr = lot.expiresAt.toString().slice(0, 10);
      const severity = expStr < todayStr ? "overdue"
                     : expStr === todayStr ? "due"
                     : "upcoming";
      await upsertAlert({
        householdId: hh.id,
        severity,
        category:    "expiry",
        entityType:  "inventory_lot",
        entityId:    lot.id,
        title:       `Lot expiring: ${lot.batchRef ?? lot.id}`,
        detail:      `Expires: ${expStr}`,
        dueAt:       new Date(expStr),
      });
    }
  }
}

async function processInventoryReplacement() {
  console.log("[worker] Processing inventory replacement cycles...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + upcomingDays);
    const upcomingStr = upcoming.toISOString().slice(0, 10);

    const lots = await db.query.inventoryLots.findMany({
      where: and(
        eq(inventoryLots.householdId, hh.id),
        isNull(inventoryLots.archivedAt),
        isNotNull(inventoryLots.nextReplaceAt),
        lte(inventoryLots.nextReplaceAt, upcoming)
      ),
    });

    for (const lot of lots) {
      if (!lot.nextReplaceAt) continue;
      const repStr   = lot.nextReplaceAt.toString().slice(0, 10);
      const severity = repStr < todayStr ? "overdue"
                     : repStr === todayStr ? "due"
                     : "upcoming";
      await upsertAlert({
        householdId: hh.id,
        severity,
        category:   "replacement",
        entityType: "inventory_lot",
        entityId:   lot.id,
        title:      `Lot replacement due: ${lot.batchRef ?? lot.id}`,
        detail:     `Replace by: ${repStr}`,
        dueAt:      new Date(repStr),
      });
    }
  }
}

async function processMaintenanceSchedules() {
  console.log("[worker] Processing maintenance schedules...");
  const allHouseholds = await db.query.households.findMany({
    where: isNull(households.archivedAt),
  });
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const hh of allHouseholds) {
    const upcomingDays = await getUpcomingDays(hh.id);
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + upcomingDays);
    const upcomingStr = upcoming.toISOString().slice(0, 10);

    const schedules = await db.query.maintenanceSchedules.findMany({
      where: and(
        isNull(maintenanceSchedules.archivedAt),
        eq(maintenanceSchedules.isActive, true),
        isNotNull(maintenanceSchedules.nextDueAt),
        lte(maintenanceSchedules.nextDueAt, upcoming)
      ),
    });

    for (const sched of schedules) {
      if (!sched.nextDueAt) continue;
      const dueStr   = sched.nextDueAt.toString().slice(0, 10);
      const severity = dueStr < todayStr ? "overdue"
                     : dueStr === todayStr ? "due"
                     : "upcoming";
      await upsertAlert({
        householdId: hh.id,
        severity,
        category:   "maintenance",
        entityType: "maintenance_schedule",
        entityId:   sched.id,
        title:      `Maintenance due: ${sched.name}`,
        detail:     `Due: ${dueStr}`,
        dueAt:      new Date(dueStr),
      });
    }
  }
}

async function runAllJobs() {
  const start = Date.now();
  console.log(`[worker] Run started at ${new Date().toISOString()}`);
  try {
    await processInventoryExpiry();
    await processInventoryReplacement();
    await processMaintenanceSchedules();
    console.log(`[worker] Run complete in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[worker] Error during job run:", err);
  }
}

// Run immediately on startup, then on interval
await runAllJobs();
setInterval(runAllJobs, INTERVAL_MS);
console.log(`[worker] Scheduled every ${INTERVAL_MS / 1000}s`);
