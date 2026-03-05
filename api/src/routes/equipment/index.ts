import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { equipmentItems, batteryProfiles } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";

type EquipmentStatus = "operational" | "needs_service" | "unserviceable" | "retired";
type BatteryChemistry = "alkaline" | "lithium_primary" | "liion" | "nimh" | "lead_acid" | "other";

export const equipmentRoute = new Elysia({ prefix: "/equipment", tags: ["equipment"] })

  .get("/:householdId", async ({ params }) => {
    return db.query.equipmentItems.findMany({
      where: and(
        eq(equipmentItems.householdId, params.householdId),
        isNull(equipmentItems.archivedAt)
      ),
    });
  }, { detail: { summary: "List equipment items for a household" } })

  .post("/:householdId", async ({ params, body }) => {
    const id = randomUUID();
    await db.insert(equipmentItems).values({
      id,
      householdId: params.householdId,
      categorySlug: body.categorySlug,
      name:         body.name,
      model:        body.model,
      serialNo:     body.serialNo,
      location:     body.location,
      status:       (body.status as EquipmentStatus) ?? "operational",
      acquiredAt:   body.acquiredAt ? new Date(body.acquiredAt) : undefined,
      notes:        body.notes,
    });
    return db.query.equipmentItems.findFirst({ where: eq(equipmentItems.id, id) });
  }, {
    body: t.Object({
      categorySlug: t.String({ minLength: 1 }),
      name:         t.String({ minLength: 1 }),
      model:        t.Optional(t.String()),
      serialNo:     t.Optional(t.String()),
      location:     t.Optional(t.String()),
      status:       t.Optional(t.String()),
      acquiredAt:   t.Optional(t.String()),
      notes:        t.Optional(t.String()),
    }),
    detail: { summary: "Add an equipment item" },
  })

  .patch("/:householdId/:itemId", async ({ params, body }) => {
    await db.update(equipmentItems).set({
      name:       body.name,
      model:      body.model,
      serialNo:   body.serialNo,
      location:   body.location,
      status:     body.status ? (body.status as EquipmentStatus) : undefined,
      acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : undefined,
      notes:      body.notes,
    }).where(eq(equipmentItems.id, params.itemId));
    return db.query.equipmentItems.findFirst({ where: eq(equipmentItems.id, params.itemId) });
  }, {
    body: t.Partial(t.Object({
      name:         t.String(),
      model:        t.String(),
      serialNo:     t.String(),
      location:     t.String(),
      status:       t.String(),
      acquiredAt:   t.String(),
      notes:        t.String(),
    })),
    detail: { summary: "Update an equipment item" },
  })

  .delete("/:householdId/:itemId", async ({ params }) => {
    await db.update(equipmentItems)
      .set({ archivedAt: new Date() })
      .where(eq(equipmentItems.id, params.itemId));
    return { archived: true };
  }, { detail: { summary: "Archive an equipment item" } })

  // Battery profiles
  .get("/battery-profiles", async () => {
    return db.query.batteryProfiles.findMany({
      where: isNull(batteryProfiles.archivedAt),
    });
  }, { detail: { summary: "List battery chemistry profiles" } })

  .post("/battery-profiles", async ({ body }) => {
    const id = randomUUID();
    await db.insert(batteryProfiles).values({
      id,
      name:             body.name,
      chemistry:        body.chemistry as BatteryChemistry,
      shelfLifeDays:    body.shelfLifeDays,
      recheckCycleDays: body.recheckCycleDays,
      storageTempMin:   body.storageTempMin,
      storageTempMax:   body.storageTempMax,
      notes:            body.notes,
    });
    return db.query.batteryProfiles.findFirst({ where: eq(batteryProfiles.id, id) });
  }, {
    body: t.Object({
      name:              t.String({ minLength: 1 }),
      chemistry:         t.String(),
      shelfLifeDays:     t.Optional(t.Number()),
      recheckCycleDays:  t.Optional(t.Number()),
      storageTempMin:    t.Optional(t.Number()),
      storageTempMax:    t.Optional(t.Number()),
      notes:             t.Optional(t.String()),
    }),
    detail: { summary: "Create a battery profile" },
  });
