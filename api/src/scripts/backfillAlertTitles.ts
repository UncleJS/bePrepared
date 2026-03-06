/**
 * api/src/scripts/backfillAlertTitles.ts
 *
 * One-off backfill: update title/detail on all currently unresolved, non-archived
 * alerts to use the improved formats introduced in the alertJobs.ts update.
 *
 * Run with:
 *   bun run api/src/scripts/backfillAlertTitles.ts
 *
 * Safe to re-run — idempotent (just rewrites the same values).
 */

import { db } from "../db/client";
import * as schema from "../db/schema";
import { eq, isNull, and } from "drizzle-orm";

const { alerts, inventoryLots, inventoryItems, maintenanceSchedules, equipmentItems } = schema;

async function main() {
  console.log("[backfill] Loading active alerts...");

  const activeAlerts = await db.query.alerts.findMany({
    where: and(eq(alerts.isResolved, false), isNull(alerts.archivedAt)),
  });

  console.log(`[backfill] Found ${activeAlerts.length} active alert(s) to process.`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const alert of activeAlerts) {
    try {
      let newTitle: string | null = null;
      let newDetail: string | null = null;

      // -----------------------------------------------------------------------
      // Inventory lot alerts (expiry + replacement)
      // -----------------------------------------------------------------------
      if (alert.entityType === "inventory_lot") {
        const lot = await db.query.inventoryLots.findFirst({
          where: eq(inventoryLots.id, alert.entityId),
        });

        if (!lot) {
          console.warn(
            `[backfill] Lot not found for alert ${alert.id} (entityId: ${alert.entityId}) — skipping`
          );
          skipped += 1;
          continue;
        }

        const item = await db.query.inventoryItems.findFirst({
          where: eq(inventoryItems.id, lot.itemId),
        });

        const itemName = item?.name ?? lot.batchRef ?? lot.id;

        if (alert.category === "expiry" && lot.expiresAt) {
          const expStr = new Date(lot.expiresAt).toISOString().slice(0, 10);
          const parts: string[] = [`Expires: ${expStr}`];
          if (item?.location) parts.push(`Location: ${item.location}`);
          if (lot.qty != null) parts.push(`Qty: ${lot.qty}${item?.unit ? " " + item.unit : ""}`);
          if (lot.batchRef) parts.push(`Batch: ${lot.batchRef}`);
          newTitle = `Lot expiring: ${itemName}`;
          newDetail = parts.join(" · ");
        } else if (alert.category === "replacement" && lot.nextReplaceAt) {
          const repStr = new Date(lot.nextReplaceAt).toISOString().slice(0, 10);
          const parts: string[] = [`Replace by: ${repStr}`];
          if (item?.location) parts.push(`Location: ${item.location}`);
          if (lot.qty != null) parts.push(`Qty: ${lot.qty}${item?.unit ? " " + item.unit : ""}`);
          if (lot.batchRef) parts.push(`Batch: ${lot.batchRef}`);
          newTitle = `Replace: ${itemName}`;
          newDetail = parts.join(" · ");
        } else {
          console.warn(
            `[backfill] Alert ${alert.id}: unrecognised category "${alert.category}" for inventory_lot — skipping`
          );
          skipped += 1;
          continue;
        }
      }

      // -----------------------------------------------------------------------
      // Maintenance schedule alerts
      // -----------------------------------------------------------------------
      else if (alert.entityType === "maintenance_schedule") {
        const sched = await db.query.maintenanceSchedules.findFirst({
          where: eq(maintenanceSchedules.id, alert.entityId),
        });

        if (!sched) {
          console.warn(
            `[backfill] Schedule not found for alert ${alert.id} (entityId: ${alert.entityId}) — skipping`
          );
          skipped += 1;
          continue;
        }

        const equip = await db.query.equipmentItems.findFirst({
          where: eq(equipmentItems.id, sched.equipmentItemId),
        });

        if (!equip) {
          console.warn(`[backfill] Equipment not found for schedule ${sched.id} — skipping`);
          skipped += 1;
          continue;
        }

        const dueStr = sched.nextDueAt
          ? new Date(sched.nextDueAt).toISOString().slice(0, 10)
          : (alert.dueAt?.toISOString().slice(0, 10) ?? "unknown");
        const parts: string[] = [`Due: ${dueStr}`];
        if (equip.location) parts.push(`Location: ${equip.location}`);
        if (equip.model) parts.push(`Model: ${equip.model}`);
        newTitle = `Maintenance: ${equip.name} — ${sched.name}`;
        newDetail = parts.join(" · ");
      }

      // -----------------------------------------------------------------------
      // Unknown entity type — skip
      // -----------------------------------------------------------------------
      else {
        console.warn(
          `[backfill] Alert ${alert.id}: unknown entityType "${alert.entityType}" — skipping`
        );
        skipped += 1;
        continue;
      }

      if (newTitle === null) {
        skipped += 1;
        continue;
      }

      await db
        .update(alerts)
        .set({ title: newTitle, detail: newDetail ?? undefined, updatedAt: new Date() })
        .where(eq(alerts.id, alert.id));

      console.log(`[backfill] ✓ ${alert.id}: "${alert.title}" → "${newTitle}"`);
      console.log(`           detail: "${newDetail}"`);
      updated += 1;
    } catch (err) {
      console.error(`[backfill] ✗ Error processing alert ${alert.id}:`, err);
      errors += 1;
    }
  }

  console.log(`\n[backfill] Done. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill] Fatal error:", err);
  process.exit(1);
});
